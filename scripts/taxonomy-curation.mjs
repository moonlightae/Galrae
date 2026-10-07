import { readFileSync } from "node:fs";
const rankReview = JSON.parse(readFileSync(new URL("../data/taxonomy-rank-review.json", import.meta.url), "utf8"));
const XENACOELOMORPHA_ID = "Q3570860";
const DISPUTED_XENACOELOMORPHA_ANCESTORS = new Set(["Q3059449", "Q150866", "Q2412197"]);
const EUSAURISCHIA_ID = "Q2013709";
const ELASMOBRANCHII_ID = "Q194257";
const ORECTOLOBIFORMES_ID = "Q260031";
// Restore missing shared ancestors; retain the dataset's IDs for the same clades.
// Reviewed against NCBI lineages, with Holostei sister to Teleostei in Neopterygii.
const TELEOST_BACKBONES = {
  Gadiformes: { reference: "Thunnus thynnus", ancestor: "Acanthomorphata" },
  Salmoniformes: { reference: "Thunnus thynnus", ancestor: "Euteleostei" },
  Gymnotiformes: { reference: "Carassius auratus", ancestor: "Ostariophysi" },
  Anguilliformes: { reference: "Carassius auratus", ancestor: "Teleostei" },
};
// Missing ancestors found by comparing all sampled species with NCBI and
// reviewing conflicting classifications. References: data/taxonomy-review.md.
const SHARED_BACKBONES = [
  ...Object.entries(TELEOST_BACKBONES).map(([suffix, rule]) => ({ ...rule, suffix, anchor: "Actinopterygii" })),
  { suffix: "Dipneusti", anchor: "Gnathostomata", reference: "Homo sapiens", ancestor: "Dipnotetrapodomorpha" },
  { suffix: "Diprotodontia", anchor: "Mammalia", reference: "Homo sapiens", ancestor: "Theria" },
  { suffix: "Sirenia", anchor: "Placentalia", reference: "Loxodonta africana", ancestor: "Tethytheria" },
  { suffix: "Myriapoda", anchor: "Arthropoda", reference: "Aedes aegypti", ancestor: "Mandibulata" },
  { suffix: "Annelida", anchor: "Spiralia", reference: "Cornu aspersum", ancestor: "Lophotrochozoa" },
  { suffix: "Platyhelminthes", anchor: "Spiralia", reference: "Cornu aspersum", ancestor: "Lophotrochozoa" },
  { suffix: "Dendrobatoidea", anchor: "Neobatrachia", reference: "Bufo bufo", ancestor: "Hyloidea" },
  { suffix: "Ascaridida", anchor: "Nematoda", reference: "Caenorhabditis elegans", ancestor: "Chromadorea" },
  { suffix: "Scorpaeniformes", anchor: "Acanthopterygii", reference: "Mola mola", ancestor: "Eupercaria" },
  { suffix: "Errantia", anchor: "Annelida", reference: "Riftia pachyptila", ancestor: "Pleistoannelida" },
];
const ADDED_CLADES = [
  { anchor: "Ecdysozoa", members: ["Arthropoda", "Onychophora", "Tardigrada"], id: "Q134870", name: "Panarthropoda" },
  { anchor: "Echinodermata", members: ["Asterozoa", "Echinozoa"], id: "Q1328367", name: "Eleutherozoa" },
  { anchor: "Holometabola", members: ["Diptera", "Lepidoptera", "Coleoptera"], id: "Q48970749", name: "Aparaglossata" },
  { anchor: "Aparaglossata", members: ["Diptera", "Lepidoptera"], id: "Q16987281", name: "Panorpida" },
];
const SHARK_BACKBONE = [
  { wikidataId: "Q150760", scientificName: "Neoselachii", englishName: "Neoselachii", rank: "infraclass" },
  { wikidataId: "Q7372", scientificName: "Selachimorpha", englishName: "shark", rank: "superorder" },
  { wikidataId: "Q47969", scientificName: "Galeomorphi", englishName: "Galeomorphi", rank: "superorder" },
];
const SPECIES_TAXON_REPLACEMENTS = {
  "Carcinus maenas": {
    Q2257783: { wikidataId: "Q2190587", scientificName: "Carcinidae", englishName: "Carcinidae", rank: "family" },
  },
  "Mobula birostris": {
    Q6496983: { wikidataId: "Q796580", scientificName: "Myliobatiformes", englishName: "Myliobatiformes", rank: "order" },
  },
  "Paracentrotus lividus": {
    Q528635: { wikidataId: "Q7136623", scientificName: "Parechinidae", englishName: "Parechinidae", rank: "family" },
  },
  "Dugesia japonica": {
    Q11236767: { wikidataId: "Q3030805", scientificName: "Dugesiidae", englishName: "Dugesiidae", rank: "family" },
  },
};

