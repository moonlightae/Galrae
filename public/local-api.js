(function installLocalApi(global) {
  const nativeFetch = global.fetch.bind(global);
  const ACCOUNTS_KEY = "galrae.local.accounts.v1";
  const SESSION_KEY = "galrae.local.session.v1";
  const SCORES_KEY = "galrae.local.scores.v1";
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
    try { return JSON.parse(init?.body || "{}"); }
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
          gamesPlayed: score.gamesPlayed,
          isCurrentUser: user?.id === id,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.bestScore - a.bestScore || a.gamesPlayed - b.gamesPlayed)
      .slice(0, 100);
  }

  async function route(path, method, init) {
    if (path === "/api/me" && method === "GET") {
      return json({ user: publicUser(currentAccount()), chatgpt: { available: false, displayName: null } });
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
    if (path === "/api/leaderboard" && method === "GET") return json({ entries: leaderboardEntries() });
    if (path === "/api/leaderboard" && method === "POST") {
      const user = currentAccount();
      if (!user) return json({ error: "로그인이 필요합니다." }, 401);
      const body = await requestBody(init);
      const score = Math.max(0, Number(body.score) || 0);
      const scores = read(SCORES_KEY, {});
      const previous = scores[user.id] || { bestScore: 0, gamesPlayed: 0 };
      scores[user.id] = { bestScore: Math.max(previous.bestScore, score), gamesPlayed: previous.gamesPlayed + 1 };
      write(SCORES_KEY, scores);
      return json({ ok: true });
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
        return json({ ok: true });
      }
      return json({ error: "지원하지 않는 관리자 작업입니다." }, 400);
    }
    return json({ error: "Not found" }, 404);
  }

  global.fetch = function localFirstFetch(input, init = {}) {
    const url = new URL(typeof input === "string" ? input : input.url, location.origin);
    if (url.origin !== location.origin || !url.pathname.startsWith("/api/")) return nativeFetch(input, init);
    return route(url.pathname, String(init.method || "GET").toUpperCase(), init);
  };
}(window));
