import { system, world, Difficulty } from '@minecraft/server';

system.runInterval(() => {
  const dimensions = ['overworld', 'nether', 'the_end'];
  for (const dimId of dimensions) {
    const dimension = world.getDimension(dimId);
    const skeletons = dimension.getEntities({ families: ['skeleton'] });

    for (const entity of skeletons) {
      if (!entity.isValid) continue;

      const strafeDirection = entity.getDynamicProperty('32k:strafe_direction');
      if (strafeDirection !== undefined) {
        const strafeTime = entity.getDynamicProperty('32k:strafe_time');
        if (typeof strafeTime === 'number' && strafeTime >= 0) {
          entity.setDynamicProperty('32k:strafe_time', strafeTime - 1);
          if (strafeTime - 1 < 0) {
            entity.isSneaking = false;
            entity.setDynamicProperty('32k:strafe_direction', undefined);
          }
        }

        const ridingComp = entity.getComponent('minecraft:riding');
        const controller = ridingComp?.entityRidingOn ?? entity;
        if (!controller.isValid) continue;

        const typeFamily = controller.getComponent('minecraft:type_family');
        if (controller.isOnGround && !typeFamily?.hasTypeFamily('inanimate')) {
          let distancing = 1;
          const attackRange = entity.getDynamicProperty('32k:ranged_attack_radius') ?? 15;
          const viewEntities = entity.getEntitiesFromViewDirection({
            excludeTypes: ['minecraft:arrow'],
            maxDistance: attackRange
          });

          for (const entry of viewEntities) {
            if (entry.entity.id !== entity.id && entry.entity.id !== controller.id && entry.distance < attackRange * 0.5) {
              distancing = -1;
              break;
            }
          }

          const currentStrafeDir = entity.getDynamicProperty('32k:strafe_direction') ?? 0;
          const strafeDirRadians = (controller.getRotation().y + currentStrafeDir * (90 - distancing * 45) + 90) * (Math.PI / 180);
          const movementComp = controller.getComponent('minecraft:movement');
          let moveSpeed = (movementComp?.currentValue ?? 0.25) * (controller.id !== entity.id ? 0.3 : 0.15);

          try {
            const blockBelow = world.getDimension(entity.dimension.id).getBlockBelow(controller.location, {
              includeLiquidBlocks: false,
              includePassableBlocks: false
            });
            if (blockBelow) {
              const stepped = blockBelow.typeId;
              if (
                stepped === 'minecraft:ice' ||
                stepped === 'minecraft:packed_ice' ||
                stepped === 'minecraft:blue_ice' ||
                stepped === 'minecraft:frosted_ice' ||
                stepped === 'minecraft:brittle_ice'
              ) {
                moveSpeed = moveSpeed * 0.3;
              }
            }
          } catch (e) {}

          try {
            controller.applyImpulse({
              x: Math.cos(strafeDirRadians) * moveSpeed,
              y: 0,
              z: Math.sin(strafeDirRadians) * moveSpeed
            });
          } catch (e) {}
        }
      }
    }
  }
}, 1);

world.afterEvents.entitySpawn.subscribe((entityEvent) => {
  if (!entityEvent?.entity?.isValid) return;
  const shot = entityEvent.entity;
  if (shot.typeId !== 'minecraft:arrow') return;

  const projectileComp = shot.getComponent('minecraft:projectile');
  const shooter = projectileComp?.owner;
  if (!shooter?.isValid) return;

  const typeFamily = shooter.getComponent('minecraft:type_family');
  if (typeFamily?.hasTypeFamily('skeleton') && !shooter.isSneaking) {
    if (shooter.typeId === 'minecraft:wither_skeleton') {
      try {
        shot.setOnFire(1000);
      } catch (e) {}
    }

    let ogVelocity = shot.getVelocity();
    if (ogVelocity.x === 0 && ogVelocity.y === 0 && ogVelocity.z === 0) {
      ogVelocity = shooter.getViewDirection();
    }

    try {
      shot.tryTeleport({
        x: shooter.getHeadLocation().x + ogVelocity.x,
        y: shooter.getHeadLocation().y + ogVelocity.y,
        z: shooter.getHeadLocation().z + ogVelocity.z
      });
      shot.applyImpulse(ogVelocity);
    } catch (e) {}

    shooter.isSneaking = true;
    try {
      shooter.runCommand('/playanimation @s animation.humanoid.base_pose none 0 "!query.is_sneaking" controller.animation.humanoid.sneaking');
    } catch (e) {}

    let delay = 0;
    const attackRange = shooter.getDynamicProperty('32k:ranged_attack_radius') ?? 15;
    const ridingComp = shooter.getComponent('minecraft:riding');
    const controller = ridingComp?.entityRidingOn ?? shooter;

    try {
      const viewEntities = shooter.getEntitiesFromViewDirection({ excludeTypes: ['minecraft:arrow'] });
      for (const entry of viewEntities) {
        if (entry.entity.id !== shot.id && entry.entity.id !== controller.id && entry.entity.id !== shooter.id) {
          delay = Math.min(entry.distance, attackRange);
          break;
        }
      }
    } catch (e) {}

    let attackIntervalMin = 3;
    let attackIntervalMax = 3;
    if (shooter.typeId === 'minecraft:bogged' || shooter.typeId === 'minecraft:parched') {
      attackIntervalMin += 0.5;
      attackIntervalMax += 0.5;
    }

    const diff = world.getDifficulty();
    if (diff === Difficulty.Hard) {
      attackIntervalMin -= 1;
      attackIntervalMax -= 1;
      if (controller.id !== shooter.id) {
        try {
          shooter.triggerEvent('minecraft:switch_to_hard_ranged');
        } catch (e) {}
      }
    } else if (controller.id !== shooter.id) {
      try {
        shooter.triggerEvent('minecraft:switch_to_normal_ranged');
      } catch (e) {}
    }

    attackIntervalMin = (shooter.getDynamicProperty('32k:ranged_attack_interval_min') ?? attackIntervalMin) * 20;
    attackIntervalMax = (shooter.getDynamicProperty('32k:ranged_attack_interval_max') ?? attackIntervalMax) * 20;

    delay = attackIntervalMin !== attackIntervalMax
      ? Math.floor(attackIntervalMin + (delay / attackRange) * (attackIntervalMax - attackIntervalMin))
      : attackIntervalMax;

    system.runTimeout(() => {
      if (shooter?.isValid) {
        const health = shooter.getComponent('minecraft:health');
        if (health && health.currentValue > 0) {
          shooter.isSneaking = false;
        }
      }
    }, Math.max(5, delay - 25));

    shooter.setDynamicProperty('32k:strafe_time', delay);
    if (shooter.getDynamicProperty('32k:strafe_direction') === undefined) {
      shooter.setDynamicProperty('32k:strafe_direction', (Math.random() * 100 > 50) ? 1 : -1);
    } else if (Math.random() * 100 < 30) {
      const current = shooter.getDynamicProperty('32k:strafe_direction') ?? 1;
      shooter.setDynamicProperty('32k:strafe_direction', current * -1);
    }
  } else if (typeFamily?.hasTypeFamily('skeleton')) {
    try {
      shot.remove();
    } catch (e) {}
    shooter.isSneaking = false;
  }
});