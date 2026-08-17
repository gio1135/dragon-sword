import { world, system } from '@minecraft/server';
import { Config } from './config.js';
import { EventBus } from './events.js';
import { UI } from './ui.js';
import { PermissionRegistry } from './permission_registry.js';

class DragonSwordCore {
  constructor() {
    this.config = Config;
    this.events = new EventBus();
    this.ui = UI;
    this.world = world;
    this.system = system;
    this.initialized = false;

    this.permissions = PermissionRegistry;
    this.claims = {
      hasPermission: (location, player, permissionKey) => true,
      getClaimsAt: (location) => []
    };

    this.debugMode = false;
    this.verbose = false;
  }

  log(message) {
    console.warn(`[Dragon Sword] ${message}`);
  }

  debug(message, sender = 'Core') {
    if (this.verbose) {
      console.warn(`[DS-DEBUG] [${sender}] ${message}`);
    }

    const players = world.getAllPlayers();
    for (const p of players) {
      if (p.hasTag('debug')) {
        p.sendMessage(`§7[DEBUG] [${sender}] ${message}`);
      }
    }
  }

  init() {
    if (this.initialized) return;
    this.initialized = true;
  }
}

export const DS = new DragonSwordCore();