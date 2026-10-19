import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const source = read("../public/app.js");
const { animals } = JSON.parse(read("../data/animals.json"));
const { plants } = JSON.parse(read("../data/plants.json"));
const speciesById = new Map([...animals, ...plants].map((animal) => [animal.id, animal]));
let stored = ["homo-sapiens", "hibiscus-syriacus", "formica-rufa", "cyanophora-paradoxa"];
let shown = [];
const elements = new Map();
const $ = (selector) => {
  if (!elements.has(selector)) elements.set(selector, { attributes: {}, value: "old query", innerHTML: "",
    setAttribute(key, value) { this.attributes[key] = value; }, querySelectorAll: () => [],
  });
  return elements.get(selector);
};
const buttons = ["animals", "plants", "animals", "plants"].map((kingdom) => ({ dataset: { kingdom },
  classList: { toggle() {} }, setAttribute(_, value) { this.pressed = value; },
}));
const context = {
  $, speciesById, selectedKingdom: "animals", dataset: {}, gameStarting: false,
  HUMAN_ID: "homo-sapiens", PLANT_INITIAL_ID: "hibiscus-syriacus", initialSpeciesIds: new Set(["homo-sapiens", "hibiscus-syriacus"]),
  getCollection: () => stored, getSuccessCounts: () => ({}),
  cardText: (animal) => animal, taxonomyLabels: () => [], escapeHtml: String, shortDescription: String,
  successCountText: () => "분류 성공 1회", imageCreditText: () => "credit", photoPrivacy: { prepare() {} },
  collectionView: { render(ids) { shown = Array.from(ids); } },
  document: { documentElement: { dataset: {} }, querySelectorAll: () => buttons },
  window: { dispatchEvent() {} }, Event,
};
vm.runInNewContext(source.slice(source.indexOf("function selectKingdom("), source.indexOf("const COLLECTION_PREFIX")), context);
vm.runInNewContext(source.slice(source.indexOf("function renderCollection("), source.indexOf("const { clearPreview")), context);
context.selectKingdom("plants");
assert.deepEqual(shown, ["hibiscus-syriacus", "cyanophora-paradoxa"], "Cards and tree must receive only collected plants");
assert.equal($("#collection-title").textContent, "식물계 도감");
assert.equal($("#collection-count").textContent, "2종 발견");
assert.equal($("#collection-animal-attribution").hidden, true);
assert.equal($("#collection-plant-attribution").hidden, false);
assert.match($("#collection-grid").innerHTML, /cyanophora-paradoxa/);
assert.doesNotMatch($("#collection-grid").innerHTML, /homo-sapiens|formica-rufa/);
assert.equal($("#collection-branch-query").value, "");
assert.equal($("#collection-tree").attributes["aria-label"], "수집한 식물계 생물의 계통수");
assert.deepEqual(buttons.map((button) => button.pressed), ["false", "true", "false", "true"]);
context.selectKingdom("animals");
assert.deepEqual(shown, ["homo-sapiens", "formica-rufa"]);
assert.equal($("#collection-title").textContent, "동물계 도감");
assert.equal($("#collection-animal-attribution").hidden, false);
assert.doesNotMatch($("#collection-grid").innerHTML, /hibiscus-syriacus|cyanophora-paradoxa/);
assert.equal(stored.length, 4, "Switching kingdoms must not remove the other kingdom's saved records");
stored = [];
context.selectKingdom("plants");
assert.deepEqual(shown, []);
assert.match($("#collection-grid").innerHTML, /식물계 분류/);
assert.doesNotMatch($("#collection-grid").innerHTML, /동물계 분류/);
const migration = { ...context, currentUser: null, getCollection: () => [],
  localStorage: { getItem: () => null, removeItem() {} },
  setCollection(ids) { stored = Array.from(ids); }, migrateSuccessCounts() {},
};
vm.runInNewContext(source.slice(source.indexOf("function migrateCollection("), source.indexOf("function saveCollection(")), migration);
migration.migrateCollection();
assert.deepEqual(stored, ["homo-sapiens", "hibiscus-syriacus"], "Both kingdoms start with their free initial card");
console.log("Kingdom collection: matching cards/tree/counts, synced selectors, empty states and preserved records passed.");
