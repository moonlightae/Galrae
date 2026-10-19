import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import "../public/game-logic.js";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
assert.equal(read("../data/plants.json"), read("../public/data/plants.json"));
const { plants, initialSpeciesId } = JSON.parse(read("../data/plants.json"));
const { animals } = JSON.parse(read("../data/animals.json"));
const { buildTree, createDifficultyQueue, getExpectedPlacement, isEquivalentPlacement, collectLeafIds } = globalThis.GalraeLogic;
const speciesById = new Map([...animals, ...plants].map((plant) => [plant.id, plant]));
const classes = new Set();
for (const plant of plants) {
  assert.match(plant.id, /^[a-z0-9-]{1,80}$/);
  assert.equal(plant.taxonomy.lineage[0].scientificName, "Plantae");
  assert.equal(plant.taxonomy.lineage.at(-1).rank, "class");
  assert.equal(plant.taxonomy.lineage.filter((taxon) => taxon.rank === "class").length, 1);
  assert.ok(plant.ko.commonName && plant.ko.description && plant.description);
  assert.ok(plant.image.artist && plant.image.license);
  assert.match(plant.image.commonsPageUrl, /^https:\/\/commons.wikimedia.org\//);
  classes.add(plant.taxonomy.lineage.at(-1).wikidataId);
}
assert.equal(classes.size, plants.length);
let seed = 17;
const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
for (let run = 0; run < 50; run++) {
  const queue = createDifficultyQueue(plants, "easy", random, initialSpeciesId);
  assert.equal(queue.length, classes.size - 1);
  assert.equal(new Set(queue).size, queue.length);
  assert.ok(!queue.includes(initialSpeciesId) && !queue.includes("homo-sapiens"));
  const classified = [initialSpeciesId];
  for (const id of queue) {
    const before = buildTree(classified, speciesById);
    assert.equal(before.name, "Plantae");
    const expected = getExpectedPlacement(classified, id, speciesById);
    assert.equal(isEquivalentPlacement(before, expected, expected.targetId, expected.placement), true);
    assert.equal(isEquivalentPlacement(before, expected, "missing", "join"), false);
    classified.push(id);
  }
  assert.equal(collectLeafIds(buildTree(classified, speciesById)).length, classes.size);
}
const mixed = buildTree(["homo-sapiens", initialSpeciesId, plants.at(-1).id], speciesById, null, true);
assert.equal(mixed.name, "Eukaryota");
assert.deepEqual(new Set(mixed.children.map((node) => node.name)), new Set(["Animalia", "Plantae"]));
assert.equal(buildTree(["homo-sapiens"], speciesById).name, "Animalia");
const renderer = read("../public/tree-view.js");
const renderContext = {
  speciesById, cardText: (plant) => plant, escapeHtml: String,
  state: { newest: null, failed: false, layout: "top" }, treeCanvas: { innerHTML: "" }, updateCamera() {},
};
vm.runInNewContext(renderer.slice(renderer.indexOf("function mistakeClass("), renderer.indexOf("function renderPreview(")), renderContext);
for (const layout of ["top", "bottom", "radial"]) {
  renderContext.state.layout = layout;
  renderContext.renderTree(buildTree(plants.map((plant) => plant.id), speciesById));
  assert.match(renderContext.treeCanvas.innerHTML, /class="tree-root">Plantae/);
  assert.doesNotMatch(renderContext.treeCanvas.innerHTML, /Animalia|NaN|undefined/);
  for (const plant of plants) assert.ok(renderContext.treeCanvas.innerHTML.includes(`data-species-id="${plant.id}"`));
  renderContext.renderTree(mixed);
  assert.match(renderContext.treeCanvas.innerHTML, /class="tree-root">Eukaryota/);
}

const client = read("../public/app.js");
const elements = new Map();
const element = (selector) => {
  if (!elements.has(selector)) elements.set(selector, {});
  return elements.get(selector);
};
const buttons = ["animals", "plants"].map((kingdom) => ({ dataset: { kingdom }, classList: { toggle(_, value) { this.active = value; } }, setAttribute(_, value) { this.pressed = value; } }));
const context = { gameStarting: false, selectedKingdom: "animals", $: element, document: { querySelectorAll: () => buttons } };
vm.runInNewContext(client.slice(client.indexOf("function selectKingdom("), client.indexOf("const COLLECTION_PREFIX")), context);
context.selectKingdom("plants");
assert.equal(context.selectedKingdom, "plants");
assert.equal(element("#start-practice").hidden, true);
assert.equal(element("#start-tutorial").hidden, true);
assert.equal(buttons[1].pressed, "true");
context.selectKingdom("animals");
assert.equal(element("#start-practice").hidden, false);
assert.equal(element("#start-tutorial").hidden, false);
assert.equal(buttons[0].pressed, "true");
console.log(`Validated ${classes.size} plant classes, 50 complete queue orders, mixed collection roots and kingdom selection.`);
