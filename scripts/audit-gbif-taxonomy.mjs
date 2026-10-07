import { mkdir, readFile, writeFile } from "node:fs/promises";

const dataset = JSON.parse(await readFile(new URL("../data/animals.json", import.meta.url), "utf8"));
const records = new Array(dataset.animals.length);
let cursor = 0;

async function worker() {
  while (cursor < dataset.animals.length) {
    const index = cursor++;
    const animal = dataset.animals[index];
    const url = `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(animal.scientificName)}&strict=true`;
    try {
      const response = await fetch(url, { headers: { "User-Agent": "GalraePhylogenyGame/0.1 taxonomy audit" }, signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`GBIF ${response.status}`);
      const match = await response.json();
      const ranked = Object.fromEntries(animal.taxonomy.lineage
        .filter((taxon) => ["phylum", "class", "order", "family", "genus"].includes(taxon.rank))
        .map((taxon) => [taxon.rank, taxon.scientificName]));
      const differences = [];
      if (match.matchType === "EXACT" && match.confidence >= 95 && match.rank === "SPECIES") {
        for (const rank of ["phylum", "class", "order", "family", "genus"]) {
          if (ranked[rank] && match[rank] && ranked[rank].toLowerCase() !== match[rank].toLowerCase()) {
            differences.push({ rank, wikidata: ranked[rank], gbif: match[rank] });
          }
        }
      }
      records[index] = { species: animal.scientificName, matchType: match.matchType,
        confidence: match.confidence, gbifName: match.canonicalName, usageKey: match.usageKey,
        status: match.status, rank: match.rank,
        classification: Object.fromEntries(["phylum", "class", "order", "family", "genus"].map((rank) => [rank, { name: match[rank] ?? null, key: match[`${rank}Key`] ?? null }])), differences };
    } catch (error) {
      records[index] = { species: animal.scientificName, error: String(error) };
    }
  }
}

await Promise.all(Array.from({ length: 6 }, worker));
await mkdir(new URL("../.sites-runtime/", import.meta.url), { recursive: true });
await writeFile(new URL("../.sites-runtime/gbif-audit.json", import.meta.url), `${JSON.stringify(records, null, 2)}\n`);
const differences = records.filter((record) => record.differences?.length);
const unmatched = records.filter((record) => record.matchType !== "EXACT" || record.confidence < 95);
console.log(`Audited ${records.length} species against GBIF: ${differences.length} ranked differences, ${unmatched.length} uncertain matches.`);
console.log(JSON.stringify(differences, null, 2));
