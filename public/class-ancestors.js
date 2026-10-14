const version = new URL(import.meta.url).search;
const [{ additionalClassAncestors }, { taxonRanks, classRanks, rankLabels }, { upperAncestors }, { taxonProfiles }, { rankMark, rankNames }] = await Promise.all([
  import(`./additional-class-ancestors.js${version}`), import(`./taxon-ranks.js${version}`), import(`./upper-ancestors.js${version}`),
  import(`./taxon-profiles.js${version}`), import(`./rank-marks.js${version}`),
]);

export const classAncestors = {
  ...additionalClassAncestors,
  Q7377: {
    name: "Mammalia", koName: "포유강",
    ko: ["털·젖샘과 같은 특징, 두개골 화석, DNA를 함께 비교해 관계를 추론합니다.", "공통 조상은 털과 수유 능력을 가졌을 것으로 추정합니다. 오늘날의 특정 포유류가 그 조상이라는 뜻은 아닙니다.", "2023년 Zoonomia 연구는 태반류 241종의 유전체로 그 내부 분기와 분화 시기를 분석했습니다. 포유강 전체와 태반류의 조상은 구분해야 합니다."],
    en: ["Relationships are inferred from traits such as hair and mammary glands, fossil skulls and DNA.", "The common ancestor is inferred to have had hair and nursed its young. No living mammal is identified as that ancestor.", "The 2023 Zoonomia study used 241 placental mammal genomes to examine their branching and timing. The placental ancestor is distinct from the ancestor of all mammals."],
    sources: [["Mammary glands · University of Michigan", "https://animaldiversity.org/collections/mammal_anatomy/mammary_glands/"], ["Zoonomia · Science (2023)", "https://pmc.ncbi.nlm.nih.gov/articles/PMC10233747/"]],
  },
  Q132674: {
    name: "Hexacorallia", koName: "육방산호아강",
    ko: ["산호와 말미잘의 관계는 유전체와 다수 유전자 비교로 검토합니다. 2021년 연구는 육방산호류의 공통 갈래를 지지했습니다.", "공통 조상의 모습을 오늘날의 산호초로 생각하면 안 됩니다. 단단한 골격을 만들지 않는 말미잘도 이 갈래에 속합니다.", "2025년 돌산호 연구는 그 조상을 단독 생활을 하는 생물로 추정했습니다. 이것은 육방산호강 전체보다 좁은 돌산호목에 대한 결과입니다."],
    en: ["Genomes and many genes are compared to test the relationships of corals and anemones. A 2021 study supported a common hexacoral lineage.", "The ancestor should not be pictured as a modern coral reef. Anemones without a hard skeleton also belong to this lineage.", "A 2025 stony-coral study inferred a solitary ancestor. This result concerns Scleractinia, a narrower group than all Hexacorallia."],
    sources: [["Anthozoan phylogenomics (2021)", "https://doi.org/10.1093/sysbio/syaa103"], ["Stony-coral phylogeny · Nature (2025)", "https://www.nature.com/articles/s41586-025-09615-6"]],
  },
  Q248530: {
    name: "Demospongiae", koName: "보통해면강",
    ko: ["골격의 모양만으로는 관계를 충분히 알기 어렵습니다. 여러 유전자를 비교한 계통유전체 연구가 공통 갈래를 검토합니다.", "옛 해면의 골격은 오늘날 해면의 골격과 같았다고 단정할 수 없습니다. 화석과 유전정보를 함께 살펴야 합니다.", "2026년 연구는 보통해면과 육방해면의 가까운 관계를 지지하면서, 규질 골편이 여러 번 독립적으로 생겼을 가능성을 제시했습니다."],
    en: ["Skeleton shape alone is not enough to establish relationships. Phylogenomic studies compare many genes to test common lineages.", "Ancient sponge skeletons cannot simply be assumed to match those of living sponges. Fossils and genetic evidence must be considered together.", "A 2026 study supported a demosponge–glass-sponge relationship while proposing multiple independent origins of siliceous spicules."],
    sources: [["Sponge skeletal evolution · Science Advances (2026)", "https://doi.org/10.1126/sciadv.adx1754"]],
  },
  Q1358: {
    name: "Arachnida", koName: "거미강",
    ko: ["거미·전갈·진드기 등의 관계는 몸의 구조와 유전체를 비교해 연구합니다. 생김새가 비슷하다는 것만으로 하나의 갈래가 확정되지는 않습니다.", "이 강의 모든 동물이 하나의 배타적인 공통 갈래인지에 논쟁이 있어, 조상의 모습과 육상 진출 횟수도 단정하기 어렵습니다.", "2019년 연구는 거미강의 단일계통성을 지지했지만, 2022년 연구는 투구게가 그 안에 포함된다고 보고했습니다. 게임은 기존 거미강 묶음을 사용합니다."],
    en: ["The relationships of spiders, scorpions and mites are studied using anatomy and genomes. Similar appearances alone do not establish a single lineage.", "Whether this class forms one exclusive lineage is disputed, making its ancestral form and number of transitions onto land uncertain.", "A 2019 study supported arachnid monophyly, while a 2022 study placed horseshoe crabs within the group. The game retains the traditional arachnid grouping."],
    sources: [["Arachnid monophyly (2019)", "https://www.nature.com/articles/s41467-019-10244-7"], ["Alternative chelicerate phylogeny (2022)", "https://doi.org/10.1093/molbev/msac021"]],
  },
  Q1934949: {
    name: "Chromadorea", koName: "크로마도라강",
    ko: ["작고 비슷하게 생긴 선충들도 유전정보를 비교하면 서로 다른 갈래로 나뉩니다. 이 강에는 예쁜꼬마선충 등 여러 선충이 속합니다.", "예쁜꼬마선충의 발생 방식이 모든 선충 조상의 모습은 아닙니다. 공통 조상의 특징은 다른 선충들과 비교해 추론해야 합니다.", "2024년 Hox 유전자 연구는 선충 갈래마다 유전자 소실과 배열 변화가 다름을 보여줍니다. 하나의 모델 생물만으로 전체를 설명하기 어렵습니다."],
    en: ["Genetic comparisons distinguish lineages even among small, similar-looking nematodes. This class includes Caenorhabditis elegans and many other nematodes.", "C. elegans development is not a direct picture of the ancestor of all nematodes. Ancestral traits require comparison with other lineages.", "A 2024 Hox-gene study found lineage-specific gene losses and changes in arrangement. One model organism cannot represent the entire group."],
    sources: [["Nematode Hox genes · Scientific Reports (2024)", "https://www.nature.com/articles/s41598-024-79962-3"]],
  },
  Q204861: {
    name: "Teleostei", koName: "진골어하강",
    ko: ["유전자 서열뿐 아니라 염색체에 남은 유전자 배열도 공통 조상을 추론하는 단서입니다. 진골어류에는 많은 익숙한 물고기가 속합니다.", "이 갈래의 진화 역사에는 오래된 유전체 중복이 남아 있습니다. 조상을 오늘날의 특정 물고기와 동일시할 수는 없습니다.", "2022년 비교 유전체 연구는 진골어류의 유전체 중복 뒤 유전자들이 다시 분리되는 과정을 재구성했습니다. 게놈 자체가 진화의 흔적을 보존합니다."],
    en: ["Both gene sequences and their arrangement on chromosomes provide clues to common ancestry. Teleosts include many familiar fishes.", "An ancient genome duplication is recorded in this lineage's history. Its ancestor cannot be equated with a particular living fish.", "A 2022 comparative-genome study reconstructed the separation of duplicated genes after teleost genome duplication. Genomes themselves preserve evolutionary traces."],
    sources: [["An atlas of fish genome evolution (2022)", "https://doi.org/10.1101/gr.276953.122"]],
  },
  Q25371: {
    name: "Chondrichthyes", koName: "연골어강",
    ko: ["상어·가오리와 은상어류의 관계는 화석과 유전체를 함께 비교해 연구합니다. 연골 골격이라는 특징만으로 원시적인 물고기라고 볼 수는 없습니다.", "공통 조상은 오늘날의 상어가 아닙니다. 살아 있는 두 갈래의 유전체를 비교해 턱을 가진 척추동물의 옛 특징을 추론합니다.", "2018년 상어 유전체 연구는 상어·가오리류와 은상어류의 유전정보를 비교하며 초기 척추동물 진화를 탐구했습니다."],
    en: ["Fossils and genomes are compared to study sharks, rays and chimaeras. A cartilaginous skeleton does not make them primitive fishes.", "Their common ancestor was not a living shark. Comparing the surviving lineages helps infer early features of jawed vertebrates.", "A 2018 shark-genome study compared genetic resources across cartilaginous fishes to investigate early vertebrate evolution."],
    sources: [["Shark genomes · Nature Ecology & Evolution (2018)", "https://www.nature.com/articles/s41559-018-0673-5"]],
  },
  Q128257: {
    name: "Cephalopoda", koName: "두족강",
    ko: ["앵무조개·문어·오징어는 모습이 달라도 두족류에 속합니다. 화석 껍데기와 유전체가 이들의 진화 관계를 설명하는 단서입니다.", "초기 두족류를 오늘날의 문어처럼 생각하면 안 됩니다. 화석에는 방으로 나뉜 껍데기를 가진 두족류가 풍부하게 남아 있습니다.", "2026년 초형아강 연구는 문어·오징어류의 유전체 재배열과 유전자 조절을 비교했습니다. 이 결과는 앵무조개를 포함한 두족강 전체의 특징과 구분합니다."],
    en: ["Nautiluses, octopuses and squids are cephalopods despite their different shapes. Fossil shells and genomes help explain their relationships.", "Early cephalopods should not be pictured as modern octopuses. Their fossil record contains many forms with chambered shells.", "A 2026 coleoid study compared genome rearrangements and gene regulation in octopus and squid relatives. Its scope is narrower than all cephalopods, which also include nautiluses."],
    sources: [["Cephalopods · Smithsonian", "https://ocean.si.edu/ocean-life/invertebrates/octopuses-squids-and-relatives"], ["Coleoid genome architecture (2026)", "https://www.nature.com/articles/s41467-026-77625-7"]],
  },
  Q131799: {
    name: "Tentaculata", koName: "유촉수강",
    ko: ["촉수가 있는 유즐동물을 묶은 전통적인 강입니다. 촉수의 유무만으로 진화 관계를 정하기 어려워 유전자 비교가 필요합니다.", "2017년 연구는 현생 유즐동물의 공통 조상이 촉수를 가진 바다의 부유성 생물이었을 것으로 추정했습니다. 추정 결과이지 특정 화석의 신원 확인은 아닙니다.", "2024년 분류 종합은 촉수가 없는 무촉수류도 유촉수류 안에서 갈라진다고 설명합니다. 따라서 이 이름은 모든 후손을 포함하는 완전한 갈래가 아닐 수 있습니다."],
    en: ["This traditional class groups tentacle-bearing comb jellies. Tentacle presence alone cannot determine relationships, so genetic comparisons are needed.", "A 2017 study inferred a pelagic, tentacle-bearing ancestor for living comb jellies. This is a reconstruction, not identification of a particular fossil.", "A 2024 taxonomic synthesis describes tentacle-free forms as nested among tentaculate lineages. The traditional class may therefore exclude some descendants of its ancestor."],
    sources: [["Ctenophore ancestral reconstruction (2017)", "https://www.nature.com/articles/s41559-017-0331-3"], ["Illustrated guide to Ctenophora (2024)", "https://www.whitney.ufl.edu/media/wwwwhitneyufledu/images/files/Illustrated-Guide-to-Ctenophora_Moroz-et-al_2024.pdf"]],
  },
  Q190090: {
    name: "Ascidiacea", koName: "해초강",
    ko: ["멍게류의 성체는 다른 척삭동물과 매우 달라 보이지만, 발생 과정과 많은 유전자 비교가 가까운 관계를 드러냅니다.", "피낭동물의 조상이 헤엄치는 올챙이형 생물이었는지, 바닥에 붙어 사는 생물이었는지는 연구 중입니다. 현생 멍게를 조상으로 단정할 수 없습니다.", "2018년 계통유전체 연구는 부유성 탈리아류가 전통적인 해초강 안에 포함됨을 지지했습니다. 이 강 이름과 모든 후손을 포함하는 갈래는 다를 수 있습니다."],
    en: ["Adult sea squirts look unlike other chordates, but development and comparisons of many genes reveal their relationships.", "Whether the tunicate ancestor was a swimming tadpole-like animal or a bottom-attached animal remains debated. A living sea squirt cannot simply be treated as the ancestor.", "A 2018 phylogenomic study supported pelagic thaliaceans within traditional Ascidiacea. This class name may not identify a lineage containing every descendant."],
    sources: [["Tunicate phylogenomics (2018)", "https://pmc.ncbi.nlm.nih.gov/articles/PMC5924484/"], ["Cambrian tunicate fossil (2023)", "https://pmc.ncbi.nlm.nih.gov/articles/PMC10325964/"]],
  },
  Q4867740: {
    name: "Gastropoda", koName: "복족강",
    ko: ["달팽이·전복·민달팽이는 껍데기가 달라도 복족류입니다. 발생 중 몸이 비틀리는 과정과 유전자 비교가 중요한 단서입니다.", "껍데기의 나선 모양과 몸의 비틀림은 다른 현상입니다. 조상의 모습을 껍데기 모양 하나만으로 재구성할 수는 없습니다.", "2025년 연체동물 유전체 연구는 복족류와 이매패류·굴족류를 포함한 큰 갈래를 검토했습니다. 이 연구는 복족류 밖의 친척 관계까지 함께 다룹니다."],
    en: ["Snails, abalones and slugs are gastropods despite their different shells. Developmental torsion and genetic comparisons provide important clues.", "Shell coiling and body torsion are different processes. Shell shape alone cannot reconstruct the ancestor.", "A 2025 molluscan genome study examined the broader lineage containing gastropods, bivalves and tusk shells, including relationships beyond Gastropoda itself."],
    sources: [["Gastropod fossils · British Geological Survey", "https://www.bgs.ac.uk/discovering-geology/fossils-and-geological-time/gastropods/"], ["Molluscan genome phylogeny · Science (2025)", "https://doi.org/10.1126/science.ads0215"]],
  },
  Q25349: {
    name: "Asteroidea", koName: "불가사리강",
    ko: ["불가사리와 거미불가사리는 비슷해 보여도 별도 강입니다. 2014년 다수 유전자 연구는 두 강을 가까운 친척인 Asterozoa로 묶었습니다.", "조상의 몸 구조는 화석과 발생 과정, 유전정보를 함께 비교해 추론합니다. 오늘날의 불가사리가 다른 극피동물의 조상이라는 뜻은 아닙니다.", "팔 모양 같은 외형만으로는 극피동물의 깊은 분기를 해결하기 어렵습니다. 이 연구는 유전자의 진화 속도를 달리 분석해 관계를 검토했습니다."],
    en: ["Sea stars and brittle stars are separate classes despite their resemblance. A 2014 multi-gene study supported their grouping as Asterozoa.", "Ancestral anatomy is inferred using fossils, development and genetic evidence. Living sea stars are not ancestors of other echinoderms.", "Arm shape alone cannot resolve deep echinoderm branching. The study examined relationships using genes grouped by their evolutionary rates."],
    sources: [["Echinoderm class relationships (2014)", "https://pmc.ncbi.nlm.nih.gov/articles/PMC4046411/"]],
  },
  Q839350: {
    name: "Clitellata", koName: "환대강",
    ko: ["지렁이와 거머리는 유전자 비교를 통해 환형동물의 Sedentaria 안에서 가까운 갈래로 연구됩니다.", "오늘날 육상 지렁이의 생활방식을 모든 조상에게 적용할 수는 없습니다. 수생 친척과 유전체를 비교해야 옛 생활방식을 추론할 수 있습니다.", "2024년 비교 유전체 연구는 지렁이·거머리에서 광범위한 유전자 배열 변화가 있음을 보여줬습니다. 관계 연구에는 유전자 순서의 변화도 단서가 됩니다."],
    en: ["Genetic comparisons place earthworms and leeches among related annelid lineages within Sedentaria.", "The lifestyle of modern terrestrial earthworms cannot be assigned to every ancestor. Aquatic relatives and genomes help reconstruct earlier lifestyles.", "A 2024 comparative-genome study documented extensive rearrangements in earthworms and leeches. Changes in gene order can also inform evolutionary research."],
    sources: [["Annelid comparative genomics (2024)", "https://academic.oup.com/mbe/article/41/9/msae172/7733614"]],
  },
  Q127470: {
    name: "Holothuroidea", koName: "해삼강",
    ko: ["해삼은 길쭉해도 극피동물입니다. 다수 유전자 비교는 성게와 해삼을 가까운 갈래인 Echinozoa로 묶는 관계를 지지합니다.", "조상 형질은 현대 해삼뿐 아니라 다른 극피동물과 화석도 비교해 추론합니다. 해삼의 현재 모습이 극피동물의 최초 모습은 아닙니다.", "2025~2026년 해삼의 염색체 수준 유전체가 공개되며 연구 자료가 늘고 있습니다. 한 종의 유전체 공개만으로 강 전체의 분기 관계가 확정되지는 않습니다."],
    en: ["Sea cucumbers are echinoderms despite their elongated bodies. Multi-gene comparisons support their grouping with sea urchins as Echinozoa.", "Ancestral traits require comparison with other echinoderms and fossils, not just modern sea cucumbers. Their current form is not the original echinoderm form.", "Chromosome-level sea-cucumber genomes published in 2025–2026 expand research resources. A genome from one species does not by itself settle the relationships of an entire class."],
    sources: [["Echinoderm relationships (2014)", "https://pmc.ncbi.nlm.nih.gov/articles/PMC4046411/"], ["Sea-cucumber genome · Scientific Data (2026)", "https://www.nature.com/articles/s41597-026-06609-5"]],
  },
};

