/**
 * Stats cache - in-memory cache with dirty tracking for player statistics
 *
 * Provides efficient stat access without hitting dynamic properties on every operation
 * Tracks which categories have been modified ("dirty") so only changed data is saved
 */

/**
 * Cache for a single player's statistics
 */
class PlayerCache {
  /**
   * @param {string} playerId - The player's unique id
   */
  constructor(playerId) {
    this.playerId = playerId
    this.data = {}           // { storageKey: { ...data } }
    this.dirty = new Set()   // Set of storage keys that need saving
    this.loaded = new Set()  // Set of storage keys that have been loaded
    this.lastFlush = Date.now()
  }

  /**
   * Check if a storage key has been loaded into cache
   * @param {string} key - Storage key
   * @returns {boolean}
   */
  isLoaded(key) {
    return this.loaded.has(key)
  }

  /**
   * Mark a storage key as loaded and set its data
   * @param {string} key - Storage key
   * @param {object} data - The data to cache
   */
  setLoaded(key, data) {
    this.data[key] = data
    this.loaded.add(key)
  }

  /**
   * Get data for a storage key
   * @param {string} key - Storage key
   * @returns {object|undefined}
   */
  getData(key) {
    return this.data[key]
  }

  /**
   * Get a nested value using dot notation path
   * @param {string} key - Storage key
   * @param {string} path - Dot notation path (e.g., "kills.mobs.total")
   * @returns {*}
   */
  get(key, path) {
    const data = this.data[key]
    if (!data) return undefined

    return path.split('.').reduce((obj, prop) => {
      return obj?.[prop]
    }, data)
  }

  /**
   * Set a nested value using dot notation path
   * @param {string} key - Storage key
   * @param {string} path - Dot notation path
   * @param {*} value - Value to set
   */
  set(key, path, value) {
    if (!this.data[key]) {
      this.data[key] = {}
    }

    const parts = path.split('.')
    const lastPart = parts.pop()

    let obj = this.data[key]
    for (const part of parts) {
      if (!obj[part] || typeof obj[part] !== 'object') {
        obj[part] = {}
      }
      obj = obj[part]
    }

    obj[lastPart] = value
    this.dirty.add(key)
  }

  /**
   * Increment a numeric value at a path
   * @param {string} key - Storage key
   * @param {string} path - Dot notation path
   * @param {number} amount - Amount to increment by
   * @returns {number} New value
   */
  increment(key, path, amount = 1) {
    const current = this.get(key, path) || 0
    const newValue = current + amount
    this.set(key, path, newValue)
    return newValue
  }

  /**
   * Get the maximum of current value and new value
   * @param {string} key - Storage key
   * @param {string} path - Dot notation path
   * @param {number} value - Value to compare
   * @returns {number} The maximum value
   */
  max(key, path, value) {
    const current = this.get(key, path)
    const newValue = current === undefined ? value : Math.max(current, value)
    if (newValue !== current) {
      this.set(key, path, newValue)
    }
    return newValue
  }

  /**
   * Get the minimum of current value and new value
   * @param {string} key - Storage key
   * @param {string} path - Dot notation path
   * @param {number} value - Value to compare
   * @returns {number} The minimum value
   */
  min(key, path, value) {
    const current = this.get(key, path)
    const newValue = current === undefined ? value : Math.min(current, value)
    if (newValue !== current) {
      this.set(key, path, newValue)
    }
    return newValue
  }

  /**
   * Add an item to an array if not already present
   * @param {string} key - Storage key
   * @param {string} path - Dot notation path to array
   * @param {*} item - Item to add
   * @returns {boolean} True if item was added
   */
  addToSet(key, path, item) {
    let arr = this.get(key, path)
    if (!Array.isArray(arr)) {
      arr = []
    }
    if (!arr.includes(item)) {
      arr.push(item)
      this.set(key, path, arr)
      return true
    }
    return false
  }

  /**
   * Check if any data needs saving
   * @returns {boolean}
   */
  isDirty() {
    return this.dirty.size > 0
  }

  /**
   * Get all dirty storage keys
   * @returns {Set<string>}
   */
  getDirtyKeys() {
    return new Set(this.dirty)
  }

  /**
   * Mark a storage key as clean (saved)
   * @param {string} key - Storage key
   */
  markClean(key) {
    this.dirty.delete(key)
  }

  /**
   * Mark all keys as clean
   */
  markAllClean() {
    this.dirty.clear()
    this.lastFlush = Date.now()
  }

  /**
   * Get all cached data (for ui display)
   * @returns {object}
   */
  getAllData() {
    return { ...this.data }
  }

  /**
   * Clear all cached data for this player
   */
  clear() {
    this.data = {}
    this.dirty.clear()
    this.loaded.clear()
  }
}

/**
 * Main cache manager for all players
 */
export class StatsCache {
  constructor() {
    /** @type {Map<string, PlayerCache>} */
    this.players = new Map()
  }

  /**
   * Get or create cache for a player
   * @param {Player} player - The player entity
   * @returns {PlayerCache}
   */
  getPlayerCache(player) {
    const id = player.id
    if (!this.players.has(id)) {
      this.players.set(id, new PlayerCache(id))
    }
    return this.players.get(id)
  }

  /**
   * Check if a player has a cache
   * @param {Player} player - The player entity
   * @returns {boolean}
   */
  hasPlayer(player) {
    return this.players.has(player.id)
  }

  /**
   * Remove a player's cache
   * @param {Player} player - The player entity
   * @returns {PlayerCache|undefined} The removed cache (for final flush)
   */
  removePlayer(player) {
    const cache = this.players.get(player.id)
    this.players.delete(player.id)
    return cache
  }

  /**
   * Get all player caches (for batch operations)
   * @returns {IterableIterator<[string, PlayerCache]>}
   */
  entries() {
    return this.players.entries()
  }

  /**
   * Get count of cached players
   * @returns {number}
   */
  get size() {
    return this.players.size
  }

  /**
   * Clear all caches
   */
  clear() {
    this.players.clear()
  }
}

// Export PlayerCache for type hints
export { PlayerCache }