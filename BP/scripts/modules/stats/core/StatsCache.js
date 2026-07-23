
class PlayerCache {

constructor(playerId) {
 this.playerId = playerId
 this.data = {}
 this.dirty = new Set()
 this.loaded = new Set()
 this.lastFlush = Date.now()
}

isLoaded(key) {
 return this.loaded.has(key)
}

setLoaded(key, data) {
 this.data[key] = data
 this.loaded.add(key)
}

getData(key) {
 return this.data[key]
}

get(key, path) {
 const data = this.data[key]
 if (!data) return undefined

 return path.split('.').reduce((obj, prop) => {
 return obj?.[prop]
 }, data)
}

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

increment(key, path, amount = 1) {
 const current = this.get(key, path) || 0
 const newValue = current + amount
 this.set(key, path, newValue)
 return newValue
}

max(key, path, value) {
 const current = this.get(key, path)
 const newValue = current === undefined ? value : Math.max(current, value)
 if (newValue !== current) {
 this.set(key, path, newValue)
 }
 return newValue
}

min(key, path, value) {
 const current = this.get(key, path)
 const newValue = current === undefined ? value : Math.min(current, value)
 if (newValue !== current) {
 this.set(key, path, newValue)
 }
 return newValue
}

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

isDirty() {
 return this.dirty.size > 0
}

getDirtyKeys() {
 return new Set(this.dirty)
}

markClean(key) {
 this.dirty.delete(key)
}

markAllClean() {
 this.dirty.clear()
 this.lastFlush = Date.now()
}

getAllData() {
 return { ...this.data }
}

clear() {
 this.data = {}
 this.dirty.clear()
 this.loaded.clear()
}
}

export class StatsCache {
constructor() {

 this.players = new Map()
}

getPlayerCache(player) {
 const id = player.id
 if (!this.players.has(id)) {
 this.players.set(id, new PlayerCache(id))
 }
 return this.players.get(id)
}

hasPlayer(player) {
 return this.players.has(player.id)
}

removePlayer(player) {
 const cache = this.players.get(player.id)
 this.players.delete(player.id)
 return cache
}

entries() {
 return this.players.entries()
}

get size() {
 return this.players.size
}

clear() {
 this.players.clear()
}
}

export { PlayerCache }