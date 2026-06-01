/**
 * Storage adapter - 7-key storage layer for player statistics
 *
 * Handles reading/writing to minecraft dynamic properties
 * Uses 7 organized storage keys to efficiently store all player statistics
 *
 * Storage keys:
 * - ds:stats_core        - player time, sessions, deaths, life, xp, coordinates, biomes
 * - ds:stats_travel      - distance by method, vehicle stats, portal usage
 * - ds:stats_combat      - kills, damage, deaths by cause, tools broken
 * - ds:stats_blocks      - mined + placed with per-block breakdown
 * - ds:stats_items       - used, crafted, broken, picked, dropped, food
 * - ds:stats_interactions - all block/entity interactions
 * - ds:stats_misc        - effects, chat, emotes, raids
 */

/**
 * All storage keys used by the addon
 * @type {string[]}
 */
export const STORAGE_KEYS = [
  'ds:stats_core',
  'ds:stats_travel',
  'ds:stats_combat',
  'ds:stats_blocks',
  'ds:stats_items',
  'ds:stats_interactions',
  'ds:stats_misc'
]

/**
 * Default data structures for each storage key
 */
export const DEFAULT_DATA = {
  'ds:stats_core': {
    time: {
      played: 0,
      session: 0,
      sessionStart: null,
      firstJoined: null,
      sinceRest: 0,
      sinceDeath: 0,
      sneakTime: 0
    },
    sessions: { total: 0 },
    deaths: { total: 0, lastCause: null, lastTime: null },
    life: { current: 0, longest: 0 },
    xp: { current: 0, total: 0, highest: 0, level: 0 },
    movement: {
      jumped: 0,
      climbed: 0,
      fallen: 0
    },
    coordinates: { highest: 0, lowest: 0, furthest: 0 },
    dimensions: { overworld: 0, nether: 0, the_end: 0 },
    biomes: { discovered: [], timeIn: {} },
    sleep: { total: 0 }
  },

  'ds:stats_travel': {
    distance: {
      walked: 0,
      sprinted: 0,
      crouched: 0,
      swum: 0,
      flown: 0,
      fallen: 0,
      onWater: 0,
      underWater: 0,
      climbed: 0
    },
    vehicles: {
      boat: { time: 0, distance: 0 },
      horse: { time: 0, distance: 0 },
      minecart: { time: 0, distance: 0 },
      pig: { time: 0, distance: 0 },
      strider: { time: 0, distance: 0 },
      happyGhast: { time: 0, distance: 0 },
      camel: { time: 0, distance: 0 },
      donkey: { time: 0, distance: 0 },
      mule: { time: 0, distance: 0 },
      llama: { time: 0, distance: 0 }
    },
    portals: { total: 0, transitions: {} }
  },

  'ds:stats_combat': {
    kills: {
      mobs: { total: 0, byType: {} },
      players: { total: 0, byPlayer: {} }
    },
    damage: {
      dealt: { total: 0, toMobs: 0, toPlayers: 0, absorbed: 0, resisted: 0 },
      taken: { total: 0, fromMobs: 0, fromPlayers: 0, environmental: 0, absorbed: 0, blocked: 0, resisted: 0 }
    },
    deaths: {
      total: 0,
      byMob: 0,
      byPlayer: 0,
      causes: {}
    },
    tools: { totalBroken: 0, byType: {} }
  },

  'ds:stats_blocks': {
    mined: { total: 0, byType: {} },
    placed: { total: 0, byType: {} }
  },

  'ds:stats_items': {
    used: { total: 0, byType: {} },
    crafted: { total: 0, byType: {} },
    broken: { total: 0, byType: {} },
    picked: { total: 0, byType: {} },
    dropped: { total: 0, byType: {} },
    food: { total: 0, byType: {} },
    enchanted: { total: 0 }
  },

  'ds:stats_interactions': {
    // Containers
    chest: 0,
    enderChest: 0,
    barrel: 0,
    copperChest: 0,
    shulkerBox: 0,
    trappedChest: 0,

    // Workstations
    craftingTable: 0,
    furnace: 0,
    blastFurnace: 0,
    smoker: 0,
    brewingStand: 0,
    enchantingTable: 0,
    anvil: 0,
    grindstone: 0,
    stonecutter: 0,
    cartographyTable: 0,
    loom: 0,
    smithingTable: 0,

    // Utility
    beacon: 0,
    lectern: 0,
    jukebox: 0,
    noteblock: { played: 0 },
    bell: 0,
    campfire: 0,

    // Special
    cauldron: { used: 0, filled: 0, bottleFilled: 0, armorCleaned: 0, bannerCleaned: 0, shulkerCleaned: 0 },
    flowerPot: { planted: 0 },
    musicDisc: { played: 0 },
    cake: 0,

    // Redstone
    dispenser: 0,
    dropper: 0,
    hopper: 0,

    // Entities
    villager: { talked: 0, traded: 0 },
    animals: { bred: 0 }
  },

  'ds:stats_misc': {
    effects: { total: 0, unique: [], byType: {} },
    chat: { messages: 0, characters: 0, longest: 0, average: 0 },
    emotes: { total: 0 },
    raids: { triggered: 0, won: 0 },
    targetBlock: { hit: 0 }
  }
}

