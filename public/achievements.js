await import(`./game-logic.js${new URL(import.meta.url).search}`);

export const achievementGrades = { stone: "돌", bronze: "동", silver: "은", gold: "금", diamond: "다이아" };

export function isClassificationPolytomyMistake(classified, currentId, targetId, placement, speciesById) {
  if (placement !== "join") return false;
  const hasTaxon = (id, taxonId) => speciesById.get(id)?.taxonomy.lineage.some((taxon) => taxon.wikidataId === taxonId);
  const group = (id) => {
    for (const taxon of ["Q7377", "Q5113", "Q10811", "Q10908"]) {
      if (hasTaxon(id, taxon)) return taxon;
    }
    return hasTaxon(id, "Q25241") && !hasTaxon(id, "Q19159") ? "fish" : null;
  };
  const currentGroup = group(currentId);
  if (!currentGroup) return false;
  const { buildTree, findNodeById, collectLeafIds, getExpectedPlacement, isEquivalentPlacement } = globalThis.GalraeLogic;
  const tree = buildTree(classified, speciesById);
  const target = findNodeById(tree, targetId);
  if (!target || target.type !== "branch") return false;
  const groups = new Set([currentGroup]);
  for (const child of target.children) {
    const members = collectLeafIds(child).map(group);
    if (members[0] && members.every((value) => value === members[0])) groups.add(members[0]);
  }
  return groups.size >= 3
    && !isEquivalentPlacement(tree, getExpectedPlacement(classified, currentId, speciesById), targetId, placement);
}

export function isGrassSiblingMistake(classified, currentId, targetId, placement, speciesById) {
  const pair = ["oryza-sativa", "pteridium-aquilinum"];
  if (placement !== "wrap" || !pair.includes(currentId) || !classified.includes("hibiscus-syriacus")) return false;
  const other = pair.find((id) => id !== currentId);
  if (targetId !== other || !classified.includes(other) || classified.includes(currentId)) return false;
  const { buildTree, getExpectedPlacement, isEquivalentPlacement } = globalThis.GalraeLogic;
  return !isEquivalentPlacement(buildTree(classified, speciesById), getExpectedPlacement(classified, currentId, speciesById), targetId, placement);
}

export function getAchievements(stats = {}, total = 206) {
  const tasks = [
    ["first-failure", "실패는 성공의 어머니", "stone", "분류 실패하기 · 튜토리얼 제외", "hasFailed", 1, "failure"],
    ["first-practice", "넴쥬포인트 찍어주세요", "stone", "연습모드 해보기", "practiceStarted", 1, "practice"],
    ["practice-complete", "아 이제 다 이해했어", "silver", "연습모드에서 모든 종 분류하기 · 자동 배치 포함", "practiceCompleted", 1, "practice"],
    ...[
      ["동물분류 입문자", "stone", 10], ["동물분류 애호가", "bronze", 25],
      ["동물분류 학사", "silver", 50], ["동물분류 석사", "gold", 100], ["동물분류 박사", "diamond", 200],
    ].map(([title, grade, goal]) => [`best-${goal}`, title, grade, `분류 최고기록 ${goal}종 달성`, "bestScore", goal, "tree", "종"]),
    ...[
      ["우공이산", "stone", 100], ["마부작침", "bronze", 500], ["수적천석", "silver", 1000],
      ["분골쇄신", "gold", 2000], ["어...할 거 없으세요?", "diamond", 10000],
    ].map(([title, grade, goal]) => [`attempts-${goal}`, title, grade, `일반모드 ${goal.toLocaleString("ko-KR")}회 도전`, "normalAttempts", goal, "attempts", "회"]),
    ["collection-25", "작은 도감", "bronze", "서로 다른 동물 25종 수집", "collected", 25, "collection", "종"],
    ["collection-100", "움직이는 도감", "silver", "서로 다른 동물 100종 수집", "collected", 100, "collection", "종"],
    ["collection-all", "동물계 도감 완성", "gold", `시작 카드인 인간을 제외한 ${total}종 모두 수집`, "collected", total, "collection", "종"],
    ["repeat-10", "익숙한 얼굴", "bronze", "모든 계에서 누적 정답 10회 달성", "totalSuccesses", 10, "attempts", "회"],
    ["repeat-100", "우연이 계속되면 인연이 되고", "gold", "모든 계에서 누적 정답 100회 달성", "totalSuccesses", 100, "attempts", "회"],
    ["repeat-1000", "인연이 계속되면 연ㅇ...", "diamond", "모든 계에서 누적 정답 1,000회 달성", "totalSuccesses", 1000, "attempts", "회"],
    ["successes-1000", "천 번의 정답", "silver", "일반·연습모드에서 누적 정답 1,000회 달성", "totalSuccesses", 1000, "tree", "회"],
    ["successes-10000", "서당개 삼 년이면 풍월을 읊는다더니", "diamond", "일반·연습모드에서 누적 정답 10,000회 달성", "totalSuccesses", 10000, "tree", "회"],
    ["practice-perfect", "연습의 끝판왕", "diamond", `연습모드에서 ${total}종 모두 직접 맞히기`, "bestPracticeScore", total, "practice", "종"],
    ["complete-easy", "갈래 입문자", "silver", "쉬움 난이도 완주", "easyCompleted", 1, "tree"],
    ["complete-medium", "갈래 초심자", "gold", "보통 난이도 완주", "mediumCompleted", 1, "tree"],
    ["complete-hard", "갈래 전문가", "diamond", "어려움 난이도 완주", "hardCompleted", 1, "tree"],
    ["fish-sibling", "자, 이게 분류학이야", "bronze", "어류·파충류·조류·양서류·포유류 중 세 분류군이 한 분기점에서 갈라지도록 오분류하기", "fishSiblingMistake", 1, "fish"],
  ];
  return tasks.map(([id, title, grade, description, metric, goal, icon, unit]) => {
    const value = Math.max(0, Number(stats[metric]) || 0);
    const category = icon === "fish" || icon === "grass" ? "특별" : icon === "practice" ? "연습모드" : metric === "bestScore" || metric === "normalAttempts" || id.startsWith("complete-") ? "일반모드" : "기본";
    return { id, title, grade, description, goal, icon, unit, value, category, earned: value >= goal };
  });
}

