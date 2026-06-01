import { system, EquipmentSlot, GameMode, ItemStack } from "@minecraft/server";
import { IdToPos, DisplayActionBar } from "./../utils.js";
import { highlightManager } from "./../highlight.js";
import { LOG_SAPLING_MAP, HOEBLOCK } from "./../registry.js";
import {
  HandleDurability,
  handleAutoSwap,
  SwapReplacementTool,
} from "./tool_handler.js";
import {
  ApplyExhaustion,
  ApplyMassExhaustion,
} from "./../requirements.js";

const VALID_GROUND = [
  "minecraft:grass_block",
  "minecraft:dirt",
  "minecraft:podzol",
  "minecraft:rooted_dirt",
  "minecraft:moss_block",
  "minecraft:dirt_path",
  "minecraft:mycelium",
  "minecraft:mud",
];
const REPLACEABLE_BLOCKS = [
  "minecraft:air",
  "minecraft:snow_layer",
  "minecraft:short_grass",
  "minecraft:tall_grass",
  "minecraft:fern",
  "minecraft:dead_bush",
];
const BATCH_SIZE = 25;

export function PlantSaplingSmart_v2(player, origin, saplingId, treeLogId) {
  const dim = player.dimension;
  const session = highlightManager.sessions.get(player.id);
  const isActuallyBig =
    treeLogId === "minecraft:dark_oak_log" || (session && session.isBigTree);

  if (isActuallyBig) {
    const base = findPlantSpot(dim, origin);
    if (!base) return;
    for (let x = 0; x <= 1; x++) {
      for (let z = 0; z <= 1; z++) {
        const p = { x: base.x + x, y: base.y, z: base.z + z };
        const below = dim.getBlock({ x: p.x, y: p.y - 1, z: p.z });
        if (below && VALID_GROUND.includes(below.typeId))
          dim.setBlockType(p, saplingId);
      }
    }
  } else {
    const spot = findPlantSpot(dim, origin);
    if (spot) dim.setBlockType(spot, saplingId);
  }
}

function findPlantSpot(dim, origin) {
  for (let dy = 1; dy <= 7; dy++) {
    const pos = { x: origin.x, y: origin.y - (dy - 1), z: origin.z };
    const below = dim.getBlock({ x: pos.x, y: pos.y - 1, z: pos.z });
    const here = dim.getBlock(pos);
    const above = dim.getBlock({ x: pos.x, y: pos.y + 1, z: pos.z });

    if (
      below &&
      VALID_GROUND.includes(below.typeId) &&
      (!here || here.isAir || REPLACEABLE_BLOCKS.includes(here.typeId)) &&
      (!above || above.isAir)
    ) {
      return pos;
    }
  }
  return null;
}

export function StartInstantLiquidVein(player, block, settings) {
  const session = highlightManager.sessions.get(player.id);
  if (!session || !session.isLiquid) return;

  const inventory = player.getComponent("minecraft:inventory").container;
  const targetTypeId = session.blockType;
  const blockList = Array.from(session.blockSet).map((id) => IdToPos(id));
  if (blockList.length === 0) return;

  const bucketSlots = [];
  for (let s = 0; s < inventory.size; s++) {
    const item = inventory.getItem(s);
    if (item?.typeId === "minecraft:bucket") bucketSlots.push(s);
  }
  if (bucketSlots.length === 0) return;

  const filledId = targetTypeId.includes("lava")
    ? "minecraft:lava_bucket"
    : "minecraft:water_bucket";

  function processBatch(index, currentBucketIdx, totalCount) {
    if (
      session.isStopped ||
      index >= blockList.length ||
      currentBucketIdx >= bucketSlots.length
    ) {
      if (totalCount > 0) {
        player.playSound(
          targetTypeId.includes("lava")
            ? "bucket.fill_lava"
            : "bucket.fill_water",
        );
        SpawnBucketsDelayed(player, totalCount, filledId);

        DisplayActionBar(player, { type: "finish", max: totalCount });
      }
      highlightManager.clearHighlights(player);
      return;
    }

    let countThisTick = 0;
    let processedInTick = 0;

    while (
      processedInTick < BATCH_SIZE &&
      index + processedInTick < blockList.length &&
      currentBucketIdx < bucketSlots.length
    ) {
      const pos = blockList[index + processedInTick];
      const b = player.dimension.getBlock(pos);

      if (b && b.typeId === targetTypeId) {
        const slot = bucketSlots[currentBucketIdx];
        const stack = inventory.getItem(slot);

        if (stack && stack.typeId === "minecraft:bucket") {
          player.dimension.setBlockType(pos, "minecraft:air");
          if (stack.amount > 1) {
            stack.amount--;
            inventory.setItem(slot, stack);
          } else {
            inventory.setItem(slot, undefined);
            currentBucketIdx++;
          }
          countThisTick++;
        } else {
          currentBucketIdx++;
        }
      }
      processedInTick++;
    }
    if (countThisTick > 0) {
      ApplyMassExhaustion(player, countThisTick, 1);
    }
    system.runTimeout(() => {
      processBatch(
        index + processedInTick,
        currentBucketIdx,
        totalCount + countThisTick,
      );
    }, 1);
  }

  processBatch(0, 0, 0);
}

