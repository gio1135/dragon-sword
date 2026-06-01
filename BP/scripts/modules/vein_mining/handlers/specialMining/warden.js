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


export function SpawnWardenVisual(player, targetPos) {
  if (!player || !player.isValid) return;

  const dim = player.dimension;
  const head = player.getHeadLocation();
  const dir = player.getViewDirection();

  
  const right = { x: -dir.z, y: 0, z: dir.x };
  const startPos = {
    x: head.x + right.x * 0.35,
    y: head.y - 0.25,
    z: head.z + right.z * 0.35,
  };

  const endPos = {
    x: targetPos.x + 0.5,
    y: targetPos.y + 0.5,
    z: targetPos.z + 0.5,
  };
  const dx = endPos.x - startPos.x;
  const dy = endPos.y - startPos.y;
  const dz = endPos.z - startPos.z;

  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const steps = Math.min(30, Math.floor(distance * 2));

  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    dim.spawnParticle("minecraft:sonic_explosion", {
      x: startPos.x + dx * t,
      y: startPos.y + dy * t,
      z: startPos.z + dz * t,
    });
  }
}


export function ProcessMiningStepWarden(
  player,
  blockList,
  targetTypeId,
  magnetPos,
  initialCount,
  settings,
) {
  const WARDEN_PAUSE = 1;
  const RADIUS = 3.5; 

  const session = highlightManager.sessions.get(player.id);
  if (!session || session.isStopped) return;

  system.run(() => {
    if (!player.isValid) return;

    
    if (player.selectedSlotIndex !== session.startSlot) {
      return StopMining(player, session);
    }

    if (session.currentIndex === undefined) session.currentIndex = 0;

    
    if (session.currentIndex >= blockList.length) {
      FinishMining(player, session, initialCount);
      return;
    }

    const startIndex = session.currentIndex;

    
    let highestIndex = startIndex;
    let highestY = -Infinity;

    for (let i = startIndex; i < blockList.length; i++) {
      const pos = IdToPos(blockList[i]);
      if (pos.y > highestY) {
        highestY = pos.y;
        highestIndex = i;
      }
    }

    
    const tempCenter = blockList[startIndex];
    blockList[startIndex] = blockList[highestIndex];
    blockList[highestIndex] = tempCenter;

    const centerPos = IdToPos(blockList[startIndex]);

    
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

    
    SpawnWardenVisual(player, centerPos);
    player.dimension.runCommandAsync(
      `playsound mob.warden.sonic_boom @a ${centerPos.x} ${centerPos.y} ${centerPos.z} 0.5 1.2`,
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
        if (!newSession || newSession.isStopped || !player.isValid) return;

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
      }, WARDEN_PAUSE);
    } else {
      FinishMining(player, session, initialCount);
    }
  });
}
