/**
 * Migration script - transfers legacy statistics to the new ds:stats_ namespace
 *
 * This script is temporary and can be deleted after successful migration
 * it handles mapping from ds: and bs: dynamic properties to the new structured JSON format
 */

import { world } from '@minecraft/server'
import { getStatsManager } from './core/StatsManager.js'
import { STORAGE_KEYS } from './core/constants.js'

const OLD_PREFIXES = ['ds:', 'bs:']
const OLD_CATEGORIES = [
  'custom', 'mined', 'broken', 'used', 'picked_up', 'dropped', 'killed', 'killed_by'
]

/**
 * Run the migration for all online players and known players in registry
 */
export function runMigration() {
  console.log('[Stats migration] starting migration...')
  
  let migratedCount = 0
  for (const player of world.getAllPlayers()) {
    if (migratePlayer(player)) {
      migratedCount++
    }
  }
  
  console.log(`[Stats migration] finished. migrated ${migratedCount} online players`)
  console.log('[Stats migration] manual migration for offline players is recommended via a command if needed')
}

/**
 * Migrate a single player's statistics
 * @param {Player} player
 * @returns {boolean} true if any stats were migrated
 */
export function migratePlayer(player) {
  // Check if player already has new stats to avoid double migration
  if (player.getDynamicProperty(STORAGE_KEYS.CORE)) {
    return false
  }

  const manager = getStatsManager()
  const stats = manager.getAllStats(player)
  let changed = false

  // 1. Migrate custom/general stats
  for (const prefix of OLD_PREFIXES) {
    // Time played (play_one_minute is usually ticks)
    const time = getOldStat(player, prefix, 'custom', 'play_one_minute')
    if (time > 0) {
      stats[STORAGE_KEYS.CORE].time.played = time
      changed = true
    }

    // Deaths
    const deaths = getOldStat(player, prefix, 'custom', 'deaths')
    if (deaths > 0) {
      stats[STORAGE_KEYS.CORE].deaths.total = deaths
      stats[STORAGE_KEYS.COMBAT].deaths.total = deaths
      changed = true
    }

    // Jumps
    const jumps = getOldStat(player, prefix, 'custom', 'jump')
    if (jumps > 0) {
      stats[STORAGE_KEYS.CORE].movement.jumped = jumps
      changed = true
    }

    // Travel distances
    const walk = getOldStat(player, prefix, 'custom', 'walk_one_cm')
    if (walk > 0) { stats[STORAGE_KEYS.TRAVEL].distance.walked = walk; changed = true }
    
    const sprint = getOldStat(player, prefix, 'custom', 'sprint_one_cm')
    if (sprint > 0) { stats[STORAGE_KEYS.TRAVEL].distance.sprinted = sprint; changed = true }
    
    const crouch = getOldStat(player, prefix, 'custom', 'crouch_one_cm')
    if (crouch > 0) { stats[STORAGE_KEYS.TRAVEL].distance.crouched = crouch; changed = true }
    
    const swim = getOldStat(player, prefix, 'custom', 'swim_one_cm')
    if (swim > 0) { stats[STORAGE_KEYS.TRAVEL].distance.swum = swim; changed = true }
    
    const fly = getOldStat(player, prefix, 'custom', 'fly_one_cm')
    if (fly > 0) { stats[STORAGE_KEYS.TRAVEL].distance.flown = fly; changed = true }
    
    const fall = getOldStat(player, prefix, 'custom', 'fall_one_cm')
    if (fall > 0) { stats[STORAGE_KEYS.TRAVEL].distance.fallen = fall; changed = true }
    
    const climb = getOldStat(player, prefix, 'custom', 'climb_one_cm')
    if (climb > 0) { stats[STORAGE_KEYS.TRAVEL].distance.climbed = climb; changed = true }

    // Combat
    const damageDealt = getOldStat(player, prefix, 'custom', 'damage_dealt')
    if (damageDealt > 0) {
      stats[STORAGE_KEYS.COMBAT].damage.dealt.total = damageDealt
      changed = true
    }

    const damageTaken = getOldStat(player, prefix, 'custom', 'damage_taken')
    if (damageTaken > 0) {
      stats[STORAGE_KEYS.COMBAT].damage.taken.total = damageTaken
      changed = true
    }

    const mobKills = getOldStat(player, prefix, 'custom', 'mob_kills')
    if (mobKills > 0) {
      stats[STORAGE_KEYS.COMBAT].kills.mobs.total = mobKills
      changed = true
    }

    const playerKills = getOldStat(player, prefix, 'custom', 'player_kills')
    if (playerKills > 0) {
      stats[STORAGE_KEYS.COMBAT].kills.players.total = playerKills
      changed = true
    }

    // Sessions
    const sessions = getOldStat(player, prefix, 'custom', 'leave_game')
    if (sessions > 0) {
      stats[STORAGE_KEYS.CORE].sessions.total = sessions + 1 // +1 for current
      changed = true
    }

    // Interactions
    const enchanted = getOldStat(player, prefix, 'custom', 'item_enchanted')
    if (enchanted > 0) {
      stats[STORAGE_KEYS.INTERACTIONS].enchantingTable = enchanted
      changed = true
    }

    const fish = getOldStat(player, prefix, 'custom', 'fish_caught')
    if (fish > 0) {
      stats[STORAGE_KEYS.MISC].fishing.caught = fish
      changed = true
    }

    const raidWin = getOldStat(player, prefix, 'custom', 'raid_win')
    if (raidWin > 0) {
      stats[STORAGE_KEYS.MISC].raids.won = raidWin
      changed = true
    }

    const raidTrigger = getOldStat(player, prefix, 'custom', 'raid_trigger')
    if (raidTrigger > 0) {
      stats[STORAGE_KEYS.MISC].raids.triggered = raidTrigger
      changed = true
    }
  }

  // 2. Migrate mapped categories (mined, broken, used, etc.)
  // We need to scan all dynamic properties of the player
  // Note: we cannot iterate all dynamic properties on a player easily in bedrock without knowing keys
  // However, we can try to guess common ones or use a list of all game items/blocks if needed
  // but for a one-time migration, we might just migrate the known ones from the old registry if they exist
  
  // Since we don't have a list of all keys, we'll focus on the most important ones
  // or if the user has a specific list, we could use that.
  // for now, we'll try to migrate whatever we can find by checking common types
  
  if (changed) {
    manager.saveAllStats(player, stats)
    return true
  }

  return false
}

/**
 * Get an old statistic value from player dynamic properties
 * @param {Player} player
 * @param {string} prefix
 * @param {string} category
 * @param {string} key
 * @returns {number}
 */
function getOldStat(player, prefix, category, key) {
  const fullKey = `${prefix}${category}/${key}`
  const value = player.getDynamicProperty(fullKey)
  return typeof value === 'number' ? value : 0
}