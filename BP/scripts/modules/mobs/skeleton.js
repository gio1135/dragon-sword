import { system, world } from "@minecraft/server"

system.runInterval(() => {
  const dimensions = ["overworld", "nether", "the_end"]
  for (const dimId of dimensions) {
    const dimension = world.getDimension(dimId)
    for (const entity of dimension.getEntities({ families: ["skeleton"] })) {
      const strafeDir = entity.getDynamicProperty("ds:strafe_direction")
      if (strafeDir !== undefined) {
        const strafeTime = entity.getDynamicProperty("ds:strafe_time")
        if (strafeTime >= 0) {
          entity.setDynamicProperty("ds:strafe_time", strafeTime - 5)
          if (strafeTime < 0) {
            entity.isSneaking = false
            entity.setDynamicProperty("ds:strafe_direction", undefined)
          }
        }

        const controller = entity.getComponent("minecraft:riding")?.entityRidingOn ?? entity
        if (controller.isOnGround) {
          let distancing = 1
          const attackRange = 15
          try {
            const entitiesInView = entity.getEntitiesFromViewDirection({ excludeTypes: ["minecraft:arrow"], maxDistance: attackRange })
            for (const hit of entitiesInView) {
              if (hit.entity.id !== entity.id && hit.entity.id !== controller.id && hit.distance < attackRange * 0.5) {
                distancing = -1
                break
              }
            }
          } catch (e) {}

          const rotation = controller.getRotation().y
          const strafeDirRadians = (rotation + strafeDir * (90 - distancing * 45) + 90) * (Math.PI / 180)
          const moveComponent = controller.getComponent("minecraft:movement")
          const moveSpeed = (moveComponent?.currentValue ?? 0.25) * (controller.id !== entity.id ? 0.3 : 0.2) * 2.5
          
          controller.applyImpulse({
            x: Math.cos(strafeDirRadians) * moveSpeed,
            y: 0,
            z: Math.sin(strafeDirRadians) * moveSpeed
          })
        }
      }
    }
  }
}, 5)

world.afterEvents.entitySpawn.subscribe((ev) => {
  const entity = ev.entity
  if (entity?.typeId === "minecraft:arrow") {
    const projectile = entity.getComponent("minecraft:projectile")
    const shooter = projectile?.owner
    if (shooter?.getComponent("minecraft:type_family")?.hasTypeFamily("skeleton")) {
      if (!shooter.isSneaking) {
        if (shooter.typeId === "minecraft:wither_skeleton") {
          entity.setOnFire(100)
        }
        
        let velocity = entity.getVelocity()
        if (velocity.x === 0 && velocity.y === 0 && velocity.z === 0) {
          velocity = shooter.getViewDirection()
        }
        const headLoc = shooter.getHeadLocation()
        entity.tryTeleport({
          x: headLoc.x + velocity.x,
          y: headLoc.y + velocity.y,
          z: headLoc.z + velocity.z
        })
        entity.applyImpulse(velocity)
        
        shooter.isSneaking = true
        try { shooter.runCommandAsync("playanimation @s animation.humanoid.base_pose none 0 \"!query.is_sneaking\" controller.animation.humanoid.sneaking") } catch(e) {}
        
        let delay = 0
        const attackRange = 15
        try {
          const entitiesInView = shooter.getEntitiesFromViewDirection({ excludeTypes: ["minecraft:arrow"] })
          for (const hit of entitiesInView) {
            if (hit.entity.id !== entity.id && hit.entity.id !== (shooter.getComponent("minecraft:riding")?.entityRidingOn ?? shooter).id && hit.entity.id !== shooter.id) {
              delay = Math.min(hit.distance, attackRange)
            }
          }
        } catch (e) {}
        
        let attackIntervalMin = 40
        let attackIntervalMax = 40
        if (shooter.typeId === "minecraft:bogged" || shooter.typeId === "ds:parched" || shooter.typeId === "minecraft:parched") {
          attackIntervalMin = 70
          attackIntervalMax = 70
        } else if (shooter.typeId === "minecraft:stray") {
          attackIntervalMin = 60
          attackIntervalMax = 60
        }

        const interval = attackIntervalMin !== attackIntervalMax 
          ? Math.floor(attackIntervalMin + (delay / attackRange) * (attackIntervalMax - attackIntervalMin)) 
          : attackIntervalMax

        system.runTimeout(() => {
          if (shooter.isValid) {
            shooter.isSneaking = false
          }
        }, Math.max(5, interval - 5))

        shooter.setDynamicProperty("ds:strafe_time", interval)
        if (shooter.getDynamicProperty("ds:strafe_direction") === undefined) {
          shooter.setDynamicProperty("ds:strafe_direction", Math.random() > 0.5 ? 1 : -1)
        } else if (Math.random() < 0.3) {
          const current = shooter.getDynamicProperty("ds:strafe_direction")
          shooter.setDynamicProperty("ds:strafe_direction", current * -1)
        }
      } else {
        entity.remove()
        shooter.isSneaking = false
      }
    }
  }
})