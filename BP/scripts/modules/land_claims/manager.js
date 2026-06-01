import { world, system } from '@minecraft/server';
import { Settings, PlayerData } from './classes/data_model.js';
import { DS } from '../../core/ds.js';

/**
 * Claim Manager Singleton
 * Handles Loading, Saving, and Accessing Claim Data.
 */
class ClaimManagerClass {
  constructor() {
    this.database = [];
    this.settings = new Settings();
    this.isLoaded = false;

    // Initialize on World Load
    this.init();
  }

  init() {
    const load = () => {
      if (this.isLoaded) return;
      this.load();
      this.isLoaded = true;
      
      // Start Save Loop
      system.runInterval(() => this.save(), 1200); // 60 seconds
    };

    system.run(() => {
      // Basic check
      try {
        world.getDynamicPropertyIds();
        load();
      } catch (e) {
        // Wait for load without using beta worldLoad event
        const loadCheckId = system.runInterval(() => {
          try {
            world.getDynamicPropertyIds();
            load();
            system.clearRun(loadCheckId);
          } catch (e2) {}
        }, 10);
      }
    });

    // Save on Shutdown
    // system.beforeEvents.shutdown.subscribe(() => this.save());
  }

  load() {
    try {
      // 1. Settings
      const settingsJson = world.getDynamicProperty('settings');
      if (settingsJson) {
        this.settings = Settings.fromJSON(JSON.parse(settingsJson));
      } else {
        // First Run?
        this.saveSettings();
      }

      // 2. Database (Players)
      this.database = [];
      const ids = world.getDynamicPropertyIds();
      
      for (const id of ids) {
        if (id.startsWith('db.')) {
          try {
            const json = world.getDynamicProperty(id);
            const pd = PlayerData.fromJSON(JSON.parse(json));
            if (pd) {
              // Prune invalid claims immediately
              const initialCount = pd.claims.length;
              pd.claims = pd.claims.filter(c => c && c.start && c.end);
              if (pd.claims.length < initialCount) {
                DS.log(`Pruned ${initialCount - pd.claims.length} invalid claims for ${pd.name}`);
              }
              this.database.push(pd);
            }
          } catch (e) {
            DS.log(`Failed to load player data ${id}: ${e}`);
          }
        }
      }
    } catch (e) {
      DS.log('Critical error loading claims: ' + e);
    }
  }

  save() {
    try {
      this.saveSettings();
      for (const pd of this.database) {
        world.setDynamicProperty(`db.${pd.id}`, JSON.stringify(pd));
      }
    } catch (e) {
      DS.log('Error saving claims: ' + e);
    }
  }

  saveSettings() {
    world.setDynamicProperty('settings', JSON.stringify(this.settings));
  }

  // --- Accessors ---

  getPlayer(id) {
    return this.database.find(p => p.id === id);
  }

  getOrCreatePlayer(player) {
    let pd = this.getPlayer(player.id);
    if (!pd) {
      pd = new PlayerData(player.id, player.name);
      this.database.push(pd);
    }
    // Update name if changed
    if (pd.name !== player.name) pd.name = player.name;

    // Deduplicate Database
    const unique = new Map();
    for (const pd of this.database) {
      if (!unique.has(pd.id)) unique.set(pd.id, pd);
    }
    this.database = Array.from(unique.values());

    return pd;
  }

  // --- Helpers ---

  /**
   * Run a callback for every claim in existence.
   */
  runInAllClaims(callback) {
    for (const pd of this.database) {
      if (!pd.claims) continue;
      for (const claim of pd.claims) {
        if (!claim || !claim.start || !claim.end) {
          continue;
        }
        callback(claim);
      }
    }
  }

  deletePlayer(id) {
    this.database = this.database.filter(p => p.id !== id);
    // setDynamicProperty to undefined/null deletes it
    world.setDynamicProperty(`db.${id}`, undefined);
  }

  /**
   * Find claims overlapping a point or area
   */
  getClaimsAt(location) {
    const hits = [];
    this.runInAllClaims(c => {
      if (c.isOverlap(location)) hits.push(c);
    });
    return hits;
  }
}

export const ClaimManager = new ClaimManagerClass();
