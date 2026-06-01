import { system, world, ItemStack, EnchantmentTypes } from "@minecraft/server"

// Configuration for loot drops
const RARE_PER_PLAYER_POOL = [
  { type: "minecraft:enchanted_golden_apple" },
  { type: "minecraft:totem_of_undying" },
  { type: "minecraft:turtle_helmet", ench: "aqua_affinity", level: 1 },
  { type: "minecraft:diamond_boots", ench: "depth_strider", level: 3 },
  { type: "minecraft:diamond_boots", ench: "frost_walker", level: 2 },
  { type: "minecraft:enchanted_book", ench: "impaling", level: 5 },
  { type: "minecraft:enchanted_book", ench: "loyalty", level: 3 },
  { type: "minecraft:fishing_rod", ench: "luck_of_the_sea", level: 3 },
  { type: "minecraft:fishing_rod", ench: "lure", level: 3 },
  { type: "minecraft:diamond_helmet", ench: "respiration", level: 3 },
  { type: "minecraft:enchanted_book", ench: "riptide", level: 3 }
]

const GUARANTEED_MOB_DROPS = [
  { type: "minecraft:trident" }
]

const involvedMap = new Map()

system.runInterval(() => {
  const currentTick = system.currentTick
  if (currentTick % 20 !== 0) return
  
  let pendingStr = world.getDynamicProperty("ds:pending_boss_respawns")
  if (pendingStr) {
    try {
      let pending = JSON.parse(pendingStr)
      let updated = []
      let changed = false
      
      for (const p of pending) {
        if (currentTick >= p.respawn_tick) {
          const dim = world.getDimension(p.dimension)
          if (dim) {
            const loc = { x: p.x, y: p.y, z: p.z }
            const existing = dim.getEntities({ type: "minecraft:elder_guardian", location: loc, maxDistance: 48 })
            if (existing.length === 0) {
              dim.spawnEntity("minecraft:elder_guardian", loc)
            }
          }
          changed = true
        } else {
          updated.push(p)
        }
      }
      
      if (changed) {
        world.setDynamicProperty("ds:pending_boss_respawns", JSON.stringify(updated))
      }
    } catch (e) { }
  }
}, 1)

system.runInterval(() => {
  const dimensions = ["overworld", "nether", "the_end"]
  for (const dimId of dimensions) {
    const dimension = world.getDimension(dimId)
    const entities = dimension.getEntities({ type: "minecraft:elder_guardian" })
    for (const entity of entities) {
      if (!entity || !entity.isValid) continue

      if (entity.getDynamicProperty("ds:spawn_loc") === undefined) {
        entity.setDynamicProperty("ds:spawn_loc", JSON.stringify({
          x: entity.location.x,
          y: entity.location.y,
          z: entity.location.z
        }))
      }

      const healthComp = entity.getComponent("minecraft:health")
      if (!healthComp) continue

      const currentHealth = Math.floor(healthComp.currentValue)
      const maxHealth = Math.floor(healthComp.upperBound)
      if (maxHealth === 0) continue
      
      const tenPercent = Math.floor(maxHealth / 10)
      
      let nextThreshold = entity.getDynamicProperty("ds:next_blast_threshold")
      if (nextThreshold === undefined) {
        nextThreshold = maxHealth - tenPercent
        try {
          entity.setDynamicProperty("ds:next_blast_threshold", Number(nextThreshold))
        } catch (e) {}
      }
      
      if (currentHealth <= nextThreshold && nextThreshold > 0) {
        entity.setDynamicProperty("ds:is_blast_ready", true)
        try {
          entity.setDynamicProperty("ds:next_blast_threshold", Number(nextThreshold - tenPercent))
        } catch (e) {}
      }

      if (entity.getDynamicProperty("ds:is_blast_ready")) {
        let charge = entity.getDynamicProperty("ds:blast_charge") ?? 0
        if (charge === 0) {
          dimension.playSound("random.fuse", entity.location, { volume: 1.0, pitch: 0.5 })
          entity.triggerEvent("ds:start_charging")
        }
        
        charge += 1
        entity.setDynamicProperty("ds:blast_charge", charge)
        
        if (charge % 5 === 0) {
          for (let i = 0; i < 5; i++) {
            dimension.spawnParticle("minecraft:sonic_explosion", {
              x: entity.location.x + (Math.random() - 0.5) * 4,
              y: entity.location.y + (Math.random() - 0.5) * 4,
              z: entity.location.z + (Math.random() - 0.5) * 4
            })
          }
          dimension.spawnParticle("minecraft:cauldron_spell_emitter", entity.location)
        }
        
        try { entity.clearVelocity() } catch(e) {}

        if (charge >= 60) {
          const playersInRange = dimension.getEntities({
            location: entity.location,
            maxDistance: 12,
            families: ["player"]
          })
          for (const p of playersInRange) {
            p.applyDamage(40, { cause: "entityExplosion", damagingEntity: entity })
            const direction = {
              x: p.location.x - entity.location.x,
              z: p.location.z - entity.location.z
            }
            const length = Math.sqrt(direction.x * direction.x + direction.z * direction.z)
            if (length > 0) {
              p.applyImpulse({
                x: (direction.x / length) * 4,
                y: 1.2,
                z: (direction.z / length) * 4
              })
            }
          }
          dimension.playSound("random.explode", entity.location, { volume: 2.0, pitch: 0.8 })
          dimension.spawnParticle("minecraft:huge_explosion_emitter", entity.location)
          
          entity.setDynamicProperty("ds:is_blast_ready", false)
          entity.setDynamicProperty("ds:blast_charge", 0)
          entity.triggerEvent("ds:stop_charging")
        }
      }
    }
  }
  
  if (system.currentTick % 100 === 0) {
    for (const dimId of ["overworld", "nether", "the_end"]) {
      const dimension = world.getDimension(dimId)
      const guardians = dimension.getEntities({ type: "minecraft:elder_guardian" })
      if (guardians.length > 1) {
        for (let i = 0; i < guardians.length; i++) {
          for (let j = i + 1; j < guardians.length; j++) {
            const g1 = guardians[i]
            const g2 = guardians[j]
            if (g1 && g1.isValid && g2 && g2.isValid) {
              const dx = g1.location.x - g2.location.x
              const dy = g1.location.y - g2.location.y
              const dz = g1.location.z - g2.location.z
              const distSq = dx * dx + dy * dy + dz * dz
              if (distSq < 4096) {
                g2.remove()
              }
            }
          }
        }
      }
    }
  }
}, 1)

