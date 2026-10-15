import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { curateTaxonomy } from "./taxonomy-curation.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const SEEDS_PATH = process.env.GALRAE_SEEDS_PATH
  ? path.resolve(ROOT, process.env.GALRAE_SEEDS_PATH)
  : path.join(ROOT, "data", "animal-seeds.json");
const OVERRIDES_PATH = path.join(ROOT, "data", "taxon-overrides.json");
const OUTPUT_PATH = process.env.GALRAE_OUTPUT_PATH
  ? path.resolve(ROOT, process.env.GALRAE_OUTPUT_PATH)
  : path.join(ROOT, "data", "animals.json");
const REPORT_PATH = process.env.GALRAE_REPORT_PATH
  ? path.resolve(ROOT, process.env.GALRAE_REPORT_PATH)
  : path.join(ROOT, "data", "animals.report.json");
const ANIMALIA_ID = "Q729";
const CARD_IMAGES = {
  "Homo sapiens": { fileName: "Human Skull.jpg", objectFit: "contain" },
  "Xenoturbella bocki": { fileName: "Xenoturbella (bocki) Sweden 2008.jpg", objectFit: "contain", identificationNote: "Xenoturbella sp. (possibly X. bocki)" },
  "Architeuthis dux": { fileName: "MOL 1130046 Architeuthis specimen.jpg", objectFit: "contain" },
};
const USER_AGENT = "GalraePhylogenyGame/0.1 (educational Wikimedia dataset collector)";
const TEXT_LICENSE = {
  id: "CC BY-SA 4.0",
  url: "https://creativecommons.org/licenses/by-sa/4.0/",
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const chunks = (items, size) => Array.from(
  { length: Math.ceil(items.length / size) },
  (_, index) => items.slice(index * size, (index + 1) * size),
);

async function fetchJson(url, attempt = 1) {
  const response = await fetch(url, {
    headers: {
      "Api-User-Agent": USER_AGENT,
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
  });
  if ((response.status === 429 || response.status >= 500) && attempt < 8) {
    const retryAfter = Number(response.headers.get("retry-after")) || 0;
    const backoff = Math.max(retryAfter * 1000, Math.min(20_000, 750 * 2 ** attempt));
    await sleep(backoff);
    return fetchJson(url, attempt + 1);
  }
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

function apiUrl(base, params) {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url;
}

function resolveTitle(title, query) {
  const aliases = new Map();
  for (const item of query.normalized || []) aliases.set(item.from, item.to);
  for (const item of query.redirects || []) aliases.set(item.from, item.to);
  let resolved = title;
  for (let index = 0; index < 8 && aliases.has(resolved); index += 1) resolved = aliases.get(resolved);
  return resolved;
}

async function collectWikipediaPages(seedTitles) {
  const pages = new Map();
  const failures = [];
  for (const batch of chunks(seedTitles, 20)) {
    const url = apiUrl("https://en.wikipedia.org/w/api.php", {
      action: "query",
      format: "json",
      formatversion: "2",
      redirects: "1",
      prop: "pageprops|extracts|pageimages|revisions",
      ppprop: "wikibase_item",
      exintro: "1",
      explaintext: "1",
      piprop: "name|thumbnail|original",
      pithumbsize: "800",
      rvprop: "ids|timestamp",
      rvslots: "main",
      titles: batch.join("|"),
    });
    const payload = await fetchJson(url);
    const pageByTitle = new Map((payload.query?.pages || []).map((page) => [page.title, page]));
    for (const requestedTitle of batch) {
      const resolvedTitle = resolveTitle(requestedTitle, payload.query || {});
      const page = pageByTitle.get(resolvedTitle);
      if (!page || page.missing || !page.pageprops?.wikibase_item) {
        failures.push({ title: requestedTitle, reason: "Missing English Wikipedia page or Wikidata item" });
        continue;
      }
      pages.set(requestedTitle, { ...page, requestedTitle });
    }
    await sleep(80);
  }
  return { pages, failures };
}

async function collectTaxonomy(initialIds) {
  const taxa = new Map();
  const speciesMeta = new Map();
  for (const batch of chunks([...new Set(initialIds)], 16)) {
    const values = batch.map((id) => `wd:${id}`).join(" ");
    const query = `
      SELECT ?seed ?taxon
        (SAMPLE(?scientificNameValue) AS ?scientificName)
        (SAMPLE(?englishNameValue) AS ?englishName)
        (SAMPLE(?parentValue) AS ?parent)
        (SAMPLE(?rankNameValue) AS ?rankName)
        (SAMPLE(?imageValue) AS ?image)
      WHERE {
        VALUES ?seed { ${values} }
        ?seed wdt:P171* ?taxon.
        OPTIONAL { ?taxon wdt:P225 ?scientificNameValue. }
        OPTIONAL { ?taxon rdfs:label ?englishNameValue. FILTER(LANG(?englishNameValue) = "en") }
        OPTIONAL { ?taxon wdt:P171 ?parentValue. }
        OPTIONAL {
          ?taxon wdt:P105 ?rankValue.
          ?rankValue rdfs:label ?rankNameValue.
          FILTER(LANG(?rankNameValue) = "en")
        }
        OPTIONAL { ?seed wdt:P18 ?imageValue. }
      }
      GROUP BY ?seed ?taxon
    `;
    const url = apiUrl("https://query.wikidata.org/sparql", { query, format: "json" });
    const payload = await fetchJson(url);
    for (const row of payload.results?.bindings || []) {
      const seedId = row.seed.value.split("/").pop();
      const taxonId = row.taxon.value.split("/").pop();
      const parentId = row.parent?.value.split("/").pop() || null;
      if (!taxa.has(taxonId)) {
        taxa.set(taxonId, {
          wikidataId: taxonId,
          scientificName: row.scientificName?.value || row.englishName?.value || taxonId,
          englishName: row.englishName?.value || null,
          rank: row.rankName?.value || null,
          parentId,
        });
      }
      if (!speciesMeta.has(seedId)) {
        const imageUrl = row.image?.value || null;
        speciesMeta.set(seedId, {
          imageFileName: imageUrl
            ? decodeURIComponent(new URL(imageUrl).pathname.split("/").pop()).replaceAll("_", " ")
            : null,
        });
      }
    }
    await sleep(700);
  }
  return { taxa, speciesMeta };
}

function makeLineage(taxonId, taxa) {
  const lineage = [];
  const seen = new Set();
  let currentId = taxonId;
  for (let depth = 0; currentId && depth < 160 && !seen.has(currentId); depth += 1) {
    seen.add(currentId);
    const taxon = taxa.get(currentId);
    if (!taxon) break;
    lineage.push({
      wikidataId: currentId,
      scientificName: taxon.scientificName,
      englishName: taxon.englishName,
      rank: taxon.rank,
    });
    if (currentId === ANIMALIA_ID) break;
    currentId = taxon.parentId;
  }
  return lineage.reverse();
}

function plainText(html = "") {
  return html
    .replace(/<br\s*\/?\s*>/gi, "; ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

async function collectCommonsImages(fileNames) {
  const images = new Map();
  for (const batch of chunks([...new Set(fileNames.filter(Boolean))], 20)) {
    const requestedTitles = batch.map((name) => `File:${name}`);
    const url = apiUrl("https://commons.wikimedia.org/w/api.php", {
      action: "query",
      format: "json",
      formatversion: "2",
      redirects: "1",
      prop: "imageinfo",
      iiprop: "url|size|sha1|extmetadata",
      iiurlwidth: "800",
      titles: requestedTitles.join("|"),
    });
    const payload = await fetchJson(url);
    const pageByTitle = new Map((payload.query?.pages || []).map((page) => [page.title, page]));
    for (const fileName of batch) {
      const requestedTitle = `File:${fileName}`;
      const resolvedTitle = resolveTitle(requestedTitle, payload.query || {});
      const page = pageByTitle.get(resolvedTitle);
      const info = page?.imageinfo?.[0];
      const metadata = info?.extmetadata || {};
      if (!info || !metadata.LicenseShortName?.value) continue;
      const artist = plainText(metadata.Artist?.value || metadata.Credit?.value || "");
      const license = plainText(metadata.LicenseShortName.value);
      images.set(fileName, {
        fileName: resolvedTitle.replace(/^File:/, ""),
        originalUrl: info.url,
        thumbnailUrl: info.thumburl || info.url,
        width: info.width,
        height: info.height,
        sha1: info.sha1,
        commonsPageUrl: info.descriptionurl,
        artist: artist || "See Wikimedia Commons file page",
        credit: plainText(metadata.Credit?.value || "") || null,
        license,
        licenseUrl: metadata.LicenseUrl?.value || info.descriptionurl,
        attributionRequired: metadata.AttributionRequired?.value !== "false",
        attribution: `${artist || "Creator listed on file page"} / ${license} / Wikimedia Commons`,
      });
    }
    await sleep(80);
  }
  return images;
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function main() {
  const seedTitles = JSON.parse(await readFile(SEEDS_PATH, "utf8"));
  const taxonOverrides = JSON.parse(await readFile(OVERRIDES_PATH, "utf8"));
  const { pages, failures } = await collectWikipediaPages(seedTitles);
  const taxonIdForPage = (page) => taxonOverrides[page.pageprops.wikibase_item] || page.pageprops.wikibase_item;
  const qids = [...pages.values()].map(taxonIdForPage);
  const { taxa, speciesMeta } = await collectTaxonomy(qids);
  const cardImageFor = (qid) => CARD_IMAGES[taxa.get(qid)?.scientificName];
  const imageNameFor = (page) => cardImageFor(taxonIdForPage(page))?.fileName || speciesMeta.get(taxonIdForPage(page))?.imageFileName || page.pageimage || null;

  const imageNames = [];
  for (const page of pages.values()) {
    imageNames.push(imageNameFor(page));
  }
  const commonsImages = await collectCommonsImages(imageNames);

  const animals = [];
  for (const seedTitle of seedTitles) {
    const page = pages.get(seedTitle);
    if (!page) continue;
    const wikipediaItemId = page.pageprops.wikibase_item;
    const wikidataId = taxonIdForPage(page);
    const taxon = taxa.get(wikidataId);
    const scientificName = taxon?.scientificName;
    const lineage = makeLineage(wikidataId, taxa);
    const imageName = imageNameFor(page);
    if (!scientificName) {
      failures.push({ title: page.title, wikidataId, reason: "Wikidata item has no taxon name (P225)" });
      continue;
    }
    if (taxon?.rank !== "species") {
      failures.push({ title: page.title, wikidataId, reason: `Expected a species-level taxon, received ${taxon?.rank || "no rank"}` });
      continue;
    }
    if (!lineage.some((taxon) => taxon.wikidataId === ANIMALIA_ID)) {
      failures.push({ title: page.title, wikidataId, reason: "Parent-taxon chain did not reach Animalia" });
      continue;
    }
    if (imageName && !commonsImages.has(imageName)) {
      failures.push({ title: page.title, wikidataId, reason: `Commons metadata unavailable for ${imageName}` });
    }
    const revision = page.revisions?.[0] || {};
    animals.push({
      id: slugify(scientificName),
      commonName: page.title,
      scientificName,
      wikidataId,
      description: page.extract || "",
      taxonomy: {
        parentTaxonId: taxon?.parentId || null,
        lineage,
      },
      image: commonsImages.has(imageName) ? { ...commonsImages.get(imageName), ...cardImageFor(wikidataId) } : null,
      wikipedia: {
        title: page.title,
        wikidataItemId: wikipediaItemId,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replaceAll(" ", "_"))}`,
        revisionId: revision.revid || null,
        revisionTimestamp: revision.timestamp || null,
        revisionUrl: revision.revid
          ? `https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(page.title.replaceAll(" ", "_"))}&oldid=${revision.revid}`
          : null,
        license: TEXT_LICENSE,
      },
    });
  }

  const curatedAnimals = curateTaxonomy(animals);
  curatedAnimals.sort((a, b) => a.commonName.localeCompare(b.commonName, "en"));
  const generatedAt = new Date().toISOString();
  const dataset = {
    schemaVersion: 1,
    language: "en",
    generatedAt,
    speciesCount: curatedAnimals.length,
    sources: {
      taxonomy: {
        name: "Wikidata",
        url: "https://www.wikidata.org/",
        license: { id: "CC0 1.0", url: "https://creativecommons.org/publicdomain/zero/1.0/" },
      },
      descriptions: {
        name: "English Wikipedia",
        url: "https://en.wikipedia.org/",
        license: TEXT_LICENSE,
        attribution: "Each record includes its article title and fixed revision URL.",
      },
      images: {
        name: "Wikimedia Commons",
        url: "https://commons.wikimedia.org/",
        license: "Varies by file; see each record's image license, creator, and Commons file page.",
      },
    },
    animals: curatedAnimals,
  };

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
  await writeFile(REPORT_PATH, `${JSON.stringify({
    generatedAt,
    requestedCount: seedTitles.length,
    collectedCount: curatedAnimals.length,
    issueCount: failures.length,
    issues: failures,
  }, null, 2)}\n`, "utf8");
  console.log(`Collected ${curatedAnimals.length}/${seedTitles.length} animals.`);
  console.log(`Report: ${path.relative(ROOT, REPORT_PATH)}`);
  if (failures.length) console.log(`${failures.length} collection issue(s) require review.`);
}

await main();
