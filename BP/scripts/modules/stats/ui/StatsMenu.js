import { ActionFormData } from '@minecraft/server-ui'
import { getStatsManager } from '../core/StatsManager.js'
import { StatsRenderer } from './StatsRenderer.js'

const PAGES = [
{ id: 'general', title: '§6General§r', subtitle: '§8Time played, sessions, xp, deaths§r', renderer: StatsRenderer.renderGeneral },
{ id: 'combat', title: '§cCombat§r', subtitle: '§8Kills, damage, deaths§r', renderer: StatsRenderer.renderCombat, detailRenderer: StatsRenderer.renderCombatDetails },
{ id: 'building', title: '§6Building§r', subtitle: '§8Blocks mined and placed§r', renderer: StatsRenderer.renderBuilding, detailRenderer: StatsRenderer.renderBuildingDetails },
{ id: 'exploration', title: '§bExploration§r', subtitle: '§8Distance, biomes, dimensions§r', renderer: StatsRenderer.renderExploration },
{ id: 'survival', title: '§2Survival§r', subtitle: '§8Items, food, interactions§r', renderer: StatsRenderer.renderSurvival, detailRenderer: StatsRenderer.renderSurvivalDetails },
{ id: 'misc', title: '§dMiscellaneous§r', subtitle: '§8Effects, emotes, raids§r', renderer: StatsRenderer.renderMisc }
]

export async function showStatsMenu(player, targetName, targetStats) {
const stats = targetStats || getStatsManager().getAllStats(player)
const displayName = targetName || player.name

await showMainMenu(player, stats, displayName)
}

async function showMainMenu(player, stats, displayName) {
const form = new ActionFormData()
 .title(`§l§6${displayName}'s stats`)

for (const page of PAGES) {
 form.button(`${page.title}\n${page.subtitle}`)
}

try {
 const response = await form.show(player)
 if (response.canceled) return

 const selectedPage = PAGES[response.selection]
 if (selectedPage) {
 await showCategoryPage(player, stats, selectedPage, displayName)
 }
} catch (error) {
 console.warn(`Failed to show menu: ${error.message}§r`)
}
}

async function showCategoryPage(player, stats, page, displayName) {
const content = page.renderer(stats)

const form = new ActionFormData()
 .title(`§l${page.id.charAt(0).toUpperCase() + page.id.slice(1)} stats§r`)
 .body(content)

if (page.detailRenderer) {
 form.button('§eView detailed stats\n§8full breakdown of all items§r')
}

try {
 const response = await form.show(player)

 if (response.canceled || !page.detailRenderer) {
 await showMainMenu(player, stats, displayName)
 return
 }

 if (response.selection === 0 && page.detailRenderer) {
 await showDetailPage(player, stats, page, displayName)
 }
} catch (error) {
 console.warn(`Failed to show category page: ${error.message}§r`)
}
}

async function showDetailPage(player, stats, page, displayName) {
const content = page.detailRenderer(stats)

const form = new ActionFormData()
 .title(`§l${page.id.charAt(0).toUpperCase() + page.id.slice(1)} - detailed§r`)
 .body(content)

try {
 await form.show(player)
 await showCategoryPage(player, stats, page, displayName)
} catch (error) {
 console.warn(`Failed to show detail page: ${error.message}§r`)
}
}