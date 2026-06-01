export function IsBlockAllowedForTool(blockIdRaw, toolId, hasSilkTouch, hasFortune) {
  const blockId = blockIdRaw.toLowerCase();
  const type = getToolCategory(toolId);

  const isLeaf = blockId.includes("leaves") || blockId.includes("_leaf");
  if (isLeaf) {
    if (!type || type === "hoe" || type === "shears") {
      return true;
    }
  }

  if (hasSilkTouch && IsSilkTouchMaster(blockId)) {
    return true;
  }

  if (!type) return false;

  if (type === "sword") {
    return blockId === "minecraft:web";
  }

  if (type === "pickaxe") {
    const isOre = blockId.includes("_ore") || blockId === "minecraft:ancient_debris";
    return isOre || blockId === "minecraft:glowstone";
  }

  if (type === "axe") {
    const isWood = blockId.includes("log") || blockId.includes("wood") || blockId.includes("stem") || blockId.includes("bark");
    const isMiscAxe = [
      "minecraft:melon", "minecraft:melon_block", "minecraft:pumpkin", "minecraft:creaking_heart", "minecraft:mangrove_roots"
    ].includes(blockId);
    
    return isWood || isMiscAxe;
  }

  if (type === "shovel") {
    const isGround = blockId.includes("sand") || blockId.includes("gravel") || blockId.includes("clay");
    return isGround;
  }

  if (type === "hoe") {
    const isHoeBlock = blockId.includes("leaves") || blockId === "minecraft:nether_wart_block" || blockId === "minecraft:warped_wart_block" || blockId.includes("sponge") || blockId.includes("hay") || blockId === "minecraft:shroomlight" || blockId === "minecraft:target" || blockId === "minecraft:dried_kelp_block";
    return isHoeBlock;
  }

  if (type === "shears") {
    const isShearable = blockId.includes("leaves") || blockId.includes("wool");
    return isShearable;
  }

  return false;
}

export function IsSilkTouchMaster(blockId) {
  const exactMatches = [
    "minecraft:blue_ice",
    "minecraft:bookshelf",
    "minecraft:chiseled_bookshelf",
    "minecraft:clay",
    "minecraft:creaking_heart",
    "minecraft:glowstone",
    "minecraft:ice",
    "minecraft:melon_block",
    "minecraft:mushroom_stem",
    "minecraft:brown_mushroom_block",
    "minecraft:red_mushroom_block",
    "minecraft:packed_ice"
  ];

  if (exactMatches.includes(blockId)) return true;
  if (blockId.includes("glass") || blockId.includes("glass_pane")) return true;
  if (blockId.includes("leaves")) return true;
  if (blockId.includes("coral")) return true;

  return false;
}

export function getToolCategory(toolId) {
  if (!toolId) return null;
  const id = toolId.toLowerCase();
  if (id.includes("_sword") || id.includes("sword")) return "sword";
  if (id.includes("_pick") || id.includes("pickaxe")) return "pickaxe";
  if (id.includes("_axe") || id.includes("axe")) return "axe";
  if (id.includes("_shovel") || id.includes("shovel") || id.includes("spade")) return "shovel";
  if (id.includes("_hoe") || id.includes("hoe")) return "hoe";
  if (id.includes("shears")) return "shears";
  return null;
}