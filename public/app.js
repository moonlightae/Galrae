const assetVersion = new URL(import.meta.url).search;
const [{ bindTreeNavigation, createTreeView }, { createCollectionView }, { getAchievements, isGrassSiblingMistake, isClassificationPolytomyMistake }, { createAchievementNotifications }, { createPhotoPrivacy }] = await Promise.all([
  import(`./tree-view.js${assetVersion}`), import(`./collection-view.js${assetVersion}`),
  import(`./achievements.js${assetVersion}`), import(`./achievement-notifications.js${assetVersion}`),
  import(`./photo-privacy.js${assetVersion}`),
]);

const { ANIMALIA_ID, addSuccessCount, buildTree, createDifficultyQueue, difficultyNames, getExpectedPlacement, isEquivalentPlacement, seedSuccessCounts, successCountText } = globalThis.GalraeLogic;
const HUMAN_ID = "homo-sapiens";
const PLANT_INITIAL_ID = "hibiscus-syriacus";
const initialSpeciesIds = new Set([HUMAN_ID, PLANT_INITIAL_ID]);
let selectedKingdom = "animals";
let plants = [];

function selectKingdom(kingdom) {
  if (!["animals", "plants"].includes(kingdom) || gameStarting) return;
  selectedKingdom = kingdom;
  document.documentElement.dataset.kingdom = kingdom;
  window.dispatchEvent(new Event("galrae:kingdom-change"));
  const plant = kingdom === "plants";
  $("#kingdom-title").textContent = plant ? "식물계" : "동물계";
  $("#kingdom-description").textContent = plant
    ? "무궁화에서 시작해 서로 다른 식물의 공통 조상을 찾아갑니다."
    : "인간에서 시작해 서로 다른 동물의 공통 조상을 찾아갑니다.";
  document.querySelectorAll("[data-kingdom]").forEach((button) => {
    const active = button.dataset.kingdom === kingdom;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  if (dataset) {
    $("#collection-branch-query").value = "";
    renderCollection();
    if (!$("#tasks-page").hidden) loadAchievements();
  }
}
const COLLECTION_PREFIX = "galrae.collection.v3";
const SUCCESS_COUNTS_PREFIX = "galrae.success-counts.v1";

const $ = (selector) => document.querySelector(selector);
const photoPrivacy = createPhotoPrivacy({ root: document, storage: localStorage });
const lobby = $("#lobby");
const game = $("#game");
const card = $("#active-card");
const toast = $("#toast");
const treeCanvas = $("#tree-canvas");
const navigationShell = $("#navigation-shell");
const toolbar = $("#side-toolbar");
const toolbarHandle = $("#toolbar-handle");
const lobbyPages = { lobby, leaderboard: $("#leaderboard-page"), collection: $("#collection-page"), tasks: $("#tasks-page"), "taxonomy-notes": $("#taxonomy-notes-page"), account: $("#account-modal") };

function setToolbarOpen(open, restoreFocus = false) {
  navigationShell.classList.toggle("is-open", open);
  toolbar.inert = !open;
  toolbarHandle.setAttribute("aria-expanded", String(open));
  toolbarHandle.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
  if (restoreFocus) toolbarHandle.focus();
}

function showLobbyPage(page, updateHistory = true) {
  if (!Object.hasOwn(lobbyPages, page)) page = "lobby";
  if ($("#guest-start-dialog")?.open) $("#guest-start-dialog").close();
  if ($("#difficulty-dialog")?.open) $("#difficulty-dialog").close();
  setToolbarOpen(false);
  game.hidden = true;
  ["#result-modal", "#tutorial-intro-modal", "#species-modal"].forEach((selector) => { $(selector).hidden = true; });
  navigationShell.hidden = page === "collection" && collectionView.isTree();
  for (const [name, screen] of Object.entries(lobbyPages)) screen.hidden = name !== page;
  toolbar.querySelectorAll("[data-page]").forEach((button) => {
    if (button.dataset.page === page) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  if (updateHistory && location.hash !== `#${page}`) history.pushState(null, "", `#${page}`);
  window.scrollTo(0, 0);
  const heading = lobbyPages[page].querySelector("h1, h2");
  if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
  if (page === "tasks") loadAchievements();
  if (page === "collection") collectionView.showGuide();
}

function restoreLobbyPage() {
  const page = location.hash.slice(1);
  if (page === "account") openAccountModal(toolbarHandle);
  else showLobbyPage(page, false);
}

$("#toolbar-edge").addEventListener("pointerenter", (event) => {
  if (event.pointerType === "mouse") setToolbarOpen(true);
});
$("#toolbar-edge").addEventListener("pointerleave", (event) => {
  if (event.pointerType === "mouse") setToolbarOpen(false, toolbar.contains(document.activeElement));
});
toolbarHandle.addEventListener("click", (event) => {
  // Mouse hover has already opened the panel; tapping still toggles it.
  setToolbarOpen(event.detail === 0 || event.pointerType !== "mouse" ? !navigationShell.classList.contains("is-open") : true);
});
$("#toolbar-shade").addEventListener("click", () => setToolbarOpen(false, true));
$("#close-toolbar").addEventListener("click", () => setToolbarOpen(false, true));
$("#toolbar-edge").addEventListener("focusout", (event) => {
  if (!event.currentTarget.contains(event.relatedTarget)) setToolbarOpen(false);
});
document.querySelectorAll("[data-page]").forEach((button) => {
  button.addEventListener("click", () => showLobbyPage(button.dataset.page));
});
window.addEventListener("popstate", restoreLobbyPage);
window.addEventListener("hashchange", restoreLobbyPage);

let dataset = null;
let animals = [];
let taxonNamesKo = {};
const speciesById = new Map();
let currentUser = null;
let currentChatGPT = null;
let currentGamesPlayed = 0;
let scoreSubmitted = false;
let gameStarting = false;
let guestStartOptions = null;
let difficultyStartOptions = null;
const pendingCollectionWrites = new Set();
const pendingAchievementWrites = new Set();
let achievementStats = null;
let plantAchievementStats = null;
let achievementStatsUser = null;
const achievementNotifications = createAchievementNotifications($("#achievement-notifications"), (task) => `${achievementMedal(task)}<div><small>발전과제 달성!</small><strong>${escapeHtml(task.title)}</strong></div>`);
const plantAchievementNotifications = createAchievementNotifications($("#achievement-notifications"), (task) => `${achievementMedal(task)}<div><small>식물계 발전과제 달성!</small><strong>${escapeHtml(task.title)}</strong></div>`);
let authMode = "login";
let accountReturnFocus = null;

const state = {
  queue: [], round: 0, score: 0, selected: false, tree: null,
  classified: [HUMAN_ID], newest: null, currentId: null, expected: null,
  kingdom: "animals",
  previewTarget: null, previewPlacement: null, failed: false,
  layout: "top", zoom: 1, tutorial: false, practice: false, difficulty: "hard", mistakes: new Set(), latestMistake: null,
  cardLanguage: localStorage.getItem("galrae.card-language.v1") === "ko" ? "ko" : "en",
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

function cardText(animal) {
  if (state.cardLanguage === "ko" && animal.ko) return { ...animal, ...animal.ko };
  return animal.ko?.descriptionEn ? { ...animal, description: animal.ko.descriptionEn } : animal;
}

function setKingdomLabel(container, animal) {
  const name = animal.taxonomy.lineage[0].scientificName;
  const labels = container.querySelectorAll(".card-topline span");
  labels[0].textContent = name === "Plantae" ? "식물계" : "동물계";
  labels[1].textContent = name.toUpperCase();
}

function setCardLanguage(language) {
  if (!["en", "ko"].includes(language)) return;
  state.cardLanguage = language;
  localStorage.setItem("galrae.card-language.v1", language);
  document.querySelectorAll("[data-card-language]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.cardLanguage === language));
  });
  if (!dataset) return;
  renderCollection();
  if (state.tree) {
    clearPreview();
    const tree = state.failed ? buildTree([...state.classified, state.currentId], speciesById, state.currentId) : state.tree;
    renderTree(tree, state.failed);
    if (state.currentId || state.newest) setCard(state.currentId || state.newest);
  }
}

function taxonomyLabels(animal) {
  const preferredRanks = ["phylum", "superclass", "class", "subclass", "infraclass", "order", "family", "genus"];
  const lineage = [...animal.taxonomy.lineage];
  for (const rank of ["class", "order"]) {
    const extra = animal.taxonomy.rankReview?.supplemental[rank];
    if (!extra || lineage.some((taxon) => taxon.rank === rank)) continue;
    const lowerRanks = rank === "class" ? ["subclass", "infraclass", "order", "family", "genus", "species"] : ["suborder", "family", "genus", "species"];
    const index = lineage.findIndex((taxon) => lowerRanks.includes(taxon.rank));
    lineage.splice(index < 0 ? lineage.length : index, 0, { ...extra, rank, wikidataId: extra.taxonId });
  }
  const label = (taxon) => state.cardLanguage === "ko" ? taxonNamesKo[taxon.wikidataId] || taxon.scientificName : taxon.scientificName;
  const labels = preferredRanks
    .map((rank) => lineage.findLast((taxon) => taxon.rank === rank))
    .filter(Boolean)
    .map(label);
  return labels.length ? labels : animal.taxonomy.lineage.slice(-4, -1).map(label);
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

function normalizeSuccessRecord(record) {
  const count = Number.isSafeInteger(record?.count) && record.count > 0 ? record.count : 0;
  return count ? { count, minimum: record.minimum === true } : null;
}

function mergeSuccessRecord(left, right) {
  const a = normalizeSuccessRecord(left);
  const b = normalizeSuccessRecord(right);
  if (!a) return b;
  if (!b) return a;
  if (a.count > b.count) return a;
  if (b.count > a.count) return b;
  return { count: a.count, minimum: a.minimum && b.minimum };
}

function migrateSuccessCounts() {
  if (localStorage.getItem(successCountsKey()) !== null) return;
  localStorage.setItem(successCountsKey(), JSON.stringify(seedSuccessCounts(getCollection().filter((id) => !initialSpeciesIds.has(id)), HUMAN_ID)));
}

function recordSuccess(speciesId) {
  localStorage.setItem(successCountsKey(), JSON.stringify(addSuccessCount(getSuccessCounts(), speciesId)));
}

function getCollection() {
  try {
    const stored = JSON.parse(localStorage.getItem(collectionKey()));
    return Array.isArray(stored) ? [...new Set(stored.map((id) => id === "helianthus-annuus" ? PLANT_INITIAL_ID : id))].filter((id) => speciesById.has(id)) : [];
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
  const counted = Object.entries(getSuccessCounts())
    .filter(([id, record]) => !initialSpeciesIds.has(id) && speciesById.has(id) && normalizeSuccessRecord(record))
    .map(([id]) => id);
  const canClaimLegacy = currentUser && !localStorage.getItem("galrae.collection.claimed");
  const migrated = [...current, ...counted, ...(canClaimLegacy || !currentUser ? old : []), HUMAN_ID, PLANT_INITIAL_ID];
  setCollection(migrated.length ? migrated : [HUMAN_ID]);
  if (canClaimLegacy) localStorage.setItem("galrae.collection.claimed", currentUser.id);
  localStorage.removeItem("galrae.collection");
  migrateSuccessCounts();
}

function saveCollection(ids) { setCollection([...getCollection(), ...ids]); }

function imageCreditText(animal) {
  const artist = String(animal.image.artist || "Unknown creator").replace(/\s+/g, " ").trim();
  const shortArtist = artist.length > 70 ? `${artist.slice(0, 67)}…` : artist;
  return `${shortArtist} · ${animal.image.license}${animal.image.identificationNote ? ` · ${animal.image.identificationNote}` : ""}`;
}

function renderCollection() {
  const kingdom = selectedKingdom === "plants" ? "Plantae" : "Animalia";
  const kingdomName = selectedKingdom === "plants" ? "식물계" : "동물계";
  const collected = getCollection().filter((id) => speciesById.get(id)?.taxonomy.lineage[0].scientificName === kingdom);
  $("#collection-title").textContent = `${kingdomName} 도감`;
  $("#collection-animal-attribution").hidden = selectedKingdom === "plants";
  $("#collection-plant-attribution").hidden = selectedKingdom !== "plants";
  $("#collection-tree").setAttribute("aria-label", `수집한 ${kingdomName} 생물의 계통수`);
  collectionView.render(collected);
  const successCounts = getSuccessCounts();
  $("#collection-count").textContent = `${collected.length}종 발견`;
  const grid = $("#collection-grid");
  if (!collected.length) {
    grid.innerHTML = `<div class="collection-empty">아직 분류한 생물이 없어요.<br />${kingdomName} 분류를 시작해 첫 카드를 모아보세요.</div>`;
    return;
  }
  grid.innerHTML = collected.map((id) => {
    const animal = cardText(speciesById.get(id));
    const groups = taxonomyLabels(animal).map((group) => `<span>${escapeHtml(group)}</span>`).join("");
    return `<article class="mini-card">
      <div class="mini-card-art"><img data-photo-species="${escapeHtml(id)}" loading="lazy" style="object-fit:${animal.image.objectFit === "contain" ? "contain" : "cover"}" src="${escapeHtml(animal.image.thumbnailUrl)}" alt="${escapeHtml(animal.commonName)}" /></div>
      <div class="mini-card-info">
        <small>${animal.taxonomy.lineage[0].scientificName.toUpperCase()}</small><h3>${escapeHtml(animal.commonName)}</h3>
        <p class="mini-scientific"><i>${escapeHtml(animal.scientificName)}</i></p>
        ${initialSpeciesIds.has(id) ? "" : `<p class="mini-success">${escapeHtml(successCountText(successCounts[id]))}</p>`}
        <details class="mini-card-taxonomy"><summary>상위 분류군</summary><div class="mini-card-groups" aria-label="상위 분류군">${groups}</div></details>
        <p>${escapeHtml(shortDescription(animal.description, 145))}</p>
      </div>
      <a class="mini-card-credit" href="${escapeHtml(animal.image.commonsPageUrl)}" target="_blank" rel="noreferrer">${escapeHtml(imageCreditText(animal))}</a>
    </article>`;
  }).join("");
  grid.querySelectorAll("img[data-photo-species]").forEach((image) => photoPrivacy.prepare(image, speciesById.get(image.dataset.photoSpecies)));
}

const { clearPreview, renderPreview, renderTree, resetTreeView, setTreeLayout, updateCamera, zoomTree, zoomTreeAtCenter } = createTreeView({
  ANIMALIA_ID, buildTree, escapeHtml, speciesById, state, treeCanvas, $, cardText, layoutControls: game,
});
const collectionView = createCollectionView({ $, buildTree, speciesById, escapeHtml, cardText,
  preparePhoto: photoPrivacy.prepare,
  onOpenSpecies: (id, button) => openSpeciesCard(id, button, true),
  onModeChange: (mode) => { navigationShell.hidden = mode === "tree"; },
  getLanguage: () => state.cardLanguage,
  getTaxonName: (id) => taxonNamesKo[id],
  getGuideKey: () => `galrae.ancestor-guide.v1.${currentUser?.id || "guest"}`,
});

function preloadImage(url, timeout = 5000) {
  return new Promise((resolve) => {
    if (!url) { resolve(); return; }
    const image = new Image();
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(finish, timeout);
    image.onload = finish;
    image.onerror = finish;
    image.src = url;
  });
}

function setCard(speciesId) {
  const animal = cardText(speciesById.get(speciesId));
  setKingdomLabel(card, animal);
  const image = $("#active-image");
  const fallback = $("#active-image-fallback");
  $("#active-name").textContent = animal.commonName;
  $("#active-description").textContent = shortDescription(animal.description);
  $("#active-scientific").textContent = animal.scientificName;
  $("#active-success-count").textContent = successCountText(getSuccessCounts()[speciesId]);
  image.alt = animal.commonName;
  image.hidden = true;
  fallback.textContent = "…";
  fallback.hidden = false;
  image.onload = () => { image.hidden = false; fallback.hidden = true; };
  image.onerror = () => { image.hidden = true; fallback.textContent = "?"; fallback.hidden = false; };
  photoPrivacy.prepare(image, animal);
  image.src = animal.image.thumbnailUrl;
  image.style.objectFit = animal.image.objectFit === "contain" ? "contain" : "cover";
  const credit = $("#active-credit");
  credit.href = animal.image.commonsPageUrl;
  credit.textContent = `Image: ${imageCreditText(animal)}`;
  card.setAttribute("aria-label", `${animal.commonName} 카드. Enter 또는 Space 키로 선택한 뒤 계통수에서 배치할 위치를 골라 주세요.`);
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
    if (achievementStatsUser !== (currentUser?.id || null)) {
      achievementNotifications.reset(); plantAchievementNotifications.reset(); achievementStats = null; plantAchievementStats = null;
      achievementStatsUser = currentUser?.id || null;
    }
    currentChatGPT = data.chatgpt;
    currentGamesPlayed = Number.isSafeInteger(data.gamesPlayed) ? data.gamesPlayed : 0;
    if (currentUser) {
      panel.innerHTML = `<button class="auth-name" id="open-account" type="button" title="@${escapeHtml(currentUser.username)}">${escapeHtml(currentUser.displayName)}</button><button class="auth-link" id="logout-account" type="button">로그아웃</button>`;
      note.textContent = "게임이 끝나면 최고 기록이 자동으로 반영됩니다.";
    } else {
      panel.innerHTML = '<button class="auth-login" id="open-account" type="button">로그인 / 가입</button>';
      note.textContent = "게임 아이디로 로그인하면 최고 기록이 자동으로 등록됩니다.";
    }
    return data;
  } catch (error) {
    console.error(error);
    panel.innerHTML = '<span class="auth-loading">계정 정보를 확인하지 못했어요</span>';
    throw error;
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
  showLobbyPage("account");
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
  showLobbyPage("lobby");
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
    migrateCollection();
    try { await syncCollection(); }
    catch (syncError) { console.error(syncError); showToast("수집 기록을 불러오지 못했습니다."); }
    renderCollection();
    try { await refreshAchievementStats(false); }
    catch (error) { console.error(error); }
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
  migrateCollection();
  renderCollection();
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
    await loadAccount();
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
  const userId = currentUser.id;
  await Promise.all([...pendingCollectionWrites]);
  const remoteResponse = await fetch("/api/collection", { cache: "no-store" });
  if (!remoteResponse.ok) throw new Error(`Collection request failed: ${remoteResponse.status}`);
  const remoteData = await responseJson(remoteResponse);
  if (currentUser?.id !== userId) return;

  const counts = { ...getSuccessCounts() };
  const ids = new Set([...getCollection(), ...Object.keys(counts).filter((id) => speciesById.has(id)), HUMAN_ID]);
  const remoteById = new Map();
  for (const record of Array.isArray(remoteData.records) ? remoteData.records : []) {
    if (!speciesById.has(record.speciesId) || initialSpeciesIds.has(record.speciesId)) continue;
    remoteById.set(record.speciesId, record);
    ids.add(record.speciesId);
    counts[record.speciesId] = mergeSuccessRecord(counts[record.speciesId], record);
  }
  const records = [...ids].filter((id) => !initialSpeciesIds.has(id) && speciesById.has(id)).map((speciesId) => {
    const record = normalizeSuccessRecord(counts[speciesId]) || { count: 1, minimum: true };
    counts[speciesId] = record;
    return { speciesId, ...record };
  });
  setCollection([...ids]);
  localStorage.setItem(successCountsKey(), JSON.stringify(counts));
  renderCollection();
  const unsynced = records.filter((record) => {
    const remote = normalizeSuccessRecord(remoteById.get(record.speciesId));
    return !remote || record.count > remote.count || (record.count === remote.count && !record.minimum && remote.minimum);
  });
  for (let offset = 0; offset < unsynced.length; offset += 400) {
    const response = await fetch("/api/collection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ records: unsynced.slice(offset, offset + 400) }),
    });
    if (!response.ok) throw new Error(`Collection request failed: ${response.status}`);
  }
}

function recordServerSuccess(speciesId) {
  const userId = currentUser?.id;
  if (!userId) return;
  const write = (async () => {
    const response = await fetch("/api/collection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "record", speciesId }),
    });
    if (!response.ok) throw new Error(`Collection record failed: ${response.status}`);
    const data = await responseJson(response);
    if (currentUser?.id !== userId || !data.record) return;
    const counts = getSuccessCounts();
    counts[speciesId] = mergeSuccessRecord(counts[speciesId], data.record);
    localStorage.setItem(successCountsKey(), JSON.stringify(counts));
    checkAchievementProgress();
  })().catch((error) => console.error(error));
  pendingCollectionWrites.add(write);
  write.then(() => pendingCollectionWrites.delete(write));
}

async function loadLeaderboard() {
  const list = $("#leaderboard-list");
  const status = $("#leaderboard-status");
  status.textContent = "기록을 불러오는 중…";
  try {
    const response = await fetch("/api/leaderboard", { cache: "no-store" });
    if (!response.ok) throw new Error(`Leaderboard request failed: ${response.status}`);
    const data = await responseJson(response);
    const entries = Array.isArray(data.entries) ? data.entries : [];
    if (!entries.length) {
      list.innerHTML = '<li class="leaderboard-empty">아직 등록된 기록이 없어요. 첫 번째 기록을 남겨보세요.</li>';
      status.textContent = "0명 참가";
      return;
    }
    list.innerHTML = entries.map((entry) => `<li class="leaderboard-row${entry.isCurrentUser ? " is-me" : ""}">
      <span class="leaderboard-rank">${entry.rank ?? "—"}</span>
      <span class="leaderboard-player">${escapeHtml(entry.displayName)}${entry.isCurrentUser ? '<small>나</small>' : ""}</span>
      <span class="leaderboard-stats">
        <span class="leaderboard-stat"><small>일반 도전횟수</small><strong>${entry.gamesPlayed}회</strong></span>
        <span class="leaderboard-stat"><small>한 번 이상 분류</small><strong>${entry.uniqueSpeciesCount}종</strong></span>
        <span class="leaderboard-stat"><small>일반 최고 기록</small><strong>${entry.bestScore}종</strong></span>
        <span class="leaderboard-stat"><small>연습 최고 기록</small><strong>${entry.bestPracticeScore ?? 0}종</strong></span>
      </span>
    </li>`).join("");
    status.textContent = `${entries.length}명 표시`;
  } catch (error) {
    console.error(error);
    list.innerHTML = '<li class="leaderboard-empty">리더보드를 불러오지 못했어요.</li>';
    status.textContent = "연결 오류";
  }
}

function achievementMedal(task) {
  const icons = {
    failure: "M5 8a8 8 0 1 1-1 8M5 3v5h5M12 8v5m0 3v.1",
    practice: "M3 5h6l3 2 3-2h6v14h-6l-3 2-3-2H3ZM12 7v14",
    tree: "M12 21V3M12 10 5 6V3M12 15l7-5V6M12 5l5-2",
    attempts: "M5 8a8 8 0 0 1 14-1M19 3v4h-4M19 16a8 8 0 0 1-14 1M5 21v-4h4",
    collection: "M20 4C7 2 2 7 5 15c3 8 15 5 15-11ZM5 20 16 9",
    fish: "M3 12c4-8 11-8 15 0-4 8-11 8-15 0Zm15 0 4-5v10l-4-5M12 10h.1",
    grass: "M12 21V9M12 17C8 17 4 13 4 7c6 0 8 4 8 10Zm0-3c0-6 3-9 8-10 0 6-3 10-8 10Z",
  };
  return `<div class="achievement-medal grade-${task.grade}" aria-hidden="true"><div class="medal-face"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${icons[task.icon]}" /></svg></div></div>`;
}

function renderAchievements(stats = {}, kingdom = selectedKingdom) {
  const total = kingdom === "plants" ? (plants.length > 1 ? plants.length - 1 : 45) : animals.filter((animal) => animal.id !== HUMAN_ID).length || 206;
  const tasks = getAchievements(stats, total, kingdom);
  $("#achievements-title").textContent = `${kingdom === "plants" ? "식물계" : "동물계"} 발전과제`;
  $("#achievements-count").textContent = `${tasks.filter((task) => task.earned).length} / ${tasks.length}`;
  $("#achievements-grid").innerHTML = ["기본", "연습모드", "일반모드", "특별"].map((category) => `<section class="achievement-group"><h2>${category}</h2><div class="achievements-grid">${tasks.filter((task) => task.category === category).map((task) => {
    const progress = `${Math.min(task.value, task.goal).toLocaleString("ko-KR")} / ${task.goal.toLocaleString("ko-KR")}${task.unit || ""}`;
    return `<details class="achievement-card${task.earned ? " is-earned" : ""}"><summary aria-describedby="detail-${task.id}">${achievementMedal(task)}<span>${escapeHtml(task.title)}</span></summary>
      <div id="detail-${task.id}" class="achievement-detail"><p>${escapeHtml(task.description)}</p>${category === "특별" ? "" : `<div class="achievement-progress"><progress max="${task.goal}" value="${Math.min(task.value, task.goal)}" aria-label="${escapeHtml(task.title)} 진행도"></progress><span>${progress}</span></div>`}</div>
    </details>`;
  }).join("")}</div></section>`).join("");
}

async function refreshAchievementStats(notify = true, kingdom = selectedKingdom) {
  const userId = currentUser?.id;
  if (!userId) return;
  const response = await fetch(kingdom === "plants" ? "/api/plant-achievements" : "/api/achievements", { cache: "no-store" });
  if (!response.ok) throw new Error(`Achievement request failed: ${response.status}`);
  const data = await responseJson(response);
  if (currentUser?.id !== userId) return;
  if (kingdom === "plants") {
    plantAchievementStats = data.stats;
    plantAchievementNotifications.update(getAchievements(plantAchievementStats, plants.length > 1 ? plants.length - 1 : 45, kingdom), notify);
  } else {
    achievementStats = data.stats;
    achievementNotifications.update(getAchievements(achievementStats, animals.length > 1 ? animals.length - 1 : 206), notify);
  }
}

function checkAchievementProgress() {
  const plant = state.kingdom === "plants";
  const stats = plant ? plantAchievementStats : achievementStats;
  if (!currentUser || !stats || state.tutorial) return;
  const playableIds = new Set((plant ? plants : animals).filter((animal) => animal.id !== (plant ? PLANT_INITIAL_ID : HUMAN_ID)).map((animal) => animal.id));
  const entries = Object.entries(getSuccessCounts()).filter(([id]) => playableIds.has(id));
  const counts = entries.map(([, record]) => normalizeSuccessRecord(record)?.count || 0);
  stats.collected = getCollection().filter((id) => playableIds.has(id)).length;
  stats.totalSuccesses = counts.reduce((sum, count) => sum + count, 0);
  stats.repeatSuccesses = counts.reduce((best, count) => Math.max(best, count), 0);
  if (!game.hidden) {
    const metric = state.practice ? "bestPracticeScore" : "bestScore";
    stats[metric] = Math.max(stats[metric] || 0, state.score);
  }
  (plant ? plantAchievementNotifications : achievementNotifications).update(getAchievements(stats, plant ? plants.length - 1 : animals.length > 1 ? animals.length - 1 : 206, plant ? "plants" : "animals"));
}

async function loadAchievements() {
  const userId = currentUser?.id;
  const kingdom = selectedKingdom;
  const status = $("#achievements-status");
  renderAchievements((kingdom === "plants" ? plantAchievementStats : achievementStats) || {}, kingdom);
  if (!userId) { status.textContent = "로그인하면 발전과제 진행도와 메달이 계정에 저장됩니다."; return; }
  status.textContent = "발전과제 기록을 불러오는 중…";
  try {
    await Promise.all([...pendingAchievementWrites, ...pendingCollectionWrites]);
    await refreshAchievementStats(false, kingdom);
    if (currentUser?.id !== userId || selectedKingdom !== kingdom) return;
    renderAchievements(kingdom === "plants" ? plantAchievementStats : achievementStats, kingdom);
    status.textContent = "메달을 가리키거나 눌러 조건과 진행도를 확인해 보세요.";
  } catch (error) {
    console.error(error);
    if (currentUser?.id === userId && selectedKingdom === kingdom) status.textContent = "기록을 불러오지 못했어요. 발전과제 메뉴를 다시 열어 주세요.";
  }
}

function recordAchievementEvent(event, details = {}) {
  if (!currentUser || state.tutorial || (state.kingdom === "plants" && event === "practice-complete")) return;
  const plant = state.kingdom === "plants";
  const userId = currentUser.id;
  const write = (async () => {
    const response = await fetch(plant ? "/api/plant-achievements" : "/api/achievements", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event, ...details }),
    });
    if (!response.ok) throw new Error(`Achievement record failed: ${response.status}`);
    const stats = plant ? plantAchievementStats : achievementStats;
    if (currentUser?.id !== userId || !stats) return;
    if (event === "normal-start") stats.normalAttempts += 1;
    if (event === "failure") stats.hasFailed = true;
    if (event === "grass-sibling-mistake") { stats.hasFailed = true; stats.grassSiblingMistake = true; }
    if (event === "fish-sibling-mistake") { stats.hasFailed = true; stats.fishSiblingMistake = true; }
    if (event === "practice-start" || event === "practice-complete") stats.practiceStarted = true;
    if (event === "practice-complete") stats.practiceCompleted = true;
    checkAchievementProgress();
  })().catch((error) => { console.error(error); showToast("발전과제 기록을 저장하지 못했어요."); });
  pendingAchievementWrites.add(write);
  write.then(() => pendingAchievementWrites.delete(write));
  return write;
}

async function submitScore() {
  if (scoreSubmitted || state.tutorial) return;
  scoreSubmitted = true;
  if (state.kingdom === "plants") {
    const status = state.failed ? $("#failure-score-status") : $("#score-submit-status");
    if (!currentUser) { status.textContent = "로그인하면 식물계 발전과제를 저장할 수 있습니다."; return; }
    const userId = currentUser.id;
    status.textContent = "식물계 기록 저장 중…";
    try {
      const write = fetch("/api/plant-achievements", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "result", score: state.score, mode: state.practice ? "practice" : "normal", difficulty: state.difficulty,
          ...(!state.failed && state.round === state.queue.length ? { completedIds: state.classified } : {}) }),
      });
      pendingAchievementWrites.add(write);
      let response;
      try { response = await write; } finally { pendingAchievementWrites.delete(write); }
      if (!response.ok) throw new Error(`Plant score request failed: ${response.status}`);
      if (currentUser?.id !== userId) return;
      await Promise.all([...pendingAchievementWrites, ...pendingCollectionWrites]);
      await refreshAchievementStats(true, "plants");
      status.textContent = "식물계 발전과제와 수집 기록을 저장했습니다.";
    } catch (error) {
      console.error(error); scoreSubmitted = false;
      status.textContent = "식물계 기록을 저장하지 못했어요.";
    }
    return;
  }
  if (!currentUser) {
    if (state.practice) return;
    if (!state.failed && state.round === state.queue.length && state.difficulty === "hard") {
      localStorage.setItem("galrae.guest-hard-completed.v1", "true");
    }
    const attempts = Number(localStorage.getItem("galrae.guest-attempts.v1")) || 0;
    localStorage.setItem("galrae.guest-attempts.v1", String(attempts + 1));
    return;
  }
  const status = state.failed ? $("#failure-score-status") : $("#score-submit-status");
  status.textContent = "기록 저장 중…";
  try {
    const write = fetch("/api/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score: state.score, mode: state.practice ? "practice" : "normal", difficulty: state.difficulty,
        ...(!state.practice && !state.failed && state.round === state.queue.length ? { completedIds: state.classified } : {}) }),
    });
    pendingAchievementWrites.add(write);
    let response;
    try { response = await write; }
    finally { pendingAchievementWrites.delete(write); }
    if (!response.ok) throw new Error(`Score request failed: ${response.status}`);
    const data = await responseJson(response);
    if (!state.practice) currentGamesPlayed = Number.isSafeInteger(data.entry?.gamesPlayed) ? data.entry.gamesPlayed : currentGamesPlayed + 1;
    status.textContent = state.practice ? "연습 기록을 저장했습니다." : "리더보드에 기록했습니다.";
    await Promise.all([...pendingCollectionWrites]);
    try { await refreshAchievementStats(true, "animals"); }
    catch (error) { console.error(error); showToast("기록은 저장했지만 발전과제를 불러오지 못했어요."); }
    await loadLeaderboard();
  } catch (error) {
    console.error(error);
    scoreSubmitted = false;
    status.textContent = "기록을 저장하지 못했어요.";
  }
}

