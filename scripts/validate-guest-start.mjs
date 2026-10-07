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
  difficultyStartOptions: null, difficultyNames: { easy: "쉬움", medium: "보통", hard: "어려움" },
  createDifficultyQueue: () => ["animal"],
  achievementStats: {},
  animals: [{ id: "animal" }], HUMAN_ID: "human", speciesById: new Map(),
  shuffle: (ids) => ids, preloadImage: async () => {}, buildTree() {},
  card: $("card"), lobbyPages: {}, navigationShell: $("navigation"), game: $("game"),
  setToolbarOpen() {}, renderTree() {}, resetTreeView() {}, updateRound() {},
  recordAchievementEvent(event) { context.achievementEvents.push(event); }, achievementEvents: [],
  window: { scrollTo() {} }, document: { activeElement: $("#start-game"), querySelectorAll: () => ["easy", "medium", "hard"].map((difficulty) => { const button = $(`#choose-${difficulty}`); button.dataset = { difficulty }; return button; }) },
  openAccountModal() { context.logins++; }, logins: 0, console,
  showToast(message) { assert.fail(message); },
};
runInNewContext(source.slice(source.indexOf("async function startGame("), source.indexOf("async function returnToLobby(")), context);
runInNewContext(source.slice(source.indexOf('$("#start-game").addEventListener'), source.indexOf('$("#start-practice").addEventListener')), context);
const difficultyListeners = source.indexOf('document.querySelectorAll("[data-difficulty]")');
runInNewContext(source.slice(difficultyListeners, source.indexOf('document.querySelectorAll("[data-card-language]")', difficultyListeners)), context);
const dialog = $("#guest-start-dialog");
for (const options of [{ difficulty: "easy" }, { practice: true }, { tutorial: true }, { skipTutorial: true, difficulty: "medium" }]) {
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
assert.equal($("#difficulty-dialog").open, true, "Normal start must first choose difficulty");
assert.equal(dialog.open, false);
await context.startGame({ practice: true });
assert.equal(dialog.open, false, "Repeated taps must not open a second dialog");
$("#choose-easy").listeners.click();
await new Promise(setImmediate);
assert.equal(dialog.open, true);
dialog.close("login");
assert.equal(context.logins, 1);
assert.equal(context.game.hidden, true);
await context.startGame({ difficulty: "medium" });
dialog.close();
assert.equal(context.game.hidden, true, "Escape must dismiss without starting");
assert.equal(context.guestStartOptions, null);
context.currentUser = { id: "signed-in" };
const shown = dialog.shown;
await context.startGame();
assert.equal($("#difficulty-dialog").open, true);
assert.equal($("#death-difficulty-status").textContent, "어려움 완주 후 해금");
$("#choose-medium").listeners.click();
await new Promise(setImmediate);
assert.equal(dialog.shown, shown, "Signed-in users must start without a warning");
assert.equal(context.game.hidden, false);
assert.equal(context.state.difficulty, "medium");
assert.equal(context.achievementEvents.at(-1), "normal-start");
const eventCount = context.achievementEvents.length;
await context.startGame({ tutorial: true });
assert.equal(context.achievementEvents.length, eventCount, "Tutorial starts must not count as normal attempts");
await context.startGame({ practice: true });
assert.equal(context.achievementEvents.at(-1), "practice-start");
assert.equal(context.state.difficulty, "hard", "Practice must keep the full dataset");
context.achievementStats.hardCompleted = true;
await context.startGame();
assert.equal($("#death-difficulty-status").textContent, "해금됨 · 준비 중");
$("#close-difficulty").listeners.click();
assert.equal(context.difficultyStartOptions, null);
assert.equal($("#difficulty-dialog").open, false);
console.log("Start: difficulty selection/cancellation, guest warning, mode preservation, repeat taps, account bypass and death unlock passed.");
