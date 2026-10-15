const version = new URL(import.meta.url).search;
const [{ bindTreeNavigation, createTreeView }, { createAncestorNotes, ancestorNotes, getClassIds }, { legendRanks, rankNames, rankMark }] = await Promise.all([
  import(`./tree-view.js${version}`), import(`./class-ancestors.js${version}`), import(`./rank-marks.js${version}`),
]);

export function createCollectionView({ $, buildTree, speciesById, escapeHtml, cardText, onOpenSpecies, onModeChange, getLanguage, getGuideKey }) {
  const viewport = $("#collection-tree");
  const panel = $("#collection-tree-panel");
  const page = $("#collection-page");
  const grid = $("#collection-grid");
  const buttons = document.querySelectorAll("[data-collection-view]");
  const notes = createAncestorNotes({ $, escapeHtml, getLanguage, speciesById, cardText, getGuideKey, buildTree, getCollected: () => collected });
  const state = { layout: "top", zoom: 1, panX: 0, panY: 0, panning: false, tree: null };
  const view = createTreeView({ state, treeCanvas: viewport, $, buildTree, speciesById, escapeHtml, cardText,
    layoutControls: page, zoomStatus: $("#collection-zoom-status"),
  });
  let mode = "cards", collected = [];

  function render(ids) {
    collected = ids;
    grid.hidden = mode !== "cards";
    panel.hidden = mode !== "tree";
    page.classList.toggle("collection-is-tree", mode === "tree");
    if (mode !== "tree") return;
    const ko = getLanguage() === "ko";
    const legend = $("#collection-rank-legend");
    legend.setAttribute("aria-label", ko ? "계통수 계급 범례" : "Taxonomic rank legend");
    legend.innerHTML = `<ul>${legendRanks.map((rank) => `<li>${rankMark(rank)}<span>${rankNames[rank][ko ? 0 : 1]}</span></li>`).join("")}</ul><p>${ko ? "그 외: 기타 계급·공통분기" : "Other ranks / shared branches"}</p>`;
    if (!ids.length) {
      state.tree = null;
      viewport.innerHTML = '<p class="collection-empty">아직 분류한 생물이 없어요. 분류한 동물이 이곳에 모입니다.</p>';
      return;
    }
    const collectedIds = new Set(ids);
    state.tree = buildTree([...speciesById.keys()].filter((id) => collectedIds.has(id)), speciesById, null, true);
    state.taxonGroups = Object.entries(ancestorNotes).filter(([, note]) => note.paraphyletic).map(([id]) => ({
      id, members: new Set(ids.filter((speciesId) => getClassIds(speciesById.get(speciesId)).includes(id))),
    }));
    function addClassReferences(node) {
      if (node.type === "branch") { node.children.forEach(addClassReferences); return; }
      const animal = speciesById.get(node.id);
      const supplement = animal.taxonomy.rankReview?.supplemental.class;
      if (supplement && !ancestorNotes[supplement.taxonId]?.paraphyletic && !animal.taxonomy.lineage.some((taxon) => taxon.rank === "class")) node.classReference = supplement.taxonId;
    }
    addClassReferences(state.tree);
    view.renderTree();
    viewport.querySelectorAll(".tree-pillar button, .clade-node").forEach((button) => {
      const taxonId = button.dataset.target;
      button.removeAttribute("data-target");
      if (button.classList.contains("clade-node") && notes.annotate(button, taxonId)) return;
      button.disabled = true;
      if (!button.classList.contains("ranked-taxon")) button.setAttribute("aria-hidden", "true");
    });
    viewport.querySelectorAll("[data-species-id]").forEach((button) => {
      button.setAttribute("aria-label", `${button.textContent} 카드 보기`);
    });
    if (!page.hidden && viewport.querySelector("[data-ancestor-id]")) notes.showGuide();
  }

  buttons.forEach((button) => button.addEventListener("click", () => {
    const enteringTree = mode !== "tree" && button.dataset.collectionView === "tree";
    mode = button.dataset.collectionView;
    buttons.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    render(collected);
    onModeChange(mode);
    if (enteringTree) view.resetTreeView();
  }));
  page.querySelectorAll("[data-tree-layout]").forEach((button) => button.addEventListener("click", () => {
    if (!state.tree) return;
    view.setTreeLayout(button.dataset.treeLayout);
    render(collected);
  }));
  $("#collection-zoom-in").addEventListener("click", () => view.zoomTreeAtCenter(1.25));
  $("#collection-zoom-out").addEventListener("click", () => view.zoomTreeAtCenter(.8));
  $("#collection-tree-fit").addEventListener("click", view.resetTreeView);
  viewport.addEventListener("click", (event) => {
    const button = event.target.closest("[data-species-id]");
    if (button) onOpenSpecies(button.dataset.speciesId, button);
  });
  bindTreeNavigation(viewport, state, view);
  new ResizeObserver(() => {
    if (!page.hidden && mode === "tree" && state.tree) view.resetTreeView();
  }).observe(viewport);
  return { render, isTree: () => mode === "tree", showGuide: () => {
    if (!page.hidden && mode === "tree" && viewport.querySelector("[data-ancestor-id]")) notes.showGuide();
  } };
}
