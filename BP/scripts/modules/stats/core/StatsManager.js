/**
 * Stats manager - central singleton for all statistics operations
 *
 * Provides a unified interface for:
 * - Reading/writing statistics (via cache)
 * - Automatic periodic flushing to storage
 * - Player session management (join/leave)
 * - Stat reset functionality
 */

import { world, system } from '@minecraft/server'
import { StatsCache } from './StatsCache.js'
import { StorageAdapter, STORAGE_KEYS } from './StorageAdapter.js'
import { WorldStorageAdapter } from './WorldStorageAdapter.js'
import { UPDATE_INTERVALS } from './constants.js'

/**
 * Singleton instance
 * @type {StatsManager|null}
 */
let instance = null

/**
 * Central manager for all player statistics
 */
export class StatsManager {
  constructor() {
    if (instance) {
      return instance
    }

    /** @type {StatsCache} */
    this.cache = new StatsCache()

    /** @type {boolean} */
    this.initialized = false

    /** @type {number|null} */
    this.flushIntervalId = null

    /** @type {number|null} */
    this.worldSyncIntervalId = null

    instance = this
  }

  /**
   * Get the singleton instance
   * @returns {StatsManager}
   */
  static getInstance() {
    if (!instance) {
      instance = new StatsManager()
    }
    return instance
  }

  /**
   * Initialize the stats manager
   * Sets up flush interval and event listeners
   */
  initialize() {
    if (this.initialized) return

    // Start periodic flush
    this.flushIntervalId = system.runInterval(() => {
      this.flushAllDirty()
    }, UPDATE_INTERVALS.FLUSH)

    // Start periodic world sync (every 30 seconds)
    this.worldSyncIntervalId = system.runInterval(() => {
      this.syncToWorldStorage()
    }, 600)

    // Load stats for players already online (in case of reload)
    // Defer this to next tick since world.getAllPlayers() cannot be used during early execution
    system.run(() => {
      for (const player of world.getAllPlayers()) {
        this.loadPlayerStats(player)
      }
    })

    this.initialized = true
  }

  /**
   * Shutdown the stats manager
   * Flushes all data and clears intervals
   */
  shutdown() {
    if (this.flushIntervalId !== null) {
      system.clearRun(this.flushIntervalId)
      this.flushIntervalId = null
    }

    if (this.worldSyncIntervalId !== null) {
      system.clearRun(this.worldSyncIntervalId)
      this.worldSyncIntervalId = null
    }

    // Final flush and world sync
    this.flushAllDirty()
    this.syncToWorldStorage()
    this.cache.clear()
    this.initialized = false
  }

  /**
   * Load all statistics for a player into cache
   * @param {Player} player - The player entity
   */
  loadPlayerStats(player) {
    const playerCache = this.cache.getPlayerCache(player)

    for (const key of STORAGE_KEYS) {
      if (!playerCache.isLoaded(key)) {
        const data = StorageAdapter.load(player, key)
        playerCache.setLoaded(key, data)
      }
    }
  }

  /**
   * Handle player joining - load their stats
   * @param {Player} player - The player entity
   */
  onPlayerJoin(player) {
    this.loadPlayerStats(player)

    // Update session info
    const now = Date.now()
    this.set(player, 'ds:stats_core', 'time.sessionStart', now)
    this.increment(player, 'ds:stats_core', 'sessions.total', 1)

    // Set first joined if not set
    const firstJoined = this.get(player, 'ds:stats_core', 'time.firstJoined')
    if (!firstJoined) {
      this.set(player, 'ds:stats_core', 'time.firstJoined', now)
    }

    // Register player in world registry
    try {
      WorldStorageAdapter.upsertPlayer(player)
    } catch (error) {
      console.warn(`[StatsManager] failed to register player in world registry: ${error.message}`)
    }
  }

