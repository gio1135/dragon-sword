import { world, system } from '@minecraft/server';
import { DS } from '../../core/ds.js';

export class ServerLock {
  static get PROPERTY_ID() { return 'ds:server_locked'; }

  static isLocked() {
    const val = world.getDynamicProperty(this.PROPERTY_ID);
    return val === true;
  }

  static setLocked(locked) {
    world.setDynamicProperty(this.PROPERTY_ID, locked);
    if (locked) {
      this.kickNonOps();
    }
  }

  static toggle() {
    const newState = !this.isLocked();
    this.setLocked(newState);
    return newState;
  }

  static initialize() {
    world.afterEvents.playerSpawn.subscribe((ev) => {
        if (ev.player && ev.player.isValid) {
            this.checkPlayer(ev.player, 0);
        }
    });
  }

  static isPlayerOp(player) {
      // Tag Bypass (Emergency Access)
      if (player.hasTag('admin') || player.hasTag('staff') || player.hasTag('operator')) {
          return true;
      }

      let isOp = false;
      // Safe check for Op status
      if (player.isOp && typeof player.isOp === 'function') {
          isOp = player.isOp();
      } else {
          // Fallback: 1 is Operator level (Matches compass logic)
          isOp = player.commandPermissionLevel >= 1; 
      }
      
      return isOp;
  }

  static checkPlayer(player, attempt = 0) {
    if (!this.isLocked()) return; // Unlocked, strictly safe.

    if (this.isPlayerOp(player)) {
        return;
    }

    // Not valid yet?
    if (attempt < 3) {
        if (attempt === 0) player.sendMessage('§e[ServerLock] Server is LOCKED. Verifying admin status...');
        
        system.runTimeout(() => {
            if (player.isValid) this.checkPlayer(player, attempt + 1);
        }, 40); // Retry every 2 seconds (40 ticks)
        return;
    }

    // Failed all attempts
    this.kick(player);
  }

  static kickNonOps() {
    const players = world.getAllPlayers();
    for (const player of players) {
      if (!this.isPlayerOp(player)) {
        this.kick(player);
      }
    }
  }

  static kick(player) {
    try {
      player.runCommandAsync(`kick "${player.name}" §cServer is in LOCKDOWN MODE. Only Operators may join.`);
    } catch (e) {
      DS.log(`Failed to kick ${player.name}: ${e}`);
    }
  }
}

ServerLock.initialize();
