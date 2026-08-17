import { world, system } from '@minecraft/server';
import { getStatsManager } from './core/StatsManager.js';
import { initializeTrackers } from './trackers/index.js';
import { showStatsMenu } from './ui/StatsMenu.js';
import { WorldStorageAdapter } from './core/WorldStorageAdapter.js';
import { runMigration } from './migration.js';

export function initializeStats() {
  const manager = getStatsManager();
  manager.initialize();

  const trackers = initializeTrackers();

  world.beforeEvents.itemUse.subscribe((event) => {
    onItemUse(event);
  });
}

function onItemUse(event) {
  const { source: player, itemStack } = event;
  if (!itemStack) return;

  const isWritten = itemStack.typeId === 'minecraft:written_book';
  const isWritable = itemStack.typeId === 'minecraft:writable_book';
  const isNormalBook = itemStack.typeId === 'minecraft:book';

  if (!isWritten && !isWritable && !isNormalBook) return;

  const bookComponent = itemStack.getComponent('minecraft:book');
  const title = bookComponent?.title ?? itemStack.nameTag ?? '';

  let targetName = null;
  let targetStats = null;

  const isSelf = ['Stats', 'stats', 'Statistics', 'statistics'].includes(title);

  if (isSelf) {
    targetName = player.name;
    targetStats = getStatsManager().getAllStats(player);
  } else {
    const online = world.getAllPlayers().find((p) => p.name === title);
    if (online) {
      targetName = online.name;
      targetStats = getStatsManager().getAllStats(online);
    } else {
      const registry = WorldStorageAdapter.loadRegistry();
      const foundId = Object.keys(registry.players).find(
        (id) => registry.players[id].name === title,
      );
      if (foundId) {
        targetName = title;
        targetStats = WorldStorageAdapter.getPlayerStats(foundId, title);
      }
    }
  }

  if (!targetStats) return;

  event.cancel = true;

  system.run(() => {
    showStatsMenu(player, targetName, targetStats);
  });
}
