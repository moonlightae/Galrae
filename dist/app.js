const SPECIES = {
  human: { name: "인간", scientific: "Homo sapiens", description: "두 발로 걷고 언어와 도구를 사용하는 영장류입니다.", groups: ["후생동물", "좌우대칭동물", "후구동물", "척추동물", "포유류", "사람족"] },
  ant: { name: "개미", scientific: "Formicidae", description: "작은 몸으로 거대한 군체를 이루어 생활하는 곤충입니다.", groups: ["후생동물", "좌우대칭동물", "원구동물", "벌목"] },
  sponge: { name: "해면동물", scientific: "Porifera", description: "몸에 난 작은 구멍으로 물을 걸러 먹는 해양 동물입니다.", groups: ["후생동물"] },
  starfish: { name: "불가사리", scientific: "Asteroidea", description: "오방사 대칭의 몸과 관족을 가진 해양 무척추동물입니다.", groups: ["후생동물", "좌우대칭동물", "후구동물"] },
  cat: { name: "고양이", scientific: "Felis catus", description: "예민한 감각과 유연한 몸을 지닌 육식성 포유류입니다.", groups: ["후생동물", "좌우대칭동물", "후구동물", "척추동물", "포유류"] },
  bee: { name: "꿀벌", scientific: "Apis mellifera", description: "꽃가루를 옮기며 군체를 이루어 생활하는 곤충입니다.", groups: ["후생동물", "좌우대칭동물", "원구동물", "벌목"] },
  salmon: { name: "연어", scientific: "Salmo salar", description: "민물과 바다를 오가며 긴 거리를 이동하는 물고기입니다.", groups: ["후생동물", "좌우대칭동물", "후구동물", "척추동물"] },
  octopus: { name: "문어", scientific: "Octopoda", description: "여덟 개의 팔과 뛰어난 문제 해결 능력을 가진 연체동물입니다.", groups: ["후생동물", "좌우대칭동물", "원구동물"] },
  chimp: { name: "침팬지", scientific: "Pan troglodytes", description: "도구를 사용하고 복잡한 사회생활을 하는 영장류입니다.", groups: ["후생동물", "좌우대칭동물", "후구동물", "척추동물", "포유류", "사람족"] },
  shark: { name: "상어", scientific: "Selachimorpha", description: "단단한 뼈 대신 연골로 된 골격을 가진 물고기입니다.", groups: ["후생동물", "좌우대칭동물", "후구동물", "척추동물"] },
};

const ROUNDS = [
  { id: "ant", target: "human", clade: { id: "bilateria", name: "좌우대칭동물" }, automatic: true },
  { id: "sponge", target: "bilateria", clade: { id: "metazoa", name: "후생동물" } },
  { id: "starfish", target: "human", clade: { id: "deuterostome", name: "후구동물" } },
  { id: "cat", target: "human", clade: { id: "mammal", name: "포유류" } },
  { id: "bee", target: "ant", clade: { id: "hymenoptera", name: "벌목" } },
  { id: "salmon", target: "mammal", clade: { id: "bony-vertebrate", name: "경골어류·사지동물" } },
  { id: "octopus", target: "hymenoptera", clade: { id: "protostome", name: "원구동물" } },
  { id: "chimp", target: "human", clade: { id: "hominini", name: "사람족" } },
  { id: "shark", target: "bony-vertebrate", clade: { id: "vertebrate", name: "척추동물" } },
];

const $ = (selector) => document.querySelector(selector);
const lobby = $("#lobby");
const game = $("#game");
const card = $("#active-card");
const toast = $("#toast");
const treeCanvas = $("#tree-canvas");

function leaf(id, preview = false) { return { type: "leaf", id, preview }; }
function branch(id, name, children, preview = false) { return { type: "branch", id, name, children, preview }; }

const state = {
  round: 0,
  score: 0,
  selected: false,
  tree: leaf("human"),
  classified: ["human"],
  newest: null,
  previewTarget: null,
  failed: false,
  panX: 0,
  panY: 0,
  panning: false,
  panStartX: 0,
  panStartY: 0,
  panOriginX: 0,
  panOriginY: 0,
};

function getCollection() {
  try { return JSON.parse(localStorage.getItem("galrae.collection")) || []; }
  catch { return []; }
}

