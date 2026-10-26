import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { getUnifiedAchievements } from "../public/achievements.js";

const tasks = (animals = {}, plants = {}) => getUnifiedAchievements(animals, plants, 313, 45);
const task = (id, animals = {}, plants = {}) => tasks(animals, plants).find((item) => item.id === id);
assert.equal(tasks().length, 36);
assert.equal(new Set(tasks().map((item) => item.id)).size, 36);
assert.ok(tasks().every((item) => !item.earned));
for (const stats of [{ practiceStarted: true }, { practiceCompleted: true }, { bestPracticeScore: 45 }]) {
  const id = stats.practiceStarted ? "first-practice" : stats.practiceCompleted ? "practice-complete" : "practice-perfect";
  assert.equal(task(id, {}, stats).earned, true, "Plant practice alone must qualify for shared practice medals");
}
assert.equal(task("practice-perfect", { bestPracticeScore: 312 }, { bestPracticeScore: 44 }).earned, false);
assert.equal(task("practice-perfect", { bestPracticeScore: 313 }).earned, true);
assert.equal(task("practice-all-complete", { practiceCompleted: true }).earned, false);
assert.equal(task("practice-all-complete", { practiceCompleted: true }, { practiceCompleted: true }).earned, true);
assert.equal(task("practice-all-perfect", { bestPracticeScore: 313 }, { bestPracticeScore: 44 }).earned, false);
assert.equal(task("practice-all-perfect", { bestPracticeScore: 313 }, { bestPracticeScore: 45 }).earned, true);
for (const difficulty of ["easy", "medium", "hard"]) {
  assert.equal(task(`complete-${difficulty}`, {}, { [`${difficulty}Completed`]: true }).earned, true);
}
for (const goal of [10, 25, 50, 100, 200]) {
  const animal = task(`best-${goal}`, { bestScore: goal }, { bestScore: goal - 1 });
  const plant = task(`plant-best-${goal}`, { bestScore: goal }, { bestScore: goal - 1 });
  assert.equal(animal.earned, true); assert.equal(plant.earned, false);
  assert.equal(task(`plant-best-${goal}`, {}, { bestScore: goal }).earned, true);
  assert.equal(plant.title, animal.title.replace("동물분류", "식물분류"));
}
assert.equal(task("attempts-100", { normalAttempts: 40 }, { normalAttempts: 59 }).earned, false);
assert.equal(task("attempts-100", { normalAttempts: 40 }, { normalAttempts: 60 }).earned, true);
assert.equal(task("repeat-10", { totalSuccesses: 4 }, { totalSuccesses: 6 }).earned, true);
assert.equal(task("repeat-100", { repeatSuccesses: 100 }, {}).earned, false, "Repetition medals now use the combined total, not one species' repeat count");
assert.equal(task("successes-1000", { totalSuccesses: 400 }, { totalSuccesses: 600 }).earned, true);
assert.equal(task("plant-collection-25", { collected: 100 }, { collected: 24 }).earned, false);
assert.equal(task("collection-25", { collected: 24 }, { collected: 100 }).earned, false);
assert.equal(task("plant-collection-100").goal, 100);
assert.equal(task("plant-collection-all", {}, { collected: 45 }).earned, true);
assert.ok(tasks().filter((item) => item.id.startsWith("plant-collection-")).every((item) => item.title === "미정"));
assert.equal(task("first-failure", {}, { hasFailed: true }).earned, true);
assert.ok(!tasks().some((item) => item.id === "plant-grass-sibling" || item.id === "plant-attempts-10"));
const source = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const calls = [], notices = [];
const context = {
  currentUser: { id: "alice" }, achievementStats: null, plantAchievementStats: null,
  animals: Array(314).fill({}), plants: Array(46).fill({}), getUnifiedAchievements,
  fetch: async (url) => { calls.push(url); return Response.json({ stats: { bestScore: url.includes("plant") ? 25 : 10 } }); },
  responseJson: (response) => response.json(), achievementNotifications: { update: (tasks, notify) => notices.push({ tasks, notify }) },
};
runInNewContext(source.slice(source.indexOf("function currentAchievements("), source.indexOf("function renderAchievements(")), context);
runInNewContext(source.slice(source.indexOf("async function refreshAchievementStats("), source.indexOf("function checkAchievementProgress(")), context);
await context.refreshAchievementStats(false);
assert.deepEqual(calls, ["/api/achievements", "/api/plant-achievements"]);
assert.equal(context.achievementStats.bestScore, 10); assert.equal(context.plantAchievementStats.bestScore, 25);
assert.equal(notices[0].notify, false, "Existing earned medals must load silently");
assert.equal(notices[0].tasks.find((item) => item.id === "plant-best-25").earned, true);
context.fetch = async (url) => url.includes("plant") ? new Response("error", { status: 503 }) : Response.json({ stats: { bestScore: 99 } });
await assert.rejects(context.refreshAchievementStats(), /불러오지/);
assert.equal(context.achievementStats.bestScore, 10, "A partial fetch failure must preserve the previous complete snapshot");
let finish;
const pending = new Promise((resolve) => { finish = resolve; });
context.fetch = async () => { await pending; return Response.json({ stats: { bestScore: 200 } }); };
const refresh = context.refreshAchievementStats();
context.currentUser = { id: "bob" }; context.achievementStats = null; context.plantAchievementStats = null;
finish(); await refresh;
assert.equal(context.achievementStats, null); assert.equal(context.plantAchievementStats, null, "Changing accounts must discard the previous account's in-flight response");
console.log("Unified achievements: 36 unique medals, per-kingdom score/collection goals, OR practice/completion, all-kingdom practice and cross-kingdom totals passed.");
