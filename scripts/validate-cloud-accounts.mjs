import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { importSitesDatabase } from "./import-sites-database.mjs";

const require = createRequire(import.meta.url);
function loadTS(path, overrides) {
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: (name) => overrides[name] || require(name), crypto: globalThis.crypto, TextEncoder, btoa, atob, Date, process: { env: { VERCEL: "1" } } });
  return module.exports;
}
const schema = loadTS("../db/schema.ts", {});
const chatgpt = loadTS("../app/chatgpt-auth.ts", { "next/headers": { headers() { assert.fail("Vercel must not trust client-supplied ChatGPT identity headers"); } }, "next/navigation": {} });
assert.equal(await chatgpt.getChatGPTUser(), null);
const client = createClient({ url: "file::memory:" });
const db = drizzle(client, { schema });
let jar = new Map();
const auth = loadTS("../app/game-auth.ts", { "../db": { getDb: () => db }, "../db/schema": schema,
  "next/headers": { cookies: async () => ({ get: (key) => jar.has(key) ? { value: jar.get(key) } : undefined, set: (key, value) => jar.set(key, value) }) } });
const password = await auth.makePasswordRecord("existing-password-example");
const exported = {
  users: [{ id: "original-user-id", username: "old_user", username_normalized: "old_user", display_name: "기존 사용자",
    password_hash: password.passwordHash, password_salt: password.passwordSalt, password_iterations: password.passwordIterations, is_admin: 0 }],
  leaderboard: [{ user_id: "original-user-id", display_name: "기존 사용자", best_score: 23, games_played: 10 }],
  classified_species: [{ user_id: "original-user-id", species_id: "canis-lupus", success_count: 7, minimum: 0 }],
  plant_progress: [{ user_id: "original-user-id", best_score: 5, normal_attempts: 4 }],
};
assert.deepEqual(await importSitesDatabase(client, exported), { users: 1, leaderboard: 1, classified_species: 1, plant_progress: 1 });
const [user] = await db.select().from(schema.users);
assert.equal(user.id, "original-user-id");
assert.equal(user.passwordHash, password.passwordHash); assert.equal(user.passwordSalt, password.passwordSalt);
assert.equal(await auth.verifyPassword("existing-password-example", user.passwordHash, user.passwordSalt, user.passwordIterations), true);
assert.equal(await auth.verifyPassword("incorrect", user.passwordHash, user.passwordSalt, user.passwordIterations), false);
await auth.createSession(user.id);
assert.equal((await auth.getGameUser()).id, user.id);
const firstDevice = new Map(jar);
jar = new Map();
assert.equal(await auth.getGameUser(), null);
await auth.createSession(user.id);
assert.equal((await auth.getGameUser()).id, user.id);
assert.equal((await db.select().from(schema.sessions)).length, 2, "Separate browsers must authenticate against the same account");
await auth.destroySession();
assert.equal(await auth.getGameUser(), null);
jar = firstDevice;
assert.equal((await auth.getGameUser()).id, user.id, "Signing out on one device must preserve the other session");
assert.equal((await db.select().from(schema.classifiedSpecies))[0].successCount, 7);
assert.equal((await db.select().from(schema.plantProgress))[0].bestScore, 5);
await assert.rejects(importSitesDatabase(client, exported), /will not overwrite/);
assert.equal((await db.select().from(schema.users)).length, 1);
const fresh = createClient({ url: "file::memory:" });
try {
  await assert.rejects(importSitesDatabase(fresh, { ...exported, classified_species: [{ ...exported.classified_species[0], unexpected: "bad" }] }), /does not match/);
  assert.equal(Number((await fresh.execute("SELECT COUNT(*) AS count FROM leaderboard")).rows[0].count), 0, "Failed imports must roll back all game records");
  assert.equal((await importSitesDatabase(fresh, exported)).users, 1, "A rolled-back import must be retryable");
} finally { fresh.close(); client.close(); }
if (process.argv.includes("--manifest")) {
  const routes = JSON.parse(readFileSync(new URL("../.next/server/app-paths-manifest.json", import.meta.url), "utf8"));
  for (const route of ["auth/login", "auth/register", "auth/logout", "collection", "leaderboard", "achievements", "plant-achievements", "me"]) {
    assert.ok(routes[`/api/${route}/route`], `Missing server API: ${route}`);
  }
  const files = JSON.parse(readFileSync(new URL("../.next/server/app/api/auth/login/route.js.nft.json", import.meta.url), "utf8")).files;
  assert.ok(!files.some((file) => /wrangler|miniflare/.test(file)), "Vercel login must not require the Cloudflare runtime");
}
console.log("Cloud accounts: original password hashes and IDs, game records, cross-device login, independent logout, overwrite refusal and transactional import rollback passed.");
