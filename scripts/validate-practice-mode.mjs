import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import { DatabaseSync } from "node:sqlite";
import ts from "typescript";
import { drizzle } from "drizzle-orm/d1";
import { createTreeView } from "../public/tree-view.js";
import { isClassificationPolytomyMistake } from "../public/achievements.js";

await import("../public/game-logic.js");
const logic = globalThis.GalraeLogic;
const dataset = JSON.parse(fs.readFileSync(new URL("../data/animals.json", import.meta.url)));
const speciesById = new Map(dataset.animals.map((a) => [a.id, a]));
const source = fs.readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const elements = new Map();
const $ = (id) => {
  if (!elements.has(id)) elements.set(id, { hidden: true, textContent: "", innerHTML: "", classList: { add() {}, remove() {} }, setAttribute() {}, focus() {}, addEventListener(_, callback) { this.click = callback; } });
  return elements.get(id);
};
const state = {
  classified: ["homo-sapiens", "lepisosteus-osseus", "anguilla-anguilla"],
  currentId: "electrophorus-electricus", queue: ["electrophorus-electricus", "ascaris-lumbricoides"],
  round: 0, score: 0, practice: true, tutorial: false, failed: false, mistakes: new Set(), layout: "top",
};
state.tree = logic.buildTree(state.classified, speciesById);
state.expected = logic.getExpectedPlacement(state.classified, state.currentId, speciesById);
const successes = [], collections = [];
let submissions = 0;
const achievementEvents = [];
const context = {
  ...logic, isClassificationPolytomyMistake, state, speciesById, $, card: $("card"), taxonNamesKo: {},
  cardText: (a) => a, clearPreview() {}, renderTree() {}, setCard() {},
  recordSuccess: (id) => successes.push(id), recordServerSuccess() {},
  recordAchievementEvent(event) { achievementEvents.push(event); },
  checkAchievementProgress() {},
  saveCollection: (ids) => collections.push([...ids]), submitScore: () => submissions++,
};
vm.runInNewContext(source.slice(source.indexOf("function placeCard("), source.indexOf("async function startGame(")), context);
context.placeCard("lepisosteus-osseus", "wrap");
assert.equal(state.failed, true, "Pause on explanation until Continue");
assert.equal(state.score, 0, "An automatic placement must not add a correct answer");
assert.equal(state.round, 1);
assert.equal(submissions, 0, "Practice mistakes must not end or submit a game");
assert.deepEqual(achievementEvents, ["failure"], "Practice mistakes must award the first failure medal");
assert.deepEqual(successes, [], "Automatic placements must not count as successful classifications");
assert.ok(state.mistakes.has("electrophorus-electricus"));
assert.equal(state.latestMistake, "electrophorus-electricus");
assert.deepEqual(new Set(logic.collectLeafIds(logic.findNodeById(state.tree, state.expected.ancestorId))), new Set(["anguilla-anguilla", "electrophorus-electricus"]));
assert.equal($("#failure-copy").textContent, "초록색 카드를 확인하고 계속해 주세요.");
assert.equal($("#retry-game").textContent, "계속하기 →");

