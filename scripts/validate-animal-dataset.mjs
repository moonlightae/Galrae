import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const dataset = JSON.parse(await readFile(path.join(root, "data", "animals.json"), "utf8"));
const koreanSource = await readFile(path.join(root, "data", "animals.ko.json"), "utf8");
const korean = JSON.parse(koreanSource);
if (koreanSource !== await readFile(path.join(root, "public", "data", "animals.ko.json"), "utf8")) {
  throw new Error("Source and public Korean translations must match");
}
const problems = [];
const ids = new Set();

for (const animal of dataset.animals) {
  const label = `${animal.commonName} (${animal.scientificName})`;
  if (ids.has(animal.id)) problems.push(`${label}: duplicate id ${animal.id}`);
  ids.add(animal.id);
  const translation = korean[animal.id];
  if (!/[가-힣]/.test(translation?.commonName || "") || !/[가-힣]/.test(translation?.description || "")) {
    problems.push(`${label}: missing Korean card name or description`);
  }

  const lineage = animal.taxonomy?.lineage || [];
  if (lineage[0]?.wikidataId !== "Q729") problems.push(`${label}: lineage does not begin at Animalia`);
  if (lineage.at(-1)?.wikidataId !== animal.wikidataId) problems.push(`${label}: lineage leaf does not match taxon`);
  if (lineage.at(-1)?.rank !== "species") problems.push(`${label}: record is not species-level`);
  if (!animal.wikipedia?.revisionId || !animal.wikipedia?.revisionUrl) problems.push(`${label}: missing fixed Wikipedia revision`);
  if (!animal.image?.artist || !animal.image?.license || !animal.image?.licenseUrl) problems.push(`${label}: incomplete image license`);
  if (!animal.image?.commonsPageUrl) problems.push(`${label}: missing Commons file page`);
}

if (dataset.speciesCount !== dataset.animals.length) {
  problems.push(`speciesCount is ${dataset.speciesCount}, but animals contains ${dataset.animals.length} records`);
}
if (Object.keys(korean).length !== dataset.animals.length) problems.push("Korean translations must cover exactly the dataset species");

if (problems.length) {
  console.error(problems.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Validated ${dataset.animals.length} species with complete taxonomy, provenance, and image licensing.`);
}
