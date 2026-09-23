import { readFile, writeFile } from "node:fs/promises";
import { curateTaxonomy } from "./taxonomy-curation.mjs";

const sourceUrl = new URL("../data/animals.json", import.meta.url);
const publicUrl = new URL("../public/data/animals.json", import.meta.url);
const dataset = JSON.parse(await readFile(sourceUrl, "utf8"));
dataset.animals = curateTaxonomy(dataset.animals);
const output = `${JSON.stringify(dataset, null, 2)}\n`;
await Promise.all([writeFile(sourceUrl, output), writeFile(publicUrl, output)]);
console.log(`Applied curated taxonomy to ${dataset.animals.length} species.`);
