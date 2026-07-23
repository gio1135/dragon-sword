
import { world, system } from '@minecraft/server'
import { StatsCache } from './StatsCache.js'
import { StorageAdapter, STORAGE_KEYS } from './StorageAdapter.js'
import { WorldStorageAdapter } from './WorldStorageAdapter.js'
import { UPDATE_INTERVALS } from './constants.js'

let instance = null

export class StatsManager {
constructor() {
 if (instance) {
 return instance
 }

 this.cache = new StatsCache()

 this.initialized = false

 this.flushIntervalId = null

 this.worldSyncIntervalId = null

 instance = this
}

static getInstance() {
 if (!instance) {
 instance = new StatsManager()
 }
 return instance
}

initialize() {
 if (this.initialized) return

 this.flushIntervalId = system.runInterval(() => {
 this.flushAllDirty()
 }, UPDATE_INTERVALS.FLUSH)

 this.worldSyncIntervalId = system.runInterval(() => {
 this.syncToWorldStorage()
 }, 600)

 system.run(() => {
 for (const player of world.getAllPlayers()) {
  this.loadPlayerStats(player)
 }
 })

 this.initialized = true
}

shutdown() {
 if (this.flushIntervalId !== null) {
 system.clearRun(this.flushIntervalId)
 this.flushIntervalId = null
 }

 if (this.worldSyncIntervalId !== null) {
 system.clearRun(this.worldSyncIntervalId)
 this.worldSyncIntervalId = null
 }

 this.flushAllDirty()
 this.syncToWorldStorage()
 this.cache.clear()
 this.initialized = false
}

loadPlayerStats(player) {
 const playerCache = this.cache.getPlayerCache(player)

 for (const key of STORAGE_KEYS) {
 if (!playerCache.isLoaded(key)) {
  const data = StorageAdapter.load(player, key)
  playerCache.setLoaded(key, data)
 }
 }
}

onPlayerJoin(player) {
 this.loadPlayerStats(player)

 const now = Date.now()
 this.set(player, 'ds:stats_core', 'time.sessionStart', now)
 this.increment(player, 'ds:stats_core', 'sessions.total', 1)

 const firstJoined = this.get(player, 'ds:stats_core', 'time.firstJoined')
 if (!firstJoined) {
 this.set(player, 'ds:stats_core', 'time.firstJoined', now)
 }

 try {
 WorldStorageAdapter.upsertPlayer(player)
 } catch (error) {
 console.warn(`[StatsManager] failed to register player in world registry: ${error.message}`)
 }
}

onPlayerLeave(player) {
 try {
 const stats = this.getAllStats(player)
 WorldStorageAdapter.savePlayerSnapshot(player.id, player.name, stats)
 WorldStorageAdapter.upsertPlayer(player)
 } catch (error) {
 console.warn(`[StatsManager] failed to save world snapshot on leave: ${error.message}`)
 }

 this.flushPlayer(player)

 this.cache.removePlayer(player)
}

get(player, storageKey, path) {
 const playerCache = this.cache.getPlayerCache(player)

 if (!playerCache.isLoaded(storageKey)) {
 const data = StorageAdapter.load(player, storageKey)
 playerCache.setLoaded(storageKey, data)
 }

 return playerCache.get(storageKey, path)
}

set(player, storageKey, path, value) {
 const playerCache = this.cache.getPlayerCache(player)

 if (!playerCache.isLoaded(storageKey)) {
 const data = StorageAdapter.load(player, storageKey)
 playerCache.setLoaded(storageKey, data)
 }

 playerCache.set(storageKey, path, value)
}

increment(player, storageKey, path, amount = 1) {
 const playerCache = this.cache.getPlayerCache(player)

 if (!playerCache.isLoaded(storageKey)) {
 const data = StorageAdapter.load(player, storageKey)
 playerCache.setLoaded(storageKey, data)
 }

 return playerCache.increment(storageKey, path, amount)
}

max(player, storageKey, path, value) {
 const playerCache = this.cache.getPlayerCache(player)

 if (!playerCache.isLoaded(storageKey)) {
 const data = StorageAdapter.load(player, storageKey)
 playerCache.setLoaded(storageKey, data)
 }

 return playerCache.max(storageKey, path, value)
}

min(player, storageKey, path, value) {
 const playerCache = this.cache.getPlayerCache(player)

 if (!playerCache.isLoaded(storageKey)) {
 const data = StorageAdapter.load(player, storageKey)
 playerCache.setLoaded(storageKey, data)
 }

 return playerCache.min(storageKey, path, value)
}

addToSet(player, storageKey, path, item) {
 const playerCache = this.cache.getPlayerCache(player)

 if (!playerCache.isLoaded(storageKey)) {
 const data = StorageAdapter.load(player, storageKey)
 playerCache.setLoaded(storageKey, data)
 }

 return playerCache.addToSet(storageKey, path, item)
}

getAllStats(player) {
 const playerCache = this.cache.getPlayerCache(player)

 for (const key of STORAGE_KEYS) {
 if (!playerCache.isLoaded(key)) {
  const data = StorageAdapter.load(player, key)
  playerCache.setLoaded(key, data)
 }
 }

 return playerCache.getAllData()
}

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

flushAllDirty() {
 for (const player of world.getAllPlayers()) {
 try {
  this.flushPlayer(player)
 } catch (error) {
  console.warn(`[StatsManager] failed to flush stats for ${player.name}: ${error.message}`)
 }
 }
}

resetPlayerStats(player) {
 StorageAdapter.clearAll(player)

 if (this.cache.hasPlayer(player)) {
 const playerCache = this.cache.getPlayerCache(player)
 playerCache.clear()
 }

 this.loadPlayerStats(player)

 const now = Date.now()
 this.set(player, 'ds:stats_core', 'time.sessionStart', now)
 this.set(player, 'ds:stats_core', 'time.firstJoined', now)
 this.set(player, 'ds:stats_core', 'sessions.total', 1)
}

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

getCachedPlayerCount() {
 return this.cache.size
}

isInitialized() {
 return this.initialized
}
}

export function getStatsManager() {
return StatsManager.getInstance()
}