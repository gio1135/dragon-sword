/**
 * Interaction tracker - tracks block and entity interactions
 *
 * Handles:
 * - Functional block interactions (chests, furnaces, etc.)
 * - Entity interactions (villagers, animals)
 * - Item usage (food, consumables)
 * - Item drops and pickups
 * - Crafting detection (via inventory monitoring after crafting block interaction)
 */

import { world, system, EntityInitializationCause } from '@minecraft/server'
import { BaseTracker } from './BaseTracker.js'
import {
  STORAGE_KEYS,
  BLOCK_INTERACTION_MAP,
  cleanTypeId,
  isFood
} from '../core/constants.js'

// Leather armor items for cauldron cleaning detection
const LEATHER_ARMOR = new Set([
  'minecraft:leather_helmet',
  'minecraft:leather_chestplate',
  'minecraft:leather_leggings',
  'minecraft:leather_boots',
  'minecraft:leather_horse_armor'
])

// Banner items for cauldron cleaning detection
const BANNERS = new Set([
  'minecraft:banner',
  'minecraft:white_banner', 'minecraft:orange_banner', 'minecraft:magenta_banner',
  'minecraft:light_blue_banner', 'minecraft:yellow_banner', 'minecraft:lime_banner',
  'minecraft:pink_banner', 'minecraft:gray_banner', 'minecraft:light_gray_banner',
  'minecraft:cyan_banner', 'minecraft:purple_banner', 'minecraft:blue_banner',
  'minecraft:brown_banner', 'minecraft:green_banner', 'minecraft:red_banner',
  'minecraft:black_banner'
])

// Shulker box items for cauldron cleaning detection
const SHULKER_BOXES = new Set([
  'minecraft:shulker_box',
  'minecraft:white_shulker_box', 'minecraft:orange_shulker_box', 'minecraft:magenta_shulker_box',
  'minecraft:light_blue_shulker_box', 'minecraft:yellow_shulker_box', 'minecraft:lime_shulker_box',
  'minecraft:pink_shulker_box', 'minecraft:gray_shulker_box', 'minecraft:light_gray_shulker_box',
  'minecraft:cyan_shulker_box', 'minecraft:purple_shulker_box', 'minecraft:blue_shulker_box',
  'minecraft:brown_shulker_box', 'minecraft:green_shulker_box', 'minecraft:red_shulker_box',
  'minecraft:black_shulker_box', 'minecraft:undyed_shulker_box'
])

// Music disc items
const MUSIC_DISCS = new Set([
  // Classic discs
  'minecraft:music_disc_13', 'minecraft:music_disc_cat', 'minecraft:music_disc_blocks',
  'minecraft:music_disc_chirp', 'minecraft:music_disc_far', 'minecraft:music_disc_mall',
  'minecraft:music_disc_mellohi', 'minecraft:music_disc_stal', 'minecraft:music_disc_strad',
  'minecraft:music_disc_ward', 'minecraft:music_disc_11', 'minecraft:music_disc_wait',
  // Newer discs
  'minecraft:music_disc_otherside', 'minecraft:music_disc_5', 'minecraft:music_disc_pigstep',
  'minecraft:music_disc_relic', 'minecraft:music_disc_creator', 'minecraft:music_disc_creator_music_box',
  'minecraft:music_disc_precipice',
  // 1.21+ discs
  'minecraft:music_disc_lava_chicken',
  'minecraft:music_disc_tears'
])

// Plantable items for flower pot detection
const PLANTABLE_ITEMS = new Set([
  'minecraft:oak_sapling', 'minecraft:spruce_sapling', 'minecraft:birch_sapling',
  'minecraft:jungle_sapling', 'minecraft:acacia_sapling', 'minecraft:dark_oak_sapling',
  'minecraft:cherry_sapling', 'minecraft:mangrove_propagule',
  'minecraft:red_mushroom', 'minecraft:brown_mushroom',
  'minecraft:crimson_fungus', 'minecraft:warped_fungus',
  'minecraft:cactus', 'minecraft:bamboo', 'minecraft:dead_bush',
  'minecraft:dandelion', 'minecraft:poppy', 'minecraft:blue_orchid',
  'minecraft:allium', 'minecraft:azure_bluet', 'minecraft:red_tulip',
  'minecraft:orange_tulip', 'minecraft:white_tulip', 'minecraft:pink_tulip',
  'minecraft:oxeye_daisy', 'minecraft:cornflower', 'minecraft:lily_of_the_valley',
  'minecraft:wither_rose', 'minecraft:torchflower', 'minecraft:fern',
  'minecraft:azalea', 'minecraft:flowering_azalea'
])

