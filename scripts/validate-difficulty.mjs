import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import "../public/game-logic.js";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const { animals } = JSON.parse(read("../data/animals.json"));
const reviews = JSON.parse(read("../data/taxonomy-rank-review.json"));
const byId = new Map(animals.map((animal) => [animal.id, animal]));
const { createDifficultyQueue, isDifficultyCompletion } = globalThis.GalraeLogic;
assert.equal(Object.keys(reviews).length, animals.length);
for (const animal of animals) {
  assert.deepEqual(animal.taxonomy.rankReview, reviews[animal.id]);
  for (const rank of ["class", "order"]) {
    const known = animal.taxonomy.lineage.some((taxon) => taxon.rank === rank);
    const supplemental = animal.taxonomy.rankReview.supplemental[rank];
    assert.ok(known || supplemental || animal.taxonomy.rankReview.unassigned.includes(rank), `${animal.id}: unchecked ${rank}`);
    if (supplemental) assert.match(supplemental.sourceUrl, /^https:\/\/www\.ncbi\.nlm\.nih\.gov\//);
  }
}
let seed = 42;
const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
for (let run = 0; run < 30; run++) {
  for (const difficulty of ["easy", "medium", "hard"]) {
    const ids = ["homo-sapiens", ...createDifficultyQueue(animals, difficulty, random)];
    assert.equal(isDifficultyCompletion(ids, difficulty, byId), true);
    assert.equal(isDifficultyCompletion(ids.slice(0, -1), difficulty, byId), false);
    assert.equal(isDifficultyCompletion([...ids, ids.at(-1)], difficulty, byId), false);
    if (difficulty === "hard") { assert.equal(ids.length, animals.length); continue; }
    const rank = difficulty === "easy" ? "class" : "order", used = new Set();
    for (const id of ids) {
      const animal = byId.get(id);
      const taxa = animal.taxonomy.lineage.filter((taxon) => taxon.rank === rank);
      const supplement = animal.taxonomy.rankReview.supplemental[rank];
      const names = (taxa.length ? taxa : supplement ? [supplement] : []).map((taxon) => taxon.scientificName);
      assert.ok(names.length);
      for (const name of names) { assert.equal(used.has(name), false, `${difficulty}: duplicate ${name}`); used.add(name); }
    }
  }
}
for (const difficulty of ["easy", "medium"]) {
  const ids = createDifficultyQueue(animals, difficulty, () => .4);
  assert.ok(!ids.includes("pan-troglodytes"), "The initial human must occupy its class/order");
  console.log(`${difficulty}: ${ids.length} cards, no repeated rank including the initial human`);
}
assert.equal(isDifficultyCompletion(["homo-sapiens", "unknown"], "easy", byId), false);
assert.equal(isDifficultyCompletion(null, "easy", byId), false);
assert.throws(() => createDifficultyQueue(animals, "death"));
console.log("Difficulty: 30 shuffled runs per level, full coverage, duplicate/incomplete rejection and 207 verified rank reviews passed.");
