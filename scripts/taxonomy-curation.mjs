const XENACOELOMORPHA_ID = "Q3570860";
const DISPUTED_XENACOELOMORPHA_ANCESTORS = new Set(["Q3059449", "Q150866", "Q2412197"]);
const EUSAURISCHIA_ID = "Q2013709";
const ELASMOBRANCHII_ID = "Q194257";
const ORECTOLOBIFORMES_ID = "Q260031";
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
    return { ...animal, taxonomy: { ...animal.taxonomy, lineage } };
  });
}
