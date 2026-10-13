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
const lobbyPages = Object.fromEntries(["lobby", "leaderboard", "collection", "tasks", "taxonomy-notes", "account"].map((name) => [name, element()]));
const markup = readFileSync(new URL("../app/game-markup.ts", import.meta.url), "utf8");
assert.match(markup, /id="taxonomy-notes-page" class="screen library-screen" data-lobby-page hidden/);
assert.match(markup, /data-page="taxonomy-notes">분류 기준 안내/);
const notes = markup.slice(markup.indexOf('id="taxonomy-notes-page"'), markup.indexOf('id="game"'));
assert.ok(notes.includes("상자해파리·해파리·히드라충") && notes.includes("https://doi.org/10.1186/s12862-018-1142-0"), "Medusozoan note must cite the adopted phylogenomic relationship");
assert.ok(notes.includes("연체동물의 내부 분기") && notes.includes("https://doi.org/10.1126/science.ads0215"), "Mollusc note must cite the adopted genome-based phylogeny");
assert.ok(notes.includes("보대동물군과 후구동물") && notes.includes("https://www.nature.com/articles/nature16150"), "Ambulacraria note must explain the adopted grouping with a research source");
for (const topic of ["유조·절지·완보동물", "다모류와 환대류", "나선동물의 깊은 분기", "난이도에 사용하는 계급", "검토에서 보완한 공통 갈래"]) assert.ok(notes.includes(topic), `Missing published classification note: ${topic}`);
assert.ok(notes.includes("https://academic.oup.com/gbe/article/17/1/evae273/7931680") && notes.includes("https://www.mdpi.com/2073-4425/17/4/372"), "Adopted phylogeny must include both research sources");
assert.match(source, /"taxonomy-notes": \$\("#taxonomy-notes-page"\)/);
assert.doesNotMatch(source + markup, /taxonomy-notes-modal|closeTaxonomyNotes|close-taxonomy-notes/);
const buttons = Object.keys(lobbyPages).map((page) => Object.assign(element(), { dataset: { page } }));
const toolbar = Object.assign(element(), { querySelectorAll: () => buttons });
const toolbarHandle = element();
const navigationShell = element();
const game = element();
const overlays = {};
const guestDialog = { open: true, close() { this.open = false; } };
const difficultyDialog = { open: true, close() { this.open = false; } };
const location = { hash: "#collection" };
let writes = 0;
const context = {
  lobbyPages, toolbar, toolbarHandle, navigationShell, game, location,
  $: (selector) => selector === "#guest-start-dialog" ? guestDialog : selector === "#difficulty-dialog" ? difficultyDialog : overlays[selector] ||= element(),
  history: { pushState(_, __, hash) { location.hash = hash; writes++; } },
  window: { scrollTo() {} },
  openAccountModal() { lobbyPages.account.focus(); },
  loadAchievements() {},
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
assert.equal(guestDialog.open, false, "History navigation must dismiss the guest warning");
assert.equal(difficultyDialog.open, false, "History navigation must dismiss difficulty selection");
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