function SpawnBucketsDelayed(player, remaining, itemTypeId) {
  if (remaining <= 0 || !player.isValid) return;
  const view = player.getViewDirection();

  const spawnPos = {
    x: player.location.x + view.x * 1.2,
    y: player.location.y + 1.5 + view.y * 1.2,
    z: player.location.z + view.z * 1.2,
  };
  player.dimension.spawnItem(new ItemStack(itemTypeId, 1), spawnPos);
  system.runTimeout(
    () => SpawnBucketsDelayed(player, remaining - 1, itemTypeId),
    1,
  );
}


export function StartInstantHoeVein(player, block, settings) {
  const session = highlightManager.sessions.get(player.id);
  if (!session || !session.isHoe) return;

  const equipment = player.getComponent("minecraft:equippable");
  const blockList = Array.from(session.blockSet).map((id) => IdToPos(id));
  if (blockList.length === 0) return;

  const hasAutoSwap = false;
  const hasProtection = true;

  function processBatch(index, totalCount) {
    let tool = equipment?.getEquipment(EquipmentSlot.Mainhand);
    if (
      !tool?.hasComponent("minecraft:durability") ||
      session.isStopped ||
      index >= blockList.length
    ) {
      finishAction(totalCount, "use.gravel");
      return;
    }

    let processedInTick = 0;
    let countThisTick = 0;

    while (
      processedInTick < BATCH_SIZE &&
      index + processedInTick < blockList.length
    ) {
      const pos = blockList[index + processedInTick];
      const b = player.dimension.getBlock(pos);

      if (b && HOEBLOCK.includes(b.typeId)) {
        
        const dur = tool.getComponent("minecraft:durability");
        if (hasProtection && dur.maxDurability - dur.damage <= 5) {
          if (hasAutoSwap && handleAutoSwap(player)) {
            tool = equipment.getEquipment(EquipmentSlot.Mainhand);
          } else break;
        }

        player.dimension.setBlockType(pos, "minecraft:farmland");
        const lastTypeId = tool.typeId;
        HandleDurability(player, tool, equipment);

        tool = equipment.getEquipment(EquipmentSlot.Mainhand);

        if (!tool) {
          if (hasAutoSwap && SwapReplacementTool(player, lastTypeId)) {
            tool = equipment.getEquipment(EquipmentSlot.Mainhand);
          } else break;
        }
        countThisTick++;
      }
      processedInTick++;
    }
    if (countThisTick > 0) {
      ApplyMassExhaustion(player, countThisTick, 0.5);
    }
    system.runTimeout(
      () => processBatch(index + processedInTick, totalCount + countThisTick),
      1,
    );
  }

  const finishAction = (count, sound) => {
    if (count > 0) {
      player.playSound(sound);
      DisplayActionBar(player, { type: "finish", max: count });
    }
    highlightManager.clearHighlights(player);
  };

  processBatch(0, 0);
}

export function StartInstantShovelVein(player, block, settings) {
  
  const session = highlightManager.sessions.get(player.id);
  if (!session || !session.isShovel) return;

  const equipment = player.getComponent("minecraft:equippable");
  const blockList = Array.from(session.blockSet).map((id) => IdToPos(id));
  if (blockList.length === 0) return;

  const hasAutoSwap = false;
  const hasProtection = true;

  function processBatch(index, totalCount) {
    let tool = equipment?.getEquipment(EquipmentSlot.Mainhand);
    if (
      !tool?.hasComponent("minecraft:durability") ||
      session.isStopped ||
      index >= blockList.length
    ) {
      if (totalCount > 0) {
        player.playSound("use.grass");
        DisplayActionBar(player, { type: "finish", max: totalCount });
      }
      highlightManager.clearHighlights(player);
      return;
    }

    let processedInTick = 0;
    let countThisTick = 0;

    while (
      processedInTick < BATCH_SIZE &&
      index + processedInTick < blockList.length
    ) {
      const pos = blockList[index + processedInTick];
      const b = player.dimension.getBlock(pos);
      if (b) {
        const dur = tool.getComponent("minecraft:durability");
        if (hasProtection && dur.maxDurability - dur.damage <= 5) {
          if (hasAutoSwap && handleAutoSwap(player)) {
            tool = equipment.getEquipment(EquipmentSlot.Mainhand);
          } else break;
        }

        player.dimension.setBlockType(pos, "minecraft:grass_path");
        const lastTypeId = tool.typeId;
        HandleDurability(player, tool, equipment);

        tool = equipment.getEquipment(EquipmentSlot.Mainhand);

        if (
          !tool &&
          hasAutoSwap &&
          SwapReplacementTool(player, lastTypeId)
        ) {
          tool = equipment.getEquipment(EquipmentSlot.Mainhand);
        } else if (!tool) break;

        countThisTick++;
      }
      processedInTick++;
    }
    if (countThisTick > 0) {
      ApplyMassExhaustion(player, countThisTick, 0.5);
    }
    system.runTimeout(
      () => processBatch(index + processedInTick, totalCount + countThisTick),
      1,
    );
  }

  processBatch(0, 0);
}
