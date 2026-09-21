import assert from "node:assert/strict";
import fs from "node:fs";

await import(new URL("../dist/game-logic.js", import.meta.url));
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
console.log(`Validated ${classified.length} species: ${wrapCount} wrap placements, ${joinCount} join placements.`);
