import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import * as Three from "../public/vendor/three/three.module.min.js";

const source = readFileSync(new URL("../public/lobby-sculpture.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
assert.doesNotMatch(css, /highlight-purple|highlight-pink|a18cd1|fbc2eb/);
assert.match(css, /:root\[data-theme="dark"\]/);
assert.match(css, /color-scheme: dark/);
for (const path of ["../public/app.js", "../app/game-markup.ts"]) {
  const text = readFileSync(new URL(path, import.meta.url), "utf8");
  assert.ok(!text.includes("핑크색"));
  assert.ok(text.includes("초록색으로 표시된 곳이 올바른 위치입니다."));
}
const callbacks = new Map(), listeners = {}, documentListeners = {};
let now = 100, nextFrame = 0, renderedScene, resizeCallback, visibilityCallback, intersectionCallback;
const surface = {
  attributes: {}, setAttribute(name, value) { this.attributes[name] = value; },
  hidden: false, classList: { add() {}, remove() {} },
  appendChild() {}, getBoundingClientRect: () => ({ width: 600, height: 600 }),
  addEventListener: (name, callback) => { listeners[name] = callback; },
  setPointerCapture() {}, hasPointerCapture: () => false,
};
const lobby = { hidden: false }, reduced = { matches: false, addEventListener() {}, removeEventListener() {} };
const document = { documentElement: { dataset: {} }, hidden: false, addEventListener: (name, callback) => { documentListeners[name] = callback; }, removeEventListener() {} };
class Renderer {
  domElement = { setAttribute() {} };
  setPixelRatio() {} setSize() {} dispose() {}
  render(scene) { renderedScene = scene; }
}
const create = runInNewContext(source.replace(/^import .*?;\s*/, "").replace("export function", "function") + "\ncreateLobbySculpture", {
  THREE: { ...Three, WebGLRenderer: Renderer }, document, window: { devicePixelRatio: 1, addEventListener() {} },
  matchMedia: () => reduced, performance: { now: () => now }, console,
  requestAnimationFrame: (callback) => { callbacks.set(++nextFrame, callback); return nextFrame; },
  cancelAnimationFrame: (id) => callbacks.delete(id),
  ResizeObserver: class { constructor(callback) { resizeCallback = callback; } observe() {} disconnect() {} },
  MutationObserver: class { constructor(callback) { visibilityCallback = callback; } observe() {} disconnect() {} },
  IntersectionObserver: class { constructor(callback) { intersectionCallback = callback; } observe() {} disconnect() {} },
});
function tick(ms = 16.667) {
  now += ms;
  const current = [...callbacks.values()]; callbacks.clear();
  current.forEach((callback) => callback(now));
}
function advance(ms) { for (let i = 0; i < Math.ceil(ms / 16.667); i++) tick(); }
function pointerEvent(x, y) { return { button: 0, pointerId: 1, clientX: x, clientY: y }; }
create(surface, lobby); tick();
assert.equal(surface.hidden, false);
const sculpture = renderedScene.children.find((child) => child.isMesh);
assert.equal(renderedScene.children.filter((child) => child.isMesh).length, 1, "No shadow mesh");
assert.equal(sculpture.material.roughness, .92);
assert.equal(sculpture.material.metalness, 0);
assert.ok(!source.includes("TorusGeometry"), "No circular tip nodes");
sculpture.geometry.computeBoundingBox();
assert.ok(sculpture.geometry.boundingBox.min.y > -3.2 && sculpture.geometry.boundingBox.max.y < 3.5);
for (const value of sculpture.geometry.getAttribute("position").array) assert.ok(Number.isFinite(value));
const shader = { uniforms: {}, vertexShader: "#include <begin_vertex>", fragmentShader: "#include <color_fragment>" };
sculpture.material.onBeforeCompile(shader);
assert.equal(shader.uniforms.scFrom.value.getHex(), 0x08090a, "Sculpture starts black on a light page");
assert.equal(document.documentElement.dataset.theme, "light");
assert.equal(surface.attributes["aria-pressed"], "false");
const initialAngle = sculpture.rotation.y;
advance(1000);
assert.ok(Math.abs(sculpture.rotation.y - initialAngle) > .05, "Initial spin needs no input");

// Fast dragging stays capped; release continues with a slowly decaying velocity.
listeners.pointerdown(pointerEvent(0, 0));
for (let i = 1; i <= 25; i++) { tick(); listeners.pointermove(pointerEvent(i * 100, 0)); }
listeners.pointerup(pointerEvent(2500, 0)); listeners.click();
assert.equal(shader.uniforms.scFront.value, -3.2, "Dragging must not change color");
assert.equal(document.documentElement.dataset.theme, "light", "Dragging must not toggle the page theme");
let angle = sculpture.rotation.y; tick();
const speed = (sculpture.rotation.y - angle) / .016667;
assert.ok(speed > 1 && speed <= 1.600001, "Rotation speed is capped at the increased limit");
advance(2000); angle = sculpture.rotation.y; tick();
const laterSpeed = (sculpture.rotation.y - angle) / .016667;
assert.ok(laterSpeed < speed && laterSpeed > speed * .85, "Low friction preserves release inertia");

// Rapid color toggles queue cleanly, then finish in the requested color.
listeners.click(); tick();
assert.equal(document.documentElement.dataset.theme, "dark");
assert.equal(surface.attributes["aria-pressed"], "true");
assert.ok(shader.uniforms.scFront.value > -3.2 && shader.uniforms.scFront.value < 3.5);
listeners.click(); advance(3500);
assert.equal(shader.uniforms.scTo.value.getHex(), 0x08090a);
assert.equal(document.documentElement.dataset.theme, "light");
assert.equal(shader.uniforms.scFront.value, 3.5);
listeners.click(); advance(1800);
assert.equal(shader.uniforms.scTo.value.getHex(), 0xffffff);
assert.equal(document.documentElement.dataset.theme, "dark");

// Hidden screens, offscreen art and background tabs do not keep rendering.
lobby.hidden = true; visibilityCallback(); assert.equal(callbacks.size, 0);
lobby.hidden = false; visibilityCallback(); assert.ok(callbacks.size); tick();
intersectionCallback([{ isIntersecting: false }]); assert.equal(callbacks.size, 0);
intersectionCallback([{ isIntersecting: true }]); tick();
document.hidden = true; documentListeners.visibilitychange(); assert.equal(callbacks.size, 0);
document.hidden = false; documentListeners.visibilitychange(); tick();
reduced.matches = true; visibilityCallback(); tick(); assert.equal(callbacks.size, 0);
listeners.click(); tick(); assert.equal(shader.uniforms.scTo.value.getHex(), 0x08090a);
assert.equal(document.documentElement.dataset.theme, "light");
resizeCallback(); tick();
console.log("Lobby sculpture: matte geometry, bounded inertia, page theme switching, rapid toggles, hidden-screen pause and reduced motion passed.");
