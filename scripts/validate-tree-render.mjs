import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

await import(new URL("../public/game-logic.js", import.meta.url));
const { ANIMALIA_ID, buildTree } = globalThis.GalraeLogic;
const dataset = JSON.parse(readFileSync(new URL("../data/animals.json", import.meta.url), "utf8"));
const speciesById = new Map(dataset.animals.map((animal) => [animal.id, animal]));
const appSource = readFileSync(new URL("../public/tree-view.js", import.meta.url), "utf8");
const start = appSource.indexOf("function renderNode(");
const end = appSource.indexOf("function renderPreview(");
assert.ok(start >= 0 && end > start, "Tree rendering functions are missing");

const context = {
  ANIMALIA_ID,
  escapeHtml: (value) => String(value),
  speciesById,
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
  const roots = [...markup.matchAll(/class="root-wrap-target(?: is-long)?"/g)];
  const edges = [...markup.matchAll(/class="edge-target"[^>]*data-target="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(roots.length, 1, "Exactly one Animalia trunk target must remain visible");
  if (tree.children.length === 1) {
    assert.match(markup, /class="root-wrap-target is-long"/, "The single trunk must cover the full incoming branch");
    assert.ok(!edges.includes(tree.children[0].id), "The sole child must not add a duplicate trunk target");
  } else {
    assert.doesNotMatch(markup, /class="root-wrap-target is-long"/, "The trunk must end at the first split");
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
assert.match(context.treeCanvas.innerHTML, /data-target="Q729" data-placement="top"/, "Circular layout must preserve the Animalia trunk target");
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
let radialLeaves = 0;
function inspectRadial(entry) {
  assert.ok(Number.isFinite(entry.x) && Number.isFinite(entry.y), "Every circular node needs finite coordinates");
  if (entry.node.type === "leaf") radialLeaves += 1;
  entry.children.forEach(inspectRadial);
}
inspectRadial(radial.root);
assert.equal(radialLeaves, dataset.speciesCount, "Circular layout must position every sampled species");

const cameraStart = appSource.indexOf("function updateCamera(");
const cameraEnd = appSource.indexOf("  return { clearPreview", cameraStart);
assert.ok(cameraStart >= 0 && cameraEnd > cameraStart, "Tree camera functions are missing");
const zoomStatus = { textContent: "" };
const cameraStyles = new Map();
const cameraState = { zoom: 1, panX: 20, panY: -10, layout: "top" };
const cameraContext = {
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
cameraContext.treeCanvas.querySelector = (selector) => selector === ".radial-tree"
  ? { dataset: { size: "1000" } }
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
  if (!detailElements.has(selector)) detailElements.set(selector, { hidden: true, focus() {} });
  return detailElements.get(selector);
};
const detailState = { classified: [humanId], currentId: ctenophoreId, failed: false };
const detailContext = {
  state: detailState, speciesById, HUMAN_ID: humanId, $: detailElement,
  shortDescription: (text) => text, escapeHtml: (text) => String(text),
  taxonomyLabels: (animal) => animal.taxonomy.lineage.map((taxon) => taxon.scientificName),
  getSuccessCounts: () => ({}), successCountText: () => "분류 성공 0회", imageCreditText: () => "credit",
};
vm.runInNewContext(detailSource, detailContext);
detailContext.openSpeciesCard(ctenophoreId);
assert.equal(detailElement("#species-modal").hidden, true, "An unrevealed card must not open during play");
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
