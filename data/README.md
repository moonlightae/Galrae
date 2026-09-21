# Animal dataset

`animals.json` is generated from the English-language Wikimedia projects by
`scripts/collect-wikimedia-animals.mjs`. Seed articles are listed in
`animal-seeds.json` and should identify individual species rather than broad
groups such as “sharks” or “ants”.

Some Wikipedia article concepts use a different Wikidata item from the formal
taxon item. Those explicit links are kept in `taxon-overrides.json`.

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
