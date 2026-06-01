/**
 * Misc tracker - tracks miscellaneous statistics
 *
 * Handles:
 * - Chat messages
 * - Emotes
 * - Status effects
 * - Item pickups and drops (via script api events)
 * - Fishing
 */

import { world, system } from '@minecraft/server'
import { BaseTracker } from './BaseTracker.js'
import { STORAGE_KEYS, cleanTypeId } from '../core/constants.js'

const MISC = STORAGE_KEYS.MISC
const COMBAT = STORAGE_KEYS.COMBAT

/** Items that can appear as fishing loot */
const FISHING_LOOT = new Set([
  // Fish (treasure of the sea)
  'minecraft:cod', 'minecraft:salmon', 'minecraft:pufferfish', 'minecraft:tropical_fish',
  // Treasure
  'minecraft:bow', 'minecraft:enchanted_book', 'minecraft:fishing_rod',
  'minecraft:name_tag', 'minecraft:nautilus_shell', 'minecraft:saddle',
  // Junk
  'minecraft:leather_boots', 'minecraft:stick', 'minecraft:string',
  'minecraft:bowl', 'minecraft:tripwire_hook', 'minecraft:rotten_flesh',
  'minecraft:bone', 'minecraft:ink_sac', 'minecraft:water_bottle'
])

export class MiscTracker extends BaseTracker {
  constructor() {
    super()
    /** @type {InteractionTracker|null} */
    this.interactionTracker = null
    /** @type {Map<string, {location: Vector3, playerId: string}>} - fishing hook entity id → hook info */
    this.activeHooks = new Map()
  }

  /**
   * Set reference to interactiontracker for item tracking
   * @param {InteractionTracker} tracker
   */
  setInteractionTracker(tracker) {
    this.interactionTracker = tracker
  }

  registerEvents() {
    // Player emote
    try {
      world.afterEvents.playerEmote.subscribe((event) => {
        this.onPlayerEmote(event)
      })
    } catch {
      // Emote event may not be available
    }

    // Effect added
    world.afterEvents.effectAdd.subscribe((event) => {
      this.onEffectAdded(event)
    })

    // Entity spawn (for thrown projectiles only)
    world.afterEvents.entitySpawn.subscribe((event) => {
      this.onEntitySpawn(event)
    })

    // Item pickup event
    try {
      world.afterEvents.entityItemPickup.subscribe((event) => {
        this.onEntityItemPickup(event)
      })
    } catch {
      // Entityitempickup event may not be available on older versions
    }

    // Item drop event
    try {
      world.afterEvents.entityItemDrop.subscribe((event) => {
        this.onEntityItemDrop(event)
      })
    } catch {
      // Entityitemdrop event may not be available on older versions
    }

    // Target block hit event
    try {
      world.afterEvents.targetBlockHit.subscribe((event) => {
        this.onTargetBlockHit(event)
      })
    } catch {
      // Target block event may not be available
    }

    // Data-driven entity trigger (for raid detection)
    try {
      world.afterEvents.dataDrivenEntityTrigger.subscribe((event) => {
        this.onDataDrivenEntityTrigger(event)
      })
    } catch {
      // Data-driven entity trigger may not be available
    }
  }

  /**
   * Handle player emote
   * @param {PlayerEmoteAfterEvent} event
   */
  onPlayerEmote(event) {
    const player = event.player
    this.increment(player, MISC, 'emotes.total', 1)
  }

  /**
   * Handle chat message
   * @param {ChatSendBeforeEvent} event
   */
  onChatMessage(event) {
    try {
      const player = event.sender
      const message = event.message

      // Do not track if no message or it is a command
      if (!message || message.startsWith('/')) return

      this.increment(player, MISC, 'chat.messages', 1)
      this.increment(player, MISC, 'chat.characters', message.length)

      // Update longest message
      this.max(player, MISC, 'chat.longest', message.length)

      // Calculate running average
      const totalMessages = this.get(player, MISC, 'chat.messages') || 1
      const totalChars = this.get(player, MISC, 'chat.characters') || 0
      const average = Math.round(totalChars / totalMessages)
      this.set(player, MISC, 'chat.average', average)
    } catch {
      // Chat event properties may vary
    }
  }

  /**
   * Handle effect added to player
   * @param {EffectAddAfterEvent} event
   */
  onEffectAdded(event) {
    const entity = event.entity
    if (entity.typeId !== 'minecraft:player') return

    const effect = event.effect
    const effectType = cleanTypeId(effect.typeId)

    this.increment(entity, MISC, 'effects.total', 1)
    this.increment(entity, MISC, `effects.byType.${effectType}`, 1)

    // Track unique effects
    this.addToSet(entity, MISC, 'effects.unique', effectType)

    // Detect raid victory via hero of the village effect
    if (effect.typeId === 'minecraft:village_hero' && effect.duration > 46800) {
      this.increment(entity, MISC, 'raids.won', 1)
    }
  }

