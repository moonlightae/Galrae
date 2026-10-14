import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { taxonRanks, classRanks } from "../public/taxon-ranks.js";
import { classAncestors, getClassIds } from "../public/class-ancestors.js";

const { animals } = JSON.parse(readFileSync(new URL("../data/animals.json", import.meta.url)));
const audit = JSON.parse(readFileSync(new URL("../data/class-rank-audit.json", import.meta.url)));
assert.equal(audit.species.length, animals.length);
assert.equal(new Set(audit.species.map((animal) => animal.id)).size, animals.length);
assert.equal(audit.taxa.length, 116);
assert.equal(audit.national2025.speciesCount, 62604);
assert.equal(audit.national2025.matchedSpecies.length, 59);
assert.ok(audit.taxa.every((taxon) => taxon.coverage !== "not in selected lineage"));
for (const animal of animals) {
  assert.ok(audit.species.some((review) => review.id === animal.id && review.ncbiTaxonId === animal.taxonomy.rankReview.ncbiTaxonId));
  const ranked = animal.taxonomy.lineage.filter((taxon) => classRanks.includes(taxon.rank));
  assert.ok(ranked.filter((taxon) => taxon.rank === "class").length <= 1, `${animal.id}: repeated class`);
  ranked.forEach((taxon, index) => {
    assert.ok(!index || classRanks.indexOf(taxon.rank) >= classRanks.indexOf(ranked[index - 1].rank), `${animal.id}: rank runs backwards`);
    assert.equal(taxon.rank, taxonRanks[taxon.wikidataId].rank);
    assert.ok(classAncestors[taxon.wikidataId], `${animal.id}: missing taxon note`);
  });
  for (const id of getClassIds(animal)) {
    assert.ok(classAncestors[id]?.sources.length, `${id}: missing references`);
    assert.ok(taxonRanks[id].sources.length, `${id}: missing official comparison`);
  }
  if (animal.taxonomy.lineage.some((taxon) => taxon.scientificName === "Actinopterygii")) {
    assert.deepEqual(ranked.map((taxon) => taxon.rank), ["class", "subclass", "infraclass"]);
    assert.deepEqual(ranked.map((taxon) => taxon.scientificName).slice(0, 2), ["Actinopterygii", "Neopterygii"]);
    assert.ok(["Teleostei", "Holostei"].includes(ranked.at(-1).scientificName));
  }
}
assert.equal(taxonRanks.Q127282.koName, "조기어강");
assert.equal(taxonRanks.Q204861.koName, "진골어하강");
assert.equal(taxonRanks.Q846164.koName, "전골어하강");
assert.equal(taxonRanks.Q160830.rank, "superclass");
assert.equal(taxonRanks.Q132674.rank, "subclass");
assert.equal(taxonRanks.Q1934949.koName, "크로마도레아강");
for (const name of ["Oligochaeta", "Selachii"]) assert.ok(animals.some((animal) => animal.taxonomy.lineage.some((taxon) => taxon.scientificName === name)));
for (const review of audit.taxa.filter((taxon) => taxon.taxonId)) {
  assert.equal(taxonRanks[review.taxonId].rank, review.selectedRank);
  assert.equal(taxonRanks[review.taxonId].koName, review.nameKo);
}
console.log(`Official comparisons cover ${animals.length} species and ${audit.taxa.length} taxa; ${Object.keys(classAncestors).length} notes, fish ranks, unique classes and rank order passed.`);
