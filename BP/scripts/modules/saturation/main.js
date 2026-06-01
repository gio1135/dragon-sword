import { world, system } from '@minecraft/server';

const REGEN_TICK_THRESHOLD_FAST = 10;
const REGEN_TICK_THRESHOLD_SLOW = 80;
const COST_SATURATION = 1.0;

const playerState = new Map();

// Helper to set gamerules safely in modern API
async function setNaturalRegen(value) {
  try {
    world.gameRules.naturalRegeneration = value;
  } catch (e) {
    // Fallback to async command if direct property access fails
    await world.getDimension("overworld").runCommandAsync(`gamerule naturalregeneration ${value}`);
  }
}

system.runInterval(() => {
  if (world.gameRules.naturalRegeneration) {
    setNaturalRegen(false);
  }

  for (const player of world.getAllPlayers()) {
    if (!player.isValid) continue;
    processPlayer(player);
  }
}, 1);

function processPlayer(player) {
  const health = player.getComponent("minecraft:health");
  const saturationComp = player.getComponent("minecraft:player.saturation");
  const hungerComp = player.getComponent("minecraft:player.hunger");

  if (!health || !hungerComp || !saturationComp) {
    return;
  }

  if (!playerState.has(player.id)) {
    playerState.set(player.id, { tickCounter: 0, exhaustion: 0 });
  }

  const state = playerState.get(player.id);
  state.tickCounter++;

  const hungerVal = hungerComp.currentValue;
  const saturationVal = saturationComp.currentValue;
  const maxHP = health.effectiveMax ?? 20;
  const currentHP = health.currentValue;

  if (currentHP >= maxHP) {
    state.tickCounter = 0;
  } else {
    // Fast regen (saturation available)
    if (saturationVal >= 1.0 && hungerVal >= 20) {
      if (state.tickCounter >= REGEN_TICK_THRESHOLD_FAST) {
        try {
          health.setCurrentValue(Math.min(currentHP + 1, maxHP));
          
          let newSat = saturationVal - COST_SATURATION;
          if (newSat < 0) newSat = 0;
          
          saturationComp.setCurrentValue(newSat);
          
        } catch (e) {}
        state.tickCounter = 0;
      }
    } 
    // Slow regen (hunger only)
    else if (hungerVal >= 18) {
      if (state.tickCounter >= REGEN_TICK_THRESHOLD_SLOW) {
        try {
          health.setCurrentValue(Math.min(currentHP + 1, maxHP));

          if (!state.exhaustion) state.exhaustion = 0;
          state.exhaustion += 6.0;

          let drops = 0;
          while (state.exhaustion >= 4.0) {
            drops++;
            state.exhaustion -= 4.0;
          }

          if (drops > 0) {
            const newHunger = Math.max(0, hungerVal - drops);
            hungerComp.setCurrentValue(newHunger);
          }
        } catch (e) {}
        state.tickCounter = 0;
      }
    }
  }

  player.onScreenDisplay.setActionBar(`!js.${Math.floor(saturationVal)}`);
}