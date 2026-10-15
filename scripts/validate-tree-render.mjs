import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

await import(new URL("../public/game-logic.js", import.meta.url));
const { ANIMALIA_ID, buildTree, collectLeafIds } = globalThis.GalraeLogic;
const dataset = JSON.parse(readFileSync(new URL("../data/animals.json", import.meta.url), "utf8"));
const speciesById = new Map(dataset.animals.map((animal) => [animal.id, animal]));
const appSource = readFileSync(new URL("../public/tree-view.js", import.meta.url), "utf8");
const start = appSource.indexOf("function mistakeClass(");
const end = appSource.indexOf("function renderPreview(");
assert.ok(start >= 0 && end > start, "Tree rendering functions are missing");

const context = {
  ANIMALIA_ID,
  escapeHtml: (value) => String(value),
  speciesById,
  cardText: (animal) => animal,
  state: { newest: null, failed: false, layout: "top" },
  treeCanvas: { innerHTML: "" },
  updateCamera: () => {},
};
vm.runInNewContext(appSource.slice(start, end), context);

function inspect(classifiedIds) {
  context.state.layout = "top";
  const tree = buildTree(classifiedIds, speciesById);
  context.renderTree(tree);
  const markup = context.treeCanvas.innerHTML;
  assert.doesNotMatch(markup, /root-wrap-target|data-placement="top"/, "Every pillar must use regular wrap placement");
  if (tree.children.length === 1) {
    assert.doesNotMatch(markup, /class="clade-node"[^>]*data-target="Q729"/, "A unary Animalia container must not create a phantom split");
  } else {
    assert.match(markup, /class="clade-node"[^>]*data-target="Q729" data-placement="join"/, "A real root split must have the same circle as other splits");
  }
  return markup;
}

const humanId = "homo-sapiens";
const ctenophoreId = "bolinopsis-infundibulum";
const placozoanId = "hoilungia-hongkongensis";
const mantisId = dataset.animals.find((animal) => animal.commonName === "European mantis")?.id;
assert.ok(mantisId, "European mantis fixture is missing");

assert.match(inspect([humanId]), /data-species-id="homo-sapiens" data-target="homo-sapiens"/, "Human must remain a drop target");
inspect([humanId, mantisId]);
inspect([humanId, ctenophoreId]);
inspect([humanId, placozoanId]);
inspect([humanId, ctenophoreId, placozoanId]);
const sampleTree = buildTree([humanId, ctenophoreId, placozoanId], speciesById);
context.state.layout = "bottom";
context.renderTree(sampleTree);
assert.match(context.treeCanvas.innerHTML, /layout-bottom/, "Bottom-up layout must use the inverted tree");
assert.match(context.treeCanvas.innerHTML, /data-species-id="homo-sapiens"/, "Bottom-up layout must preserve species targets");

context.state.layout = "radial";
context.renderTree(sampleTree);
assert.match(context.treeCanvas.innerHTML, /class="radial-tree base-tree"/, "Circular layout must render radial branches");
assert.match(context.treeCanvas.innerHTML, /data-target="Q729" data-placement="wrap"/, "Circular layout must use regular wrapping on the root pillar");
assert.match(context.treeCanvas.innerHTML, /data-species-id="homo-sapiens" data-target="homo-sapiens"/, "Circular layout must preserve species targets");

const fullTree = buildTree(dataset.animals.map((animal) => animal.id), speciesById);
context.state.layout = "top";
context.renderTree(fullTree);
const topTargets = [...context.treeCanvas.innerHTML.matchAll(/data-target="([^"]+)" data-placement="([^"]+)"/g)]
  .map((match) => `${match[1]}:${match[2]}`).sort();
context.state.layout = "radial";
context.renderTree(fullTree);
const radialTargets = [...context.treeCanvas.innerHTML.matchAll(/data-target="([^"]+)" data-placement="([^"]+)"/g)]
  .map((match) => `${match[1]}:${match[2]}`).sort();
