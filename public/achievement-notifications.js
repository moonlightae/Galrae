export function createAchievementNotifications(stack, render) {
  const seen = new Set(), timers = new Set(), queue = [];
  let ready = false, entranceTimer = null;
  function schedule(callback, delay) {
    const timer = setTimeout(() => { timers.delete(timer); callback(); }, delay);
    timers.add(timer);
    return timer;
  }
  function showNext() {
    const task = queue.shift();
    if (!task) return;
    const notice = document.createElement("div");
    notice.className = "achievement-notification is-earned";
    notice.innerHTML = render(task);
    stack.appendChild(notice);
    schedule(() => notice.classList.add("is-leaving"), 2800);
    schedule(() => notice.remove(), 3000);
    entranceTimer = schedule(() => { entranceTimer = null; showNext(); }, 350);
  }
  return {
    update(tasks, notify = true) {
      for (const task of tasks) {
        if (!task.earned || seen.has(task.id)) continue;
        seen.add(task.id);
        if (ready && notify) queue.push(task);
      }
      ready = true;
      if (!entranceTimer && queue.length) showNext();
    },
    reset() {
      for (const timer of timers) clearTimeout(timer);
      timers.clear(); seen.clear(); queue.length = 0;
      entranceTimer = null; ready = false; stack.replaceChildren();
    },
  };
}
