(function attachGalraeLogic(global) {
  const ANIMALIA_ID = "Q729";
  const PORIFERA_ID = "Q18960";
  const CTENOPHORA_ID = "Q102778";
  const CNIDARIA_ID = "Q25441";
  const BILATERIA_ID = "Q5173";
  const PORIFERA_PLANULOZOA_ID = "canonical:porifera-planulozoa";
  const PLANULOZOA_ID = "canonical:planulozoa";
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
      return branch(node.id, node.name, descendants, false);
    }

    return compress(root, true);
  }

  function normalizeLineage(lineage) {
    let normalized = [...lineage];
    const animaliaIndex = normalized.findIndex((taxon) => taxon.wikidataId === ANIMALIA_ID);
    const earlyAnimalIndex = normalized.findIndex((taxon, index) => index > animaliaIndex && [
      PORIFERA_ID,
      CTENOPHORA_ID,
      CNIDARIA_ID,
      BILATERIA_ID,
    ].includes(taxon.wikidataId));

    if (animaliaIndex >= 0 && earlyAnimalIndex >= 0) {
      const earlyAnimalId = normalized[earlyAnimalIndex].wikidataId;
      const prefix = normalized.slice(0, animaliaIndex + 1);
      const suffix = normalized.slice(earlyAnimalIndex);
      const remainingAnimals = {
        wikidataId: PORIFERA_PLANULOZOA_ID,
        scientificName: "Porifera + Planulozoa",
        englishName: "sponge and planulozoan clade",
        rank: "clade",
      };
      const planulozoa = {
        wikidataId: PLANULOZOA_ID,
        scientificName: "Planulozoa",
        englishName: "cnidarian and bilaterian clade",
        rank: "clade",
      };

      if (earlyAnimalId === CTENOPHORA_ID) normalized = [...prefix, ...suffix];
      if (earlyAnimalId === PORIFERA_ID) normalized = [...prefix, remainingAnimals, ...suffix];
      if ([CNIDARIA_ID, BILATERIA_ID].includes(earlyAnimalId)) {
        normalized = [...prefix, remainingAnimals, planulozoa, ...suffix];
      }
    }

    const gnathostomeIndex = normalized.findIndex((taxon) => taxon.wikidataId === GNATHOSTOMATA_ID);
    if (gnathostomeIndex < 0) return normalized;
    const descendantIndex = normalized.findIndex((taxon, index) => index > gnathostomeIndex && [
      SARCOPTERYGII_ID,
      ACTINOPTERYGII_ID,
      DIPNEUSTI_ID,
    ].includes(taxon.wikidataId));
    if (descendantIndex < 0) return normalized;

    const canonicalBonyClade = {
      wikidataId: EUTELEOSTOMI_ID,
      scientificName: "Euteleostomi",
      englishName: "bony vertebrate",
      rank: "clade",
    };
    const prefix = normalized.slice(0, gnathostomeIndex + 1);
    const suffix = normalized.slice(descendantIndex);
    if (normalized[descendantIndex].wikidataId === DIPNEUSTI_ID) {
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
    if (node.type === "branch") {
      for (const child of node.children) {
        const match = findNodeByLeafSet(child, wantedKey);
        if (match) return match;
      }
    }
    return leafSetKey(node) === wantedKey ? node : null;
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

  function isEquivalentPlacement(tree, expected, targetId, placement) {
    if (targetId === expected.targetId && placement === expected.placement) return true;
    const target = findNodeById(tree, targetId);
    const expectedTarget = findNodeById(tree, expected.targetId);
    if (!target || !expectedTarget) return false;

    // The trunk immediately below Animalia is the one canonical top-level target.
    // It represents either joining Animalia or wrapping the complete sampled tree.
    const completeTreeKey = leafSetKey(tree);
    if (placement === "top") {
      return targetId === ANIMALIA_ID
        && leafSetKey(target) === completeTreeKey
        && leafSetKey(expectedTarget) === completeTreeKey;
    }

    return placement === "wrap"
      && expected.placement === "wrap"
      && leafSetKey(target) === leafSetKey(expectedTarget);
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
    isEquivalentPlacement,
    shuffle,
  };
}(globalThis));
