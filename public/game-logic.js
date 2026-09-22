(function attachGalraeLogic(global) {
  const ANIMALIA_ID = "Q729";
  const GNATHOSTOMATA_ID = "Q26214";
  const EUTELEOSTOMI_ID = "canonical:euteleostomi";
  const SARCOPTERYGII_ID = "Q160830";
  const ACTINOPTERYGII_ID = "Q127282";
  const DIPNEUSTI_ID = "Q61881941";

  function leaf(id, preview = false) {
    return { type: "leaf", id, preview };
  }

  function branch(id, name, children, preview = false) {
    return { type: "branch", id, name, children, preview };
  }

  function buildTree(classifiedIds, speciesById, previewId = null) {
    const root = {
      id: ANIMALIA_ID,
      name: "Animalia",
      children: new Map(),
      animalId: null,
    };

    for (const speciesId of classifiedIds) {
      const animal = speciesById.get(speciesId);
      if (!animal) continue;
      const lineage = normalizeLineage(animal.taxonomy.lineage);
      const rootIndex = lineage.findIndex((taxon) => taxon.wikidataId === ANIMALIA_ID);
      let cursor = root;
      for (const taxon of lineage.slice(rootIndex + 1)) {
        if (!cursor.children.has(taxon.wikidataId)) {
          cursor.children.set(taxon.wikidataId, {
            id: taxon.wikidataId,
            name: taxon.scientificName || taxon.englishName || taxon.wikidataId,
            children: new Map(),
            animalId: null,
          });
        }
        cursor = cursor.children.get(taxon.wikidataId);
      }
      cursor.animalId = speciesId;
    }

    function compress(node, isRoot = false) {
      const descendants = [...node.children.values()].map((child) => compress(child));
      if (node.animalId) descendants.push(leaf(node.animalId, node.animalId === previewId));
      if (!isRoot && descendants.length === 1) return descendants[0];
      if (!descendants.length && node.animalId) return leaf(node.animalId, node.animalId === previewId);
      if (isRoot && descendants.length === 1) return descendants[0];
      return branch(node.id, node.name, descendants, false);
    }

    return compress(root, true);
  }

  function normalizeLineage(lineage) {
    const gnathostomeIndex = lineage.findIndex((taxon) => taxon.wikidataId === GNATHOSTOMATA_ID);
    if (gnathostomeIndex < 0) return lineage;
    const descendantIndex = lineage.findIndex((taxon, index) => index > gnathostomeIndex && [
      SARCOPTERYGII_ID,
      ACTINOPTERYGII_ID,
      DIPNEUSTI_ID,
    ].includes(taxon.wikidataId));
    if (descendantIndex < 0) return lineage;

    const canonicalBonyClade = {
      wikidataId: EUTELEOSTOMI_ID,
      scientificName: "Euteleostomi",
      englishName: "bony vertebrate",
      rank: "clade",
    };
    const prefix = lineage.slice(0, gnathostomeIndex + 1);
    const suffix = lineage.slice(descendantIndex);
    if (lineage[descendantIndex].wikidataId === DIPNEUSTI_ID) {
      suffix.unshift({
        wikidataId: SARCOPTERYGII_ID,
        scientificName: "Sarcopterygii",
        englishName: "lobe-finned vertebrate",
        rank: "superclass",
      });
    }
    return [...prefix, canonicalBonyClade, ...suffix];
  }

  function containsLeaf(nodes, speciesId) {
    return nodes.some((node) => node.type === "leaf"
      ? node.id === speciesId
      : containsLeaf(node.children, speciesId));
  }

  function collectLeafIds(node) {
    if (node.type === "leaf") return [node.id];
    return node.children.flatMap(collectLeafIds);
  }

  function findParentOfLeaf(node, speciesId, parent = null) {
    if (node.type === "leaf") return node.id === speciesId ? parent : null;
    for (const child of node.children) {
      const match = findParentOfLeaf(child, speciesId, node);
      if (match) return match;
    }
    return null;
  }

  function findNodeById(node, id) {
    if (node.id === id) return node;
    if (node.type === "branch") {
      for (const child of node.children) {
        const match = findNodeById(child, id);
        if (match) return match;
      }
    }
    return null;
  }

  function findNodeByLeafSet(node, wantedKey) {
    if (leafSetKey(node) === wantedKey) return node;
    if (node.type === "branch") {
      for (const child of node.children) {
        const match = findNodeByLeafSet(child, wantedKey);
        if (match) return match;
      }
    }
    return null;
  }

  function leafSetKey(node) {
    return collectLeafIds(node).sort().join("|");
  }

  function getExpectedPlacement(classifiedIds, newSpeciesId, speciesById) {
    const beforeTree = buildTree(classifiedIds, speciesById);
    const afterTree = buildTree([...classifiedIds, newSpeciesId], speciesById);
    const parent = findParentOfLeaf(afterTree, newSpeciesId);
    if (!parent) throw new Error(`No parent branch found for ${newSpeciesId}`);

    const existingIds = collectLeafIds(parent).filter((id) => id !== newSpeciesId);
    const wantedKey = [...existingIds].sort().join("|");
    const existingParent = findNodeById(beforeTree, parent.id);

    if (existingParent && existingParent.type === "branch" && leafSetKey(existingParent) === wantedKey) {
      return { targetId: existingParent.id, placement: "join", ancestorId: parent.id };
    }

    const wrapped = findNodeByLeafSet(beforeTree, wantedKey);
    if (!wrapped) throw new Error(`No placement target found for ${newSpeciesId}`);
    return { targetId: wrapped.id, placement: "wrap", ancestorId: parent.id };
  }

  function shuffle(items, random = Math.random) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
  }

  global.GalraeLogic = {
    ANIMALIA_ID,
    buildTree,
    collectLeafIds,
    findNodeById,
    getExpectedPlacement,
    shuffle,
  };
}(globalThis));
