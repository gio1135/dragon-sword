import { world, system } from '@minecraft/server';
import { MODULES } from './generated_registry.js';

export class FeatureFlags {
  static get KEY() { return 'ds:features'; }

  static get FEATURES() {
    const features = {};
    for (const mod of MODULES) {
      if (mod.featureToggle) features[mod.id.toUpperCase()] = mod.id;
    }
    return features;
  }

  static get DEFAULTS() {
    const defaults = {};
    for (const mod of MODULES) {
      if (mod.featureToggle) defaults[mod.id] = mod.featureToggle.defaultEnabled;
    }
    return defaults;
  }

  static getFlags() {
    try {
      const data = world.getDynamicProperty(this.KEY);
      if (!data) return this.DEFAULTS;
      return { ...this.DEFAULTS, ...JSON.parse(data) };
    } catch {
      return this.DEFAULTS;
    }
  }

  static isEnabled(feature, flags = null) {
    if (!flags) flags = this.getFlags();
    return flags[feature] ?? true;
  }

  static setEnabled(feature, enabled) {
    const flags = this.getFlags();
    flags[feature] = enabled;
    world.setDynamicProperty(this.KEY, JSON.stringify(flags));
  }
}
