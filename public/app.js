const { ANIMALIA_ID, addSuccessCount, buildTree, getExpectedPlacement, isEquivalentPlacement, seedSuccessCounts, shuffle, successCountText } = GalraeLogic;
const HUMAN_ID = "homo-sapiens";
const COLLECTION_PREFIX = "galrae.collection.v3";
const SUCCESS_COUNTS_PREFIX = "galrae.success-counts.v1";
const MIN_TREE_ZOOM = 0.03;
const MAX_TREE_ZOOM = 3.5;

const $ = (selector) => document.querySelector(selector);
const lobby = $("#lobby");
const game = $("#game");
const card = $("#active-card");
const toast = $("#toast");
const treeCanvas = $("#tree-canvas");

let dataset = null;
let animals = [];
let speciesById = new Map();
let currentUser = null;
let currentChatGPT = null;
let scoreSubmitted = false;
let authMode = "login";
let accountReturnFocus = null;

const state = {
  queue: [], round: 0, score: 0, selected: false, tree: null,
  classified: [HUMAN_ID], newest: null, currentId: null, expected: null,
  previewTarget: null, previewPlacement: null, failed: false,
  layout: "top", zoom: 1,
  panX: 0, panY: 0, panning: false, panStartX: 0, panStartY: 0,
  panOriginX: 0, panOriginY: 0, detailReturnFocus: null,
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

function collectionKey() {
  return `${COLLECTION_PREFIX}.${currentUser?.id || "guest"}`;
}

function successCountsKey() {
  return `${SUCCESS_COUNTS_PREFIX}.${currentUser?.id || "guest"}`;
}

function getSuccessCounts() {
  try {
    const stored = JSON.parse(localStorage.getItem(successCountsKey()));
    return stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
  } catch { return {}; }
}

function migrateSuccessCounts() {
  if (localStorage.getItem(successCountsKey()) !== null) return;
  localStorage.setItem(successCountsKey(), JSON.stringify(seedSuccessCounts(getCollection(), HUMAN_ID)));
}

function recordSuccess(speciesId) {
  localStorage.setItem(successCountsKey(), JSON.stringify(addSuccessCount(getSuccessCounts(), speciesId)));
}

function getCollection() {
  try {
    const stored = JSON.parse(localStorage.getItem(collectionKey()));
    return Array.isArray(stored) ? stored.filter((id) => speciesById.has(id)) : [];
  } catch { return []; }
}

function setCollection(ids) {
  const valid = [...new Set(ids)].filter((id) => speciesById.has(id));
  localStorage.setItem(collectionKey(), JSON.stringify(valid));
}

function migrateCollection() {
  let old = [];
  try {
    old = [
      ...(JSON.parse(localStorage.getItem("galrae.collection")) || []),
      ...(JSON.parse(localStorage.getItem("galrae.collection.v2")) || []),
    ];
  } catch { old = []; }
  const current = getCollection();
  const canClaimLegacy = currentUser && !localStorage.getItem("galrae.collection.claimed");
  const migrated = [...current, ...(canClaimLegacy || !currentUser ? old : []), HUMAN_ID];
  setCollection(migrated.length ? migrated : [HUMAN_ID]);
  if (canClaimLegacy) localStorage.setItem("galrae.collection.claimed", currentUser.id);
  localStorage.removeItem("galrae.collection");
  migrateSuccessCounts();
}

function saveCollection(ids) { setCollection([...getCollection(), ...ids]); }

function imageCreditText(animal) {
  const artist = String(animal.image.artist || "Unknown creator").replace(/\s+/g, " ").trim();
  const shortArtist = artist.length > 70 ? `${artist.slice(0, 67)}…` : artist;
  return `${shortArtist} · ${animal.image.license}`;
}

function renderCollection() {
  const collected = getCollection();
  const successCounts = getSuccessCounts();
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
      ${id === HUMAN_ID ? "" : `<p class="mini-success">${escapeHtml(successCountText(successCounts[id]))}</p>`}
      <p>${escapeHtml(shortDescription(animal.description, 145))}</p>
      <div class="mini-card-groups" aria-label="Taxonomy">${groups}</div>
      <a class="mini-card-credit" href="${escapeHtml(animal.image.commonsPageUrl)}" target="_blank" rel="noreferrer">${escapeHtml(imageCreditText(animal))}</a>
    </article>`;
  }).join("");
}

function renderNode(node, omitIncomingEdge = false) {
  if (node.type === "leaf") {
    const animal = speciesById.get(node.id);
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
      const animal = speciesById.get(node.id);
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

function setCard(speciesId) {
  const animal = speciesById.get(speciesId);
  const image = $("#active-image");
  const fallback = $("#active-image-fallback");
  $("#active-name").textContent = animal.commonName;
  $("#active-description").textContent = shortDescription(animal.description);
  $("#active-scientific").textContent = animal.scientificName;
  $("#active-success-count").textContent = successCountText(getSuccessCounts()[speciesId]);
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

async function responseJson(response) {
  const text = await response.text();
  if (!text) throw new Error(response.ok ? "서버 응답이 비어 있습니다." : `서버 오류가 발생했습니다. (${response.status})`);
  try { return JSON.parse(text); }
  catch { throw new Error(`서버 응답을 읽지 못했습니다. (${response.status})`); }
}

async function loadAccount() {
  const panel = $("#auth-panel");
  const note = $("#leaderboard-note");
  try {
    const response = await fetch("/api/me", { cache: "no-store" });
    if (!response.ok) throw new Error(`Account request failed: ${response.status}`);
    const data = await responseJson(response);
    currentUser = data.user;
    currentChatGPT = data.chatgpt;
    if (currentUser) {
      panel.innerHTML = `<button class="auth-name" id="open-account" type="button" title="@${escapeHtml(currentUser.username)}">${escapeHtml(currentUser.displayName)}</button><button class="auth-link" id="logout-account" type="button">로그아웃</button>`;
      note.textContent = "게임이 끝나면 최고 기록이 자동으로 반영됩니다.";
    } else {
      panel.innerHTML = '<button class="auth-login" id="open-account" type="button">로그인 / 가입</button>';
      note.textContent = "게임 아이디로 로그인하면 최고 기록이 자동으로 등록됩니다.";
    }
    if (dataset) { migrateCollection(); renderCollection(); }
    return data;
  } catch (error) {
    console.error(error);
    panel.innerHTML = '<span class="auth-loading">계정 정보를 확인하지 못했어요</span>';
  }
}

function setAuthMode(mode) {
  authMode = mode;
  const registering = mode === "register";
  $("#show-login").classList.toggle("is-active", !registering);
  $("#show-login").setAttribute("aria-selected", String(!registering));
  $("#show-register").classList.toggle("is-active", registering);
  $("#show-register").setAttribute("aria-selected", String(registering));
  $("#account-password").autocomplete = registering ? "new-password" : "current-password";
  $("#display-name-field").hidden = !registering;
  $("#confirm-password-field").hidden = !registering;
  $("#account-display-name").required = registering;
  $("#account-confirm-password").required = registering;
  $("#account-form-help").textContent = registering
    ? "아이디는 문자·숫자·밑줄 3~20자, 비밀번호는 8자 이상으로 만들어주세요."
    : "이 기기에서 사용할 게임 아이디로 로그인하세요.";
  $("#account-submit").textContent = registering ? "새 계정 만들기 →" : "로그인 →";
  $("#account-error").textContent = "";
}

function renderAccountProfile() {
  $("#account-profile-name").textContent = currentUser.displayName;
  $("#account-profile-id").textContent = `@${currentUser.username}`;
  $("#open-admin").hidden = !currentUser.isAdmin;
  const panel = $("#chatgpt-link-panel");
  if (currentUser.chatgptLinked) {
    panel.innerHTML = `<span class="link-status is-linked">연결됨</span><strong>ChatGPT · ${escapeHtml(currentUser.chatgptDisplayName || "연결된 계정")}</strong><p>이 게임 아이디는 현재 ChatGPT 계정과 연결되어 있습니다.</p>`;
  } else if (currentChatGPT?.available) {
    panel.innerHTML = `<span class="link-status">선택 사항</span><strong>ChatGPT · ${escapeHtml(currentChatGPT.displayName)}</strong><p>현재 ChatGPT 계정을 이 게임 아이디에 연결할 수 있어요.</p><button id="link-chatgpt" class="secondary-button" type="button">ChatGPT 계정 연결</button>`;
  } else {
    panel.innerHTML = '<strong>ChatGPT 계정 확인 불가</strong><p>ChatGPT로 사이트에 접속하면 나중에 연결할 수 있어요.</p>';
  }
}

function openAccountModal(returnFocus) {
  accountReturnFocus = returnFocus || null;
  $("#admin-view").hidden = true;
  $("#account-auth-view").hidden = Boolean(currentUser);
  $("#account-profile-view").hidden = !currentUser;
  if (currentUser) renderAccountProfile();
  else setAuthMode("login");
  $("#account-modal").hidden = false;
  (currentUser ? $("#close-account") : $("#account-username")).focus();
}

function closeAccountModal() {
  if ($("#account-modal").hidden) return;
  $("#account-modal").hidden = true;
  const returnFocus = accountReturnFocus;
  accountReturnFocus = null;
  if (returnFocus?.isConnected) returnFocus.focus();
}

async function submitAccount(event) {
  event.preventDefault();
  const submit = $("#account-submit");
  const error = $("#account-error");
  submit.disabled = true;
  error.textContent = "";
  try {
    const password = $("#account-password").value;
    const confirmPassword = $("#account-confirm-password").value;
    if (authMode === "register" && password !== confirmPassword) throw new Error("비밀번호 확인이 일치하지 않습니다.");
    const response = await fetch(`/api/auth/${authMode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: $("#account-username").value,
        displayName: $("#account-display-name").value,
        password,
        confirmPassword,
      }),
    });
    const data = await responseJson(response);
    if (!response.ok) throw new Error(data.error || "계정 요청에 실패했습니다.");
    $("#account-form").reset();
    await loadAccount();
    await loadLeaderboard();
    closeAccountModal();
    showToast(authMode === "register" ? "새 게임 계정을 만들었습니다." : "로그인했습니다.");
  } catch (caught) {
    error.textContent = caught.message;
  } finally {
    submit.disabled = false;
  }
}

