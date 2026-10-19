export function createTreeView({ ANIMALIA_ID, buildTree, escapeHtml, speciesById, state, treeCanvas, $, cardText, layoutControls = document, zoomStatus, minZoom = .03 }) {
  const MIN_TREE_ZOOM = minZoom;
  const MAX_TREE_ZOOM = 3.5;

  function mistakeClass(node) {
    return state.mistakes?.has(node.id) ? ` is-mistake${state.latestMistake === node.id ? " is-recent-mistake" : ""}` : "";
  }

  function renderNode(node, x, y) {
      const animal = cardText(speciesById.get(node.id));
      const fresh = state.newest === node.id ? " is-new" : "";
      const preview = node.preview ? " is-preview" : "";
      const mistake = mistakeClass(node);
      const badge = mistake ? '<span class="preview-tag">자동 배치</span>' : node.preview ? `<span class="preview-tag">${state.failed ? "정답 위치" : "미리보기"}</span>` : "";
      const classReference = node.classReference ? `<button class="clade-node class-marker" type="button" style="left:${x}px;top:${y - 56}px" data-target="${escapeHtml(node.classReference)}" aria-label="강 안내">i</button>` : "";
      return `<button class="species-node${fresh}${preview}${mistake}" type="button" style="left:${x}px;top:${y}px" data-species-id="${escapeHtml(node.id)}" data-target="${escapeHtml(node.id)}" data-placement="wrap" aria-label="${escapeHtml(animal.commonName)} 카드 보기. 새 카드를 선택한 상태에서는 이 가지에 배치">${escapeHtml(animal.commonName)}${badge}</button>${classReference}`;
  }

  function layoutRectangularTree(tree) {
    const gap = state.taxonGroups?.length ? 112 : 56;
    const levelHeight = 152;
    const outlinePadding = (state.taxonGroups?.length || 0) * 24;
    function arrange(node) {
      const children = node.type === "leaf" ? [] : node.children.map(arrange);
      const halfWidth = node.type === "leaf" ? 84 : node === tree ? 96 : 9;
      const left = [], right = [];
      for (const child of children) {
        const compactOffset = left.length ? Math.max(...child.left.map((value, depth) => depth < right.length ? right[depth] + gap - value : 0)) : 0;
        const spaciousOffset = left.length ? Math.max(...right) + gap - Math.min(...child.left) : 0;
        // Group borders need separate subtree columns to keep unrelated cards outside.
        child.offset = state.taxonGroups?.some((group) => group.members.size)
          ? spaciousOffset : compactOffset + (spaciousOffset - compactOffset) * .35;
        child.left.forEach((value, depth) => {
          left[depth] = Math.min(left[depth] ?? Infinity, value + child.offset);
          right[depth] = Math.max(right[depth] ?? -Infinity, child.right[depth] + child.offset);
        });
      }
      const center = children.length ? (children[0].offset + children.at(-1).offset) / 2 : 0;
      children.forEach((child) => { child.offset -= center; });
      return { node, children, left: [-halfWidth, ...left.map((value) => value - center)], right: [halfWidth, ...right.map((value) => value - center)] };
    }
    const root = arrange(tree);
    const min = Math.min(...root.left), max = Math.max(...root.right);
    function position(entry, x, depth) {
      entry.x = x; entry.y = 48 + outlinePadding + depth * levelHeight;
      entry.children.forEach((child) => position(child, x + child.offset, depth + 1));
    }
    position(root, 24 + outlinePadding - min, 0);
    return { root, width: max - min + 48 + outlinePadding * 2, height: (root.left.length - 1) * levelHeight + 120 + outlinePadding * 2 };
  }

  function layoutRadialTree(tree) {
    const leafCount = (node) => node.type === "leaf" ? 1 : node.children.reduce((count, child) => count + leafCount(child), 0);
    const deepestBranch = (node, depth = 0) => node.type === "leaf"
      ? depth - 1 : Math.max(depth, ...node.children.map((child) => deepestBranch(child, depth + 1)));
    const count = Math.max(leafCount(tree), 1);
    const branchDepth = Math.max(deepestBranch(tree), 0);
    const radius = Math.max(260, count * 224 / (2 * Math.PI), (branchDepth + 1) * 112);
    const size = Math.ceil((radius + 120 + (state.taxonGroups?.length || 0) * 24) * 2);
    const center = size / 2;
    let leafIndex = 0;

    function position(node, depth) {
      const children = node.type === "leaf" ? [] : node.children.map((child) => position(child, depth + 1));
      const first = node.type === "leaf" ? leafIndex++ : children[0].first;
      const last = node.type === "leaf" ? first : children.at(-1).last;
      const angle = -Math.PI / 2 + Math.PI * (first + last) / count;
      const distance = node.type === "leaf" ? radius : radius * depth / (branchDepth + 1);
      return { node, children, first, last,
        x: Math.round((center + Math.cos(angle) * distance) * 10) / 10,
        y: Math.round((center + Math.sin(angle) * distance) * 10) / 10 };
    }
    return { root: position(tree, 0), size };
  }

  function renderPositionedTree(tree, answer) {
    const radial = state.layout === "radial";
    const layout = radial ? layoutRadialTree(tree) : layoutRectangularTree(tree);
    const { root } = layout;
    const width = radial ? layout.size : layout.width, height = radial ? layout.size : layout.height;
    const lines = [];
    const controls = [];
    const junctionY = (entry) => radial ? entry.y : (entry.y + entry.children[0].y) / 2;
    function renderPillar(start, end, buttonClass, targetId, placement, edgeClass) {
      const length = Math.hypot(end.x - start.x, end.y - start.y);
      const angle = Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI - 90;
      return `<span class="tree-pillar" style="left:${start.x}px;top:${start.y}px;height:${length}px;--pillar-angle:${angle}deg"><svg class="pillar-line" width="36" height="${length}" aria-hidden="true"><line class="${edgeClass}" x1="18" y1="0" x2="18" y2="${length}" /></svg><button class="${buttonClass}" type="button" data-target="${escapeHtml(targetId)}" data-placement="${placement}" aria-label="이 가지에서 새로운 공통 조상 만들기"></button></span>`;
    }
    function visit(entry, parent = null) {
      const { node, x, y } = entry;
      if (node.type === "branch" && entry.children.length === 1 && !node.rank) {
        visit(entry.children[0], parent);
        return;
      }
      const edgeClass = `tree-edge${node.preview ? " is-answer-path" : ""}${state.mistakes?.has(node.id) ? " is-mistake-path" : ""}${state.latestMistake === node.id ? " is-recent-mistake-path" : ""}`;
      if (parent) {
        const middleY = (parent.y + y) / 2;
        if (radial) {
          if (node.type === "leaf") lines.push(`<line class="${edgeClass}" x1="${parent.x}" y1="${parent.y}" x2="${x}" y2="${y}" />`);
        } else {
          lines.push(`<path class="${edgeClass}" d="M${parent.x} ${middleY} H${x}${node.type === "leaf" ? ` V${y}` : ""}" />`);
        }
        if (node.type === "branch") {
          const start = radial ? parent : { x, y: middleY };
          const end = radial ? entry : { x, y: junctionY(entry) };
          controls.push(renderPillar(start, end, radial ? "radial-edge-target" : "edge-target", node.id, "wrap", edgeClass));
        }
      } else {
        const start = { x: root.x, y: root.y + (radial ? -52 : 16) };
        const end = radial ? entry : { x, y: node.type === "leaf" ? y - 36 : junctionY(entry) };
        controls.push(renderPillar(start, end, radial ? "radial-edge-target" : "edge-target", node.id, "wrap", edgeClass));
      }
      if (node.type === "leaf") {
        controls.push(renderNode(node, x, y));
      } else if (entry.children.length > 1 || node.rank) {
        const marker = entry.children.length === 1;
        controls.push(`<button class="clade-node${marker ? " class-marker" : ""}" type="button" style="left:${x}px;top:${junctionY(entry)}px" data-rank="${escapeHtml(node.rank || "clade")}" data-target="${escapeHtml(node.id)}" data-placement="join" aria-label="${marker ? "강 안내" : "이 공통 조상에 가지 추가하기"}">${marker ? "i" : ""}</button>`);
      }
      for (const child of entry.children) visit(child, entry);
    }
    visit(root);
    const outlined = [];
    for (const group of state.taxonGroups || []) {
      if (!group.members.size) continue;
      const leaves = [];
      function measure(entry) {
        if (entry.node.type === "leaf") {
          if (group.members.has(entry.node.id)) leaves.push(entry);
        } else entry.children.forEach(measure);
      }
      measure(root);
      if (!leaves.length) continue;
      const padding = Math.max(0, ...outlined.filter((inner) => [...inner.members].every((id) => group.members.has(id))).map((inner) => inner.padding + 24));
      outlined.push({ ...group, padding });
      const left = Math.min(...leaves.map((leaf) => leaf.x)) - 98 - padding;
      const right = Math.max(...leaves.map((leaf) => leaf.x)) + 98 + padding;
      const top = Math.min(...leaves.map((leaf) => leaf.y)) - 58 - padding;
      const bottom = Math.max(...leaves.map((leaf) => leaf.y)) + 52 + padding;
      let shape = "", buttonX = (left + right) / 2, buttonY = state.layout === "bottom" ? bottom : top;
      let geometry = "";
      if (radial) {
        const count = root.last - root.first + 1;
        const radius = Math.hypot(leaves[0].x - root.x, leaves[0].y - root.y);
        const inner = radius - 110 - padding, outer = radius + 110 + padding;
        const margin = Math.min(Math.PI / count * .95, Math.asin(Math.min(1, 100 / radius)));
        const start = -Math.PI / 2 + Math.min(...leaves.map((leaf) => leaf.first)) * Math.PI * 2 / count - margin;
        const end = -Math.PI / 2 + Math.max(...leaves.map((leaf) => leaf.first)) * Math.PI * 2 / count + margin;
        const point = (distance, angle) => `${root.x + Math.cos(angle) * distance} ${root.y + Math.sin(angle) * distance}`;
        const all = leaves.length === count;
        const large = end - start > Math.PI ? 1 : 0;
        const path = all
          ? `M${point(outer, 0)} A${outer} ${outer} 0 1 1 ${point(outer, Math.PI)} A${outer} ${outer} 0 1 1 ${point(outer, 0)} M${point(inner, 0)} A${inner} ${inner} 0 1 1 ${point(inner, Math.PI)} A${inner} ${inner} 0 1 1 ${point(inner, 0)}`
          : `M${point(outer, start)} A${outer} ${outer} 0 ${large} 1 ${point(outer, end)} L${point(inner, end)} A${inner} ${inner} 0 ${large} 0 ${point(inner, start)} Z`;
        shape = `<svg width="${width}" height="${height}" style="position:absolute;left:${-left}px;top:${-top}px;overflow:visible"><path d="${path}" fill="none" stroke="var(--muted)" stroke-width="1" stroke-dasharray="5 4" /></svg>`;
        const angle = all ? -Math.PI / 2 : (start + end) / 2;
        buttonX = root.x + Math.cos(angle) * outer;
        buttonY = root.y + Math.sin(angle) * outer;
        geometry = ` data-shape="sector" data-center="${root.x},${root.y}" data-radii="${inner},${outer}" data-angles="${all ? 0 : start},${all ? Math.PI * 2 : end}"`;
      }
      controls.push(`<span class="taxon-group" data-group="${escapeHtml(group.id)}" data-members="${leaves.map((leaf) => escapeHtml(leaf.node.id)).join(",")}" style="left:${left}px;top:${top}px;width:${right - left}px;height:${bottom - top}px"${geometry} aria-hidden="true">${shape}</span>`);
      controls.push(`<button class="clade-node taxon-group-note" type="button" style="left:${buttonX}px;top:${buttonY}px" data-target="${escapeHtml(group.id)}" aria-label="분류군 설명"></button>`);
    }
    controls.push(radial
      ? `<span class="tree-root-anchor" style="left:${root.x}px;top:${root.y - 76}px"><span class="tree-root">${escapeHtml(tree.name)}</span></span>`
      : `<span class="tree-root-anchor" style="left:${root.x}px;top:${root.y}px"><span class="tree-root">${escapeHtml(tree.name)} common ancestor</span></span>`);
    return `<div class="${radial ? "radial-tree" : `phylo-tree layout-${state.layout}`} base-tree${answer ? " answer-tree" : ""}" data-size="${Math.max(width, height)}" data-width="${width}" data-height="${height}" style="width:${width}px;height:${height}px"><svg class="tree-links" width="${width}" height="${height}" aria-hidden="true">${lines.join("")}</svg>${controls.join("")}</div>`;
  }

  function renderTree(displayTree = state.tree, answer = false) {
    const content = renderPositionedTree(displayTree, answer);
    treeCanvas.innerHTML = `<div class="tree-camera">${content}</div><div class="placement-preview" aria-hidden="true" hidden></div>`;
    updateCamera();
  }

  function renderCurrentTree() {
    if (state.failed) renderTree(buildTree([...state.classified, state.currentId], speciesById, state.currentId), true);
    else renderTree();
  }

  function renderPreview(placement, targetElement) {
    const animal = state.currentId ? cardText(speciesById.get(state.currentId)) : null;
    const preview = treeCanvas.querySelector(".placement-preview");
    if (!animal || !preview || !targetElement) return;
    treeCanvas.querySelectorAll(".is-drop-target").forEach((node) => node.classList.remove("is-drop-target"));
    targetElement.classList.add("is-drop-target");
    const canvasRect = treeCanvas.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();
    const joiningBranch = placement === "join";
    preview.classList.toggle("is-join", joiningBranch);
    preview.innerHTML = `<span class="ghost-tag">${joiningBranch ? "같은 조상에 추가" : "새 공통 조상 만들기"}</span>${joiningBranch ? "" : '<span class="ghost-junction"></span>'}<span class="ghost-card">${escapeHtml(animal.commonName)}</span>`;
    preview.style.left = `${targetRect.left - canvasRect.left + targetRect.width / 2}px`;
    preview.style.top = `${targetRect.top - canvasRect.top + targetRect.height / 2}px`;
    preview.hidden = false;
  }

  function clearPreview() {
    state.previewTarget = null;
    state.previewPlacement = null;
    const preview = treeCanvas.querySelector(".placement-preview");
    if (preview) { preview.hidden = true; preview.classList.remove("is-join"); }
    treeCanvas.querySelectorAll(".is-drop-target").forEach((node) => node.classList.remove("is-drop-target"));
  }

  function updateCamera() {
    const camera = treeCanvas.querySelector(".tree-camera");
    if (!camera) return;
    camera.style.setProperty("--pan-x", `${state.panX}px`);
    camera.style.setProperty("--pan-y", `${state.panY}px`);
    camera.style.setProperty("--tree-zoom", state.zoom);
    const percent = state.zoom * 100;
    (zoomStatus || $("#tree-zoom-status")).textContent = `${percent < 1 ? percent.toFixed(1) : Math.round(percent)}%`;
  }

  function resetTreeView() {
    state.panX = 0;
    state.panY = 0;
    const tree = treeCanvas.querySelector(".base-tree");
    const width = Number(tree?.dataset.width), height = Number(tree?.dataset.height);
    state.zoom = width > 0 && height > 0
      ? Math.max(MIN_TREE_ZOOM, Math.min(1, (treeCanvas.clientWidth - 32) / width, (treeCanvas.clientHeight - 32) / height))
      : 1;
    clearPreview();
    updateCamera();
  }

  function setTreeLayout(layout) {
    if (!["top", "bottom", "radial"].includes(layout) || state.layout === layout) return;
    state.layout = layout;
    layoutControls.querySelectorAll("[data-tree-layout]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.treeLayout === layout));
    });
    clearPreview();
    renderCurrentTree();
    resetTreeView();
  }

  function zoomTree(nextZoom, clientX, clientY) {
    const boundedZoom = Math.max(MIN_TREE_ZOOM, Math.min(MAX_TREE_ZOOM, nextZoom));
    if (boundedZoom === state.zoom) return;
    const rect = treeCanvas.getBoundingClientRect();
    const pointerX = clientX - rect.left - rect.width / 2;
    const pointerY = clientY - rect.top - rect.height / 2;
    const ratio = boundedZoom / state.zoom;
    state.panX = pointerX - (pointerX - state.panX) * ratio;
    state.panY = pointerY - (pointerY - state.panY) * ratio;
    state.zoom = boundedZoom;
    clearPreview();
    updateCamera();
  }

  function zoomTreeAtCenter(factor) {
    const rect = treeCanvas.getBoundingClientRect();
    zoomTree(state.zoom * factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  return { clearPreview, renderPreview, renderTree, resetTreeView, setTreeLayout, updateCamera, zoomTree, zoomTreeAtCenter };
}

export function bindTreeNavigation(treeCanvas, state, { zoomTree, updateCamera }) {
  treeCanvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? treeCanvas.clientHeight : 1);
    zoomTree(state.zoom * Math.exp(-delta * .0012), event.clientX, event.clientY);
  }, { passive: false });
  treeCanvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target.closest("[data-target], [data-species-id], [data-ancestor-id]")) return;
    state.panning = true;
    state.panStartX = event.clientX; state.panStartY = event.clientY;
    state.panOriginX = state.panX; state.panOriginY = state.panY;
    treeCanvas.classList.add("is-panning");
    treeCanvas.setPointerCapture(event.pointerId);
  });
  treeCanvas.addEventListener("pointermove", (event) => {
    if (!state.panning) return;
    state.panX = state.panOriginX + event.clientX - state.panStartX;
    state.panY = state.panOriginY + event.clientY - state.panStartY;
    updateCamera();
  });
  function stopPanning(event) {
    if (!state.panning) return;
    state.panning = false;
    treeCanvas.classList.remove("is-panning");
    if (treeCanvas.hasPointerCapture(event.pointerId)) treeCanvas.releasePointerCapture(event.pointerId);
  }
  treeCanvas.addEventListener("pointerup", stopPanning);
  treeCanvas.addEventListener("pointercancel", stopPanning);
  treeCanvas.addEventListener("lostpointercapture", stopPanning);
}
