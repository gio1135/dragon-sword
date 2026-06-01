import { ItemStack, system, world } from "@minecraft/server";
import {
  SILK_LIST,
  FORTUNE_LIST,
  AUTO_DROP_LIST,
  CROP_REPLANT_MAP,
  JUNK_BLOCKS,
  DOOR_BLOCKS,
  SHEARABLE_BLOCKS,
} from "./registry.js";

function safeSpawnItem(dim, id, count, pos) {
  try {
    dim.spawnItem(new ItemStack(id, Math.max(1, count)), pos);
    return true;
  } catch {
    return false;
  }
}

function destroyWithNoDrops(dimension, pos) {
  const oldDrops = world.gameRules.doTileDrops;
  world.gameRules.doTileDrops = false;
  try {
    dimension.runCommand(`setblock ${pos.x} ${pos.y} ${pos.z} air [] destroy`);
  } catch (e) {}
  world.gameRules.doTileDrops = oldDrops;
}

function runFallbackDestroy(dimension, pos, targetPos) {
  system.run(() => {
    try {
      dimension.runCommand(`setblock ${pos.x} ${pos.y} ${pos.z} air [] destroy`);
    } catch (e) {
      console.error(`Vein Miner Fallback Error: ${e}`);
    }
  });
  system.runTimeout(() => {
    MagnetItems(dimension, pos, targetPos);
  }, 2);
}

export function BreakBlockLogic(
  player,
  dimension,
  pos,
  blockId,
  tool,
  targetPos,
  settings,
) {
  if (settings?.passiveVeinFlow?.includes("farm"))
    if (TryReplant(dimension, pos, blockId, settings)) {
      system.runTimeout(() => {
        MagnetItems(dimension, pos, targetPos);
      }, 2);
      return;
    }

  if (!tool || !player || !player.isValid) {
    runFallbackDestroy(dimension, pos, targetPos);
    return;
  }

  const enchant = tool.getComponent("minecraft:enchantable");
  const hasSilk =
    enchant?.getEnchantment("silk_touch") !== undefined ||
    enchant?.getEnchantment("minecraft:silk_touch") !== undefined;

  if (tool.typeId === "minecraft:shears" && SHEARABLE_BLOCKS.includes(blockId)) {
    if (safeSpawnItem(dimension, blockId, 1, targetPos)) {
      dimension.setBlockType(pos, "minecraft:air");
      return;
    }
  }

  const fortLvl =
    (
      enchant?.getEnchantment("fortune") ||
      enchant?.getEnchantment("minecraft:fortune")
    )?.level || 0;

  if (FORTUNE_LIST[blockId]) {
    const data = FORTUNE_LIST[blockId];
    let count = 1;

    if (fortLvl > 0) {
      count = Math.floor(Math.random() * (fortLvl + 1)) + 1;
      if (data.min !== undefined && data.max !== undefined) {
        const base =
          Math.floor(Math.random() * (data.max - data.min + 1)) + data.min;
        count = base * (Math.floor(Math.random() * fortLvl) + 1);
      }
    } else if (data.min !== undefined && data.max !== undefined) {
      count = Math.floor(Math.random() * (data.max - data.min + 1)) + data.min;
    }

    if (safeSpawnItem(dimension, data.id, count, targetPos)) {
      destroyWithNoDrops(dimension, pos);
      return;
    }
  }

  if (hasSilk && SILK_LIST.includes(blockId)) {
    if (safeSpawnItem(dimension, blockId, 1, targetPos)) {
      destroyWithNoDrops(dimension, pos);
      return;
    }
  }

  const isAutoDrop = AUTO_DROP_LIST.some((key) => blockId.includes(key));
  if (isAutoDrop) {
    if (safeSpawnItem(dimension, blockId, 1, targetPos)) {
      destroyWithNoDrops(dimension, pos);
      return;
    }
  }

  if (
    !hasSilk &&
    (blockId === "minecraft:ice" || blockId === "minecraft:frosted_ice")
  ) {
    dimension.setBlockType(pos, "minecraft:water");
    system.runTimeout(() => {
      MagnetItems(dimension, pos, targetPos);
    }, 2);
    return;
  }

  runFallbackDestroy(dimension, pos, targetPos);
}

export function HandleSafeTunnel(player, pos, settings) {
  if (!settings?.passiveVeinFlow?.includes("safe_tunnel")) return;

  const dim = player.dimension;
  const inventory = player.getComponent("minecraft:inventory").container;

  const sideOffsets = [
    { x: 0, y: 1, z: 0 },
    { x: 0, y: -1, z: 0 },
    { x: 1, y: 0, z: 0 },
    { x: -1, y: 0, z: 0 },
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 0, z: -1 },
  ];

  for (const off of sideOffsets) {
    const sidePos = { x: pos.x + off.x, y: pos.y + off.y, z: pos.z + off.z };
    const sideBlock = dim.getBlock(sidePos);

    if (sideBlock && sideBlock.isLiquid) {
      let fillSlot = -1;
      let fillTypeId = "";

      for (let i = 0; i < inventory.size; i++) {
        const item = inventory.getItem(i);
        if (item && JUNK_BLOCKS.includes(item.typeId)) {
          fillSlot = i;
          fillTypeId = item.typeId;
          break;
        }
      }

      if (fillSlot !== -1) {
        dim.setBlockType(sidePos, fillTypeId);
        player.playSound("use.stone");

        const stack = inventory.getItem(fillSlot);
        if (stack.amount > 1) {
          stack.amount--;
          inventory.setItem(fillSlot, stack);
        } else {
          inventory.setItem(fillSlot, undefined);
        }
      }
    }
  }
}