const INTERACTIONS = STORAGE_KEYS.INTERACTIONS
const ITEMS = STORAGE_KEYS.ITEMS

export class InteractionTracker extends BaseTracker {
  constructor() {
    super()
    /**
     * Track recent block placements to avoid counting placement as interaction
     * @type {Map<string, number>}
     */
    this.recentPlacements = new Map()
  }

  registerEvents() {
    // Block placement (to track and exclude from interactions)
    world.afterEvents.playerPlaceBlock.subscribe((event) => {
      const key = `${event.player.id}:${event.block.typeId}`
      this.recentPlacements.set(key, Date.now())
    })

    // Block interactions
    world.afterEvents.playerInteractWithBlock.subscribe((event) => {
      this.onBlockInteraction(event)
    })

    // Entity interactions
    world.afterEvents.playerInteractWithEntity.subscribe((event) => {
      this.onEntityInteraction(event)
    })

    // Item complete use (for food/potions - only track when consumption completes)
    world.afterEvents.itemCompleteUse.subscribe((event) => {
      this.onItemCompleteUse(event)
    })

    // Item release use (for charged items like bows, tridents, crossbows)
    world.afterEvents.itemReleaseUse.subscribe((event) => {
      this.onItemReleaseUse(event)
    })

    // Item start use (for fishing rod, carrot on stick, warped fungus on stick)
    if (world.afterEvents.itemStartUse) {
      world.afterEvents.itemStartUse.subscribe((event) => {
        this.onItemStartUse(event)
      })
    }

    // Animal breeding via entity spawn
    world.afterEvents.entitySpawn.subscribe((event) => {
      this.onEntitySpawn(event)
    })

    // Clean up old placement tracking
    world.afterEvents.playerLeave.subscribe((event) => {
      // clear entries for this player
      for (const key of this.recentPlacements.keys()) {
        if (key.startsWith(event.playerId)) {
          this.recentPlacements.delete(key)
        }
      }
    })
  }

  /**
   * Handle block interaction
   * @param {PlayerInteractWithBlockAfterEvent} event
   */
  onBlockInteraction(event) {
    const player = event.player
    const blockType = event.block.typeId

    // Check if this block was just placed (within last 500ms) - skip if so
    const placementKey = `${player.id}:${blockType}`
    const placementTime = this.recentPlacements.get(placementKey)
    if (placementTime && Date.now() - placementTime < 500) {
      this.recentPlacements.delete(placementKey)
      return
    }

    // Check if it is a tracked functional block
    const interactionPath = BLOCK_INTERACTION_MAP[blockType]
    if (interactionPath) {
      this.increment(player, INTERACTIONS, interactionPath, 1)
    }

    // Special handling for cauldron interactions
    if (blockType.includes('cauldron')) {
      this.handleCauldronInteraction(player, blockType, event.itemStack)
    }

    // Special handling for jukebox (music disc playing)
    if (blockType === 'minecraft:jukebox' && event.itemStack) {
      if (MUSIC_DISCS.has(event.itemStack.typeId)) {
        this.increment(player, INTERACTIONS, 'musicDisc.played', 1)
      }
    }

    // Special handling for flower pot (planting)
    // Check if interacting with an empty flower pot while holding a plantable item
    if (blockType === 'minecraft:flower_pot' && event.itemStack) {
      const itemType = event.itemStack.typeId
      if (PLANTABLE_ITEMS.has(itemType)) {
        this.increment(player, INTERACTIONS, 'flowerPot.planted', 1)
      }
    }

    // Track item usage for items used on blocks (replaces deprecated itemuseon event)
    this.trackItemUsedOnBlock(player, event.itemStack)
  }

