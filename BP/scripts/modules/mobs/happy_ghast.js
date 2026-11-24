import { system, world } from '@minecraft/server';

const BASE_FLYING_SPEED = 0.016;
const trackedGhasts = new Set();

system.runInterval(() => {
  const currentRiddenGhasts = new Set();

  for (const player of world.getAllPlayers()) {
    if (!player.isValid) continue;

    const ridingComp = player.getComponent('minecraft:riding');
    if (!ridingComp) continue;

    const mount = ridingComp.entityRidingOn;
    if (!mount || !mount.isValid || mount.typeId !== 'minecraft:happy_ghast') continue;

    currentRiddenGhasts.add(mount);
  }

  for (const ghast of currentRiddenGhasts) {
    const flyingSpeedComp = ghast.getComponent('minecraft:flying_speed');
    if (!flyingSpeedComp) continue;

    let maxAmp = -1;
    const ghastEffect = ghast.getEffect('speed');
    if (ghastEffect) {
      maxAmp = Math.max(maxAmp, ghastEffect.amplifier);
    }

    const rideableComp = ghast.getComponent('minecraft:rideable');
    const riders = rideableComp?.getRiders() ?? [];
    for (const rider of riders) {
      if (!rider.isValid) continue;
      const riderEffect = rider.getEffect('speed');
      if (riderEffect) {
        maxAmp = Math.max(maxAmp, riderEffect.amplifier);
      }
    }

    const targetSpeed = maxAmp >= 0 ? BASE_FLYING_SPEED * (1 + 2.5 * (maxAmp + 1)) : BASE_FLYING_SPEED;

    if (Math.abs(flyingSpeedComp.value - targetSpeed) > 0.0001) {
      flyingSpeedComp.value = targetSpeed;
    }

    const movementComp = ghast.getComponent('minecraft:movement');
    if (movementComp) {
      try {
        movementComp.setCurrentValue(targetSpeed);
      } catch {}
    }

    if (maxAmp >= 0) {
      trackedGhasts.add(ghast);
    } else {
      trackedGhasts.delete(ghast);
    }
  }

  for (const ghast of trackedGhasts) {
    if (!currentRiddenGhasts.has(ghast)) {
      if (ghast.isValid) {
        const flyingSpeedComp = ghast.getComponent('minecraft:flying_speed');
        if (flyingSpeedComp && Math.abs(flyingSpeedComp.value - BASE_FLYING_SPEED) > 0.0001) {
          flyingSpeedComp.value = BASE_FLYING_SPEED;
        }
        const movementComp = ghast.getComponent('minecraft:movement');
        if (movementComp) {
          try {
            movementComp.setCurrentValue(BASE_FLYING_SPEED);
          } catch {}
        }
      }
      trackedGhasts.delete(ghast);
    }
  }
}, 5);