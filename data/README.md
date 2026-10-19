# Animal dataset

## 식물계 연습·튜토리얼 데이터

`plants.json`과 `public/data/plants.json`은 11개 강의 대표 식물로 구성되며,
분류 경로는 강에서 끝납니다. 무궁화는 시작 카드이고 연습 모드에는 나머지 10종이 출제됩니다.
튜토리얼은 밭뿔이끼·벼·브라켄고사리·구주소나무 순서로 진행하며 기록에는 포함되지 않습니다.
목 이하의 분류와 식물계 일반 난이도는 포함하지 않습니다.

식물의 상위 갈래는 Cambridge University Botanic Garden의 Plant Tree of Life,
NCBI Taxonomy, Kew Tree of Life를 참고한 교육용 축약 계통수입니다.
계급은 분류 체계마다 다를 수 있으며, 여기서 목련강은 수록된 진정쌍떡잎식물을
가리킵니다. 전통적인 모든 쌍떡잎식물을 하나의 단일계통군으로 묶지 않습니다.
미수록 갈래는 생략하며, 가지 표시 순서는 생물의 나이나 진화 정도를 뜻하지 않습니다.
강마다 한 대표종만 있으므로 이 버전에서 강 내부 관계는 판정하지 않습니다.

한·영 설명은 직접 작성했으며, 사진마다 Wikimedia Commons 원본 페이지·저작자·
라이선스를 기록했습니다. `node scripts/build-plant-dataset.mjs`로 사진 메타데이터를
다시 수집하고, `node scripts/validate-plants.mjs`로 데이터와 판정 로직을 확인합니다.

## Class/order coverage expansion — 2026-10-15

Added 107 species (207 → 314), with Korean names, bilingual card descriptions,
fixed Wikipedia revisions and per-image attribution. The reviewed manifest is
`animal-additions-2026-10.json`. Existing species records and identifiers are unchanged.

- Classes: 47 → 50; new Polyplacophora (2), Diplopoda (4), Trematoda (4).
- Orders: 125 → 137; new orders generally have 2 species.
- Previously singleton classes: 17 → 1; previously singleton orders: 86 → 3.
- Remaining singletons: Priapulimorpha / Priapulomorpha and Cestida lack a
  verified reusable image for a second species; Hoilungea and newly included
  Trichoplacea each have one represented described species. Velamen parallelum
  and Priapulus tuberculatospinosus were considered but deferred for image provenance.
- Nanomia bijuga and Rossella antarctica use attributed scientific illustrations.
- New class ranks follow NCBI; existing domestic and fish-rank decisions are retained.
  GBIF supplies species/class/order corroboration for Spirostreptus servatius,
  Fasciolopsis buski and Rossella antarctica where NCBI species records were unavailable.
  Registry differences (including traditional fluke orders) are retained explicitly.

