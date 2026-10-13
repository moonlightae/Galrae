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
// Independently reviewed triples: the first two must share a branch that
// excludes the third. Exercise every arrival order, including the old false join.
const reviewedTriples = [
  ["tridacna-gigas", "cornu-aspersum", "hapalochlaena-lunulata"],
  ["mytilus-edulis", "haliotis-rufescens", "nautilus-pompilius"],
  ["asterias-rubens", "balanoglossus-gigas", "homo-sapiens"],
  ["antedon-mediterranea", "balanoglossus-gigas", "branchiostoma-lanceolatum"],
  ["neoceratodus-forsteri", "homo-sapiens", "latimeria-chalumnae"],
  ["macropus-giganteus", "homo-sapiens", "ornithorhynchus-anatinus"],
  ["loxodonta-africana", "trichechus-manatus", "dasypus-novemcinctus"],
  ["scolopendra-gigantea", "aedes-aegypti", "limulus-polyphemus"],
  ["euperipatoides-kanangrensis", "aedes-aegypti", "priapulus-caudatus"],
  ["euperipatoides-kanangrensis", "formica-rufa", "macrobiotus-shonaicus"],
  ["euperipatoides-kanangrensis", "limulus-polyphemus", "macrobiotus-shonaicus"],
  ["macrobiotus-shonaicus", "aedes-aegypti", "caenorhabditis-elegans"],
  ["lumbricus-terrestris", "cornu-aspersum", "brachionus-plicatilis"],
  ["dugesia-japonica", "cornu-aspersum", "brachionus-plicatilis"],
  ["harmonia-axyridis", "drosophila-melanogaster", "apis-mellifera"],
  ["drosophila-melanogaster", "bombyx-mori", "harmonia-axyridis"],
  ["asterias-rubens", "holothuria-edulis", "antedon-mediterranea"],
  ["bufo-bufo", "dendrobates-tinctorius", "rana-temporaria"],
  ["ascaris-lumbricoides", "caenorhabditis-elegans", "trichinella-spiralis"],
  ["pterois-volitans", "mola-mola", "thunnus-thynnus"],
  ["riftia-pachyptila", "lumbricus-terrestris", "platynereis-dumerilii"],
];
for (const [left, right, outside] of reviewedTriples) {
  for (const order of [[left, right, outside], [left, outside, right], [right, left, outside], [right, outside, left], [outside, left, right], [outside, right, left]]) {
    const tree = buildTree(order, speciesById);
    const hasPair = (node) => {
      const leaves = collectLeafIds(node);
      return (leaves.length === 2 && leaves.includes(left) && leaves.includes(right)) || (node.children?.some(hasPair) ?? false);
    };
    assert.ok(hasPair(tree), `Wrong split for ${order}`);
    const before = buildTree(order.slice(0, 2), speciesById);
    const expected = getExpectedPlacement(order.slice(0, 2), order[2], speciesById);
    assert.equal(expected.placement, "wrap", `False common-ancestor join for ${order}`);
    assert.ok(isEquivalentPlacement(before, expected, expected.targetId, "wrap"));
    assert.equal(isEquivalentPlacement(before, expected, before.id, "join"), false, `False root join accepted for ${order}`);
  }
}
assert.equal(lineageIds("drosophila-melanogaster").includes("Q27605"), false);
for (const animal of dataset.animals) {
  const ids = lineageIds(animal.id);
  if (ids.includes("Q1360") || ids.includes("Q5191")) {
    assert.ok(ids.includes("canonical:antennopoda"), `${animal.id}: all arthropods and onychophorans must share the reviewed ancestor`);
  }
  if (animal.taxonomy.lineage.some((taxon) => taxon.scientificName === "Tardigrada")) assert.ok(!ids.includes("canonical:antennopoda"), "Tardigrades must remain outside Arthropoda + Onychophora");
}
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