  /**
   * Track item usage when an item is used on a block
   * This handles bone meal, flint and steel, buckets, spawn eggs, etc.
   * @param {Player} player
   * @param {ItemStack|undefined} itemStack
   */
  trackItemUsedOnBlock(player, itemStack) {
    if (!itemStack) return

    const itemType = itemStack.typeId

    // Track bone meal usage (grows plants)
    if (itemType === 'minecraft:bone_meal') {
      const cleanItem = cleanTypeId(itemType)
      this.increment(player, ITEMS, 'used.total', 1)
      this.increment(player, ITEMS, `used.byType.${cleanItem}`, 1)
      return
    }

    // Track flint and steel usage (lights fires, activates portals)
    if (itemType === 'minecraft:flint_and_steel') {
      const cleanItem = cleanTypeId(itemType)
      this.increment(player, ITEMS, 'used.total', 1)
      this.increment(player, ITEMS, `used.byType.${cleanItem}`, 1)
      return
    }

    // Track bucket usage (filling/emptying)
    // Water bucket, lava bucket, powder snow bucket, empty bucket
    if (itemType.includes('bucket')) {
      const cleanItem = cleanTypeId(itemType)
      this.increment(player, ITEMS, 'used.total', 1)
      this.increment(player, ITEMS, `used.byType.${cleanItem}`, 1)
      return
    }

    // Track spawn egg usage
    if (itemType.includes('spawn_egg')) {
      const cleanItem = cleanTypeId(itemType)
      this.increment(player, ITEMS, 'used.total', 1)
      this.increment(player, ITEMS, `used.byType.${cleanItem}`, 1)
      return
    }

    // Track cocoa pod planting (cocoa beans on jungle log)
    if (itemType === 'minecraft:cocoa_beans') {
      const cleanItem = cleanTypeId(itemType)
      this.increment(player, ITEMS, 'used.total', 1)
      this.increment(player, ITEMS, `used.byType.${cleanItem}`, 1)
      return
    }
  }

  /**
   * Handle cauldron interactions for detailed tracking
   * @param {Player} player
   * @param {string} blockType
   * @param {ItemStack|undefined} itemStack
   */
  handleCauldronInteraction(player, blockType, itemStack) {
    if (!itemStack) return

    const itemType = itemStack.typeId

    // Water bucket filling cauldron
    if (itemType === 'minecraft:water_bucket') {
      this.increment(player, INTERACTIONS, 'cauldron.filled', 1)
      return
    }

    // Glass bottle taking water from cauldron
    // Note: the event fires after the interaction, so a water_cauldron becomes cauldron after taking water
    // We check if player used a bottle on any cauldron type (the result is what we see)
    if (itemType === 'minecraft:glass_bottle') {
      // If the cauldron is now empty or partially filled, player took water
      // We cannot perfectly detect this, so we count bottle + cauldron interaction
      this.increment(player, INTERACTIONS, 'cauldron.bottleFilled', 1)
      return
    }

    // Leather armor cleaning
    if (LEATHER_ARMOR.has(itemType)) {
      this.increment(player, INTERACTIONS, 'cauldron.armorCleaned', 1)
      return
    }

    // Banner cleaning
    if (BANNERS.has(itemType)) {
      this.increment(player, INTERACTIONS, 'cauldron.bannerCleaned', 1)
      return
    }

    // Shulker box cleaning
    if (SHULKER_BOXES.has(itemType)) {
      this.increment(player, INTERACTIONS, 'cauldron.shulkerCleaned', 1)
      return
    }
  }

  /**
   * Handle entity interaction
   * @param {PlayerInteractWithEntityAfterEvent} event
   */
  onEntityInteraction(event) {
    const player = event.player
    const entity = event.target
    const entityType = entity.typeId

    // Villager interaction (bedrock uses villager_v2)
    if (entityType === 'minecraft:villager_v2' || entityType === 'minecraft:wandering_trader') {
      this.increment(player, INTERACTIONS, 'villager.talked', 1)
    }

    // Note: animal breeding is now tracked via entityspawn with born cause
  }

