import { world, system } from '@minecraft/server';
import { highlightManager } from './highlight.js';
import { IsActivated, IsBlockAllowed } from './requirements.js';
import { CheckGlobalHighlights } from './cleanup.js';

system.runInterval(() => {
  CheckGlobalHighlights();
}, 600);

system.runInterval(() => {
  highlightManager.cleanupOrphanedHighlights();
}, 100);

world.afterEvents.playerBreakBlock.subscribe((event) => {
  const { player, block, brokenBlockPermutation } = event;
  const locId = `${block.location.x},${block.location.y},${block.location.z}`;

  for (const [pId, session] of highlightManager.sessions.entries()) {
    if (session.blockSet?.has(locId)) {
      highlightManager.removeBlockHighlight(pId, locId);
    }
  }

  if (!IsActivated(player)) return;
  const targetTypeId = brokenBlockPermutation.type.id;
  if (IsBlockAllowed(player, targetTypeId)) {
    highlightManager.pushToQueue(player.id, {
      locId,
      typeId: targetTypeId,
      pos: block.location,
      tick: system.currentTick,
    });
  }
});

system.runInterval(() => {
  for (const player of world.getAllPlayers()) {
    if (!player.isValid) continue;
    if (player.hasTag('32k:disable_veinminer')) continue;

    highlightManager.processBreakQueue(player);
    highlightManager.handleScanning(player);
  }
});