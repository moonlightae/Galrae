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
const preferredRanks = ['phylum', 'class', 'order', 'family', 'genus'];
for (const animal of animals) {
  const lineage = [...animal.taxonomy.lineage];
  for (const rank of ['class', 'order']) {
    const extra = animal.taxonomy.rankReview?.supplemental[rank];
    if (!extra) continue;
    const lower = rank === 'class' ? ['subclass', 'order', 'family', 'genus', 'species'] : ['suborder', 'family', 'genus', 'species'];
    const index = lineage.findIndex(t => lower.includes(t.rank));
    lineage.splice(index < 0 ? lineage.length : index, 0, { ...extra, rank, wikidataId: extra.taxonId });
  }
  const preferred = preferredRanks.map(rank => lineage.findLast(t => t.rank === rank)).filter(Boolean);
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
state.cardLanguage = 'en';
assert.deepEqual(Array.from(taxonomyLabels(animals.find(a => a.id === 'parasteatoda-tepidariorum'))), ['Arthropoda', 'Arachnida', 'Araneae', 'Theridiidae', 'Parasteatoda']);
state.cardLanguage = 'ko';
assert.deepEqual(Array.from(taxonomyLabels(animals.find(a => a.id === 'parasteatoda-tepidariorum'))), ['절지동물문', '거미강', '거미목', '꼬마거미과', '파라스테아토다속']);
const duplicateRanks = { taxonomy: { lineage: [
  { wikidataId: 'Q1360', scientificName: 'Arthropoda', rank: 'phylum' },
  { wikidataId: 'Q1358', scientificName: 'Arachnida', rank: 'class' },
  { wikidataId: 'Q30587689', scientificName: 'Araneida', rank: 'order' },
  { wikidataId: 'Q1357', scientificName: 'Araneae', rank: 'order' },
] } };
assert.deepEqual(Array.from(taxonomyLabels(duplicateRanks)), ['절지동물문', '거미강', '거미목'], 'Repeated ranks must never displace the phylum or duplicate the order');
const fallback = { taxonomy: { lineage: [{ wikidataId: 'a', scientificName: 'UnknownTaxon' }, { wikidataId: 'Q7377', scientificName: 'Mammalia', rank: 'unranked' }, { wikidataId: 'b' }] } };
assert.deepEqual(Array.from(taxonomyLabels(fallback)), ['UnknownTaxon', '포유강']);
console.log(`Korean/English taxonomy labels verified for all ${animals.length} species and the unranked fallback.`);