async function logoutAccount() {
  await fetch("/api/auth/logout", { method: "POST" });
  currentUser = null;
  await loadAccount();
  await loadLeaderboard();
  showToast("게임 계정에서 로그아웃했습니다.");
}

async function linkChatGPT() {
  const button = $("#link-chatgpt");
  button.disabled = true;
  try {
    const response = await fetch("/api/auth/link-chatgpt", { method: "POST" });
    const data = await responseJson(response);
    if (!response.ok) throw new Error(data.error || "연결하지 못했습니다.");
    await loadAccount();
    renderAccountProfile();
    showToast("ChatGPT 계정을 연결했습니다.");
  } catch (caught) {
    showToast(caught.message);
    button.disabled = false;
  }
}

async function adminRequest(action, userId) {
  const response = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, userId }),
  });
  const data = await responseJson(response);
  if (!response.ok) throw new Error(data.error || "관리자 작업에 실패했습니다.");
  return data;
}

async function loadAdminUsers() {
  const list = $("#admin-user-list");
  const status = $("#admin-status");
  list.innerHTML = '<p class="admin-loading">계정 목록을 불러오는 중…</p>';
  status.textContent = "";
  try {
    const response = await fetch("/api/admin", { cache: "no-store" });
    const data = await responseJson(response);
    if (!response.ok) throw new Error(data.error || "계정 목록을 불러오지 못했습니다.");
    list.innerHTML = data.users.map((user) => `<article class="admin-user-row">
      <div><strong>${escapeHtml(user.displayName || user.username)}${user.isAdmin ? '<span class="admin-badge">ADMIN</span>' : ""}</strong><small>@${escapeHtml(user.username)} · 최고 ${user.bestScore}종 · ${user.gamesPlayed}회${user.chatgptLinked ? " · ChatGPT 연결" : ""}</small></div>
      <div class="admin-user-actions"><button type="button" data-admin-action="reset-password" data-user-id="${escapeHtml(user.id)}">비밀번호 초기화</button>${user.isAdmin ? "" : `<button class="is-danger" type="button" data-admin-action="delete-user" data-user-id="${escapeHtml(user.id)}">계정 삭제</button>`}</div>
    </article>`).join("");
  } catch (caught) {
    list.innerHTML = `<p class="admin-loading is-error">${escapeHtml(caught.message)}</p>`;
  }
}