assert.deepEqual(radialTargets, topTargets, "Circular layout must offer exactly the same placement targets");
const radial = context.layoutRadialTree(fullTree);
for (const layoutName of ["top", "bottom", "radial"]) {
  context.state.layout = layoutName;
  const layout = layoutName === "radial" ? radial : context.layoutRectangularTree(fullTree);
  context.renderTree(fullTree);
  const buttons = new Map([...context.treeCanvas.innerHTML.matchAll(/class="clade-node"[^>]*left:([\d.-]+)px;top:([\d.-]+)px[^>]*data-target="([^"]+)"/g)].map((match) => [match[3], { x: Number(match[1]), y: Number(match[2]) }]));
  function inspectJunction(entry, parent = null) {
    if (entry.node.type === "branch" && entry.children.length > 1) {
      const button = buttons.get(entry.node.id);
      assert.ok(button, "Every shared ancestor must have a junction target");
      assert.equal(button.x, entry.x, "The target must stay at the horizontal center of the split");
      assert.equal(button.y, layoutName === "radial" ? entry.y : (entry.y + entry.children[0].y) / 2, "Join targets must sit on the split itself, not above it on the trunk");
    }
    entry.children.forEach((child) => inspectJunction(child, entry));
  }
  inspectJunction(layout.root);
}
const mammalIds = [humanId, "canis-lupus"];
const mammalLayout = context.layoutRectangularTree(buildTree(mammalIds, speciesById));
const mammalSplit = mammalLayout.root.children[0];
const expectedTrunkHeight = (mammalSplit.y + mammalSplit.children[0].y) / 2 - mammalLayout.root.y - 16;
assert.match(inspect(mammalIds), new RegExp(`class="tree-pillar"[^>]*height:${expectedTrunkHeight}px[^>]*>.*?data-target="${mammalSplit.node.id}" data-placement="wrap"`), "The incoming pillar must target the actual first branch");
let radialLeaves = 0;
function inspectRadial(entry) {
  assert.ok(Number.isFinite(entry.x) && Number.isFinite(entry.y), "Every circular node needs finite coordinates");
  if (entry.node.type === "leaf") radialLeaves += 1;
  entry.children.forEach(inspectRadial);
}
inspectRadial(radial.root);
assert.equal(radialLeaves, dataset.speciesCount, "Circular layout must position every sampled species");

for (const ids of [[humanId], [humanId, mantisId], dataset.animals.slice(0, 40).map((animal) => animal.id), dataset.animals.map((animal) => animal.id), dataset.animals.map((animal) => animal.id).reverse()]) {
  const layout = context.layoutRectangularTree(buildTree(ids, speciesById));
  const rows = new Map();
  function inspectPosition(entry, isRoot = false) {
    const halfWidth = entry.node.type === "leaf" ? 84 : isRoot ? 96 : 9;
    assert.ok(entry.x - halfWidth >= 24 - 1e-8 && entry.x + halfWidth <= layout.width - 24 + 1e-8, "Every card/branch must fit inside the camera bounds");
    if (!rows.has(entry.y)) rows.set(entry.y, []);
    rows.get(entry.y).push({ x: entry.x, halfWidth });
    if (entry.children.length) assert.ok(Math.abs(entry.x - (entry.children[0].x + entry.children.at(-1).x) / 2) < 1e-8, "Parents must sit halfway between the outer child branches");
    assert.deepEqual(Array.from(entry.children, (child) => child.node.id), entry.node.type === "leaf" ? [] : entry.node.children.map((child) => child.id), "Centering must preserve the existing branch order");
    entry.children.forEach((child) => {
      assert.equal(child.y - entry.y, 152, "Each generation needs enough space for labels and placement targets");
      inspectPosition(child);
    });
  }
  inspectPosition(layout.root, true);
  for (const row of rows.values()) {
    row.sort((a, b) => a.x - b.x);
    for (let i = 1; i < row.length; i++) assert.ok(row[i].x - row[i].halfWidth - (row[i - 1].x + row[i - 1].halfWidth) >= 56 - 1e-8, "Cards and branch groups must retain readable gaps");
  }
  const left = Math.min(...[...rows.values()].flat().map((node) => node.x - node.halfWidth));
  const right = Math.max(...[...rows.values()].flat().map((node) => node.x + node.halfWidth));
  assert.ok(Math.abs((left + right) / 2 - layout.width / 2) < 1e-8, "The actual drawing bounds must be centered");
}

function positionedLeafIds(entry) {
  return entry.node.type === "leaf" ? [entry.node.id] : Array.from(entry.children).flatMap(positionedLeafIds);
}
for (const order of [dataset.animals.map((animal) => animal.id), dataset.animals.map((animal) => animal.id).reverse()]) {
  let previous = [];
  for (let count = 1; count <= order.length; count++) {
    const tree = buildTree(order.slice(0, count), speciesById);
    const layout = context.layoutRectangularTree(tree);
    const leaves = positionedLeafIds(layout.root);
    assert.deepEqual(leaves, collectLeafIds(tree), "Layout must not sort or mirror the game's branch order");
    const previousIds = new Set(previous);
    assert.deepEqual(leaves.filter((id) => previousIds.has(id)), previous, "Adding a species must not flip existing branches");
    previous = leaves;
  }
}
const radialCards = [];
function collectRadialCards(entry) {
  if (entry.node.type === "leaf") radialCards.push(entry);
  entry.children.forEach(collectRadialCards);
}
collectRadialCards(radial.root);
for (let i = 0; i < radialCards.length; i++) {
  for (let j = i + 1; j < radialCards.length; j++) {
    assert.ok(Math.abs(radialCards[i].x - radialCards[j].x) >= 192 || Math.abs(radialCards[i].y - radialCards[j].y) >= 96, "Circular cards need room for readable labels and answer badges");
  }
}
assert.match(inspect([humanId]), /class="tree-pillar"[^>]*height:100px[^>]*>.*?data-target="homo-sapiens" data-placement="wrap"/, "The initial pillar must wrap its species using the regular mechanism");

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
assert.match(css, /\.tree-pillar > button\s*\{[^}]*inset:\s*0;[^}]*width:\s*100%;[^}]*height:\s*100%;/, "Buttons must inherit the pillar's entire rectangle");
assert.doesNotMatch(css, /\.phylo-tree > \.edge-target\s*\{/, "No fixed-height overlay may override the pillar button");
assert.match(css, /\.tree-links\s*\{[^}]*pointer-events:\s*none/, "Horizontal SVG branches must remain non-interactive outside the junction circles");

for (const ids of [[humanId], mammalIds, dataset.animals.slice(0, 40).map((animal) => animal.id), dataset.animals.map((animal) => animal.id)]) {
  for (const layoutName of ["top", "bottom", "radial"]) {
    context.state.layout = layoutName;
    const tree = buildTree(ids, speciesById);
    const layout = layoutName === "radial" ? context.layoutRadialTree(tree) : context.layoutRectangularTree(tree);
    context.renderTree(tree);
    const pillars = new Map();
    for (const match of context.treeCanvas.innerHTML.matchAll(/<span class="tree-pillar" style="([^"]+)">([\s\S]*?)<\/span>/g)) {
      const [, style, body] = match;
      const target = body.match(/data-target="([^"]+)" data-placement="([^"]+)"/);
      const number = (name) => Number(style.match(new RegExp(`${name}:([^;]+?)(?:px|deg)(?:;|$)`))[1]);
      const length = number("height");
      assert.equal(Number(body.match(/y2="([^"]+)"/)[1]), length, "The drawn line and inherited button must have the same length");
      assert.ok(length > 0);
      assert.doesNotMatch(body, /<button[^>]*style=/, "A pillar button must not define an independent size or position");
      pillars.set(`${target[1]}:${target[2]}`, { x: number("left"), y: number("top"), length, angle: number("--pillar-angle") });
    }
    function checkPillar(entry, parent = null) {
      if (entry.node.type === "branch" && entry.children.length === 1) {
        checkPillar(entry.children[0], parent);
        return;
      }
      if (!parent || entry.node.type === "branch") {
          const pillar = pillars.get(`${entry.node.id}:wrap`);
          assert.ok(pillar, "Every existing branch target must fill its pillar");
          const start = parent
            ? layoutName === "radial" ? parent : { x: entry.x, y: (parent.y + entry.y) / 2 }
            : { x: layout.root.x, y: layout.root.y + (layoutName === "radial" ? -52 : 16) };
          const end = layoutName === "radial" ? entry : { x: entry.x, y: entry.node.type === "leaf" ? entry.y - 36 : (entry.y + entry.children[0].y) / 2 };
          assert.equal(pillar.x, start.x); assert.equal(pillar.y, start.y);
          assert.equal(pillar.length, Math.hypot(end.x - start.x, end.y - start.y));
          assert.equal(pillar.angle, Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI - 90);
          if (layoutName !== "radial") assert.equal(pillar.angle, 0, "The expanded target must stay on the vertical pillar, not the horizontal branch");
      }
      entry.children.forEach((child) => checkPillar(child, entry));
    }
    checkPillar(layout.root);
  }
}
context.state.mistakes = new Set([humanId, ctenophoreId]);
context.state.latestMistake = ctenophoreId;
for (const layout of ["top", "bottom", "radial"]) {
  context.state.layout = layout; context.renderTree(sampleTree);
  const html = context.treeCanvas.innerHTML;
  assert.match(html, /class="species-node is-mistake is-recent-mistake"[^>]*data-species-id="bolinopsis-infundibulum"/);
  assert.match(html, /class="species-node is-mistake"[^>]*data-species-id="homo-sapiens"/);
  assert.equal((html.match(/class="species-node[^"<>]*is-recent-mistake/g) || []).length, 1, "Only the latest mistake may be green");
}
context.state.mistakes = new Set(); context.state.latestMistake = null;

