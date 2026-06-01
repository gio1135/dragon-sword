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

export function ProcessMiningStepSphereBurst(
  player,
  blockList,
  targetTypeId,
  magnetPos,
  initialCount,
  settings,
) {
  const CLUSTER_PAUSE = 1;
  const RADIUS = 5;

  const session = highlightManager.sessions.get(player.id);
  if (!session || session.isStopped) return;

  system.run(() => {
    if (!player.isValid) return;

    if (player.selectedSlotIndex !== session.startSlot) {
      return StopMining(player, session);
    }

    if (session.currentIndex === undefined) session.currentIndex = 0;
    const startIndex = session.currentIndex;

    if (startIndex >= blockList.length) {
      FinishMining(player, session, initialCount);
      return;
    }

    
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
    const visualCenter = {
      x: centerPos.x + 0.5,
      y: centerPos.y + 0.5,
      z: centerPos.z + 0.5,
    };

    
    SpawnSphereBurst(player, visualCenter, () => {
      
      if (!player.isValid) return;

      const currentSession = highlightManager.sessions.get(player.id);
      if (!currentSession || currentSession.isStopped) return; 

      if (player.selectedSlotIndex !== currentSession.startSlot) {
        return StopMining(player, currentSession);
      }

      const tool = player
        .getComponent("minecraft:equippable")
        ?.getEquipment(EquipmentSlot.Mainhand);

      
      for (let i = 0; i < clusterSize; i++) {
        if (currentSession.isStandard !== true) {
          const req = CheckCanHarvest(targetTypeId, tool);
          if (
            req.requiredTier > 0 &&
            (!tool || !tool.hasComponent("minecraft:durability"))
          ) {
            return StopMining(player, currentSession);
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
        current: currentSession.currentIndex,
        max: initialCount,
      });

      
      if (currentSession.currentIndex < blockList.length) {
        system.runTimeout(() => {
          RunChainBreak2(
            player,
            blockList,
            targetTypeId,
            magnetPos,
            initialCount,
          );
        }, CLUSTER_PAUSE);
      } else {
        FinishMining(player, currentSession, initialCount);
      }
    });
  });
}

export function SpawnSphereBurst(player, centerPos, onFinish) {
  const dimension = player.dimension;
  const MAX_RADIUS = 5;
  const STEP = 0.5;
  let radius = 0;
  let expanding = true;

  const task = system.runInterval(() => {
    if (!player.isValid) {
      system.clearRun(task);
      return;
    }

    
    const points = 12;
    for (let c = 0; c < 4; c++) {
      const tilt = (Math.PI / 4) * c;
      for (let i = 0; i < points; i++) {
        const angle = Math.PI * 2 * (i / points);
        dimension.spawnParticle("minecraft:blue_flame_particle", {
          x: centerPos.x + Math.cos(angle) * radius,
          y: centerPos.y + Math.sin(angle) * radius * Math.cos(tilt),
          z: centerPos.z + Math.sin(angle) * radius * Math.sin(tilt),
        });
      }
    }

    if (expanding) {
      radius += STEP;
      if (radius >= MAX_RADIUS) expanding = false;
    } else {
      radius -= STEP;
      if (radius <= 0) {
        system.clearRun(task);
        dimension.spawnParticle("minecraft:huge_explosion_emitter", centerPos);
        dimension.runCommandAsync(
          `playsound random.explode @a ${centerPos.x} ${centerPos.y} ${centerPos.z} 1 1`,
        );
        if (onFinish) onFinish();
      }
    }
  }, 1);
}
