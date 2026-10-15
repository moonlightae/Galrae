import { readFileSync, writeFileSync } from "node:fs";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { taxonRanks } from "../public/taxon-ranks.js";
await import("../public/game-logic.js");
const read = (name) => JSON.parse(readFileSync(new URL(`../${name}`, import.meta.url), "utf8"));
const { animals } = read("data/animals.json");
const names = read("data/taxa.ko.json");
const national = read(".sites-runtime/national-all-ranks.json");
const references = read(".sites-runtime/ncbi-ranks-current.json");
const ncbi = new Map();
for (const record of references) {
  for (const taxon of [...record.lineage, { id: record.taxonId, name: record.name, rank: "species" }]) ncbi.set(taxon.name, taxon);
}
const taxa = new Map(), scope = new Set(["Q5174", "Q27207"]), displayed = new Map();
for (const animal of animals) {
  for (const taxon of globalThis.GalraeLogic.collectionLineage(animal.taxonomy.lineage)) {
    scope.add(taxon.wikidataId);
    if (!displayed.has(taxon.wikidataId)) displayed.set(taxon.wikidataId, { ...taxon, members: [] });
    displayed.get(taxon.wikidataId).members.push(animal.id);
  }
  for (const taxon of animal.taxonomy.lineage) {
    if (!taxa.has(taxon.wikidataId)) taxa.set(taxon.wikidataId, { name: taxon.scientificName, rank: taxon.rank, members: [] });
    taxa.get(taxon.wikidataId).members.push(animal.id);
  }
  for (const [rank, taxon] of Object.entries(animal.taxonomy.rankReview?.supplemental || {})) {
    if (!taxa.has(taxon.taxonId)) taxa.set(taxon.taxonId, { name: taxon.scientificName, rank, members: [] });
    if (!taxa.get(taxon.taxonId).members.includes(animal.id)) taxa.get(taxon.taxonId).members.push(animal.id);
    scope.add(taxon.taxonId);
  }
}
const aliases = { Q471797: "영장상목", Q728566: "진영장대목", Q660432: "설치대목", Q25364: "갑각아문", Q5174: "진정후생동물아계", Q161095: "무악하문", Q27207: "경골어류" };
const speciesById = new Map(animals.map((animal) => [animal.id, animal]));
const visible = new Set();
function index(node, ids) { if (node.type === "leaf") return; ids.add(node.id); node.children.forEach((child) => index(child, ids)); }
index(globalThis.GalraeLogic.buildTree([...speciesById.keys()], speciesById, null, true), visible);
const before = {};
const baselineCommit = "5d3abad777acd9042a92150e24d684f631321870";
vm.runInNewContext(execFileSync("git", ["show", `${baselineCommit}:public/game-logic.js`], { encoding: "utf8" }), before);
const prior = new Set();
index(before.GalraeLogic.buildTree([...speciesById.keys()], speciesById, null, true), prior);
const catalog = {}, audit = [];
for (const [id, taxon] of taxa) {
  const official = national[taxon.name], comparison = ncbi.get(taxon.name);
  const koName = taxonRanks[id]?.koName || official?.koName || names[id] || aliases[id] || taxon.name;
  const sources = [];
  if (official) sources.push(["국립생물자원관 국가생물종목록 (2025년 말 기준)", "https://www.kbr.go.kr/jfile/readDownloadFile.do?fileId=ARTICLE_2241&fileSeq=1"]);
  if (comparison) sources.push(["NCBI Taxonomy", `https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id=${comparison.id}`]);
  if (!sources.length && id.startsWith("Q")) sources.push(["수록 분류 경로 · Wikidata", `https://www.wikidata.org/wiki/${id}`]);
  if (!sources.length) sources.push(...(taxonRanks[id]?.sources || []));
  const entry = { ...taxon, rank: displayed.get(id)?.rank ?? taxon.rank, members: displayed.get(id)?.members || taxon.members, koName, ncbiRank: comparison?.rank || null, nationalRank: official?.rank || null, sources };
  audit.push({ id, name: taxon.name, rank: taxon.rank, koName, ncbiRank: entry.ncbiRank, nationalRank: entry.nationalRank,
    koreanSource: taxonRanks[id] ? "existing official class review" : official ? "NIBR 2025" : names[id] ? "existing game name" : aliases[id] ? "game alias" : "scientific name",
    previouslyVisible: prior.has(id), ranked: !!taxon.rank && !["clade", "species"].includes(taxon.rank), displayScope: scope.has(id), displayRank: entry.rank, representedBy: taxon.name === "Urodela" ? "Q53663" : null });
  if (scope.has(id) && ((entry.rank && entry.rank !== "clade") || visible.has(id))) catalog[id] = entry;
  if (koName !== taxon.name) names[id] = koName;
}
writeFileSync(new URL("../public/taxon-catalog.js", import.meta.url), `// Generated from all ${animals.length} source lineages and the official comparison snapshot.\nexport const taxonCatalog = ${JSON.stringify(catalog)};\n`);
writeFileSync(new URL("../data/taxon-rank-audit.json", import.meta.url), JSON.stringify({ reviewedAt: "2026-10-15", baselineCommit, scope: `All ranks in the ${animals.length} included species were compared. Collection expansion stops at order; lower ranks remain only in source records and species cards. NCBI rank differences are recorded, not silently treated as errors. Existing domestic class/fish-rank policy is retained.`,
  taxa: audit, sourceSpecies: references.length, nationalMatches: Object.values(catalog).filter((entry) => entry.nationalRank).length,
  previouslyHiddenRanked: audit.filter((entry) => entry.displayScope && entry.ranked && !entry.previouslyVisible).length }, null, 2) + "\n");
for (const file of ["data/taxa.ko.json", "public/data/taxa.ko.json"]) writeFileSync(new URL(`../${file}`, import.meta.url), JSON.stringify(names, null, 2) + "\n");
console.log(`${audit.length} source taxa audited; ${Object.keys(catalog).length} catalog entries; ${audit.filter((entry) => entry.displayScope && entry.ranked && !entry.previouslyVisible).length} hidden ranked taxa through order found.`);
