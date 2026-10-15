import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createCollectionView } from "../public/collection-view.js";
import { ancestorNotes, classAncestors, createAncestorNotes, getClassIds } from "../public/class-ancestors.js";
import { upperAncestors } from "../public/upper-ancestors.js";
import { taxonProfiles } from "../public/taxon-profiles.js";
import { legendRanks, rankNames, rankMark } from "../public/rank-marks.js";
import { orderAncestors } from "../public/order-ancestors.js";
await import("../public/game-logic.js");
const { buildTree } = globalThis.GalraeLogic;
const { animals } = JSON.parse(readFileSync(new URL("../public/data/animals.json", import.meta.url)));
const speciesById = new Map(animals.map((animal) => [animal.id, animal]));
function topology(node) {
  if (node.type === "leaf") return { type: "leaf", id: node.id };
  const children = node.children.map(topology);
  if (node.id !== "Q729" && children.length === 1) return children[0];
  return { type: "branch", id: node.id, children };
}
for (const ids of [animals.map((animal) => animal.id), ["limulus-polyphemus", "tachypleus-tridentatus"], ["mytilus-edulis", "tridacna-gigas"], ["platynereis-dumerilii", "riftia-pachyptila", "hirudo-medicinalis"]]) {
  assert.deepEqual(topology(buildTree(ids, speciesById, null, true)), topology(buildTree(ids, speciesById)), "Class markers must preserve evolutionary relationships");
}
const elements = new Map();
function element(id) {
  const classes = new Set();
  if (!elements.has(id)) elements.set(id, { hidden: false, handlers: {}, attrs: {}, style: {},
    dataset: {},
    classList: { toggle() {}, add(name) { classes.add(name); }, remove(name) { classes.delete(name); }, contains(name) { return classes.has(name); } },
    querySelectorAll: () => [],
    addEventListener(name, handler) { this.handlers[name] = handler; },
    setAttribute(name, value) { this.attrs[name] = value; },
    removeAttribute(name) { delete this.attrs[name]; },
    showModal() { this.open = true; this.shown = (this.shown || 0) + 1; },
    close() { this.open = false; this.handlers.close?.({}); },
  });
  return elements.get(id);
}
const buttons = ["cards", "tree"].map((mode) => Object.assign(element(mode), { dataset: { collectionView: mode } }));
globalThis.document = { querySelectorAll: () => buttons };
globalThis.ResizeObserver = class { observe() {} };
const stored = new Map();
globalThis.localStorage = { getItem: (key) => stored.get(key), setItem: (key, value) => stored.set(key, value) };
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
    branchButtons = [...markup.matchAll(/class="clade-node(?: class-marker| taxon-group-note)?"[^>]*data-target="([^"]+)"/g)].map((match, i) => {
      const button = element(`branch-${i}-${match[1]}`);
      button.dataset.target = match[1];
      button.dataset.rank = match[0].match(/data-rank="([^"]+)"/)?.[1];
      button.classList.add("clade-node");
      return button;
    });
    speciesButtons = [...markup.matchAll(/data-species-id="([^"]+)"/g)].map((match) => Object.assign(element(match[1]), { dataset: { speciesId: match[1] }, textContent: match[1] }));
  },
});
viewport.querySelector = (selector) => selector === ".tree-camera" ? camera : selector === ".base-tree" ? tree : selector === "[data-ancestor-id]" ? branchButtons?.find((button) => button.dataset.ancestorId) : null;
viewport.querySelectorAll = (selector) => selector === "[data-species-id]" ? speciesButtons : selector.includes(".clade-node") ? branchButtons : [];
let opened, mode, language = "ko";
const dialog = element("#ancestor-dialog");
dialog.showModal = () => { dialog.open = true; };
dialog.close = () => { dialog.open = false; };
const loadedSpecies = new Map(speciesById);
speciesById.clear();
const view = createCollectionView({ $: element, buildTree, speciesById, escapeHtml: String, cardText: (animal) => animal,
  onOpenSpecies: (id) => { opened = id; },
  onModeChange: (value) => { mode = value; },
  getLanguage: () => language,
  getGuideKey: () => "guide-test-user",
});
// Production creates the view before initialize() finishes fetching the dataset.
for (const [id, animal] of loadedSpecies) speciesById.set(id, animal);
view.render([]);
assert.equal(element("#collection-grid").hidden, false);
buttons[1].handlers.click();
assert.equal(view.isTree(), true);
assert.equal(mode, "tree");
assert.match(viewport.markup, /아직 분류한 생물이/);
assert.equal(element("#ancestor-guide").shown, undefined, "Empty collection must not consume the guide");
element("#collection-tree-fit").handlers.click();
for (const ids of [["homo-sapiens"], ["homo-sapiens", "asterias-rubens"], animals.map((animal) => animal.id)]) {
  view.render(ids);
  if (ids.length === 1) {
    assert.equal(element("#ancestor-guide").open, true, "A single collected class must trigger the first guide");
    element("#close-ancestor-guide").handlers.click();
  }
  assert.deepEqual(speciesButtons.map((button) => button.dataset.speciesId).sort(), [...ids].sort());
  assert.ok(branchButtons.every((button) => button.dataset.ancestorId ? !button.disabled : button.disabled && button.attrs["aria-label"]));
  assert.equal(element("#collection-grid").hidden, true);
  element("#collection-tree-fit").handlers.click();
  const fitZoom = cameraStyles.get("--tree-zoom");
  assert.ok(fitZoom >= .03 && fitZoom <= 1);
  element("#collection-zoom-in").handlers.click();
  assert.ok(cameraStyles.get("--tree-zoom") > fitZoom);
  viewport.handlers.click({ target: { closest: (selector) => selector === "[data-species-id]" ? speciesButtons[0] : null } });
  assert.equal(opened, speciesButtons[0].dataset.speciesId);
}
const annotated = branchButtons.filter((button) => button.dataset.ancestorId);
assert.deepEqual(new Set(annotated.map((button) => button.dataset.ancestorId)), new Set(Object.keys(ancestorNotes)), "Every registered note, including orders and group borders, must be reachable");
for (const button of annotated) {
  let stopped = false;
  button.handlers.click({ stopPropagation() { stopped = true; } });
  assert.ok(stopped, "Marker clicks must not start another delegated action");
  assert.equal(element("#ancestor-title").textContent, ancestorNotes[button.dataset.ancestorId].koName);
  assert.equal(dialog.open, true, `${button.dataset.ancestorId}: its actual click handler must open a dialog`);
  assert.match(element("#ancestor-content").innerHTML, /주요 특징/);
  assert.match(element("#ancestor-content").innerHTML, /대표 생물/);
  assert.ok(!/undefined/.test(element("#ancestor-content").innerHTML));
}
assert.equal(new Set(legendRanks.map(rankMark)).size, 6, "Each of the six ranks needs a distinct shape");
const legend = element("#collection-rank-legend").innerHTML;
assert.ok(legendRanks.every((rank, index) => index === 0 || legend.indexOf(`<span>${rankNames[rank][0]}</span>`) > legend.indexOf(`<span>${rankNames[legendRanks[index - 1]][0]}</span>`)), "Legend must follow the requested rank order");
assert.equal(branchButtons.filter((button) => button.dataset.rank === "order").length, Object.keys(orderAncestors).length, "Every visible order must have an explanation");
assert.ok(branchButtons.filter((button) => button.dataset.rank === "order").every((button) => button.innerHTML === rankMark("order") && !button.disabled && button.handlers.click));
assert.equal(element("#ancestor-guide").shown, 1, "Guide must not repeat after dismissal");
assert.equal(stored.get("guide-test-user"), "seen");
assert.ok(annotated.some((button) => button.dataset.ancestorId === "ncbi:6844"), "Horseshoe-crab class must be reachable");
assert.ok(annotated.some((button) => button.dataset.ancestorId === "Q25368"), "Bivalves must be reachable");
const mammal = annotated.find((button) => button.dataset.ancestorId === "Q7377");
assert.match(mammal.title, /포유동물강/);
mammal.handlers.click({ stopPropagation() {} });
assert.equal(dialog.open, true);
assert.equal(element("#ancestor-title").textContent, "포유동물강");
assert.match(element("#ancestor-content").innerHTML, /조상/);
element("#close-ancestor").handlers.click();
assert.equal(dialog.open, false);
language = "en";
view.render(animals.map((animal) => animal.id));
const notes = createAncestorNotes({ $: element, escapeHtml: String, getLanguage: () => language, speciesById, cardText: (animal) => animal, buildTree,
  getCollected: () => animals.map((animal) => animal.id), getGuideKey: () => "guide-test-user",
});
notes.open("Q7377");
assert.equal(element("#ancestor-title").textContent, "Mammalia");
assert.match(element("#ancestor-content").innerHTML, /What is the evidence/);
notes.showGuide();
assert.equal(element("#ancestor-guide").shown, 1, "Persisted guide must not repeat after recreation");
const classIds = new Set(animals.flatMap(getClassIds));
const koreanNames = JSON.parse(readFileSync(new URL("../public/data/taxa.ko.json", import.meta.url)));
for (const [id, note] of Object.entries(classAncestors)) {
  assert.ok(classIds.has(id), `${id} must be class-ranked in the dataset`);
  assert.equal(note.koName, koreanNames[id]);
  assert.equal(note.en.length, note.ko.length);
  assert.ok(taxonProfiles[note.name]?.ko.length > 35, `${note.name}: needs biological characteristics`);
  assert.ok(taxonProfiles[note.name]?.en.length > 60, `${note.name}: needs English characteristics`);
  assert.ok(note.sources.length && note.sources.every(([title, url]) => title && new URL(url).protocol === "https:"));
  notes.open(id);
  const representative = animals.find((animal) => animal.image.thumbnailUrl === element("#ancestor-image").src);
  assert.ok(getClassIds(representative).includes(id), `${id} photo must belong to the class`);
  assert.ok(element("#ancestor-content").innerHTML.includes(taxonProfiles[note.name].en));
  assert.ok(element("#ancestor-image-credit").href);
}
const memberIds = new Map();
function indexMembers(node) {
  const ids = node.type === "leaf" ? [node.id] : node.children.flatMap(indexMembers);
  memberIds.set(node.id, new Set(ids));
  return ids;
}
indexMembers(buildTree(animals.map((animal) => animal.id), speciesById, null, true));
for (const lang of ["ko", "en"]) {
  language = lang;
  for (const [id, note] of Object.entries(upperAncestors)) {
    notes.open(id);
    assert.equal(element("#ancestor-title").textContent, lang === "ko" ? note.koName : note.name);
    assert.ok(!/undefined/.test(element("#ancestor-scientific").textContent));
    assert.ok(!/undefined/.test(element("#ancestor-content").innerHTML));
    assert.ok(element("#ancestor-content").innerHTML.includes(lang === "ko" ? note.ko[0] : note.en[0]));
    const representative = animals.find((animal) => animal.image.thumbnailUrl === element("#ancestor-image").src);
    assert.ok(memberIds.get(id).has(representative.id), `${id}: photo must descend from the selected ancestor`);
  }
}
language = "ko";
const localNotes = createAncestorNotes({ $: element, escapeHtml: String, getLanguage: () => language, speciesById, cardText: (animal) => animal, buildTree,
  getCollected: () => ["limulus-polyphemus"], getGuideKey: () => "guide-test-user" });
