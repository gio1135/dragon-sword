export class PermissionRegistry {
  static _permissions = new Map();

  static register(key, label, defaultValue = false) {
    this._permissions.set(key, { label, defaultValue });
  }

  static get(key) {
    return this._permissions.get(key);
  }

  static getAll() {
    return Array.from(this._permissions.values()).map((v, i) => ({
      key: Array.from(this._permissions.keys())[i],
      ...v,
    }));
  }

  static register(key, label, defaultValue = false, globalOnly = false) {
    this._permissions.set(key, { label, defaultValue, globalOnly });
  }

  static getKeys() {
    return Array.from(this._permissions.keys());
  }
}

PermissionRegistry.register('enterClaim', 'Enter claim', true);
PermissionRegistry.register('breakBlocks', 'Break blocks', false);
PermissionRegistry.register('useItemsOnBlocks', 'Use items on blocks', false);
PermissionRegistry.register('useDoors', 'Use doors and gates', true);
PermissionRegistry.register('useSwitches', 'Use switches and levers', false);
PermissionRegistry.register('openContainers', 'Open containers', false);
PermissionRegistry.register('useBeds', 'Use beds', false);
PermissionRegistry.register('allowTnt', 'Allow TNT', false, true);
PermissionRegistry.register('editSigns', 'Edit signs', false);
PermissionRegistry.register('useFishingRods', 'Use fishing rods', false);
PermissionRegistry.register('useThrowableWeapons', 'Throw potions', false);
PermissionRegistry.register(
  'useProjectileWeapons',
  'Use projectile weapons',
  false,
);
PermissionRegistry.register('useSpears', 'Use spears', false);
