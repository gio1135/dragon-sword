/**
 * Base tracker - abstract base class for all stat trackers
 *
 * Provides common functionality for trackers:
 * - Access to statsmanager singleton
 * - Convenience methods for stat operations
 * - Standard initialization pattern
 */

import { getStatsManager } from '../core/StatsManager.js'

/**
 * Abstract base class for statistic trackers
 * Each tracker handles a specific domain of statistics
 */
export class BaseTracker {
  constructor() {
    /** @type {boolean} */
    this.initialized = false
  }

  /**
   * Get the statsmanager singleton
   * @returns {import('../core/StatsManager.js').StatsManager}
   */
  get stats() {
    return getStatsManager()
  }

  /**
   * Initialize the tracker - override in subclasses
   * Should register all event listeners
   */
  initialize() {
    if (this.initialized) return
    this.registerEvents()
    this.initialized = true
  }

  /**
   * Register event listeners - override in subclasses
   */
  registerEvents() {
    // Override in subclasses
  }

  /**
   * Increment a stat value
   * @param {Player} player - The player
   * @param {string} storageKey - Storage key (e.g., 'ds:stats_combat')
   * @param {string} path - Dot notation path
   * @param {number} amount - Amount to increment
   * @returns {number} New value
   */
  increment(player, storageKey, path, amount = 1) {
    return this.stats.increment(player, storageKey, path, amount)
  }

  /**
   * Set a stat value
   * @param {Player} player - The player
   * @param {string} storageKey - Storage key
   * @param {string} path - Dot notation path
   * @param {*} value - Value to set
   */
  set(player, storageKey, path, value) {
    this.stats.set(player, storageKey, path, value)
  }

  /**
   * Get a stat value
   * @param {Player} player - The player
   * @param {string} storageKey - Storage key
   * @param {string} path - Dot notation path
   * @returns {*}
   */
  get(player, storageKey, path) {
    return this.stats.get(player, storageKey, path)
  }

  /**
   * Update a stat to the maximum of current and new value
   * @param {Player} player - The player
   * @param {string} storageKey - Storage key
   * @param {string} path - Dot notation path
   * @param {number} value - Value to compare
   * @returns {number}
   */
  max(player, storageKey, path, value) {
    return this.stats.max(player, storageKey, path, value)
  }

  /**
   * Update a stat to the minimum of current and new value
   * @param {Player} player - The player
   * @param {string} storageKey - Storage key
   * @param {string} path - Dot notation path
   * @param {number} value - Value to compare
   * @returns {number}
   */
  min(player, storageKey, path, value) {
    return this.stats.min(player, storageKey, path, value)
  }

  /**
   * Add an item to a set (array without duplicates)
   * @param {Player} player - The player
   * @param {string} storageKey - Storage key
   * @param {string} path - Dot notation path
   * @param {*} item - Item to add
   * @returns {boolean} True if item was added
   */
  addToSet(player, storageKey, path, item) {
    return this.stats.addToSet(player, storageKey, path, item)
  }
}