/**
 * Storage adapter for reading/writing player statistics to dynamic properties
 */
export class StorageAdapter {
  /**
   * Load data for a specific storage key from a player's dynamic properties
   * @param {Player} player - The player entity
   * @param {string} key - Storage key (e.g., 'ds:stats_core')
   * @returns {object} The loaded data or default structure
   */
  static load(player, key) {
    try {
      const raw = player.getDynamicProperty(key)

      if (raw === undefined || raw === null) {
        return StorageAdapter.getDefaultData(key)
      }

      const parsed = JSON.parse(raw)
      // Merge with defaults to ensure all fields exist (handles schema updates)
      return StorageAdapter.mergeWithDefaults(key, parsed)
    } catch (error) {
      console.warn(`[StorageAdapter] failed to load ${key} for player ${player.name}: ${error.message}`)
      return StorageAdapter.getDefaultData(key)
    }
  }

  /**
   * Load all storage keys for a player
   * @param {Player} player - The player entity
   * @returns {object} Object with all storage keys and their data
   */
  static loadAll(player) {
    const result = {}
    for (const key of STORAGE_KEYS) {
      result[key] = StorageAdapter.load(player, key)
    }
    return result
  }

  /**
   * Save data for a specific storage key to a player's dynamic properties
   * @param {Player} player - The player entity
   * @param {string} key - Storage key
   * @param {object} data - The data to save
   * @returns {boolean} True if save was successful
   */
  static save(player, key, data) {
    try {
      const json = JSON.stringify(data)

      // Check size limit (32kb per property)
      if (json.length > 32000) {
        console.warn(`[StorageAdapter] data for ${key} exceeds 32kb limit (${json.length} bytes). trimming...`)
        // For keys with bytype objects, trim the largest collections
        const trimmed = StorageAdapter.trimData(key, data)
        player.setDynamicProperty(key, JSON.stringify(trimmed))
        return true
      }

      player.setDynamicProperty(key, json)
      return true
    } catch (error) {
      console.error(`[StorageAdapter] failed to save ${key} for player ${player.name}: ${error.message}`)
      return false
    }
  }

  /**
   * Save multiple storage keys at once
   * @param {Player} player - The player entity
   * @param {object} dataMap - Object mapping storage keys to their data
   * @returns {boolean} True if all saves were successful
   */
  static saveMultiple(player, dataMap) {
    let allSuccess = true
    for (const [key, data] of Object.entries(dataMap)) {
      if (!StorageAdapter.save(player, key, data)) {
        allSuccess = false
      }
    }
    return allSuccess
  }