function openSpeciesCard(speciesId, returnFocus, fromCollection = false) {
  if (fromCollection ? !getCollection().includes(speciesId) : !state.classified.includes(speciesId) && !(state.failed && speciesId === state.currentId)) return;
  if (!speciesById.has(speciesId)) return;
  const animal = cardText(speciesById.get(speciesId));
  const image = $("#species-view-image");
  const fallback = $("#species-view-fallback");
  $("#species-view-name").textContent = animal.commonName;
  $("#species-view-description").textContent = shortDescription(animal.description, 230);
  $("#species-view-scientific").textContent = animal.scientificName;
  const taxonomy = $("#species-view-taxonomy");
  const revealTaxonomy = fromCollection || state.failed || state.mistakes?.has(speciesId);
  taxonomy.hidden = !revealTaxonomy;
  taxonomy.open = false;
  $("#species-view-groups").innerHTML = revealTaxonomy
    ? taxonomyLabels(animal).map((group) => `<span>${escapeHtml(group)}</span>`).join("")
    : "";
  setKingdomLabel($("#species-modal"), animal);
  $("#species-view-success-count").hidden = initialSpeciesIds.has(speciesId);
  if (!initialSpeciesIds.has(speciesId)) {
    $("#species-view-success-count").textContent = successCountText(getSuccessCounts()[speciesId]);
  }
  image.style.objectFit = animal.image.objectFit === "contain" ? "contain" : "cover";
  image.alt = animal.commonName;
  photoPrivacy.prepare(image, animal);
  image.src = animal.image.thumbnailUrl;
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
    failRound(targetId, placement);
    return;
  }
  state.classified.push(state.currentId);
  if (!state.tutorial) {
    recordSuccess(state.currentId);
    saveCollection([state.currentId]);
    recordServerSuccess(state.currentId);
  }
  state.newest = state.currentId;
  state.tree = buildTree(state.classified, speciesById);
  state.score += 1;
  checkAchievementProgress();
  state.round += 1;
  state.selected = false;
  card.classList.remove("is-selected");
  renderTree();
  updateRound();
}

