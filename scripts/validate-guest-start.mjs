import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const elements = new Map();
const $ = (selector) => {
  if (!elements.has(selector)) elements.set(selector, {
    hidden: true, open: false, returnValue: "", listeners: {}, classList: { remove() {} },
    setAttribute() {}, focus() {}, addEventListener(type, handler) { this.listeners[type] = handler; },
    showModal() { this.open = true; this.shown = (this.shown || 0) + 1; },
    close(value = "") { this.open = false; this.returnValue = value; this.listeners.close({ target: this }); },
  });
  return elements.get(selector);
};
const context = {
  $, dataset: {}, currentUser: null, currentGamesPlayed: 1, gameStarting: false,
  guestStartOptions: null, localStorage: { getItem: () => "1" }, state: {},
  animals: [{ id: "animal" }], HUMAN_ID: "human", speciesById: new Map(),
  shuffle: (ids) => ids, preloadImage: async () => {}, buildTree() {},
  card: $("card"), lobbyPages: {}, navigationShell: $("navigation"), game: $("game"),
  setToolbarOpen() {}, renderTree() {}, resetTreeView() {}, updateRound() {},
  window: { scrollTo() {} }, document: { activeElement: $("#start-game") },
  openAccountModal() { context.logins++; }, logins: 0, console,
  showToast(message) { assert.fail(message); },
};
runInNewContext(source.slice(source.indexOf("async function startGame("), source.indexOf("async function returnToLobby(")), context);
runInNewContext(source.slice(source.indexOf('$("#start-game").addEventListener'), source.indexOf('$("#start-practice").addEventListener')), context);
const dialog = $("#guest-start-dialog");
for (const options of [{}, { practice: true }, { tutorial: true }, { skipTutorial: true }]) {
  context.game.hidden = true;
  await context.startGame(options);
  assert.equal(dialog.open, true);
  assert.equal(context.game.hidden, true, "Starting must wait for the guest's choice");
  const shown = dialog.shown;
  await context.startGame({ practice: !options.practice });
  assert.equal(dialog.shown, shown, "Repeated taps must retain the first selected mode");
  dialog.close("play");
  await new Promise(setImmediate);
  assert.equal(context.game.hidden, false);
  assert.equal(context.state.practice, options.practice === true);
  assert.equal(context.state.tutorial, options.tutorial === true);
  assert.equal(context.guestStartOptions, null);
}
context.game.hidden = true;
await context.startGame();
dialog.close("login");
assert.equal(context.logins, 1);
assert.equal(context.game.hidden, true);
await context.startGame();
dialog.close();
assert.equal(context.game.hidden, true, "Escape must dismiss without starting");
assert.equal(context.guestStartOptions, null);
context.currentUser = { id: "signed-in" };
const shown = dialog.shown;
await context.startGame();
assert.equal(dialog.shown, shown, "Signed-in users must start without a warning");
assert.equal(context.game.hidden, false);
console.log("Guest start: warning, mode preservation, repeated taps, play, login, dismissal and signed-in bypass passed.");
