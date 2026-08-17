import { world, system, Player, EntityDamageCause } from '@minecraft/server';
import { ClaimManager } from '../land_claims/manager.js';
import { FeatureFlags } from '../../core/feature_flags.js';
import { DS } from '../../core/ds.js';

export function initOutlawSystem() {
  DS.events.on('ds:op_player_manage_ui', (payload) => {
    if (!FeatureFlags.isEnabled(FeatureFlags.FEATURES.OUTLAW)) return;

    const targetData = payload.targetData;
    const player = payload.player;

    if (targetData.outlawStatus && targetData.outlawStatus.stage > 0) {
      payload.body += `\n§cOutlaw: §f${targetData.outlawStatus.stage} stars (${targetData.outlawStatus.timeRemaining}m)`;
      
      payload.buttons.push({
        text: 'Remove 1 Star',
        action: (uiCtx) => {
          targetData.outlawStatus.stage--;
          if (targetData.outlawStatus.stage <= 0) {
            targetData.outlawStatus.stage = 0;
            targetData.outlawStatus.timeRemaining = 0;
          } else {
            targetData.outlawStatus.timeRemaining = 60;
          }
          ClaimManager.save();

          const victim = world.getAllPlayers().find(p => p.id === targetData.id);
          if (victim) {
            const stars = targetData.outlawStatus.stage;
            if (stars > 0) {
              const starText = stars === 1 ? 'star' : 'stars';
              victim.sendMessage(`§aYou are at ${stars} ${starText}`);
              if (!victim.nameTag.startsWith('\u00A7c')) {
                victim.nameTag = '\u00A7c' + victim.name.replace(/\u00A7c/g, '');
              }
            } else {
              victim.sendMessage('§aYou are at 0 stars');
              victim.nameTag = victim.name;
            }
          }

          uiCtx.openOpPlayerManageMenu(player, targetData);
        }
      });
    }
  });
  world.afterEvents.entityDie.subscribe(function (data) {
    if (!FeatureFlags.isEnabled(FeatureFlags.FEATURES.OUTLAW)) return;

    if (
      data.damageSource.damagingEntity instanceof Player &&
      data.deadEntity instanceof Player
    ) {
      DS.log('[Outlaw] Player v Player kill detected');
      const killer = data.damageSource.damagingEntity;
      const killerData = ClaimManager.getOrCreatePlayer(killer);

      if (killerData) {
        const victim = data.deadEntity;
        const victimData = ClaimManager.getOrCreatePlayer(victim);

        if (
          victimData &&
          victimData.outlawStatus &&
          victimData.outlawStatus.stage > 0
        ) {
          DS.log('[Outlaw] Victim was an outlaw, no penalty applied.');
        } else {
          DS.log('[Outlaw] Incremented outlaw stage');
          checkAndIncrementOutlaw(killerData, killer);
        }
      } else {
        DS.log('[Outlaw] Failed to get killer data');
      }
    } else if (
      data.damageSource.damagingEntity?.typeId === 'minecraft:player' &&
      data.deadEntity?.typeId === 'minecraft:player'
    ) {
      DS.log('[Outlaw] Player check failed (instanceof issue?)');
    }
  });

  world.afterEvents.entityDie.subscribe(function (data) {
    if (data.damageSource.damagingEntity instanceof Player) {
      const victim = data.deadEntity;
      const killer = data.damageSource.damagingEntity;

      const tags = victim.getTags();
      const mountTag = tags.find((t) => t.startsWith('ds:mount_'));

      if (mountTag) {
        const ownerId = mountTag.replace('ds:mount_', '');

        if (ownerId !== killer.id) {
          const killerData = ClaimManager.getOrCreatePlayer(killer);
          if (killerData) {
            checkAndApplyMinorPenalty(killerData, killer);
          }
        }
      }
    }
  });

  world.beforeEvents.playerInteractWithEntity.subscribe(function (event) {
    if (event.cancel) return;
    const player = event.player;
    const target = event.target;
    const playerData = ClaimManager.getOrCreatePlayer(player);
    if (
      !playerData ||
      !playerData.outlawStatus ||
      playerData.outlawStatus.stage < 1
    )
      return;

    const stage = playerData.outlawStatus.stage;

    if (
      stage >= 1 &&
      (target.typeId === 'minecraft:villager_v2' ||
        target.typeId === 'minecraft:wandering_trader')
    ) {
      event.cancel = true;
      player.sendMessage('§cVillagers refuse to trade with outlaws');
      return;
    }

    if (
      stage >= 2 &&
      target.getComponent('minecraft:tameable') &&
      !target.getComponent('minecraft:is_tamed')
    ) {
      event.cancel = true;
      player.sendMessage('§cAnimals refuse to trust an outlaw');
      return;
    }

    if (stage >= 3 && target.getComponent('minecraft:rideable')) {
      const boundTag = 'mount_horn_' + player.id;
      if (!target.hasTag(boundTag)) {
        event.cancel = true;
        player.sendMessage('§cThis mount refuses to let you mount');
        return;
      }
    }
  });

  system.runInterval(function () {
    const timeOfDay = world.getTimeOfDay();
    const isNight = timeOfDay > 13000 && timeOfDay < 23000;

    for (const player of world.getAllPlayers()) {
      const playerData = ClaimManager.getOrCreatePlayer(player);
      if (!playerData) continue;

      const outlaw = playerData.outlawStatus || { stage: 0, timeRemaining: 0 };
      playerData.outlawStatus = outlaw;

      if (!FeatureFlags.isEnabled(FeatureFlags.FEATURES.OUTLAW)) {
        if (outlaw.stage > 0) {
          outlaw.stage = 0;
          outlaw.timeRemaining = 0;
          player.sendMessage('§aOutlaw system disabled. You are at 0 stars');
          if (player.nameTag.startsWith('\u00A7c')) {
            player.nameTag = player.name.replace(/\u00A7c/g, '');
          }
          ClaimManager.save();
        }
        continue;
      }

      if (outlaw.stage > 0) {
        outlaw.timeRemaining--;
        if (outlaw.timeRemaining <= 0) {
          outlaw.stage--;
          outlaw.timeRemaining = outlaw.stage > 0 ? 60 : 0;

          const stars = outlaw.stage;
          if (stars > 0) {
            const starText = stars === 1 ? 'star' : 'stars';
            player.sendMessage(`§aYou are at ${stars} ${starText}`);
            outlaw.timeRemaining = 60;
          } else {
            player.sendMessage('§aYou are at 0 stars');
            player.nameTag = player.name;
          }
        }

        ClaimManager.save();

        if (outlaw.stage > 0 && !player.nameTag.startsWith('\u00A7c')) {
          player.nameTag = '\u00A7c' + player.name.replace(/\u00A7c/g, '');
        }

        if (outlaw.stage >= 5) {
          if (Math.random() < 0.1) {
            try {
              const x = player.location.x + (Math.random() * 20 - 10);
              const z = player.location.z + (Math.random() * 20 - 10);
              const y = player.dimension.getHeightMapCoordinate(x, z);
              if (y) {
                player.dimension.spawnEntity('minecraft:pillager', {
                  x: x,
                  y: y,
                  z: z,
                });
                player.sendMessage('§cOutlaw alert pillagers are tracking you');
              }
            } catch (e) {}
          }
          if (isNight && Math.random() < 0.2) {
            try {
              player.dimension.spawnEntity('minecraft:phantom', {
                x: player.location.x,
                y: player.location.y + 10,
                z: player.location.z,
              });
            } catch (e) {}
          }
        }
      }
    }
  }, 1200);

  system.runInterval(() => {
    const players = world.getAllPlayers();
    for (const player of players) {
      const pData = ClaimManager.getOrCreatePlayer(player);
      if (!pData || !pData.outlawStatus || pData.outlawStatus.stage < 5)
        continue;

      const dimension = player.dimension;
      const golems = dimension.getEntities({
        type: 'minecraft:iron_golem',
        location: player.location,
        maxDistance: 16,
      });

      for (const golem of golems) {
        try {
          golem.applyDamage(1, {
            damagingEntity: player,
            cause: EntityDamageCause.entityAttack,
          });
        } catch (e) {}
      }
    }
  }, 100);

  world.afterEvents.playerSpawn.subscribe(function (event) {
    if (!event.initialSpawn) return;
    const player = event.player;
    const pData = ClaimManager.getOrCreatePlayer(player);
    if (pData && pData.outlawStatus && pData.outlawStatus.stage > 0) {
      const stars = pData.outlawStatus.stage;
      const starText = stars === 1 ? 'star' : 'stars';
      player.sendMessage(`§cYou are at ${stars} ${starText}`);
      player.nameTag = '\u00A7c' + player.name.replace(/\u00A7c/g, '');
    }
  });
}

function checkAndIncrementOutlaw(killerData, player) {
  if (!killerData.outlawStatus)
    killerData.outlawStatus = { stage: 0, timeRemaining: 0 };

  killerData.outlawStatus.stage++;
  killerData.outlawStatus.timeRemaining = 60;

  const stars = killerData.outlawStatus.stage;
  const starText = stars === 1 ? 'star' : 'stars';
  player.sendMessage(`§cYou are at ${stars} ${starText}`);
  player.nameTag = '\u00A7c' + player.name.replace(/\u00A7c/g, '');

  ClaimManager.save();
}

function checkAndApplyMinorPenalty(killerData, player) {
  if (!killerData.outlawStatus)
    killerData.outlawStatus = { stage: 0, timeRemaining: 0 };

  if (killerData.outlawStatus.stage === 0) {
    killerData.outlawStatus.stage = 1;
    killerData.outlawStatus.timeRemaining = 30;
    player.sendMessage(
      '§cYou are at 1 star for 30 minutes for killing a mount',
    );
    player.nameTag = '\u00A7c' + player.name.replace(/\u00A7c/g, '');
    ClaimManager.save();
  }
}