function saveCollection(ids) {
  const merged = [...new Set([...getCollection(), ...ids])];
  localStorage.setItem("galrae.collection", JSON.stringify(merged));
}

function renderCollection() {
  const collected = getCollection().filter((id) => SPECIES[id]);
  $("#collection-count").textContent = `${collected.length}종 발견`;
  const grid = $("#collection-grid");
  if (!collected.length) {
    grid.innerHTML = '<div class="collection-empty">아직 분류한 생물이 없어요.<br />동물계 분류를 시작해 첫 카드를 모아보세요.</div>';
    return;
  }
  grid.innerHTML = collected.map((id) => {
    const species = SPECIES[id];
    const groups = species.groups.map((group) => `<span>${group}</span>`).join("");
    return `<article class="mini-card"><div class="mini-card-art"></div><small>ANIMALIA</small><h3>${species.name}</h3><p>${species.description}</p><div class="mini-card-groups" aria-label="분류군">${groups}</div></article>`;
  }).join("");
}

function insertAt(node, targetId, newSpeciesId, clade, preview = false) {
  if (node.id === targetId) return branch(clade.id, clade.name, [node, leaf(newSpeciesId, preview)], preview);
  if (node.type === "branch") {
    return { ...node, children: node.children.map((child) => insertAt(child, targetId, newSpeciesId, clade, preview)) };
  }
  return node;
}

function renderNode(node) {
  if (node.type === "leaf") {
    const fresh = state.newest === node.id ? " is-new" : "";
    const preview = node.preview ? " is-preview" : "";
    const badge = node.preview ? `<span class="preview-tag">${state.failed ? "정답 위치" : "미리보기"}</span>` : "";
    const action = node.preview ? "" : ` onclick="chooseTarget('${node.id}')"`;
    return `<button class="species-node${fresh}${preview}" type="button" data-target="${node.id}" aria-label="${SPECIES[node.id].name}에 배치"${action}>${SPECIES[node.id].name}${badge}</button>`;
  }
  const children = node.children.map((child) => `<li>${renderNode(child)}</li>`).join("");
  if (node.preview) {
    return `<span class="clade-node is-preview" aria-hidden="true"></span><ul class="preview-branches">${children}</ul>`;
  }
  return `<button class="clade-node" type="button" data-target="${node.id}" aria-label="이름 없는 분기점에 배치" onclick="chooseTarget('${node.id}')"></button><ul>${children}</ul>`;
}

function renderTree(displayTree = state.tree, answer = false) {
  const rootTarget = displayTree.id;
  treeCanvas.innerHTML = `<div class="tree-camera"><div class="phylo-tree base-tree${answer ? " answer-tree" : ""}"><button class="tree-root" type="button" data-target="${rootTarget}" aria-label="현재 계통수 전체보다 바깥에 배치" onclick="chooseTarget('${rootTarget}')">동물계 공통 조상</button><ul><li>${renderNode(displayTree)}</li></ul></div></div><div class="placement-preview" aria-hidden="true" hidden></div>`;
  updateCamera();
}

function chooseTarget(targetId) {
  if (!state.failed && state.selected) placeCard(targetId);
}

function renderPreview(targetId, targetElement) {
  const round = ROUNDS[state.round];
  if (!round) return;
  const preview = treeCanvas.querySelector(".placement-preview");
  if (!preview || !targetElement) return;
  treeCanvas.querySelectorAll(".is-drop-target").forEach((node) => node.classList.remove("is-drop-target"));
  targetElement.classList.add("is-drop-target");

  const canvasRect = treeCanvas.getBoundingClientRect();
  const targetRect = targetElement.getBoundingClientRect();
  preview.innerHTML = `<span class="ghost-tag">미리보기</span><span class="ghost-junction"></span><span class="ghost-card">${SPECIES[round.id].name}</span>`;
  preview.style.left = `${targetRect.left - canvasRect.left + targetRect.width / 2}px`;
  preview.style.top = `${targetRect.top - canvasRect.top + targetRect.height / 2}px`;
  preview.hidden = false;
}

function clearPreview() {
  state.previewTarget = null;
  const preview = treeCanvas.querySelector(".placement-preview");
  if (preview) preview.hidden = true;
  treeCanvas.querySelectorAll(".is-drop-target").forEach((node) => node.classList.remove("is-drop-target"));
}