  /**
   * Handle entity spawn (for thrown projectiles and fishing detection)
   * @param {EntitySpawnAfterEvent} event
   */
  onEntitySpawn(event) {
    const entity = event.entity

    // Track thrown projectiles
    if (this.isThrowableProjectile(entity.typeId)) {
      this.trackThrownProjectile(entity)
      return
    }

    // Track fishing hook spawns - link hook to its owner
    if (entity.typeId === 'minecraft:fishing_hook') {
      this.onFishingHookSpawn(entity)
      return
    }

    // Check if a spawned item entity is fishing loot near a hook
    if (entity.typeId === 'minecraft:item') {
      this.checkFishingCatch(entity)
    }
  }

  /**
   * Handle item pickup event
   * @param {EntityItemPickupAfterEvent} event
   */
  onEntityItemPickup(event) {
    try {
      const entity = event.entity
      if (entity.typeId !== 'minecraft:player') return
      if (!this.interactionTracker) return

      const items = Array.from(event.items)
      for (const itemStack of items) {
        if (itemStack?.typeId) {
          this.interactionTracker.trackItemPickedUp(entity, itemStack.typeId, itemStack.amount || 1)
        }
      }
    } catch {
      // Silently ignore errors
    }
  }

  /**
   * Handle item drop event
   * @param {EntityItemDropAfterEvent} event
   */
  onEntityItemDrop(event) {
    try {
      const entity = event.entity
      if (entity.typeId !== 'minecraft:player') return
      if (!this.interactionTracker) return

      const items = Array.from(event.items)
      for (const itemEntity of items) {
        const itemComponent = itemEntity?.getComponent?.('minecraft:item')
        if (itemComponent) {
          const itemStack = itemComponent.itemStack
          this.interactionTracker.trackItemDropped(entity, itemStack.typeId, itemStack.amount || 1)
        }
      }
    } catch {
      // Silently ignore errors
    }
  }

  /**
   * Check if entity is a throwable projectile we should track
   * @param {string} typeId
   * @returns {boolean}
   */
  isThrowableProjectile(typeId) {
    return typeId === 'minecraft:ender_pearl' ||
           typeId === 'minecraft:eye_of_ender_signal' ||
           typeId === 'minecraft:snowball' ||
           typeId === 'minecraft:egg' ||
           typeId === 'minecraft:splash_potion' ||
           typeId === 'minecraft:lingering_potion' ||
           typeId === 'minecraft:xp_bottle'
  }

  /**
   * Track a thrown projectile as item used
   * @param {Entity} entity
   */
  trackThrownProjectile(entity) {
    try {
      // Get the owner of the projectile
      const projectileComponent = entity.getComponent('minecraft:projectile')
      if (!projectileComponent) return

      const owner = projectileComponent.owner
      if (!owner || owner.typeId !== 'minecraft:player') return

      // Map projectile entity to item type
      const itemType = this.getItemTypeFromProjectile(entity.typeId)
      if (!itemType || !this.interactionTracker) return

      this.interactionTracker.trackItemUsed(owner, itemType)
    } catch {
      // Projectile component may not be available
    }
  }

  /**
   * Map projectile entity type to corresponding item type
   * @param {string} projectileType
   * @returns {string|null}
   */
  getItemTypeFromProjectile(projectileType) {
    switch (projectileType) {
      case 'minecraft:ender_pearl': return 'minecraft:ender_pearl'
      case 'minecraft:eye_of_ender_signal': return 'minecraft:ender_eye'
      case 'minecraft:snowball': return 'minecraft:snowball'
      case 'minecraft:egg': return 'minecraft:egg'
      case 'minecraft:splash_potion': return 'minecraft:splash_potion'
      case 'minecraft:lingering_potion': return 'minecraft:lingering_potion'
      case 'minecraft:xp_bottle': return 'minecraft:experience_bottle'
      default: return null
    }
  }

  /**
   * Handle target block hit event
   * @param {TargetBlockHitAfterEvent} event
   */
  onTargetBlockHit(event) {
    try {
      const source = event.source
      const redstonePower = event.redstonePower

      // Helper to track hit for a player
      const trackHit = (player) => {
        this.increment(player, MISC, 'targetBlock.hit', 1)
        // Bullseye = dead center = redstone power 15
        if (redstonePower === 15) {
          this.increment(player, MISC, 'targetBlock.bullseye', 1)
        }
      }

      // Check if source is directly a player
      if (source?.typeId === 'minecraft:player') {
        trackHit(source)
        return
      }

      // If source is a projectile (arrow, trident, etc.), get the owner
      const projectileComponent = source?.getComponent('minecraft:projectile')
      if (projectileComponent) {
        const owner = projectileComponent.owner
        if (owner?.typeId === 'minecraft:player') {
          trackHit(owner)
        }
      }
    } catch {
      // Target block hit api may fail
    }
  }

