/**
 * Trackers module - exports all statistic trackers
 */

export { BaseTracker } from './BaseTracker.js'
export { PlayerTracker } from './PlayerTracker.js'
export { CombatTracker } from './CombatTracker.js'
export { BlockTracker } from './BlockTracker.js'
export { MovementTracker } from './MovementTracker.js'
export { InteractionTracker } from './InteractionTracker.js'
export { MiscTracker } from './MiscTracker.js'

import { PlayerTracker } from './PlayerTracker.js'
import { CombatTracker } from './CombatTracker.js'
import { BlockTracker } from './BlockTracker.js'
import { MovementTracker } from './MovementTracker.js'
import { InteractionTracker } from './InteractionTracker.js'
import { MiscTracker } from './MiscTracker.js'

/**
 * Initialize all trackers and wire up cross-references
 * @returns {Object} Object containing all tracker instances
 */
export function initializeTrackers() {
  // Create tracker instances
  const playerTracker = new PlayerTracker()
  const combatTracker = new CombatTracker()
  const blockTracker = new BlockTracker()
  const movementTracker = new MovementTracker()
  const interactionTracker = new InteractionTracker()
  const miscTracker = new MiscTracker()

  // Wire up cross-references
  combatTracker.setPlayerTracker(playerTracker)
  blockTracker.setInteractionTracker(interactionTracker)
  miscTracker.setInteractionTracker(interactionTracker)

  // Initialize all trackers
  playerTracker.initialize()
  combatTracker.initialize()
  blockTracker.initialize()
  movementTracker.initialize()
  interactionTracker.initialize()
  miscTracker.initialize()

  return {
    playerTracker,
    combatTracker,
    blockTracker,
    movementTracker,
    interactionTracker,
    miscTracker
  }
}