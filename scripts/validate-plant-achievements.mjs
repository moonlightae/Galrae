import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import { DatabaseSync } from "node:sqlite";
import ts from "typescript";
import { drizzle } from "drizzle-orm/d1";
import { getAchievements, getPlantAlgaeGroups } from "../public/achievements.js";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");
const dataset = JSON.parse(read("../public/data/plants.json"));
const total = dataset.plants.length - 1;
const speciesById = new Map(dataset.plants.map((plant) => [plant.id, plant]));
const tasks = getAchievements({}, total, "plants");
assert.equal(tasks.length, 24);
assert.equal(new Set(tasks.map((task) => task.id)).size, 24);
assert.ok(tasks.every((task) => task.id.startsWith("plant-") && !task.earned));
assert.ok(!tasks.some((task) => /medium|hard/.test(task.id)), "Unimplemented modes must have no unreachable medals");
for (const [metric, prefix, goals] of [
  ["bestScore", "best", [5, 10, 20, 30, 40]], ["normalAttempts", "attempts", [10, 50, 100, 500, 1000]],
  ["repeatSuccesses", "repeat", [10, 100, 1000]], ["totalSuccesses", "successes", [100, 1000]],
  ["collected", "collection", [10, 25]],
]) for (const goal of goals) {
  const id = `plant-${prefix}-${goal}`;
  assert.equal(getAchievements({ [metric]: goal - 1 }, total, "plants").find((task) => task.id === id).earned, false);
  assert.equal(getAchievements({ [metric]: goal }, total, "plants").find((task) => task.id === id).earned, true);
}
assert.equal(getPlantAlgaeGroups([dataset.initialSpeciesId, "homo-sapiens", "unknown"], speciesById), 0);
const algae = ["cyanophora-paradoxa", "chondrus-crispus", "chlorella-vulgaris"];
assert.equal(getPlantAlgaeGroups(algae, speciesById), 3);

const require = createRequire(import.meta.url);
function loadTS(path, overrides = {}) {
  const code = ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: (name) => overrides[name] || require(name), Response, console, GalraeLogic: globalThis.GalraeLogic });
  return module.exports;
}
const sqlite = new DatabaseSync(":memory:");
sqlite.exec("PRAGMA foreign_keys=ON");
const migrationDir = new URL("../drizzle/", import.meta.url);
for (const file of fs.readdirSync(migrationDir).filter((file) => file.endsWith(".sql")).sort()) sqlite.exec(fs.readFileSync(new URL(file, migrationDir), "utf8"));
for (const id of ["one", "two"]) sqlite.prepare("INSERT INTO users(id,username,username_normalized,password_hash,password_salt,password_iterations) VALUES (?,?,?,?,?,1)").run(id, id, id, "test", "test");
sqlite.exec("INSERT INTO leaderboard(user_id,display_name,best_score,normal_attempts) VALUES ('one','One',200,100)");
const client = { prepare(query) {
  const statement = sqlite.prepare(query);
  return { bind(...params) { return {
    async run() { return statement.run(...params); },
    async all() { return { results: statement.all(...params) }; },
    async raw() { statement.setReturnArrays(true); return statement.all(...params); },
  }; } };
} };
const schema = loadTS("../db/schema.ts");
const db = drizzle(client, { schema });
let user = { id: "one" };
const route = loadTS("../app/api/plant-achievements/route.ts", {
  "../../game-auth": { getGameUser: async () => user }, "../../../db": { getDb: () => db }, "../../../db/schema": schema,
  "../../../public/data/plants.json": dataset, "../../../public/achievements.js": { getPlantAlgaeGroups },
});
const post = (payload) => route.POST(new Request("https://local/api/plant-achievements", { method: "POST", body: JSON.stringify(payload) }));
const stats = async () => (await (await route.GET()).json()).stats;
assert.equal((await stats()).bestScore, 0, "Animal scores must not award plant medals");
await post({ event: "normal-start" }); await post({ event: "normal-start" });
await post({ event: "failure" }); await post({ event: "practice-start" });
let data = await stats();
assert.equal(data.normalAttempts, 2); assert.equal(data.hasFailed, true); assert.equal(data.practiceStarted, true);
const result = { event: "result", mode: "normal", difficulty: "easy", score: 10 };
assert.equal((await post(result)).status, 200);
await post({ ...result, score: 5 });
assert.equal((await stats()).bestScore, 10, "Later lower scores must not erase progress");
const allIds = dataset.plants.map((plant) => plant.id);
for (const payload of [null, [], { event: ["failure"] }, { event: "unknown" },
  { ...result, score: "10" }, { ...result, score: -1 }, { ...result, score: total + 1 },
  { ...result, mode: "tutorial" }, { ...result, difficulty: "hard" }, { ...result, score: total },
  { ...result, completedIds: allIds }, { ...result, score: total, completedIds: allIds.slice(1) },
  { ...result, score: total, completedIds: [...allIds, allIds[0]] }, { ...result, score: total, completedIds: ["homo-sapiens", ...allIds.slice(1)] },
]) assert.equal((await post(payload)).status, 400, `Invalid result accepted: ${JSON.stringify(payload)}`);
const practice = { ...result, mode: "practice", difficulty: "hard", score: total - 1, completedIds: allIds };
assert.equal((await post(practice)).status, 200);
data = await stats();
assert.equal(data.practiceCompleted, true); assert.equal(data.easyCompleted, false);
assert.equal(getAchievements(data, total, "plants").find((task) => task.id === "plant-practice-perfect").earned, false);
await post({ ...practice, score: total });
assert.equal((await stats()).bestPracticeScore, total);
assert.equal(getAchievements(await stats(), total, "plants").find((task) => task.id === "plant-practice-perfect").earned, true);
await post({ ...result, score: total, completedIds: allIds });
data = await stats(); assert.equal(data.easyCompleted, true); assert.equal(data.normalAttempts, 2);
const insert = sqlite.prepare("INSERT INTO classified_species(user_id,species_id,success_count) VALUES ('one',?,?)");
for (const id of algae) insert.run(id, 10);
insert.run(dataset.initialSpeciesId, 999); insert.run("homo-sapiens", 999); insert.run("unknown", 999);
data = await stats(); assert.equal(data.collected, 3); assert.equal(data.totalSuccesses, 30); assert.equal(data.algaeGroups, 3);
assert.equal(getAchievements(data, total, "plants").find((task) => task.id === "plant-algae-groups").earned, true);
assert.equal(sqlite.prepare("SELECT best_score FROM leaderboard WHERE user_id='one'").get().best_score, 200);
user = { id: "two" };
assert.equal((await stats()).normalAttempts, 0); assert.equal((await stats()).collected, 0);
await post({ event: "practice-start" });
sqlite.exec("DELETE FROM users WHERE id='two'");
assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM plant_progress WHERE user_id='two'").get().count, 0, "Account deletion must cascade");
user = null;
assert.equal((await route.GET()).status, 401); assert.equal((await post(result)).status, 401);
sqlite.close();

