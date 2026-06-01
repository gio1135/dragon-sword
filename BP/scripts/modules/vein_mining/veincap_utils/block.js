function getBlock(dimension, location) {
  try {
    return dimension.getBlock(location);
  } catch (e) {
    return void 0;
  }
}
function getBlocks(block) {
  const blocks = [];
  const loc = block.location;
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        const newLoc = { x: loc.x, y: loc.y, z: loc.z };
        newLoc.x += x;
        newLoc.y += y;
        newLoc.z += z;
        if (newLoc.x === loc.x && newLoc.y === loc.y && newLoc.z === loc.z) continue;
        const newBlock = getBlock(block.dimension, newLoc);
        if (newBlock) blocks.push(newBlock);
      }
    }
  }
  return blocks;
}
function destroyBlock(block) {
  const loc = block.location;
  block.dimension.runCommandAsync(`setblock ${loc.x} ${loc.y} ${loc.z} air destroy`);
}
function getBlockToolLevel(tags) {
  let level = 0;
  for (const tag of tags) {
    if (tag.includes("wooden_tier")) {
      level = 1;
    } else if (tag.includes("golden_tier")) {
      level = 1;
    } else if (tag.includes("stone_tier") || tag.includes("copper_tier")) {
      level = 2;
    } else if (tag.includes("iron_tier")) {
      level = 3;
    } else if (tag.includes("diamond_tier")) {
      level = 4;
    } else if (tag.includes("netherite_tier")) {
      level = 5;
    }
  }
  return level;
}
export {
  destroyBlock,
  getBlock,
  getBlockToolLevel,
  getBlocks
};