function failRound(targetId, placement) {
  state.failed = true;
  if (!state.tutorial) {
    if (state.kingdom === "plants" && isGrassSiblingMistake(state.classified, state.currentId, targetId, placement, speciesById)) {
      recordAchievementEvent("grass-sibling-mistake", { classified: [...state.classified], currentId: state.currentId, targetId, placement });
    } else if (isClassificationPolytomyMistake(state.classified, state.currentId, targetId, placement, speciesById)) {
      recordAchievementEvent("fish-sibling-mistake", { classified: [...state.classified], currentId: state.currentId, targetId, placement });
    } else recordAchievementEvent("failure");
  }
  state.selected = false;
  card.classList.remove("is-selected", "is-dragging");
  card.classList.add("is-locked");
  card.setAttribute("draggable", "false");
  if (state.practice) {
    state.mistakes.add(state.currentId);
    state.latestMistake = state.currentId;
    state.classified.push(state.currentId);
    state.newest = null;
    state.tree = buildTree(state.classified, speciesById);
    state.round += 1;
    renderTree();
    $("#round-label").textContent = `연습 모드 · ${state.round}/${state.queue.length}`;
    $("#failure-title").textContent = "올바른 위치에 자동으로 배치했어요.";
    $("#failure-copy").textContent = "초록색 카드를 확인하고 계속해 주세요.";
    $("#retry-game").textContent = "계속하기 →";
    $("#failure-panel").hidden = false;
    $("#retry-game").focus();
    return;
  }
  const answerTree = buildTree([...state.classified, state.currentId], speciesById, state.currentId);
  renderTree(answerTree, true);
  $("#failure-title").textContent = state.tutorial ? "연습 위치가 달라요." : "분류에 실패했어요.";
  $("#failure-copy").textContent = state.tutorial
    ? "초록색 정답 위치를 살펴보세요. 튜토리얼은 도전 기록에 포함되지 않습니다."
    : "초록색으로 표시된 곳이 올바른 위치입니다.";
  $("#retry-game").textContent = state.tutorial ? "튜토리얼 다시하기 →" : "처음부터 다시 →";
  $("#failure-panel").hidden = false;
  if (!state.tutorial) submitScore();
  $("#retry-game").focus();
}

