import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const clientSource = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const routeSource = readFileSync(new URL("../app/api/collection/route.ts", import.meta.url), "utf8");
const functionSource = clientSource.match(/async function syncCollection\(\) \{[\s\S]*?\n\}\n\nasync function loadLeaderboard/)?.[0]
  .replace(/\n\nasync function loadLeaderboard$/, "");
assert.ok(functionSource, "Collection sync function must exist");

const requestBatchSize = Number(routeSource.match(/const REQUEST_BATCH_SIZE = (\d+);/)?.[1]);
const insertBatchSize = Number(routeSource.match(/const INSERT_BATCH_SIZE = (\d+);/)?.[1]);
assert.ok(requestBatchSize > 150, "A request must accept more than the old 150-species limit");
assert.ok(insertBatchSize * 2 <= 100, "Each D1 insert must bind at most 100 parameters");
assert.ok(clientSource.includes(`offset += ${requestBatchSize}`), "Client and server request batches must match");

const calls = [];
const speciesIds = ["homo-sapiens", ...Array.from({ length: 1001 }, (_, index) => `species-${index}`)];
const context = {
  currentUser: { id: "test-user" },
  dataset: {},
  HUMAN_ID: "homo-sapiens",
  getCollection: () => speciesIds,
  fetch: async (_url, options) => {
    calls.push(JSON.parse(options.body).speciesIds);
    return { ok: true, status: 200 };
  },
};
const syncCollection = runInNewContext(`(${functionSource})`, context);
await syncCollection();
assert.deepEqual(calls.map((batch) => batch.length), [400, 400, 201]);
assert.equal(calls.flat().length, 1001, "Human must not be sent as a classified species");

context.fetch = async () => ({ ok: false, status: 503 });
await assert.rejects(syncCollection(), /Collection request failed: 503/);
console.log("Validated collection sync beyond 1,000 species and D1 insert parameter limits.");
