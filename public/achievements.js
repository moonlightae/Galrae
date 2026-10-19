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

export function getAchievements(stats = {}, total = 206, kingdom = "animals") {
  const tasks = kingdom === "plants" ? [
    ["first-failure", "정답인 줄 알았던 건에 대하여", "stone", "식물 분류 실패하기 · 튜토리얼 제외", "hasFailed", 1, "failure"],
    ["first-practice", "정답아, 내게 힘을 빌려줘", "stone", "식물계 연습모드 시작하기", "practiceStarted", 1, "practice"],
    ["practice-complete", "꺾여도 완주는 하는 마음", "silver", "식물계 연습모드 완주 · 자동 배치 포함", "practiceCompleted", 1, "practice"],
    ...[
      ["나, 식물 분류 좋아하네", "stone", 5], ["식물 분류, 참 쉽죠?", "bronze", 10], ["분류 폼 올라온다", "silver", 20],
      ["분류 좀 해 본 녀석인가", "gold", 30], ["이러다 다 맞히겠어", "diamond", 40],
    ].map(([title, grade, goal]) => [`best-${goal}`, title, grade, `식물계 일반모드 최고기록 ${goal}종`, "bestScore", goal, "tree", "종"]),
    ...[
      ["한 판 더는 못 참지", "stone", 10], ["한 판만 더 한다며", "bronze", 50], ["백 번 찍어 안 넘어가는 계통수", "silver", 100],
      ["포기를 모르는 분류왕", "gold", 500], ["분명 잠깐만 하려고 했는데", "diamond", 1000],
    ].map(([title, grade, goal]) => [`attempts-${goal}`, title, grade, `식물계 일반모드 ${goal.toLocaleString("ko-KR")}회 도전`, "normalAttempts", goal, "attempts", "회"]),
    ["collection-10", "내 도감 속에 저장", "bronze", "서로 다른 식물 10종 직접 분류", "collected", 10, "collection", "종"],
    ["collection-25", "반은 모았잖아, 한잔해", "silver", "서로 다른 식물 25종 직접 분류", "collected", 25, "collection", "종"],
    ["collection-all", "도감 정상화", "gold", `시작 카드 무궁화를 제외한 식물 ${total}종 모두 수집`, "collected", total, "collection", "종"],
    ["repeat-10", "또 너네? 자리 알지?", "bronze", "같은 식물을 10번 올바르게 분류", "repeatSuccesses", 10, "attempts", "회"],
    ["repeat-100", "너의 자리는.", "gold", "같은 식물을 100번 올바르게 분류", "repeatSuccesses", 100, "attempts", "회"],
    ["repeat-1000", "천 번째 만남은 계획대로", "diamond", "같은 식물을 1,000번 올바르게 분류", "repeatSuccesses", 1000, "attempts", "회"],
    ["successes-100", "정답이 복사가 된다고", "silver", "식물계 일반·연습모드 누적 정답 100회", "totalSuccesses", 100, "tree", "회"],
    ["successes-1000", "분류해 봐서 아는데", "diamond", "식물계 일반·연습모드 누적 정답 1,000회", "totalSuccesses", 1000, "tree", "회"],
    ["practice-perfect", "자동 배치는 약한 자들이나", "diamond", `연습모드에서 식물 ${total}종 모두 직접 맞히기`, "bestPracticeScore", total, "practice", "종"],
    ["complete-easy", "쉬움 컷", "silver", "식물계 쉬움 난이도 완주 · 연습·튜토리얼 제외", "easyCompleted", 1, "tree"],
    ["grass-sibling", "너 내 풀 동료가 돼라", "bronze", "무궁화가 있는 계통수에서 벼와 고사리만 한 쌍으로 오분류하기 · 튜토리얼 제외", "grassSiblingMistake", 1, "grass"],
  ] : [
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
    ["repeat-10", "익숙한 얼굴", "bronze", "같은 동물을 10번 올바르게 분류", "repeatSuccesses", 10, "attempts", "회"],
    ["repeat-100", "우연이 계속되면 인연이 되고", "gold", "같은 생물을 100번 올바르게 분류", "repeatSuccesses", 100, "attempts", "회"],
    ["repeat-1000", "인연이 계속되면 연ㅇ...", "diamond", "같은 생물을 1,000번 올바르게 분류", "repeatSuccesses", 1000, "attempts", "회"],
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
    return { id: kingdom === "plants" ? `plant-${id}` : id, title, grade, description, goal, icon, unit, value, category, earned: value >= goal };
  });
}