function updateRound() {
  $("#score-label").textContent = `${state.practice ? "연습 정답" : state.tutorial ? "연습" : "정답"} ${state.score}`;
  if (state.round >= state.queue.length) {
    if (state.tutorial) {
      state.currentId = null;
      state.expected = null;
      card.classList.add("is-locked");
      card.setAttribute("draggable", "false");
      $("#tutorial-banner").hidden = true;
      $("#tutorial-complete-panel").hidden = false;
      $("#tutorial-play").focus();
      return;
    }
    state.currentId = null;
    state.expected = null;
    card.classList.add("is-locked");
    card.setAttribute("draggable", "false");
    if (state.practice) recordAchievementEvent("practice-complete");
    saveCollection(state.classified.filter((id) => !state.mistakes.has(id)));
    $("#result-title").textContent = state.practice ? "연습을 마쳤어요." : "분류를 마쳤어요.";
    $("#result-count").textContent = state.practice ? state.score : state.classified.length;
    $("#result-unit").textContent = "species";
    $("#result-copy").textContent = state.practice ? `직접 맞힌 카드 ${state.score}종 · 자동 배치 ${state.mistakes.size}종. 연습 기록은 일반 기록과 별도로 저장됩니다.` : `${difficultyNames[state.difficulty]} 난이도 완주 · ${state.kingdom === "plants" ? "무궁화를" : "인간을"} 포함한 ${state.classified.length}종을 분류했습니다.${state.difficulty === "hard" ? " 죽음 난이도가 해금되었습니다. 플레이는 준비 중입니다." : ""}`;
    $("#return-lobby").textContent = "수집함 보기 →";
    $("#result-modal").hidden = false;
    submitScore();
    return;
  }
  state.currentId = state.queue[state.round];
  state.expected = getExpectedPlacement(state.classified, state.currentId, speciesById);
  setCard(state.currentId);
  $("#round-label").textContent = `${state.practice ? "연습 모드" : state.tutorial ? "튜토리얼" : difficultyNames[state.difficulty]} · ${state.round + 1}/${state.queue.length}`;
  const banner = $("#tutorial-banner");
  banner.hidden = !state.tutorial;
  if (state.tutorial) banner.textContent = (state.kingdom === "plants" ? [
    "연습 1/4 · 첫 분기 만들기. 밭뿔이끼와 무궁화의 공통 조상을 만듭니다. 카드를 선택한 뒤 무궁화 카드로 이어지는 기둥을 눌러 보세요.",
    "연습 2/4 · 한 생물 옆에 추가하기. 벼는 밭뿔이끼보다 무궁화와 더 가까운 조상을 공유합니다. 카드를 선택한 뒤 무궁화 노드를 눌러 보세요.",
    "연습 3/4 · 기존 가지에서 먼저 분기하기. 고사리는 무궁화·벼보다 먼저 갈라집니다. 두 식물을 묶는 원형 분기점으로 이어지는 기둥을 눌러 보세요.",
    "연습 4/4 · 더 가까운 갈래 찾기. 소나무는 고사리보다 무궁화·벼와 더 가까운 조상을 공유합니다. 무궁화·벼를 묶는 원형 분기점으로 이어지는 기둥을 눌러 보세요.",
  ] : [
    "연습 1/4 · 첫 분기 만들기. 유즐동물과 인간의 공통 조상을 만듭니다. 카드를 선택한 뒤 인간 카드로 이어지는 기둥을 누르거나, 그 기둥으로 카드를 옮겨 보세요.",
    "연습 2/4 · 한 생물 옆에 추가하기. 불가사리는 유즐동물보다 인간과 더 가까운 조상을 공유합니다. 카드를 선택한 뒤 인간 노드를 눌러 보세요.",
    "연습 3/4 · 같은 공통 조상에 추가하기. 판형동물은 게임에서 동물계 공통 조상 아래 별도 가지로 둡니다. 카드를 선택한 뒤 최상단의 원형 분기점을 눌러 보세요.",
    "연습 4/4 · 기존 가지에서 먼저 분기하기. 개미는 인간·불가사리 묶음의 바깥에서 갈라집니다. 카드를 선택한 뒤 그 묶음의 원과 Animalia 쪽 분기점 사이의 기둥을 눌러 보세요.",
  ])[state.round];
}

