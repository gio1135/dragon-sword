import { world, system, EquipmentSlot, ItemStack } from '@minecraft/server'
import { ClaimManager } from '../land_claims/manager.js'
import { PermissionTypes } from '../land_claims/classes/data_model.js'
import { FeatureFlags } from '../../core/feature_flags.js'

const activeTeleports = new Map()

world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
const { player, block, itemStack } = ev
if (!itemStack) return

if (block.typeId === 'minecraft:lodestone') {
 if (itemStack.typeId === 'minecraft:compass' || itemStack.typeId === 'minecraft:lodestone_compass') {
 let hasPermission = true
 if (FeatureFlags.isEnabled(FeatureFlags.FEATURES.LAND_CLAIMS)) {
  ClaimManager.runInAllClaims(claim => {
  if (!hasPermission) return
  if (claim.isOverlap(block.location)) {
   if (!claim.hasPermission(PermissionTypes.USE_ITEMS_ON_BLOCKS, player, ClaimManager.database)) {
   hasPermission = false
   }
  }
  })
 }

 if (!hasPermission) {
  ev.cancel = true
  return
 }

 ev.cancel = true

 system.run(() => {
  const eq = player.getComponent('minecraft:equippable')
  const slot = eq.getEquipmentSlot(EquipmentSlot.Mainhand)

  const boundCompass = new ItemStack('minecraft:lodestone_compass', 1)
  const loc = block.location
  boundCompass.setLore([`§7${loc.x}, ${loc.y}, ${loc.z}`])

  if (itemStack.amount > 1) {
  slot.amount -= 1
  const inv = player.getComponent('minecraft:inventory').container
  let added = false
  for (let i = 0; i < inv.size; i++) {
   if (!inv.getItem(i)) {
   inv.setItem(i, boundCompass)
   added = true
   break
   }
  }
  if (!added) {
   player.dimension.spawnItem(boundCompass, player.location)
  }
  } else {
  slot.setItem(boundCompass)
  }
 })
 }
}
})

world.beforeEvents.itemUse.subscribe((ev) => {
const { source: player, itemStack } = ev
if (itemStack.typeId !== 'minecraft:lodestone_compass') return

const lore = itemStack.getLore()
if (!lore || lore.length === 0) return

const match = lore[0].match(/(-?\d+),\s*(-?\d+),\s*(-?\d+)/)
if (!match) return

ev.cancel = true

const targetX = parseInt(match[1])
const targetY = parseInt(match[2])
const targetZ = parseInt(match[3])

system.run(() => {
 if (activeTeleports.has(player.id)) return

 let block
 try {
 block = player.dimension.getBlock({ x: targetX, y: targetY, z: targetZ })
 } catch (e) {}

 if (!block || block.typeId !== 'minecraft:lodestone') {
 player.playSound('note.bass')
 return
 }

 const startLoc = player.location
 let ticks = 0
 const totalTicks = 100

 const tpInterval = system.runInterval(() => {
 const currentLoc = player.location

 const dist = Math.sqrt(
  Math.pow(currentLoc.x - startLoc.x, 2) +
  Math.pow(currentLoc.y - startLoc.y, 2) +
  Math.pow(currentLoc.z - startLoc.z, 2)
 )

 if (dist > 0.5) {
  player.onScreenDisplay.setActionBar('')
  system.clearRun(tpInterval)
  activeTeleports.delete(player.id)
  return
 }

 if (ticks >= totalTicks) {
  system.clearRun(tpInterval)
  activeTeleports.delete(player.id)

  let finalBlock
  try {
  finalBlock = player.dimension.getBlock({ x: targetX, y: targetY, z: targetZ })
  } catch (e) {}

  if (!finalBlock || finalBlock.typeId !== 'minecraft:lodestone') {
  player.onScreenDisplay.setActionBar('')
  player.playSound('note.bass')
  return
  }

  player.teleport({ x: targetX + 0.5, y: targetY + 1, z: targetZ + 0.5 }, { dimension: player.dimension })
  player.onScreenDisplay.setActionBar('')
  return
 }

 const remainingSeconds = Math.ceil((totalTicks - ticks) / 20)
 player.onScreenDisplay.setActionBar(`§bTeleporting in ${remainingSeconds}`)
 ticks += 10
 }, 10)

 activeTeleports.set(player.id, tpInterval)
})
})