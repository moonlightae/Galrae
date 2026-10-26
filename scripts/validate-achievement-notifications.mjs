import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { getUnifiedAchievements } from "../public/achievements.js";

let now = 0, nextTimer = 0;
const timers = new Map(), removed = [];
const stack = {
  children: [],
  appendChild(notice) { notice.created = now; this.children.push(notice); },
  replaceChildren() { this.children = []; },
};
const document = { createElement: () => ({
  classList: { add(name) { this.leaving = name === "is-leaving"; } },
  remove() { removed.push({ id: this.innerHTML, time: now }); stack.children = stack.children.filter((notice) => notice !== this); },
}) };
const source = readFileSync(new URL("../public/achievement-notifications.js", import.meta.url), "utf8");
const create = runInNewContext(source.replace("export function", "function") + "\ncreateAchievementNotifications", {
  document,
  setTimeout(callback, delay) { timers.set(++nextTimer, { callback, due: now + delay }); return nextTimer; },
  clearTimeout(id) { timers.delete(id); },
});
function advanceTo(time) {
  while (true) {
    const next = [...timers].sort((a, b) => a[1].due - b[1].due)[0];
    if (!next || next[1].due > time) break;
    now = next[1].due; timers.delete(next[0]); next[1].callback();
  }
  now = time;
}
const notifier = create(stack, (task) => task.id);
notifier.update([{ id: "old", earned: true }], false);
assert.equal(stack.children.length, 0, "Existing medals must seed silently");
const earned = ["old", "one", "two", "three"].map((id) => ({ id, earned: true }));
notifier.update(earned); notifier.update(earned);
assert.deepEqual(stack.children.map((notice) => notice.innerHTML), ["one"]);
advanceTo(349); assert.equal(stack.children.length, 1);
advanceTo(350); assert.deepEqual(stack.children.map((notice) => notice.innerHTML), ["one", "two"]);
advanceTo(700); assert.deepEqual(stack.children.map((notice) => notice.innerHTML), ["one", "two", "three"]);
advanceTo(2800); assert.equal(stack.children[0].classList.leaving, true);
advanceTo(2999); assert.equal(stack.children.length, 3);
advanceTo(3000); assert.deepEqual(stack.children.map((notice) => notice.innerHTML), ["two", "three"]);
advanceTo(3350); assert.deepEqual(stack.children.map((notice) => notice.innerHTML), ["three"]);
advanceTo(3700); assert.equal(stack.children.length, 0);
assert.deepEqual(removed, [{ id: "one", time: 3000 }, { id: "two", time: 3350 }, { id: "three", time: 3700 }]);
notifier.update(earned); advanceTo(5000); assert.equal(stack.children.length, 0, "Repeat checks must not repeat notices");
notifier.update([...earned, { id: "four", earned: true }, { id: "five", earned: true }]);
notifier.reset(); advanceTo(10000);
assert.equal(stack.children.length, 0); assert.equal(timers.size, 0, "Changing accounts must cancel visible and queued notices");
notifier.update([], false); notifier.update([{ id: "one", earned: true }]);
assert.equal(stack.children.length, 1, "Another account can earn the same medal independently");

