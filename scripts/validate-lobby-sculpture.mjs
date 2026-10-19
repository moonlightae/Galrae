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
let now = 100, nextFrame = 0, renderedScene, renderedBlur, depthTarget, resizeCallback, visibilityCallback, intersectionCallback;
let surfaceWidth = 600;
const windowListeners = {};
const surface = {
  attributes: {}, setAttribute(name, value) { this.attributes[name] = value; },
  hidden: false, classList: { add() {}, remove() {} },
  appendChild() {}, getBoundingClientRect: () => ({ width: surfaceWidth, height: 600 }),
  addEventListener: (name, callback) => { listeners[name] = callback; },
  setPointerCapture() {}, hasPointerCapture: () => false,
};
const lobby = { hidden: false }, reduced = { matches: false, addEventListener() {}, removeEventListener() {} };
const document = { documentElement: { dataset: {} }, hidden: false, addEventListener: (name, callback) => { documentListeners[name] = callback; }, removeEventListener() {} };
class Renderer {
  domElement = { setAttribute() {} };
  setPixelRatio() {} setSize() {} dispose() {}
  getDrawingBufferSize(size) { return size.set(surfaceWidth, 600); }
  setRenderTarget(target) { if (target) depthTarget = target; }
  render(scene, camera) { if (camera.isPerspectiveCamera) renderedScene = scene; else renderedBlur = scene; }
}
const rings = [];
class ExtrudeGeometry extends Three.ExtrudeGeometry {
  constructor(...args) { super(...args); rings.push(this); }
}
const create = runInNewContext(source.replace(/^import .*?;\s*/, "").replace("export function", "function") + "\ncreateLobbySculpture", {
  THREE: { ...Three, WebGLRenderer: Renderer, ExtrudeGeometry }, document, window: { devicePixelRatio: 1, addEventListener(name, callback) { windowListeners[name] = callback; }, removeEventListener() {} },
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
const blurQuad = renderedBlur.children[0], blurUniforms = blurQuad.material.uniforms;
assert.ok(depthTarget.depthTexture.isDepthTexture, "Blur must use the sculpture's actual depth");
assert.equal(blurUniforms.image.value, depthTarget.texture);
assert.equal(blurUniforms.depth.value, depthTarget.depthTexture);
assert.equal(depthTarget.width, 600); assert.equal(depthTarget.height, 600);
assert.ok(blurUniforms.focusFar.value > blurUniforms.focusNear.value);
const initialFocus = blurUniforms.focusNear.value;
surfaceWidth = 240; resizeCallback(); tick();
assert.equal(depthTarget.width, 240);
assert.ok(blurUniforms.focusNear.value > initialFocus, "Focus must follow the camera on narrow screens");
assert.equal(blurUniforms.pixelStep.value.x * surfaceWidth, 2.4, "Blur size must stay consistent across screen sizes");
surfaceWidth = 600; resizeCallback(); tick();
assert.equal(renderedScene.children.filter((child) => child.isMesh).length, 1, "No shadow mesh");
assert.equal(sculpture.material.roughness, .92);
assert.equal(sculpture.material.metalness, 0);
assert.equal(rings.length, 1, "Only the root may have a ring");
rings[0].computeBoundingBox();
assert.ok(rings[0].boundingBox.max.y < -2.3, "The ring must mark the lower stem end");
const ringSize = rings[0].boundingBox.getSize(new Three.Vector3());
assert.ok(ringSize.x < .9, "The root ring must stay small");
assert.ok(Math.abs(ringSize.z - .29) < .000001, "Ring depth must match the stem diameter");
assert.equal(rings[0].parameters.options.bevelEnabled, false, "The ring must have sharp edges");
const outerRadius = rings[0].parameters.shapes.curves[0].xRadius;
const innerRadius = rings[0].parameters.shapes.holes[0].curves[0].xRadius;
assert.ok(Math.abs(outerRadius - innerRadius - .29) < .000001, "Ring wall width must match the stem diameter");
const holeTop = rings[0].boundingBox.getCenter(new Three.Vector3()).y + innerRadius;
assert.ok(holeTop < -2.55 - .145, "The stem's rounded end must stay outside the ring opening");
assert.ok(rings[0].boundingBox.max.y > -2.55 - .145, "The ring must remain connected to the stem");
sculpture.geometry.computeBoundingBox();
assert.ok(sculpture.geometry.boundingBox.min.y > -3.36 && sculpture.geometry.boundingBox.max.y < 3.46);
for (const value of sculpture.geometry.getAttribute("position").array) assert.ok(Number.isFinite(value));
const shader = { uniforms: {}, vertexShader: "#include <begin_vertex>", fragmentShader: "#include <color_fragment>" };
sculpture.material.onBeforeCompile(shader);
assert.equal(shader.uniforms.scFrom.value.getHex(), 0x6b4935, "Sculpture matches the animal theme's brown wordmark");
assert.equal(document.documentElement.dataset.theme, "light");
assert.equal(surface.attributes["aria-pressed"], "false");
const initialAngle = sculpture.quaternion.clone();
advance(1000);
assert.ok(sculpture.quaternion.angleTo(initialAngle) > .05, "Initial spin needs no input");

// Fast dragging stays capped; release continues with a slowly decaying velocity.
listeners.pointerdown(pointerEvent(0, 0));
for (let i = 1; i <= 25; i++) { tick(); listeners.pointermove(pointerEvent(i * 100, 0)); }
listeners.pointerup(pointerEvent(2500, 0)); listeners.click();
assert.equal(shader.uniforms.scFront.value, -3.4, "Dragging must not change color");
assert.equal(document.documentElement.dataset.theme, "light", "Dragging must not toggle the page theme");
let angle = sculpture.quaternion.clone(); tick();
const speed = sculpture.quaternion.angleTo(angle) / .016667;
assert.ok(speed > 1 && speed <= 1.600001, "Rotation speed is capped at the increased limit");
advance(2000); angle = sculpture.quaternion.clone(); tick();
const laterSpeed = sculpture.quaternion.angleTo(angle) / .016667;
assert.ok(laterSpeed < speed && laterSpeed > speed * .85, "Low friction preserves release inertia");

// Vertical dragging and keyboard rotation pass upside-down and full-turn positions.
listeners.pointerdown(pointerEvent(0, 0));
for (let i = 1; i <= 25; i++) { tick(); listeners.pointermove(pointerEvent(0, i * 100)); }
listeners.pointerup(pointerEvent(0, 2500)); listeners.click();
let travelled = 0;
for (let i = 0; i < 300; i++) { const before = sculpture.quaternion.clone(); tick(); travelled += sculpture.quaternion.angleTo(before); }
assert.ok(travelled > Math.PI * 2, "Vertical inertia must continue through a complete revolution");
const beforeKeys = sculpture.quaternion.clone();
for (let i = 0; i < 70; i++) listeners.keydown({ key: "ArrowDown", preventDefault() {} });
const afterKeys = new Three.Quaternion().setFromAxisAngle(new Three.Vector3(1, 0, 0), 7).multiply(beforeKeys);
assert.ok(sculpture.quaternion.angleTo(afterKeys) < .000001, "Keyboard rotation must have no angle clamp");

// Rapid color toggles queue cleanly, then finish in the requested color.
listeners.click(); tick();
assert.equal(document.documentElement.dataset.theme, "dark");
assert.equal(surface.attributes["aria-pressed"], "true");
assert.ok(shader.uniforms.scFront.value > -3.4 && shader.uniforms.scFront.value < 3.5);
listeners.click(); advance(3500);
assert.equal(shader.uniforms.scTo.value.getHex(), 0x6b4935);
assert.equal(document.documentElement.dataset.theme, "light");
assert.ok(Math.abs(shader.uniforms.scFront.value - 3.5) < .000001);
listeners.click(); advance(1800);
assert.equal(shader.uniforms.scTo.value.getHex(), 0xf4e5d5);
assert.equal(document.documentElement.dataset.theme, "dark");

// Hidden screens, offscreen art and background tabs do not keep rendering.
lobby.hidden = true; visibilityCallback(); assert.equal(callbacks.size, 0);
lobby.hidden = false; visibilityCallback(); assert.ok(callbacks.size); tick();
intersectionCallback([{ isIntersecting: false }]); assert.equal(callbacks.size, 0);
intersectionCallback([{ isIntersecting: true }]); tick();
document.hidden = true; documentListeners.visibilitychange(); assert.equal(callbacks.size, 0);
document.hidden = false; documentListeners.visibilitychange(); tick();
reduced.matches = true; visibilityCallback(); tick(); assert.equal(callbacks.size, 0);
listeners.click(); tick(); assert.equal(shader.uniforms.scTo.value.getHex(), 0x6b4935);
assert.equal(document.documentElement.dataset.theme, "light");
reduced.matches = false;
document.documentElement.dataset.kingdom = "plants"; windowListeners["galrae:kingdom-change"](); tick();
assert.equal(shader.uniforms.scFrom.value.getHex(), 0x6b4935);
assert.equal(shader.uniforms.scTo.value.getHex(), 0x11675f);
assert.ok(shader.uniforms.scFront.value > -3.4 && shader.uniforms.scFront.value < 3.5);
document.documentElement.dataset.kingdom = "animals"; windowListeners["galrae:kingdom-change"]();
advance(3500);
assert.equal(shader.uniforms.scTo.value.getHex(), 0x6b4935, "Rapid kingdom changes settle at the latest palette");
document.documentElement.dataset.kingdom = "plants"; windowListeners["galrae:kingdom-change"](); advance(1800);
assert.equal(shader.uniforms.scTo.value.getHex(), 0x11675f);
listeners.click(); advance(1800);
assert.equal(shader.uniforms.scTo.value.getHex(), 0xc8f3eb, "Dark mode keeps the plant palette");
reduced.matches = true;
document.documentElement.dataset.kingdom = "animals"; windowListeners["galrae:kingdom-change"](); tick();
assert.equal(shader.uniforms.scTo.value.getHex(), 0xf4e5d5);
resizeCallback(); tick();
let disposed = 0;
for (const resource of [depthTarget, blurQuad.geometry, blurQuad.material]) resource.addEventListener("dispose", () => disposed++);
windowListeners.pagehide({ persisted: true }); assert.equal(disposed, 0);
windowListeners.pagehide({ persisted: false }); assert.equal(disposed, 3, "Blur resources must be released on page exit");
console.log("Lobby sculpture: depth blur, responsive focus, resource cleanup, motion, theme switching and visibility passed.");
