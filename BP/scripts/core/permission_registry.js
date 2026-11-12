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

PermissionRegistry.register('enterClaim', 'Allow entering claim', true);
PermissionRegistry.register('breakBlocks', 'Allow breaking blocks', false);
PermissionRegistry.register('useItemsOnBlocks', 'Allow using items on blocks', false);
PermissionRegistry.register('useDoors', 'Allow doors and gates', true);
PermissionRegistry.register('useSwitches', 'Allow toggle redstone', false);
PermissionRegistry.register('openContainers', 'Allow opening containers', false);
PermissionRegistry.register('useBeds', 'Allow using beds', false);
PermissionRegistry.register('allowTnt', 'Allow TNT', false, true);
PermissionRegistry.register('editSigns', 'Allow editing signs', false);
PermissionRegistry.register('useFishingRods', 'Allow using fishing rods', false);
PermissionRegistry.register('useThrowableWeapons', 'Allow throwing potions', false);
PermissionRegistry.register(
  'useProjectileWeapons',
  'Allow using projectile weapons',
  false,
);
PermissionRegistry.register('useSpears', 'Allow using spears', false);
PermissionRegistry.register('allowAttackingPassiveMobs', 'Allow attacking passive mobs', false, true);
PermissionRegistry.register('allowAttackingHostileMobs', 'Allow attacking hostile mobs', true, true);
PermissionRegistry.register('allowAttackingNeutralMobs', 'Allow attacking neutral mobs', false, true);
PermissionRegistry.register('allowAttackingPets', 'Allow attacking pets', false, true);
PermissionRegistry.register('allowAttackingUtilityEntities', 'Allow attacking utility entities', false, true);
PermissionRegistry.register('allowPlayerCombat', 'Allow PVP', false, true);