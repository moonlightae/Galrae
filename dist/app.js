const { ANIMALIA_ID, buildTree, getExpectedPlacement, shuffle } = GalraeLogic;
const HUMAN_ID = "homo-sapiens";
const COLLECTION_KEY = "galrae.collection.v2";

const $ = (selector) => document.querySelector(selector);
const lobby = $("#lobby");
const game = $("#game");
const card = $("#active-card");
const toast = $("#toast");
const treeCanvas = $("#tree-canvas");

let dataset = null;
let animals = [];
let speciesById = new Map();

const state = {
  queue: [], round: 0, score: 0, selected: false, tree: null,
  classified: [HUMAN_ID], newest: null, currentId: null, expected: null,
  previewTarget: null, previewPlacement: null, failed: false,
  panX: 0, panY: 0, panning: false, panStartX: 0, panStartY: 0,
  panOriginX: 0, panOriginY: 0,
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  }[character]));
}

function shortDescription(text, maxLength = 190) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  const firstSentence = clean.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim() || clean;
  if (firstSentence.length <= maxLength) return firstSentence;
  return `${firstSentence.slice(0, maxLength - 1).trimEnd()}…`;
}

function taxonomyLabels(animal) {
  const preferredRanks = new Set(["phylum", "class", "order", "family", "genus"]);
  const labels = animal.taxonomy.lineage
    .filter((taxon) => preferredRanks.has(taxon.rank) && taxon.rank !== "species")
    .slice(-5)
    .map((taxon) => taxon.scientificName);
  return labels.length ? labels : animal.taxonomy.lineage.slice(-4, -1).map((taxon) => taxon.scientificName);
}

function getCollection() {
  try {
    const stored = JSON.parse(localStorage.getItem(COLLECTION_KEY));
    return Array.isArray(stored) ? stored.filter((id) => speciesById.has(id)) : [];
  } catch { return []; }
}

function setCollection(ids) {
  const valid = [...new Set(ids)].filter((id) => speciesById.has(id));
  localStorage.setItem(COLLECTION_KEY, JSON.stringify(valid));
}

function migrateCollection() {
  let old = [];
  try { old = JSON.parse(localStorage.getItem("galrae.collection")) || []; } catch { old = []; }
  const current = getCollection();
  const hadHuman = old.includes("human") || old.includes(HUMAN_ID) || current.includes(HUMAN_ID);
  const migrated = [...current, ...(hadHuman ? [HUMAN_ID] : [])];
  setCollection(migrated.length ? migrated : [HUMAN_ID]);
  localStorage.removeItem("galrae.collection");
}

function saveCollection(ids) { setCollection([...getCollection(), ...ids]); }

function imageCreditText(animal) {
  const artist = String(animal.image.artist || "Unknown creator").replace(/\s+/g, " ").trim();
  const shortArtist = artist.length > 70 ? `${artist.slice(0, 67)}…` : artist;
  return `${shortArtist} · ${animal.image.license}`;
}

function renderCollection() {
  const collected = getCollection();
  $("#collection-count").textContent = `${collected.length}종 발견`;
  const grid = $("#collection-grid");
  if (!collected.length) {
    grid.innerHTML = '<div class="collection-empty">아직 분류한 생물이 없어요.<br />동물계 분류를 시작해 첫 카드를 모아보세요.</div>';
    return;
  }
  grid.innerHTML = collected.map((id) => {
    const animal = speciesById.get(id);
    const groups = taxonomyLabels(animal).map((group) => `<span>${escapeHtml(group)}</span>`).join("");
    return `<article class="mini-card">
      <div class="mini-card-art"><img loading="lazy" src="${escapeHtml(animal.image.thumbnailUrl)}" alt="${escapeHtml(animal.commonName)}" /></div>
      <small>ANIMALIA</small><h3>${escapeHtml(animal.commonName)}</h3>
      <p class="mini-scientific"><i>${escapeHtml(animal.scientificName)}</i></p>
      <p>${escapeHtml(shortDescription(animal.description, 145))}</p>
      <div class="mini-card-groups" aria-label="Taxonomy">${groups}</div>
      <a class="mini-card-credit" href="${escapeHtml(animal.image.commonsPageUrl)}" target="_blank" rel="noreferrer">${escapeHtml(imageCreditText(animal))}</a>
    </article>`;
  }).join("");
}