function openAdminView() {
  $("#account-profile-view").hidden = true;
  $("#admin-view").hidden = false;
  loadAdminUsers();
}

function closeAdminView() {
  $("#admin-view").hidden = true;
  $("#account-profile-view").hidden = false;
  renderAccountProfile();
}

async function handleAdminAction(event) {
  const button = event.target.closest("[data-admin-action]");
  if (!button) return;
  const action = button.dataset.adminAction;
  const message = action === "delete-user"
    ? "이 계정과 해당 리더보드 기록을 삭제할까요?"
    : "이 계정의 비밀번호를 기본 비밀번호로 초기화하고 모든 로그인 세션을 종료할까요?";
  if (!window.confirm(message)) return;
  button.disabled = true;
  try {
    await adminRequest(action, button.dataset.userId);
    $("#admin-status").textContent = action === "delete-user" ? "계정을 삭제했습니다." : "비밀번호를 초기화했습니다.";
    await loadAdminUsers();
    await loadLeaderboard();
  } catch (caught) {
    $("#admin-status").textContent = caught.message;
    button.disabled = false;
  }
}

async function resetLeaderboard() {
  if (!window.confirm("모든 사용자의 리더보드 기록을 삭제할까요? 이 작업은 되돌릴 수 없습니다.")) return;
  const button = $("#reset-leaderboard");
  button.disabled = true;
  try {
    await adminRequest("reset-leaderboard");
    $("#admin-status").textContent = "리더보드를 초기화했습니다.";
    await loadAdminUsers();
    await loadLeaderboard();
  } catch (caught) {
    $("#admin-status").textContent = caught.message;
  } finally {
    button.disabled = false;
  }
}

