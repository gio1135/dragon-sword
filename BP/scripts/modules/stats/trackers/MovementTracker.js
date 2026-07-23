
import { world, system, InputButton, ButtonState, EquipmentSlot } from '@minecraft/server'
import { BaseTracker } from './BaseTracker.js'
import {
STORAGE_KEYS,
UPDATE_INTERVALS,
RIDEABLE_ENTITIES,
VEHICLE_STAT_MAP,
cleanTypeId
} from '../core/constants.js'
import { DimensionLock } from '../../dimension_lock/main.js'

const TRAVEL = STORAGE_KEYS.TRAVEL
const CORE = STORAGE_KEYS.CORE

export class MovementTracker extends BaseTracker {
constructor() {
 super()

 this.lastPositions = new Map()
}

registerEvents() {
 system.runInterval(() => {
 this.updateMovement()
 }, UPDATE_INTERVALS.MOVEMENT)

 world.afterEvents.playerButtonInput.subscribe((event) => {
 this.onButtonInput(event)
 })
}

onButtonInput(event) {
 if (event.button !== InputButton.Jump) return
 if (event.state !== ButtonState.Pressed) return

 const player = event.player

 if (player.isFlying || player.isGliding || player.isSwimming) return

 this.increment(player, CORE, 'movement.jumped', 1)
}

updateMovement() {
 for (const player of world.getAllPlayers()) {
 try {
  this.trackPlayerMovement(player)
  this.trackCoordinates(player)
  this.trackBiome(player)
 } catch {
 }
 }
}

trackPlayerMovement(player) {
 const playerId = player.id
 const location = player.location
 const dimension = player.dimension.id

 const lastPos = this.lastPositions.get(playerId)

 if (!lastPos || lastPos.dimension !== dimension) {
 this.lastPositions.set(playerId, {
  x: location.x,
  y: location.y,
  z: location.z,
  dimension: dimension
 })
 return
 }

 const dx = location.x - lastPos.x
 const dy = location.y - lastPos.y
 const dz = location.z - lastPos.z

 const horizontalDistance = Math.sqrt(dx * dx + dz * dz)
 const totalDistance = Math.sqrt(dx * dx + dy * dy + dz * dz)

 if (totalDistance < 0.01) return

 const distanceCm = Math.round(horizontalDistance * 100)
 const verticalCm = Math.round(Math.abs(dy) * 100)

 this.lastPositions.set(playerId, {
 x: location.x,
 y: location.y,
 z: location.z,
 dimension: dimension
 })

 try {
 const equippable = player.getComponent('minecraft:equippable')
 const riding = player.getComponent('minecraft:riding')
 if (riding) {
  const vehicle = riding.entityRidingOn
  if (vehicle && RIDEABLE_ENTITIES.has(vehicle.typeId)) {
  this.trackVehicleDistance(player, vehicle, distanceCm)
  return
  }
 }
 } catch {
 }

 if (DimensionLock.isEndLocked()) {
 this.set(player, TRAVEL, 'distance.flown', 0)
 }

 if (player.isGliding) {
 if (!DimensionLock.isEndLocked()) {
  this.increment(player, TRAVEL, 'distance.flown', distanceCm)
 }
 } else if (player.isSwimming) {
 this.increment(player, TRAVEL, 'distance.swum', distanceCm)
 } else if (player.isInWater && !player.isOnGround) {
 this.increment(player, TRAVEL, 'distance.underWater', distanceCm)
 } else if (player.isSprinting) {
 this.increment(player, TRAVEL, 'distance.sprinted', distanceCm)
 } else if (player.isSneaking) {
 this.increment(player, TRAVEL, 'distance.crouched', distanceCm)
 } else if (player.isOnGround) {
 this.increment(player, TRAVEL, 'distance.walked', distanceCm)
 }

 if (dy < -0.5 && !player.isGliding && !player.isFlying) {
 this.increment(player, TRAVEL, 'distance.fallen', verticalCm)
 }

 if (dy > 0.1) {
 try {
  const blockBelow = player.dimension.getBlock({
  x: Math.floor(location.x),
  y: Math.floor(location.y),
  z: Math.floor(location.z)
  })
  const blockTypeId = blockBelow?.typeId || ''

  if (blockTypeId.includes('ladder') ||
   blockTypeId.includes('vine') ||
   blockTypeId.includes('scaffolding') ||
   blockTypeId.includes('twisting_vines') ||
   blockTypeId.includes('weeping_vines') ||
   blockTypeId.includes('cave_vines')) {
  this.increment(player, TRAVEL, 'distance.climbed', verticalCm)
  this.increment(player, CORE, 'movement.climbed', verticalCm)
  }
 } catch {
 }
 }
}

trackVehicleDistance(player, vehicle, distanceCm) {
 const vehicleKey = VEHICLE_STAT_MAP[vehicle.typeId]
 if (!vehicleKey) return

 this.increment(player, TRAVEL, `vehicles.${vehicleKey}.distance`, distanceCm)

 this.increment(player, TRAVEL, `vehicles.${vehicleKey}.time`, UPDATE_INTERVALS.MOVEMENT)
}

trackCoordinates(player) {
 const loc = player.location

 this.max(player, CORE, 'coordinates.highest', Math.floor(loc.y))

 this.min(player, CORE, 'coordinates.lowest', Math.floor(loc.y))

 const distanceFromOrigin = Math.sqrt(loc.x * loc.x + loc.z * loc.z)
 this.max(player, CORE, 'coordinates.furthest', Math.floor(distanceFromOrigin))
}

trackBiome(player) {
 try {
 const biomeId = player.dimension.getBiome(player.location).id
 if (biomeId) {
  const cleanId = cleanTypeId(biomeId)

  this.addToSet(player, CORE, 'biomes.discovered', cleanId)

  this.increment(player, CORE, `biomes.timeIn.${cleanId}`, UPDATE_INTERVALS.MOVEMENT)
 }
 } catch {
 }
}

onPlayerLeave(playerId) {
 this.lastPositions.delete(playerId)
}
}