export const achievementGrades = { stone: "돌", bronze: "동", silver: "은", gold: "금", diamond: "다이아" };

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
    ["repeat-10", "익숙한 얼굴", "bronze", "같은 동물을 10번 올바르게 분류", "repeatSuccesses", 10, "attempts", "회"],
    ["successes-1000", "천 번의 정답", "silver", "일반·연습모드에서 누적 정답 1,000회 달성", "totalSuccesses", 1000, "tree", "회"],
    ["practice-perfect", "연습의 끝판왕", "diamond", `연습모드에서 ${total}종 모두 직접 맞히기`, "bestPracticeScore", total, "practice", "종"],
  ];
  return tasks.map(([id, title, grade, description, metric, goal, icon, unit]) => {
    const value = Math.max(0, Number(stats[metric]) || 0);
    const category = icon === "practice" ? "연습모드" : metric === "bestScore" || metric === "normalAttempts" ? "일반모드" : "기본";
    return { id, title, grade, description, goal, icon, unit, value, category, earned: value >= goal };
  });
}