async function syncCollection() {
  if (!currentUser || !dataset) return;
  const speciesIds = getCollection().filter((id) => id !== HUMAN_ID);
  for (let offset = 0; offset < speciesIds.length; offset += 400) {
    const response = await fetch("/api/collection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ speciesIds: speciesIds.slice(offset, offset + 400) }),
    });
    if (!response.ok) throw new Error(`Collection request failed: ${response.status}`);
  }
}

async function loadLeaderboard() {
  const list = $("#leaderboard-list");
  const status = $("#leaderboard-status");
  status.textContent = "기록을 불러오는 중…";
  try {
    let collectionSyncFailed = false;
    try { await syncCollection(); }
    catch (error) { console.error(error); collectionSyncFailed = true; }
    const response = await fetch("/api/leaderboard", { cache: "no-store" });
    if (!response.ok) throw new Error(`Leaderboard request failed: ${response.status}`);
    const data = await responseJson(response);
    const entries = Array.isArray(data.entries) ? data.entries : [];
    if (!entries.length) {
      list.innerHTML = '<li class="leaderboard-empty">아직 등록된 기록이 없어요. 첫 번째 기록을 남겨보세요.</li>';
      status.textContent = collectionSyncFailed ? "수집 기록 동기화 실패" : "0명 참가";
      return;
    }
    list.innerHTML = entries.map((entry, index) => `<li class="leaderboard-row${entry.isCurrentUser ? " is-me" : ""}">
      <span class="leaderboard-rank">${index + 1}</span>
      <span class="leaderboard-player">${escapeHtml(entry.displayName)}${entry.isCurrentUser ? '<small>나</small>' : ""}</span>
      <span class="leaderboard-stats">
        <span class="leaderboard-stat"><small>총 도전횟수</small><strong>${entry.gamesPlayed}회</strong></span>
        <span class="leaderboard-stat"><small>한 번 이상 분류</small><strong>${entry.uniqueSpeciesCount}종</strong></span>
        <span class="leaderboard-stat"><small>최대 분류 마릿수</small><strong>${entry.bestScore}종</strong></span>
      </span>
    </li>`).join("");
    status.textContent = collectionSyncFailed ? "수집 기록 동기화 실패" : `${entries.length}명 순위`;
  } catch (error) {
    console.error(error);
    list.innerHTML = '<li class="leaderboard-empty">리더보드를 불러오지 못했어요.</li>';
    status.textContent = "연결 오류";
  }
}

