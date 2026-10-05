import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const functions = source.slice(source.indexOf("function setToolbarOpen("), source.indexOf('$("#toolbar-edge").addEventListener'));
function element() {
  return {
    hidden: false, inert: false, attributes: {}, focused: false,
    setAttribute(key, value) { this.attributes[key] = value; },
    removeAttribute(key) { delete this.attributes[key]; },
    focus() { this.focused = true; }, querySelector() { return null; },
    classList: { toggle() {} },
  };
}
const lobbyPages = Object.fromEntries(["lobby", "leaderboard", "collection", "tasks", "account"].map((name) => [name, element()]));
const buttons = Object.keys(lobbyPages).map((page) => Object.assign(element(), { dataset: { page } }));
const toolbar = Object.assign(element(), { querySelectorAll: () => buttons });
const toolbarHandle = element();
const navigationShell = element();
const game = element();
const overlays = {};
const location = { hash: "#collection" };
let writes = 0;
const context = {
  lobbyPages, toolbar, toolbarHandle, navigationShell, game, location,
  $: (selector) => overlays[selector] ||= element(),
  history: { pushState(_, __, hash) { location.hash = hash; writes++; } },
  window: { scrollTo() {} },
  openAccountModal() { lobbyPages.account.focus(); },
};
const { showLobbyPage, restoreLobbyPage, setToolbarOpen } = runInNewContext(`${functions}\n({ showLobbyPage, restoreLobbyPage, setToolbarOpen })`, context);
restoreLobbyPage();
assert.equal(lobbyPages.collection.hidden, false);
assert.equal(lobbyPages.lobby.hidden, true);
assert.equal(writes, 0, "Restoring a URL must not create a history entry");
for (const page of Object.keys(lobbyPages)) {
  showLobbyPage(page);
  assert.deepEqual(Object.keys(lobbyPages).filter((name) => !lobbyPages[name].hidden), [page]);
  assert.equal(game.hidden, true);
  assert.equal(navigationShell.hidden, false);
  assert.equal(location.hash, `#${page}`);
  assert.equal(buttons.find((button) => button.dataset.page === page).attributes["aria-current"], "page");
}
for (const invalid of ["", "unknown", "__proto__", "toString"]) {
  showLobbyPage(invalid);
  assert.equal(lobbyPages.lobby.hidden, false, "Unknown routes must fall back safely");
}
assert.ok(Object.values(overlays).every((overlay) => overlay.hidden), "History navigation must dismiss game overlays");
setToolbarOpen(true);
assert.equal(toolbar.inert, false);
assert.equal(toolbarHandle.attributes["aria-expanded"], "true");
setToolbarOpen(false, true);
assert.equal(toolbar.inert, true);
assert.equal(toolbarHandle.focused, true);
location.hash = "#account";
restoreLobbyPage();
assert.equal(lobbyPages.account.focused, true);
console.log("Lobby navigation: direct URLs, history, isolated screens, fallback and toolbar focus passed.");
