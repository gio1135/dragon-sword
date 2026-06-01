import { system } from '@minecraft/server';
import { DS } from '../../core/ds.js';
import { DimensionLock } from '../dimension_lock/main.js';
import { ServerLock } from './server_lock.js';

import { FeatureFlags } from '../../core/feature_flags.js'
import { showAdminStatsMenu } from '../stats/ui/AdminStatsMenu.js'
import { MODULES } from '../../core/generated_registry.js'

// Helper ui
async function openFeatureTogglesUI(player) {
  const flags = FeatureFlags.getFlags();
  const form = DS.ui.modal('Feature toggles');

  // Build form dynamically based on MODULES
  const toggles = [];
  for (const mod of MODULES) {
    if (mod.featureToggle) {
      form.toggle(mod.name, flags[mod.id]);
      toggles.push(mod.id);
    }
  }
  
  const res = await form.submit().show(player);
  if (res.canceled) {
    DS.events.emit('ds:admin_open', { player }); 
    return;
  }
  
  // Save
  for (let i = 0; i < toggles.length; i++) {
    FeatureFlags.setEnabled(toggles[i], res.formValues[i]);
  }
  
  player.sendMessage('§aFeature flags updated');
}

function openDimensionManagement(player) {
  const netherLocked = DimensionLock.isNetherLocked();
  const endLocked = DimensionLock.isEndLocked();
  const C = DS.config.Colors;

  DS.ui.action('Dimension management')
    .button(netherLocked ? 'Unlock nether' : 'Lock nether', () => {
      const newVal = DimensionLock.toggleNether();
      player.sendMessage(newVal ? `${C.Red}Nether is now locked` : `${C.Green}Nether is now unlocked`);
      system.run(() => openDimensionManagement(player));
    })
    .button(endLocked ? 'Unlock end' : 'Lock end', () => {
      const newVal = DimensionLock.toggleEnd();
      player.sendMessage(newVal ? `${C.Red}The end is now locked` : `${C.Green}The end is now unlocked`);
      system.run(() => openDimensionManagement(player));
    })
    .back(() => {
       openAdminMenu(player);
    })
    .show(player);
}

DS.events.on('ds:admin_open', (data) => {
  const { player } = data;
  openAdminMenu(player);
});

function openAdminMenu(player) {
  const serverLocked = ServerLock.isLocked();
  const C = DS.config.Colors;

  const ui = DS.ui.action('Admin menu');
    
  for (const mod of MODULES) {
    if (mod.adminUI) {
      const uis = Array.isArray(mod.adminUI) ? mod.adminUI : [mod.adminUI];
      for (const uiObj of uis) {
        ui.button(uiObj.label, () => uiObj.method(player));
      }
    }
  }

  ui.button('Dimension management', () => {
      openDimensionManagement(player);
    })
    .button('Feature toggles', () => {
      openFeatureTogglesUI(player);
    })
    .button('Statistics', () => {
      showAdminStatsMenu(player);
    })
    .button(serverLocked ? 'Unlock server' : 'Lock server', () => {
      const newVal = ServerLock.toggle();
      player.sendMessage(newVal ? `${C.Red}Server is now LOCKED` : `${C.Green}Server is now UNLOCKED`);
      system.run(() => openAdminMenu(player));
    })
    .show(player);
}