import { world, system } from "@minecraft/server";

system.runInterval(() => {
  for (const player of world.getAllPlayers()) {
    if (!player.isValid) continue;

    const rideable = player.getComponent("minecraft:riding");
    if (!rideable || !rideable.entityRidingOn) continue;

    const mount = rideable.entityRidingOn;

    if (mount.typeId === "minecraft:skeleton_horse") {
      if (player.isInWater) {
        player.addEffect("conduit_power", 40, { showParticles: false });
      }
    } else if (mount.typeId === "minecraft:strider") {
      player.addEffect("fire_resistance", 40, { showParticles: false });
    }
  }
}, 20);
