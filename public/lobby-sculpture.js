import * as THREE from "./vendor/three/three.module.min.js";

export function createLobbySculpture(surface, lobby) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: false }); }
  catch (error) { surface.hidden = true; console.warn("WebGL unavailable", error); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.domElement.setAttribute("aria-hidden", "true");
  surface.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 60);
  camera.position.set(0, .1, 12);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x809099, 1.25));
  const key = new THREE.DirectionalLight(0xffffff, 2); key.position.set(-4, 6, 7); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 1.3); rim.position.set(4, 3, -4); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xdfe7f3, .5); fill.position.set(3, -1, 5); scene.add(fill);

  // Bake the branch parts together so color rises in the tree's own coordinates.
  const pieces = [];
  const stemRadius = .145;
  function tube(a, b) {
    const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b), delta = to.clone().sub(from);
    const geometry = new THREE.CylinderGeometry(stemRadius, stemRadius, delta.length(), 32, 1);
    geometry.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize())));
    const center = from.add(to).multiplyScalar(.5);
    geometry.translate(center.x, center.y, center.z); pieces.push(geometry);
  }
  function joint(p) {
    const geometry = new THREE.SphereGeometry(stemRadius, 24, 16);
    geometry.translate(...p); pieces.push(geometry);
  }
  const paths = [
    [[0, -2.55, 0], [.16, -1.3, 0], [-.12, .55, -.12], [-.5, 1.62, .12], [-.5, 2.65, .12]],
    [[.16, -1.3, 0], [-1.05, -.35, .22], [-1.88, .15, .32], [-1.88, .85, .32]],
    [[-1.05, -.35, .22], [-1.12, .75, -.38], [-1.12, 1.7, -.38]],
    [[-.12, .55, -.12], [.98, 1.12, -.3], [1.35, 1.48, -.3], [1.35, 2.2, -.3]],
    [[.16, -1.3, 0], [1.12, -.7, .4], [1.75, -.15, .4], [1.75, .55, .4]]
  ];
  for (const path of paths) {
    for (let i = 1; i < path.length; i++) tube(path[i - 1], path[i]);
    for (const p of path) joint(p);
  }
  const ringShape = new THREE.Shape(), ringHole = new THREE.Path();
  ringShape.absarc(0, 0, .28 + stemRadius, 0, Math.PI * 2, false);
  ringHole.absarc(0, 0, .28 - stemRadius, 0, Math.PI * 2, true);
  ringShape.holes.push(ringHole);
  const rootRing = new THREE.ExtrudeGeometry(ringShape, { depth: stemRadius * 2, bevelEnabled: false, curveSegments: 48, steps: 1 });
  rootRing.translate(...paths[0][0]); rootRing.translate(0, -.2, -stemRadius);
  pieces.push(rootRing);
  const attributes = { position: [], normal: [], uv: [] };
  for (const part of pieces) {
    const flat = part.index ? part.toNonIndexed() : part;
    for (const name of Object.keys(attributes)) attributes[name].push(flat.getAttribute(name).array);
    if (flat !== part) flat.dispose();
    part.dispose();
  }
  const geometry = new THREE.BufferGeometry();
  for (const [name, arrays] of Object.entries(attributes)) {
    const size = arrays.reduce((n, array) => n + array.length, 0), merged = new Float32Array(size);
    let offset = 0;
    for (const array of arrays) { merged.set(array, offset); offset += array.length; }
    geometry.setAttribute(name, new THREE.BufferAttribute(merged, name === "uv" ? 2 : 3));
  }
  geometry.computeBoundingSphere();
  const black = new THREE.Color(0x292d32), white = new THREE.Color(0xffffff);
  const uniforms = { front: { value: -3.2 }, from: { value: black.clone() }, to: { value: white.clone() } };
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .92, metalness: 0 });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.scFront = uniforms.front; shader.uniforms.scFrom = uniforms.from; shader.uniforms.scTo = uniforms.to;
    shader.vertexShader = "varying float scHeight;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nscHeight = position.y;");
    shader.fragmentShader = "uniform float scFront; uniform vec3 scFrom; uniform vec3 scTo; varying float scHeight;\n" + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace("#include <color_fragment>", "#include <color_fragment>\nfloat scFill = 1.0-smoothstep(scFront-.04,scFront+.04,scHeight);\ndiffuseColor.rgb = mix(scFrom,scTo,scFill);");
  };
  const sculpture = new THREE.Mesh(geometry, material);
  scene.add(sculpture); sculpture.rotation.set(-.08, -.24, -.03);
  const xAxis = new THREE.Vector3(1, 0, 0), yAxis = new THREE.Vector3(0, 1, 0);

  const depthTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  depthTarget.depthTexture = new THREE.DepthTexture(1, 1);
  const blurMaterial = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: {
      image: { value: depthTarget.texture }, depth: { value: depthTarget.depthTexture },
      pixelStep: { value: new THREE.Vector2() },
      cameraNear: { value: camera.near }, cameraFar: { value: camera.far },
      focusNear: { value: 0 }, focusFar: { value: 0 },
    },
    vertexShader: `varying vec2 screenUv;
      void main() { screenUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `uniform sampler2D image, depth;
      uniform vec2 pixelStep;
      uniform float cameraNear, cameraFar, focusNear, focusFar;
      varying vec2 screenUv;
      float blurAt(vec2 p) {
        float distance = cameraNear * cameraFar / (cameraFar - texture2D(depth, p).x * (cameraFar - cameraNear));
        return smoothstep(focusNear, focusFar, distance);
      }
      void main() {
        float blur = blurAt(screenUv), total = 0.0;
        vec4 color = vec4(0.0);
        for (int y = -1; y <= 1; y++) {
          for (int x = -1; x <= 1; x++) {
            vec2 p = screenUv + vec2(float(x), float(y)) * pixelStep * blur;
            float weight = (x == 0 ? 2.0 : 1.0) * (y == 0 ? 2.0 : 1.0);
            weight *= step(blur - 0.25, blurAt(p));
            color += texture2D(image, p) * weight;
            total += weight;
          }
        }
        gl_FragColor = vec4(color.rgb / max(color.a, 0.0001), color.a / total);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const blurScene = new THREE.Scene(), blurCamera = new THREE.Camera();
  const blurQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blurMaterial);
  blurQuad.frustumCulled = false; blurScene.add(blurQuad);

  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const maxSpeed = 1.6, friction = .045;
  const randomSigned = (min, max) => (min + Math.random() * (max - min)) * (Math.random() < .5 ? -1 : 1);
  const velocity = { x: reduced.matches ? 0 : randomSigned(.008, .018), y: reduced.matches ? 0 : randomSigned(.07, .12) };
  let desiredDark = false, settledDark = false, transition = null;
  document.documentElement.dataset.theme = "light";
  surface.setAttribute("aria-pressed", "false");
  let frame = 0, lastFrame = 0, pointer = null, touched = false, suppressClick = false, inView = true;
  function cappedVelocity(x, y) {
    const speed = Math.hypot(x, y), factor = speed > maxSpeed ? maxSpeed / speed : 1;
    return { x: x * factor, y: y * factor };
  }
  function updateMotion(dt, now) {
    if (pointer?.moved && now - pointer.time > 80) { const brake = Math.exp(-12 * dt); velocity.x *= brake; velocity.y *= brake; }
    if (!pointer) {
      if (reduced.matches) { velocity.x = 0; velocity.y = 0; }
      else if (touched) { const drag = Math.exp(-friction * dt); velocity.x *= drag; velocity.y *= drag; }
    }
    sculpture.rotateOnWorldAxis(yAxis, velocity.y * dt);
    sculpture.rotateOnWorldAxis(xAxis, velocity.x * dt);
  }
  function beginFill() {
    if (desiredDark === settledDark) return;
    uniforms.from.value.copy(settledDark ? white : black);
    uniforms.to.value.copy(desiredDark ? white : black);
    transition = { start: performance.now(), dark: desiredDark };
    uniforms.front.value = -3.2; requestDraw();
  }
  function requestDraw() {
    if (!frame && !lobby.hidden && !document.hidden && inView) frame = requestAnimationFrame(draw);
  }
  function draw(now) {
    frame = 0;
    const dt = lastFrame ? Math.min((now - lastFrame) / 1000, .05) : 0; lastFrame = now;
    updateMotion(dt, now);
    if (transition) {
      const progress = reduced.matches ? 1 : Math.min((now - transition.start) / 1600, 1);
      uniforms.front.value = -3.2 + progress * progress * (3 - 2 * progress) * 6.7;
      if (progress === 1) { settledDark = transition.dark; transition = null; beginFill(); }
    }
    renderer.setRenderTarget(depthTarget); renderer.render(scene, camera);
    renderer.setRenderTarget(null); renderer.render(blurScene, blurCamera);
    if (transition || pointer || Math.hypot(velocity.x, velocity.y) > .0001) requestDraw();
  }
  function resize() {
    const rect = surface.getBoundingClientRect(); if (!rect.width || !rect.height) return;
    renderer.setSize(rect.width, rect.height, false); camera.aspect = rect.width / rect.height;
    camera.position.z = Math.max(11.5, 7 / camera.aspect); camera.updateProjectionMatrix();
    const size = renderer.getDrawingBufferSize(new THREE.Vector2()); depthTarget.setSize(size.x, size.y);
    blurMaterial.uniforms.pixelStep.value.set(2.4 / rect.width, 2.4 / rect.height);
    blurMaterial.uniforms.focusNear.value = camera.position.z - .6;
    blurMaterial.uniforms.focusFar.value = camera.position.z + 1.6;
    requestDraw();
  }
  function refreshVisibility() {
    cancelAnimationFrame(frame); frame = 0; lastFrame = 0;
    if (!lobby.hidden && !document.hidden && inView) resize();
    else if (pointer) { suppressClick = true; endPointer({ pointerId: pointer.id }); }
  }
  surface.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || pointer) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY, time: performance.now(), moved: false };
    suppressClick = false; surface.setPointerCapture(event.pointerId); requestDraw();
  });
  surface.addEventListener("pointermove", (event) => {
    if (!pointer || event.pointerId !== pointer.id) return;
    if (Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 5) pointer.moved = true;
    const now = performance.now(), dt = Math.max((now - pointer.time) / 1000, .008);
    if (pointer.moved) {
      touched = true; surface.classList.add("is-dragging");
      const target = cappedVelocity((event.clientY - pointer.lastY) * .003 / dt, (event.clientX - pointer.lastX) * .003 / dt);
      const blend = 1 - Math.exp(-18 * dt);
      velocity.x += (target.x - velocity.x) * blend; velocity.y += (target.y - velocity.y) * blend; requestDraw();
    }
    pointer.lastX = event.clientX; pointer.lastY = event.clientY; pointer.time = now;
  });
  function endPointer(event) {
    if (!pointer || event.pointerId !== pointer.id) return;
    suppressClick = pointer.moved; pointer = null; surface.classList.remove("is-dragging");
    if (surface.hasPointerCapture(event.pointerId)) surface.releasePointerCapture(event.pointerId);
  }
  surface.addEventListener("pointerup", endPointer);
  surface.addEventListener("pointercancel", (event) => { endPointer(event); suppressClick = true; });
  surface.addEventListener("click", () => {
    if (suppressClick) { suppressClick = false; return; }
    desiredDark = !desiredDark;
    document.documentElement.dataset.theme = desiredDark ? "dark" : "light";
    surface.setAttribute("aria-pressed", String(desiredDark));
    if (!transition) beginFill();
  });
  surface.addEventListener("keydown", (event) => {
    const keys = { ArrowLeft: [0, -.12], ArrowRight: [0, .12], ArrowUp: [-.1, 0], ArrowDown: [.1, 0] };
    if (!keys[event.key]) return;
    event.preventDefault(); sculpture.rotateOnWorldAxis(xAxis, keys[event.key][0]); sculpture.rotateOnWorldAxis(yAxis, keys[event.key][1]); requestDraw();
  });
  const observer = new ResizeObserver(resize); observer.observe(surface);
  const visibilityObserver = new MutationObserver(refreshVisibility); visibilityObserver.observe(lobby, { attributes: true, attributeFilter: ["hidden"] });
  const intersection = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; refreshVisibility(); }); intersection.observe(surface);
  document.addEventListener("visibilitychange", refreshVisibility);
  reduced.addEventListener("change", refreshVisibility);
  resize();
  window.addEventListener("pagehide", (event) => {
    if (event.persisted) return;
    cancelAnimationFrame(frame); observer.disconnect(); visibilityObserver.disconnect(); intersection.disconnect();
    document.removeEventListener("visibilitychange", refreshVisibility); reduced.removeEventListener("change", refreshVisibility);
    geometry.dispose(); material.dispose(); depthTarget.dispose();
    blurQuad.geometry.dispose(); blurMaterial.dispose(); renderer.dispose();
  }, { once: true });
}