const garId = "lepisosteus-osseus";
const teleostIds = dataset.animals.filter((animal) => lineageIds(animal.id).includes("Q204861")).map((animal) => animal.id);
assert.equal(teleostIds.length, 15, "All sampled teleosts must have their infraclass, including the five repaired lineages");
assert.ok(lineageIds(garId).includes("Q846164") && !lineageIds(garId).includes("Q204861"));
const fishTree = buildTree([humanId, garId, ...teleostIds], speciesById);
const neopterygii = findNodeById(fishTree, "Q740005");
const teleostei = findNodeById(fishTree, "Q204861");
assert.equal(neopterygii.children.length, 2, "Neopterygii must separate Holostei and Teleostei");
assert.deepEqual(new Set(collectLeafIds(teleostei)), new Set(teleostIds));
assert.equal(neopterygii.children.find((node) => node.id === garId)?.type, "leaf", "The sole holostean remains a separate branch after unary compression");
for (const first of teleostIds) {
  for (const next of teleostIds.filter((id) => id !== first)) {
    for (const pair of [[garId, first], [first, garId]]) {
      const placed = [humanId, ...pair];
      const before = buildTree(placed, speciesById);
      const expected = getExpectedPlacement(placed, next, speciesById);
      assert.ok(isEquivalentPlacement(before, expected, first, "wrap"), `${next} must group with ${first} inside Teleostei`);
      assert.ok(!isEquivalentPlacement(before, expected, garId, "wrap"), `${next} must not group with the holostean gar`);
      assert.ok(!isEquivalentPlacement(before, expected, neopterygii.id, "join"), `${next} must not become a third neopterygian branch`);
    }
  }
}
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
  isEquivalentPlacement(planulozoaTree, spongePlacement, spongePlacement.targetId, "wrap"),
  "The Animalia trunk must accept a placement that wraps the complete sampled tree",
);

const placozoanId = "hoilungia-hongkongensis";
const humanOnlyTree = buildTree([humanId], speciesById);
const placozoanPlacement = getExpectedPlacement([humanId], placozoanId, speciesById);
assert.deepEqual(
  placozoanPlacement,
  { targetId: humanId, placement: "wrap", ancestorId: ANIMALIA_ID },
  "With one species, Placozoa must create the first real branch",
);
assert.ok(
  !isEquivalentPlacement(humanOnlyTree, placozoanPlacement, ANIMALIA_ID, "top"),
  "The Animalia trunk must reject a root join",
);

const ctenophorePlacement = getExpectedPlacement([humanId], ctenophoreId, speciesById);
assert.ok(
  !isEquivalentPlacement(humanOnlyTree, ctenophorePlacement, ANIMALIA_ID, "top"),
  "Ctenophora must use the root circle instead of the trunk",
);
assert.ok(
  isEquivalentPlacement(humanOnlyTree, placozoanPlacement, humanId, "wrap"),
  "The initial species uses the same wrap mechanism as any other leaf",
);
assert.ok(
  isEquivalentPlacement(humanOnlyTree, ctenophorePlacement, humanId, "wrap"),
  "Ctenophora creates the first branch using the regular species target",
);

for (const [first, next] of [[placozoanId, ctenophoreId], [ctenophoreId, placozoanId]]) {
  const classifiedPair = [humanId, first];
  const pairTree = buildTree(classifiedPair, speciesById);
  const nextPlacement = getExpectedPlacement(classifiedPair, next, speciesById);
  assert.ok(
    !isEquivalentPlacement(pairTree, nextPlacement, ANIMALIA_ID, "top"),
    `The Animalia trunk must reject joining ${next} after ${first}`,
  );
  assert.ok(isEquivalentPlacement(pairTree, nextPlacement, ANIMALIA_ID, "join"), "The root circle must accept the next basal animal");
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
assert.doesNotMatch(appSource, /root-wrap-target|singleTrunk|data-placement="top"/, "Rendering must not have a special top-level placement mechanism");
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
const clientSource = fs.readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const tutorialQueue = JSON.parse(clientSource.match(/const queue = tutorial\s*\? (\[[^\]]+\])/)[1]);
assert.equal(tutorialQueue.length, 4, "Tutorial must offer all four placement cases");
const tutorialClassified = [humanId];
for (const [index, speciesId] of tutorialQueue.entries()) {
  const tree = buildTree(tutorialClassified, speciesById);
  const expected = getExpectedPlacement(tutorialClassified, speciesId, speciesById);
  if (index === 0) {
    assert.ok(isEquivalentPlacement(tree, expected, humanId, "wrap"), "First tutorial card creates a branch around Human");
    assert.ok(!isEquivalentPlacement(tree, expected, ANIMALIA_ID, "join"), "A unary root must not act as an existing split");
    assert.ok(!isEquivalentPlacement(tree, expected, ANIMALIA_ID, "top"), "First tutorial card must reject the whole-tree pillar");
  } else {
    assert.equal(expected.placement, index === 2 ? "join" : "wrap");
    assert.equal(findNodeById(tree, expected.targetId).type, index === 1 ? "leaf" : "branch");
    if (index === 3) {
      assert.notEqual(expected.targetId, ANIMALIA_ID, "Final tutorial card must use an internal branch");
      assert.ok(tree.children.length > 1, "Final branch must have its own visible incoming edge");
      assert.ok(!isEquivalentPlacement(tree, expected, expected.targetId, "join"), "Final tutorial must distinguish the branch from its ancestor circle");
    }
  }
  tutorialClassified.push(speciesId);
}
console.log(`Validated ${classified.length} species: ${wrapCount} wrap placements, ${joinCount} join placements.`);
