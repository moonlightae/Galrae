import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";
import { webcrypto } from "node:crypto";
import { isClassificationPolytomyMistake, isGrassSiblingMistake } from "../public/achievements.js";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const animalData = JSON.parse(read("../public/data/animals.json"));
const plantData = JSON.parse(read("../public/data/plants.json"));
const animalMap = new Map(animalData.animals.map((species) => [species.id, species]));
const plantMap = new Map(plantData.plants.map((species) => [species.id, species]));
const validId = (id) => !["homo-sapiens", plantData.initialSpeciesId].includes(id) && (animalMap.has(id) || plantMap.has(id));
const source = read("../public/local-api.js");
const values = new Map();
const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
const hash = Buffer.from(await webcrypto.subtle.digest("SHA-256", new TextEncoder().encode("galrae-local:legacy:password123"))).toString("hex");
storage.setItem("galrae.local.accounts.v1", JSON.stringify([{ id: "legacy", username: "legacy", displayName: "기존 계정", passwordHash: hash }]));
storage.setItem("galrae.local.scores.v1", JSON.stringify({ legacy: { bestScore: 20, gamesPlayed: 7 } }));
function install() {
  const context = { animalMap, plantMap, plantData, validId, isClassificationPolytomyMistake, isGrassSiblingMistake,
    localStorage: storage, location: { origin: "https://game.test" }, crypto: webcrypto, TextEncoder, Response, Request, URL,
    fetch: async () => Response.json({ external: true }), GalraeLogic: globalThis.GalraeLogic };
  context.window = context;
  vm.runInNewContext(source.slice(source.indexOf("(function installLocalApi")), context);
  return context;
}
let browser = install();
const get = async (path) => (await browser.fetch(path)).json();
const post = (path, body) => browser.fetch(path, { method: "POST", body: JSON.stringify(body) });
assert.equal((await get("/api/me")).user, null);
let savedAccounts = JSON.parse(storage.getItem("galrae.local.accounts.v1"));
assert.equal(savedAccounts.find((account) => account.username === "admin").id, "local-admin", "Restore the default Vercel admin alongside legacy accounts");
assert.equal(savedAccounts.find((account) => account.username === "legacy").passwordHash, hash, "Seeding admin must preserve existing credentials");
const admin = savedAccounts.find((account) => account.username === "admin");
admin.passwordHash = "previously-changed-admin-password";
storage.setItem("galrae.local.accounts.v1", JSON.stringify(savedAccounts));
await get("/api/me");
savedAccounts = JSON.parse(storage.getItem("galrae.local.accounts.v1"));
assert.equal(savedAccounts.filter((account) => account.username === "admin").length, 1);
assert.equal(savedAccounts.find((account) => account.username === "admin").passwordHash, "previously-changed-admin-password", "Never reset an existing admin password");
assert.equal((await post("/api/auth/login", { username: "legacy", password: "password123" })).status, 200);
assert.equal((await get("/api/me")).gamesPlayed, 7);
assert.equal((await get("/api/achievements")).stats.bestScore, 20);
assert.equal((await get("/api/achievements")).stats.normalAttempts, 7);
assert.equal((await get("https://other.test/api/example")).external, true);
const animal = "canis-lupus";
assert.ok(animalMap.has(animal));
await post("/api/collection", { action: "record", speciesId: animal });
await post("/api/collection", { records: [{ speciesId: animal, count: 5, minimum: false }] });
await post("/api/collection", { records: [{ speciesId: animal, count: 1, minimum: true }] });
assert.equal((await get("/api/collection")).records[0].count, 5);
assert.equal((await post("/api/collection", { action: "record", speciesId: "homo-sapiens" })).status, 400);
await post("/api/achievements", { event: "normal-start" });
await post("/api/leaderboard", { score: 10, mode: "normal", difficulty: "hard" });
await post("/api/leaderboard", { score: 3, mode: "practice", difficulty: "hard" });
let stats = (await get("/api/achievements")).stats;
assert.equal(stats.bestScore, 20); assert.equal(stats.bestPracticeScore, 3);
assert.equal(stats.gamesPlayed, 8); assert.equal(stats.normalAttempts, 8);
assert.equal(stats.collected, 1); assert.equal(stats.totalSuccesses, 5);
assert.equal((await get("/api/leaderboard")).entries[0].uniqueSpeciesCount, 1);
await post("/api/plant-achievements", { event: "normal-start" });
await post("/api/plant-achievements", { event: "result", mode: "normal", difficulty: "easy", score: 4 });
assert.equal((await get("/api/plant-achievements")).stats.bestScore, 4);
assert.equal((await get("/api/achievements")).stats.bestScore, 20);
assert.equal((await post("/api/plant-achievements", { event: "result", mode: "normal", difficulty: "easy", score: 45 })).status, 400);
assert.equal((await post("/api/leaderboard", { score: -1 })).status, 400);
await post("/api/auth/logout", {});
assert.equal((await post("/api/collection", { action: "record", speciesId: animal })).status, 401);
assert.equal((await post("/api/auth/register", { username: "new_user", displayName: "새 계정", password: "password123", confirmPassword: "password123" })).status, 200);
assert.equal((await get("/api/collection")).records.length, 0);
assert.equal((await get("/api/achievements")).stats.bestScore, undefined);
browser = install();
assert.equal((await get("/api/me")).user.username, "new_user", "Session must survive a reload");
await post("/api/auth/login", { username: "legacy", password: "password123" });
assert.equal((await get("/api/achievements")).stats.bestScore, 20);
storage.setItem = () => { throw new Error("quota"); };
assert.equal((await post("/api/collection", { action: "record", speciesId: animal })).status, 503);
const nativeFetch = globalThis.fetch;
globalThis.window = { fetch: nativeFetch, GalraeLogic: globalThis.GalraeLogic };
globalThis.localStorage = storage;
globalThis.location = { origin: "https://game.test" };
globalThis.fetch = async (path) => Response.json(path.includes("animals.json") ? animalData : plantData);
try {
  await import("../public/local-api.js?bootstrap-test");
  assert.equal((await (await window.fetch("/api/me")).json()).user.username, "legacy", "The complete browser module must install after loading both datasets");
} finally {
  globalThis.fetch = nativeFetch;
  delete globalThis.window; delete globalThis.localStorage; delete globalThis.location;
}
if (process.argv.includes("--manifest")) {
  assert.ok(existsSync(new URL("../.next/routes-manifest.json", import.meta.url)));
  const routes = JSON.parse(read("../.next/server/app-paths-manifest.json"));
  assert.ok(routes["/page"]); assert.ok(!Object.keys(routes).some((route) => route.startsWith("/api/")));
  const chunks = JSON.parse(read("../.next/server/app/page.js.nft.json")).files;
  assert.ok(!chunks.some((file) => file.includes("wrangler") || file.includes("miniflare")), "Vercel must not bundle Cloudflare runtime");
}
console.log("Vercel browser storage: legacy login/scores, registration, account isolation, collection merging, practice, kingdom separation, persistence and storage errors passed.");