const clientSource = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const elements = new Map();
const $ = (id) => { if (!elements.has(id)) elements.set(id, {}); return elements.get(id); };
const context = { $, getUnifiedAchievements, achievementStats: {}, plantAchievementStats: {}, selectedKingdom: "animals", animals: [{ id: "homo-sapiens" }, { id: "animal" }], plants: [{ id: "hibiscus-syriacus" }, { id: "plant" }], HUMAN_ID: "homo-sapiens", PLANT_INITIAL_ID: "hibiscus-syriacus", escapeHtml: (text) => String(text) };
runInNewContext(clientSource.slice(clientSource.indexOf("function achievementMedal("), clientSource.indexOf("async function refreshAchievementStats(")), context);
context.renderAchievements({ bestScore: 10 });
const html = $("#achievements-grid").innerHTML;
for (const category of ["기본", "연습모드", "일반모드", "특별"]) assert.ok(html.includes(`<h2>${category}</h2>`));
assert.equal((html.match(/<details /g) || []).length, 36);
assert.equal((html.match(/<progress /g) || []).length, 35);
assert.ok(!html.includes("미달성") && !html.includes("achievement-meta"));
context.selectedKingdom = "plants";
context.renderAchievements();
assert.equal($("#achievements-title").textContent, "발전과제");
assert.equal($("#achievements-grid").innerHTML, html, "Switching kingdom must not filter achievements");
context.currentUser = { id: "player" }; context.pendingAchievementWrites = []; context.pendingCollectionWrites = [];
let refreshCount = 0;
context.refreshAchievementStats = async (notify) => { assert.equal(notify, false); refreshCount++; };
runInNewContext(clientSource.slice(clientSource.indexOf("async function loadAchievements("), clientSource.indexOf("function recordAchievementEvent(")), context);
await context.loadAchievements();
assert.equal(refreshCount, 1, "Opening achievements from plants must load both kingdoms");
assert.ok(!$("#achievements-status").textContent.includes("준비 중"));
const groups = getUnifiedAchievements().reduce((counts, task) => ({ ...counts, [task.category]: (counts[task.category] || 0) + 1 }), {});
assert.deepEqual(groups, { "기본": 12, "연습모드": 5, "일반모드": 18, "특별": 1 });
const specialHtml = html.slice(html.indexOf("<h2>특별</h2>"));
assert.equal((specialHtml.match(/<details /g) || []).length, 1);
assert.ok(specialHtml.includes("자, 이게 분류학이야") && specialHtml.includes("어류·파충류·조류·양서류·포유류 중 세 분류군이 한 분기점에서 갈라지도록 오분류하기"));
assert.ok(!specialHtml.includes("동물분류 입문자"));
assert.ok(!specialHtml.includes("<progress") && !specialHtml.includes("자매군") && !specialHtml.includes("튜토리얼 제외"));
assert.ok(!clientSource.includes("selectAchievementTab") && !clientSource.includes("achievement-tabs"));
const updates = [];
Object.assign(context, {
  currentUser: { id: "player" }, achievementStats: { bestScore: 0, bestPracticeScore: 0 },
  game: { hidden: false }, state: { score: 9, practice: false, tutorial: false },
  getSuccessCounts: () => ({ animal: { count: 10 }, "homo-sapiens": { count: 999 } }),
  getCollection: () => ["homo-sapiens", "animal"], speciesById: new Map([["animal", {}]]),
  normalizeSuccessRecord: (record) => record,
  achievementNotifications: { update(tasks) { updates.push(tasks); } },
});
runInNewContext(clientSource.slice(clientSource.indexOf("function checkAchievementProgress("), clientSource.indexOf("async function loadAchievements(")), context);
context.checkAchievementProgress();
assert.equal(updates.at(-1).find((task) => task.id === "best-10").earned, false);
context.state.score = 10; context.checkAchievementProgress();
assert.equal(updates.at(-1).find((task) => task.id === "best-10").earned, true, "Milestones must be detected during play");
assert.equal(context.achievementStats.totalSuccesses, 10, "Human must not count toward success medals");
context.achievementStats.bestScore = 0; context.state.practice = true; context.state.score = 50;
context.checkAchievementProgress();
assert.equal(updates.at(-1).find((task) => task.id === "best-10").earned, false, "Practice must not award normal score milestones");
const beforeTutorial = updates.length;
context.state.tutorial = true; context.checkAchievementProgress();
context.state.tutorial = false; context.currentUser = null; context.checkAchievementProgress();
assert.equal(updates.length, beforeTutorial, "Tutorial and guest progress must not create medal notices");
console.log("Achievement notifications: staggered stacking, exact 3-second lifetime, FIFO removal, deduplication, account reset and compact grouped details passed.");
