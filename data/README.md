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

- English common name and scientific taxon name
- Wikidata parent-taxon lineage from `Animalia` to the species
- English Wikipedia introductory description and fixed revision URL
- Wikimedia Commons image URL, creator, file page, and per-file license

## Licensing

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
