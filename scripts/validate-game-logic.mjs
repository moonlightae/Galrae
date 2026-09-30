import assert from "node:assert/strict";
import fs from "node:fs";
import { curateTaxonomy } from "./taxonomy-curation.mjs";

await import(new URL("../public/game-logic.js", import.meta.url));
const { ANIMALIA_ID, addSuccessCount, buildTree, collectLeafIds, findNodeById, getExpectedPlacement, isEquivalentPlacement, seedSuccessCounts, shuffle, successCountText } = globalThis.GalraeLogic;
const dataset = JSON.parse(fs.readFileSync(new URL("../data/animals.json", import.meta.url), "utf8"));
const appSource = fs.readFileSync(new URL("../public/tree-view.js", import.meta.url), "utf8");
const speciesById = new Map(dataset.animals.map((animal) => [animal.id, animal]));
assert.deepEqual(curateTaxonomy(dataset.animals), dataset.animals, "Curated taxonomy must be stable on a second pass");
const lineageIds = (id) => speciesById.get(id).taxonomy.lineage.map((taxon) => taxon.wikidataId);
const humanId = "homo-sapiens";
const classified = [humanId];
let joinCount = 0;
let wrapCount = 0;

for (const animal of dataset.animals.filter((entry) => entry.id !== humanId)) {
  const expected = getExpectedPlacement(classified, animal.id, speciesById);
  const before = buildTree(classified, speciesById);
  assert.ok(findNodeById(before, expected.targetId), `Missing target ${expected.targetId} for ${animal.id}`);
  if (expected.placement === "join") joinCount += 1;
  if (expected.placement === "wrap") wrapCount += 1;
  classified.push(animal.id);
  const after = buildTree(classified, speciesById);
  assert.equal(collectLeafIds(after).length, classified.length, `Leaf count mismatch after ${animal.id}`);
}

assert.equal(classified.length, dataset.speciesCount);
assert.ok(joinCount > 0, "Dataset sequence never exercised join placement");
assert.ok(wrapCount > 0, "Dataset sequence never exercised wrap placement");

const acoelId = "symsagittifera-roscoffensis";
const xenoturbellaId = "xenoturbella-bocki";
const tapewormId = "echinococcus-granulosus";
assert.ok(lineageIds(acoelId).includes("Q3570860"), "Symsagittifera must be Xenacoelomorpha");
assert.ok(lineageIds(xenoturbellaId).includes("Q3570860"), "Xenoturbella must be Xenacoelomorpha");
assert.ok(lineageIds(tapewormId).includes("Q124900"), "Echinococcus must be Platyhelminthes");
for (const id of [acoelId, xenoturbellaId]) {
  assert.ok(!lineageIds(id).includes("Q3059449"), `${id} must not be nested inside Nephrozoa`);
  assert.ok(!lineageIds(id).includes("Q150866"), `${id} must not be nested inside Deuterostomia`);
}
const flatwormTree = buildTree([acoelId, xenoturbellaId, tapewormId], speciesById);
const xenacoelBranch = findNodeById(flatwormTree, "Q135873465");
assert.ok(xenacoelBranch, "Both xenacoelomorphs must share a branch");
assert.deepEqual(new Set(collectLeafIds(xenacoelBranch)), new Set([acoelId, xenoturbellaId]));
assert.ok(!collectLeafIds(xenacoelBranch).includes(tapewormId));

const theropodIds = dataset.animals.filter((animal) => lineageIds(animal.id).includes("Q188438")).map((animal) => animal.id);
assert.ok(theropodIds.length > 1, "Theropoda grouping needs multiple sampled species");
assert.ok(theropodIds.every((id) => !lineageIds(id).includes("Q2013709")), "Eusaurischia must not split sampled theropods");
assert.deepEqual(new Set(collectLeafIds(buildTree(theropodIds, speciesById))), new Set(theropodIds));
assert.deepEqual(lineageIds("rhincodon-typus").filter((id) => ["Q150760", "Q7372", "Q47969"].includes(id)),
  ["Q150760", "Q7372", "Q47969"], "Whale shark must share the shark backbone");
for (const [speciesId, taxonId] of [
  ["carcinus-maenas", "Q2190587"],
  ["mobula-birostris", "Q796580"],
  ["paracentrotus-lividus", "Q7136623"],
  ["dugesia-japonica", "Q3030805"],
]) {
  assert.ok(lineageIds(speciesId).includes(taxonId), `${speciesId} must have its curated taxon`);
}

for (let seed = 1; seed <= 5; seed += 1) {
  let value = seed;
  const random = () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 0x100000000;
  };
  const randomOrder = shuffle(dataset.animals.filter((animal) => animal.id !== humanId), random);
  const placed = [humanId];
  for (const animal of randomOrder) {
    const tree = buildTree(placed, speciesById);
    const expected = getExpectedPlacement(placed, animal.id, speciesById);
    assert.ok(findNodeById(tree, expected.targetId), `Missing ${animal.id} target in random order ${seed}`);
    assert.ok(isEquivalentPlacement(tree, expected, expected.targetId, expected.placement),
      `Expected placement rejected for ${animal.id} in random order ${seed}`);
    placed.push(animal.id);
  }
  assert.equal(placed.length, dataset.speciesCount);
}

