import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

await import(new URL("../public/game-logic.js", import.meta.url));
const { ANIMALIA_ID, buildTree } = globalThis.GalraeLogic;
const dataset = JSON.parse(readFileSync(new URL("../data/animals.json", import.meta.url), "utf8"));
const speciesById = new Map(dataset.animals.map((animal) => [animal.id, animal]));
const appSource = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const start = appSource.indexOf("function renderNode(");
const end = appSource.indexOf("function renderPreview(");
assert.ok(start >= 0 && end > start, "Tree rendering functions are missing");

const context = {
  ANIMALIA_ID,
  escapeHtml: (value) => String(value),
  speciesById,
  state: { newest: null, failed: false },
  treeCanvas: { innerHTML: "" },
  updateCamera: () => {},
};
vm.runInNewContext(appSource.slice(start, end), context);

function inspect(classifiedIds) {
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
console.log("Validated top-trunk rendering for Human, one inner branch, Ctenophora, and Placozoa.");
