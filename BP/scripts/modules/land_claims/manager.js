import { world, system } from '@minecraft/server';
import { Settings, PlayerData } from './classes/data_model.js';
import { DS } from '../../core/ds.js';

class ClaimManagerClass {
  constructor() {
    this.database = [];
    this.settings = new Settings();
    this.isLoaded = false;
    this.spatialCache = new Map();

    this.init();
  }

  rebuildCache() {
    this.spatialCache.clear();
    for (const pd of this.database) {
      if (!pd.claims) continue;
      for (const claim of pd.claims) {
        if (!claim || !claim.start || !claim.end) continue;
        
        const minX = Math.floor(Math.min(claim.start.x, claim.end.x) / 16);
        const maxX = Math.floor(Math.max(claim.start.x, claim.end.x) / 16);
        const minZ = Math.floor(Math.min(claim.start.z, claim.end.z) / 16);
        const maxZ = Math.floor(Math.max(claim.start.z, claim.end.z) / 16);
        
        for (let cx = minX; cx <= maxX; cx++) {
          for (let cz = minZ; cz <= maxZ; cz++) {
            const key = `${cx},${cz}`;
            if (!this.spatialCache.has(key)) this.spatialCache.set(key, []);
            this.spatialCache.get(key).push(claim);
          }
        }
      }
    }
  }

  init() {
    const load = () => {
      if (this.isLoaded) return;
      this.load();
      this.isLoaded = true;

      system.runInterval(() => this.save(), 1200);
    };

    system.run(() => {
      try {
        world.getDynamicPropertyIds();
        load();
      } catch (e) {
        const loadCheckId = system.runInterval(() => {
          try {
            world.getDynamicPropertyIds();
            load();
            system.clearRun(loadCheckId);
          } catch (e2) {}
        }, 10);
      }
    });
  }

  load() {
    try {
      const settingsJson = world.getDynamicProperty('settings');
      if (settingsJson) {
        this.settings = Settings.fromJSON(JSON.parse(settingsJson));
      } else {
        this.saveSettings();
      }

      this.database = [];
      const ids = world.getDynamicPropertyIds();

      for (const id of ids) {
        if (id.startsWith('db.')) {
          try {
            const json = world.getDynamicProperty(id);
            const pd = PlayerData.fromJSON(JSON.parse(json));
            if (pd) {
              const initialCount = pd.claims.length;
              pd.claims = pd.claims.filter((c) => c && c.start && c.end);
              if (pd.claims.length < initialCount) {
                DS.log(
                  `Pruned ${initialCount - pd.claims.length} invalid claims for ${pd.name}`,
                );
              }
              this.database.push(pd);
            }
          } catch (e) {
            DS.log(`Failed to load player data ${id}: ${e}`);
          }
        }
      }
      this.rebuildCache();
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

  getPlayer(id) {
    return this.database.find((p) => p.id === id);
  }

  getOrCreatePlayer(player) {
    let pd = this.getPlayer(player.id);
    if (!pd) {
      pd = new PlayerData(player.id, player.name);
      this.database.push(pd);
    }
    if (pd.name !== player.name) pd.name = player.name;

    const unique = new Map();
    for (const pd of this.database) {
      if (!unique.has(pd.id)) unique.set(pd.id, pd);
    }
    this.database = Array.from(unique.values());

    return pd;
  }

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
    this.database = this.database.filter((p) => p.id !== id);
    world.setDynamicProperty(`db.${id}`, undefined);
    this.rebuildCache();
  }

  getClaimsAt(location) {
    if (!this.spatialCache) return [];
    
    const cx = Math.floor(location.x / 16);
    const cz = Math.floor(location.z / 16);
    const key = `${cx},${cz}`;
    
    const claimsInChunk = this.spatialCache.get(key);
    if (!claimsInChunk) return [];
    
    const hits = [];
    for (const c of claimsInChunk) {
      if (c.isOverlap(location)) hits.push(c);
    }
    return hits;
  }
}

export const ClaimManager = new ClaimManagerClass();

DS.claims = {
  hasPermission: (location, player, permissionKey) => {
    if (!DS.config?.features?.land_claims && !ClaimManager.isLoaded) return true; // Fail open if claims aren't loaded or enabled
    const claims = ClaimManager.getClaimsAt(location);
    if (claims.length === 0) return true;
    for (const claim of claims) {
      if (!claim.hasPermission(permissionKey, player, ClaimManager.database)) {
        return false;
      }
    }
    return true;
  },
  getClaimsAt: (location) => {
    return ClaimManager.getClaimsAt(location);
  }
};