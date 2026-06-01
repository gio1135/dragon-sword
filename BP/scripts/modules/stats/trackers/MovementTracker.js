/**
 * Movement tracker - tracks player movement and travel statistics
 *
 * Handles:
 * - Distance traveled (walking, sprinting, swimming, etc.)
 * - Vehicle travel (boats, horses, minecarts, etc.)
 * - Coordinate extremes (highest, lowest, furthest)
 * - Biome discovery and time tracking
 * - Jump tracking
 */

import { world, system, InputButton, ButtonState, EquipmentSlot } from '@minecraft/server'
import { BaseTracker } from './BaseTracker.js'
import {
  STORAGE_KEYS,
  UPDATE_INTERVALS,
  RIDEABLE_ENTITIES,
  VEHICLE_STAT_MAP,
  cleanTypeId
} from '../core/constants.js'

const TRAVEL = STORAGE_KEYS.TRAVEL
const CORE = STORAGE_KEYS.CORE

export class MovementTracker extends BaseTracker {
  constructor() {
    super()
    /**
     * Track player positions for distance calculation
     * @type {Map<string, {x: number, y: number, z: number, dimension: string}>}
     */
    this.lastPositions = new Map()
  }

  registerEvents() {
    // Movement tracking interval (every 5 seconds)
    system.runInterval(() => {
      this.updateMovement()
    }, UPDATE_INTERVALS.MOVEMENT)

    // Jump detection via button input event
    world.afterEvents.playerButtonInput.subscribe((event) => {
      this.onButtonInput(event)
    })
  }

  /**
   * Handle button input for jump detection
   * @param {PlayerButtonInputAfterEvent} event
   */
  onButtonInput(event) {
    // Only track jump button presses
    if (event.button !== InputButton.Jump) return
    if (event.state !== ButtonState.Pressed) return

    const player = event.player

    // Do not count jumps while flying, gliding, or swimming
    if (player.isFlying || player.isGliding || player.isSwimming) return

    this.increment(player, CORE, 'movement.jumped', 1)
  }

  /**
   * Update movement for all online players
   */
  updateMovement() {
    for (const player of world.getAllPlayers()) {
      try {
        this.trackPlayerMovement(player)
        this.trackCoordinates(player)
        this.trackBiome(player)
      } catch {
        // Player may have disconnected
      }
    }
  }

  /**
   * Track movement for a single player
   * @param {Player} player
   */
  trackPlayerMovement(player) {
    const playerId = player.id
    const location = player.location
    const dimension = player.dimension.id

    const lastPos = this.lastPositions.get(playerId)

    // First position - just store it
    if (!lastPos || lastPos.dimension !== dimension) {
      this.lastPositions.set(playerId, {
        x: location.x,
        y: location.y,
        z: location.z,
        dimension: dimension
      })
      return
    }

    // Calculate distance moved
    const dx = location.x - lastPos.x
    const dy = location.y - lastPos.y
    const dz = location.z - lastPos.z

    const horizontalDistance = Math.sqrt(dx * dx + dz * dz)
    const totalDistance = Math.sqrt(dx * dx + dy * dy + dz * dz)

    // Only track if player actually moved
    if (totalDistance < 0.01) return

    // Convert to blocks (1 block = 100 cm like java)
    const distanceCm = Math.round(horizontalDistance * 100)
    const verticalCm = Math.round(Math.abs(dy) * 100)

    // Update last position
    this.lastPositions.set(playerId, {
      x: location.x,
      y: location.y,
      z: location.z,
      dimension: dimension
    })

    // Check if riding a vehicle
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
      // Riding component may not be available
    }

    // Track based on movement type
    if (player.isGliding) {
      this.increment(player, TRAVEL, 'distance.flown', distanceCm)
    } else if (player.isSwimming) {
      this.increment(player, TRAVEL, 'distance.swum', distanceCm)
    } else if (player.isInWater && !player.isOnGround) {
      // Walking underwater
      this.increment(player, TRAVEL, 'distance.underWater', distanceCm)
    } else if (player.isSprinting) {
      this.increment(player, TRAVEL, 'distance.sprinted', distanceCm)
    } else if (player.isSneaking) {
      this.increment(player, TRAVEL, 'distance.crouched', distanceCm)
    } else if (player.isOnGround) {
      this.increment(player, TRAVEL, 'distance.walked', distanceCm)
    }

    // Track falling distance (going down significantly)
    if (dy < -0.5 && !player.isGliding && !player.isFlying) {
      this.increment(player, TRAVEL, 'distance.fallen', verticalCm)
    }

    // Track climbing (going up while on ladder/vine or climbing)
    if (dy > 0.1) {
      // Check if player is climbing (on ladder/vine block)
      try {
        const blockBelow = player.dimension.getBlock({
          x: Math.floor(location.x),
          y: Math.floor(location.y),
          z: Math.floor(location.z)
        })
        const blockTypeId = blockBelow?.typeId || ''

        // Check for climbable blocks
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
        // Block access may fail
      }
    }
  }

  /**
   * Track vehicle travel distance
   * @param {Player} player
   * @param {Entity} vehicle
   * @param {number} distanceCm
   */
  trackVehicleDistance(player, vehicle, distanceCm) {
    const vehicleKey = VEHICLE_STAT_MAP[vehicle.typeId]
    if (!vehicleKey) return

    this.increment(player, TRAVEL, `vehicles.${vehicleKey}.distance`, distanceCm)

    // Also increment time (since we check every 5 seconds)
    this.increment(player, TRAVEL, `vehicles.${vehicleKey}.time`, UPDATE_INTERVALS.MOVEMENT)
  }

  /**
   * Track coordinate extremes
   * @param {Player} player
   */
  trackCoordinates(player) {
    const loc = player.location

    // Highest y coordinate
    this.max(player, CORE, 'coordinates.highest', Math.floor(loc.y))

    // Lowest y coordinate
    this.min(player, CORE, 'coordinates.lowest', Math.floor(loc.y))

    // Furthest from origin (horizontal)
    const distanceFromOrigin = Math.sqrt(loc.x * loc.x + loc.z * loc.z)
    this.max(player, CORE, 'coordinates.furthest', Math.floor(distanceFromOrigin))
  }

  /**
   * Track biome discovery and time
   * @param {Player} player
   */
  trackBiome(player) {
    try {
      const biomeId = player.dimension.getBiome(player.location).id
      if (biomeId) {
        const cleanId = cleanTypeId(biomeId)

        // Track discovery (add to set of discovered biomes)
        this.addToSet(player, CORE, 'biomes.discovered', cleanId)

        // Track time in this biome
        this.increment(player, CORE, `biomes.timeIn.${cleanId}`, UPDATE_INTERVALS.MOVEMENT)
      }
    } catch {
      // Biome API may fail in some situations
    }
  }

  /**
   * Clean up when player leaves
   * @param {string} playerId
   */
  onPlayerLeave(playerId) {
    this.lastPositions.delete(playerId)
  }
}