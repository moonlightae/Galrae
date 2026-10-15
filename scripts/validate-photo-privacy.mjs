import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { createPhotoPrivacy } from "../public/photo-privacy.js";

const { animals } = JSON.parse(readFileSync(new URL("../data/animals.json", import.meta.url)));
const values = new Map();
const storage = { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value) };
function element() {
  const classes = new Set();
  return { dataset: {}, events: {}, attributes: {}, hidden: false,
    classList: { add: (name) => classes.add(name), toggle: (name, on) => on ? classes.add(name) : classes.delete(name), contains: (name) => classes.has(name) },
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(name, callback) { this.events[name] = callback; },
    append(child) { this.button = child; }, querySelector() { return this.button; },
    focus() { this.focused = true; },
  };
}
const images = [];
const root = { createElement: element, querySelectorAll: () => images.filter((image) => "insectPhoto" in image.dataset) };
const privacy = createPhotoPrivacy({ root, storage });
function photo(animal) {
  const image = { ...element(), alt: animal.commonName, parentElement: element() };
  images.push(image);
  privacy.prepare(image, animal);
  return image;
}
const insect = animals.find((animal) => animal.id === "periplaneta-americana");
const cockroach = photo(insect);
assert.equal(privacy.enabled, false);
assert.equal(cockroach.parentElement.button, undefined, "Default settings must retain normal photos");
privacy.setEnabled(true);
assert.equal(createPhotoPrivacy({ root, storage }).enabled, true, "The browser preference must survive reload");
assert.ok(cockroach.parentElement.classList.contains("is-photo-covered"));
for (const animal of animals) {
  const image = photo(animal);
  assert.equal(image.parentElement.classList.contains("is-photo-covered"), animal.taxonomy.lineage.some((taxon) => taxon.scientificName === "Insecta"), animal.id);
}
const button = cockroach.parentElement.button;
let prevented = false, stopped = false;
const event = { preventDefault() { prevented = true; }, stopPropagation() { stopped = true; } };
button.events.click(event);
assert.ok(prevented && stopped, "Revealing a photo must not select or place a card");
assert.equal(button.hidden, true);
assert.equal(cockroach.parentElement.classList.contains("is-photo-covered"), false);
assert.ok(cockroach.parentElement.focused, "Focus must remain usable even while a photo is loading");
privacy.prepare(cockroach, insect);
assert.equal(button.hidden, false, "Reopening a photo must cover it again");
assert.equal(cockroach.parentElement.button, button, "Reused photos must not accumulate cover buttons");
stopped = false;
button.events.keydown({ ...event, key: "Enter" });
assert.ok(stopped, "Keyboard reveal must not activate the card");
prevented = stopped = false;
button.events.dragstart(event);
assert.ok(prevented && stopped, "Dragging the cover must not start card placement");
privacy.prepare(cockroach, animals.find((animal) => animal.id === "homo-sapiens"));
assert.equal(button.hidden, true, "Reusing an image for a non-insect must clear its cover");
privacy.setEnabled(false);
assert.ok(images.every((image) => !image.parentElement.classList.contains("is-photo-covered")));
assert.equal(createPhotoPrivacy({ root, storage }).enabled, false);
const unavailable = createPhotoPrivacy({ root, storage: { getItem() { throw Error("blocked"); }, setItem() { throw Error("blocked"); } } });
unavailable.setEnabled(true);
assert.equal(unavailable.enabled, true, "Storage errors must not prevent using the setting");
const source = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const settings = new Map();
const $ = (selector) => {
  if (!settings.has(selector)) settings.set(selector, { ...element(), showModal() { this.open = true; }, close() { this.open = false; this.events.close(); } });
  return settings.get(selector);
};
const toolbarHandle = element();
let toolbarOpen = true;
runInNewContext(source.slice(source.indexOf('$("#hide-insect-photos").checked'), source.indexOf('$("#start-game").addEventListener')), {
  $, photoPrivacy: privacy, toolbarHandle, setToolbarOpen: (value) => { toolbarOpen = value; },
});
assert.equal($("#hide-insect-photos").checked, false);
$("#open-settings").events.click();
assert.equal(toolbarOpen, false);
assert.equal($("#settings-dialog").open, true);
$("#hide-insect-photos").events.change({ target: { checked: true } });
assert.equal(privacy.enabled, true);
$("#close-settings").events.click();
assert.equal($("#settings-dialog").open, false);
assert.ok(toolbarHandle.focused);
console.log(`Photo privacy: ${animals.length} species, persistence, reuse, keyboard, event isolation and storage errors passed.`);