const cameraStart = appSource.indexOf("function updateCamera(");
const cameraEnd = appSource.indexOf("  return { clearPreview", cameraStart);
assert.ok(cameraStart >= 0 && cameraEnd > cameraStart, "Tree camera functions are missing");
const zoomStatus = { textContent: "" };
const cameraStyles = new Map();
const cameraState = { zoom: 1, panX: 20, panY: -10, layout: "top" };
const cameraContext = {
  zoomStatus: undefined,
  layoutControls: { querySelectorAll: () => [] },
  state: cameraState,
  MIN_TREE_ZOOM: .03,
  MAX_TREE_ZOOM: 3.5,
  treeCanvas: {
    clientWidth: 400, clientHeight: 300,
    querySelector: (selector) => selector === ".tree-camera"
      ? { style: { setProperty: (name, value) => cameraStyles.set(name, value) } }
      : null,
    getBoundingClientRect: () => ({ left: 100, top: 100, width: 400, height: 300 }),
  },
  $: () => zoomStatus,
  clearPreview: () => {},
  document: { querySelectorAll: () => [] },
  renderCurrentTree: () => {},
};
vm.runInNewContext(appSource.slice(cameraStart, cameraEnd), cameraContext);
cameraContext.zoomTree(2, 350, 220);
assert.equal(cameraState.zoom, 2);
assert.equal(cameraState.panX, -10, "Zoom must keep the species under the pointer at the same x coordinate");
assert.equal(cameraState.panY, 10, "Zoom must keep the species under the pointer at the same y coordinate");
assert.equal(cameraStyles.get("--tree-zoom"), 2);
assert.equal(zoomStatus.textContent, "200%");
cameraContext.treeCanvas.querySelector = (selector) => selector === ".base-tree"
  ? { dataset: { width: "1000", height: "1000" } }
  : { style: { setProperty: (name, value) => cameraStyles.set(name, value) } };