  /**
   * Handle data-driven entity trigger events (for raid detection)
   * @param {DataDrivenEntityTriggerAfterEvent} event
   */
  onDataDrivenEntityTrigger(event) {
    const entity = event.entity
    const eventId = event.eventId

    // Only track player-related triggers
    if (entity.typeId !== 'minecraft:player') return

    // Track raid triggered
    if (eventId === 'minecraft:remove_raid_trigger') {
      this.increment(entity, MISC, 'raids.triggered', 1)
    }
  }

  /**
   * Track a fishing hook spawn and link it to its owner player
   * @param {Entity} hookEntity
   */
  onFishingHookSpawn(hookEntity) {
    try {
      // Bedrock does not set projectile.owner for fishing hooks,
      // so find the nearest player holding a fishing rod
      const players = hookEntity.dimension.getPlayers({ location: hookEntity.location, maxDistance: 16 })
      let fisher = null
      let closestDist = Infinity

      for (const player of players) {
        const inv = player.getComponent('minecraft:inventory')
        const heldItem = inv?.container?.getItem(player.selectedSlotIndex)
        if (heldItem?.typeId === 'minecraft:fishing_rod') {
          const dx = player.location.x - hookEntity.location.x
          const dy = player.location.y - hookEntity.location.y
          const dz = player.location.z - hookEntity.location.z
          const dist = dx * dx + dy * dy + dz * dz
          if (dist < closestDist) {
            closestDist = dist
            fisher = player
          }
        }
      }

      if (!fisher) return

      const hookId = hookEntity.id
      const hookData = {
        location: hookEntity.location,
        playerId: fisher.id,
        intervalId: null,
        timeoutId: null
      }

      // Continuously update hook location until it despawns
      hookData.intervalId = system.runInterval(() => {
        try {
          const hook = world.getEntity(hookId)
          if (!hook) {
            // Hook removed (reeled in) — keep last known location briefly for catch check
            system.clearRun(hookData.intervalId)
            system.runTimeout(() => {
              this.activeHooks.delete(hookId)
            }, 10)
            return
          }
          hookData.location = hook.location
        } catch {
          system.clearRun(hookData.intervalId)
          this.activeHooks.delete(hookId)
        }
      }, 5)

      // Clean up after 60 seconds as fallback
      hookData.timeoutId = system.runTimeout(() => {
        system.clearRun(hookData.intervalId)
        this.activeHooks.delete(hookId)
      }, 1200)

      this.activeHooks.set(hookId, hookData)
    } catch {
      // Hook detection failed
    }
  }

  /**
   * Check if a spawned item entity is a fishing catch (near an active hook)
   * uses the hook entity's current location (where it landed in water)
   * @param {Entity} itemEntity
   */
  checkFishingCatch(itemEntity) {
    try {
      const itemComponent = itemEntity.getComponent('minecraft:item')
      if (!itemComponent) return
      const itemStack = itemComponent.itemStack
      if (!itemStack || !FISHING_LOOT.has(itemStack.typeId)) return

      // Check proximity to any active fishing hook's last known location
      for (const [hookId, hookInfo] of this.activeHooks) {
        const hookLoc = hookInfo.location
        const dx = itemEntity.location.x - hookLoc.x
        const dy = itemEntity.location.y - hookLoc.y
        const dz = itemEntity.location.z - hookLoc.z
        const distSq = dx * dx + dy * dy + dz * dz

        if (distSq <= 4) { // Within 2 blocks
          const player = world.getEntity(hookInfo.playerId)
          if (player) {
            this.increment(player, MISC, 'fishing.caught', 1)
          }
          // Clean up this hook's interval/timeout
          if (hookInfo.intervalId) system.clearRun(hookInfo.intervalId)
          if (hookInfo.timeoutId) system.clearRun(hookInfo.timeoutId)
          this.activeHooks.delete(hookId)
          return
        }
      }
    } catch {
      // Item entity may not have expected components
    }
  }

  /**
   * Clean up when player leaves
   * @param {string} playerId
   */
  onPlayerLeave(playerId) {
    // Clean up any hooks owned by this player
    for (const [hookId, hookInfo] of this.activeHooks) {
      if (hookInfo.playerId === playerId) {
        if (hookInfo.intervalId) system.clearRun(hookInfo.intervalId)
        if (hookInfo.timeoutId) system.clearRun(hookInfo.timeoutId)
        this.activeHooks.delete(hookId)
      }
    }
  }
}