async function startGame(options = {}) {
  if (!dataset || gameStarting) return;
  if ($("#difficulty-dialog").open) return;
  if (!options.practice && !options.tutorial && !options.difficulty) {
    if ($("#guest-start-dialog").open || $("#difficulty-dialog").open) return;
    difficultyStartOptions = options;
    const unlocked = currentUser ? achievementStats?.hardCompleted : localStorage.getItem("galrae.guest-hard-completed.v1") === "true";
    $("#death-difficulty-status").textContent = unlocked ? "해금됨 · 준비 중" : "어려움 완주 후 해금";
    $("#difficulty-dialog").showModal();
    return;
  }
  if (options.difficulty && !Object.hasOwn(difficultyNames, options.difficulty)) return;
  if (selectedKingdom === "plants" && !options.practice && !options.tutorial && options.difficulty !== "easy") {
    showToast("구현 중입니다.");
    return;
  }
  if (!currentUser && options.guestConfirmed !== true) {
    const dialog = $("#guest-start-dialog");
    if (dialog.open) return;
    guestStartOptions = options;
    dialog.returnValue = "";
    dialog.showModal();
    return;
  }
  gameStarting = true;
  $("#game-loading").hidden = false;
  try {
    const guestAttempts = Number(localStorage.getItem("galrae.guest-attempts.v1")) || 0;
    const practice = options.practice === true;
    const tutorial = !practice && (options.tutorial === true || (selectedKingdom !== "plants" && options.skipTutorial !== true && (currentUser ? currentGamesPlayed === 0 : guestAttempts === 0)));
    const difficulty = practice ? "hard" : options.difficulty || (tutorial ? null : "hard");
    const initialSpeciesId = selectedKingdom === "plants" ? PLANT_INITIAL_ID : HUMAN_ID;
    const queue = tutorial
      ? selectedKingdom === "plants"
        ? ["anthoceros-agrestis", "oryza-sativa", "pteridium-aquilinum", "pinus-sylvestris"]
        : ["bolinopsis-infundibulum", "asterias-rubens", "hoilungia-hongkongensis", "formica-rufa"]
      : createDifficultyQueue(selectedKingdom === "plants" ? plants : animals, difficulty, Math.random, initialSpeciesId);
    await preloadImage(speciesById.get(queue[0])?.image.thumbnailUrl);
    state.queue = queue;
    state.tutorial = tutorial;
    state.practice = practice;
    state.difficulty = difficulty;
    state.kingdom = selectedKingdom;
    state.mistakes = new Set();
    state.latestMistake = null;
    state.round = 0; state.score = 0; state.selected = false;
    state.classified = [initialSpeciesId];
    if (selectedKingdom === "plants" && !tutorial) saveCollection([initialSpeciesId]);
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
    if (currentUser && !(selectedKingdom === "plants" ? plantAchievementStats : achievementStats)) {
      try { await refreshAchievementStats(false, selectedKingdom); }
      catch (error) { console.error(error); }
    }
    if (!tutorial) await recordAchievementEvent(practice ? "practice-start" : "normal-start");
    Object.values(lobbyPages).forEach((screen) => { screen.hidden = true; });
    setToolbarOpen(false);
    navigationShell.hidden = true;
    game.hidden = false;
    $("#result-modal").hidden = true;
    $("#failure-panel").hidden = true;
    $("#tutorial-complete-panel").hidden = true;
    $("#species-modal").hidden = true;
    $("#tutorial-intro-modal").hidden = !tutorial;
    $("#card-dock-title").textContent = selectedKingdom === "plants" ? "새 식물 카드" : "새 동물 카드";
    $("#tutorial-complete-panel p:not(.eyebrow)").textContent = selectedKingdom === "plants"
      ? "소나무가 추가된 위치를 살펴보세요. 네 장의 식물 카드로 가지를 고르는 방법을 연습했습니다."
      : "개미가 추가된 위치를 살펴보세요. 네 가지 배치 방법을 모두 연습했습니다.";
    $("#tutorial-play").textContent = selectedKingdom === "plants" ? "연습 모드 시작 →" : "실전 시작 →";
    renderTree();
    resetTreeView();
    updateRound();
    window.scrollTo(0, 0);
    if (tutorial) $("#tutorial-begin").focus();
  } catch (error) {
    console.error(error);
    showToast("게임을 시작하지 못했습니다.");
  } finally {
    $("#game-loading").hidden = true;
    gameStarting = false;
  }
}

