import { world, system } from "@minecraft/server";


const REGEN_TICK_THRESHOLD_FAST = 10; 
const REGEN_TICK_THRESHOLD_SLOW = 80; 
const COST_SATURATION = 1.5; 


const playerState = new Map();


system.runInterval(() => {
    
    try {
        if (world.gameRules.naturalRegeneration) {
            world.gameRules.naturalRegeneration = false;
        }
    } catch(e) {
        try { world.getDimension("overworld").runCommand("gamerule naturalregeneration false"); } catch(e){}
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
    
    
    if (!health || !hungerComp || !saturationComp) return;

    
    if (!playerState.has(player.id)) {
        playerState.set(player.id, { tickCounter: 0, exhaustion: 0 });
    }
    const state = playerState.get(player.id);
    state.tickCounter++;

    
    let hungerVal = hungerComp.value ?? hungerComp.currentValue ?? 0;
    let saturationVal = saturationComp.value ?? saturationComp.currentValue ?? 0;
    const maxHP = health.effectiveMax ?? 20;
    const currentHP = health.currentValue;

    
// Removed static flash tick tracking from top

    if (!("flashTicks" in state)) state.flashTicks = 0;

    let didHeal = false;

    if (currentHP >= maxHP) {
        state.tickCounter = 0;
    } else {
        if (saturationVal >= 1.0 && hungerVal >= 20) {
            if (state.tickCounter >= REGEN_TICK_THRESHOLD_FAST) {
                try {
                    health.setCurrentValue(Math.min(currentHP + 1, maxHP));
                    didHeal = true;
                    
                    let newSat = saturationVal - COST_SATURATION;
                    if (newSat < 0) newSat = 0;
                    
                    try {
                        if (saturationComp.setCurrentValue) saturationComp.setCurrentValue(newSat);
                        else saturationComp.currentValue = newSat;
                    } catch(e) {}
                    
                } catch(e) {}
                state.tickCounter = 0;
            }
        } 
        else if (hungerVal >= 18) {
            if (state.tickCounter >= REGEN_TICK_THRESHOLD_SLOW) {
                try {
                    health.setCurrentValue(Math.min(currentHP + 1, maxHP));
                    didHeal = true;

                    if (!state.exhaustion) state.exhaustion = 0;
                    state.exhaustion += 6.0;

                    let drops = 0;
                    while (state.exhaustion >= 4.0) {
                        drops++;
                        state.exhaustion -= 4.0;
                    }

                    if (drops > 0) {
                        try {
                            if (hungerComp.setCurrentValue) hungerComp.setCurrentValue(hungerVal - drops);
                            else hungerComp.currentValue -= drops;
                        } catch(e) {
                            try { player.addEffect("hunger", Math.ceil(drops * 4), { amplifier: 255, showParticles: false }); } catch(e){}
                        }
                    }

                } catch(e) {}
                state.tickCounter = 0;
            }
        }
    }

    if (didHeal) {
        state.flashTicks = 6; // Initiates a 6-tick double flash animation sequence
    }

    if (state.flashTicks > 0) {
        // Double flash pattern: ON (2 ticks) -> OFF (2 ticks) -> ON (2 ticks)
        if (state.flashTicks >= 5 || state.flashTicks <= 2) {
            player.onScreenDisplay.setActionBar("!regen");
        } else {
            player.onScreenDisplay.setActionBar(`!js.${Math.floor(saturationVal)}`);
        }
        state.flashTicks--;
    } else {
        player.onScreenDisplay.setActionBar(`!js.${Math.floor(saturationVal)}`);
    }
}