cameraContext.resetTreeView();
assert.equal(cameraState.zoom, .268, "Circular reset must fit the drawing inside the viewport");
assert.equal(cameraState.panX, 0);
assert.equal(cameraState.panY, 0);
console.log("Validated top, bottom, and circular tree rendering for all 207 species.");

const clientSource = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const detailSource = clientSource.slice(clientSource.indexOf("function openSpeciesCard("), clientSource.indexOf("function placeCard("));
const detailElements = new Map();
const detailElement = (selector) => {
  if (!detailElements.has(selector)) detailElements.set(selector, { hidden: true, style: {}, focus() {} });
  return detailElements.get(selector);
};
const detailState = { classified: [humanId], currentId: ctenophoreId, failed: false };
const detailContext = {
  state: detailState, speciesById, HUMAN_ID: humanId, $: detailElement,
  cardText: (animal) => animal,
  shortDescription: (text) => text, escapeHtml: (text) => String(text),
  taxonomyLabels: (animal) => animal.taxonomy.lineage.map((taxon) => taxon.scientificName),
  getSuccessCounts: () => ({}), successCountText: () => "분류 성공 0회", imageCreditText: () => "credit",
  getCollection: () => [ctenophoreId],
};
vm.runInNewContext(detailSource, detailContext);
detailContext.openSpeciesCard(ctenophoreId);
assert.equal(detailElement("#species-modal").hidden, true, "An unrevealed card must not open during play");
detailContext.openSpeciesCard(ctenophoreId, null, true);
assert.equal(detailElement("#species-modal").hidden, false, "Collected cards must open without belonging to the current game");
assert.equal(detailElement("#species-view-taxonomy").hidden, false, "Collection cards must reveal taxonomy");
detailContext.closeSpeciesCard();
detailContext.openSpeciesCard(placozoanId, null, true);
assert.equal(detailElement("#species-modal").hidden, true, "Collection view must not open uncollected cards");
detailContext.openSpeciesCard(humanId);
assert.equal(detailElement("#species-view-taxonomy").hidden, true, "Taxonomy must stay hidden during play");
detailContext.closeSpeciesCard();
detailState.failed = true;
detailContext.openSpeciesCard(ctenophoreId);
assert.equal(detailElement("#species-modal").hidden, false, "The revealed answer card must open after failure");
assert.equal(detailElement("#species-view-name").textContent, speciesById.get(ctenophoreId).commonName);
assert.equal(detailElement("#species-view-taxonomy").hidden, false);
assert.match(detailElement("#species-view-groups").innerHTML, /Ctenophora/);
assert.deepEqual(detailState.classified, [humanId], "Opening an answer must not classify or collect it");
detailContext.closeSpeciesCard();
detailContext.openSpeciesCard(placozoanId);
assert.equal(detailElement("#species-modal").hidden, true, "Failure must not unlock unrelated cards");
detailState.failed = false;
detailContext.openSpeciesCard(humanId);
assert.equal(detailElement("#species-view-taxonomy").hidden, true);
assert.equal(detailElement("#species-view-groups").innerHTML, "", "A new game must not retain revealed taxonomy");

