import { system, EquipmentSlot, GameMode } from "@minecraft/server";
import { BreakBlockLogic } from "./../mining_logic.js";
import {
  CheckCanHarvest,
  GetBlockCategory,
} from "./../requirements.js";
import { IdToPos, DisplayActionBar } from "./../utils.js";
import { highlightManager } from "./../highlight.js";
import {
  CheckModeActive,
  ValidateMining,
} from "./validation_handler.js";
import { HandleDurability } from "./tool_handler.js";

export function RunChainBreak2(
  player,
  blockList,
  targetTypeId,
  magnetPos,
  initialCount = null,
) {
  const topDownBlocks = [
    "minecraft:gravel",
    "minecraft:sand",
    "minecraft:red_sand",
    "minecraft:clay",
    "minecraft:snow_layer",
    "minecraft:twisting_vines",
    "minecraft:vine",
    "minecraft:suspicious_sand",
    "minecraft:suspicious_gravel",
    "minecraft:soul_sand",
  ];
  const isTopDown =
    topDownBlocks.includes(targetTypeId) ||
    targetTypeId.includes("concrete_powder");
  const isDownUp = targetTypeId === "minecraft:weeping_vines";

  if (isTopDown || isDownUp) {
    blockList.sort((a, b) => {
      const yA = parseInt(a.split(',')[1], 10);
      const yB = parseInt(b.split(',')[1], 10);
      return isTopDown ? yB - yA : yA - yB;
    });
  }

  let session = highlightManager.sessions.get(player.id);
  if (!session || session.isStopped) return;

  if (initialCount === null) initialCount = blockList.length;
  session.isMining = true;

  if (!CheckModeActive(player)) {
    return StopMining(player, session);
  }

  if (!ValidateMining(player, targetTypeId)) {
    return StopMining(player, session);
  }

  if (blockList.length === 0) {
    return FinishMining(player, session, initialCount);
  }

  ProcessMiningStep(
    player,
    blockList,
    targetTypeId,
    magnetPos,
    initialCount,
  );
}

export function ProcessMiningStep(
  player,
  blockList,
  targetTypeId,
  magnetPos,
  initialCount,
) {
  const session = highlightManager.sessions.get(player.id);
  if (!session || session.isStopped) return;

  const remainingInList = blockList.length - session.currentIndex;
  const blocksToBreak = Math.min(remainingInList, 12);

  system.run(() => {
    if (!player.isValid) return;

    if (player.selectedSlotIndex !== session.startSlot) {
      return StopMining(player, session);
    }

    DisplayActionBar(player, {
      type: "mining",
      current: session.currentIndex,
      max: initialCount,
    });

    for (let i = 0; i < blocksToBreak; i++) {
      if (!session || session.isStopped) break;
      if (session.currentIndex >= blockList.length) break;

      const equipment = player.getComponent("minecraft:equippable");
      const tool = equipment?.getEquipment(EquipmentSlot.Mainhand);

      if (session.isStandard !== true) {
        const req = CheckCanHarvest(targetTypeId, tool);
        if (
          req.requiredTier > 0 &&
          (!tool || !tool.hasComponent("minecraft:durability"))
        ) {
          return StopMining(player, session);
        }
      }

      ExecuteSingleBreak(
        player,
        blockList,
        targetTypeId,
        magnetPos,
      );

      if (session.isStopped) break;
    }

    if (session.currentIndex < blockList.length) {
      system.runTimeout(
        () => {
          RunChainBreak2(
            player,
            blockList,
            targetTypeId,
            magnetPos,
            initialCount,
          );
        },
        1,
      );
    } else {
      FinishMining(player, session, initialCount);
    }
  });
}

export function ExecuteSingleBreak(
  player,
  blockList,
  targetTypeId,
  magnetPos,
) {
  const session = highlightManager.sessions.get(player.id);
  const locId = blockList[session.currentIndex++];
  if (!locId) return;

  highlightManager.removeBlockHighlight(player.id, locId);

  const currentBlockPos = IdToPos(locId);
  const block = player.dimension.getBlock(currentBlockPos);
  if (!block) return;

  if (block.typeId !== targetTypeId) return;

  const lightEnt = session.lightsMap?.get(locId);
  if (lightEnt?.isValid)
    try {
      lightEnt.remove();
    } catch (e) {}

  if (player.getGameMode() === GameMode.creative) {
    player.dimension.setBlockType(currentBlockPos, "minecraft:air");
  } else {
    const equipment = player.getComponent("minecraft:equippable");
    let currentTool = equipment?.getEquipment(EquipmentSlot.Mainhand);

    const check = CheckCanHarvest(block.typeId, currentTool);

    if (!check.allowed) {
      return StopMining(player, session);
    }

    if (currentTool && currentTool.hasComponent("minecraft:durability")) {
      const dur = currentTool.getComponent("minecraft:durability");
      const remainingDur = dur.maxDurability - dur.damage;

      if (remainingDur <= 1) {
        return StopMining(player, session);
      }

      BreakBlockLogic(
        player,
        player.dimension,
        currentBlockPos,
        block.typeId,
        currentTool,
        magnetPos,
      );

      HandleDurability(player, currentTool, equipment);

      const toolAfterBreak = equipment.getEquipment(EquipmentSlot.Mainhand);
      if (!toolAfterBreak) {
        return StopMining(player, session);
      }
    } else {
      BreakBlockLogic(
        player,
        player.dimension,
        currentBlockPos,
        block.typeId,
        currentTool,
        magnetPos,
      );
    }
  }
}

export function FinishMining(player, session, initialCount) {
  DisplayActionBar(player, { type: "finish", max: initialCount });
  if (session) {
    session.isMining = false;
  }
  highlightManager.clearHighlights(player);
  highlightManager.sessions.delete(player.id);
}

export function StopMining(player, session) {
  if (!session || session.isStopped) return;

  session.isStopped = true;
  session.isMining = false;

  if (session.queue) session.queue.length = 0;
  if (session.blockSet) session.blockSet.clear();

  highlightManager.clearHighlights(player);
  highlightManager.sessions.delete(player.id);

  DisplayActionBar(player, { type: "stop" });
}