  /**
   * Handle entity spawn for breeding detection
   * @param {EntitySpawnAfterEvent} event
   */
  onEntitySpawn(event) {
    const entity = event.entity
    const cause = event.cause

    // Only track entities that were born (bred)
    if (cause !== EntityInitializationCause.Born) {
      return
    }

    // Exclude slimes and magma cubes (they split with born cause)
    if (entity.typeId === 'minecraft:slime' || entity.typeId === 'minecraft:magma_cube') {
      return
    }

    // Verify entity is valid
    if (!entity.isValid) {
      return
    }

    // Verify it is a baby (has ageable component with negative age)
    try {
      const ageableComponent = entity.getComponent('minecraft:ageable')
      if (ageableComponent && ageableComponent.age >= 0) {
        return // Not a baby
      }
    } catch {
      // Component may not exist for all entities
    }

    // Find nearest player who likely bred the animals
    const nearbyPlayers = entity.dimension.getPlayers({
      location: entity.location,
      maxDistance: 10
    })

    if (nearbyPlayers.length > 0) {
      // Credit the closest player
      let closestPlayer = nearbyPlayers[0]
      let closestDistance = Infinity

      for (const player of nearbyPlayers) {
        const dx = player.location.x - entity.location.x
        const dy = player.location.y - entity.location.y
        const dz = player.location.z - entity.location.z
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)

        if (distance < closestDistance) {
          closestDistance = distance
          closestPlayer = player
        }
      }

      this.increment(closestPlayer, INTERACTIONS, 'animals.bred', 1)
    }
  }

  /**
   * Handle item complete use (food/potions finished consuming)
   * @param {ItemCompleteUseAfterEvent} event
   */
  onItemCompleteUse(event) {
    const player = event.source
    const itemType = event.itemStack?.typeId

    if (!itemType) return

    const cleanItem = cleanTypeId(itemType)

    // Track item usage for consumables
    this.increment(player, ITEMS, 'used.total', 1)
    this.increment(player, ITEMS, `used.byType.${cleanItem}`, 1)

    // Track food consumption specifically
    if (isFood(itemType)) {
      this.increment(player, ITEMS, 'food.total', 1)
      this.increment(player, ITEMS, `food.byType.${cleanItem}`, 1)
    }
  }

  /**
   * Handle item release use (for charged items like bows, tridents, crossbows)
   * @param {ItemReleaseUseAfterEvent} event
   */
  onItemReleaseUse(event) {
    const player = event.source
    const itemType = event.itemStack?.typeId

    if (!itemType) return

    const cleanItem = cleanTypeId(itemType)

    // Track item usage for released items
    this.increment(player, ITEMS, 'used.total', 1)
    this.increment(player, ITEMS, `used.byType.${cleanItem}`, 1)
  }

  /**
   * Handle item start use (for fishing rod, carrot on stick, warped fungus on stick, armor)
   * These items count as "used" when the use key is pressed
   * @param {ItemStartUseAfterEvent} event
   */
  onItemStartUse(event) {
    const player = event.source
    const itemType = event.itemStack?.typeId

    if (!itemType) return

    // Track specific items that count on use-key press
    // Fishing rod, carrot on a stick, warped fungus on a stick
    if (itemType === 'minecraft:fishing_rod' ||
        itemType === 'minecraft:carrot_on_a_stick' ||
        itemType === 'minecraft:warped_fungus_on_a_stick') {
      const cleanItem = cleanTypeId(itemType)
      this.increment(player, ITEMS, 'used.total', 1)
      this.increment(player, ITEMS, `used.byType.${cleanItem}`, 1)
      return
    }

    // Track armor equipping via right-click
    // Java edition counts armor as "used" when equipped directly with use key
    if (this.isArmorItem(itemType)) {
      const cleanItem = cleanTypeId(itemType)
      this.increment(player, ITEMS, 'used.total', 1)
      this.increment(player, ITEMS, `used.byType.${cleanItem}`, 1)
      return
    }

    // Track elytra equipping
    if (itemType === 'minecraft:elytra') {
      const cleanItem = cleanTypeId(itemType)
      this.increment(player, ITEMS, 'used.total', 1)
      this.increment(player, ITEMS, `used.byType.${cleanItem}`, 1)
    }
  }

  /**
   * Check if an item is armor (helmet, chestplate, leggings, boots)
   * @param {string} typeId
   * @returns {boolean}
   */
  isArmorItem(typeId) {
    return typeId.includes('_helmet') ||
           typeId.includes('_chestplate') ||
           typeId.includes('_leggings') ||
           typeId.includes('_boots') ||
           typeId === 'minecraft:turtle_helmet'
  }

  /**
   * Track item dropped (called from misctracker)
   * @param {Player} player
   * @param {string} itemType
   * @param {number} amount
   */
  trackItemDropped(player, itemType, amount = 1) {
    const cleanItem = cleanTypeId(itemType)
    this.increment(player, ITEMS, 'dropped.total', amount)
    this.increment(player, ITEMS, `dropped.byType.${cleanItem}`, amount)
  }

  /**
   * Track item picked up (called from misctracker)
   * @param {Player} player
   * @param {string} itemType
   * @param {number} amount
   */
  trackItemPickedUp(player, itemType, amount = 1) {
    const cleanItem = cleanTypeId(itemType)
    this.increment(player, ITEMS, 'picked.total', amount)
    this.increment(player, ITEMS, `picked.byType.${cleanItem}`, amount)
  }

  /**
   * Track item used (called from misctracker for thrown projectiles)
   * @param {Player} player
   * @param {string} itemType
   */
  trackItemUsed(player, itemType) {
    const cleanItem = cleanTypeId(itemType)
    this.increment(player, ITEMS, 'used.total', 1)
    this.increment(player, ITEMS, `used.byType.${cleanItem}`, 1)
  }
}