function renderNode(node) {
  if (node.type === "leaf") {
    const animal = speciesById.get(node.id);
    const fresh = state.newest === node.id ? " is-new" : "";
    const preview = node.preview ? " is-preview" : "";
    const badge = node.preview ? `<span class="preview-tag">${state.failed ? "정답 위치" : "미리보기"}</span>` : "";
    return `<button class="species-node${fresh}${preview}" type="button" data-target="${escapeHtml(node.id)}" data-placement="wrap" aria-label="${escapeHtml(animal.commonName)}에 새 공통 조상 만들기">${escapeHtml(animal.commonName)}${badge}</button>`;
  }
  const children = node.children.map((child) => `<li>${renderNode(child)}</li>`).join("");
  return `<span class="branch-anchor"><button class="edge-target" type="button" data-target="${escapeHtml(node.id)}" data-placement="wrap" aria-label="이 분기점 위에 새로운 공통 조상 만들기"></button><button class="clade-node" type="button" data-target="${escapeHtml(node.id)}" data-placement="join" aria-label="이 공통 조상에 가지 추가하기"></button></span><ul>${children}</ul>`;
}

function renderTree(displayTree = state.tree, answer = false) {
  const isAnimaliaRoot = displayTree.type === "branch" && displayTree.id === ANIMALIA_ID;
  const rootTarget = isAnimaliaRoot ? ANIMALIA_ID : displayTree.id;
  const rootPlacement = isAnimaliaRoot ? "join" : "wrap";
  const treeContent = isAnimaliaRoot
    ? `<ul>${displayTree.children.map((child) => `<li>${renderNode(child)}</li>`).join("")}</ul>`
    : `<ul><li>${renderNode(displayTree)}</li></ul>`;
  treeCanvas.innerHTML = `<div class="tree-camera"><div class="phylo-tree base-tree${answer ? " answer-tree" : ""}"><button class="tree-root" type="button" data-target="${escapeHtml(rootTarget)}" data-placement="${rootPlacement}" aria-label="Animalia 공통 조상에 배치">Animalia common ancestor</button>${treeContent}</div></div><div class="placement-preview" aria-hidden="true" hidden></div>`;
  updateCamera();
}

function renderPreview(placement, targetElement) {
  const animal = speciesById.get(state.currentId);
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
}

function setCard(speciesId) {
  const animal = speciesById.get(speciesId);
  const image = $("#active-image");
  const fallback = $("#active-image-fallback");
  $("#active-name").textContent = animal.commonName;
  $("#active-description").textContent = shortDescription(animal.description);
  $("#active-scientific").textContent = animal.scientificName;
  $("#active-number").textContent = String(state.round + 1).padStart(2, "0");
  image.src = animal.image.thumbnailUrl;
  image.alt = animal.commonName;
  image.hidden = false;
  fallback.hidden = true;
  image.onerror = () => { image.hidden = true; fallback.hidden = false; };
  const credit = $("#active-credit");
  credit.href = animal.image.commonsPageUrl;
  credit.textContent = `Image: ${imageCreditText(animal)}`;
  card.setAttribute("aria-label", `${animal.commonName} card. Select it, then choose a position in the tree.`);
}

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { toast.hidden = true; }, 1800);
}

function placeCard(targetId, placement = "wrap") {
  if (!state.currentId || state.failed) return;
  clearPreview();
  if (targetId !== state.expected.targetId || placement !== state.expected.placement) {
    failRound();
    return;
  }
  state.classified.push(state.currentId);
  state.newest = state.currentId;
  state.tree = buildTree(state.classified, speciesById);
  state.score += 1;
  state.round += 1;
  state.selected = false;
  card.classList.remove("is-selected");
  renderTree();
  updateRound();
}

function failRound() {
  state.failed = true;
  state.selected = false;
  card.classList.remove("is-selected", "is-dragging");
  card.classList.add("is-locked");
  card.setAttribute("draggable", "false");
  const answerTree = buildTree([...state.classified, state.currentId], speciesById, state.currentId);
  renderTree(answerTree, true);
  $("#failure-panel").hidden = false;
  $("#retry-game").focus();
}

