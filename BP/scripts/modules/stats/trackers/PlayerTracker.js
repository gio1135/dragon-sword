/**
 * Player tracker - tracks player session, time, xp, and dimension statistics
 *
 * Handles:
 * - Session management (join/leave)
 * - Time played tracking
 * - XP collection and levels
 * - Dimension time tracking
 * - Sleep tracking
 * - Life streak tracking
 */

import { world, system } from '@minecraft/server'
import { BaseTracker } from './BaseTracker.js'
import { STORAGE_KEYS, UPDATE_INTERVALS, normalizeDimension } from '../core/constants.js'

const CORE = STORAGE_KEYS.CORE

export class PlayerTracker extends BaseTracker {
  constructor() {
    super()
    /** @type {Map<string, {lastXp: number, lastLevel: number}>} */
    this.playerXpState = new Map()
  }

  registerEvents() {
    // Player spawn
    world.afterEvents.playerSpawn.subscribe((event) => {
      if (event.initialSpawn) {
        this.onPlayerJoin(event.player)
      }
    })

    // Player leave
    world.afterEvents.playerLeave.subscribe((event) => {
      this.onPlayerLeave(event.playerId, event.playerName)
    })

    // Dimension change
    world.afterEvents.playerDimensionChange.subscribe((event) => {
      this.onDimensionChange(event.player, event.fromDimension, event.toDimension)
    })

    // Time tracking interval (every second)
    system.runInterval(() => {
      this.updateTimeTracking()
    }, UPDATE_INTERVALS.TIME_TRACKING)
  }

  /**
   * Handle player joining the world
   * @param {Player} player
   */
  onPlayerJoin(player) {
    // Statsmanager handles loading stats
    this.stats.onPlayerJoin(player)

    // Store initial xp state
    try {
      this.playerXpState.set(player.id, {
        lastXp: player.getTotalXp?.() || 0,
        lastLevel: player.level || 0
      })
    } catch {
      this.playerXpState.set(player.id, { lastXp: 0, lastLevel: 0 })
    }

    // Track initial dimension
    const dim = normalizeDimension(player.dimension.id)
    this.set(player, CORE, 'dimensions.current', dim)
  }

  /**
   * Handle player leaving the world
   * @param {string} playerId
   * @param {string} playerName
   */
  onPlayerLeave(playerId, playerName) {
    // Clean up xp state
    this.playerXpState.delete(playerId)

    // Find player (may not exist if already gone)
    const player = world.getAllPlayers().find(p => p.id === playerId)
    if (player) {
      this.stats.onPlayerLeave(player)
    }
  }

  /**
   * Handle dimension change
   * @param {Player} player
   * @param {Dimension} fromDim
   * @param {Dimension} toDim
   */
  onDimensionChange(player, fromDim, toDim) {
    const from = normalizeDimension(fromDim.id)
    const to = normalizeDimension(toDim.id)

    // Track portal transitions
    this.increment(player, STORAGE_KEYS.TRAVEL, 'portals.total', 1)

    const transitionKey = `${from}_to_${to}`
    this.increment(player, STORAGE_KEYS.TRAVEL, `portals.transitions.${transitionKey}`, 1)

    // Update current dimension
    this.set(player, CORE, 'dimensions.current', to)
  }

  /**
   * Update time tracking for all online players
   * Called every second (20 ticks)
   */
  updateTimeTracking() {
    for (const player of world.getAllPlayers()) {
      try {
        this.updatePlayerTime(player)
        this.updatePlayerXp(player)
        this.updatePlayerLife(player)
        this.checkSleeping(player)
      } catch (error) {
        // Player may have disconnected
      }
    }
  }

  /**
   * Update time statistics for a player
   * @param {Player} player
   */
  updatePlayerTime(player) {
    // Increment time played (in ticks, 20 = 1 second)
    this.increment(player, CORE, 'time.played', UPDATE_INTERVALS.TIME_TRACKING)
    this.increment(player, CORE, 'time.session', UPDATE_INTERVALS.TIME_TRACKING)

    // Track time since rest
    this.increment(player, CORE, 'time.sinceRest', UPDATE_INTERVALS.TIME_TRACKING)

    // Track time since death
    this.increment(player, CORE, 'time.sinceDeath', UPDATE_INTERVALS.TIME_TRACKING)

    // Track dimension time
    const dim = normalizeDimension(player.dimension.id)
    this.increment(player, CORE, `dimensions.${dim}`, UPDATE_INTERVALS.TIME_TRACKING)

    // Track sneak time
    if (player.isSneaking) {
      this.increment(player, CORE, 'time.sneakTime', UPDATE_INTERVALS.TIME_TRACKING)
    }
  }

  /**
   * Update xp statistics for a player
   * @param {Player} player
   */
  updatePlayerXp(player) {
    try {
      const currentXp = player.getTotalXp?.() || 0
      const currentLevel = player.level || 0

      const xpState = this.playerXpState.get(player.id)
      if (!xpState) {
        this.playerXpState.set(player.id, { lastXp: currentXp, lastLevel: currentLevel })
        return
      }

      // Calculate xp gained
      const xpGained = currentXp - xpState.lastXp
      if (xpGained > 0) {
        this.increment(player, CORE, 'xp.total', xpGained)
      }

      // Update current xp and level
      this.set(player, CORE, 'xp.current', currentXp)
      this.set(player, CORE, 'xp.level', currentLevel)

      // Track highest level
      this.max(player, CORE, 'xp.highest', currentLevel)

      // Update state
      xpState.lastXp = currentXp
      xpState.lastLevel = currentLevel
    } catch {
      // Xp api may not be available
    }
  }

  /**
   * Update life streak for a player
   * @param {Player} player
   */
  updatePlayerLife(player) {
    // Increment current life time
    const currentLife = this.increment(player, CORE, 'life.current', UPDATE_INTERVALS.TIME_TRACKING)

    // Track longest life
    this.max(player, CORE, 'life.longest', currentLife)
  }

  /**
   * Check if player is sleeping
   * @param {Player} player
   */
  checkSleeping(player) {
    try {
      if (player.isSleeping) {
        // Reset time since rest
        this.set(player, CORE, 'time.sinceRest', 0)

        // Track sleep count (only once per sleep session)
        const wasSleeping = this.get(player, CORE, 'sleep.inProgress')
        if (!wasSleeping) {
          this.increment(player, CORE, 'sleep.total', 1)
          this.set(player, CORE, 'sleep.inProgress', true)
        }
      } else {
        // Reset sleep in progress flag
        this.set(player, CORE, 'sleep.inProgress', false)
      }
    } catch {
      // Sleep api may not be available
    }
  }

  /**
   * Called when player dies (from combattracker)
   * @param {Player} player
   */
  onPlayerDeath(player) {
    // Reset time since death
    this.set(player, CORE, 'time.sinceDeath', 0)

    // Reset current life
    this.set(player, CORE, 'life.current', 0)
  }
}