References: [NCBI Taxonomy](https://www.ncbi.nlm.nih.gov/taxonomy/),
[GBIF species matching API](https://techdocs.gbif.org/en/openapi/v1/species),
and each record’s fixed Wikipedia revision and Wikimedia Commons file page.
Run `node scripts/validate-animal-expansion.mjs` to check coverage.


## Edited card descriptions — 2026-10-13

All 207 cards have reviewed Korean descriptions in `animals.ko.json` and
short English descriptions in its `descriptionEn` field. The shared `cardText`
helper uses these for gameplay, the collection and species details; the raw
English Wikimedia extracts remain in `animals.json` for provenance.
Descriptions focus on habitat, appearance and biology, allowing brief taxon
mentions without naming sister groups or explaining placement relative to
other animals. The raw extract is only a fallback for untranslated cards.
Preserve the edited text when refreshing source extracts.

Most edits summarise the stored extracts. Additional natural-history details:
- [California sea hare diet, Cabrillo Marine Aquarium](https://cma.recreation.parks.lacity.gov/marine-life/southern-california-species/invertebrate/california-brown-sea-hare)
- [Purse sponge morphology, Marine Biological Association](https://www.marlin.ac.uk/species/detail/2151)
- [Thornback ray morphology, Marine Biological Association](https://www.marlin.ac.uk/species/detail/2187)
- [Fruit-juice collection and culture of D. simulans, National Institute of Genetics](https://www.nig.ac.jp/nig/pdf/about_nig/29.pdf)

`animals.json` is generated from the English-language Wikimedia projects by
`scripts/collect-wikimedia-animals.mjs`. Seed articles are listed in
`animal-seeds.json` and should identify individual species rather than broad
groups such as “sharks” or “ants”.
The 100 species added in September 2026 are listed in
`animal-additions-2026-09.json`; the full dataset contains 314 species.

Some Wikipedia article concepts use a different Wikidata item from the formal
taxon item. Those explicit links are kept in `taxon-overrides.json`.
The collector also applies the reviewed corrections in
`scripts/taxonomy-curation.mjs`; do not remove that step when regenerating the
dataset. `scripts/audit-taxonomy.mjs` checks for inconsistent direct parents
and overlapping sampled clades. `scripts/audit-gbif-taxonomy.mjs` provides a
network-assisted comparison with GBIF, but rank differences must be reviewed
individually rather than copied blindly.

## Taxonomic decisions

- Onychophora and Arthropoda share a distinct ancestor within Panarthropoda,
  with Tardigrada outside that pair. Adopted on 2026-10-13 from the
  [2025 CAT-PMSF phylogenomic analysis](https://academic.oup.com/gbe/article/17/1/evae273/7931680)
  and [2026 onychophoran mitogenomic study](https://www.mdpi.com/2073-4425/17/4/372).
  The `canonical:antennopoda` ancestor is a game-internal identifier, not a
  Wikidata ID. This relation is enforced by placement scoring and documented
  in the in-game classification notes.

Class/order gaps were rechecked against fresh NCBI and GBIF records on
2026-10-07, with WoRMS review of genuinely unassigned ranks. See
[rank review](rank-review.md). `taxonomy-rank-review.json` preserves the review
and supplemental ranked classification; the collector reapplies it through
`taxonomy-curation.mjs`. Supplemental ranks are used for difficulty filtering
and card labels without inserting traditional paraphyletic grades into the
phylogenetic tree. Unassigned ranks are recorded explicitly rather than invented.

- Holostei and Teleostei form separate sister branches within Neopterygii
  ([phylogeny](https://pmc.ncbi.nlm.nih.gov/articles/PMC5882744/)). Restore
  missing shared ancestors for Gadiformes, Salmoniformes, Gymnotiformes and
  Anguilliformes so their species stay within Teleostei. Preserve the existing
  Wikidata IDs and intermediate clades used elsewhere in this dataset.
  Reviewed lineages: [cod](https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id=8049),
  [salmon](https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id=8030),
  [electric eel](https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id=8005),
  [European eel](https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id=7936).
- `Symsagittifera roscoffensis` and `Xenoturbella bocki` follow
  Xenacoelomorpha, not Platyhelminthes. The game uses the hypothesis that
  Xenacoelomorpha is sister to Nephrozoa, rather than nesting it within
  Deuterostomia. This higher-level position remains disputed:
  [Nephrozoa-sister evidence](https://www.nature.com/articles/nature16520),
  [alternative Xenambulacraria evidence](https://pmc.ncbi.nlm.nih.gov/articles/PMC11521371/).
- The game's Animalia root gives Ctenophora and Placozoa separate top-level
  branches, without scoring which of the two split first. Their placement is
  not settled:
  [ctenophore-first evidence](https://www.nature.com/articles/s41586-023-05936-6),
  [alternative placozoan placement](https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.2005359).
- Omit the inconsistently sampled Eusaurischia rank so all sampled birds share
  the same Theropoda lineage. Complete the whale-shark lineage through
  Neoselachii, Selachimorpha, and Galeomorphi. Correct the genus spelling of
  `Sepia officinalis`, the lancelet family spelling, and the family of
  `Dugesia japonica`. The families of `Carcinus maenas` and
  `Paracentrotus lividus`, and the order of `Mobula birostris`, also follow
  their reviewed taxon records.

## Record contents

`animals.ko.json` contains Korean names and card-length introductions for all
314 species, adapted from the English descriptions at the fixed revisions below.
Keep it identical to `public/data/animals.ko.json`. Names without an established
Korean equivalent use scientific-name transliteration; species scientific names
remain unchanged in either language. These are card introductions,
not translations of the full Wikipedia articles.
`taxa.ko.json` contains Korean display names for the upper taxa shown on cards.
Keep it identical to `public/data/taxa.ko.json`. Korean labels were retrieved from
[Wikidata](https://www.wikidata.org/) on 2026-10-05 and normalized to their taxonomic
ranks. Missing Korean labels use curated Korean names or scientific-name
transliterations with 문·강·목·과·속. The original lineage IDs and scientific names
remain unchanged; these translations are used only for Korean card display.
The squid name 흰꼴뚜기 follows [NIFS](https://www.nifs.go.kr/portal/bt/frctA/actionSpeciesSearchView.do?taxonId=11783).
The names 진주담치 and 플라나리아 follow NIBR's [mollusc fauna](https://www.nibr.go.kr/aiibook/catImage/236/Invertebrate%20fauna%20of%20korea%2019_2.pdf)
and [national species list](https://www.nibr.go.kr/aiibook/catImage/21/National%20Species%202.pdf).
The ambiguous English label “purple sea urchin” is tied to the dataset's species
`Strongylocentrotus purpuratus`, as confirmed by [WoRMS](https://www.marinespecies.org/aphia.php?id=240747&p=taxdetails).

- English common name and scientific taxon name
- Wikidata parent-taxon lineage from `Animalia` to the species
- English Wikipedia introductory description and fixed revision URL
- Wikimedia Commons image URL, creator, file page, and per-file license

## Licensing

The collector preserves two curated card photographs instead of automatic lead images:
`Xenoturbella (bocki) Sweden 2008.jpg` (Joacim Näslund, CC BY 4.0) and
`MOL 1130046 Architeuthis specimen.jpg` (NOAA, public domain/CC0).
Both use `objectFit: contain` to show the animal's full outline. The Xenoturbella
source identifies it as *possibly X. bocki*, so the card credit retains that uncertainty.

- Wikidata structured data is provided under CC0 1.0.
- English Wikipedia article text is provided under CC BY-SA 4.0. Every record
  retains its article and fixed revision URL for attribution.
- Wikimedia Commons media does **not** have one blanket license. Every image
  record retains its own creator, license, license URL, and Commons file page.
  The application must show these credits wherever the image is used.

Regenerate the dataset with:

```sh
node scripts/collect-wikimedia-animals.mjs
node scripts/validate-animal-dataset.mjs
```