localNotes.open("Q1360");
assert.equal(element("#ancestor-image").src, speciesById.get("limulus-polyphemus").image.thumbnailUrl, "Prefer a collected descendant over an uncollected representative");
for (const layout of layouts) {
  layout.handlers.click();
  const reachable = new Set(branchButtons.map((button) => button.dataset.ancestorId).filter(Boolean));
  assert.deepEqual(reachable, new Set(Object.keys(ancestorNotes)), `${layout.dataset.treeLayout}: every note must be reachable`);
}

for (const languageOption of ["ko", "en"]) {
  language = languageOption;
  for (const [id, note] of Object.entries(orderAncestors)) {
    notes.open(id);
    const representative = animals.find((animal) => animal.image.thumbnailUrl === element("#ancestor-image").src);
    assert.ok(memberIds.get(id).has(representative.id), `${id}: order photo must be a descendant`);
    assert.ok(element("#ancestor-content").innerHTML.includes(note[language][0]));
    assert.ok(!/undefined/.test(element("#ancestor-scientific").textContent + element("#ancestor-content").innerHTML));
  }
}
language = "ko";
const polychaetes = ["platynereis-dumerilii", "riftia-pachyptila"];
for (const ids of [[polychaetes[0]], polychaetes, [...polychaetes, "hirudo-medicinalis", "lumbricus-terrestris"], animals.map((animal) => animal.id), ["homo-sapiens"]]) {
  view.render(ids);
  for (const layout of layouts) {
    layout.handlers.click();
    const outlines = [...viewport.markup.matchAll(/class="taxon-group" data-group="([^"]+)" data-members="([^"]+)" style="left:([^p]+)px;top:([^p]+)px;width:([^p]+)px;height:([^p]+)px"/g)];
    assert.deepEqual(new Set(outlines.flatMap((match) => match[2].split(","))), new Set(ids.filter((id) => polychaetes.includes(id))), "Borders must cover exactly the collected traditional polychaetes");
    const positionedLeaves = [...viewport.markup.matchAll(/class="species-node[^"]*"[^>]*style="left:([^p]+)px;top:([^p]+)px" data-species-id="([^"]+)"/g)];
    for (const outline of outlines) {
      const [left, top, width, height] = outline.slice(3).map(Number);
      assert.ok(width > 0 && height > 0);
      for (const leaf of positionedLeaves) {
        const [x, y] = leaf.slice(1, 3).map(Number);
        if (polychaetes.includes(leaf[3])) continue;
        assert.ok(x + 84 < left || x - 84 > left + width || y + 36 < top || y - 36 > top + height, `${layout.dataset.treeLayout}: border must not enclose ${leaf[3]}`);
      }
    }
    const groupButtons = branchButtons.filter((button) => button.dataset.ancestorId === "ncbi:6341");
    assert.equal(groupButtons.length, outlines.length, "Every border needs an explanation button");
    for (const button of groupButtons) {
      button.handlers.click({ stopPropagation() {} });
      assert.equal(element("#ancestor-title").textContent, "다모강");
      assert.match(element("#ancestor-content").innerHTML, /측계통군/);
    }
  }
}
view.render(animals.map((animal) => animal.id));

element("#ancestor-image").onerror();
assert.equal(element("#ancestor-image-fallback").hidden, false);
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
delete globalThis.localStorage;
console.log(`${Object.keys(ancestorNotes).length} notes, all visible orders, paraphyletic borders across 3 layouts/partial collections, startup, photos and navigation passed.`);