function updateRound() {
  $("#score-label").textContent = `정답 ${state.score}`;
  if (state.round >= state.queue.length) {
    saveCollection(state.classified);
    $("#result-count").textContent = state.classified.length;
    $("#result-copy").textContent = `${state.classified.length} species, including Human, were placed in the Animalia tree.`;
    $("#result-modal").hidden = false;
    return;
  }
  state.currentId = state.queue[state.round];
  state.expected = getExpectedPlacement(state.classified, state.currentId, speciesById);
  setCard(state.currentId);
  $("#round-label").textContent = `동물계 · ${state.round + 1}/${state.queue.length}`;
}

function startGame() {
  if (!dataset) return;
  state.queue = shuffle(animals.filter((animal) => animal.id !== HUMAN_ID).map((animal) => animal.id));
  state.round = 0; state.score = 0; state.selected = false;
  state.classified = [HUMAN_ID];
  state.tree = buildTree(state.classified, speciesById);
  state.newest = null; state.currentId = null; state.expected = null;
  state.previewTarget = null; state.previewPlacement = null; state.failed = false;
  state.panX = 0; state.panY = 0; state.panning = false;
  card.classList.remove("is-selected", "is-dragging", "is-locked");
  card.setAttribute("draggable", "true");
  lobby.hidden = true; game.hidden = false;
  $("#result-modal").hidden = true;
  $("#failure-panel").hidden = true;
  renderTree();
  updateRound();
  window.scrollTo(0, 0);
}

function returnToLobby() {
  game.hidden = true;
  $("#result-modal").hidden = true;
  lobby.hidden = false;
  renderCollection();
  window.scrollTo(0, 0);
}

async function initialize() {
  const startButton = $("#start-game");
  try {
    const response = await fetch("data/animals.json");
    if (!response.ok) throw new Error(`Dataset request failed: ${response.status}`);
    dataset = await response.json();
    animals = dataset.animals;
    speciesById = new Map(animals.map((animal) => [animal.id, animal]));
    if (!speciesById.has(HUMAN_ID)) throw new Error("Human is missing from the dataset");
    migrateCollection();
    renderCollection();
    startButton.disabled = false;
    startButton.innerHTML = '분류 시작 <span aria-hidden="true">→</span>';
  } catch (error) {
    console.error(error);
    startButton.textContent = "데이터를 불러오지 못했어요";
    showToast("동물 데이터셋을 불러오지 못했습니다.");
  }
}

card.addEventListener("dragstart", (event) => {
  if (state.failed) { event.preventDefault(); return; }
  event.dataTransfer.setData("text/plain", "species-card");
  card.classList.add("is-dragging");
});
card.addEventListener("dragend", () => {
  card.classList.remove("is-dragging");
  if (!state.failed) clearPreview();
});
card.addEventListener("click", () => {
  if (state.failed) return;
  state.selected = !state.selected;
  card.classList.toggle("is-selected", state.selected);
});
card.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") { event.preventDefault(); card.click(); }
});

$("#start-game").addEventListener("click", startGame);
$("#quit-game").addEventListener("click", returnToLobby);
$("#return-lobby").addEventListener("click", returnToLobby);
$("#retry-game").addEventListener("click", startGame);

treeCanvas.addEventListener("click", (event) => {
  const target = event.target.closest("[data-target]");
  if (!target || state.failed || !state.selected) return;
  placeCard(target.dataset.target, target.dataset.placement || "wrap");
});
treeCanvas.addEventListener("dragover", (event) => {
  if (state.failed) return;
  const target = event.target.closest("[data-target]");
  if (!target || !treeCanvas.contains(target)) { clearPreview(); return; }
  event.preventDefault();
  const targetId = target.dataset.target;
  const placement = target.dataset.placement || "wrap";
  if (state.previewTarget !== targetId || state.previewPlacement !== placement) {
    state.previewTarget = targetId;
    state.previewPlacement = placement;
    renderPreview(placement, target);
  }
});
treeCanvas.addEventListener("dragleave", (event) => {
  if (state.failed || !state.previewTarget) return;
  const target = event.target.closest("[data-target]");
  if (!target || target.dataset.target !== state.previewTarget || (target.dataset.placement || "wrap") !== state.previewPlacement) return;
  const next = event.relatedTarget;
  if (!next || !target.contains(next)) clearPreview();
});
treeCanvas.addEventListener("drop", (event) => {
  if (state.failed || !state.previewTarget) return;
  event.preventDefault();
  const targetId = state.previewTarget;
  const placement = state.previewPlacement || "wrap";
  placeCard(targetId, placement);
});
treeCanvas.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || event.target.closest("[data-target]")) return;
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

initialize();