  /**
   * Handle player leaving - flush their stats and remove from cache
   * @param {Player} player - The player entity
   */
  onPlayerLeave(player) {
    // Save world-level snapshot before flushing (data is still in cache)
    try {
      const stats = this.getAllStats(player)
      WorldStorageAdapter.savePlayerSnapshot(player.id, player.name, stats)
      WorldStorageAdapter.upsertPlayer(player)
    } catch (error) {
      console.warn(`[StatsManager] failed to save world snapshot on leave: ${error.message}`)
    }

    // Final flush for this player
    this.flushPlayer(player)

    // Remove from cache
    this.cache.removePlayer(player)
  }

  /**
   * Get a statistic value
   * @param {Player} player - The player entity
   * @param {string} storageKey - Storage key (e.g., 'ds:stats_core')
   * @param {string} path - Dot notation path (e.g., 'time.played')
   * @returns {*} The value or undefined
   */
  get(player, storageKey, path) {
    const playerCache = this.cache.getPlayerCache(player)

    // Ensure data is loaded
    if (!playerCache.isLoaded(storageKey)) {
      const data = StorageAdapter.load(player, storageKey)
      playerCache.setLoaded(storageKey, data)
    }

    return playerCache.get(storageKey, path)
  }

  /**
   * Set a statistic value
   * @param {Player} player - The player entity
   * @param {string} storageKey - Storage key
   * @param {string} path - Dot notation path
   * @param {*} value - Value to set
   */
  set(player, storageKey, path, value) {
    const playerCache = this.cache.getPlayerCache(player)

    // Ensure data is loaded
    if (!playerCache.isLoaded(storageKey)) {
      const data = StorageAdapter.load(player, storageKey)
      playerCache.setLoaded(storageKey, data)
    }

    playerCache.set(storageKey, path, value)
  }

  /**
   * Increment a numeric statistic
   * @param {Player} player - The player entity
   * @param {string} storageKey - Storage key
   * @param {string} path - Dot notation path
   * @param {number} amount - Amount to add (default 1)
   * @returns {number} New value
   */
  increment(player, storageKey, path, amount = 1) {
    const playerCache = this.cache.getPlayerCache(player)

    // Ensure data is loaded
    if (!playerCache.isLoaded(storageKey)) {
      const data = StorageAdapter.load(player, storageKey)
      playerCache.setLoaded(storageKey, data)
    }

    return playerCache.increment(storageKey, path, amount)
  }

  /**
   * Update a stat to the maximum of current and new value
   * @param {Player} player - The player entity
   * @param {string} storageKey - Storage key
   * @param {string} path - Dot notation path
   * @param {number} value - Value to compare
   * @returns {number} The maximum value
   */
  max(player, storageKey, path, value) {
    const playerCache = this.cache.getPlayerCache(player)

    // Ensure data is loaded
    if (!playerCache.isLoaded(storageKey)) {
      const data = StorageAdapter.load(player, storageKey)
      playerCache.setLoaded(storageKey, data)
    }

    return playerCache.max(storageKey, path, value)
  }

  /**
   * Update a stat to the minimum of current and new value
   * @param {Player} player - The player entity
   * @param {string} storageKey - Storage key
   * @param {string} path - Dot notation path
   * @param {number} value - Value to compare
   * @returns {number} The minimum value
   */
  min(player, storageKey, path, value) {
    const playerCache = this.cache.getPlayerCache(player)

    // Ensure data is loaded
    if (!playerCache.isLoaded(storageKey)) {
      const data = StorageAdapter.load(player, storageKey)
      playerCache.setLoaded(storageKey, data)
    }

    return playerCache.min(storageKey, path, value)
  }

  /**
   * Add an item to an array if not present
   * @param {Player} player - The player entity
   * @param {string} storageKey - Storage key
   * @param {string} path - Dot notation path
   * @param {*} item - Item to add
   * @returns {boolean} True if added
   */
  addToSet(player, storageKey, path, item) {
    const playerCache = this.cache.getPlayerCache(player)

    // Ensure data is loaded
    if (!playerCache.isLoaded(storageKey)) {
      const data = StorageAdapter.load(player, storageKey)
      playerCache.setLoaded(storageKey, data)
    }

    return playerCache.addToSet(storageKey, path, item)
  }

