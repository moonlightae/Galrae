import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { taxonCatalog } from "../public/taxon-catalog.js";

const read = (file) => JSON.parse(readFileSync(new URL(`../data/${file}`, import.meta.url), "utf8"));
const { animals } = read("animals.json");
const additions = read("animal-additions-2026-10.json");
const byId = new Map(animals.map((animal) => [animal.id, animal]));
assert.equal(additions.length, 107);
assert.equal(new Set(additions.map((animal) => animal.id)).size, additions.length);
for (const addition of additions) {
  assert.equal(byId.get(addition.id)?.scientificName, addition.scientificName);
  assert.ok(byId.has(addition.reference), `${addition.id}: missing reference species`);
}
// These groups are monotypic or lack a verified, reusable image for a second species.
const exceptions = new Set(["Priapulimorpha", "Priapulomorpha", "Hoilungea", "Trichoplacea", "Cestida"]);
for (const taxon of Object.values(taxonCatalog).filter((taxon) => ["class", "order"].includes(taxon.rank))) {
  assert.ok(taxon.members.length >= 2 || exceptions.has(taxon.name), `${taxon.name}: needs a second species`);
  for (const id of taxon.members) assert.ok(byId.has(id), `${taxon.name}: unknown member ${id}`);
}
for (const name of ["Diplopoda", "Trematoda", "Polyplacophora"]) {
  const taxon = Object.values(taxonCatalog).find((taxon) => taxon.name === name);
  assert.ok(taxon.members.length >= 2 && taxon.members.length <= 4, `${name}: expected 2–4 species`);
}
console.log(`Validated ${additions.length} additions and class/order coverage across ${animals.length} species.`);
