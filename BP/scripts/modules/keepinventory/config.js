import { world, EquipmentSlot } from '@minecraft/server';

export const SOUL_ALLAY_IDENTIFIERS = ['32k:soul_allay'];
export const SOUL_ALLAY_ID = '32k:soul_allay';
export const OFFHAND_SLOT = 36;
export const ARMOR_SLOTS_CONFIG = [
  { slot: EquipmentSlot.Head, containerSlot: 37 },
  { slot: EquipmentSlot.Chest, containerSlot: 38 },
  { slot: EquipmentSlot.Legs, containerSlot: 39 },
  { slot: EquipmentSlot.Feet, containerSlot: 40 },
];

const DEFAULTS = {
  xpPenaltyFactor: 2,
  damageGear: true,
  ownerOnly: false,
};

export const GEAR_DAMAGE = [0.15, 0.125, 0.1, 0.075];

export function getSetting(key) {
  const val = world.getDynamicProperty(`32k:setting.${key}`);
  return val === undefined ? DEFAULTS[key] : val;
}

export function setSetting(key, value) {
  world.setDynamicProperty(`32k:setting.${key}`, value);
}

export function settingKeys() {
  return Object.keys(DEFAULTS);
}