import { system, world } from "@minecraft/server";

system.runInterval(() => {
  const dimensions = ["overworld", "nether", "the_end"];
  for (const dimId of dimensions) {
    const dimension = world.getDimension(dimId);
    
    const endermen = dimension.getEntities({ type: "minecraft:enderman" });
    for (const enderman of endermen) {
      if (!enderman.isValid) continue;

      const healthComp = enderman.getComponent("minecraft:health");
      if (!healthComp) continue;

      // Aggressive teleport triggers when below 30% health
      if (healthComp.currentValue <= 30) {
        
        // Do not teleport if riding a vehicle (boat, minecart, etc.)
        const ridingComp = enderman.getComponent("minecraft:riding");
        if (ridingComp && ridingComp.entityRidingOn) continue;

        // Find nearest player within 32 blocks
        const players = dimension.getPlayers({ location: enderman.location, maxDistance: 32 });
        if (players.length > 0) {
          const target = players[0];
          
          const dx = target.location.x - enderman.location.x;
          const dz = target.location.z - enderman.location.z;
          const dist = Math.sqrt(dx * dx + dz * dz);

          // If out of melee reach, force teleport back to the player
          if (dist > 4) {
             const currentTick = system.currentTick;
             const lastTp = enderman.getDynamicProperty("lastAggroTpTick") || 0;
             
             // Cooldown of 2 seconds (40 ticks) to prevent spamming teleports
             if (currentTick - lastTp > 40) { 
                const dirX = dx / dist;
                const dirZ = dz / dist;
                
                // Position 2 blocks in front of the player
                const tpLoc = {
                   x: target.location.x - (dirX * 2),
                   y: target.location.y,
                   z: target.location.z - (dirZ * 2)
                };

                try {
                  enderman.teleport(tpLoc, { dimension: dimension, facingLocation: target.location });
                  dimension.spawnParticle("minecraft:endrod", enderman.location);
                  dimension.playSound("mob.endermen.portal", enderman.location);
                  enderman.setDynamicProperty("lastAggroTpTick", currentTick);
                } catch (e) {
                  // Ignore invalid teleports (e.g., inside blocks)
                }
             }
          }
        }
      }
    }
  }
}, 10);
