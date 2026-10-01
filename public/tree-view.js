export function createTreeView({ ANIMALIA_ID, buildTree, escapeHtml, speciesById, state, treeCanvas, $, cardText }) {
  const MIN_TREE_ZOOM = 0.03;
  const MAX_TREE_ZOOM = 3.5;

  function renderNode(node, omitIncomingEdge = false) {
    if (node.type === "leaf") {
      const animal = cardText(speciesById.get(node.id));
      const fresh = state.newest === node.id ? " is-new" : "";
      const preview = node.preview ? " is-preview" : "";
      const badge = node.preview ? `<span class="preview-tag">${state.failed ? "정답 위치" : "미리보기"}</span>` : "";
      return `<button class="species-node${fresh}${preview}" type="button" data-species-id="${escapeHtml(node.id)}" data-target="${escapeHtml(node.id)}" data-placement="wrap" aria-label="${escapeHtml(animal.commonName)} 카드 보기. 새 카드를 선택한 상태에서는 이 가지에 배치">${escapeHtml(animal.commonName)}${badge}</button>`;
    }
    const children = node.children.map((child) => `<li>${renderNode(child)}</li>`).join("");
    const incomingEdge = omitIncomingEdge ? "" : `<button class="edge-target" type="button" data-target="${escapeHtml(node.id)}" data-placement="wrap" aria-label="이 가지에서 새로운 공통 조상 만들기"></button>`;
    return `<span class="branch-anchor">${incomingEdge}<button class="clade-node" type="button" data-target="${escapeHtml(node.id)}" data-placement="join" aria-label="이 공통 조상에 가지 추가하기"></button></span><ul>${children}</ul>`;
  }

  function layoutRadialTree(tree) {
    const leafCount = (node) => node.type === "leaf" ? 1 : node.children.reduce((count, child) => count + leafCount(child), 0);
    const deepestBranch = (node, depth = 0) => node.type === "leaf"
      ? depth - 1 : Math.max(depth, ...node.children.map((child) => deepestBranch(child, depth + 1)));
    const count = Math.max(leafCount(tree), 1);
    const branchDepth = Math.max(deepestBranch(tree), 0);
    const radius = Math.max(220, count * 148 / (2 * Math.PI), (branchDepth + 1) * 96);
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

  function renderRadialTree(tree, answer) {
    const { root, size } = layoutRadialTree(tree);
    const lines = [];
    const controls = [];
    function visit(entry, parent = null) {
      const { node, x, y } = entry;
      if (parent) {
        lines.push(`<line class="radial-edge${node.preview ? " is-answer-path" : ""}" x1="${parent.x}" y1="${parent.y}" x2="${x}" y2="${y}" />`);
        if (node.type === "branch" && !(parent === root && root.children.length === 1)) {
          const edgeX = Math.round((parent.x + (x - parent.x) * .76) * 10) / 10;
          const edgeY = Math.round((parent.y + (y - parent.y) * .76) * 10) / 10;
          controls.push(`<button class="radial-edge-target" type="button" style="left:${edgeX}px;top:${edgeY}px" data-target="${escapeHtml(node.id)}" data-placement="wrap" aria-label="이 가지에서 새로운 공통 조상 만들기"></button>`);
        }
      }
      if (node.type === "leaf") {
        const animal = cardText(speciesById.get(node.id));
        const fresh = state.newest === node.id ? " is-new" : "";
        const preview = node.preview ? " is-preview" : "";
        const badge = node.preview ? `<span class="preview-tag">${state.failed ? "정답 위치" : "미리보기"}</span>` : "";
        controls.push(`<button class="species-node${fresh}${preview}" type="button" style="left:${x}px;top:${y}px" data-species-id="${escapeHtml(node.id)}" data-target="${escapeHtml(node.id)}" data-placement="wrap" aria-label="${escapeHtml(animal.commonName)} 카드 보기. 새 카드를 선택한 상태에서는 이 가지에 배치">${escapeHtml(animal.commonName)}${badge}</button>`);
      } else if (parent) {
        controls.push(`<button class="clade-node" type="button" style="left:${x}px;top:${y}px" data-target="${escapeHtml(node.id)}" data-placement="join" aria-label="이 공통 조상에 가지 추가하기"></button>`);
      }
      for (const child of entry.children) visit(child, entry);
    }
    visit(root);
    controls.push(`<button class="radial-root-target tree-root" type="button" style="left:${root.x}px;top:${root.y}px" data-target="${ANIMALIA_ID}" data-placement="top" aria-label="동물계 전체 가지에 배치">Animalia</button>`);
    return `<div class="radial-tree base-tree${answer ? " answer-tree" : ""}" data-size="${size}" style="width:${size}px;height:${size}px"><svg class="radial-links" width="${size}" height="${size}" aria-hidden="true">${lines.join("")}</svg>${controls.join("")}</div>`;
  }

  function renderTree(displayTree = state.tree, answer = false) {
    let content;
    if (state.layout === "radial") {
      content = renderRadialTree(displayTree, answer);
    } else {
      const singleRootChild = displayTree.children.length === 1;
      const treeContent = `<ul>${displayTree.children.map((child) => `<li>${renderNode(child, singleRootChild)}</li>`).join("")}</ul>`;
      const rootControl = `<span class="tree-root-anchor"><span class="tree-root">Animalia common ancestor</span><button class="root-wrap-target${singleRootChild ? " is-long" : ""}" type="button" data-target="${ANIMALIA_ID}" data-placement="top" aria-label="동물계 전체 가지에 배치"></button></span>`;
      content = `<div class="phylo-tree base-tree layout-${state.layout}${answer ? " answer-tree" : ""}">${rootControl}${treeContent}</div>`;
    }
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
    const radial = treeCanvas.querySelector(".radial-tree");
    const size = Number(radial?.dataset.size);
    state.zoom = radial && size > 0
      ? Math.max(MIN_TREE_ZOOM, Math.min(1, (treeCanvas.clientWidth - 32) / size, (treeCanvas.clientHeight - 32) / size))
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