  /**
   * Get all statistics for a player (for ui display)
   * @param {Player} player - The player entity
   * @returns {object} All stats organized by storage key
   */
  getAllStats(player) {
    const playerCache = this.cache.getPlayerCache(player)

    // Ensure all data is loaded
    for (const key of STORAGE_KEYS) {
      if (!playerCache.isLoaded(key)) {
        const data = StorageAdapter.load(player, key)
        playerCache.setLoaded(key, data)
      }
    }

    return playerCache.getAllData()
  }

  /**
   * Flush dirty data for a single player
   * @param {Player} player - The player entity
   */
  flushPlayer(player) {
    if (!this.cache.hasPlayer(player)) return

    const playerCache = this.cache.getPlayerCache(player)

    if (!playerCache.isDirty()) return

    const dirtyKeys = playerCache.getDirtyKeys()

    for (const key of dirtyKeys) {
      const data = playerCache.getData(key)
      if (data) {
        StorageAdapter.save(player, key, data)
        playerCache.markClean(key)
      }
    }
  }

  /**
   * Flush dirty data for all players
   */
  flushAllDirty() {
    for (const player of world.getAllPlayers()) {
      try {
        this.flushPlayer(player)
      } catch (error) {
        console.warn(`[StatsManager] failed to flush stats for ${player.name}: ${error.message}`)
      }
    }
  }

  /**
   * Reset all statistics for a player
   * @param {Player} player - The player entity
   */
  resetPlayerStats(player) {
    // Clear from storage
    StorageAdapter.clearAll(player)

    // Clear from cache and reload defaults
    if (this.cache.hasPlayer(player)) {
      const playerCache = this.cache.getPlayerCache(player)
      playerCache.clear()
    }

    // Reload defaults
    this.loadPlayerStats(player)

    // Set new session start
    const now = Date.now()
    this.set(player, 'ds:stats_core', 'time.sessionStart', now)
    this.set(player, 'ds:stats_core', 'time.firstJoined', now)
    this.set(player, 'ds:stats_core', 'sessions.total', 1)
  }

  /**
   * Admin reset: clear a player's statistics from both player and world storage
   * For online players: resets player properties + cache, syncs fresh snapshot
   * For offline players: removes registry entry + world snapshot entirely
   * @param {string} playerId - The player's id
   * @param {string} playerName - The player's name
   * @returns {boolean} True if reset was successful
   */
  adminResetPlayer(playerId, playerName) {
    try {
      const onlinePlayer = world.getAllPlayers().find(p => p.id === playerId)

      if (onlinePlayer) {
        this.resetPlayerStats(onlinePlayer)
        const freshStats = this.getAllStats(onlinePlayer)
        WorldStorageAdapter.savePlayerSnapshot(playerId, playerName, freshStats)
      } else {
        WorldStorageAdapter.removePlayer(playerId)
      }

      return true
    } catch (error) {
      console.warn(`[StatsManager] failed to admin reset player ${playerName}: ${error.message}`)
      return false
    }
  }

  /**
   * Sync all online player stats to world-level storage
   * Called periodically to keep snapshots fresh for offline access
   */
  syncToWorldStorage() {
    for (const player of world.getAllPlayers()) {
      try {
        const stats = this.getAllStats(player)
        WorldStorageAdapter.savePlayerSnapshot(player.id, player.name, stats)
        WorldStorageAdapter.upsertPlayer(player)
      } catch (error) {
        console.warn(`[StatsManager] failed to sync world snapshot for ${player.name}: ${error.message}`)
      }
    }
  }

  /**
   * Get the number of players with cached stats
   * @returns {number}
   */
  getCachedPlayerCount() {
    return this.cache.size
  }

  /**
   * Check if stats manager is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this.initialized
  }
}

/**
 * Export singleton getter for convenience
 * @returns {StatsManager}
 */
export function getStatsManager() {
  return StatsManager.getInstance()
}