for (const [id, review] of Object.entries(taxonRanks)) {
  if (!classRanks.includes(review.rank)) { delete classAncestors[id]; continue; }
  const existing = classAncestors[id];
  classAncestors[id] = {
    ...review,
    ko: existing?.ko || [],
    en: existing?.en || [],
    sources: [...(existing?.sources || []), ...review.sources],
  };
}

export const ancestorNotes = { ...classAncestors, ...upperAncestors };
for (const id of Object.keys(upperAncestors)) {
  const ranked = classAncestors[id];
  if (!ranked) continue;
  ancestorNotes[id] = { ...upperAncestors[id], sources: [...upperAncestors[id].sources, ...ranked.sources],
    review: `${upperAncestors[id].review} ${ranked.review}`, reviewEn: `${upperAncestors[id].reviewEn} ${ranked.reviewEn}` };
}

export function getClassIds(animal) {
  const classes = animal.taxonomy.lineage.filter((taxon) => classRanks.includes(taxon.rank)).map((taxon) => taxon.wikidataId);
  const supplement = animal.taxonomy.rankReview?.supplemental.class;
  if (supplement && !animal.taxonomy.lineage.some((taxon) => taxon.rank === "class")) classes.push(supplement.taxonId);
  return classes;
}

export function createAncestorNotes({ $, escapeHtml, getLanguage, speciesById, cardText, getCollected, getGuideKey, buildTree }) {
  const dialog = $("#ancestor-dialog");
  const guide = $("#ancestor-guide");
  const branches = new Map();
  function index(node, path = []) {
    if (node.type === "leaf") return [node.id];
    const branchPath = [...path, node];
    const members = node.children.flatMap((child) => index(child, branchPath));
    branches.set(node.id, { path: branchPath, members: new Set(members) });
    return members;
  }
  index(buildTree([...speciesById.keys()], speciesById, null, true));
  const belongsTo = (animal, id) => branches.get(id)?.members.has(animal.id) || getClassIds(animal).includes(id);
  const offeredKeys = new Set();
  $("#close-ancestor-guide").addEventListener("click", () => guide.close());
  guide.addEventListener("close", () => {
    try { localStorage.setItem(guide.dataset.guideKey, "seen"); } catch {}
  });
  $("#close-ancestor").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  function annotate(button, id) {
    const note = ancestorNotes[id];
    const rank = note?.rank || button.dataset.rank || "clade";
    const ko = getLanguage() === "ko";
    button.dataset.rank = rank;
    button.classList.add("ranked-taxon");
    button.innerHTML = rankMark(rank);
    button.title = `${rankNames[rank]?.[ko ? 0 : 1] || (ko ? "공통분기" : "Shared branch")} · ${branches.get(id)?.path.at(-1).name || id}`;
    button.setAttribute("aria-label", button.title);
    if (!note) return false;
    const name = ko ? `${rankNames[note.rank]?.[0] ? `${rankNames[note.rank][0]} · ` : ""}${note.koName}` : `${note.name} (${note.rank})`;
    button.disabled = false;
    button.removeAttribute("aria-hidden");
    button.dataset.ancestorId = id;
    button.classList.add("has-ancestor-note");
    button.title = `${name} · ${getLanguage() === "ko" ? "조상 이야기" : "Ancestry notes"}`;
    button.setAttribute("aria-label", button.title);
    button.addEventListener("click", (event) => { event.stopPropagation(); open(id); });
    return true;
  }
  function open(id) {
    const note = ancestorNotes[id];
    if (!note) return;
    const ko = getLanguage() === "ko";
    const text = ko ? note.ko : note.en;
    const labels = text.length === 2
      ? ko ? ["어떤 생물인가요?", "진화 연구 이야기"] : ["Which animals belong here?", "Evolution research"]
      : ko ? ["어떻게 알았나요?", "조상은 어떤 모습이었을까요?", "연구 이야기"] : ["What is the evidence?", "What might the ancestor have been like?", "Research notes"];
    $("#ancestor-title").textContent = ko ? note.koName : note.name;
    const upperRankLabels = { kingdom: "계", subkingdom: "아계", infrakingdom: "하계", superphylum: "상문", phylum: "문", subphylum: "아문", infraphylum: "하문" };
    $("#ancestor-scientific").textContent = `${note.name} · ${ko ? rankLabels[note.rank] || upperRankLabels[note.rank] : note.rank}`;
    const candidates = [...new Set([...getCollected(), ...speciesById.keys()])].map((speciesId) => speciesById.get(speciesId)).filter((animal) => animal && belongsTo(animal, id));
    const representative = candidates[0];
    const animal = cardText(representative);
    const image = $("#ancestor-image");
    const fallback = $("#ancestor-image-fallback");
    fallback.hidden = true;
    fallback.textContent = ko ? "사진을 불러오지 못했습니다." : "Image unavailable.";
    image.hidden = false;
    image.onerror = () => { image.hidden = true; fallback.hidden = false; };
    image.alt = animal.commonName;
    image.style.objectFit = animal.image.objectFit === "contain" ? "contain" : "cover";
    image.src = animal.image.thumbnailUrl;
    $("#ancestor-image-caption").textContent = `${ko ? "현생 대표 생물" : "Living representative"} · ${animal.commonName} (${animal.scientificName})`;
    const credit = $("#ancestor-image-credit");
    credit.href = animal.image.commonsPageUrl;
    credit.textContent = `${animal.image.artist || "Unknown creator"} · ${animal.image.license}`;
    const rankPath = note.upper
      ? branches.get(id).path.map((taxon) => ko ? ancestorNotes[taxon.id]?.koName || taxon.name : taxon.name).join(" → ")
      : representative.taxonomy.lineage.filter((taxon) => classRanks.includes(taxon.rank))
        .map((taxon) => ko ? `${taxonRanks[taxon.wikidataId]?.koName || taxon.scientificName} [${rankLabels[taxon.rank]}]` : `${taxon.scientificName} [${taxon.rank}]`).join(" → ");
    const reviewText = ko ? note.review : note.reviewEn;
    const profile = taxonProfiles[note.name];
    const features = profile ? (ko ? profile.ko : profile.en) : text[0];
    const genera = new Set();
    const examples = candidates.filter((animal) => { const genus = animal.scientificName.split(" ")[0]; if (genera.has(genus)) return false; genera.add(genus); return true; }).slice(0, 4);
    $("#ancestor-content").innerHTML = `<section><h3>${ko ? "주요 특징" : "Key characteristics"}</h3><p>${escapeHtml(features)}</p></section>`
      + `<section><h3>${ko ? "대표 생물 · 현재 도감 수록종" : "Representative species in this collection"}</h3><ul>${examples.map((entry) => { const example = cardText(entry); return `<li>${escapeHtml(example.commonName)} <i>(${escapeHtml(example.scientificName)})</i></li>`; }).join("")}</ul></section>`
      + `<section><h3>${ko ? "분류 위치" : "Classification"}</h3><p>${escapeHtml(rankPath)}</p><p>${escapeHtml(reviewText)}</p></section>`
      + text.map((paragraph, index) => `<section><h3>${labels[index]}</h3><p>${escapeHtml(paragraph)}</p></section>`).join("");
    $("#ancestor-sources").innerHTML = note.sources.map(([title, url]) => `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(title)}</a>`).join("");
    $("#ancestor-note").textContent = ko ? "문헌 기반 요약 · 2026-10-14 검토. 사진은 공통 조상의 복원도가 아닙니다. 표식의 모양은 분류 계급을 구분하며 분화 시점을 뜻하지 않습니다." : "Literature summary reviewed 2026-10-14. The photograph is not an ancestor reconstruction. Marker shapes distinguish taxonomic ranks, not divergence dates.";
    dialog.showModal();
  }
  function showGuide() {
    const key = getGuideKey();
    if (offeredKeys.has(key) || guide.open) return;
    try { if (localStorage.getItem(key) === "seen") return; } catch {}
    offeredKeys.add(key);
    guide.dataset.guideKey = key;
    guide.showModal();
  }
  return { annotate, open, showGuide };
}
