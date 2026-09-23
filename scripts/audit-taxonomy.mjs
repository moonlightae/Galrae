import { readFileSync } from "node:fs";

const dataset = JSON.parse(readFileSync(new URL("../data/animals.json", import.meta.url), "utf8"));
const taxa = new Map();
const parents = new Map();

for (const animal of dataset.animals) {
  for (const [index, taxon] of animal.taxonomy.lineage.entries()) {
    const id = taxon.wikidataId;
    if (!taxa.has(id)) taxa.set(id, { name: taxon.scientificName, species: new Set() });
    taxa.get(id).species.add(animal.id);
    if (index > 0) {
      if (!parents.has(id)) parents.set(id, new Set());
      parents.get(id).add(animal.taxonomy.lineage[index - 1].wikidataId);
    }
  }
}

const repeatedTaxa = [...parents].filter(([, ids]) => ids.size > 1)
  .map(([id, ids]) => ({ id, name: taxa.get(id).name, parents: [...ids] }));
const clades = [...taxa].filter(([, taxon]) => taxon.species.size > 1);
const crossingClades = [];
for (let left = 0; left < clades.length; left += 1) {
  for (let right = left + 1; right < clades.length; right += 1) {
    const [leftId, leftTaxon] = clades[left];
    const [rightId, rightTaxon] = clades[right];
    const overlap = [...leftTaxon.species].filter((id) => rightTaxon.species.has(id)).length;
    if (overlap && overlap < leftTaxon.species.size && overlap < rightTaxon.species.size) {
      crossingClades.push({
        left: `${leftTaxon.name} (${leftId}, ${leftTaxon.species.size})`,
        right: `${rightTaxon.name} (${rightId}, ${rightTaxon.species.size})`,
        overlap,
      });
    }
  }
}

console.log(`Audited ${dataset.speciesCount} species and ${taxa.size} taxon IDs.`);
console.log(`Taxa with multiple direct parents: ${repeatedTaxa.length}`);
console.log(JSON.stringify(repeatedTaxa.slice(0, 30), null, 2));
console.log(`Crossing sampled clades: ${crossingClades.length}`);
console.log(JSON.stringify(crossingClades.slice(0, 30), null, 2));
if (repeatedTaxa.length || crossingClades.length) process.exitCode = 1;