const canvas = { innerHTML: "", querySelector: () => null };
const view = createTreeView({ ...logic, state, speciesById, treeCanvas: canvas, $, cardText: (a) => a, escapeHtml: (s) => String(s) });
for (const layout of ["top", "bottom", "radial"]) {
  state.layout = layout;
  view.renderTree();
  assert.match(canvas.innerHTML, /species-node[^"<>]*is-mistake is-recent-mistake[^>]*data-species-id="electrophorus-electricus"/);
  assert.match(canvas.innerHTML, /자동 배치/);
}

vm.runInNewContext(source.slice(source.indexOf('$("#retry-game").addEventListener'), source.indexOf('$("#start-tutorial").addEventListener')), context);
$("#retry-game").click();
assert.equal(state.failed, false);
assert.equal(state.currentId, "ascaris-lumbricoides");
assert.equal($("#failure-panel").hidden, true);
context.placeCard(state.expected.targetId, state.expected.placement);
assert.equal(state.score, 1);
assert.deepEqual(successes, ["ascaris-lumbricoides"]);
assert.ok(collections.every((ids) => !ids.includes("electrophorus-electricus")));
assert.equal(submissions, 1);
assert.equal(state.currentId, null, "Completion must prevent duplicate placement");
context.placeCard("homo-sapiens");
assert.equal(state.score, 1);
assert.match($("#result-copy").textContent, /직접 맞힌 카드 1종 · 자동 배치 1종/);

const scoreRequests = [];
const scoreContext = {
  state, $, currentUser: { id: "test" }, scoreSubmitted: false, currentGamesPlayed: 7,
  pendingCollectionWrites: new Set(), pendingAchievementWrites: new Set(), console, loadLeaderboard: async () => {},
  refreshAchievementStats: async () => {},
  responseJson: async (response) => response.json(),
  fetch: async (_, options) => { scoreRequests.push(JSON.parse(options.body)); return Response.json({ entry: { gamesPlayed: 7 } }); },
};
vm.runInNewContext(source.slice(source.indexOf("async function submitScore("), source.indexOf("function openSpeciesCard(")), scoreContext);
await scoreContext.submitScore(); await scoreContext.submitScore();
assert.deepEqual(scoreRequests, [{ score: 1, mode: "practice" }], "Practice submits once to its own record");
assert.equal(scoreContext.currentGamesPlayed, 7, "Practice must not alter normal tutorial/attempt state");
scoreContext.scoreSubmitted = false; scoreContext.currentUser = null;
await scoreContext.submitScore();
assert.equal(scoreRequests.length, 1, "Guests must not write leaderboard records");

let quitSubmissions = 0;
const quitContext = {
  state, $, game: { hidden: false }, submitScore: async () => quitSubmissions++,
  closeSpeciesCard() {}, showLobbyPage() {}, renderCollection() {}, syncCollection: async () => {},
  loadLeaderboard: async () => {}, window: { scrollTo() {} },
};
vm.runInNewContext(source.slice(source.indexOf("async function returnToLobby("), source.indexOf("async function initialize(")), quitContext);
await quitContext.returnToLobby(); await quitContext.returnToLobby();
assert.equal(quitSubmissions, 1, "Leaving practice saves its current score once");

state.practice = false; state.failed = false; state.currentId = "ascaris-lumbricoides";
state.classified = ["homo-sapiens"]; state.tree = logic.buildTree(state.classified, speciesById);
state.expected = logic.getExpectedPlacement(state.classified, state.currentId, speciesById);
context.placeCard("homo-sapiens", "join");
assert.equal(submissions, 2, "Normal mistakes must still end and submit the game");
assert.deepEqual(state.classified, ["homo-sapiens"], "Normal mistakes must not auto-classify");
assert.equal($("#retry-game").textContent, "처음부터 다시 →");

state.practice = true; state.failed = false; state.mistakes = new Set();
state.queue = ["ascaris-lumbricoides"]; state.round = 0; state.score = 0;
context.placeCard("homo-sapiens", "join");
assert.equal(state.round, 1); assert.equal(submissions, 2, "Last mistake must still wait for explanation dismissal");
assert.equal($("#failure-copy").textContent, "초록색 카드를 확인하고 계속해 주세요.");
$("#retry-game").click();
assert.equal(submissions, 3);
assert.equal(state.score, 0); assert.equal(state.currentId, null);
assert.match($("#result-copy").textContent, /직접 맞힌 카드 0종 · 자동 배치 1종/);
assert.ok(achievementEvents.includes("practice-complete"), "Finishing practice with automatic placements must award completion");
const eventsBeforeTutorial = achievementEvents.length;
state.practice = false; state.tutorial = true; state.failed = false; state.currentId = "ascaris-lumbricoides";
state.classified = ["homo-sapiens"]; state.tree = logic.buildTree(state.classified, speciesById);
state.expected = logic.getExpectedPlacement(state.classified, state.currentId, speciesById);
context.placeCard("homo-sapiens", "join");
assert.equal(achievementEvents.length, eventsBeforeTutorial, "Tutorials must not record achievement events");

// Exercise the real route's Drizzle queries against SQLite, including the
// migration from an existing leaderboard. No live account or production writes.
const require = createRequire(import.meta.url);
function loadTS(path, overrides = {}) {
  const code = ts.transpileModule(fs.readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: (name) => overrides[name] || require(name), Response, console, GalraeLogic: logic });
  return module.exports;
}
const sqlite = new DatabaseSync(":memory:");
const migrationDir = new URL("../drizzle/", import.meta.url);
const migrations = fs.readdirSync(migrationDir).filter((p) => p.endsWith(".sql")).sort();
for (const migration of migrations.slice(0, -1)) sqlite.exec(fs.readFileSync(new URL(migration, migrationDir), "utf8"));
sqlite.exec("INSERT INTO leaderboard(user_id,display_name,best_score,games_played,achieved_at) VALUES ('test','Tester',17,7,'2020-01-01'),('other','Other',18,2,'2020-01-02')");
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
let user = { id: "test", displayName: "Tester" };
const route = loadTS("../app/api/leaderboard/route.ts", {
  "../../game-auth": { getGameUser: async () => user }, "../../../db": { getDb: () => db },
  "../../../db/schema": schema, "../../../public/data/animals.json": dataset,
  "../../../public/game-logic.js": {},
});
const post = async (body) => route.POST(new Request("https://local/api/leaderboard", { method: "POST", body: JSON.stringify(body) }));
assert.equal((await post({ mode: "practice", score: 31 })).status, 200);
let row = sqlite.prepare("SELECT * FROM leaderboard WHERE user_id='test'").get();
assert.equal(row.best_score, 17); assert.equal(row.games_played, 7); assert.equal(row.achieved_at, "2020-01-01");
assert.equal(row.best_practice_score, 31); assert.equal(row.practice_games_played, 1);
let entries = (await (await route.GET()).json()).entries;
assert.equal(entries[0].displayName, "Other", "Practice must not change normal ranking");
assert.equal(entries.find((r) => r.isCurrentUser).bestPracticeScore, 31);
assert.equal((await post({ mode: "normal", score: 20 })).status, 200);
assert.equal((await post({ mode: "practice", score: 2 })).status, 200);
row = sqlite.prepare("SELECT * FROM leaderboard WHERE user_id='test'").get();
assert.equal(row.best_score, 20); assert.equal(row.games_played, 8);
assert.equal(row.best_practice_score, 31); assert.equal(row.practice_games_played, 2);
assert.equal((await post({ mode: "invalid", score: 100 })).status, 400);
assert.equal((await post({ mode: "practice", score: 207 })).status, 400);
for (const difficulty of ["easy", "medium", "hard"]) {
  const completedIds = ["homo-sapiens", ...logic.createDifficultyQueue(dataset.animals, difficulty, () => .4)];
  const payload = { mode: "normal", difficulty, score: completedIds.length - 1, completedIds };
  assert.equal((await post({ ...payload, completedIds: completedIds.slice(0, -1) })).status, 400);
  assert.equal((await post({ ...payload, mode: "practice" })).status, 400);
  assert.equal((await post({ ...payload, score: payload.score - 1 })).status, 400);
  assert.equal((await post(payload)).status, 200);
  assert.equal(sqlite.prepare(`SELECT ${difficulty}_completed AS done FROM leaderboard WHERE user_id='test'`).get().done, 1);
  assert.equal((await post({ mode: "normal", difficulty, score: 0 })).status, 200);
  assert.equal(sqlite.prepare(`SELECT ${difficulty}_completed AS done FROM leaderboard WHERE user_id='test'`).get().done, 1, "Later failures must preserve completion");
}
assert.equal((await post({ mode: "normal", difficulty: "death", score: 1 })).status, 400);
assert.equal((await post(null)).status, 400);
assert.equal((await post({ mode: "normal", difficulty: "easy", score: 1, completedIds: ["homo-sapiens", "unknown"] })).status, 400);
assert.equal(sqlite.prepare("SELECT hard_completed FROM leaderboard WHERE user_id='other'").get().hard_completed, 0, "Completion must belong to the submitting account");
user = null;
assert.equal((await post({ mode: "practice", score: 1 })).status, 401);
sqlite.close();
const specialEvents = [];
context.recordAchievementEvent = (event, details) => specialEvents.push({ event, details });
for (const scenario of [
  { classified: ["homo-sapiens", "gallus-gallus"], currentId: "anguilla-anguilla" },
  { classified: ["homo-sapiens", "alligator-mississippiensis"], currentId: "gallus-gallus" },
]) for (const mode of ["normal", "practice", "tutorial"]) {
  state.classified = [...scenario.classified];
  state.currentId = scenario.currentId; state.failed = false; state.tutorial = mode === "tutorial"; state.practice = mode === "practice";
  state.tree = logic.buildTree(state.classified, speciesById);
  state.expected = logic.getExpectedPlacement(state.classified, state.currentId, speciesById);
  let target = state.tree;
  while (target.type === "branch" && target.children.length === 1) target = target.children[0];
  const before = specialEvents.length;
  context.placeCard(target.id, "join");
  if (mode === "tutorial") assert.equal(specialEvents.length, before, "Tutorial mistakes must not earn special medals");
  else {
    assert.equal(specialEvents.at(-1).event, "fish-sibling-mistake");
    assert.equal(specialEvents.at(-1).details.classified.length, 2, "Capture the tree before practice auto placement");
    assert.equal(specialEvents.at(-1).details.currentId, scenario.currentId);
  }
}
console.log("Practice: automatic placement, scoring, completion and special fish sibling events in normal/practice but not tutorial passed.");
