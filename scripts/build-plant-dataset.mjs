import { writeFile } from "node:fs/promises";

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
  ["Helianthus annuus", "해바라기", "Common sunflower", "넓은 잎과 큰 꽃차례가 특징인 한해살이 속씨식물입니다.", "An annual flowering plant with broad leaves and large flower heads.", "Tracheophyta/Euphyllophyta/Spermatophyta/Angiosperms/Magnoliopsida"],
  ["Oryza sativa", "벼", "Asian rice", "좁고 긴 잎을 가진 외떡잎식물로, 낟알을 식량으로 이용합니다.", "A monocot with long narrow leaves, cultivated for its edible grain.", "Tracheophyta/Euphyllophyta/Spermatophyta/Angiosperms/Liliopsida"],
  ["Pinus sylvestris", "구주소나무", "Scots pine", "바늘 모양 잎과 솔방울을 만드는 상록성 겉씨식물입니다.", "An evergreen gymnosperm with needle-like leaves and seed cones.", "Tracheophyta/Euphyllophyta/Spermatophyta/Acrogymnospermae/Pinopsida + Gnetopsida/Pinopsida"],
  ["Cycas revoluta", "소철", "Sago cycad", "깃 모양 잎이 줄기 끝에 모이는 겉씨식물로, 야자나무와는 다른 갈래입니다.", "A gymnosperm with a crown of pinnate leaves, belonging to a different lineage from palms.", "Tracheophyta/Euphyllophyta/Spermatophyta/Acrogymnospermae/Cycadopsida + Ginkgoopsida/Cycadopsida"],
  ["Ginkgo biloba", "은행나무", "Ginkgo", "부채 모양 잎을 가진 낙엽성 겉씨식물이며 은행강의 유일한 현생종입니다.", "A deciduous gymnosperm with fan-shaped leaves, the only living species of its class.", "Tracheophyta/Euphyllophyta/Spermatophyta/Acrogymnospermae/Cycadopsida + Ginkgoopsida/Ginkgoopsida"],
  ["Ephedra distachya", "양마황", "Joint pine", "마디가 뚜렷한 녹색 줄기와 작게 줄어든 잎을 가진 겉씨식물입니다.", "A gymnosperm with jointed green stems and small reduced leaves.", "Tracheophyta/Euphyllophyta/Spermatophyta/Acrogymnospermae/Pinopsida + Gnetopsida/Gnetopsida"],
  ["Pteridium aquilinum", "브라켄고사리", "Bracken", "큰 잎이 갈라지는 관다발식물로, 씨앗 대신 포자로 번식합니다.", "A vascular plant with divided fronds that reproduces by spores rather than seeds.", "Tracheophyta/Euphyllophyta/Polypodiopsida"],
  ["Lycopodium clavatum", "석송", "Stag's-horn clubmoss", "작은 잎이 줄기를 둘러싸며, 포자낭이 모인 이삭을 만드는 관다발식물입니다.", "A vascular plant with small leaves and cones of spore-bearing structures.", "Tracheophyta/Lycopodiopsida"],
  ["Polytrichum commune", "큰솔이끼", "Common haircap moss", "곧게 선 줄기에 작은 잎이 달리고, 자루 끝의 삭에서 포자를 만듭니다.", "A moss with upright leafy shoots and spores formed in capsules on stalks.", "Bryophytes/Setaphyta/Bryopsida"],
  ["Marchantia polymorpha", "우산이끼", "Common liverwort", "납작한 엽상체가 땅 위로 퍼지며, 우산 모양 생식기관을 만드는 태류입니다.", "A liverwort with a flat thallus and umbrella-like reproductive structures.", "Bryophytes/Setaphyta/Marchantiopsida"],
  ["Anthoceros agrestis", "밭뿔이끼", "Field hornwort", "납작한 몸 위로 뿔처럼 긴 포자체가 자라는 작은 육상식물입니다.", "A small land plant with long horn-like sporophytes growing from a flat thallus.", "Bryophytes/Anthocerotopsida"],
];
const clean = (html = "") => html.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&#0?39;/g, "'").replace(/&quot;/g, '"');
async function query(host, params) {
  const url = new URL(`https://${host}/w/api.php`);
  url.search = new URLSearchParams({ action: "query", format: "json", formatversion: "2", redirects: "1", ...params });
  const response = await fetch(url, { headers: { "User-Agent": "GalraePhylogenyGame/0.1 (educational dataset)" } });
  if (!response.ok) throw new Error(`${response.status}: ${host}`);
  return (await response.json()).query;
}
const pages = await query("en.wikipedia.org", { titles: seeds.map(([name]) => name).join("|"), prop: "pageimages|pageprops", piprop: "name" });
const files = await query("commons.wikimedia.org", { titles: pages.pages.map((page) => `File:${page.pageimage}`).join("|"), prop: "imageinfo", iiprop: "url|size|extmetadata", iiurlwidth: "800" });
function resolveTitle(query, title) {
  const aliases = new Map([...(query.normalized || []), ...(query.redirects || [])].map(({ from, to }) => [from, to]));
  for (let depth = 0; aliases.has(title) && depth < 8; depth++) title = aliases.get(title);
  return title;
}
const plants = seeds.map(([scientificName, commonName, enName, description, descriptionEn, path]) => {
  const title = resolveTitle(pages, scientificName);
  const page = pages.pages.find((item) => item.title === title);
  const info = files.pages.find((item) => item.title === resolveTitle(files, `File:${page?.pageimage}`))?.imageinfo?.[0];
  if (!info?.extmetadata?.LicenseShortName?.value) throw new Error(`Missing licensed photo: ${scientificName}`);
  const metadata = info.extmetadata;
  return {
    id: scientificName.toLowerCase().replaceAll(" ", "-"), scientificName, commonName: enName,
    wikidataId: page.pageprops.wikibase_item, description: descriptionEn,
    ko: { commonName, description },
    taxonomy: { lineage: ["Plantae", "Embryophyta", ...path.split("/")].map((name) => byName.get(name)) },
    image: { fileName: page.pageimage, thumbnailUrl: info.thumburl || info.url, originalUrl: info.url,
      commonsPageUrl: info.descriptionurl, artist: clean(metadata.Artist?.value || "See file page"),
      license: clean(metadata.LicenseShortName.value), licenseUrl: metadata.LicenseUrl?.value || info.descriptionurl,
      width: info.width, height: info.height },
  };
});
const dataset = { schemaVersion: 1, speciesCount: plants.length, initialSpeciesId: "helianthus-annuus", taxa, plants,
  sources: [["Plant Tree of Life · Cambridge University Botanic Garden", "https://s3-eu-west-1.amazonaws.com/assets.botanic.cam.ac.uk/wp-content/uploads/2023/10/evolution_trail_web.pdf"], ["NCBI Taxonomy", "https://www.ncbi.nlm.nih.gov/taxonomy"], ["Kew Tree of Life", "https://treeoflife.kew.org/"]],
  classificationNote: "Class-level teaching dataset of representative land plants. Magnoliopsida denotes eudicots here; it is not the traditional paraphyletic dicot grouping. Unsampled lineages are omitted; sibling order does not imply relative age." };
for (const target of ["data/plants.json", "public/data/plants.json"]) await writeFile(target, `${JSON.stringify(dataset, null, 2)}\n`);
console.log(`Collected ${plants.length} plant classes with licensed photos.`);
