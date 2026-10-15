import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import { DatabaseSync } from "node:sqlite";
import ts from "typescript";
import { drizzle } from "drizzle-orm/d1";
import { achievementGrades, getAchievements, isClassificationPolytomyMistake } from "../public/achievements.js";

const dataset = JSON.parse(fs.readFileSync(new URL("../public/data/animals.json", import.meta.url)));
const total = dataset.animals.length - 1;
const tasks = getAchievements({}, total);
assert.equal(tasks.length, 26);
assert.equal(new Set(tasks.map((task) => task.id)).size, tasks.length);
assert.equal(tasks.filter((task) => task.earned).length, 0);
assert.deepEqual([...new Set(tasks.map((task) => task.grade))].sort(), Object.keys(achievementGrades).sort());
for (const [metric, values] of [["bestScore", [10, 25, 50, 100, 200]], ["normalAttempts", [100, 500, 1000, 2000, 10000]], ["repeatSuccesses", [10, 100, 1000]], ["totalSuccesses", [1000, 10000]]]) {
  for (const value of values) {
    const id = `${{ bestScore: "best", normalAttempts: "attempts", repeatSuccesses: "repeat", totalSuccesses: "successes" }[metric]}-${value}`;
    assert.equal(getAchievements({ [metric]: value - 1 }, total).find((task) => task.id === id).earned, false);
    assert.equal(getAchievements({ [metric]: value }, total).find((task) => task.id === id).earned, true);
  }
}
assert.equal(getAchievements({ practiceCompleted: true, bestPracticeScore: 0 }, total).find((task) => task.id === "practice-complete").earned, true);
assert.equal(getAchievements({ practiceCompleted: true, bestPracticeScore: 0 }, total).find((task) => task.id === "practice-perfect").earned, false);
assert.equal(getAchievements({ bestPracticeScore: total }, total).find((task) => task.id === "practice-perfect").earned, true);
for (const [difficulty, grade, title] of [["easy", "silver", "갈래 입문자"], ["medium", "gold", "갈래 초심자"], ["hard", "diamond", "갈래 전문가"]]) {
  const task = getAchievements({ [`${difficulty}Completed`]: true }).find((task) => task.id === `complete-${difficulty}`);
  assert.equal(task.earned, true); assert.equal(task.grade, grade); assert.equal(task.title, title);
}

