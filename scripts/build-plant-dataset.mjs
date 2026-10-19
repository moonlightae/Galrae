import { readFile, writeFile } from "node:fs/promises";

// shortcut: representative species and lineages stop at class; expand ranks when adding harder plant modes.
const taxa = [
  ["Plantae", "식물계", "kingdom"], ["Embryophyta", "육상식물", "clade"],
  ["Bryophytes", "선태식물", "clade"], ["Setaphyta", "이끼·우산이끼 갈래", "clade"],
  ["Tracheophyta", "관다발식물", "clade"], ["Euphyllophyta", "진엽식물", "clade"],
  ["Spermatophyta", "종자식물", "clade"], ["Acrogymnospermae", "겉씨식물", "clade"],
  ["Cycadopsida + Ginkgoopsida", "소철·은행 갈래", "clade"],
  ["Pinopsida + Gnetopsida", "침엽수·마황 갈래", "clade"],
  ["Angiosperms", "속씨식물", "clade"],
  ["Magnoliopsida", "목련강", "class"], ["Liliopsida", "백합강", "class"],
  ["Pinopsida", "소나무강", "class"], ["Cycadopsida", "소철강", "class"],
  ["Ginkgoopsida", "은행강", "class"], ["Gnetopsida", "마황강", "class"],
  ["Polypodiopsida", "고사리강", "class"], ["Lycopodiopsida", "석송강", "class"],
  ["Bryopsida", "선강", "class"], ["Marchantiopsida", "우산이끼강", "class"],
  ["Anthocerotopsida", "뿔이끼강", "class"],
].map(([scientificName, koName, rank]) => ({ wikidataId: `plant:${scientificName}`, scientificName, koName, rank }));
const byName = new Map(taxa.map((taxon) => [taxon.scientificName, taxon]));
const seeds = [
  ["Hibiscus syriacus", "무궁화", "Rose of Sharon", "여름부터 가을까지 꽃을 피우는 낙엽 관목으로, 다섯 장의 꽃잎과 긴 수술기둥이 특징입니다.", "A deciduous shrub that flowers from summer into autumn, with five petals and a prominent staminal column.", "Tracheophyta/Euphyllophyta/Spermatophyta/Angiosperms/Magnoliopsida"],
  ["Oryza sativa", "벼", "Asian rice", "좁고 긴 잎을 가진 외떡잎식물로, 낟알을 식량으로 이용합니다.", "A monocot with long narrow leaves, cultivated for its edible grain.", "Tracheophyta/Euphyllophyta/Spermatophyta/Angiosperms/Liliopsida"],
  ["Pinus sylvestris", "구주소나무", "Scots pine", "바늘 모양 잎과 솔방울을 만드는 상록성 겉씨식물입니다.", "An evergreen gymnosperm with needle-like leaves and seed cones.", "Tracheophyta/Euphyllophyta/Spermatophyta/Acrogymnospermae/Pinopsida + Gnetopsida/Pinopsida"],
  ["Cycas revoluta", "소철", "Sago cycad", "깃 모양 잎이 줄기 끝에 모이는 겉씨식물로, 야자나무와는 다른 갈래입니다.", "A gymnosperm with a crown of pinnate leaves, belonging to a different lineage from palms.", "Tracheophyta/Euphyllophyta/Spermatophyta/Acrogymnospermae/Cycadopsida + Ginkgoopsida/Cycadopsida"],
  ["Ginkgo biloba", "은행나무", "Ginkgo", "부채 모양 잎을 가진 낙엽성 겉씨식물이며 은행강의 유일한 현생종입니다.", "A deciduous gymnosperm with fan-shaped leaves, the only living species of its class.", "Tracheophyta/Euphyllophyta/Spermatophyta/Acrogymnospermae/Cycadopsida + Ginkgoopsida/Ginkgoopsida"],
  ["Ephedra distachya", "양마황", "Joint pine", "마디가 뚜렷한 녹색 줄기와 작게 줄어든 잎을 가진 겉씨식물입니다.", "A gymnosperm with jointed green stems and small reduced leaves.", "Tracheophyta/Euphyllophyta/Spermatophyta/Acrogymnospermae/Pinopsida + Gnetopsida/Gnetopsida"],
  ["Pteridium aquilinum", "브라켄고사리", "Bracken", "큰 잎이 갈라지는 관다발식물로, 씨앗 대신 포자로 번식합니다.", "A vascular plant with divided fronds that reproduces by spores rather than seeds.", "Tracheophyta/Euphyllophyta/Polypodiopsida"],
  ["Lycopodium clavatum", "석송", "Stag's-horn clubmoss", "작은 잎이 줄기를 둘러싸며, 포자낭이 모인 이삭을 만드는 관다발식물입니다.", "A vascular plant with small leaves and cones of spore-bearing structures.", "Tracheophyta/Lycopodiopsida"],
  ["Polytrichum commune", "큰솔이끼", "Common haircap moss", "곧게 선 줄기에 작은 잎이 달리고, 자루 끝의 삭에서 포자를 만듭니다.", "A moss with upright leafy shoots and spores formed in capsules on stalks.", "Bryophytes/Setaphyta/Bryophyta/Polytrichopsida"],
  ["Marchantia polymorpha", "우산이끼", "Common liverwort", "납작한 엽상체가 땅 위로 퍼지며, 우산 모양 생식기관을 만드는 태류입니다.", "A liverwort with a flat thallus and umbrella-like reproductive structures.", "Bryophytes/Setaphyta/Marchantiopsida"],
  ["Anthoceros agrestis", "밭뿔이끼", "Field hornwort", "납작한 몸 위로 뿔처럼 긴 포자체가 자라는 작은 육상식물입니다.", "A small land plant with long horn-like sporophytes growing from a flat thallus.", "Bryophytes/Anthocerotopsida"],
];
const additions = JSON.parse(await readFile(new URL("../data/plant-class-additions.json", import.meta.url), "utf8"));
const coverage = JSON.parse(await readFile(new URL("../data/plant-class-coverage.json", import.meta.url), "utf8"));
const landPrefix = "Plantae/Viridiplantae/Streptophyta/Phragmoplastophyta/Anydrophyta/Embryophyta";
const groupNames = {
  Viridiplantae: "녹색식물", Streptophyta: "스트렙토식물", Phragmoplastophyta: "격막형성체식물", Anydrophyta: "접합조류·육상식물 갈래",
  Glaucophyta: "회색조식물문", Rhodophyta: "홍조식물문", Chlorophyta: "녹조식물문", "Core Chlorophyta": "핵심 녹조식물",
  Eurhodophytina: "진홍조식물", Metarhodophytina: "메타홍조식물", Bryophyta: "선태식물문", Marchantiophyta: "우산이끼문", Anthocerotophyta: "뿔이끼문",
};
const phyla = new Set(["Glaucophyta", "Rhodophyta", "Chlorophyta", "Bryophyta", "Marchantiophyta", "Anthocerotophyta"]);
function addTaxon(name, rank) {
  if (byName.has(name)) return;
  const taxon = { wikidataId: `plant:${name}`, scientificName: name, koName: groupNames[name] || name, rank };
  byName.set(name, taxon); taxa.push(taxon);
}
for (const seed of seeds) {
  if (seed[0] === "Marchantia polymorpha") seed[5] = "Bryophytes/Setaphyta/Marchantiophyta/Marchantiopsida";
  if (seed[0] === "Anthoceros agrestis") seed[5] = "Bryophytes/Anthocerotophyta/Anthocerotopsida";
  seed[5] = `${landPrefix}/${seed[5]}`;
}
for (const [name, koName, className, path, , ko, en] of additions) {
  seeds.push([name, koName, name, ko, en, `${path.startsWith("Plantae/") ? path : `${landPrefix}/${path}`}/${className}`]);
  addTaxon(className, "class");
}
for (const name of coverage.expectedClasses) addTaxon(name, "class");
for (const seed of seeds) for (const name of seed[5].split("/")) addTaxon(name, phyla.has(name) ? "phylum" : "clade");
const actualClasses = [...new Set(seeds.map((seed) => seed[5].split("/").at(-1)))].sort();
if (JSON.stringify(actualClasses) !== JSON.stringify(coverage.expectedClasses)) throw new Error("Plant class coverage does not match the reviewed reference list");
const clean = (html = "") => html.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&#0?39;/g, "'").replace(/&quot;/g, '"');
async function query(host, params, attempt = 1) {
  const url = new URL(`https://${host}/w/api.php`);
  url.search = new URLSearchParams({ action: "query", format: "json", formatversion: "2", redirects: "1", ...params });
  const response = await fetch(url, { headers: { "User-Agent": "GalraePhylogenyGame/0.1 (educational dataset)" } });
  if (response.status === 429 && attempt < 4) {
    await new Promise((resolve) => setTimeout(resolve, Math.max(2000 * attempt, (Number(response.headers.get("retry-after")) || 0) * 1000)));
    return query(host, params, attempt + 1);
  }
  if (!response.ok) throw new Error(`${response.status}: ${host}`);
  return (await response.json()).query;
}
const pages = await query("en.wikipedia.org", { titles: seeds.map(([name]) => name).join("|"), prop: "pageimages|pageprops", piprop: "name" });
const fileNames = pages.pages.filter((page) => page.pageimage).map((page) => `File:${page.pageimage}`);
const files = await query("commons.wikimedia.org", { titles: fileNames.join("|"), prop: "imageinfo", iiprop: "url|size|extmetadata", iiurlwidth: "800" });
const excludedImages = new Set(["Haeckel_Muscinae.jpg", "Haeckel Muscinae.jpg"]);
function resolveTitle(query, title) {
  const aliases = new Map([...(query.normalized || []), ...(query.redirects || [])].map(({ from, to }) => [from, to]));
  for (let depth = 0; aliases.has(title) && depth < 8; depth++) title = aliases.get(title);
  return title;
}
const fallbackImages = new Map();
for (const [scientificName] of seeds) {
  const page = pages.pages.find((item) => item.title === resolveTitle(pages, scientificName));
  const image = files.pages.find((item) => item.title === resolveTitle(files, `File:${page?.pageimage}`));
  if (image?.imageinfo?.[0]?.extmetadata?.LicenseShortName?.value && !excludedImages.has(page.pageimage)) continue;
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const matches = await query("commons.wikimedia.org", { generator: "search", gsrsearch: `"${scientificName}"`, gsrnamespace: "6", gsrlimit: "5",
    prop: "imageinfo", iiprop: "url|size|extmetadata", iiurlwidth: "800" });
  const match = matches?.pages?.find((item) => {
    const info = item.imageinfo?.[0];
    const caption = clean(`${item.title} ${info?.extmetadata?.ImageDescription?.value || ""}`).replaceAll("_", " ").toLowerCase();
    return info?.extmetadata?.LicenseShortName?.value && caption.includes(scientificName.toLowerCase());
  });
  if (match) fallbackImages.set(scientificName, match);
}
const plants = seeds.map(([scientificName, commonName, enName, description, descriptionEn, path]) => {
  const title = resolveTitle(pages, scientificName);
  const page = pages.pages.find((item) => item.title === title);
  const fallback = fallbackImages.get(scientificName);
  const info = fallback?.imageinfo?.[0] || (!excludedImages.has(page?.pageimage) ? files.pages.find((item) => item.title === resolveTitle(files, `File:${page?.pageimage}`))?.imageinfo?.[0] : null);
  const metadata = info?.extmetadata || {};
  return {
    id: scientificName.toLowerCase().replaceAll(" ", "-"), scientificName, commonName: enName,
    wikidataId: page?.pageprops?.wikibase_item || null, description: descriptionEn,
    ko: { commonName, description },
    taxonomy: { lineage: path.split("/").map((name) => byName.get(name)) },
    image: info && metadata.LicenseShortName?.value ? { fileName: fallback?.title.replace(/^File:/, "") || page.pageimage, thumbnailUrl: info.thumburl || info.url, originalUrl: info.url,
      commonsPageUrl: info.descriptionurl, artist: clean(metadata.Artist?.value || "See file page"),
      license: clean(metadata.LicenseShortName.value), licenseUrl: metadata.LicenseUrl?.value || info.descriptionurl,
      width: info.width, height: info.height,
      ...(scientificName === "Pyramimonas parkeae" && fallback ? { identificationNote: "비교 현미경 그림 · a–h 패널이 Pyramimonas parkeae입니다." } : {}),
    } : { thumbnailUrl: "/plant-no-photo.svg", originalUrl: "/plant-no-photo.svg",
        commonsPageUrl: `https://www.gbif.org/species/search?q=${encodeURIComponent(scientificName)}`, artist: "갈래", license: "CC0 1.0",
        licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/", identificationNote: "종 사진 미확보 · 대체 안내 이미지", photoUnavailable: true },
  };
});
const dataset = { schemaVersion: 1, speciesCount: plants.length, initialSpeciesId: "hibiscus-syriacus", taxa, plants,
  classCoverage: coverage,
  sources: [...coverage.sources, ["Plant Tree of Life · Cambridge University Botanic Garden", "https://s3-eu-west-1.amazonaws.com/assets.botanic.cam.ac.uk/wp-content/uploads/2023/10/evolution_trail_web.pdf"], ["NCBI Taxonomy", "https://www.ncbi.nlm.nih.gov/taxonomy"], ["Kew Tree of Life", "https://treeoflife.kew.org/"]],
  classificationNote: "Class-level teaching dataset of extant Plantae including green algae, red algae and glaucophytes. The frozen class roster reconciles Ruggiero et al. 2015 with GBIF Backbone, merges synonymous class names, and excludes historical groupings and fossils. Magnoliopsida denotes sampled eudicots here. Unresolved higher relationships are multifurcations, not assertions of simultaneous divergence. Missing photos use an explicitly labelled placeholder." };
for (const target of ["data/plants.json", "public/data/plants.json"]) await writeFile(target, `${JSON.stringify(dataset, null, 2)}\n`);
console.log(`Collected ${plants.length} plant classes; ${plants.filter((plant) => plant.image.photoUnavailable).length} representative photos unavailable.`);
