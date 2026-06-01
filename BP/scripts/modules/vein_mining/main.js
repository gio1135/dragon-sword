import { world, system, EquipmentSlot } from "@minecraft/server";
import { highlightManager } from "./highlight.js";
import { IsActivated, IsBlockAllowed } from "./requirements.js";
import { CheckGlobalHighlights } from "./cleanup.js";

system.runInterval(() => {
  CheckGlobalHighlights();
}, 600);

system.runInterval(() => {
  highlightManager.cleanupOrphanedHighlights();
}, 100);

world.afterEvents.playerBreakBlock.subscribe((event) => {
  const { player, block, brokenBlockPermutation } = event;

  if (!IsActivated(player)) return;
  const targetTypeId = brokenBlockPermutation.type.id;
  if (IsBlockAllowed(player, targetTypeId)) {
    highlightManager.pushToQueue(player.id, {
      locId: `${block.location.x},${block.location.y},${block.location.z}`,
      typeId: targetTypeId,
      pos: block.location,
      tick: system.currentTick,
    });
  }
});

system.runInterval(() => {
  for (const player of world.getAllPlayers()) {
    if (!player.isValid) continue;

    highlightManager.processBreakQueue(player);
    highlightManager.handleScanning(player);
  }
});