async function returnToLobby() {
  if (!state.tutorial && !game.hidden) await submitScore();
  closeSpeciesCard();
  $("#tutorial-intro-modal").hidden = true;
  game.hidden = true;
  $("#result-modal").hidden = true;
  showLobbyPage("lobby");
  renderCollection();
  try { await syncCollection(); }
  catch (error) {
    console.error(error);
    $("#collection-count").textContent = "수집 기록 확인 실패 · 새로고침해 주세요";
    showToast("수집 기록을 동기화하지 못했습니다.");
  }
  await loadLeaderboard();
  window.scrollTo(0, 0);
}

async function initialize() {
  const startButton = $("#start-game");
  try {
    const [response, translationsResponse, taxaResponse, plantsResponse] = await Promise.all([fetch(`data/animals.json${assetVersion}`), fetch(`data/animals.ko.json${assetVersion}`), fetch(`data/taxa.ko.json${assetVersion}`), fetch(`data/plants.json${assetVersion}`), loadAccount()]);
    if (!response.ok) throw new Error(`Dataset request failed: ${response.status}`);
    if (!translationsResponse.ok) throw new Error(`Translation request failed: ${translationsResponse.status}`);
    if (!taxaResponse.ok) throw new Error(`Taxon translation request failed: ${taxaResponse.status}`);
    if (!plantsResponse.ok) throw new Error(`Plant dataset request failed: ${plantsResponse.status}`);
    dataset = await response.json();
    const translations = await translationsResponse.json();
    taxonNamesKo = await taxaResponse.json();
    const plantDataset = await plantsResponse.json();
    plants = plantDataset.plants;
    for (const taxon of plantDataset.taxa) taxonNamesKo[taxon.wikidataId] = taxon.koName;
    animals = dataset.animals;
    speciesById.clear();
    for (const animal of [...animals, ...plants]) {
      animal.ko = animal.ko || translations[animal.id];
      speciesById.set(animal.id, animal);
    }
    if (!speciesById.has(HUMAN_ID)) throw new Error("Human is missing from the dataset");
    if (!speciesById.has(PLANT_INITIAL_ID)) throw new Error("Rose of Sharon is missing from the dataset");
    migrateCollection();
    let collectionSyncFailed = false;
    try { await syncCollection(); }
    catch (error) { console.error(error); collectionSyncFailed = true; showToast("수집 기록을 불러오지 못했습니다."); }
    setCardLanguage(state.cardLanguage);
    if (collectionSyncFailed) $("#collection-count").textContent = "수집 기록 확인 실패 · 새로고침해 주세요";
    try { await refreshAchievementStats(false); }
    catch (error) { console.error(error); }
    $("#boot-loading-status").textContent = "리더보드와 카드를 준비하는 중…";
    await loadLeaderboard();
    await Promise.all(getCollection().slice(0, 5).map((id) => preloadImage(speciesById.get(id)?.image.thumbnailUrl, 3000)));
    startButton.disabled = false;
    $("#start-practice").disabled = false;
    startButton.innerHTML = '분류 시작 <span aria-hidden="true">→</span>';
  } catch (error) {
    console.error(error);
    startButton.textContent = "불러오지 못했어요 · 새로고침해 주세요";
    showToast("게임 정보를 불러오지 못했습니다.");
  } finally {
    $("#boot-loading").hidden = true;
    restoreLobbyPage();
  }
}

