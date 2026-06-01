import { world, system } from '@minecraft/server'
import { getStatsManager } from './core/StatsManager.js'
import { initializeTrackers } from './trackers/index.js'
import { showStatsMenu } from './ui/StatsMenu.js'
import { WorldStorageAdapter } from './core/WorldStorageAdapter.js'
import { runMigration } from './migration.js'

export function initializeStats() {
  const manager = getStatsManager()
  manager.initialize()

  const trackers = initializeTrackers()

  // Register written_book interaction
  world.beforeEvents.itemUse.subscribe((event) => {
    onItemUse(event)
  })
}

/**
 * Handle item use for viewing stats via written_book
 * @param {ItemUseBeforeEvent} event
 */
function onItemUse(event) {
  const { source: player, itemStack } = event
  if (!itemStack) return

  // Identify books
  const isWritten = itemStack.typeId === 'minecraft:written_book'
  const isWritable = itemStack.typeId === 'minecraft:writable_book'
  const isNormalBook = itemStack.typeId === 'minecraft:book'

  if (!isWritten && !isWritable && !isNormalBook) return

  // Read title/nameTag synchronously
  const bookComponent = itemStack.getComponent('minecraft:book')
  const title = bookComponent?.title ?? itemStack.nameTag ?? ''

  // 1. Determine target player from the title
  let targetName = null
  let targetStats = null

  // Special keywords for self-stats
  const isSelf = ['Stats', 'stats', 'Statistics', 'statistics'].includes(title)

  if (isSelf) {
    targetName = player.name
    targetStats = getStatsManager().getAllStats(player)
  } else {
    // Check online players (case sensitive as requested)
    const online = world.getAllPlayers().find(p => p.name === title)
    if (online) {
      targetName = online.name
      targetStats = getStatsManager().getAllStats(online)
    } else {
      // Check offline registry
      const registry = WorldStorageAdapter.loadRegistry()
      const foundId = Object.keys(registry.players).find(id => registry.players[id].name === title)
      if (foundId) {
        targetName = title
        targetStats = WorldStorageAdapter.getPlayerStats(foundId, title)
      }
    }
  }

  // 2. Only proceed and cancel if a valid target was identified
  if (!targetStats) return

  // 3. Absolute priority cancellation for stats books
  event.cancel = true

  // 4. Display menu
  system.run(() => {
    showStatsMenu(player, targetName, targetStats)
  })
}