  /**
   * Clear all statistics for a player
   * @param {Player} player - The player entity
   */
  static clearAll(player) {
    for (const key of STORAGE_KEYS) {
      try {
        player.setDynamicProperty(key, undefined)
      } catch (error) {
        console.warn(`[StorageAdapter] failed to clear ${key} for player ${player.name}: ${error.message}`)
      }
    }
  }

  /**
   * Get default data structure for a storage key
   * @param {string} key - Storage key
   * @returns {object} Deep copy of default data
   */
  static getDefaultData(key) {
    const defaults = DEFAULT_DATA[key]
    if (!defaults) {
      console.warn(`[StorageAdapter] unknown storage key: ${key}`)
      return {}
    }
    return JSON.parse(JSON.stringify(defaults))
  }

  /**
   * Merge loaded data with defaults to ensure all fields exist
   * This handles schema updates where new fields are added
   * @param {string} key - Storage key
   * @param {object} loaded - Loaded data
   * @returns {object} Merged data
   */
  static mergeWithDefaults(key, loaded) {
    const defaults = StorageAdapter.getDefaultData(key)
    return StorageAdapter.deepMerge(defaults, loaded)
  }

  /**
   * Deep merge two objects, preserving loaded values while adding missing defaults
   * @param {object} defaults - Default structure
   * @param {object} loaded - Loaded data
   * @returns {object} Merged object
   */
  static deepMerge(defaults, loaded) {
    const result = { ...defaults }

    for (const key of Object.keys(loaded)) {
      if (loaded[key] !== null && typeof loaded[key] === 'object' && !Array.isArray(loaded[key])) {
        if (typeof defaults[key] === 'object' && !Array.isArray(defaults[key])) {
          result[key] = StorageAdapter.deepMerge(defaults[key] || {}, loaded[key])
        } else {
          result[key] = loaded[key]
        }
      } else {
        result[key] = loaded[key]
      }
    }

    return result
  }

  /**
   * Trim data to fit within size limits
   * Prioritizes keeping total counts while trimming per-type breakdowns
   * @param {string} key - Storage key
   * @param {object} data - Data to trim
   * @returns {object} Trimmed data
   */
  static trimData(key, data) {
    const trimmed = JSON.parse(JSON.stringify(data))

    // For keys with bytype objects, limit to top n entries by value
    const MAX_ENTRIES = 100

    const trimByType = (obj) => {
      if (obj && typeof obj === 'object') {
        if (obj.byType && typeof obj.byType === 'object') {
          const entries = Object.entries(obj.byType)
          if (entries.length > MAX_ENTRIES) {
            // Sort by value descending and keep top entries
            entries.sort((a, b) => (b[1] || 0) - (a[1] || 0))
            obj.byType = Object.fromEntries(entries.slice(0, MAX_ENTRIES))
          }
        }
        // Recurse into nested objects
        for (const value of Object.values(obj)) {
          trimByType(value)
        }
      }
    }

    trimByType(trimmed)
    return trimmed
  }

  /**
   * Check if a player has any saved statistics
   * @param {Player} player - The player entity
   * @returns {boolean} True if player has saved stats
   */
  static hasStats(player) {
    for (const key of STORAGE_KEYS) {
      try {
        const raw = player.getDynamicProperty(key)
        if (raw !== undefined && raw !== null) {
          return true
        }
      } catch {
        // Continue checking other keys
      }
    }
    return false
  }

  /**
   * Get approximate total storage size for a player
   * @param {Player} player - The player entity
   * @returns {number} Total bytes used
   */
  static getStorageSize(player) {
    let totalSize = 0
    for (const key of STORAGE_KEYS) {
      try {
        const raw = player.getDynamicProperty(key)
        if (raw) {
          totalSize += raw.length
        }
      } catch {
        // Continue checking other keys
      }
    }
    return totalSize
  }
}