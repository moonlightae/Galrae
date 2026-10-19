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

export function getPlantAlgaeGroups(ids, speciesById) {
  const groups = new Set();
  for (const id of ids) {
    const names = new Set((speciesById.get(id)?.taxonomy.lineage || []).map((taxon) => taxon.scientificName));
    if (names.has("Embryophyta")) continue;
    for (const group of ["Glaucophyta", "Rhodophyta", "Viridiplantae"]) if (names.has(group)) groups.add(group);
  }
  return groups.size;
}

export function getAchievements(stats = {}, total = 206, kingdom = "animals") {
  const tasks = kingdom === "plants" ? [
    ["first-failure", "킹받네", "stone", "식물 분류 실패하기 · 튜토리얼 제외", "hasFailed", 1, "failure"],
    ["first-practice", "가보자고", "stone", "식물계 연습모드 시작하기", "practiceStarted", 1, "practice"],
    ["practice-complete", "중요한 건 꺾여도 그냥 하는 마음", "silver", "식물계 연습모드 완주 · 자동 배치 포함", "practiceCompleted", 1, "practice"],
    ...[
      ["이거 실화냐?", "stone", 5], ["ㅇㅈ? ㅇ 인정", "bronze", 10], ["폼 미쳤다", "silver", 20],
      ["가슴이 웅장해진다", "gold", 30], ["이왜진", "diamond", 40],
    ].map(([title, grade, goal]) => [`best-${goal}`, title, grade, `식물계 일반모드 최고기록 ${goal}종`, "bestScore", goal, "tree", "종"]),
    ...[
      ["머선 129", "stone", 10], ["가즈아", "bronze", 50], ["존버는 승리한다", "silver", 100],
      ["광기 그 자체", "gold", 500], ["ㄹㅇㅋㅋ", "diamond", 1000],
    ].map(([title, grade, goal]) => [`attempts-${goal}`, title, grade, `식물계 일반모드 ${goal.toLocaleString("ko-KR")}회 도전`, "normalAttempts", goal, "attempts", "회"]),
    ["collection-10", "내 마음속에 저장", "bronze", "서로 다른 식물 10종 직접 분류", "collected", 10, "collection", "종"],
    ["collection-25", "알잘딱깔센", "silver", "서로 다른 식물 25종 직접 분류", "collected", 25, "collection", "종"],
    ["collection-all", "완전 럭키비키잖아", "gold", `시작 카드 무궁화를 제외한 식물 ${total}종 모두 수집`, "collected", total, "collection", "종"],
    ["repeat-10", "또 너야?", "bronze", "같은 식물을 10번 올바르게 분류", "repeatSuccesses", 10, "attempts", "회"],
    ["repeat-100", "형이 왜 거기서 나와", "gold", "같은 식물을 100번 올바르게 분류", "repeatSuccesses", 100, "attempts", "회"],
    ["repeat-1000", "어쩔식물 저쩔식물", "diamond", "같은 식물을 1,000번 올바르게 분류", "repeatSuccesses", 1000, "attempts", "회"],
    ["successes-100", "이븐하게 맞혔네요", "silver", "식물계 일반·연습모드 누적 정답 100회", "totalSuccesses", 100, "tree", "회"],
    ["successes-1000", "레게노", "diamond", "식물계 일반·연습모드 누적 정답 1,000회", "totalSuccesses", 1000, "tree", "회"],
    ["practice-perfect", "무야호", "diamond", `연습모드에서 식물 ${total}종 모두 직접 맞히기`, "bestPracticeScore", total, "practice", "종"],
    ["complete-easy", "중요한 건 꺾이지 않는 마음", "silver", "식물계 쉬움 난이도 완주 · 연습·튜토리얼 제외", "easyCompleted", 1, "tree"],
    ["algae-groups", "상상도 못한 정체", "bronze", "회색조류·홍조류·녹조류에서 한 종씩 직접 분류", "algaeGroups", 3, "algae", "갈래"],
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
    const category = icon === "fish" || icon === "algae" ? "특별" : icon === "practice" ? "연습모드" : metric === "bestScore" || metric === "normalAttempts" || id.startsWith("complete-") ? "일반모드" : "기본";
    return { id: kingdom === "plants" ? `plant-${id}` : id, title, grade, description, goal, icon, unit, value, category, earned: value >= goal };
  });
}
