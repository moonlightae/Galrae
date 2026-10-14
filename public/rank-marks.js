export const legendRanks = ["phylum", "superclass", "class", "subclass", "infraclass", "order"];
export const rankNames = { phylum: ["문", "Phylum"], superclass: ["상강", "Superclass"], class: ["강", "Class"], subclass: ["아강", "Subclass"], infraclass: ["하강", "Infraclass"], order: ["목", "Order"] };
const shapes = {
  phylum: '<polygon points="7,3 17,3 22,12 17,21 7,21 2,12"/>',
  superclass: '<polygon points="12,2 22,12 12,22 2,12"/>',
  class: '<circle cx="12" cy="12" r="9"/>',
  subclass: '<rect x="3" y="3" width="18" height="18"/>',
  infraclass: '<polygon points="12,2 22,21 2,21"/>',
  order: '<polygon points="12,2 22,9 18,21 6,21 2,9"/>',
};
export function rankMark(rank) {
  return `<svg class="rank-mark" viewBox="0 0 24 24" aria-hidden="true" fill="var(--surface, white)" stroke="currentColor" stroke-width="2" stroke-linejoin="round">${shapes[rank] || '<path d="M4,3 L12,11 L20,3 M12,11 V22" fill="none"/>'}</svg>`;
}
