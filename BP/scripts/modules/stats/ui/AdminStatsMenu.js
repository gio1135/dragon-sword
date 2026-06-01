import { world } from '@minecraft/server'
import { ActionFormData } from '@minecraft/server-ui'
import { WorldStorageAdapter } from '../core/WorldStorageAdapter.js'
import { getStatsManager } from '../core/StatsManager.js'
import { StatsRenderer } from './StatsRenderer.js'
import { formatRelativeTime } from '../utils/formatters.js'
import { showStatsMenu } from './StatsMenu.js'
import { runMigration } from '../migration.js'

const PAGES = [
  { id: 'general', title: '§6General§r', renderer: StatsRenderer.renderGeneral },
  { id: 'combat', title: '§cCombat§r', renderer: StatsRenderer.renderCombat },
  { id: 'building', title: '§6Building§r', renderer: StatsRenderer.renderBuilding },
  { id: 'exploration', title: '§bExploration§r', renderer: StatsRenderer.renderExploration },
  { id: 'survival', title: '§2Survival§r', renderer: StatsRenderer.renderSurvival },
  { id: 'misc', title: '§dMiscellaneous§r', renderer: StatsRenderer.renderMisc }
]

/**
 * Show the admin statistics menu
 * @param {Player} player - The admin player
 */
export async function showAdminStatsMenu(player) {
  const registry = WorldStorageAdapter.loadRegistry()
  const onlinePlayers = world.getAllPlayers()
  const onlineIds = new Set(onlinePlayers.map(p => p.id))

  // Build combined player list
  const players = []

  // Add online players first
  for (const p of onlinePlayers) {
    players.push({ id: p.id, name: p.name, online: true, lastSeen: Date.now() })
  }

  // Add offline players from registry
  if (registry?.players) {
    for (const [id, info] of Object.entries(registry.players)) {
      if (!onlineIds.has(id)) {
        players.push({ id, name: info.name, online: false, lastSeen: info.lastSeen })
      }
    }
  }

  if (players.length === 0) {
    const form = new ActionFormData()
      .title('§l§6Player statistics§r')
      .body('§7No players found\n\n§8Players will appear here after they join the world§r')
      const response = await form.show(player)
    return
  }

  const form = new ActionFormData()
    .title('§l§6Player statistics§r')
    .body(`§7Select a player to view their statistics\n§8${players.length} player(s) found§r`)

  form.button('§eMigrate legacy stats§r')

  // Add player buttons
  for (const p of players) {
    if (p.online) {
      form.button(`§2${p.name}\n§8Online§r`)
    } else {
      form.button(`§c${p.name}\n§8Last seen: ${formatRelativeTime(p.lastSeen)}§r`)
    }
  }

  try {
    const response = await form.show(player)
    if (response.canceled) return

    if (response.selection === 0) {
      runMigration()
      player.sendMessage('§aMigration process started check content log for details§r')
      await showAdminStatsMenu(player)
      return
    }

    const selectedPlayer = players[response.selection - 1]
    if (selectedPlayer) {
      const stats = WorldStorageAdapter.getPlayerStats(selectedPlayer.id, selectedPlayer.name)
      if (stats) {
        await showPlayerAdminMenu(player, selectedPlayer.name, selectedPlayer.id, stats, selectedPlayer.online)
      } else {
        player.sendMessage(`§cNo data available for ${selectedPlayer.name}§r`)
        await showAdminStatsMenu(player)
      }
    }
  } catch (error) {
    console.warn(`Failed to show player list: ${error.message}§r`)
  }
}

/**
 * Show the admin menu for a specific player
 * @param {Player} adminPlayer
 * @param {string} targetName
 * @param {string} targetId
 * @param {object} stats
 * @param {boolean} isOnline
 */
async function showPlayerAdminMenu(adminPlayer, targetName, targetId, stats, isOnline) {
  const statusText = isOnline ? '§a(Online)§r' : '§8(Offline)§r'

  const form = new ActionFormData()
    .title(`§l§6Manage ${targetName}§r`)
    .body(`§7Viewing statistics for §f${targetName} ${statusText}§r`)

  form.button('§eView statistics\n§8open the stats menu for this player§r')
  form.button('§cReset player stats\n§8permanently clear all data§r')

  try {
    const response = await form.show(adminPlayer)
    if (response.canceled) {
      await showAdminStatsMenu(adminPlayer)
      return
    }

    if (response.selection === 0) {
      await showStatsMenu(adminPlayer, targetName, stats)
      await showPlayerAdminMenu(adminPlayer, targetName, targetId, stats, isOnline)
    } else if (response.selection === 1) {
      await confirmAdminReset(adminPlayer, targetName, targetId, isOnline)
    }
  } catch (error) {
    console.warn(`Failed to show player admin menu: ${error.message}§r`)
  }
}

/**
 * Confirm admin reset of a player
 * @param {Player} adminPlayer
 * @param {string} targetName
 * @param {string} targetId
 * @param {boolean} isOnline
 */
async function confirmAdminReset(adminPlayer, targetName, targetId, isOnline) {
  const form = new ActionFormData()
    .title('§l§cReset player stats§r')
    .body(
      '§cWarning§r\n\n' +
      `§fThis will permanently delete all statistics for §6${targetName}§r\n\n` +
      '§7This action cannot be undone§r\n' +
      '§7Are you sure you want to reset their statistics?§r'
    )
    .button('§cCancel§r')
    .button('§aReset stats§r')

  try {
    const response = await form.show(adminPlayer)
    if (response.canceled || response.selection === 0) {
      const stats = WorldStorageAdapter.getPlayerStats(targetId, targetName)
      await showPlayerAdminMenu(adminPlayer, targetName, targetId, stats, isOnline)
      return
    }

    const success = getStatsManager().adminResetPlayer(targetId, targetName)
    if (success) {
      adminPlayer.sendMessage(`§aSuccessfully reset statistics for §6${targetName}§r`)
    } else {
      adminPlayer.sendMessage(`§cFailed to reset statistics for §6${targetName}§r`)
    }
    
    await showAdminStatsMenu(adminPlayer)
  } catch (error) {
    console.warn(`Failed to show reset confirmation: ${error.message}§r`)
  }
}