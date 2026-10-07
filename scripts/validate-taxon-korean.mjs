import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const { animals } = JSON.parse(read('../data/animals.json'));
const names = JSON.parse(read('../data/taxa.ko.json'));
assert.equal(read('../data/taxa.ko.json'), read('../public/data/taxa.ko.json'));
const source = read('../public/app.js');
const helper = source.slice(source.indexOf('function taxonomyLabels('), source.indexOf('function collectionKey('));
const state = { cardLanguage: 'en' };
const taxonomyLabels = runInNewContext(`${helper}\ntaxonomyLabels`, { state, taxonNamesKo: names });
const preferredRanks = new Set(['phylum', 'class', 'order', 'family', 'genus']);
for (const animal of animals) {
  const lineage = [...animal.taxonomy.lineage];
  for (const rank of ['class', 'order']) {
    const extra = animal.taxonomy.rankReview?.supplemental[rank];
    if (!extra) continue;
    const lower = rank === 'class' ? ['subclass', 'order', 'family', 'genus', 'species'] : ['suborder', 'family', 'genus', 'species'];
    const index = lineage.findIndex(t => lower.includes(t.rank));
    lineage.splice(index < 0 ? lineage.length : index, 0, { ...extra, rank, wikidataId: extra.taxonId });
  }
  const preferred = lineage.filter(t => preferredRanks.has(t.rank)).slice(-5);
  const selected = preferred.length ? preferred : animal.taxonomy.lineage.slice(-4, -1);
  state.cardLanguage = 'en';
  assert.deepEqual(Array.from(taxonomyLabels(animal)), selected.map(t => t.scientificName));
  state.cardLanguage = 'ko';
  for (const taxon of selected) assert.match(names[taxon.wikidataId] || '', /[가-힣]/, `Missing Korean: ${taxon.scientificName}`);
  assert.deepEqual(Array.from(taxonomyLabels(animal)), selected.map(t => names[t.wikidataId]));
}
assert.equal(names.Q7377, '포유강');
assert.equal(names.Q635162, '사람과');
assert.equal(names.Q171283, '사람속');
const fallback = { taxonomy: { lineage: [{ wikidataId: 'a', scientificName: 'UnknownTaxon' }, { wikidataId: 'Q7377', scientificName: 'Mammalia', rank: 'unranked' }, { wikidataId: 'b' }] } };
assert.deepEqual(Array.from(taxonomyLabels(fallback)), ['UnknownTaxon', '포유강']);
console.log(`Korean/English taxonomy labels verified for all ${animals.length} species and the unranked fallback.`);
