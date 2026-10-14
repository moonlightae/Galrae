import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createCollectionView } from "../public/collection-view.js";
await import("../public/game-logic.js");
const { buildTree } = globalThis.GalraeLogic;
const { animals } = JSON.parse(readFileSync(new URL("../public/data/animals.json", import.meta.url)));
const speciesById = new Map(animals.map((animal) => [animal.id, animal]));
const elements = new Map();
function element(id) {
  if (!elements.has(id)) elements.set(id, { hidden: false, handlers: {}, attrs: {},
    addEventListener(name, handler) { this.handlers[name] = handler; },
    setAttribute(name, value) { this.attrs[name] = value; },
  });
  return elements.get(id);
}
const buttons = ["cards", "tree"].map((mode) => Object.assign(element(mode), { dataset: { collectionView: mode } }));
globalThis.document = { querySelectorAll: () => buttons };
const viewport = element("#collection-tree");
viewport.clientWidth = 320; viewport.clientHeight = 480;
viewport.scrollTo = () => {};
let tree, branchButtons, speciesButtons;
Object.defineProperty(viewport, "innerHTML", {
  set(markup) {
    this.markup = markup;
    const size = markup.match(/data-width="([^"]+)" data-height="([^"]+)"/);
    tree = size ? { dataset: { width: size[1], height: size[2] }, style: {}, parentElement: { style: {} } } : null;
    branchButtons = [...markup.matchAll(/class="clade-node"/g)].map((_, i) => element(`branch-${i}`));
    speciesButtons = [...markup.matchAll(/data-species-id="([^"]+)"/g)].map((match) => Object.assign(element(match[1]), { dataset: { speciesId: match[1] }, textContent: match[1] }));
  },
});
viewport.querySelector = () => tree;
viewport.querySelectorAll = (selector) => selector === "[data-species-id]" ? speciesButtons : branchButtons;
let opened;
const view = createCollectionView({ $: element, buildTree, speciesById, escapeHtml: String, cardText: (animal) => animal,
  onOpenSpecies: (id) => { opened = id; },
});
view.render([]);
assert.equal(element("#collection-grid").hidden, false);
buttons[1].handlers.click();
assert.match(viewport.markup, /아직 분류한 생물이/);
element("#collection-tree-fit").handlers.click();
for (const ids of [["homo-sapiens"], ["homo-sapiens", "asterias-rubens"], animals.map((animal) => animal.id)]) {
  view.render(ids);
  assert.deepEqual(speciesButtons.map((button) => button.dataset.speciesId).sort(), [...ids].sort());
  assert.ok(branchButtons.every((button) => button.disabled && button.attrs["aria-hidden"] === "true"));
  assert.equal(element("#collection-grid").hidden, true);
  element("#collection-tree-fit").handlers.click();
  assert.ok(Number.parseFloat(tree.style.transform.slice(6)) > 0);
  assert.ok(Number.parseFloat(tree.parentElement.style.width) <= viewport.clientWidth, "Full view must fit all species horizontally");
  element("#collection-zoom-in").handlers.click();
  assert.ok(Number.parseFloat(tree.parentElement.style.width) > 0);
  viewport.handlers.click({ target: { closest: () => speciesButtons[0] } });
  assert.equal(opened, speciesButtons[0].dataset.speciesId);
}
buttons[0].handlers.click();
assert.equal(element("#collection-tree-panel").hidden, true);
assert.equal(buttons[0].attrs["aria-pressed"], "true");
delete globalThis.document;
console.log("Collection modes, empty/single/full trees, read-only branches, zoom and card opening passed.");
