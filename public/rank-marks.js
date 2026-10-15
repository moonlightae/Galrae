export const legendRanks = ["phylum", "superclass", "class", "subclass", "infraclass", "order"];
export const rankNames = { phylum: ["문", "Phylum"], superclass: ["상강", "Superclass"], class: ["강", "Class"], subclass: ["아강", "Subclass"], infraclass: ["하강", "Infraclass"], order: ["목", "Order"] };
for (const [rank, ko] of Object.entries({ kingdom: "계", subkingdom: "아계", infrakingdom: "하계", superphylum: "상문", subphylum: "아문", infraphylum: "하문", megaclass: "거강", subterclass: "소강", superlegion: "상군", legion: "군", sublegion: "아군", infralegion: "하군", megacohort: "거집단", supercohort: "상집단", cohort: "집단", subcohort: "아집단", infracohort: "하집단", magnorder: "거목", superorder: "상목", grandorder: "대목", mirorder: "중목", section: "절", subsection: "아절", division: "구", subdivision: "아구", series: "계열", clade: "계급 없는 분류군" })) rankNames[rank] = [ko, rank];
const shapes = {
  phylum: '<polygon points="7,3 17,3 22,12 17,21 7,21 2,12"/>',
  superclass: '<polygon points="12,2 22,12 12,22 2,12"/>',
  class: '<circle cx="12" cy="12" r="9"/>',
  subclass: '<rect x="3" y="3" width="18" height="18"/>',
  infraclass: '<polygon points="12,2 22,21 2,21"/>',
  order: '<polygon points="12,2 22,9 18,21 6,21 2,9"/>',
};
export function rankMark(rank) {
  return `<svg class="rank-mark" viewBox="0 0 24 24" aria-hidden="true" fill="var(--surface, white)" stroke="currentColor" stroke-width="2" stroke-linejoin="round">${shapes[rank] || `<path d="M4,3 L12,10 L20,3 M12,10 V15" fill="none"/><text x="12" y="23" text-anchor="middle" fill="currentColor" stroke="none" font-size="7">${rank === "clade" ? "" : rankNames[rank]?.[0] || ""}</text>`}</svg>`;
}
