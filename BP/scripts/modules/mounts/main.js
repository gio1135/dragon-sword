import {world, system} from "@minecraft/server";

const MOUNT_HORN = "minecraft:goat_horn";
const ALLOWED_MOUNTS = new Set([
  "minecraft:camel_husk",
  "minecraft:camel",
  "minecraft:donkey",
  "minecraft:happy_ghast",
  "minecraft:horse",
  "minecraft:mule",
  "minecraft:nautilus",
  "minecraft:pig",
  "minecraft:skeleton_horse",
  "minecraft:strider",
  "minecraft:zombie_horse",
  "minecraft:zombie_nautilus"
]);

world.beforeEvents.playerInteractWithEntity.subscribe((ev) => {
  const {player, target, itemStack} = ev;
  if (!player.isSneaking || itemStack?.typeId !== MOUNT_HORN) return;
  if (!ALLOWED_MOUNTS.has(target.typeId)) return;

  const tameable = target.getComponent("minecraft:tameable");
  if (tameable && !tameable.isTamed) {
    player.playSound("note.bass");
    ev.cancel = true;
    return;
  }

  const saddled = target.getComponent("minecraft:is_saddled");
  if (!saddled) {
    player.playSound("note.bass");
    ev.cancel = true;
    return;
  }
});