async function submitScore() {
  if (scoreSubmitted || !currentUser) return;
  scoreSubmitted = true;
  const status = state.failed ? $("#failure-score-status") : $("#score-submit-status");
  status.textContent = "기록 저장 중…";
  try {
    const response = await fetch("/api/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score: state.score }),
    });
    if (!response.ok) throw new Error(`Score request failed: ${response.status}`);
    status.textContent = "리더보드에 기록했습니다.";
    await loadLeaderboard();
  } catch (error) {
    console.error(error);
    scoreSubmitted = false;
    status.textContent = "기록을 저장하지 못했어요.";
  }
}

function openSpeciesCard(speciesId, returnFocus) {
  if (!state.classified.includes(speciesId)) return;
  const animal = speciesById.get(speciesId);
  if (!animal) return;
  const image = $("#species-view-image");
  const fallback = $("#species-view-fallback");
  $("#species-view-name").textContent = animal.commonName;
  $("#species-view-description").textContent = shortDescription(animal.description, 230);
  $("#species-view-scientific").textContent = animal.scientificName;
  $("#species-view-success-count").hidden = speciesId === HUMAN_ID;
  if (speciesId !== HUMAN_ID) {
    $("#species-view-success-count").textContent = successCountText(getSuccessCounts()[speciesId]);
  }
  image.src = animal.image.thumbnailUrl;
  image.alt = animal.commonName;
  image.hidden = false;
  fallback.hidden = true;
  image.onerror = () => { image.hidden = true; fallback.hidden = false; };
  const credit = $("#species-view-credit");
  credit.href = animal.image.commonsPageUrl;
  credit.textContent = `Image: ${imageCreditText(animal)}`;
  state.detailReturnFocus = returnFocus || null;
  $("#species-modal").hidden = false;
  $("#close-species-card").focus();
}

function closeSpeciesCard() {
  const modal = $("#species-modal");
  if (modal.hidden) return;
  modal.hidden = true;
  const returnFocus = state.detailReturnFocus;
  state.detailReturnFocus = null;
  if (returnFocus?.isConnected) returnFocus.focus();
}

function placeCard(targetId, placement = "wrap") {
  if (!state.currentId || state.failed) return;
  clearPreview();
  if (!isEquivalentPlacement(state.tree, state.expected, targetId, placement)) {
    failRound();
    return;
  }
  state.classified.push(state.currentId);
  recordSuccess(state.currentId);
  saveCollection([state.currentId]);
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
  submitScore();
  $("#retry-game").focus();
}

