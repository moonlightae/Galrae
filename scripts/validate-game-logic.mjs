import assert from "node:assert/strict";
import fs from "node:fs";

await import(new URL("../public/game-logic.js", import.meta.url));
const { buildTree, collectLeafIds, findNodeById, getExpectedPlacement } = globalThis.GalraeLogic;
const dataset = JSON.parse(fs.readFileSync(new URL("../data/animals.json", import.meta.url), "utf8"));
const speciesById = new Map(dataset.animals.map((animal) => [animal.id, animal]));
const humanId = "homo-sapiens";
const classified = [humanId];
let joinCount = 0;
let wrapCount = 0;

for (const animal of dataset.animals.filter((entry) => entry.id !== humanId)) {
  const expected = getExpectedPlacement(classified, animal.id, speciesById);
  const before = buildTree(classified, speciesById);
  assert.ok(findNodeById(before, expected.targetId), `Missing target ${expected.targetId} for ${animal.id}`);
  if (expected.placement === "join") joinCount += 1;
  if (expected.placement === "wrap") wrapCount += 1;
  classified.push(animal.id);
  const after = buildTree(classified, speciesById);
  assert.equal(collectLeafIds(after).length, classified.length, `Leaf count mismatch after ${animal.id}`);
}

assert.equal(classified.length, dataset.speciesCount);
assert.ok(joinCount > 0, "Dataset sequence never exercised join placement");
assert.ok(wrapCount > 0, "Dataset sequence never exercised wrap placement");

const ctenophoreId = "bolinopsis-infundibulum";
const spongeId = "amphimedon-queenslandica";
const cnidarianId = "aurelia-aurita";
const earlyAnimalTree = buildTree([ctenophoreId, spongeId, cnidarianId, humanId], speciesById);
assert.equal(earlyAnimalTree.id, "Q729", "Animalia root must remain available as a placement target");
assert.equal(earlyAnimalTree.children.length, 2, "Ctenophora must split before the remaining sampled animals");
const ctenophoreBranch = earlyAnimalTree.children.find((node) => collectLeafIds(node).includes(ctenophoreId));
const remainingBranch = earlyAnimalTree.children.find((node) => !collectLeafIds(node).includes(ctenophoreId));
assert.deepEqual(collectLeafIds(ctenophoreBranch), [ctenophoreId]);
assert.ok(remainingBranch, "Porifera and Planulozoa branch is missing");
assert.equal(remainingBranch.children.length, 2, "Porifera must split before Cnidaria and Bilateria");
const planulozoa = remainingBranch.children.find((node) => collectLeafIds(node).includes(cnidarianId));
assert.deepEqual(new Set(collectLeafIds(planulozoa)), new Set([cnidarianId, humanId]));
console.log(`Validated ${classified.length} species: ${wrapCount} wrap placements, ${joinCount} join placements.`);
