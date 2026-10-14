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
    classList: { toggle() {}, add() {}, remove() {} },
    querySelectorAll: () => [],
    addEventListener(name, handler) { this.handlers[name] = handler; },
    setAttribute(name, value) { this.attrs[name] = value; },
    removeAttribute(name) { delete this.attrs[name]; },
  });
  return elements.get(id);
}
const buttons = ["cards", "tree"].map((mode) => Object.assign(element(mode), { dataset: { collectionView: mode } }));
globalThis.document = { querySelectorAll: () => buttons };
globalThis.ResizeObserver = class { observe() {} };
const layouts = ["top", "bottom", "radial"].map((layout) => Object.assign(element(layout), { dataset: { treeLayout: layout } }));
element("#collection-page").querySelectorAll = () => layouts;
const viewport = element("#collection-tree");
viewport.clientWidth = 320; viewport.clientHeight = 480;
viewport.getBoundingClientRect = () => ({ left: 0, top: 0, width: 320, height: 480 });
viewport.setPointerCapture = () => {};
viewport.hasPointerCapture = () => true;
viewport.releasePointerCapture = () => {};
const cameraStyles = new Map();
const camera = { style: { setProperty: (name, value) => cameraStyles.set(name, value) } };
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
viewport.querySelector = (selector) => selector === ".tree-camera" ? camera : selector === ".base-tree" ? tree : null;
viewport.querySelectorAll = (selector) => selector === "[data-species-id]" ? speciesButtons : selector.includes(".clade-node") ? branchButtons : [];
let opened, mode;
const view = createCollectionView({ $: element, buildTree, speciesById, escapeHtml: String, cardText: (animal) => animal,
  onOpenSpecies: (id) => { opened = id; },
  onModeChange: (value) => { mode = value; },
});
view.render([]);
assert.equal(element("#collection-grid").hidden, false);
buttons[1].handlers.click();
assert.equal(view.isTree(), true);
assert.equal(mode, "tree");
assert.match(viewport.markup, /아직 분류한 생물이/);
element("#collection-tree-fit").handlers.click();
for (const ids of [["homo-sapiens"], ["homo-sapiens", "asterias-rubens"], animals.map((animal) => animal.id)]) {
  view.render(ids);
  assert.deepEqual(speciesButtons.map((button) => button.dataset.speciesId).sort(), [...ids].sort());
  assert.ok(branchButtons.every((button) => button.disabled && button.attrs["aria-hidden"] === "true"));
  assert.equal(element("#collection-grid").hidden, true);
  element("#collection-tree-fit").handlers.click();
  const fitZoom = cameraStyles.get("--tree-zoom");
  assert.ok(fitZoom >= .03 && fitZoom <= 1);
  element("#collection-zoom-in").handlers.click();
  assert.ok(cameraStyles.get("--tree-zoom") > fitZoom);
  viewport.handlers.click({ target: { closest: () => speciesButtons[0] } });
  assert.equal(opened, speciesButtons[0].dataset.speciesId);
}
layouts[2].handlers.click();
assert.match(viewport.markup, /radial-tree/);
assert.equal(layouts[2].attrs["aria-pressed"], "true");
viewport.handlers.pointerdown({ button: 0, pointerId: 1, clientX: 20, clientY: 30, target: { closest: () => null } });
viewport.handlers.pointermove({ clientX: 60, clientY: 80 });
assert.equal(cameraStyles.get("--pan-x"), "40px");
assert.equal(cameraStyles.get("--pan-y"), "50px");
viewport.handlers.pointercancel({ pointerId: 1 });
viewport.handlers.pointermove({ clientX: 100, clientY: 100 });
assert.equal(cameraStyles.get("--pan-x"), "40px");
const oldZoom = cameraStyles.get("--tree-zoom");
viewport.handlers.wheel({ preventDefault() {}, deltaY: -100, deltaMode: 0, clientX: 100, clientY: 100 });
assert.ok(cameraStyles.get("--tree-zoom") > oldZoom);
buttons[0].handlers.click();
assert.equal(element("#collection-tree-panel").hidden, true);
assert.equal(buttons[0].attrs["aria-pressed"], "true");
delete globalThis.document;
delete globalThis.ResizeObserver;
console.log("Collection fullscreen modes, empty/single/full trees, layouts, camera zoom, drag/cancel and card opening passed.");
