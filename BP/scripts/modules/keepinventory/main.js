import { world, system } from '@minecraft/server';
import { FeatureFlags } from '../../core/feature_flags.js';
import './death.js';
import './retrieve.js';

export function enforceKeepInventory() {
  if (!FeatureFlags.isEnabled('keepinventory')) return;
  try {
    if (!world.gameRules.keepInventory) {
      world.gameRules.keepInventory = true;
    }
  } catch {
    try {
      world.getDimension('overworld').runCommand('gamerule keepinventory true');
    } catch {}
  }
}

system.run(enforceKeepInventory);

system.runInterval(enforceKeepInventory, 40);

world.afterEvents.playerSpawn.subscribe(() => {
  enforceKeepInventory();
});