export function curateTaxonomy(animals) {
  return animals.map((animal) => {
    let lineage = animal.taxonomy.lineage.filter((taxon) => taxon.wikidataId !== EUSAURISCHIA_ID);

    for (const { suffix, anchor, reference, ancestor } of SHARED_BACKBONES) {
      const suffixIndex = lineage.findIndex((taxon) => taxon.scientificName === suffix);
      if (suffixIndex < 0) continue;
      const referenceLineage = animals.find((entry) => entry.scientificName === reference)?.taxonomy.lineage;
      const anchorIndex = lineage.findIndex((taxon) => taxon.scientificName === anchor);
      const referenceAnchorIndex = referenceLineage?.findIndex((taxon) => taxon.scientificName === anchor) ?? -1;
      const ancestorIndex = referenceLineage?.findIndex((taxon) => taxon.scientificName === ancestor) ?? -1;
      if (anchorIndex < 0 || suffixIndex <= anchorIndex || referenceAnchorIndex < 0 || ancestorIndex <= referenceAnchorIndex) throw new Error(`Incomplete ${ancestor} backbone for ${animal.scientificName}`);
      lineage = [
        ...lineage.slice(0, anchorIndex + 1),
        ...referenceLineage.slice(referenceAnchorIndex + 1, ancestorIndex + 1),
        ...lineage.slice(suffixIndex),
      ];
    }
    for (const { anchor, members, id, name } of ADDED_CLADES) {
      if (!lineage.some((taxon) => members.includes(taxon.scientificName)) || lineage.some((taxon) => taxon.wikidataId === id)) continue;
      const index = lineage.findIndex((taxon) => taxon.scientificName === anchor);
      if (index < 0) throw new Error(`Missing ${anchor} for ${animal.scientificName}`);
      lineage.splice(index + 1, 0, { wikidataId: id, scientificName: name, englishName: name, rank: "clade" });
    }
    // Nematocera is a traditional paraphyletic group, not an ancestor of Brachycera.
    if (lineage.some((taxon) => taxon.scientificName === "Brachycera")) {
      lineage = lineage.filter((taxon) => taxon.scientificName !== "Nematocera");
    }

    // Use the Nephrozoa-sister hypothesis for this disputed deep bilaterian branch.
    if (lineage.some((taxon) => taxon.wikidataId === XENACOELOMORPHA_ID)) {
      lineage = lineage.filter((taxon) => !DISPUTED_XENACOELOMORPHA_ANCESTORS.has(taxon.wikidataId));
    }

    if (animal.scientificName === "Rhincodon typus") {
      const elasmobranchIndex = lineage.findIndex((taxon) => taxon.wikidataId === ELASMOBRANCHII_ID);
      const orectolobiformIndex = lineage.findIndex((taxon) => taxon.wikidataId === ORECTOLOBIFORMES_ID);
      if (elasmobranchIndex < 0 || orectolobiformIndex < 0) throw new Error("Whale shark lineage is incomplete");
      if (!SHARK_BACKBONE.every((taxon) => lineage.some((entry) => entry.wikidataId === taxon.wikidataId))) {
        lineage = [
          ...lineage.slice(0, elasmobranchIndex + 1),
          ...SHARK_BACKBONE,
          ...lineage.slice(orectolobiformIndex),
        ];
      }
    }

    lineage = lineage.map((taxon) => {
      if (taxon.wikidataId === "Q286026") return { ...taxon, scientificName: "Sepia" };
      if (taxon.wikidataId === "Q2747865") return { ...taxon, scientificName: "Branchiostomatidae" };
      return SPECIES_TAXON_REPLACEMENTS[animal.scientificName]?.[taxon.wikidataId] ?? taxon;
    });
    return { ...animal, taxonomy: { ...animal.taxonomy, lineage, rankReview: rankReview[animal.id] } };
  });
}
