import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const clientSource = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const routeSource = readFileSync(new URL("../app/api/collection/route.ts", import.meta.url), "utf8");
const helpers = clientSource.slice(clientSource.indexOf("function normalizeSuccessRecord("), clientSource.indexOf("function migrateSuccessCounts("));
const syncSource = clientSource.slice(clientSource.indexOf("async function syncCollection("), clientSource.indexOf("function recordServerSuccess("));
assert.ok(helpers.includes("function mergeSuccessRecord("), "Success-count merge function must exist");
assert.ok(syncSource.includes("async function syncCollection("), "Collection sync function must exist");

const requestBatchSize = Number(routeSource.match(/const REQUEST_BATCH_SIZE = (\d+);/)?.[1]);
const insertBatchSize = Number(routeSource.match(/const INSERT_BATCH_SIZE = (\d+);/)?.[1]);
assert.ok(requestBatchSize > 150, "A request must accept more than the old 150-species limit");
assert.ok(insertBatchSize * 4 <= 100, "Each D1 insert must bind at most 100 parameters");
assert.ok(syncSource.includes(`offset += ${requestBatchSize}`), "Client and server request batches must match");

let localIds = ["homo-sapiens"];
let localCounts = {};
let remoteRecords = Array.from({ length: 167 }, (_, index) => ({ speciesId: `species-${index}`, count: 1, minimum: true }));
const posted = [];
const knownIds = ["homo-sapiens", ...Array.from({ length: 1001 }, (_, index) => `species-${index}`)];
const context = {
  currentUser: { id: "test-user" }, dataset: {}, HUMAN_ID: "homo-sapiens",
  initialSpeciesIds: new Set(["homo-sapiens", "hibiscus-syriacus"]),
  pendingCollectionWrites: new Set(), speciesById: new Map(knownIds.map((id) => [id, {}])),
  getCollection: () => localIds,
  setCollection: (ids) => { localIds = ids; },
  getSuccessCounts: () => localCounts,
  successCountsKey: () => "test-counts",
  localStorage: { setItem: (_, value) => { localCounts = JSON.parse(value); } },
  renderCollection: () => {},
  responseJson: async (response) => response.body,
  fetch: async (_, options) => {
    if (options?.method !== "POST") return { ok: true, body: { records: remoteRecords } };
    posted.push(JSON.parse(options.body).records);
    return { ok: true };
  },
};
const { syncCollection, mergeSuccessRecord } = runInNewContext(`${helpers}\n${syncSource}\n({ syncCollection, mergeSuccessRecord })`, context);
await syncCollection();
assert.equal(localIds.length, 168, "Server records must restore all 167 cards plus Human");
assert.equal(localCounts["species-0"].count, 1);
assert.equal(localCounts["species-0"].minimum, true, "Unknown historical counts must remain a lower bound");
assert.equal(posted.length, 0, "Already stored cards must not be redundantly uploaded");
assert.equal(mergeSuccessRecord({ count: 3, minimum: false }, { count: 1, minimum: true }).count, 3);
assert.equal(mergeSuccessRecord({ count: 1, minimum: true }, { count: 1, minimum: false }).minimum, false);

localIds = knownIds;
localCounts = Object.fromEntries(knownIds.slice(1).map((id) => [id, { count: 1, minimum: true }]));
remoteRecords = [];
posted.length = 0;
await syncCollection();
assert.deepEqual(posted.map((batch) => batch.length), [400, 400, 201]);
assert.equal(posted.flat().length, 1001, "Human must not be sent as a classified species");

context.speciesById.set("hibiscus-syriacus", {});
context.speciesById.set("ginkgo-biloba", {});
localIds = ["homo-sapiens", "hibiscus-syriacus", "ginkgo-biloba"];
localCounts = { "ginkgo-biloba": { count: 2, minimum: false } };
remoteRecords = [];
posted.length = 0;
await syncCollection();
assert.deepEqual(posted.flat().map((record) => record.speciesId), ["ginkgo-biloba"]);
assert.ok(localIds.includes("hibiscus-syriacus"), "Rose of Sharon stays collected without fabricating a classification count");
assert.equal(localCounts["hibiscus-syriacus"], undefined);

context.fetch = async () => ({ ok: false, status: 503 });
await assert.rejects(syncCollection(), /Collection request failed: 503/);
console.log("Validated server restoration, count merging, and 1,000+ species batches.");
