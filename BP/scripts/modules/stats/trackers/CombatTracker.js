/**
 * Combat tracker - tracks all combat-related statistics
 *
 * Handles:
 * - Mob kills (with per-type breakdown)
 * - Player kills (pvp)
 * - Damage dealt/taken (with breakdown by type)
 * - Player deaths (with cause tracking)
 */

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
    /** @type {PlayerTracker|null} */
    this.playerTracker = null
  }

  /**
   * Set reference to playertracker for death callbacks
   * @param {PlayerTracker} tracker
   */
  setPlayerTracker(tracker) {
    this.playerTracker = tracker
  }

  registerEvents() {
    // Entity death (for kill tracking)
    world.afterEvents.entityDie.subscribe((event) => {
      this.onEntityDeath(event)
    })

    // Entity hurt (for damage tracking)
    world.afterEvents.entityHurt.subscribe((event) => {
      this.onEntityHurt(event)
    })

    // Projectile hit entity (for shield deflection tracking)
    world.afterEvents.projectileHitEntity.subscribe((event) => {
      this.onProjectileHitEntity(event)
    })
  }

  /**
   * Handle entity death event
   * @param {EntityDieAfterEvent} event
   */
  onEntityDeath(event) {
    const deadEntity = event.deadEntity
    const damageSource = event.damageSource

    // Check if a player died
    if (deadEntity.typeId === 'minecraft:player') {
      this.onPlayerDeath(deadEntity, damageSource)

      // Credit the killer if it was a player (pvp kill)
      const killer = damageSource?.damagingEntity
      if (killer?.typeId === 'minecraft:player' && killer !== deadEntity) {
        this.onPlayerKill(killer, deadEntity)
      }
      return
    }

    // Check if a player killed something
    const killer = damageSource?.damagingEntity
    if (killer?.typeId === 'minecraft:player') {
      this.onPlayerKill(killer, deadEntity)
    }
  }

  /**
   * Handle player killing an entity
   * @param {Player} player - The player who killed
   * @param {Entity} victim - The entity that died
   */
  onPlayerKill(player, victim) {
    const victimType = cleanTypeId(victim.typeId)

    // Check if it is a player kill (pvp)
    if (victim.typeId === 'minecraft:player') {
      this.increment(player, COMBAT, 'kills.players.total', 1)
      const victimName = victim.name || 'Unknown'
      this.increment(player, COMBAT, `kills.players.byPlayer.${victimName}`, 1)
      return
    }

    // Mob kill
    this.increment(player, COMBAT, 'kills.mobs.total', 1)
    this.increment(player, COMBAT, `kills.mobs.byType.${victimType}`, 1)
  }

  /**
   * Handle player death
   * @param {Player} player - The player who died
   * @param {EntityDamageSource} damageSource - How they died
   */
  onPlayerDeath(player, damageSource) {
    // Increment total deaths
    this.increment(player, COMBAT, 'deaths.total', 1)
    this.increment(player, CORE, 'deaths.total', 1)

    // Determine death cause
    const cause = this.getDeathCause(damageSource)
    this.increment(player, COMBAT, `deaths.causes.${cause}`, 1)

    // Track last death info
    this.set(player, CORE, 'deaths.lastCause', cause)
    this.set(player, CORE, 'deaths.lastTime', Date.now())

    // Check if killed by mob or player
    const killer = damageSource?.damagingEntity
    if (killer) {
      if (killer.typeId === 'minecraft:player') {
        this.increment(player, COMBAT, 'deaths.byPlayer', 1)
      } else {
        this.increment(player, COMBAT, 'deaths.byMob', 1)
      }
    }

    // Notify playertracker
    if (this.playerTracker) {
      this.playerTracker.onPlayerDeath(player)
    }
  }

  /**
   * Get a readable death cause from damage source
   * @param {EntityDamageSource} damageSource
   * @returns {string}
   */
  getDeathCause(damageSource) {
    if (!damageSource) return 'unknown'

    const cause = damageSource.cause

    // Check for specific entity damage
    const damager = damageSource.damagingEntity
    if (damager) {
      if (damager.typeId === 'minecraft:player') {
        return 'player'
      }
      return cleanTypeId(damager.typeId)
    }

    // Map cause to readable name
    return DEATH_CAUSE_MAP[cause] ? cleanTypeId(cause) : (cause || 'unknown')
  }

  /**
   * Handle entity hurt event
   * @param {EntityHurtAfterEvent} event
   */
  onEntityHurt(event) {
    const hurtEntity = event.hurtEntity
    const damageSource = event.damageSource
    const damage = event.damage

    // Convert to tenths of a heart (like java edition)
    const damageAmount = Math.round(damage * 10)

    // Track damage taken if a player was hurt
    if (hurtEntity.typeId === 'minecraft:player') {
      this.onPlayerTakeDamage(hurtEntity, damageSource, damageAmount)
    }

    // Track damage dealt if a player dealt damage
    const damager = damageSource?.damagingEntity
    if (damager?.typeId === 'minecraft:player') {
      this.onPlayerDealDamage(damager, hurtEntity, damageAmount)
    }
  }

  /**
   * Handle player taking damage
   * @param {Player} player - The player who was hurt
   * @param {EntityDamageSource} source - Source of damage
   * @param {number} amount - Damage in tenths of hearts
   */
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
      // Environmental damage
      this.increment(player, COMBAT, 'damage.taken.environmental', amount)
    }
  }

  /**
   * Handle projectile hitting an entity (for shield deflection tracking)
   * When a projectile hits a player who is blocking with a shield,
   * the projectilehitentity event fires but entityhurt does not fire
   * This allows us to detect successful shield blocks against projectiles
   * @param {ProjectileHitEntityAfterEvent} event
   */
  onProjectileHitEntity(event) {
    try {
      const hitInfo = event.getEntityHit()
      if (!hitInfo) return

      const hitEntity = hitInfo.entity
      if (hitEntity?.typeId !== 'minecraft:player') return

      const player = hitEntity

      // Check if player has a shield equipped using equippable component
      const equippable = player.getComponent('minecraft:equippable')
      if (!equippable) return

      const mainhand = equippable.getEquipment(EquipmentSlot.Mainhand)
      const offhand = equippable.getEquipment(EquipmentSlot.Offhand)

      const hasShield = mainhand?.typeId === 'minecraft:shield' ||
                       offhand?.typeId === 'minecraft:shield'

      // Player must have shield and be sneaking to block (bedrock edition)
      if (hasShield && player.isSneaking) {
        this.increment(player, COMBAT, 'damage.blocked.projectiles', 1)
      }
    } catch {
      // Projectile hit api may fail
    }
  }

  /**
   * Handle player dealing damage
   * @param {Player} player - The player who dealt damage
   * @param {Entity} target - Entity that was hurt
   * @param {number} amount - Damage in tenths of hearts
   */
  onPlayerDealDamage(player, target, amount) {
    this.increment(player, COMBAT, 'damage.dealt.total', amount)

    if (target.typeId === 'minecraft:player') {
      this.increment(player, COMBAT, 'damage.dealt.toPlayers', amount)
    } else {
      this.increment(player, COMBAT, 'damage.dealt.toMobs', amount)
    }
  }
}