const ctenophoreId = "bolinopsis-infundibulum";
const spongeId = "amphimedon-queenslandica";
const cnidarianId = "aurelia-aurita";
const earlyAnimalTree = buildTree([ctenophoreId, spongeId, cnidarianId, humanId], speciesById);
assert.equal(earlyAnimalTree.id, "Q729", "Animalia root must remain available as a placement target");
assert.equal(earlyAnimalTree.children.length, 2, "Ctenophora must split before the remaining sampled animals");
const ctenophoreBranch = earlyAnimalTree.children.find((node) => collectLeafIds(node).includes(ctenophoreId));
const remainingBranch = earlyAnimalTree.children.find((node) => !collectLeafIds(node).includes(ctenophoreId));
assert.deepEqual(collectLeafIds(ctenophoreBranch), [ctenophoreId]);
assert.ok(remainingBranch, "Porifera and Planulozoa branch is missing");
assert.equal(remainingBranch.children.length, 2, "Porifera must split before Cnidaria and Bilateria");
const planulozoa = remainingBranch.children.find((node) => collectLeafIds(node).includes(cnidarianId));
assert.deepEqual(new Set(collectLeafIds(planulozoa)), new Set([cnidarianId, humanId]));

const planulozoaTree = buildTree([cnidarianId, humanId], speciesById);
const spongePlacement = getExpectedPlacement([cnidarianId, humanId], spongeId, speciesById);
assert.equal(spongePlacement.placement, "wrap");
assert.notEqual(spongePlacement.targetId, ANIMALIA_ID);
assert.ok(
  isEquivalentPlacement(planulozoaTree, spongePlacement, ANIMALIA_ID, "top"),
  "The Animalia trunk must accept a placement that wraps the complete sampled tree",
);

const placozoanId = "hoilungia-hongkongensis";
const humanOnlyTree = buildTree([humanId], speciesById);
const placozoanPlacement = getExpectedPlacement([humanId], placozoanId, speciesById);
assert.deepEqual(
  placozoanPlacement,
  { targetId: ANIMALIA_ID, placement: "join", ancestorId: ANIMALIA_ID },
  "Placozoa must join the sampled Animalia root",
);
assert.ok(
  isEquivalentPlacement(humanOnlyTree, placozoanPlacement, ANIMALIA_ID, "top"),
  "The Animalia trunk must accept Placozoa",
);

const ctenophorePlacement = getExpectedPlacement([humanId], ctenophoreId, speciesById);
assert.ok(
  isEquivalentPlacement(humanOnlyTree, ctenophorePlacement, ANIMALIA_ID, "top"),
  "The Animalia trunk must accept Ctenophora",
);
assert.ok(
  isEquivalentPlacement(humanOnlyTree, placozoanPlacement, humanId, "wrap"),
  "The Human card must accept Placozoa when Human is the only classified species",
);
assert.ok(
  isEquivalentPlacement(humanOnlyTree, ctenophorePlacement, humanId, "wrap"),
  "The Human card must accept Ctenophora when Human is the only classified species",
);

for (const [first, next] of [[placozoanId, ctenophoreId], [ctenophoreId, placozoanId]]) {
  const classifiedPair = [humanId, first];
  const pairTree = buildTree(classifiedPair, speciesById);
  const nextPlacement = getExpectedPlacement(classifiedPair, next, speciesById);
  assert.ok(
    isEquivalentPlacement(pairTree, nextPlacement, ANIMALIA_ID, "top"),
    `The Animalia trunk must remain usable after ${first}`,
  );
  assert.equal(
    isEquivalentPlacement(pairTree, nextPlacement, humanId, "wrap"),
    false,
    "A species card must stop representing the whole tree after the first branch",
  );
}

const bothBasalIds = [humanId, placozoanId, ctenophoreId];
const bothBasalTree = buildTree(bothBasalIds, speciesById);
const laterPlacement = getExpectedPlacement(bothBasalIds, cnidarianId, speciesById);
assert.equal(
  isEquivalentPlacement(bothBasalTree, laterPlacement, ANIMALIA_ID, "top"),
  false,
  "The always-available top trunk must not become an automatic correct answer",
);

assert.match(appSource, /data-species-id="\$\{escapeHtml\(node\.id\)\}" data-target=/, "Every species card must remain a drop target");

const planulozoaNode = findNodeById(earlyAnimalTree, "canonical:planulozoa");
const cnidarianPlacement = { targetId: planulozoaNode.id, placement: "join", ancestorId: planulozoaNode.id };
assert.equal(
  isEquivalentPlacement(earlyAnimalTree, cnidarianPlacement, planulozoaNode.id, "wrap"),
  false,
  "Join and wrap must remain distinct inside a multi-level tree",
);
assert.match(appSource, /data-target="\$\{ANIMALIA_ID\}" data-placement="top"/, "The top-level target must be the Animalia trunk");
assert.doesNotMatch(appSource, /<button class="tree-root"/, "The Animalia label must not be a duplicate drop target");

const legacyCounts = seedSuccessCounts([humanId, ctenophoreId], humanId);
assert.equal(successCountText(legacyCounts[humanId]), "분류 성공 0회", "Human is a starting card, not a successful placement");
assert.equal(successCountText(legacyCounts[ctenophoreId]), "분류 성공 1회 이상", "Previously collected species have a known lower bound");
assert.equal(successCountText(addSuccessCount(legacyCounts, ctenophoreId)[ctenophoreId]), "분류 성공 2회 이상");
const firstSuccess = addSuccessCount({}, placozoanId);
const secondSuccess = addSuccessCount(firstSuccess, placozoanId);
assert.equal(successCountText(firstSuccess[placozoanId]), "분류 성공 1회");
assert.equal(successCountText(secondSuccess[placozoanId]), "분류 성공 2회");
assert.equal(successCountText(secondSuccess[humanId]), "분류 성공 0회", "Other species counts must not change");
console.log(`Validated ${classified.length} species: ${wrapCount} wrap placements, ${joinCount} join placements.`);
