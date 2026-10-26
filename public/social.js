export function createSocial({ getUser, getKingdom, onRoom, onLeave, onFriendsChanged }) {
  const $ = (selector) => document.querySelector(selector);
  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let friends = [], rooms = [], activeRoom = null, loading = false, writing = false;
  let ownerId = null;
  const message = (text) => { $("#social-status").textContent = text; };

  async function request(path, body) {
    const response = await fetch(path, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "요청을 처리하지 못했습니다.");
    return data;
  }

  function render() {
    const user = getUser();
    $("#friend-form").hidden = !user;
    $("#social-account").textContent = user ? `내 아이디 @${user.username}` : "로그인 후 친구를 추가하고 함께 대결해 보세요.";
    $("#friend-list").innerHTML = friends.map((friend) => `<li class="social-row"><span><strong>${escape(friend.displayName || friend.username)}</strong> <small>@${escape(friend.username)}</small>${!friend.accepted ? `<small> · ${friend.incoming ? "받은 요청" : "요청 보냄"}</small>` : ""}</span><span class="social-actions">${friend.accepted ? `<button type="button" class="text-button" data-social="battle" data-id="${escape(friend.id)}">대결 신청</button>` : friend.incoming ? `<button type="button" class="text-button" data-social="accept" data-username="${escape(friend.username)}">수락</button>` : ""}<button type="button" class="text-button" data-social="remove" data-username="${escape(friend.username)}">${friend.accepted ? "삭제" : friend.incoming ? "거절" : "취소"}</button></span></li>`).join("") || '<li class="social-empty">추가한 친구가 없습니다.</li>';
    $("#battle-list").innerHTML = rooms.map((room) => {
      const other = room.players.find((player) => player.id !== user?.id);
      const result = room.status === "waiting" ? "수락 대기" : room.status === "active" ? "진행 중" : room.reason === "cancelled" ? "취소됨" : room.winnerId ? (room.winnerId === user?.id ? "승리" : "패배") : "무승부";
      return `<li class="social-row"><span><strong>${escape(other?.displayName || other?.username)}</strong><small> · ${room.kingdom === "plants" ? "식물계" : "동물계"} · ${result} · ${room.classified.length - 1}종</small></span><span class="social-actions">${room.status === "waiting" && room.guestId === user?.id ? `<button type="button" class="text-button" data-social="join" data-id="${room.id}">수락하고 시작</button>` : room.status === "active" ? `<button type="button" class="text-button" data-social="resume" data-id="${room.id}">대결 복귀</button>` : ""}${room.status === "waiting" ? `<button type="button" class="text-button" data-social="cancel" data-id="${room.id}">${room.hostId === user?.id ? "취소" : "거절"}</button>` : ""}</span></li>`;
    }).join("") || '<li class="social-empty">친구에게 대결을 신청해 보세요.</li>';
  }

  async function load() {
    if (loading) return;
    loading = true;
    const userId = getUser()?.id;
    if (ownerId !== userId) { friends = []; rooms = []; activeRoom = null; ownerId = userId; render(); }
    if (!userId) { render(); loading = false; return; }
    try {
      const [friendData, battleData] = await Promise.all([request("/api/friends"), request("/api/battles")]);
      if (getUser()?.id !== userId) return;
      friends = friendData.friends; rooms = battleData.rooms;
      render();
    } catch (error) { message(error.message); }
    finally { loading = false; }
  }

  async function act(button) {
    if (writing) return;
    writing = true; button.disabled = true;
    const userId = getUser()?.id;
    try {
      const action = button.dataset.social;
      if (["request", "accept", "remove"].includes(action)) {
        await request("/api/friends", { action, username: action === "request" ? $("#friend-username").value : button.dataset.username });
        if (getUser()?.id !== userId) return;
        if (action === "request") $("#friend-username").value = "";
        message(action === "request" ? "친구 요청을 보냈습니다. 상대가 수락하면 기록이 함께 표시됩니다." : "친구 목록을 갱신했습니다.");
        onFriendsChanged();
      } else if (action === "battle") {
        const { room } = await request("/api/battles", { action: "create", friendId: button.dataset.id, kingdom: getKingdom() });
        if (getUser()?.id !== userId) return;
        activeRoom = room;
        message("대결을 신청했습니다. 상대가 수락하면 시작합니다.");
        if (room.status === "active") onRoom(room);
      } else {
        const room = rooms.find((item) => item.id === button.dataset.id);
        if (!room) return;
        const data = action === "resume" ? await request(`/api/battles?id=${encodeURIComponent(room.id)}`)
          : await request("/api/battles", { action: action === "join" ? "join" : "forfeit", id: room.id, revision: room.revision });
        if (getUser()?.id !== userId) return;
        if (action !== "cancel") { activeRoom = data.room; onRoom(data.room); }
        else if (activeRoom?.id === room.id) activeRoom = null;
      }
      await load();
    } catch (error) { message(error.message); }
    finally { writing = false; button.disabled = false; }
  }

  $("#friend-form").addEventListener("submit", (event) => { event.preventDefault(); act($("#friend-submit")); });
  $("#friends-page").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-social]");
    if (button && button.id !== "friend-submit") act(button);
  });
  $("#social-refresh").addEventListener("click", load);

  setInterval(async () => {
    if (document.hidden || loading || writing) return;
    if (!getUser() || getUser().id !== ownerId) { activeRoom = null; return; }
    if (activeRoom && activeRoom.status !== "finished") {
      loading = true;
      const id = activeRoom.id, userId = getUser().id;
      try {
        const { room } = await request(`/api/battles?id=${encodeURIComponent(id)}`);
        if (activeRoom?.id !== id || getUser()?.id !== userId) return;
        if (room.revision !== activeRoom.revision) {
          activeRoom = room;
          if (room.status !== "waiting") onRoom(room);
        }
        $("#battle-connection").textContent = "";
      } catch (error) { $("#battle-connection").textContent = `${error.message} 연결을 다시 시도하고 있습니다.`; }
      finally { loading = false; }
    } else if (!$("#friends-page").hidden) await load();
  }, 1500);

  return {
    load,
    async move(targetId, placement) {
      if (writing || !activeRoom || activeRoom.status !== "active" || activeRoom.turnId !== getUser()?.id) return;
      writing = true;
      const room = activeRoom;
      try {
        const data = await request("/api/battles", { action: "move", id: room.id, revision: room.revision, targetId, placement });
        if (getUser()?.id === ownerId) { activeRoom = data.room; onRoom(data.room); }
      } catch (error) { $("#battle-connection").textContent = error.message; }
      finally { writing = false; }
    },
    async leave() {
      if (writing) return false;
      if (activeRoom && activeRoom.status !== "finished") {
        writing = true;
        try { await request("/api/battles", { action: "forfeit", id: activeRoom.id, revision: activeRoom.revision }); }
        catch (error) { $("#battle-connection").textContent = error.message; return false; }
        finally { writing = false; }
      }
      activeRoom = null; onLeave(); return true;
    },
  };
}
