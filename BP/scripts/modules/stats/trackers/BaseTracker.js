
import { getStatsManager } from '../core/StatsManager.js'

export class BaseTracker {
constructor() {

 this.initialized = false
}

get stats() {
 return getStatsManager()
}

initialize() {
 if (this.initialized) return
 this.registerEvents()
 this.initialized = true
}

registerEvents() {
}

increment(player, storageKey, path, amount = 1) {
 return this.stats.increment(player, storageKey, path, amount)
}

set(player, storageKey, path, value) {
 this.stats.set(player, storageKey, path, value)
}

get(player, storageKey, path) {
 return this.stats.get(player, storageKey, path)
}

max(player, storageKey, path, value) {
 return this.stats.max(player, storageKey, path, value)
}

min(player, storageKey, path, value) {
 return this.stats.min(player, storageKey, path, value)
}

addToSet(player, storageKey, path, item) {
 return this.stats.addToSet(player, storageKey, path, item)
}
}