detailState.classified.push("architeuthis-dux");
detailContext.openSpeciesCard("architeuthis-dux");
assert.equal(detailElement("#species-view-image").style.objectFit, "contain", "Whole-animal photos must remain uncropped");
detailContext.openSpeciesCard(humanId);
assert.equal(detailElement("#species-view-image").style.objectFit, "contain", "Human portrait must remain uncropped at every card ratio");
assert.equal(speciesById.get(humanId).image.fileName, "Human Skull.jpg", "Human cards must use a skull instead of an identifiable portrait");
detailContext.openSpeciesCard(ctenophoreId, null, true);
assert.equal(detailElement("#species-view-image").style.objectFit, "cover", "Opening another species must reset image fitting");
console.log("Validated answer-card details and taxonomy visibility after failure.");

const completionState = { tutorial: true, score: 4, round: 4, queue: [1, 2, 3, 4], currentId: "formica-rufa" };
const completionContext = {
  state: completionState, $: detailElement,
  card: { classList: { add() {} }, setAttribute() {} },
};
detailElement("#result-modal").hidden = true;
vm.runInNewContext(clientSource.slice(clientSource.indexOf("function updateRound("), clientSource.indexOf("async function startGame(")), completionContext);
completionContext.updateRound();
assert.equal(detailElement("#tutorial-complete-panel").hidden, false, "Tutorial completion must use the bottom panel");
assert.equal(detailElement("#result-modal").hidden, true, "Tutorial completion must not obscure the final tree with a modal");
assert.equal(detailElement("#tutorial-banner").hidden, true);
assert.equal(completionState.currentId, null, "Completing the tutorial must prevent placing the last card twice");
console.log("Validated tutorial completion without a blocking modal.");

