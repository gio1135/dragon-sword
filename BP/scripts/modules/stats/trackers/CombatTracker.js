
import { world, EquipmentSlot } from '@minecraft/server'
import { BaseTracker } from './BaseTracker.js'
import {
STORAGE_KEYS,
DEATH_CAUSE_MAP,
cleanTypeId
} from '../core/constants.js'

const COMBAT = STORAGE_KEYS.COMBAT
const CORE = STORAGE_KEYS.CORE

export class CombatTracker extends BaseTracker {
constructor() {
 super()

 this.playerTracker = null
}

setPlayerTracker(tracker) {
 this.playerTracker = tracker
}

registerEvents() {
 world.afterEvents.entityDie.subscribe((event) => {
 this.onEntityDeath(event)
 })

 world.afterEvents.entityHurt.subscribe((event) => {
 this.onEntityHurt(event)
 })

 world.afterEvents.projectileHitEntity.subscribe((event) => {
 this.onProjectileHitEntity(event)
 })
}

onEntityDeath(event) {
 const deadEntity = event.deadEntity
 const damageSource = event.damageSource

 if (deadEntity.typeId === 'minecraft:player') {
 this.onPlayerDeath(deadEntity, damageSource)

 const killer = damageSource?.damagingEntity
 if (killer?.typeId === 'minecraft:player' && killer !== deadEntity) {
  this.onPlayerKill(killer, deadEntity)
 }
 return
 }

 const killer = damageSource?.damagingEntity
 if (killer?.typeId === 'minecraft:player') {
 this.onPlayerKill(killer, deadEntity)
 }
}

onPlayerKill(player, victim) {
 const victimType = cleanTypeId(victim.typeId)

 if (victim.typeId === 'minecraft:player') {
 this.increment(player, COMBAT, 'kills.players.total', 1)
 const victimName = victim.name || 'Unknown'
 this.increment(player, COMBAT, `kills.players.byPlayer.${victimName}`, 1)
 return
 }

 this.increment(player, COMBAT, 'kills.mobs.total', 1)
 this.increment(player, COMBAT, `kills.mobs.byType.${victimType}`, 1)
}

onPlayerDeath(player, damageSource) {
 this.increment(player, COMBAT, 'deaths.total', 1)
 this.increment(player, CORE, 'deaths.total', 1)

 const cause = this.getDeathCause(damageSource)
 this.increment(player, COMBAT, `deaths.causes.${cause}`, 1)

 this.set(player, CORE, 'deaths.lastCause', cause)
 this.set(player, CORE, 'deaths.lastTime', Date.now())

 const killer = damageSource?.damagingEntity
 if (killer) {
 if (killer.typeId === 'minecraft:player') {
  this.increment(player, COMBAT, 'deaths.byPlayer', 1)
 } else {
  this.increment(player, COMBAT, 'deaths.byMob', 1)
 }
 }

 if (this.playerTracker) {
 this.playerTracker.onPlayerDeath(player)
 }
}

getDeathCause(damageSource) {
 if (!damageSource) return 'unknown'

 const cause = damageSource.cause

 const damager = damageSource.damagingEntity
 if (damager) {
 if (damager.typeId === 'minecraft:player') {
  return 'player'
 }
 return cleanTypeId(damager.typeId)
 }

 return DEATH_CAUSE_MAP[cause] ? cleanTypeId(cause) : (cause || 'unknown')
}

onEntityHurt(event) {
 const hurtEntity = event.hurtEntity
 const damageSource = event.damageSource
 const damage = event.damage

 const damageAmount = Math.round(damage * 10)

 if (hurtEntity.typeId === 'minecraft:player') {
 this.onPlayerTakeDamage(hurtEntity, damageSource, damageAmount)
 }

 const damager = damageSource?.damagingEntity
 if (damager?.typeId === 'minecraft:player') {
 this.onPlayerDealDamage(damager, hurtEntity, damageAmount)
 }
}

onPlayerTakeDamage(player, source, amount) {
 this.increment(player, COMBAT, 'damage.taken.total', amount)

 const damager = source?.damagingEntity
 if (damager) {
 if (damager.typeId === 'minecraft:player') {
  this.increment(player, COMBAT, 'damage.taken.fromPlayers', amount)
 } else {
  this.increment(player, COMBAT, 'damage.taken.fromMobs', amount)
 }
 } else {
 this.increment(player, COMBAT, 'damage.taken.environmental', amount)
 }
}

onProjectileHitEntity(event) {
 try {
 const hitInfo = event.getEntityHit()
 if (!hitInfo) return

 const hitEntity = hitInfo.entity
 if (hitEntity?.typeId !== 'minecraft:player') return

 const player = hitEntity

 const equippable = player.getComponent('minecraft:equippable')
 if (!equippable) return

 const mainhand = equippable.getEquipment(EquipmentSlot.Mainhand)
 const offhand = equippable.getEquipment(EquipmentSlot.Offhand)

 const hasShield = mainhand?.typeId === 'minecraft:shield' ||
     offhand?.typeId === 'minecraft:shield'

 if (hasShield && player.isSneaking) {
  this.increment(player, COMBAT, 'damage.blocked.projectiles', 1)
 }
 } catch {
 }
}

onPlayerDealDamage(player, target, amount) {
 this.increment(player, COMBAT, 'damage.dealt.total', amount)

 if (target.typeId === 'minecraft:player') {
 this.increment(player, COMBAT, 'damage.dealt.toPlayers', amount)
 } else {
 this.increment(player, COMBAT, 'damage.dealt.toMobs', amount)
 }
}
}