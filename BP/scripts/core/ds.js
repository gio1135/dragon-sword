import { world, system } from '@minecraft/server';
import { Config } from './config.js';
import { EventBus } from './events.js';
import { UI } from './ui.js';

class DragonSwordCore {
  constructor() {
    this.config = Config;
    this.events = new EventBus();
    this.ui = UI;
    this.world = world;
    this.system = system;
    this.initialized = false;
    
    // Debug Configuration
    this.debugMode = false;
    this.verbose = false;
  }

  // Logger
  log(message) {
    console.warn(`[Dragon Sword] ${message}`);
  }

  // Debug Logger (Ops Only)
  debug(message, sender = 'Core') {
    // Console
    if (this.verbose) {
      console.warn(`[DS-DEBUG] [${sender}] ${message}`);
    }

    // Chat (Ops)
    const players = world.getAllPlayers();
    for (const p of players) {
      if (p.hasTag('debug')) {
         p.sendMessage(`§7[DEBUG] [${sender}] ${message}`);
      }
    }
  }

  // Initialization
  init() {
    if (this.initialized) return;
    this.initialized = true;
  }
}

export const DS = new DragonSwordCore();
