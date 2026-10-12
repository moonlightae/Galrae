export function createTreeView({ ANIMALIA_ID, buildTree, escapeHtml, speciesById, state, treeCanvas, $, cardText }) {
  const MIN_TREE_ZOOM = 0.03;
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
      return `<button class="species-node${fresh}${preview}${mistake}" type="button" style="left:${x}px;top:${y}px" data-species-id="${escapeHtml(node.id)}" data-target="${escapeHtml(node.id)}" data-placement="wrap" aria-label="${escapeHtml(animal.commonName)} 카드 보기. 새 카드를 선택한 상태에서는 이 가지에 배치">${escapeHtml(animal.commonName)}${badge}</button>`;
  }

  function layoutRectangularTree(tree) {
    const gap = 56;
    const levelHeight = 152;
    function arrange(node) {
      const children = node.type === "leaf" ? [] : node.children.map(arrange);
      const halfWidth = node.type === "leaf" ? 84 : node === tree ? 96 : 9;
      const left = [], right = [];
      for (const child of children) {
        const compactOffset = left.length ? Math.max(...child.left.map((value, depth) => depth < right.length ? right[depth] + gap - value : 0)) : 0;
        const spaciousOffset = left.length ? Math.max(...right) + gap - Math.min(...child.left) : 0;
        // Reserve some space for the whole subtree without returning to the old excessive width.
        child.offset = compactOffset + (spaciousOffset - compactOffset) * .35;
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
      entry.x = x; entry.y = 48 + depth * levelHeight;
      entry.children.forEach((child) => position(child, x + child.offset, depth + 1));
    }
    position(root, 24 - min, 0);
    return { root, width: max - min + 48, height: (root.left.length - 1) * levelHeight + 120 };
  }

  function layoutRadialTree(tree) {
    const leafCount = (node) => node.type === "leaf" ? 1 : node.children.reduce((count, child) => count + leafCount(child), 0);
    const deepestBranch = (node, depth = 0) => node.type === "leaf"
      ? depth - 1 : Math.max(depth, ...node.children.map((child) => deepestBranch(child, depth + 1)));
    const count = Math.max(leafCount(tree), 1);
    const branchDepth = Math.max(deepestBranch(tree), 0);
    const radius = Math.max(260, count * 224 / (2 * Math.PI), (branchDepth + 1) * 112);
    const size = Math.ceil((radius + 120) * 2);
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
    function visit(entry, parent = null) {
      const { node, x, y } = entry;
      if (parent) {
        const edgeClass = `tree-edge${node.preview ? " is-answer-path" : ""}${state.mistakes?.has(node.id) ? " is-mistake-path" : ""}${state.latestMistake === node.id ? " is-recent-mistake-path" : ""}`;
        const middleY = (parent.y + y) / 2;
        lines.push(radial
          ? `<line class="${edgeClass}" x1="${parent.x}" y1="${parent.y}" x2="${x}" y2="${y}" />`
          : `<path class="${edgeClass}" d="M${parent.x} ${parent.y} V${middleY} H${x} V${y}" />`);
        if (node.type === "branch" && !(parent === root && root.children.length === 1)) {
          const edgeX = radial ? Math.round((parent.x + (x - parent.x) * .76) * 10) / 10 : x;
          const edgeY = Math.round((parent.y + (y - parent.y) * .76) * 10) / 10;
          controls.push(`<button class="${radial ? "radial-edge-target" : "edge-target"}" type="button" style="left:${edgeX}px;top:${edgeY}px" data-target="${escapeHtml(node.id)}" data-placement="wrap" aria-label="이 가지에서 새로운 공통 조상 만들기"></button>`);
        }
      }
      if (node.type === "leaf") {
        controls.push(renderNode(node, x, y));
      } else if (parent) {
        controls.push(`<button class="clade-node" type="button" style="left:${x}px;top:${y}px" data-target="${escapeHtml(node.id)}" data-placement="join" aria-label="이 공통 조상에 가지 추가하기"></button>`);
      }
      for (const child of entry.children) visit(child, entry);
    }
    visit(root);
    const firstChild = root.children[0];
    let trunkEnd = root.y;
    if (!radial && firstChild) {
      trunkEnd = (root.y + firstChild.y) / 2;
      if (root.children.length === 1) trunkEnd = firstChild.y - (firstChild.node.type === "leaf" ? 36 : 9);
    }
    const trunkHeight = Math.max(0, trunkEnd - root.y - 16);
    controls.push(radial
      ? `<button class="radial-root-target tree-root" type="button" style="left:${root.x}px;top:${root.y}px" data-target="${ANIMALIA_ID}" data-placement="top" aria-label="동물계 전체 가지에 배치">Animalia</button>`
      : `<span class="tree-root-anchor" style="left:${root.x}px;top:${root.y}px"><span class="tree-root">Animalia common ancestor</span><button class="root-wrap-target${root.children.length === 1 ? " is-long" : ""}" type="button" style="height:${trunkHeight}px" data-target="${ANIMALIA_ID}" data-placement="top" aria-label="동물계 전체 가지에 배치"></button></span>`);
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
    preview.innerHTML = `<span class="ghost-tag">${joiningBranch ? "같은 조상에 추가" : "미리보기"}</span>${joiningBranch ? "" : '<span class="ghost-junction"></span>'}<span class="ghost-card">${escapeHtml(animal.commonName)}</span>`;
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
    $("#tree-zoom-status").textContent = `${Math.round(state.zoom * 100)}%`;
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
    document.querySelectorAll("[data-tree-layout]").forEach((button) => {
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