function updateRound() {
  $("#score-label").textContent = `정답 ${state.score}`;
  if (state.round >= state.queue.length) {
    saveCollection(state.classified);
    $("#result-count").textContent = state.classified.length;
    $("#result-copy").textContent = `${state.classified.length} species, including Human, were placed in the Animalia tree.`;
    $("#result-modal").hidden = false;
    submitScore();
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
  state.detailReturnFocus = null;
  scoreSubmitted = false;
  $("#score-submit-status").textContent = "";
  $("#failure-score-status").textContent = "";
  card.classList.remove("is-selected", "is-dragging", "is-locked");
  card.setAttribute("draggable", "true");
  lobby.hidden = true; game.hidden = false;
  $("#result-modal").hidden = true;
  $("#failure-panel").hidden = true;
  $("#species-modal").hidden = true;
  renderTree();
  resetTreeView();
  updateRound();
  window.scrollTo(0, 0);
}

function returnToLobby() {
  closeSpeciesCard();
  game.hidden = true;
  $("#result-modal").hidden = true;
  lobby.hidden = false;
  renderCollection();
  loadLeaderboard();
  window.scrollTo(0, 0);
}

async function initialize() {
  const startButton = $("#start-game");
  const accountPromise = loadAccount();
  try {
    const response = await fetch("data/animals.json");
    if (!response.ok) throw new Error(`Dataset request failed: ${response.status}`);
    dataset = await response.json();
    animals = dataset.animals;
    speciesById = new Map(animals.map((animal) => [animal.id, animal]));
    if (!speciesById.has(HUMAN_ID)) throw new Error("Human is missing from the dataset");
    await accountPromise;
    migrateCollection();
    renderCollection();
    loadLeaderboard();
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
document.querySelectorAll("[data-tree-layout]").forEach((button) => {
  button.addEventListener("click", () => setTreeLayout(button.dataset.treeLayout));
});
$("#tree-reset-view").addEventListener("click", resetTreeView);
$("#tree-zoom-in").addEventListener("click", () => zoomTreeAtCenter(1.25));
$("#tree-zoom-out").addEventListener("click", () => zoomTreeAtCenter(.8));
function closeTaxonomyNotes() {
  $("#taxonomy-notes-modal").hidden = true;
  $("#taxonomy-notes-toggle").setAttribute("aria-expanded", "false");
  $("#taxonomy-notes-toggle").focus();
}
$("#taxonomy-notes-toggle").addEventListener("click", () => {
  $("#taxonomy-notes-modal").hidden = false;
  $("#taxonomy-notes-toggle").setAttribute("aria-expanded", "true");
  $("#close-taxonomy-notes").focus();
});
$("#close-taxonomy-notes").addEventListener("click", closeTaxonomyNotes);
$("#taxonomy-notes-modal").addEventListener("click", (event) => {
  if (event.target === event.currentTarget) closeTaxonomyNotes();
});
$("#quit-game").addEventListener("click", returnToLobby);
$("#return-lobby").addEventListener("click", returnToLobby);
$("#retry-game").addEventListener("click", startGame);
$("#auth-panel").addEventListener("click", (event) => {
  if (event.target.closest("#open-account")) openAccountModal(event.target.closest("#open-account"));
  if (event.target.closest("#logout-account")) logoutAccount();
});
$("#close-account").addEventListener("click", closeAccountModal);
$("#account-modal").addEventListener("click", (event) => { if (event.target === event.currentTarget) closeAccountModal(); });
$("#show-login").addEventListener("click", () => setAuthMode("login"));
$("#show-register").addEventListener("click", () => setAuthMode("register"));
$("#account-form").addEventListener("submit", submitAccount);
$("#chatgpt-link-panel").addEventListener("click", (event) => { if (event.target.closest("#link-chatgpt")) linkChatGPT(); });
$("#open-admin").addEventListener("click", openAdminView);
$("#close-admin").addEventListener("click", closeAdminView);
$("#admin-user-list").addEventListener("click", handleAdminAction);
$("#reset-leaderboard").addEventListener("click", resetLeaderboard);
$("#close-species-card").addEventListener("click", closeSpeciesCard);
$("#species-modal").addEventListener("click", (event) => {
  if (event.target === event.currentTarget) closeSpeciesCard();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !$("#taxonomy-notes-modal").hidden) { closeTaxonomyNotes(); return; }
  if (event.key === "Escape" && !$("#account-modal").hidden) { closeAccountModal(); return; }
  if (event.key === "Escape" && !$("#species-modal").hidden) closeSpeciesCard();
});

treeCanvas.addEventListener("click", (event) => {
  const target = event.target.closest("[data-target]");
  const speciesButton = event.target.closest("[data-species-id]");
  if (target && state.selected && !state.failed) {
    placeCard(target.dataset.target, target.dataset.placement || "wrap");
    return;
  }
  if (speciesButton) openSpeciesCard(speciesButton.dataset.speciesId, speciesButton);
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
treeCanvas.addEventListener("wheel", (event) => {
  event.preventDefault();
  const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? treeCanvas.clientHeight : 1);
  zoomTree(state.zoom * Math.exp(-delta * .0012), event.clientX, event.clientY);
}, { passive: false });
treeCanvas.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || event.target.closest("[data-target], [data-species-id]")) return;
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
