import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { Client, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { isClassificationPolytomyMistake, isGrassSiblingMistake } from "../public/achievements.js";
import "../public/game-logic.js";

const require = createRequire(import.meta.url);
const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const animals = JSON.parse(read("../public/data/animals.json"));
const plants = JSON.parse(read("../public/data/plants.json"));
const species = new Map(animals.animals.map((animal) => [animal.id, animal]));
function load(path, overrides = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: (key) => overrides[key] ?? require(key),
    Response, Request, URL, crypto: globalThis.crypto, globalThis, console, TextEncoder, btoa, atob, Date });
  return module.exports;
}
const useNeon = process.argv.includes("--neon");
const schema = load(useNeon ? "../db/schema-neon.ts" : "../db/schema.ts");
let client, db;
if (useNeon) {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for PostgreSQL verification");
  neonConfig.webSocketConstructor = WebSocket;
  client = new Client(process.env.DATABASE_URL);
  await client.connect();
  await client.query("BEGIN");
  const namespace = `qa_${crypto.randomUUID().replaceAll("-", "")}`;
  await client.query(`CREATE SCHEMA "${namespace}"`);
  await client.query(`SET LOCAL search_path TO "${namespace}", public`);
  const sql = read("../drizzle-neon/0000_initial_neon.sql").replaceAll('REFERENCES "public".', `REFERENCES "${namespace}".`);
  for (const statement of sql.split("--> statement-breakpoint").filter((part) => part.trim())) await client.query(statement);
  db = drizzleNeon(client, { schema });
} else {
  client = createClient({ url: "file::memory:" });
  db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)) });
}
try {
for (const id of ["alice", "bob", "carol"]) await db.insert(schema.users).values({ id, username: id, usernameNormalized: id,
  displayName: id, passwordHash: "fixture", passwordSalt: "fixture", passwordIterations: 1 });
await db.insert(schema.leaderboard).values(["alice", "bob", "carol"].map((id, index) => ({ userId: id, displayName: id, bestScore: index * 20 })));
let user = null;
const overrides = {
  "../../../db": { getDb: () => db }, "../../../db/schema": schema,
  "../../game-auth": { getGameUser: async () => user, normalizeUsername: (name) => name.normalize("NFKC").toLowerCase() },
  "../../../public/data/animals.json": { default: animals }, "../../../public/data/plants.json": { default: plants },
  "../../../public/game-logic.js": {},
  "../../../public/achievements.js": { isClassificationPolytomyMistake, isGrassSiblingMistake },
};
const friends = load("../app/api/friends/route.ts", overrides);
const leaderboard = load("../app/api/leaderboard/route.ts", overrides);
const battles = load("../app/api/battles/route.ts", overrides);
const post = (route, body) => route.POST(new Request("https://test/api", { method: "POST", body: JSON.stringify(body) }));
let jar = new Map();
const auth = load("../app/game-auth.ts", { "../db": { getDb: () => db }, "../db/schema": schema,
  "next/headers": { cookies: async () => ({ get: (key) => jar.has(key) ? { value: jar.get(key) } : undefined, set: (key, value) => jar.set(key, value) }) } });
const password = await auth.makePasswordRecord("qa-existing-password");
await db.update(schema.users).set(password).where(eq(schema.users.id, "alice"));
const login = load("../app/api/auth/login/route.ts", { "../../../../db": { getDb: () => db }, "../../../../db/schema": schema, "../../../game-auth": auth });
assert.equal((await post(login, { username: "alice", password: "qa-existing-password" })).status, 200);
assert.equal((await auth.getGameUser()).id, "alice");
assert.equal((await post(login, { username: "alice", password: "wrong-password" })).status, 401);
const firstJar = new Map(jar); jar = new Map();
assert.equal(await auth.getGameUser(), null);
await post(login, { username: "alice", password: "qa-existing-password" });
assert.equal((await auth.getGameUser()).id, "alice");
await auth.destroySession(); assert.equal(await auth.getGameUser(), null);
jar = firstJar; assert.equal((await auth.getGameUser()).id, "alice");
const get = (id) => battles.GET(new Request(`https://test/api/battles${id ? `?id=${id}` : ""}`));
const list = async () => (await (await friends.GET()).json()).friends;
assert.equal((await friends.GET()).status, 401);
assert.equal((await leaderboard.GET()).status, 401);
assert.equal((await get()).status, 401);
user = { id: "alice" };
assert.equal((await post(friends, null)).status, 400);
assert.equal((await post(friends, { action: "request", username: "alice" })).status, 400);
assert.equal((await post(friends, { action: "request", username: "BOB" })).status, 200);
await post(friends, { action: "request", username: "bob" });
assert.equal((await list()).length, 1, "Repeated friend requests must not duplicate records");
assert.equal((await post(friends, { action: "accept", username: "bob" })).status, 409, "Requester cannot accept their own request");
assert.equal((await post(battles, { action: "create", friendId: "bob", kingdom: "animals" })).status, 403);
user = { id: "carol" };
assert.equal((await list()).length, 0, "Friend requests must be private");
assert.equal((await post(friends, { action: "accept", username: "alice" })).status, 409);
user = { id: "bob" };
assert.equal((await list())[0].incoming, true);
assert.equal((await post(friends, { action: "accept", username: "alice" })).status, 200);
let ranking = (await (await leaderboard.GET()).json()).entries;
assert.equal(ranking.length, 2); assert.equal(ranking[0].displayName, "bob");
assert.ok(!ranking.some((entry) => entry.displayName === "carol"), "Nonfriends' scores must not leave the server");
user = { id: "alice" };
let room = (await (await post(battles, { action: "create", friendId: "bob", kingdom: "animals" })).json()).room;
assert.equal(room.status, "waiting");
assert.ok(!("queue" in room), "Future cards stay on the server");
const move = (payload) => post(battles, { action: "move", id: room.id, revision: room.revision, ...payload });
assert.equal((await move({ targetId: "homo-sapiens", placement: "wrap" })).status, 409);
assert.equal((await post(battles, { action: "join", id: room.id, revision: room.revision })).status, 409);
user = { id: "carol" };
assert.equal((await get(room.id)).status, 404);
assert.equal((await move({ targetId: "homo-sapiens", placement: "wrap" })).status, 404);
user = { id: "bob" };
assert.equal((await (await post(battles, { action: "create", friendId: "alice", kingdom: "plants" })).json()).room.id, room.id, "Reverse invitations reuse the existing match");
room = (await (await post(battles, { action: "join", id: room.id, revision: room.revision })).json()).room;
const startedRoom = room;
assert.equal(room.turnId, "alice");
assert.equal((await move({ targetId: "homo-sapiens", placement: "wrap" })).status, 409);
user = { id: "alice" };
const expected = globalThis.GalraeLogic.getExpectedPlacement(room.classified, room.currentId, species);
const oldRevision = room.revision;
const results = await Promise.all([move(expected), move(expected)]);
assert.deepEqual(results.map((response) => response.status).sort(), [200, 409], "Concurrent duplicate moves commit once");
room = (await (await get(room.id)).json()).room;
assert.equal(room.revision, oldRevision + 1); assert.equal(room.classified.length, 2); assert.equal(room.turnId, "bob");
assert.equal((await move(expected)).status, 409);
user = { id: "bob" };
assert.equal((await move({ targetId: "homo-sapiens", placement: "invalid" })).status, 400);
const tree = globalThis.GalraeLogic.buildTree(room.classified, species);
const correct = globalThis.GalraeLogic.getExpectedPlacement(room.classified, room.currentId, species);
const wrong = [tree.id, ...room.classified].flatMap((targetId) => ["wrap", "join"].map((placement) => ({ targetId, placement })))
  .find((placement) => !globalThis.GalraeLogic.isEquivalentPlacement(tree, correct, placement.targetId, placement.placement));
room = (await (await move(wrong)).json()).room;
assert.equal(room.status, "finished"); assert.equal(room.winnerId, "alice"); assert.equal(room.reason, "mistake");
assert.equal((await move(correct)).status, 409);
assert.equal((await db.select().from(schema.classifiedSpecies)).length, 0, "Battle moves must not award regular collection records");
room = (await (await post(battles, { action: "create", friendId: "alice", kingdom: "plants" })).json()).room;
assert.equal(room.classified[0], "hibiscus-syriacus");
user = { id: "alice" };
room = (await (await post(battles, { action: "join", id: room.id, revision: room.revision })).json()).room;
const plantSpecies = new Map(plants.plants.map((plant) => [plant.id, plant]));
while (room.status === "active") {
  user = { id: room.turnId };
  const expected = globalThis.GalraeLogic.getExpectedPlacement(room.classified, room.currentId, plantSpecies);
  const response = await move(expected);
  assert.equal(response.status, 200);
  room = (await response.json()).room;
}
assert.equal(room.reason, "complete"); assert.equal(room.winnerId, null); assert.equal(room.currentId, null);
assert.equal(room.classified.length, plants.plants.length, "A complete shared tree must end in a draw");
user = { id: "alice" };
room = (await (await post(battles, { action: "create", friendId: "bob", kingdom: "animals" })).json()).room;
user = { id: "bob" };
room = (await (await post(battles, { action: "join", id: room.id, revision: room.revision })).json()).room;
room = (await (await post(battles, { action: "forfeit", id: room.id, revision: room.revision })).json()).room;
assert.equal(room.reason, "forfeit"); assert.equal(room.winnerId, "alice");
room = (await (await post(battles, { action: "create", friendId: "alice", kingdom: "plants" })).json()).room;
assert.equal((await post(battles, { action: "forfeit", id: room.id, revision: room.revision })).status, 200);
await post(friends, { action: "remove", username: "alice" });
assert.equal((await list()).length, 0);
ranking = (await (await leaderboard.GET()).json()).entries;
assert.equal(ranking.length, 1); assert.equal(ranking[0].displayName, "bob");
user = { id: "bob", displayName: "bob" };
const collection = load("../app/api/collection/route.ts", overrides);
assert.equal((await post(collection, { records: [{ speciesId: "canis-lupus", count: 7, minimum: false }] })).status, 200);
await post(collection, { records: [{ speciesId: "canis-lupus", count: 2, minimum: true }] });
let record = (await (await collection.GET()).json()).records[0];
assert.equal(record.count, 7); assert.equal(record.minimum, false);
await post(collection, { action: "record", speciesId: "canis-lupus" });
record = (await (await collection.GET()).json()).records[0]; assert.equal(record.count, 8);
assert.equal((await post(leaderboard, { score: 30 })).status, 200);
await post(leaderboard, { score: 1 });
await post(leaderboard, { score: 40, mode: "practice" });
const score = (await (await leaderboard.GET()).json()).entries[0];
assert.equal(score.bestScore, 30); assert.equal(score.bestPracticeScore, 40);
const achievements = load("../app/api/achievements/route.ts", overrides);
assert.equal((await post(achievements, { event: "failure" })).status, 200);
assert.equal((await (await achievements.GET()).json()).stats.hasFailed, true);
const plantAchievements = load("../app/api/plant-achievements/route.ts", overrides);
assert.equal((await post(plantAchievements, { event: "result", score: 3, mode: "normal", difficulty: "easy" })).status, 200);
assert.equal((await (await plantAchievements.GET()).json()).stats.bestScore, 3);

const source = read("../public/app.js");
const elements = new Map();
const $ = (selector) => {
  if (!elements.has(selector)) elements.set(selector, { hidden: false, textContent: "", classList: { remove() {}, toggle() {} }, setAttribute() {} });
  return elements.get(selector);
};
let displayedCard, submittedMove;
const context = { $, dataset: animals, currentUser: { id: "alice" }, state: {}, speciesById: species,
  ...globalThis.GalraeLogic, selectKingdom() {}, scoreSubmitted: false, lobbyPages: {},
  navigationShell: {}, game: {}, card: $("card"), setToolbarOpen() {}, setCard: (id) => { displayedCard = id; },
  renderTree() {}, resetTreeView() {}, clearPreview() {}, social: { move: (...args) => { submittedMove = args; } },
};
vm.runInNewContext(source.slice(source.indexOf("function showBattle("), source.indexOf("function escapeHtml(")), context);
context.showBattle(startedRoom);
assert.equal(context.state.battle.id, startedRoom.id); assert.equal(displayedCard, startedRoom.currentId);
assert.equal($("#score-label").textContent, "내 차례");
assert.equal($("#result-modal").hidden, true);
vm.runInNewContext(source.slice(source.indexOf("function placeCard("), source.indexOf("function failRound(")), context);
context.placeCard(expected.targetId, expected.placement);
assert.deepEqual(submittedMove, [expected.targetId, expected.placement], "Battle placements must go to the server instead of normal scoring");
context.showBattle({ ...startedRoom, status: "finished", reason: "forfeit", winnerId: "alice" });
assert.equal($("#result-title").textContent, "승리했습니다!"); assert.equal($("#result-modal").hidden, false);
console.log(`${useNeon ? "PostgreSQL" : "SQLite"}: login across devices, independent logout, record merging, score/medal persistence, private friends, atomic battle turns, win/draw/forfeit and board restoration passed.`);
} finally {
  if (useNeon) { await client.query("ROLLBACK"); await client.end(); }
  else client.close();
}
