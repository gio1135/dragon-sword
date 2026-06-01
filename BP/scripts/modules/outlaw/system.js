import { world, system, Player, EntityDamageCause } from '@minecraft/server';
import { ClaimManager } from '../land_claims/manager.js';
import { FeatureFlags } from '../../core/feature_flags.js';
import { DS } from '../../core/ds.js';

export function initOutlawSystem() {
  // 1. Kill Tracking (Outlaw Trigger)
  world.afterEvents.entityDie.subscribe(function (data) {
    if (!FeatureFlags.isEnabled(FeatureFlags.FEATURES.OUTLAW)) return;

    if (data.damageSource.damagingEntity instanceof Player && data.deadEntity instanceof Player) {
      DS.log('[Outlaw] Player v Player kill detected');
      const killer = data.damageSource.damagingEntity;
      // Use ClaimManager to get PlayerData to ensure singleton consistency
      const killerData = ClaimManager.getOrCreatePlayer(killer);

      if (killerData) {
        // Feature: Don't gain stars if killing an outlaw
        const victim = data.deadEntity;
        const victimData = ClaimManager.getOrCreatePlayer(victim);
        
        if (victimData && victimData.outlawStatus && victimData.outlawStatus.stage > 0) {
           DS.log('[Outlaw] Victim was an outlaw, no penalty applied.');
        } else {
           DS.log('[Outlaw] Incremented outlaw stage');
           checkAndIncrementOutlaw(killerData, killer);
        }
      } else {
        DS.log('[Outlaw] Failed to get killer data');
      }
    } else if (data.damageSource.damagingEntity?.typeId === 'minecraft:player' && data.deadEntity?.typeId === 'minecraft:player') {
      DS.log('[Outlaw] Player check failed (instanceof issue?)');
    }
  });

  // 2. Mount Kill Tracking
  world.afterEvents.entityDie.subscribe(function (data) {
    if (data.damageSource.damagingEntity instanceof Player) {
      const victim = data.deadEntity;
      const killer = data.damageSource.damagingEntity;

      // Check if it's a mount (Rideable + Tamed)
      // AND check if it is "Assigned" (has a ds:mount_ tag)
      // Tags are like: "ds:mount_<ownerID>"
      const tags = victim.getTags();
      const mountTag = tags.find(t => t.startsWith('ds:mount_'));

      if (mountTag) {
        // Extract Owner ID
        const ownerId = mountTag.replace('ds:mount_', '');

        // Don't punish if owner killed their own mount
        if (ownerId !== killer.id) {
          const killerData = ClaimManager.getOrCreatePlayer(killer);
          if (killerData) {
            checkAndApplyMinorPenalty(killerData, killer);
          }
        }
      }
    }
  });

  // 3. Interaction Restrictions
  world.beforeEvents.playerInteractWithEntity.subscribe(function (event) {
    if (event.cancel) return;
    const player = event.player;
    const target = event.target;
    const playerData = ClaimManager.getOrCreatePlayer(player);
    if (!playerData || !playerData.outlawStatus || playerData.outlawStatus.stage < 1) return;

    const stage = playerData.outlawStatus.stage;

    // Stage 1: No Villager Trading
    if (stage >= 1 && (target.typeId === 'minecraft:villager_v2' || target.typeId === 'minecraft:wandering_trader')) {
      event.cancel = true;
      player.sendMessage('§cVillagers refuse to trade with outlaws.');
      return;
    }

    // Stage 2: No Taming
    if (stage >= 2 && target.getComponent('minecraft:tameable') && !target.getComponent('minecraft:is_tamed')) {
      event.cancel = true;
      player.sendMessage('§cAnimals refuse to trust an outlaw.');
      return;
    }

    // Stage 3: No Mounting
    if (stage >= 3 && target.getComponent('minecraft:rideable')) {
      const boundTag = 'mount_horn_' + player.id;
      if (!target.hasTag(boundTag)) {
        event.cancel = true;
        player.sendMessage('§cThis mount refuses to let you mount.');
        return;
      }
    }
  });

  // 4. Game Loop (1 Minute)
  system.runInterval(function () {
    const timeOfDay = world.getTimeOfDay();
    const isNight = timeOfDay > 13000 && timeOfDay < 23000;

    for (const player of world.getAllPlayers()) {
      const playerData = ClaimManager.getOrCreatePlayer(player);
      if (!playerData) continue;

      const outlaw = playerData.outlawStatus || { stage: 0, timeRemaining: 0 };
      playerData.outlawStatus = outlaw;

      // Feature Flag Check: If disabled, clear status immediately
      if (!FeatureFlags.isEnabled(FeatureFlags.FEATURES.OUTLAW)) {
        if (outlaw.stage > 0) {
          outlaw.stage = 0;
          outlaw.timeRemaining = 0;
          player.sendMessage('§aOutlaw system disabled. You are at 0 stars.');
          // Force name tag reset
          if (player.nameTag.startsWith('\u00A7c')) {
            player.nameTag = player.name.replace(/\u00A7c/g, '');
          }
          // Force save immediately to persist reset
          ClaimManager.save();
        }
        continue;
      }

      if (outlaw.stage > 0) {
        // Decrement Logic
        outlaw.timeRemaining--;
        if (outlaw.timeRemaining <= 0) {
          outlaw.stage--;
          outlaw.timeRemaining = (outlaw.stage > 0) ? 60 : 0;

          const stars = outlaw.stage;
          if (stars > 0) {
            const starText = stars === 1 ? 'star' : 'stars';
            player.sendMessage(`§aYou are at ${stars} ${starText}.`);
            outlaw.timeRemaining = 60; // Reset for next stage check
          } else {
            player.sendMessage('§aYou are at 0 stars.');
            player.nameTag = player.name;
          }
        }

        // Save changes
        ClaimManager.save();

        // Nametag
        if (outlaw.stage > 0 && !player.nameTag.startsWith('\u00A7c')) {
          player.nameTag = '\u00A7c' + player.name.replace(/\u00A7c/g, '');
        }

        // Stage 5: Spawns
        if (outlaw.stage >= 5) {
          if (Math.random() < 0.1) {
            try {
              const x = player.location.x + (Math.random() * 20 - 10);
              const z = player.location.z + (Math.random() * 20 - 10);
              const y = player.dimension.getHeightMapCoordinate(x, z);
              if (y) {
                player.dimension.spawnEntity('minecraft:pillager', { x: x, y: y, z: z });
                player.sendMessage('§cOutlaw alert pillagers are tracking you.');
              }
            } catch (e) { }
          }
          if (isNight && Math.random() < 0.2) {
            try {
              player.dimension.spawnEntity('minecraft:phantom', { x: player.location.x, y: player.location.y + 10, z: player.location.z });
            } catch (e) { }
          }
        }
      }
    }
  }, 1200); // 1 minute

  // 5. Iron Golem Aggression
  system.runInterval(() => {
    const players = world.getAllPlayers();
    for (const player of players) {
      const pData = ClaimManager.getOrCreatePlayer(player);
      if (!pData || !pData.outlawStatus || pData.outlawStatus.stage < 5) continue;

      const dimension = player.dimension;
      const golems = dimension.getEntities({
        type: 'minecraft:iron_golem',
        location: player.location,
        maxDistance: 16
      });

      for (const golem of golems) {
        try {
          golem.applyDamage(1, {
            damagingEntity: player,
            cause: EntityDamageCause.entityAttack
          });
        } catch (e) { }
      }
    }
  }, 100);

  // 6. Join Listener
  world.afterEvents.playerSpawn.subscribe(function (event) {
    if (!event.initialSpawn) return;
    const player = event.player;
    const pData = ClaimManager.getOrCreatePlayer(player);
    if (pData && pData.outlawStatus && pData.outlawStatus.stage > 0) {
      const stars = pData.outlawStatus.stage;
      const starText = stars === 1 ? 'star' : 'stars';
      player.sendMessage(`§cYou are at ${stars} ${starText}.`);
      player.nameTag = '\u00A7c' + player.name.replace(/\u00A7c/g, '');
    }
  });
}

function checkAndIncrementOutlaw(killerData, player) {
  if (!killerData.outlawStatus) killerData.outlawStatus = { stage: 0, timeRemaining: 0 };

  killerData.outlawStatus.stage++;
  killerData.outlawStatus.timeRemaining = 60; // Reset to 1 hour (60 ticks of 1 minute)

  const stars = killerData.outlawStatus.stage;
  const starText = stars === 1 ? 'star' : 'stars';
  player.sendMessage(`§cYou are at ${stars} ${starText}.`);
  player.nameTag = '\u00A7c' + player.name.replace(/\u00A7c/g, '');

  ClaimManager.save();
}

function checkAndApplyMinorPenalty(killerData, player) {
  if (!killerData.outlawStatus) killerData.outlawStatus = { stage: 0, timeRemaining: 0 };

  // If not outlaw, make stage 1 for 30 minutes
  if (killerData.outlawStatus.stage === 0) {
    killerData.outlawStatus.stage = 1;
    killerData.outlawStatus.timeRemaining = 30; // 30 minutes
    player.sendMessage('§cYou are at 1 star for 30 minutes for killing a mount.');
    player.nameTag = '\u00A7c' + player.name.replace(/\u00A7c/g, '');
    ClaimManager.save();
  }
}
