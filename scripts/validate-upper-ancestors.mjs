import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { upperAncestors } from "../public/upper-ancestors.js";
import { ancestorNotes } from "../public/class-ancestors.js";
await import("../public/game-logic.js");

const { animals } = JSON.parse(readFileSync(new URL("../public/data/animals.json", import.meta.url)));
const tagged = await import("../public/class-ancestors.js?v=cache-regression");
const taggedUpper = await import("../public/upper-ancestors.js?v=cache-regression");
assert.equal(tagged.ancestorNotes.Q729.ko, taggedUpper.upperAncestors.Q729.ko, "A release tag must propagate to the nested upper-ancestor module");
const speciesById = new Map(animals.map((animal) => [animal.id, animal]));
const tree = globalThis.GalraeLogic.buildTree(animals.map((animal) => animal.id), speciesById, null, true);
const higherRanks = new Set(["kingdom", "subkingdom", "infrakingdom", "superphylum", "phylum", "subphylum", "infraphylum", "megaclass", "superclass", "clade"]);
const expected = new Set();
function visit(node, aboveClass = true) {
  if (node.type === "leaf") return;
  if (aboveClass && node.children.length > 1 && (!node.rank || higherRanks.has(node.rank))) expected.add(node.id);
  node.children.forEach((child) => visit(child, aboveClass && node.rank !== "class"));
}
visit(tree);
assert.equal(expected.size, 50);
assert.deepEqual(new Set(Object.keys(upperAncestors)), expected, "Every actual above-class branch needs an explanation, without adding below-class or unary branches");
assert.ok(Object.keys(ancestorNotes).length >= 143);
for (const [id, note] of Object.entries(upperAncestors)) {
  assert.equal(ancestorNotes[id].ko, note.ko);
  assert.ok(ancestorNotes[id].sources.length >= note.sources.length);
  assert.ok(note.name && note.koName && note.rank && note.review && note.reviewEn);
  assert.equal(note.ko.length, 2);
  assert.equal(note.en.length, 2);
  assert.ok(note.ko.every((text) => /[가-힣]/.test(text) && text.length > 35));
  assert.ok(note.en.every((text) => /[a-z]/i.test(text) && !/[가-힣]/.test(text) && text.length > 60));
  assert.ok(note.sources.length && note.sources.every(([title, url]) => title && new URL(url).protocol === "https:"));
}
for (const id of ["Q729", "Q1360", "Q10915", "Q44631", "canonical:planulozoa", "canonical:euteleostomi"]) assert.ok(expected.has(id));
assert.ok(!expected.has("Q7377"), "Within-mammal explanations are outside this request");
console.log(`All 50 above-class branch points have bilingual, sourced explanations; total notes: ${Object.keys(ancestorNotes).length}.`);
