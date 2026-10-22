const version = new URL(import.meta.url).search;
const [{ isClassificationPolytomyMistake, isGrassSiblingMistake }, animalData, plantData] = await Promise.all([
  import(`./achievements.js${version}`),
  fetch("/data/animals.json").then((response) => response.json()),
  fetch("/data/plants.json").then((response) => response.json()),
]);
const animalMap = new Map(animalData.animals.map((species) => [species.id, species]));
const plantMap = new Map(plantData.plants.map((species) => [species.id, species]));
const initialIds = new Set(["homo-sapiens", plantData.initialSpeciesId]);
const validId = (id) => !initialIds.has(id) && (animalMap.has(id) || plantMap.has(id));

(function installLocalApi(global) {
  const nativeFetch = global.fetch.bind(global);
  const ACCOUNTS_KEY = "galrae.local.accounts.v1";
  const SESSION_KEY = "galrae.local.session.v1";
  const SCORES_KEY = "galrae.local.scores.v1";
  const PLANTS_KEY = "galrae.local.plant-progress.v1";
  const COLLECTIONS_KEY = "galrae.local.collections.v1";
  const ADMIN_HASH = "176d93ddc019ee61587d34434d66fd0acf535ce06ccde632172b27003c61fb80";

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  }
  function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

  function accounts() {
    const list = read(ACCOUNTS_KEY, []);
    if (!list.some((account) => account.username === "admin")) {
      list.unshift({ id: "local-admin", username: "admin", displayName: "Admin", passwordHash: ADMIN_HASH, isAdmin: true });
      write(ACCOUNTS_KEY, list);
    }
    return list;
  }

  function currentAccount() {
    const id = localStorage.getItem(SESSION_KEY);
    return accounts().find((account) => account.id === id) || null;
  }

  function publicUser(account) {
    return account ? {
      id: account.id,
      username: account.username,
      displayName: account.displayName,
      isAdmin: Boolean(account.isAdmin),
      chatgptLinked: false,
      chatgptDisplayName: null,
    } : null;
  }

  async function digest(username, password) {
    const bytes = new TextEncoder().encode(`galrae-local:${username}:${password}`);
    const hash = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function json(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
  }

  async function requestBody(init) {
    try {
      const body = JSON.parse(init?.body || "{}");
      return body && typeof body === "object" && !Array.isArray(body) ? body : {};
    }
    catch { return {}; }
  }

  function leaderboardEntries() {
    const user = currentAccount();
    const list = accounts();
    const scores = read(SCORES_KEY, {});
    return Object.entries(scores)
      .map(([id, score]) => {
        const account = list.find((entry) => entry.id === id);
        return account && {
          displayName: account.displayName,
          bestScore: score.bestScore,
          bestPracticeScore: score.bestPracticeScore || 0,
          gamesPlayed: score.normalAttempts ?? score.gamesPlayed ?? 0,
          uniqueSpeciesCount: Object.keys(read(COLLECTIONS_KEY, {})[id] || {}).length,
          isCurrentUser: user?.id === id,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.bestScore - a.bestScore || a.gamesPlayed - b.gamesPlayed)
      .slice(0, 100).map((entry, index) => ({ ...entry, rank: index + 1 }));
  }

  async function route(path, method, init) {
    if (path === "/api/me" && method === "GET") {
      const user = currentAccount();
      return json({ user: publicUser(user), gamesPlayed: read(SCORES_KEY, {})[user?.id]?.gamesPlayed || 0, chatgpt: { available: false, displayName: null } });
    }
    if (path === "/api/auth/register" && method === "POST") {
      const body = await requestBody(init);
      const username = String(body.username || "").trim().toLowerCase();
      const displayName = String(body.displayName || "").trim();
      const password = String(body.password || "");
      if (!/^[a-z0-9_]{3,20}$/.test(username)) return json({ error: "아이디는 영문 소문자·숫자·밑줄 3~20자로 입력해주세요." }, 400);
      if (!displayName || displayName.length > 30) return json({ error: "표시할 이름을 1~30자로 입력해주세요." }, 400);
      if (password.length < 8) return json({ error: "비밀번호는 8자 이상이어야 합니다." }, 400);
      if (password !== body.confirmPassword) return json({ error: "비밀번호 확인이 일치하지 않습니다." }, 400);
      const list = accounts();
      if (list.some((account) => account.username === username)) return json({ error: "이미 사용 중인 아이디입니다." }, 409);
      const account = { id: crypto.randomUUID(), username, displayName, passwordHash: await digest(username, password), isAdmin: false };
      list.push(account);
      write(ACCOUNTS_KEY, list);
      localStorage.setItem(SESSION_KEY, account.id);
      return json({ user: publicUser(account) });
    }
    if (path === "/api/auth/login" && method === "POST") {
      const body = await requestBody(init);
      const username = String(body.username || "").trim().toLowerCase();
      const account = accounts().find((entry) => entry.username === username);
      if (!account || account.passwordHash !== await digest(username, String(body.password || ""))) {
        return json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." }, 401);
      }
      localStorage.setItem(SESSION_KEY, account.id);
      return json({ user: publicUser(account) });
    }
    if (path === "/api/auth/logout" && method === "POST") {
      localStorage.removeItem(SESSION_KEY);
      return json({ ok: true });
    }
    if (path === "/api/auth/link-chatgpt" && method === "POST") {
      return json({ error: "Vercel 정적 버전에서는 ChatGPT 계정 연결을 사용할 수 없습니다." }, 400);
    }
    if (path === "/api/collection") {
      const user = currentAccount();
      if (!user) return json({ error: "로그인이 필요합니다." }, 401);
      const collections = read(COLLECTIONS_KEY, {});
      const records = collections[user.id] || {};
      if (method === "GET") return json({ records: Object.values(records) });
      if (method === "POST") {
        const body = await requestBody(init);
        if (body.action === "record") {
          if (!validId(body.speciesId)) return json({ error: "생물 ID가 올바르지 않습니다." }, 400);
          const previous = records[body.speciesId];
          records[body.speciesId] = { speciesId: body.speciesId, count: (previous?.count || 0) + 1, minimum: previous?.minimum ?? false };
        } else {
          if (!Array.isArray(body.records) || body.records.length > 400 || !body.records.every((record) => record && validId(record.speciesId)
            && Number.isSafeInteger(record.count) && record.count >= 1 && record.count <= 1_000_000 && typeof record.minimum === "boolean")) {
            return json({ error: "분류 기록이 올바르지 않습니다." }, 400);
          }
          for (const record of body.records) {
            const previous = records[record.speciesId];
            if (!previous || record.count > previous.count || (record.count === previous.count && !record.minimum)) records[record.speciesId] = record;
          }
        }
        collections[user.id] = records;
        write(COLLECTIONS_KEY, collections);
        return json(body.action === "record" ? { record: records[body.speciesId] } : { synced: body.records.length });
      }
    }
    if (path === "/api/achievements" || path === "/api/plant-achievements") {
      const user = currentAccount();
      if (!user) return json({ error: "로그인이 필요합니다." }, 401);
      const plant = path === "/api/plant-achievements";
      const key = plant ? PLANTS_KEY : SCORES_KEY;
      const scores = read(key, {});
      const stats = scores[user.id] || {};
      if (method === "GET") {
        const map = plant ? plantMap : animalMap;
        const counts = Object.values(read(COLLECTIONS_KEY, {})[user.id] || {}).filter((record) => validId(record.speciesId) && map.has(record.speciesId));
        return json({ stats: { ...stats, normalAttempts: stats.normalAttempts ?? stats.gamesPlayed ?? 0,
          collected: counts.length, totalSuccesses: counts.reduce((sum, record) => sum + record.count, 0),
          repeatSuccesses: Math.max(0, ...counts.map((record) => record.count)) } });
      }
      if (method === "POST") {
        const body = await requestBody(init);
        if (!["normal-start", "failure", "practice-start", "practice-complete", "fish-sibling-mistake", "grass-sibling-mistake", ...(plant ? ["result"] : [])].includes(body.event)) {
          return json({ error: "잘못된 발전과제 이벤트입니다." }, 400);
        }
        if (body.event === "fish-sibling-mistake" || body.event === "grass-sibling-mistake") {
          const map = plant ? plantMap : animalMap;
          const initial = plant ? plantData.initialSpeciesId : "homo-sapiens";
          const check = plant ? isGrassSiblingMistake : isClassificationPolytomyMistake;
          if (body.event !== (plant ? "grass-sibling-mistake" : "fish-sibling-mistake")
            || !Array.isArray(body.classified) || body.classified.length >= map.size || !body.classified.includes(initial)
            || new Set(body.classified).size !== body.classified.length || !body.classified.every((id) => map.has(id))
            || !map.has(body.currentId) || body.classified.includes(body.currentId)
            || !check(body.classified, body.currentId, body.targetId, body.placement, map)) return json({ error: "오분류 조건이 올바르지 않습니다." }, 400);
          stats[plant ? "grassSiblingMistake" : "fishSiblingMistake"] = true;
          stats.hasFailed = true;
        }
        if (body.event === "normal-start") stats.normalAttempts = (stats.normalAttempts ?? stats.gamesPlayed ?? 0) + 1;
        if (body.event === "failure") stats.hasFailed = true;
        if (body.event === "practice-start" || body.event === "practice-complete") stats.practiceStarted = true;
        if (body.event === "practice-complete" && !plant) stats.practiceCompleted = true;
        if (body.event === "result") {
          const practice = body.mode === "practice";
          const completed = body.completedIds !== undefined;
          if (!Number.isInteger(body.score) || body.score < 0 || body.score >= plantMap.size
            || !["normal", "practice"].includes(body.mode) || body.difficulty !== (practice ? "hard" : "easy")
            || (completed && (!Array.isArray(body.completedIds) || body.completedIds.length !== plantMap.size
              || !global.GalraeLogic.isDifficultyCompletion(body.completedIds, "easy", plantMap, plantData.initialSpeciesId)
              || (!practice && body.score !== plantMap.size - 1)))
            || (!completed && body.score === plantMap.size - 1)) return json({ error: "식물계 기록이 올바르지 않습니다." }, 400);
          const metric = practice ? "bestPracticeScore" : "bestScore";
          stats[metric] = Math.max(stats[metric] || 0, body.score);
          if (practice) stats.practiceStarted = true;
          if (completed) stats[practice ? "practiceCompleted" : "easyCompleted"] = true;
        }
        scores[user.id] = stats;
        write(key, scores);
        return json({ ok: true });
      }
    }
    if (path === "/api/leaderboard" && method === "GET") return json({ entries: leaderboardEntries() });
    if (path === "/api/leaderboard" && method === "POST") {
      const user = currentAccount();
      if (!user) return json({ error: "로그인이 필요합니다." }, 401);
      const body = await requestBody(init);
      const score = Number(body.score);
      const practice = body.mode === "practice";
      const difficulty = body.difficulty || "hard";
      if (!Number.isInteger(score) || score < 0 || score >= animalMap.size || ![undefined, "normal", "practice"].includes(body.mode)
        || !["easy", "medium", "hard"].includes(difficulty)) return json({ error: "게임 기록이 올바르지 않습니다." }, 400);
      if (body.completedIds !== undefined && (practice || !global.GalraeLogic.isDifficultyCompletion(body.completedIds, difficulty, animalMap)
        || score !== body.completedIds.length - 1)) return json({ error: "완주 조건이 올바르지 않습니다." }, 400);
      const scores = read(SCORES_KEY, {});
      const previous = scores[user.id] || { bestScore: 0, gamesPlayed: 0 };
      scores[user.id] = { ...previous,
        bestScore: practice ? previous.bestScore : Math.max(previous.bestScore || 0, score),
        bestPracticeScore: practice ? Math.max(previous.bestPracticeScore || 0, score) : previous.bestPracticeScore || 0,
        gamesPlayed: (previous.gamesPlayed || 0) + (practice ? 0 : 1),
        ...(body.completedIds !== undefined ? { [difficulty === "easy" ? "easyCompleted" : difficulty === "medium" ? "mediumCompleted" : "hardCompleted"]: true } : {}),
      };
      write(SCORES_KEY, scores);
      return json({ entry: scores[user.id] });
    }
    if (path === "/api/admin" && method === "GET") {
      const admin = currentAccount();
      if (!admin?.isAdmin) return json({ error: "관리자 권한이 필요합니다." }, 403);
      const scores = read(SCORES_KEY, {});
      return json({ users: accounts().map((account) => ({
        id: account.id, username: account.username, displayName: account.displayName,
        isAdmin: Boolean(account.isAdmin), chatgptLinked: false,
        bestScore: scores[account.id]?.bestScore || 0, gamesPlayed: scores[account.id]?.gamesPlayed || 0,
      })) });
    }
    if (path === "/api/admin" && method === "POST") {
      const admin = currentAccount();
      if (!admin?.isAdmin) return json({ error: "관리자 권한이 필요합니다." }, 403);
      const body = await requestBody(init);
      if (body.action === "reset-leaderboard") { write(SCORES_KEY, {}); return json({ ok: true }); }
      const list = accounts();
      const target = list.find((account) => account.id === body.userId);
      if (!target) return json({ error: "계정을 찾지 못했습니다." }, 404);
      if (body.action === "reset-password") {
        target.passwordHash = await digest(target.username, "12345678");
        write(ACCOUNTS_KEY, list);
        return json({ ok: true });
      }
      if (body.action === "delete-user" && !target.isAdmin) {
        write(ACCOUNTS_KEY, list.filter((account) => account.id !== target.id));
        const scores = read(SCORES_KEY, {});
        delete scores[target.id];
        write(SCORES_KEY, scores);
        for (const key of [PLANTS_KEY, COLLECTIONS_KEY]) {
          const stored = read(key, {}); delete stored[target.id]; write(key, stored);
        }
        return json({ ok: true });
      }
      return json({ error: "지원하지 않는 관리자 작업입니다." }, 400);
    }
    return json({ error: "Not found" }, 404);
  }

  global.fetch = function localFirstFetch(input, init = {}) {
    const url = new URL(input instanceof Request ? input.url : input, location.origin);
    if (url.origin !== location.origin || !url.pathname.startsWith("/api/")) return nativeFetch(input, init);
    return route(url.pathname, String(init.method || "GET").toUpperCase(), init).catch(() => json({ error: "브라우저 저장 공간을 사용할 수 없습니다." }, 503));
  };
}(window));