const require = createRequire(import.meta.url);
function loadTS(path, overrides = {}) {
  const code = ts.transpileModule(fs.readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: (name) => overrides[name] || require(name), Response, console, GalraeLogic: globalThis.GalraeLogic });
  return module.exports;
}
const sqlite = new DatabaseSync(":memory:");
const migrationDir = new URL("../drizzle/", import.meta.url);
const migrations = fs.readdirSync(migrationDir).filter((path) => path.endsWith(".sql")).sort();
for (const migration of migrations.slice(0, -1)) sqlite.exec(fs.readFileSync(new URL(migration, migrationDir), "utf8"));
sqlite.exec(`INSERT INTO leaderboard(user_id,display_name,best_score,games_played,best_practice_score,practice_games_played) VALUES ('legacy','Legacy',50,99,20,1),('perfect','Perfect',${total},2,${total},1)`);
sqlite.exec(fs.readFileSync(new URL(migrations.at(-1), migrationDir), "utf8"));
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
let user = { id: "legacy", displayName: "Legacy" };
const auth = { getGameUser: async () => user };
const route = loadTS("../app/api/achievements/route.ts", {
  "../../game-auth": auth, "../../../db": { getDb: () => db }, "../../../db/schema": schema,
  "../../../public/data/animals.json": dataset,
  "../../../public/achievements.js": { isClassificationPolytomyMistake },
});
const post = async (body) => route.POST(new Request("https://local/api/achievements", { method: "POST", body: JSON.stringify(body) }));
const stats = async () => (await (await route.GET()).json()).stats;
let data = await stats();
assert.equal(data.normalAttempts, 99);
assert.equal(data.hasFailed, true);
assert.equal(data.practiceStarted, true);
assert.equal(data.practiceCompleted, false);
assert.equal((await post({ event: "normal-start" })).status, 200);
data = await stats(); assert.equal(data.normalAttempts, 100);
assert.equal(getAchievements(data, total).find((task) => task.id === "attempts-100").earned, true);
sqlite.exec(`UPDATE leaderboard SET best_score=${total},games_played=100 WHERE user_id='legacy'`);
assert.equal((await stats()).hasFailed, true, "Historical failure medals must survive a later perfect score");
assert.equal((await post({ event: "practice-start" })).status, 200);
assert.equal((await post({ event: "practice-complete" })).status, 200);
assert.equal((await post({ event: "practice-complete" })).status, 200);
data = await stats(); assert.equal(data.normalAttempts, 100); assert.equal(data.practiceCompleted, true);
assert.equal((await post({ event: "unknown" })).status, 400);
assert.equal((await post(null)).status, 400);
user = { id: "perfect", displayName: "Perfect" };
assert.equal((await stats()).practiceCompleted, true, "Existing perfect practice records must qualify");
assert.equal((await stats()).hardCompleted, true, "Existing perfect normal records must unlock hard completion");
assert.equal((await stats()).easyCompleted, false, "Hard completion must not automatically award easier medals");
user = { id: "new", displayName: "New" };
assert.equal((await stats()).normalAttempts, 0);
await post({ event: "practice-start" });
await post({ event: "failure" });
data = await stats(); assert.equal(data.practiceStarted, true); assert.equal(data.hasFailed, true);
assert.equal(data.fishSiblingMistake, false);
assert.equal(data.normalAttempts, 0); assert.equal(data.practiceCompleted, false);
const ids = dataset.animals.filter((animal) => animal.id !== "homo-sapiens").slice(0, 25).map((animal) => animal.id);
sqlite.exec("INSERT INTO users(id,username,username_normalized,display_name,password_hash,password_salt,password_iterations) VALUES ('new','new','new','New','test','test',1)");
const insert = sqlite.prepare("INSERT INTO classified_species(user_id,species_id,success_count) VALUES ('new',?,?)");
for (const id of ids) insert.run(id, 40);
insert.run("homo-sapiens", 500); insert.run("unknown-species", 500);
data = await stats(); assert.equal(data.collected, 25); assert.equal(data.totalSuccesses, 1000); assert.equal(data.repeatSuccesses, 40);
assert.equal(getAchievements(data, total).find((task) => task.id === "successes-1000").earned, true);
const speciesById = new Map(dataset.animals.map((animal) => [animal.id, animal]));
const { buildTree, collectLeafIds, getExpectedPlacement } = globalThis.GalraeLogic;
function splitBranch(ids) {
  let node = buildTree(ids, speciesById);
  while (node.type === "branch" && node.children.length === 1) node = node.children[0];
  return node;
}
const representatives = ["anguilla-anguilla", "alligator-mississippiensis", "gallus-gallus", "ambystoma-mexicanum", "homo-sapiens"];
for (let a = 0; a < representatives.length; a++) {
  for (let b = a + 1; b < representatives.length; b++) {
    for (let c = b + 1; c < representatives.length; c++) {
      const triple = [representatives[a], representatives[b], representatives[c]];
      for (const currentId of triple) {
        const classified = triple.filter((id) => id !== currentId);
        const target = splitBranch(classified);
        assert.equal(isClassificationPolytomyMistake(classified, currentId, target.id, "join", speciesById), true, triple.join(","));
        assert.equal(isClassificationPolytomyMistake(classified, currentId, target.id, "wrap", speciesById), false, "A new two-way split must not count");
        const correct = getExpectedPlacement(classified, currentId, speciesById);
        assert.equal(isClassificationPolytomyMistake(classified, currentId, correct.targetId, correct.placement, speciesById), false);
      }
    }
  }
}
const classified = ["homo-sapiens", "gallus-gallus"];
const target = splitBranch(classified);
const special = { event: "fish-sibling-mistake", classified, currentId: "anguilla-anguilla", targetId: target.id, placement: "join" };
assert.equal(isClassificationPolytomyMistake(classified, "carcharodon-carcharias", target.id, "join", speciesById), true, "Cartilaginous fish count");
assert.equal(isClassificationPolytomyMistake(classified, "canis-lupus", target.id, "join", speciesById), false, "Three cards in only two groups must not count");
assert.equal(isClassificationPolytomyMistake(classified, "ascaris-lumbricoides", target.id, "join", speciesById), false);
const nested = [...classified, "anguilla-anguilla"];
const grouped = [...classified, "canis-lupus"];
assert.equal(isClassificationPolytomyMistake(grouped, special.currentId, target.id, "join", speciesById), true, "A mammal branch containing human and dog counts as one group");
const nestedTarget = splitBranch(nested);
assert.equal(isClassificationPolytomyMistake(nested, "ambystoma-mexicanum", nestedTarget.id, "join", speciesById), false, "Groups inside a shared child are not direct branches of this split");
assert.equal(isClassificationPolytomyMistake(["homo-sapiens", "canis-lupus"], "felis-catus", splitBranch(["homo-sapiens", "canis-lupus"]).id, "join", speciesById), false, "Three mammals must not count");
for (const bad of [{}, { classified: ["homo-sapiens", "unknown"] }, { classified: [...classified, classified[1]] }, { currentId: "homo-sapiens" }, { targetId: "gallus-gallus" }, { placement: "wrap" }, { currentId: "canis-lupus" }, { currentId: "ascaris-lumbricoides" }]) {
  assert.equal((await post(Object.keys(bad).length ? { ...special, ...bad } : { event: special.event })).status, 400);
}
assert.equal((await stats()).fishSiblingMistake, false, "Rejected placements must not earn the medal");
assert.equal((await post(special)).status, 200);
assert.equal((await post(special)).status, 200);
assert.equal((await stats()).fishSiblingMistake, true);
const medal = getAchievements(await stats(), total).find((task) => task.id === "fish-sibling");
assert.equal(medal.earned, true);
assert.equal(medal.title, "자, 이게 분류학이야");
user = { id: "perfect", displayName: "Perfect" };
assert.equal((await stats()).fishSiblingMistake, false, "Special medals belong to the authenticated account");
user = { id: "new", displayName: "New" };
await Promise.all([post({ event: "normal-start" }), post({ event: "normal-start" })]);
assert.equal((await stats()).normalAttempts, 2, "Atomic increments must retain concurrent starts");
assert.equal(sqlite.prepare("SELECT games_played FROM leaderboard WHERE user_id='new'").get().games_played, 0, "Starting must not submit a score");
const scoreRoute = loadTS("../app/api/leaderboard/route.ts", {
  "../../game-auth": auth, "../../../db": { getDb: () => db }, "../../../db/schema": schema,
  "../../../public/data/animals.json": dataset, "../../../public/game-logic.js": {},
});
user = { id: "easy-perfect", displayName: "Easy" };
await post({ event: "normal-start" });
const completedIds = ["homo-sapiens", ...globalThis.GalraeLogic.createDifficultyQueue(dataset.animals, "easy", () => .4)];
assert.equal((await scoreRoute.POST(new Request("https://local/api/leaderboard", { method: "POST", body: JSON.stringify({ mode: "normal", difficulty: "easy", score: completedIds.length - 1, completedIds }) }))).status, 200);
assert.equal((await stats()).easyCompleted, true);
assert.equal((await stats()).hardCompleted, false);
assert.equal((await stats()).hasFailed, false, "Completing fewer cards on easy must not imply failure");
await post({ event: "normal-start" });
assert.equal((await stats()).hasFailed, false, "Starting another run must not infer failure from an easy score");
user = null;
assert.equal((await route.GET()).status, 401); assert.equal((await post({ event: "failure" })).status, 401);
sqlite.close();
console.log("Achievements: 26 medals, difficulty completion grades, threshold boundaries, migration, persistence, account isolation and auth passed.");
