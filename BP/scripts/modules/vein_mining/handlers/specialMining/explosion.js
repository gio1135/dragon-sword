import { system, EquipmentSlot } from "@minecraft/server";
import { highlightManager } from "../../highlight.js";
import { IdToPos, DisplayActionBar } from "../../utils.js";
import { CheckCanHarvest } from "../../requirements.js";
import {
  ExecuteSingleBreak,
  StopMining,
  FinishMining,
  RunChainBreak2,
} from "../core_handler.js";

export function ProcessMiningStepCluster(
  player,
  blockList,
  targetTypeId,
  magnetPos,
  initialCount,
  settings,
) {
  const CLUSTER_PAUSE = 1;
  const RADIUS = 4;

  const session = highlightManager.sessions.get(player.id);
  if (!session || session.isStopped) return;

  system.run(() => {
    if (!player.isValid) return;

    if (player.selectedSlotIndex !== session.startSlot) {
      return StopMining(player, session);
    }

    if (session.currentIndex === undefined) {
      session.currentIndex = 0;
    }

    if (session.currentIndex >= blockList.length) {
      FinishMining(player, session, initialCount);
      return;
    }

    
    const startIndex = session.currentIndex;
    const firstBlockId = blockList[startIndex];
    const centerPos = IdToPos(firstBlockId);

    let partitionIndex = startIndex + 1;

    
    for (let i = partitionIndex; i < blockList.length; i++) {
      const p = IdToPos(blockList[i]);
      const dx = p.x - centerPos.x;
      const dy = p.y - centerPos.y;
      const dz = p.z - centerPos.z;

      if (dx * dx + dy * dy + dz * dz <= RADIUS * RADIUS) {
        const temp = blockList[partitionIndex];
        blockList[partitionIndex] = blockList[i];
        blockList[i] = temp;
        partitionIndex++;
      }
    }

    const clusterSize = partitionIndex - startIndex;

    
    const dim = player.dimension;
    const visualCenter = {
      x: centerPos.x + 0.5,
      y: centerPos.y + 0.5,
      z: centerPos.z + 0.5,
    };

    dim.spawnParticle("minecraft:huge_explosion_emitter", visualCenter);
    dim.spawnParticle("minecraft:sonic_explosion", visualCenter);

    dim.runCommandAsync(
      `playsound random.explode @a ${visualCenter.x} ${visualCenter.y} ${visualCenter.z} 1 0.8`,
    );

    const tool = player
      .getComponent("minecraft:equippable")
      ?.getEquipment(EquipmentSlot.Mainhand);

    
    for (let i = 0; i < clusterSize; i++) {
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
        settings,
      );
    }

    DisplayActionBar(player, {
      type: "mining",
      current: session.currentIndex,
      max: initialCount,
    });

    if (session.currentIndex < blockList.length) {
      system.runTimeout(() => {
        const newSession = highlightManager.sessions.get(player.id);
        if (!newSession || newSession.isStopped) return;
        if (!player.isValid) return;

        if (player.selectedSlotIndex !== newSession.startSlot) {
          return StopMining(player, newSession);
        }

        RunChainBreak2(
          player,
          blockList,
          targetTypeId,
          magnetPos,
          initialCount,
        );
      }, CLUSTER_PAUSE);
    } else {
      FinishMining(player, session, initialCount);
    }
  });
}