card.addEventListener("dragstart", (event) => {
  if (state.failed || !state.currentId) { event.preventDefault(); return; }
  event.dataTransfer.setData("text/plain", "species-card");
  card.classList.add("is-dragging");
});
card.addEventListener("dragend", () => {
  card.classList.remove("is-dragging");
  if (!state.failed) clearPreview();
});
card.addEventListener("click", () => {
  if (state.failed || !state.currentId) return;
  state.selected = !state.selected;
  card.classList.toggle("is-selected", state.selected);
});
card.addEventListener("keydown", (event) => {
  if (event.target !== card) return;
  if (event.key === "Enter" || event.key === " ") { event.preventDefault(); card.click(); }
});

$("#hide-insect-photos").checked = photoPrivacy.enabled;
$("#hide-insect-photos").addEventListener("change", (event) => photoPrivacy.setEnabled(event.target.checked));
$("#open-settings").addEventListener("click", () => { setToolbarOpen(false); $("#settings-dialog").showModal(); });
$("#close-settings").addEventListener("click", () => $("#settings-dialog").close());
$("#settings-dialog").addEventListener("close", () => toolbarHandle.focus());

$("#start-game").addEventListener("click", () => startGame());
document.querySelectorAll("[data-kingdom]").forEach((button) => {
  button.addEventListener("click", () => selectKingdom(button.dataset.kingdom));
});
$("#achievements-grid").addEventListener("pointerover", (event) => {
  const tile = event.target.closest(".achievement-card");
  if (tile && event.pointerType === "mouse") tile.open = true;
});
$("#achievements-grid").addEventListener("pointerout", (event) => {
  const tile = event.target.closest(".achievement-card");
  if (tile && event.pointerType === "mouse" && !tile.contains(event.relatedTarget)) tile.open = false;
});
$("#achievements-grid").addEventListener("focusin", (event) => {
  const tile = event.target.closest(".achievement-card");
  if (tile && event.target.matches(":focus-visible")) tile.open = true;
});
$("#achievements-grid").addEventListener("focusout", (event) => {
  const tile = event.target.closest(".achievement-card");
  if (tile && !tile.contains(event.relatedTarget)) tile.open = false;
});
$("#guest-start-dialog").addEventListener("close", (event) => {
  const options = guestStartOptions;
  guestStartOptions = null;
  if (!options) return;
  if (event.target.returnValue === "play") startGame({ ...options, guestConfirmed: true });
  if (event.target.returnValue === "login") openAccountModal(document.activeElement);
});
$("#start-practice").addEventListener("click", () => startGame({ practice: true }));
document.querySelectorAll("[data-difficulty]").forEach((button) => {
  button.addEventListener("click", () => {
    const options = difficultyStartOptions;
    if (!options) return;
    $("#difficulty-dialog").close();
    startGame({ ...options, difficulty: button.dataset.difficulty });
  });
});
$("#close-difficulty").addEventListener("click", () => $("#difficulty-dialog").close());
$("#difficulty-dialog").addEventListener("close", () => { difficultyStartOptions = null; });
document.querySelectorAll("[data-card-language]").forEach((button) => {
  button.addEventListener("click", () => setCardLanguage(button.dataset.cardLanguage));
});
game.querySelectorAll("[data-tree-layout]").forEach((button) => {
  button.addEventListener("click", () => setTreeLayout(button.dataset.treeLayout));
});
$("#tree-reset-view").addEventListener("click", resetTreeView);
$("#tree-zoom-in").addEventListener("click", () => zoomTreeAtCenter(1.25));
$("#tree-zoom-out").addEventListener("click", () => zoomTreeAtCenter(.8));
$("#quit-game").addEventListener("click", returnToLobby);
$("#return-lobby").addEventListener("click", async () => { await returnToLobby(); showLobbyPage("collection"); });
$("#retry-game").addEventListener("click", () => {
  if (!state.practice) { startGame({ tutorial: state.tutorial, difficulty: state.difficulty, skipTutorial: true }); return; }
  state.failed = false;
  $("#failure-panel").hidden = true;
  card.classList.remove("is-locked");
  card.setAttribute("draggable", "true");
  renderTree();
  updateRound();
});
$("#start-tutorial").addEventListener("click", () => startGame({ tutorial: true }));
$("#tutorial-begin").addEventListener("click", () => { $("#tutorial-intro-modal").hidden = true; card.focus(); });
$("#tutorial-quit").addEventListener("click", returnToLobby);
$("#tutorial-complete-lobby").addEventListener("click", returnToLobby);
$("#tutorial-play").addEventListener("click", () => startGame(state.kingdom === "plants" ? { practice: true } : { skipTutorial: true, difficulty: state.difficulty }));
$("#auth-panel").addEventListener("click", (event) => {
  if (event.target.closest("#open-account")) openAccountModal(event.target.closest("#open-account"));
  if (event.target.closest("#logout-account")) logoutAccount();
});
$("#close-account").addEventListener("click", closeAccountModal);
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
  if (event.key === "Escape" && navigationShell.classList.contains("is-open")) { setToolbarOpen(false, true); return; }
  if (event.key === "Escape" && !$("#tutorial-intro-modal").hidden) { returnToLobby(); return; }
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
bindTreeNavigation(treeCanvas, state, { zoomTree, updateCamera });
new ResizeObserver(() => {
  if (state.layout === "radial" && !$("#game").hidden && treeCanvas.clientWidth && treeCanvas.clientHeight) resetTreeView();
}).observe(treeCanvas);

initialize();
// Keep the lobby artwork independent of account/data loading and gameplay.
import(`./lobby-sculpture.js${assetVersion}`)
  .then(({ createLobbySculpture }) => createLobbySculpture($("#lobby-sculpture"), lobby))
  .catch((error) => { $("#lobby-sculpture").hidden = true; console.warn("Lobby artwork unavailable", error); });
