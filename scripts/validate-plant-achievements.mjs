import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import { DatabaseSync } from "node:sqlite";
import ts from "typescript";
import { drizzle } from "drizzle-orm/d1";
import { getAchievements, isGrassSiblingMistake } from "../public/achievements.js";

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

const algae = ["cyanophora-paradoxa", "chondrus-crispus", "chlorella-vulgaris"];
const special = { event: "grass-sibling-mistake", classified: [dataset.initialSpeciesId, "pteridium-aquilinum"], currentId: "oryza-sativa", targetId: "pteridium-aquilinum", placement: "wrap" };
for (const [current, other] of [["oryza-sativa", "pteridium-aquilinum"], ["pteridium-aquilinum", "oryza-sativa"]]) {
  for (const classified of [[dataset.initialSpeciesId, other], [other, dataset.initialSpeciesId], [dataset.initialSpeciesId, other, "pinus-sylvestris"]]) {
    assert.equal(isGrassSiblingMistake(classified, current, other, "wrap", speciesById), true);
    const expected = globalThis.GalraeLogic.getExpectedPlacement(classified, current, speciesById);
    assert.equal(isGrassSiblingMistake(classified, current, expected.targetId, expected.placement, speciesById), false);
  }
  assert.equal(isGrassSiblingMistake([other], current, other, "wrap", speciesById), false, "No misleading award when the two leaves are all that exist");
  assert.equal(isGrassSiblingMistake([dataset.initialSpeciesId, other], current, other, "join", speciesById), false);
}
assert.equal(isGrassSiblingMistake([dataset.initialSpeciesId, "pteridium-aquilinum"], "pinus-sylvestris", "pteridium-aquilinum", "wrap", speciesById), false);

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
  "../../../public/data/plants.json": dataset, "../../../public/achievements.js": { isGrassSiblingMistake },
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
data = await stats(); assert.equal(data.collected, 3); assert.equal(data.totalSuccesses, 30); assert.equal(data.grassSiblingMistake, false);
assert.equal(getAchievements(data, total, "plants").find((task) => task.id === "plant-grass-sibling").earned, false);
for (const invalid of [
  { ...special, classified: null }, { ...special, classified: ["pteridium-aquilinum"] },
  { ...special, classified: [...special.classified, special.classified[0]] },
  { ...special, classified: [...special.classified, "homo-sapiens"] },
  { ...special, classified: [...special.classified, special.currentId] },
  { ...special, currentId: "unknown" }, { ...special, targetId: "unknown" },
  { ...special, targetId: dataset.initialSpeciesId }, { ...special, placement: "join" },
]) assert.equal((await post(invalid)).status, 400, "Invalid special event must not award a medal");
assert.equal((await stats()).grassSiblingMistake, false);
assert.equal((await post(special)).status, 200);
assert.equal(getAchievements(await stats(), total, "plants").find((task) => task.id === "plant-grass-sibling").earned, true);
await post({ event: "normal-start" });
assert.equal((await stats()).grassSiblingMistake, true, "Special progress must survive later events");
assert.equal(sqlite.prepare("SELECT best_score FROM leaderboard WHERE user_id='one'").get().best_score, 200);
user = { id: "two" };
assert.equal((await stats()).grassSiblingMistake, false);
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
  PLANT_INITIAL_ID: dataset.initialSpeciesId, HUMAN_ID: "homo-sapiens", speciesById, getAchievements, isGrassSiblingMistake,
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
assert.equal(notices.length, 0, "Plant medals must remain silent while coming soon");
context.state.practice = true; context.state.score = total; context.plantAchievementStats.bestScore = 0;
context.checkAchievementProgress();
assert.equal(notices.length, 0, "Practice must also keep plant medals silent");
context.state.tutorial = true;
const beforeTutorial = notices.length;
context.checkAchievementProgress(); assert.equal(notices.length, beforeTutorial);
const specialEvents = [];
const playContext = {
  ...globalThis.GalraeLogic, speciesById, isGrassSiblingMistake,
  isClassificationPolytomyMistake() { return false; },
  state: {}, $: () => ({ focus() {} }),
  card: { classList: { add() {}, remove() {} }, setAttribute() {} },
  renderTree() {}, submitScore() {},
  recordAchievementEvent(event, details) { specialEvents.push({ event, details }); },
};
vm.runInNewContext(source.slice(source.indexOf("function failRound("), source.indexOf("function updateRound(")), playContext);
for (const practice of [false, true]) {
  playContext.state = { kingdom: "plants", classified: [...special.classified], currentId: special.currentId, practice, tutorial: false, mistakes: new Set(), round: 0, queue: [special.currentId] };
  playContext.failRound(special.targetId, special.placement);
  assert.equal(specialEvents.at(-1).event, special.event);
  assert.deepEqual(Array.from(specialEvents.at(-1).details.classified), special.classified, "Capture proof before practice auto-placement mutates it");
}
const beforeSpecialTutorial = specialEvents.length;
playContext.state = { kingdom: "plants", classified: [...special.classified], currentId: special.currentId, practice: false, tutorial: true };
playContext.failRound(special.targetId, special.placement);
assert.equal(specialEvents.length, beforeSpecialTutorial);
vm.runInNewContext(source.slice(source.indexOf("function recordAchievementEvent("), source.indexOf("async function submitScore(")), context);
context.state.tutorial = false; context.plantAchievementStats.grassSiblingMistake = false;
context.showToast = () => assert.fail("Saving a validated special event must not fail");
await context.recordAchievementEvent(special.event, { classified: special.classified, currentId: special.currentId, targetId: special.targetId, placement: special.placement });
assert.equal(context.plantAchievementStats.grassSiblingMistake, true);
assert.equal(requests.at(-1).url, "/api/plant-achievements");
console.log("Plant achievements: 24 medals, thresholds, validated completion/special placement, both species orders, normal/practice/tutorial routing, account isolation and migration passed.");