export function getUnifiedAchievements(animals = {}, plants = {}, animalTotal = 206, plantTotal = 45) {
  const totalSuccesses = (animals.totalSuccesses || 0) + (plants.totalSuccesses || 0);
  const practiceCompleted = [animals.practiceCompleted, plants.practiceCompleted].map(Boolean);
  const practicePerfect = [animals.bestPracticeScore >= animalTotal, plants.bestPracticeScore >= plantTotal];
  const shared = { ...animals, totalSuccesses,
    normalAttempts: (animals.normalAttempts || 0) + (plants.normalAttempts || 0),
    hasFailed: animals.hasFailed || plants.hasFailed,
    practiceStarted: animals.practiceStarted || plants.practiceStarted,
    practiceCompleted: practiceCompleted.some(Boolean),
    easyCompleted: animals.easyCompleted || plants.easyCompleted,
    mediumCompleted: animals.mediumCompleted || plants.mediumCompleted,
    hardCompleted: animals.hardCompleted || plants.hardCompleted,
  };
  const tasks = getAchievements(shared, animalTotal).map((task) => {
    if (task.id === "practice-perfect") {
      const value = Number(practicePerfect.some(Boolean));
      return { ...task, description: "동물계 또는 식물계 연습모드의 모든 종을 자동 배치 없이 직접 맞히기", value, goal: 1, unit: "", earned: Boolean(value) };
    }
    const description = task.id.startsWith("best-") ? `동물계 일반모드 최고기록 ${task.goal}종 달성`
      : task.id.startsWith("attempts-") ? `모든 계의 일반모드 도전 횟수 합계 ${task.goal.toLocaleString("ko-KR")}회`
      : task.id.startsWith("complete-") ? `동물계 또는 식물계 ${task.id === "complete-easy" ? "쉬움" : task.id === "complete-medium" ? "보통" : "어려움"} 난이도 완주`
      : task.id === "practice-complete" ? "동물계 또는 식물계 연습모드의 모든 종 분류하기 · 자동 배치 포함"
      : task.id === "first-practice" ? "동물계 또는 식물계 연습모드 시작하기"
      : task.id === "first-failure" ? "동물계 또는 식물계 분류 실패하기 · 튜토리얼 제외"
      : task.id.startsWith("successes-") ? `모든 계의 일반·연습모드 누적 정답 ${task.goal.toLocaleString("ko-KR")}회 달성`
      : task.description;
    return { ...task, description };
  });
  const plantTasks = tasks.filter((task) => task.id.startsWith("best-") || task.id.startsWith("collection-")).map((task) => {
    const collection = task.id.startsWith("collection-");
    const goal = task.id === "collection-all" ? plantTotal : task.goal;
    const value = Math.max(0, Number(collection ? plants.collected : plants.bestScore) || 0);
    return { ...task, id: `plant-${task.id}`, title: collection ? "미정" : task.title.replace("동물분류", "식물분류"), goal, value, earned: value >= goal,
      description: collection ? task.id === "collection-all" ? `시작 카드 무궁화를 제외한 식물 ${plantTotal}종 모두 수집` : `서로 다른 식물 ${goal}종 수집` : `식물계 일반모드 최고기록 ${goal}종 달성` };
  });
  const allPractice = [
    ["practice-all-complete", "모든 계 연습 완주", "gold", "플레이 가능한 모든 계(동물계·식물계)의 연습모드 완주 · 자동 배치 포함", practiceCompleted],
    ["practice-all-perfect", "모든 계 연습 정복", "diamond", "플레이 가능한 모든 계(동물계·식물계)의 연습모드를 자동 배치 없이 모두 직접 맞히기", practicePerfect],
  ].map(([id, title, grade, description, completed]) => {
    const value = completed.filter(Boolean).length;
    return { id, title, grade, description, goal: completed.length, value, unit: "계", icon: "practice", category: "연습모드", earned: value === completed.length };
  });
  return [...tasks, ...plantTasks, ...allPractice];
}
