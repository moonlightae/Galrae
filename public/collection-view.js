import { createTreeView } from "./tree-view.js";

export function createCollectionView({ $, buildTree, speciesById, escapeHtml, cardText, onOpenSpecies }) {
  const viewport = $("#collection-tree");
  const panel = $("#collection-tree-panel");
  const grid = $("#collection-grid");
  const buttons = document.querySelectorAll("[data-collection-view]");
  const { renderPositionedTree } = createTreeView({ state: { layout: "top" }, speciesById, escapeHtml, cardText });
  let mode = "cards", collected = [], zoom = 1;

  function setZoom(value) {
    zoom = Math.max(.001, Math.min(1.5, value));
    const tree = viewport.querySelector(".base-tree");
    if (!tree) return;
    tree.style.transform = `scale(${zoom})`;
    tree.parentElement.style.width = `${Math.ceil(Number(tree.dataset.width) * zoom)}px`;
    tree.parentElement.style.height = `${Math.ceil(Number(tree.dataset.height) * zoom)}px`;
    $("#collection-zoom-status").textContent = `${Math.round(zoom * 100)}%`;
  }

  function render(ids) {
    collected = ids;
    grid.hidden = mode !== "cards";
    panel.hidden = mode !== "tree";
    if (mode !== "tree") return;
    if (!ids.length) {
      viewport.innerHTML = '<p class="collection-empty">아직 분류한 생물이 없어요. 분류한 동물이 이곳에 모입니다.</p>';
      return;
    }
    viewport.innerHTML = `<div class="collection-tree-size">${renderPositionedTree(buildTree(ids, speciesById))}</div>`;
    viewport.querySelectorAll(".tree-pillar button, .clade-node").forEach((button) => {
      button.disabled = true;
      button.setAttribute("aria-hidden", "true");
    });
    viewport.querySelectorAll("[data-species-id]").forEach((button) => {
      button.setAttribute("aria-label", `${button.textContent} 카드 보기`);
    });
    setZoom(zoom);
    viewport.scrollLeft = Math.max(0, (Number(viewport.querySelector(".base-tree").dataset.width) * zoom - viewport.clientWidth) / 2);
  }

  buttons.forEach((button) => button.addEventListener("click", () => {
    mode = button.dataset.collectionView;
    buttons.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    render(collected);
  }));
  $("#collection-zoom-in").addEventListener("click", () => setZoom(zoom * 1.25));
  $("#collection-zoom-out").addEventListener("click", () => setZoom(zoom / 1.25));
  $("#collection-tree-fit").addEventListener("click", () => {
    const tree = viewport.querySelector(".base-tree");
    if (!tree) return;
    setZoom(Math.min(1, (viewport.clientWidth - 16) / Number(tree.dataset.width), (viewport.clientHeight - 16) / Number(tree.dataset.height)));
    viewport.scrollTo(0, 0);
  });
  viewport.addEventListener("click", (event) => {
    const button = event.target.closest("[data-species-id]");
    if (button) onOpenSpecies(button.dataset.speciesId, button);
  });
  return { render };
}
