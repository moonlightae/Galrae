# Animal dataset

`animals.json` is generated from the English-language Wikimedia projects by
`scripts/collect-wikimedia-animals.mjs`. Seed articles are listed in
`animal-seeds.json` and should identify individual species rather than broad
groups such as “sharks” or “ants”.
The 100 species added in September 2026 are listed in
`animal-additions-2026-09.json`; the full dataset contains 207 species.

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
207 species, adapted from the English descriptions at the fixed revisions below.
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
