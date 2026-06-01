/**
 * World storage adapter - world-level dynamic property storage
 *
 * Provides persistent storage accessible regardless of player online status:
 * - Player registry: index of all known players (name, id, last seen)
 * - Player snapshots: full stat data per player, saved to world properties
 */

import { world } from '@minecraft/server'
import { StorageAdapter, STORAGE_KEYS } from './StorageAdapter.js'

/**
 * Maximum entries in bytype objects for snapshot trimming
 */
const MAX_BY_TYPE_ENTRIES = 20

/**
 * World dynamic property key constants
 */
export const WORLD_KEYS = {
  REGISTRY: 'ds:stats_registry',
  playerSnapshotKey(playerId) {
    return `ds:stats_p:${playerId}`
  }
}

export class WorldStorageAdapter {
  /**
   * Load the player registry from world properties
   * @returns {{ players: Object<string, {name: string, id: string, lastSeen: number}> }}
   */
  static loadRegistry() {
    try {
      const raw = world.getDynamicProperty(WORLD_KEYS.REGISTRY)
      if (!raw) return { players: {} }
      return JSON.parse(raw)
    } catch (error) {
      console.warn(`[WorldStorageAdapter] failed to load registry: ${error.message}`)
      return { players: {} }
    }
  }

  /**
   * Save the player registry
   * @param {object} registry
   */
  static saveRegistry(registry) {
    try {
      world.setDynamicProperty(WORLD_KEYS.REGISTRY, JSON.stringify(registry))
    } catch (error) {
      console.warn(`[WorldStorageAdapter] failed to save registry: ${error.message}`)
    }
  }

  /**
   * Register or update a player in the registry
   * @param {Player} player
   */
  static upsertPlayer(player) {
    const registry = WorldStorageAdapter.loadRegistry()
    registry.players[player.id] = {
      name: player.name,
      id: player.id,
      lastSeen: Date.now()
    }
    WorldStorageAdapter.saveRegistry(registry)
  }

  /**
   * Save a full stat snapshot for a player to world storage
   * Trims bytype objects to keep within size limits
   * @param {string} playerId
   * @param {string} playerName
   * @param {object} allStats - The full stats object (all 7 keys)
   */
  static savePlayerSnapshot(playerId, playerName, allStats) {
    try {
      const trimmed = WorldStorageAdapter.trimSnapshot(allStats)
      const key = WORLD_KEYS.playerSnapshotKey(playerId)
      const json = JSON.stringify(trimmed)

      if (json.length > 32000) {
        console.warn(`[WorldStorageAdapter] snapshot for ${playerName} exceeds 32kb (${json.length}), applying aggressive trim`)
        const aggressive = WorldStorageAdapter.trimSnapshot(allStats, 10)
        world.setDynamicProperty(key, JSON.stringify(aggressive))
        return
      }

      world.setDynamicProperty(key, json)
    } catch (error) {
      console.warn(`[WorldStorageAdapter] failed to save snapshot for ${playerName}: ${error.message}`)
    }
  }

  /**
   * Load a player's stat snapshot from world storage
   * @param {string} playerId
   * @returns {object|null} The stats object or null if not found
   */
  static loadPlayerSnapshot(playerId) {
    try {
      const key = WORLD_KEYS.playerSnapshotKey(playerId)
      const raw = world.getDynamicProperty(key)
      if (!raw) return null
      return JSON.parse(raw)
    } catch (error) {
      console.warn(`[WorldStorageAdapter] failed to load snapshot for ${playerId}: ${error.message}`)
      return null
    }
  }

  /**
   * Get stats for a player, preferring live data if online
   * @param {string} playerId
   * @param {string} playerName
   * @returns {object|null}
   */
  static getPlayerStats(playerId, playerName) {
    // Check if player is online - read live data directly from player properties
    const onlinePlayer = world.getAllPlayers().find(p => p.id === playerId)
    if (onlinePlayer) {
      try {
        const stats = {}
        for (const key of STORAGE_KEYS) {
          stats[key] = StorageAdapter.load(onlinePlayer, key)
        }
        return stats
      } catch {
        // Fall through to snapshot
      }
    }

    // Offline - use world snapshot
    return WorldStorageAdapter.loadPlayerSnapshot(playerId)
  }

  /**
   * Trim a stats snapshot to reduce size
   * Keeps total counts but limits bytype breakdowns
   * @param {object} allStats - Full stats object
   * @param {number} maxEntries - Max bytype entries to keep
   * @returns {object} Trimmed copy
   */
  static trimSnapshot(allStats, maxEntries = MAX_BY_TYPE_ENTRIES) {
    const trimmed = JSON.parse(JSON.stringify(allStats))

    const trimByType = (obj) => {
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        if (obj.byType && typeof obj.byType === 'object') {
          const entries = Object.entries(obj.byType)
          if (entries.length > maxEntries) {
            entries.sort((a, b) => (b[1] || 0) - (a[1] || 0))
            obj.byType = Object.fromEntries(entries.slice(0, maxEntries))
          }
        }
        for (const value of Object.values(obj)) {
          trimByType(value)
        }
      }
    }

    for (const key of Object.keys(trimmed)) {
      trimByType(trimmed[key])
    }

    // Trim biome arrays
    if (trimmed['ds:stats_core']?.biomes?.discovered?.length > 50) {
      trimmed['ds:stats_core'].biomes.discovered = trimmed['ds:stats_core'].biomes.discovered.slice(0, 50)
    }

    return trimmed
  }

  /**
   * Remove a player's snapshot from world storage
   * @param {string} playerId
   */
  static removePlayerSnapshot(playerId) {
    try {
      const key = WORLD_KEYS.playerSnapshotKey(playerId)
      world.setDynamicProperty(key, undefined)
    } catch (error) {
      console.warn(`[WorldStorageAdapter] failed to remove snapshot for ${playerId}: ${error.message}`)
    }
  }

  /**
   * Fully remove a player from world storage (registry + snapshot)
   * Used by admin reset for offline players
   * @param {string} playerId
   */
  static removePlayer(playerId) {
    try {
      const registry = WorldStorageAdapter.loadRegistry()
      delete registry.players[playerId]
      WorldStorageAdapter.saveRegistry(registry)
      WorldStorageAdapter.removePlayerSnapshot(playerId)
    } catch (error) {
      console.warn(`[WorldStorageAdapter] failed to remove player ${playerId}: ${error.message}`)
      throw error
    }
  }
}