const SPECIES = {
  human: { name: "인간", scientific: "Homo sapiens", description: "두 발로 걷고 언어를 사용하는 영장류입니다." },
  ant: { name: "개미", scientific: "Formicidae", description: "작지만 복잡한 사회를 이루는 절지동물입니다." },
  sponge: { name: "해면동물", scientific: "Porifera", description: "뚜렷한 기관 없이 물을 걸러 먹는 초기 분기 동물입니다." },
  starfish: { name: "불가사리", scientific: "Asteroidea", description: "오방사 대칭의 몸을 가진 해양 무척추동물입니다." },
  cat: { name: "고양이", scientific: "Felis catus", description: "인간과 같은 포유류에 속하는 척추동물입니다." },
  bee: { name: "꿀벌", scientific: "Apis mellifera", description: "개미와 함께 벌목에 속하는 꽃가루 매개 곤충입니다." },
  salmon: { name: "연어", scientific: "Salmo salar", description: "민물과 바다를 오가며 살아가는 조기어류입니다." },
  octopus: { name: "문어", scientific: "Octopoda", description: "여덟 개의 팔과 높은 지능을 가진 연체동물입니다." },
  chimp: { name: "침팬지", scientific: "Pan troglodytes", description: "인간과 매우 가까운 공통 조상을 공유하는 영장류입니다." },
  shark: { name: "상어", scientific: "Selachimorpha", description: "단단한 뼈 대신 연골로 된 골격을 가진 척추동물입니다." },
};

const ROUNDS = [
  { id: "ant", target: "human", clade: { id: "bilateria", name: "좌우대칭동물" }, automatic: true },
  { id: "sponge", target: "bilateria", clade: { id: "metazoa", name: "후생동물" }, fact: "해면동물은 지금까지 나온 모든 좌우대칭동물보다 먼저 갈라졌어요." },
  { id: "starfish", target: "human", clade: { id: "deuterostome", name: "후구동물" }, fact: "불가사리와 인간은 모두 후구동물이에요." },
  { id: "cat", target: "human", clade: { id: "mammal", name: "포유류" }, fact: "고양이와 인간은 젖을 먹여 새끼를 기르는 포유류예요." },
  { id: "bee", target: "ant", clade: { id: "hymenoptera", name: "벌목" }, fact: "개미와 꿀벌은 모두 벌목에 속해요." },
  { id: "salmon", target: "mammal", clade: { id: "bony-vertebrate", name: "경골어류·사지동물" }, fact: "연어는 불가사리보다 포유류와 더 가까운 척추동물이에요." },
  { id: "octopus", target: "hymenoptera", clade: { id: "protostome", name: "원구동물" }, fact: "문어와 곤충은 발생 과정에서 입이 먼저 생기는 원구동물이에요." },
  { id: "chimp", target: "human", clade: { id: "hominini", name: "사람족" }, fact: "침팬지는 이 계통수에서 인간과 가장 가까운 친척이에요." },
  { id: "shark", target: "bony-vertebrate", clade: { id: "vertebrate", name: "척추동물" }, fact: "상어와 연어, 포유류는 모두 척추를 가진 동물이에요." },
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
    return `<article class="mini-card"><div class="mini-card-art"></div><small>ANIMALIA</small><h3>${species.name}</h3><p>${species.description}</p></article>`;
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
    const badge = node.preview ? '<span class="preview-tag">미리보기</span>' : "";
    const action = node.preview ? "" : ` onclick="chooseTarget('${node.id}')"`;
    return `<button class="species-node${fresh}${preview}" type="button" data-target="${node.id}" aria-label="${SPECIES[node.id].name}에 배치"${action}>${SPECIES[node.id].name}${badge}</button>`;
  }
  const children = node.children.map((child) => `<li>${renderNode(child)}</li>`).join("");
  if (node.preview) {
    return `<span class="clade-node is-preview" aria-label="새로 생길 ${node.name} 갈래">${node.name}</span><ul class="preview-branches">${children}</ul>`;
  }
  return `<button class="clade-node" type="button" data-target="${node.id}" aria-label="${node.name} 갈래에 배치" onclick="chooseTarget('${node.id}')">${node.name}</button><ul>${children}</ul>`;
}

function renderTree() {
  const rootTarget = state.tree.id;
  treeCanvas.innerHTML = `<div class="tree-stage"><div class="phylo-tree base-tree"><button class="tree-root" type="button" data-target="${rootTarget}" aria-label="현재 계통수 전체보다 바깥에 배치" onclick="chooseTarget('${rootTarget}')">동물계 공통 조상</button><ul><li>${renderNode(state.tree)}</li></ul></div><div class="preview-slot" aria-hidden="true"></div></div>`;
}

function chooseTarget(targetId) {
  if (state.selected) placeCard(targetId);
}

function renderPreview(targetId) {
  const round = ROUNDS[state.round];
  if (!round) return;
  const displayTree = insertAt(state.tree, targetId, round.id, round.clade, true);
  const previewSlot = treeCanvas.querySelector(".preview-slot");
  const baseTree = treeCanvas.querySelector(".base-tree");
  if (!previewSlot || !baseTree) return;
  previewSlot.innerHTML = `<div class="phylo-tree preview-tree"><span class="tree-root">동물계 공통 조상</span><ul><li>${renderNode(displayTree)}</li></ul></div>`;
  baseTree.classList.add("is-previewing");
  baseTree.querySelectorAll(`[data-target="${targetId}"]`).forEach((node) => node.classList.add("is-drop-target"));
}

function clearPreview() {
  if (!state.previewTarget) return;
  state.previewTarget = null;
  const previewSlot = treeCanvas.querySelector(".preview-slot");
  const baseTree = treeCanvas.querySelector(".base-tree");
  if (previewSlot) previewSlot.innerHTML = "";
  if (baseTree) {
    baseTree.classList.remove("is-previewing");
    baseTree.querySelectorAll(".is-drop-target").forEach((node) => node.classList.remove("is-drop-target"));
  }
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
  if (!round) return;
  clearPreview();
  if (targetId !== round.target) {
    showToast("그 갈래보다 더 가까운 친척이 있어요. 다시 생각해보세요!");
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
    $("#tree-hint").textContent = "첫 동물은 비교할 대상이 하나뿐이라 자동으로 놓입니다.";
    setTimeout(() => placeCard(round.target), 900);
  } else {
    $("#tree-hint").textContent = round.fact;
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
  lobby.hidden = true;
  game.hidden = false;
  $("#result-modal").hidden = true;
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
  event.dataTransfer.setData("text/plain", "species-card");
  card.classList.add("is-dragging");
});
card.addEventListener("dragend", () => {
  card.classList.remove("is-dragging");
  clearPreview();
});
card.addEventListener("click", () => {
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

treeCanvas.addEventListener("dragover", (event) => {
  const target = event.target.closest("[data-target]");
  if (!target || !treeCanvas.contains(target)) return;
  event.preventDefault();
  const targetId = target.dataset.target;
  if (state.previewTarget !== targetId) {
    state.previewTarget = targetId;
    renderPreview(targetId);
  }
});

treeCanvas.addEventListener("drop", (event) => {
  if (!state.previewTarget) return;
  event.preventDefault();
  const targetId = state.previewTarget;
  placeCard(targetId);
});

renderCollection();