function handleElderGuardianDeath(entity, damageSource) {
  let involved = involvedMap.get(entity.id) ?? []
  
  const lastHitter = damageSource?.damagingEntity
  if (lastHitter?.typeId === "minecraft:player" && !involved.includes(lastHitter.id)) {
    involved.push(lastHitter.id)
  }
  
  if (involved.length === 0) {
    const nearest = entity.dimension.getEntities({ location: entity.location, maxDistance: 48, families: ["player"] })
    for (const p of nearest) {
      involved.push(p.id)
    }
  }

  for (const drop of GUARANTEED_MOB_DROPS) {
    try {
      const itemStack = new ItemStack(drop.type, 1)
      entity.dimension.spawnItem(itemStack, entity.location)
    } catch (e) {}
  }

  for (const pId of involved) {
    const player = world.getEntity(pId)
    if (!player || player.typeId !== "minecraft:player") continue

    if (Math.random() < 0.3) {
      const reward = RARE_PER_PLAYER_POOL[Math.floor(Math.random() * RARE_PER_PLAYER_POOL.length)]
      try {
        const itemStack = new ItemStack(reward.type, 1)
        
        const durability = itemStack.getComponent("minecraft:durability")
        if (durability) {
          durability.damage = Math.floor(durability.maxDurability * (0.5 + Math.random() * 0.4))
        }

        if (reward.ench) {
          const enchs = itemStack.getComponent("minecraft:enchantable")
          if (enchs) {
            const type = EnchantmentTypes.get(reward.ench)
            if (type) enchs.addEnchantment({ type, level: reward.level })
          }
        }
        
        const inventory = player.getComponent("minecraft:inventory")
        if (inventory && inventory.container && inventory.container.emptySlotsCount > 0) {
          inventory.container.addItem(itemStack)
        } else {
          entity.dimension.spawnItem(itemStack, player.location)
        }
      } catch (e) {}
    }
  }
  
  involvedMap.delete(entity.id)

  let spawnLocStr = entity.getDynamicProperty("ds:spawn_loc")
  if (spawnLocStr) {
    const spawnLoc = JSON.parse(spawnLocStr)
    let pendingStr = world.getDynamicProperty("ds:pending_boss_respawns")
    let pending = pendingStr ? JSON.parse(pendingStr) : []
    
    pending.push({
      dimension: entity.dimension.id,
      x: spawnLoc.x,
      y: spawnLoc.y,
      z: spawnLoc.z,
      respawn_tick: system.currentTick + 24000
    })
    
    world.setDynamicProperty("ds:pending_boss_respawns", JSON.stringify(pending))
  }
}

world.afterEvents.entityHurt.subscribe((ev) => {
  const entity = ev.hurtEntity
  if (entity.typeId === "minecraft:elder_guardian") {
    const attacker = ev.damageSource.damagingEntity
    if (attacker?.typeId === "minecraft:player") {
      let involved = involvedMap.get(entity.id) ?? []
      if (!involved.includes(attacker.id)) {
        involved.push(attacker.id)
        involvedMap.set(entity.id, involved)
      }
      
      const health = entity.getComponent("minecraft:health")
      if (health && health.currentValue <= 0) {
        handleElderGuardianDeath(entity, ev.damageSource)
      }
    }
  }
})

world.afterEvents.entityDie.subscribe((ev) => {
  if (ev.deadEntity.typeId === "minecraft:elder_guardian") {
    handleElderGuardianDeath(ev.deadEntity, ev.damageSource)
  }
})