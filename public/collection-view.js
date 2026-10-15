const version = new URL(import.meta.url).search;
const [{ bindTreeNavigation, createTreeView }, { createAncestorNotes, ancestorNotes, getClassIds }, { legendRanks, rankNames, rankMark }] = await Promise.all([
  import(`./tree-view.js${version}`), import(`./class-ancestors.js${version}`), import(`./rank-marks.js${version}`),
]);

export function createCollectionView({ $, buildTree, speciesById, escapeHtml, cardText, onOpenSpecies, onModeChange, getLanguage, getGuideKey, getTaxonName = () => null }) {
  const viewport = $("#collection-tree");
  const panel = $("#collection-tree-panel");
  const page = $("#collection-page");
  const grid = $("#collection-grid");
  const search = $("#collection-branch-query");
  const results = $("#collection-branch-results");
  const searchStatus = $("#collection-branch-status");
  const buttons = document.querySelectorAll("[data-collection-view]");
  const notes = createAncestorNotes({ $, escapeHtml, getLanguage, speciesById, cardText, getGuideKey, buildTree, getCollected: () => collected });
  const state = { layout: "top", zoom: 1, panX: 0, panY: 0, panning: false, tree: null };
  const view = createTreeView({ state, treeCanvas: viewport, $, buildTree, speciesById, escapeHtml, cardText,
    layoutControls: page, zoomStatus: $("#collection-zoom-status"),
  });
  let mode = "cards", collected = [];
  let searchableBranches = [], matches = [], selectedBranch = null;

  function renderSearchResults() {
    const ko = getLanguage() === "ko";
    search.placeholder = ko ? "분기점 검색" : "Search branches";
    search.setAttribute("aria-label", search.placeholder);
    const query = (search.value || "").trim().toLocaleLowerCase();
    matches = query ? searchableBranches.filter((branch) => `${branch.koName} ${branch.name}`.toLocaleLowerCase().includes(query)) : [];
    results.hidden = !query;
    results.innerHTML = matches.length
      ? matches.map((branch) => `<li><button type="button" data-branch-search-id="${escapeHtml(branch.id)}"><span>${escapeHtml(ko ? branch.koName : branch.name)}</span><small>${escapeHtml(ko ? branch.name : branch.koName)}</small></button></li>`).join("")
      : query ? `<li class="branch-search-empty">${ko ? "현재 계통수에 일치하는 분기점이 없습니다." : "No matching branch in this tree."}</li>` : "";
    searchStatus.textContent = query ? ko ? `${matches.length}개 분기점` : `${matches.length} matching branches` : "";
  }

  function focusBranch(id) {
    const branch = searchableBranches.find((entry) => entry.id === id);
    if (!branch) return;
    viewport.querySelectorAll(".is-search-match").forEach((button) => button.classList.remove("is-search-match"));
    selectedBranch = id;
    branch.button.classList.add("is-search-match");
    view.zoomTreeAtCenter(Math.max(state.zoom, .9) / state.zoom);
    const target = branch.button.getBoundingClientRect();
    const canvas = viewport.getBoundingClientRect();
    state.panX += canvas.left + canvas.width / 2 - target.left - target.width / 2;
    state.panY += canvas.top + canvas.height / 2 - target.top - target.height / 2;
    view.updateCamera();
    results.hidden = true;
    searchStatus.textContent = getLanguage() === "ko" ? `${branch.koName} 위치로 이동했습니다.` : `Moved to ${branch.name}.`;
  }
  search.addEventListener("input", renderSearchResults);
  search.addEventListener("focus", renderSearchResults);
  search.addEventListener("keydown", (event) => { if (event.key === "Escape") results.hidden = true; });
  $("#collection-branch-search").addEventListener("submit", (event) => { event.preventDefault(); if (matches[0]) focusBranch(matches[0].id); });
  results.addEventListener("click", (event) => {
    const button = event.target.closest("[data-branch-search-id]");
    if (button) focusBranch(button.dataset.branchSearchId);
  });

  function render(ids) {
    collected = ids;
    grid.hidden = mode !== "cards";
    panel.hidden = mode !== "tree";
    page.classList.toggle("collection-is-tree", mode === "tree");
    if (mode !== "tree") return;
    const ko = getLanguage() === "ko";
    searchableBranches = [];
    const legend = $("#collection-rank-legend");
    legend.setAttribute("aria-label", ko ? "계통수 계급 범례" : "Taxonomic rank legend");
    legend.innerHTML = `<ul>${legendRanks.map((rank) => `<li>${rankMark(rank)}<span>${rankNames[rank][ko ? 0 : 1]}</span></li>`).join("")}</ul><p>${ko ? "그 외: 기타 계급·공통분기" : "Other ranks / shared branches"}</p>`;
    if (!ids.length) {
      state.tree = null;
      viewport.innerHTML = '<p class="collection-empty">아직 분류한 생물이 없어요. 분류한 동물이 이곳에 모입니다.</p>';
      renderSearchResults();
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
    const branchNames = new Map();
    function indexNames(node) {
      if (node.type === "leaf") return;
      branchNames.set(node.id, node.name);
      node.children.forEach(indexNames);
    }
    indexNames(state.tree);
    view.renderTree();
    viewport.querySelectorAll(".tree-pillar button, .clade-node").forEach((button) => {
      const taxonId = button.dataset.target;
      button.removeAttribute("data-target");
      if (button.classList.contains("clade-node")) {
        const note = ancestorNotes[taxonId];
        if (!searchableBranches.some((branch) => branch.id === taxonId)) searchableBranches.push({ id: taxonId, button,
          name: note?.name || branchNames.get(taxonId) || taxonId,
          koName: note?.koName || getTaxonName(taxonId) || branchNames.get(taxonId) || taxonId,
        });
        button.classList.toggle("is-search-match", taxonId === selectedBranch);
      }
      if (button.classList.contains("clade-node") && notes.annotate(button, taxonId)) return;
      button.disabled = true;
      if (!button.classList.contains("ranked-taxon")) button.setAttribute("aria-hidden", "true");
    });
    viewport.querySelectorAll("[data-species-id]").forEach((button) => {
      button.setAttribute("aria-label", `${button.textContent} 카드 보기`);
    });
    renderSearchResults();
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
