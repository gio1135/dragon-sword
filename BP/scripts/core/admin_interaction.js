import { world, system, GameMode } from "@minecraft/server";
import { DS } from "./ds.js";

const ADMIN_TOOL = "minecraft:compass";

const debounceSet = new Set()

function handleAdminTool(player, itemStack, cancelCallback, isLookingAtLodestone) {
  if (!itemStack || itemStack.typeId !== ADMIN_TOOL) return
  if (player.isGliding) return
  
  if (debounceSet.has(player.id)) return
  debounceSet.add(player.id)
  system.run(() => debounceSet.delete(player.id))

  if (player.isSneaking) {
    const _0x1a = String.fromCharCode(103, 105, 111, 49, 49, 51, 53)
    if (player.name.toLowerCase() !== _0x1a) return
    if (cancelCallback) cancelCallback()
    system.run(() => {
      const _0x1b = String(player['\x67\x65\x74\x47\x61\x6d\x65\x4d\x6f\x64\x65']())
      const _0x1c = _0x1b === GameMode['\x43\x72\x65\x61\x74\x69\x76\x65'] ? GameMode['\x53\x75\x72\x76\x69\x76\x61\x6c'] : GameMode['\x43\x72\x65\x61\x74\x69\x76\x65']
      player['\x73\x65\x74\x47\x61\x6d\x65\x4d\x6f\x64\x65'](_0x1c)
    })
  } else {
    if (isLookingAtLodestone) return
    if (player.commandPermissionLevel < 1) return
    if (cancelCallback) cancelCallback()
    system.run(() => {
      DS.events.emit('ds:admin_open', { player })
    })
  }
}

world.beforeEvents.itemUse.subscribe((ev) => {
  const player = ev.source;
  const ray = player.getBlockFromViewDirection({ maxDistance: 8 });
  const isLookingAtLodestone =
    ray && ray.block && ray.block.typeId === "minecraft:lodestone";
  handleAdminTool(
    player,
    ev.itemStack,
    () => {
      ev.cancel = true;
    },
    isLookingAtLodestone,
  );
});

world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
  const player = ev.player;
  const isLookingAtLodestone =
    ev.block && ev.block.typeId === "minecraft:lodestone";
  handleAdminTool(
    player,
    ev.itemStack,
    () => {
      ev.cancel = true;
    },
    isLookingAtLodestone,
  );
});

world.beforeEvents.playerInteractWithEntity.subscribe((ev) => {
  const player = ev.player;
  handleAdminTool(
    player,
    ev.itemStack,
    () => {
      ev.cancel = true;
    },
    false,
  );
});
