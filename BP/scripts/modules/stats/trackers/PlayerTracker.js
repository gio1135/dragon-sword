
import { world, system } from '@minecraft/server'
import { BaseTracker } from './BaseTracker.js'
import { STORAGE_KEYS, UPDATE_INTERVALS, normalizeDimension } from '../core/constants.js'

const CORE = STORAGE_KEYS.CORE

export class PlayerTracker extends BaseTracker {
constructor() {
 super()

 this.playerXpState = new Map()
}

registerEvents() {
 world.afterEvents.playerSpawn.subscribe((event) => {
 if (event.initialSpawn) {
  this.onPlayerJoin(event.player)
 }
 })

 world.afterEvents.playerLeave.subscribe((event) => {
 this.onPlayerLeave(event.playerId, event.playerName)
 })

 world.afterEvents.playerDimensionChange.subscribe((event) => {
 this.onDimensionChange(event.player, event.fromDimension, event.toDimension)
 })

 system.runInterval(() => {
 this.updateTimeTracking()
 }, UPDATE_INTERVALS.TIME_TRACKING)
}

onPlayerJoin(player) {
 this.stats.onPlayerJoin(player)

 try {
 this.playerXpState.set(player.id, {
  lastXp: player.getTotalXp?.() || 0,
  lastLevel: player.level || 0
 })
 } catch {
 this.playerXpState.set(player.id, { lastXp: 0, lastLevel: 0 })
 }

 const dim = normalizeDimension(player.dimension.id)
 this.set(player, CORE, 'dimensions.current', dim)
}

onPlayerLeave(playerId, playerName) {
 this.playerXpState.delete(playerId)

 const player = world.getAllPlayers().find(p => p.id === playerId)
 if (player) {
 this.stats.onPlayerLeave(player)
 }
}

onDimensionChange(player, fromDim, toDim) {
 const from = normalizeDimension(fromDim.id)
 const to = normalizeDimension(toDim.id)

 this.increment(player, STORAGE_KEYS.TRAVEL, 'portals.total', 1)

 const transitionKey = `${from}_to_${to}`
 this.increment(player, STORAGE_KEYS.TRAVEL, `portals.transitions.${transitionKey}`, 1)

 this.set(player, CORE, 'dimensions.current', to)
}

updateTimeTracking() {
 for (const player of world.getAllPlayers()) {
 try {
  this.updatePlayerTime(player)
  this.updatePlayerXp(player)
  this.updatePlayerLife(player)
  this.checkSleeping(player)
 } catch (error) {
 }
 }
}

updatePlayerTime(player) {
 this.increment(player, CORE, 'time.played', UPDATE_INTERVALS.TIME_TRACKING)
 this.increment(player, CORE, 'time.session', UPDATE_INTERVALS.TIME_TRACKING)

 this.increment(player, CORE, 'time.sinceRest', UPDATE_INTERVALS.TIME_TRACKING)

 this.increment(player, CORE, 'time.sinceDeath', UPDATE_INTERVALS.TIME_TRACKING)

 const dim = normalizeDimension(player.dimension.id)
 this.increment(player, CORE, `dimensions.${dim}`, UPDATE_INTERVALS.TIME_TRACKING)

 if (player.isSneaking) {
 this.increment(player, CORE, 'time.sneakTime', UPDATE_INTERVALS.TIME_TRACKING)
 }
}

updatePlayerXp(player) {
 try {
 const currentXp = player.getTotalXp?.() || 0
 const currentLevel = player.level || 0

 const xpState = this.playerXpState.get(player.id)
 if (!xpState) {
  this.playerXpState.set(player.id, { lastXp: currentXp, lastLevel: currentLevel })
  return
 }

 const xpGained = currentXp - xpState.lastXp
 if (xpGained > 0) {
  this.increment(player, CORE, 'xp.total', xpGained)
 }

 this.set(player, CORE, 'xp.current', currentXp)
 this.set(player, CORE, 'xp.level', currentLevel)

 this.max(player, CORE, 'xp.highest', currentLevel)

 xpState.lastXp = currentXp
 xpState.lastLevel = currentLevel
 } catch {
 }
}

updatePlayerLife(player) {
 const currentLife = this.increment(player, CORE, 'life.current', UPDATE_INTERVALS.TIME_TRACKING)

 this.max(player, CORE, 'life.longest', currentLife)
}

checkSleeping(player) {
 try {
 if (player.isSleeping) {
  this.set(player, CORE, 'time.sinceRest', 0)

  const wasSleeping = this.get(player, CORE, 'sleep.inProgress')
  if (!wasSleeping) {
  this.increment(player, CORE, 'sleep.total', 1)
  this.set(player, CORE, 'sleep.inProgress', true)
  }
 } else {
  this.set(player, CORE, 'sleep.inProgress', false)
 }
 } catch {
 }
}

onPlayerDeath(player) {
 this.set(player, CORE, 'time.sinceDeath', 0)

 this.set(player, CORE, 'life.current', 0)
}
}