const source = read("../public/app.js");
const elements = new Map();
const $ = (id) => { if (!elements.has(id)) elements.set(id, {}); return elements.get(id); };
const requests = [];
const context = {
  state: { kingdom: "plants", tutorial: false, practice: false, failed: false, score: total, difficulty: "easy", round: total, queue: allIds.slice(1), classified: allIds },
  $, currentUser: { id: "one" }, scoreSubmitted: false, pendingAchievementWrites: new Set(), pendingCollectionWrites: new Set(),
  fetch: async (url, options) => { requests.push({ url, body: JSON.parse(options.body) }); return Response.json({ ok: true }); },
  refreshAchievementStats: async (_, kingdom) => assert.equal(kingdom, "plants"), console,
};
vm.runInNewContext(source.slice(source.indexOf("async function submitScore("), source.indexOf("function openSpeciesCard(")), context);
await context.submitScore(); await context.submitScore();
assert.equal(requests.length, 1); assert.equal(requests[0].url, "/api/plant-achievements");
assert.deepEqual(requests[0].body.completedIds, allIds);
context.scoreSubmitted = false; context.state.practice = true; context.state.difficulty = "hard"; context.state.score = total - 1;
await context.submitScore(); assert.equal(requests[1].body.mode, "practice");
context.scoreSubmitted = false; context.state.tutorial = true;
await context.submitScore(); assert.equal(requests.length, 2, "Tutorials must not submit results");
const notices = [];
Object.assign(context, {
  state: { kingdom: "plants", tutorial: false, practice: false, score: 5 }, game: { hidden: false },
  plantAchievementStats: { bestScore: 0, bestPracticeScore: 0 }, achievementStats: { bestScore: 200 },
  plants: dataset.plants, animals: [{ id: "homo-sapiens" }, { id: "animal" }],
  PLANT_INITIAL_ID: dataset.initialSpeciesId, HUMAN_ID: "homo-sapiens", speciesById, getAchievements, getPlantAlgaeGroups,
  getSuccessCounts: () => ({ "cyanophora-paradoxa": { count: 10 }, "homo-sapiens": { count: 999 }, "hibiscus-syriacus": { count: 999 } }),
  getCollection: () => [dataset.initialSpeciesId, "cyanophora-paradoxa", "homo-sapiens"], normalizeSuccessRecord: (record) => record,
  plantAchievementNotifications: { update(tasks) { notices.push(tasks); } },
  achievementNotifications: { update() { assert.fail("Plant progress reached the animal notifier"); } },
});
vm.runInNewContext(source.slice(source.indexOf("function checkAchievementProgress("), source.indexOf("async function loadAchievements(")), context);
context.checkAchievementProgress();
assert.equal(context.plantAchievementStats.collected, 1);
assert.equal(context.plantAchievementStats.totalSuccesses, 10);
assert.equal(context.achievementStats.bestScore, 200);
assert.equal(notices.at(-1).find((task) => task.id === "plant-best-5").earned, true);
context.state.practice = true; context.state.score = total; context.plantAchievementStats.bestScore = 0;
context.checkAchievementProgress();
assert.equal(notices.at(-1).find((task) => task.id === "plant-best-5").earned, false, "Practice must not award normal milestones");
assert.equal(notices.at(-1).find((task) => task.id === "plant-practice-perfect").earned, true);
context.state.tutorial = true;
const beforeTutorial = notices.length;
context.checkAchievementProgress(); assert.equal(notices.length, beforeTutorial);
console.log("Plant achievements: 24 medals, boundaries, validated completion, account/kingdom isolation, migration, cascade and client results passed.");
