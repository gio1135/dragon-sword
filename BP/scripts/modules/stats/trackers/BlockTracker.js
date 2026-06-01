/**
 * Block tracker - tracks block mining and placement statistics
 *
 * Handles:
 * - Blocks broken (with per-type breakdown)
 * - Blocks placed (with per-type breakdown)
 */

import { world } from '@minecraft/server'
import { BaseTracker } from './BaseTracker.js'
import {
  STORAGE_KEYS,
  cleanTypeId
} from '../core/constants.js'

const BLOCKS = STORAGE_KEYS.BLOCKS

export class BlockTracker extends BaseTracker {
  constructor() {
    super()
    /** @type {InteractionTracker|null} */
    this.interactionTracker = null
  }

  /**
   * Set reference to interactiontracker for item used tracking
   * @param {InteractionTracker} tracker
   */
  setInteractionTracker(tracker) {
    this.interactionTracker = tracker
  }

  registerEvents() {
    // Block break
    world.afterEvents.playerBreakBlock.subscribe((event) => {
      this.onBlockBreak(event)
    })

    // Block place
    world.afterEvents.playerPlaceBlock.subscribe((event) => {
      this.onBlockPlace(event)
    })
  }

  /**
   * Handle block break event
   * @param {PlayerBreakBlockAfterEvent} event
   */
  onBlockBreak(event) {
    const player = event.player
    const blockType = cleanTypeId(event.brokenBlockPermutation.type.id)

    // Increment block break stats
    this.increment(player, BLOCKS, 'mined.total', 1)
    this.increment(player, BLOCKS, `mined.byType.${blockType}`, 1)

    // Track tool usage (java edition counts tool use when breaking blocks)
    // This includes when tools would normally consume durability
    const toolUsed = event.itemStackBeforeBreak
    if (toolUsed && this.interactionTracker && this.isToolForItemUsed(toolUsed.typeId)) {
      this.interactionTracker.trackItemUsed(player, toolUsed.typeId)
    }
  }

  /**
   * Handle block place event
   * @param {PlayerPlaceBlockAfterEvent} event
   */
  onBlockPlace(event) {
    const player = event.player
    const blockType = cleanTypeId(event.block.typeId)

    // Increment block place stats
    this.increment(player, BLOCKS, 'placed.total', 1)
    this.increment(player, BLOCKS, `placed.byType.${blockType}`, 1)
  }

  /**
   * Check if an item type should count as tool usage for item_used stat
   * @param {string} typeId
   * @returns {boolean}
   */
  isToolForItemUsed(typeId) {
    // Tools that count for item_used when breaking blocks:
    // shovel, pickaxe, axe, flint and steel, shears, hoe, sword
    return typeId.includes('_shovel') ||
           typeId.includes('_pickaxe') ||
           typeId.includes('_axe') ||
           typeId.includes('_hoe') ||
           typeId.includes('_sword') ||
           typeId === 'minecraft:shears' ||
           typeId === 'minecraft:flint_and_steel'
  }
}