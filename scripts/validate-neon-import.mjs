import assert from "node:assert/strict";
import { normalizeExport, importNeonDatabase } from "./import-neon-database.mjs";

const source = { users: [{ id: "old", password_hash: "a".repeat(44), password_salt: "salt", password_iterations: 100000, is_admin: 1 }],
  leaderboard: [{ user_id: "old", best_score: 23, has_failed: 0 }],
  classified_species: [{ user_id: "old", species_id: "canis-lupus", success_count: 7, minimum: 0 }], plant_progress: [] };
const normalized = normalizeExport(source);
assert.equal(normalized.users[0].is_admin, true);
assert.equal(normalized.leaderboard[0].has_failed, false);
assert.equal(normalized.classified_species[0].minimum, false);
assert.equal(source.users[0].is_admin, 1, "Source data must remain unchanged");
assert.throws(() => normalizeExport({ ...source, users: [] }), /Incomplete/);
assert.throws(() => normalizeExport({ ...source, users: [source.users[0], source.users[0]] }), /Invalid/);
assert.throws(() => normalizeExport({ ...source, classified_species: [{ ...source.classified_species[0], user_id: "missing" }] }), /Invalid/);
assert.throws(() => normalizeExport({ ...source, users: [{ ...source.users[0], is_admin: 2 }] }), /boolean/);
assert.throws(() => normalizeExport({ ...source, users: [{ ...source.users[0], injected: "unexpected" }] }), /Unknown/);
let transactionCalled = false;
const sql = { query: async () => [{ users: "users", receipt: null }], transaction: async () => { transactionCalled = true; } };
await assert.rejects(importNeonDatabase(sql, source), /will not overwrite/);
assert.equal(transactionCalled, false, "Existing destinations must be refused before any write");
const counts = { users: 1, leaderboard: 1, classified_species: 1, plant_progress: 0 };
sql.query = async (query) => query.startsWith("SELECT to_regclass") ? [{ users: "users", receipt: "galrae_imports" }] : [{ counts: JSON.stringify(counts) }];
assert.deepEqual(await importNeonDatabase(sql, source), { ...counts, alreadyImported: true });
assert.equal(transactionCalled, false, "Retrying the same completed import must not overwrite newer game records");
console.log("Neon import: boolean conversion, source preservation, invalid references/columns, overwrite refusal and safe retry passed.");