const korean = JSON.parse(readFileSync(new URL("../data/animals.ko.json", import.meta.url), "utf8"));
for (const animal of dataset.animals) animal.ko = korean[animal.id];
const translationSource = clientSource.slice(clientSource.indexOf("function cardText("), clientSource.indexOf("function taxonomyLabels("));
const languageState = { cardLanguage: "en", tree: sampleTree, classified: [humanId, ctenophoreId, placozoanId], currentId: "asterias-rubens", failed: false };
const languageCalls = [];
const languageContext = {
  state: languageState, dataset, speciesById, buildTree,
  localStorage: { setItem: (key, value) => languageCalls.push([key, value]) },
  document: { querySelectorAll: () => [] },
  renderCollection() {}, clearPreview() {}, setCard: (id) => languageCalls.push(id),
  renderTree: (tree, answer) => languageCalls.push({ tree, answer }),
};
vm.runInNewContext(translationSource, languageContext);
languageContext.setCardLanguage("ko");
assert.equal(languageContext.cardText(speciesById.get(humanId)).commonName, "사람");
assert.equal(languageState.tree, sampleTree, "Language changes must preserve the tree and placement state");
assert.equal(languageState.currentId, "asterias-rubens");
assert.equal(languageCalls.at(-1), "asterias-rubens");
assert.equal(languageContext.cardText(speciesById.get(humanId)).scientificName, "Homo sapiens");
context.cardText = languageContext.cardText;
for (const layout of ["top", "bottom", "radial"]) {
  context.state.layout = layout;
  context.renderTree(sampleTree);
  assert.match(context.treeCanvas.innerHTML, /사람/, "Every tree layout must use the selected card language");
  assert.match(context.treeCanvas.innerHTML, /data-species-id="homo-sapiens"/, "Translated names must preserve species IDs");
}
detailContext.cardText = languageContext.cardText;
detailState.failed = true;
detailContext.openSpeciesCard(ctenophoreId);
assert.equal(detailElement("#species-view-name").textContent, korean[ctenophoreId].commonName);
assert.equal(detailElement("#species-view-description").textContent, korean[ctenophoreId].description);
languageContext.setCardLanguage("en");
assert.equal(languageContext.cardText(speciesById.get(humanId)).commonName, "Human");
for (const animal of dataset.animals) {
  assert.equal(languageContext.cardText(animal).description, korean[animal.id].descriptionEn, `English card must use the edited description: ${animal.id}`);
  assert.equal(languageContext.cardText(animal).scientificName, animal.scientificName);
}
assert.equal(languageContext.cardText({ description: "Original description" }).description, "Original description", "Untranslated cards must retain their original description");
languageContext.setCardLanguage("invalid");
assert.equal(languageState.cardLanguage, "en");
languageState.failed = true;
languageContext.setCardLanguage("ko");
assert.equal(languageCalls.at(-2).answer, true, "Language switching after failure must preserve the answer highlight");
assert.equal(languageState.classified.length, 3, "Switching language must not collect the revealed answer");
console.log("Validated Korean/English switching without changing scientific names or game state.");