function updateCamera() {
  const camera = treeCanvas.querySelector(".tree-camera");
  if (!camera) return;
  camera.style.setProperty("--pan-x", `${state.panX}px`);
  camera.style.setProperty("--pan-y", `${state.panY}px`);
}

function setCard(speciesId) {
  const species = SPECIES[speciesId];
  $("#active-name").textContent = species.name;
  $("#active-description").textContent = species.description;
  $("#active-scientific").textContent = species.scientific;
  card.setAttribute("aria-label", `${species.name} 카드. 선택한 뒤 계통수에서 위치를 고르세요.`);
}

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { toast.hidden = true; }, 1800);
}

function placeCard(targetId) {
  const round = ROUNDS[state.round];
  if (!round || state.failed) return;
  clearPreview();
  if (targetId !== round.target) {
    failRound(round);
    return;
  }
  state.tree = insertAt(state.tree, round.target, round.id, round.clade, false);
  state.classified.push(round.id);
  state.newest = round.id;
  state.score += 1;
  state.round += 1;
  state.selected = false;
  card.classList.remove("is-selected");
  renderTree();
  updateRound();
}

function failRound(round) {
  state.failed = true;
  state.selected = false;
  state.previewTarget = null;
  card.classList.remove("is-selected", "is-dragging");
  card.classList.add("is-locked");
  card.setAttribute("draggable", "false");
  const answerTree = insertAt(state.tree, round.target, round.id, round.clade, true);
  renderTree(answerTree, true);
  $("#failure-panel").hidden = false;
  $("#retry-game").focus();
}

function updateRound() {
  $("#score-label").textContent = `정답 ${state.score}`;
  if (state.round >= ROUNDS.length) {
    saveCollection(state.classified);
    $("#result-count").textContent = state.score;
    $("#result-copy").textContent = `${state.score}장의 카드를 분류해 동물계 계통수를 완성했습니다.`;
    $("#result-modal").hidden = false;
    return;
  }
  const round = ROUNDS[state.round];
  setCard(round.id);
  $("#round-label").textContent = `동물계 · ${state.round + 1}번째 분류`;
  if (round.automatic) {
    setTimeout(() => placeCard(round.target), 900);
  }
}

function startGame() {
  state.round = 0;
  state.score = 0;
  state.selected = false;
  state.tree = leaf("human");
  state.classified = ["human"];
  state.newest = null;
  state.previewTarget = null;
  state.failed = false;
  state.panX = 0;
  state.panY = 0;
  state.panning = false;
  card.classList.remove("is-selected", "is-dragging", "is-locked");
  card.setAttribute("draggable", "true");
  lobby.hidden = true;
  game.hidden = false;
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

card.addEventListener("dragstart", (event) => {
  if (state.failed) {
    event.preventDefault();
    return;
  }
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
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    card.click();
  }
});
$("#start-game").addEventListener("click", startGame);
$("#quit-game").addEventListener("click", returnToLobby);
$("#return-lobby").addEventListener("click", returnToLobby);
$("#retry-game").addEventListener("click", startGame);

treeCanvas.addEventListener("dragover", (event) => {
  if (state.failed) return;
  const target = event.target.closest("[data-target]");
  if (!target || !treeCanvas.contains(target)) {
    clearPreview();
    return;
  }
  event.preventDefault();
  const targetId = target.dataset.target;
  if (state.previewTarget !== targetId) {
    state.previewTarget = targetId;
    renderPreview(targetId, target);
  }
});

treeCanvas.addEventListener("dragleave", (event) => {
  if (state.failed || !state.previewTarget) return;
  const target = event.target.closest("[data-target]");
  if (!target || target.dataset.target !== state.previewTarget) return;
  const next = event.relatedTarget;
  if (!next || !target.contains(next)) clearPreview();
});

treeCanvas.addEventListener("drop", (event) => {
  if (state.failed || !state.previewTarget) return;
  event.preventDefault();
  const targetId = state.previewTarget;
  placeCard(targetId);
});

treeCanvas.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || event.target.closest("[data-target]")) return;
  state.panning = true;
  state.panStartX = event.clientX;
  state.panStartY = event.clientY;
  state.panOriginX = state.panX;
  state.panOriginY = state.panY;
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

renderCollection();