function TryReplant(dim, pos, blockId, settings) {
  if (!settings?.passiveVeinFlow?.includes("farm")) return false;

  const cropInfo = CROP_REPLANT_MAP[blockId];
  if (!cropInfo) return false;

  try {
    const block = dim.getBlock(pos);
    if (!block) return false;

    const growth = block.permutation.getState(cropInfo.state);
    if (growth !== cropInfo.max) return false;

    spawnCropLoot(dim, blockId, pos);

    system.run(() => {
      const b = dim.getBlock(pos);
      if (!b) return;
      b.setPermutation(b.permutation.withState(cropInfo.state, 0));
    });

    return true;
  } catch {
    return false;
  }
}

function spawnCropLoot(dim, blockId, pos) {
  const lootMap = {
    "minecraft:wheat": [
      { id: "minecraft:wheat", min: 1, max: 1 },
      { id: "minecraft:wheat_seeds", min: 1, max: 3 },
    ],
    "minecraft:carrots": [{ id: "minecraft:carrot", min: 1, max: 4 }],
    "minecraft:potatoes": [{ id: "minecraft:potato", min: 1, max: 4 }],
    "minecraft:beetroot": [
      { id: "minecraft:beetroot", min: 1, max: 1 },
      { id: "minecraft:beetroot_seeds", min: 1, max: 3 },
    ],
    "minecraft:nether_wart": [{ id: "minecraft:nether_wart", min: 2, max: 4 }],
    "minecraft:cocoa": [{ id: "minecraft:cocoa_beans", min: 2, max: 3 }],
  };

  const drops = lootMap[blockId];
  if (!drops) return;

  for (const d of drops) {
    const amount = Math.floor(Math.random() * (d.max - d.min + 1)) + d.min;
    dim.spawnItem(new ItemStack(d.id, amount), {
      x: pos.x + 0.5,
      y: pos.y + 0.5,
      z: pos.z + 0.5,
    });
  }
}

function MagnetItems(dim, pos, targetPos) {
  try {
    const items = dim.getEntities({
      type: "minecraft:item",
      location: {
        x: pos.x + 0.5,
        y: pos.y + 0.5,
        z: pos.z + 0.5,
      },
      maxDistance: 2.0,
    });

    for (const item of items) {
      item.teleport(targetPos);
      item.clearVelocity();
    }
  } catch {}
}

export function TryPlaceTorch(player, pos, settings) {
  if (!settings?.passiveVeinFlow?.includes("torch")) return;

  if (settings.totalMined % 8 !== 0) return;

  const dim = player.dimension;
  const inventory = player.getComponent("minecraft:inventory").container;

  let torchSlot = -1;
  for (let i = 0; i < inventory.size; i++) {
    const item = inventory.getItem(i);
    if (item?.typeId === "minecraft:torch") {
      torchSlot = i;
      break;
    }
  }
  if (torchSlot === -1) return;

  system.runTimeout(() => {
    if (!player.isValid) return;

    const currentBlock = dim.getBlock(pos);
    if (!currentBlock || (!currentBlock.isAir && !currentBlock.isLiquid)) return;

    let finalCanPlace = false;
    const floorBlock = dim.getBlock({ x: pos.x, y: pos.y - 1, z: pos.z });
    if (floorBlock && !floorBlock.isAir && !floorBlock.isLiquid) {
      finalCanPlace = true;
    }

    if (!finalCanPlace) {
      const wallOffsets = [
        { x: 0, y: 0, z: 1 },
        { x: 0, y: 0, z: -1 },
        { x: 1, y: 0, z: 0 },
        { x: -1, y: 0, z: 0 },
      ];

      for (const off of wallOffsets) {
        const sideBlock = dim.getBlock({
          x: pos.x + off.x,
          y: pos.y + off.y,
          z: pos.z + off.z,
        });
        if (sideBlock && !sideBlock.isAir && !sideBlock.isLiquid) {
          finalCanPlace = true;
          break;
        }
      }
    }

    if (finalCanPlace) {
      dim.setBlockType(pos, "minecraft:torch");
      const torchStack = inventory.getItem(torchSlot);
      if (torchStack) {
        if (torchStack.amount > 1) {
          torchStack.amount--;
          inventory.setItem(torchSlot, torchStack);
        } else {
          inventory.setItem(torchSlot, undefined);
        }
      }
    }
  }, 2);
}

export function HandleDoubleDoor(player, block, settings) {
  if (!settings?.passiveVeinFlow?.includes("double_door")) return;

  const dim = player.dimension;
  let baseBlock = block;

  if (baseBlock.permutation.getState("upper_block_bit")) {
    baseBlock = dim.getBlock({
      x: block.location.x,
      y: block.location.y - 1,
      z: block.location.z,
    });
  }

  if (!baseBlock || !DOOR_BLOCKS.includes(baseBlock.typeId)) return;

  const isOpen = baseBlock.permutation.getState("open_bit");
  const direction = baseBlock.permutation.getState("direction");

  const sideOffsets = [
    { x: 1, z: 0 },
    { x: -1, z: 0 },
    { x: 0, z: 1 },
    { x: 0, z: -1 },
  ];

  for (const off of sideOffsets) {
    const sidePos = {
      x: baseBlock.location.x + off.x,
      y: baseBlock.location.y,
      z: baseBlock.location.z + off.z,
    };
    const sideBlock = dim.getBlock(sidePos);

    if (sideBlock && DOOR_BLOCKS.includes(sideBlock.typeId)) {
      const sidePerm = sideBlock.permutation;
      if (
        sidePerm.getState("direction") === direction &&
        sidePerm.getState("open_bit") !== isOpen
      ) {
        system.run(() => {
          sideBlock.setPermutation(sidePerm.withState("open_bit", isOpen));
        });
      }
    }
  }
}