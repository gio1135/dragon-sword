import { world, EquipmentSlot } from '@minecraft/server';
import { FeatureFlags } from '../../core/feature_flags.js';
import {
  SOUL_ALLAY_IDENTIFIERS,
  OFFHAND_SLOT,
  ARMOR_SLOTS_CONFIG,
  GEAR_DAMAGE,
  getSetting,
} from './config.js';

world.afterEvents.entityDie.subscribe(
  ({ deadEntity }) => {
    if (!FeatureFlags.isEnabled('keepinventory')) return;
    try {
      onPlayerDeath(deadEntity);
    } catch (e) {
      console.warn(`[DS] Failed to handle death of ${deadEntity.name}: ${e}`);
    }
  },
  { entityTypes: ['minecraft:player'] }
);

function onPlayerDeath(player) {
  let mode;
  try {
    mode = String(player.getGameMode()).toLowerCase();
  } catch {
    mode = 'survival';
  }
  if (mode !== 'survival' && mode !== 'adventure') return;

  const dimension = player.dimension;
  const inventory = player.getComponent('minecraft:inventory')?.container;
  const equippable = player.getComponent('minecraft:equippable');

  const { min, max } = dimension.heightRange;
  const location = { ...player.location };
  location.y = Math.min(Math.max(location.y, min + 1), max - 1);

  let allay;
  for (const id of SOUL_ALLAY_IDENTIFIERS) {
    try {
      allay = dimension.spawnEntity(id, location);
      if (allay) break;
    } catch {}
  }
  if (!allay) {
    console.warn('[DS] Could not spawn soul allay');
    return;
  }

  if (inventory) {
    for (let slot = 0; slot < inventory.size; slot++) {
      const item = inventory.getItem(slot);
      if (item) inventory.setItem(slot, penalizeItem(item));
    }
  }

  if (equippable) {
    for (const entry of ARMOR_SLOTS_CONFIG) {
      const item = equippable.getEquipment(entry.slot);
      if (item) equippable.setEquipment(entry.slot, penalizeItem(item));
    }
    const offhandItem = equippable.getEquipment(EquipmentSlot.Offhand);
    if (offhandItem) {
      equippable.setEquipment(EquipmentSlot.Offhand, penalizeItem(offhandItem));
    }
  }

  let totalXp = 0;
  try {
    totalXp = player.getTotalXp();
  } catch {}
  const keptXp = Math.floor(
    totalXp / Math.max(1, getSetting('xpPenaltyFactor')),
  );
  try {
    player.setDynamicProperty('32k:pending_xp', keptXp);
  } catch {}

  const storage = allay.getComponent('minecraft:inventory')?.container;
  if (!storage) {
    allay.remove();
    return;
  }

  let stored = 0;

  if (inventory) {
    for (let slot = 0; slot < inventory.size; slot++) {
      const item = inventory.getItem(slot);
      if (!item) continue;
      inventory.moveItem(slot, slot, storage);
      stored++;
    }
  }

  if (equippable) {
    const offhand = equippable.getEquipment(EquipmentSlot.Offhand);
    if (offhand) {
      storage.setItem(OFFHAND_SLOT, offhand);
      equippable.setEquipment(EquipmentSlot.Offhand, undefined);
      stored++;
    }

    for (const entry of ARMOR_SLOTS_CONFIG) {
      const armor = equippable.getEquipment(entry.slot);
      if (armor) {
        storage.setItem(entry.containerSlot, armor);
        equippable.setEquipment(entry.slot, undefined);
        stored++;
      }
    }
  }

  if (stored === 0) {
    try {
      const nearbyDrops = dimension.getEntities({
        location,
        maxDistance: 5,
        type: 'minecraft:item',
      });
      for (const drop of nearbyDrops) {
        const itemStack = drop.getComponent('minecraft:item')?.itemStack;
        if (itemStack) {
          const leftover = storage.addItem(itemStack);
          if (!leftover) {
            drop.remove();
            stored++;
          }
        }
      }
    } catch {}
  }

  if (stored === 0) {
    allay.remove();
    return;
  }

  try {
    allay.setDynamicProperty('32k:owner_id', player.id);
    allay.setDynamicProperty('32k:owner_name', player.name);
  } catch {}
  allay.nameTag = `§e${player.name}'s items`;
  try {
    allay.getComponent('minecraft:tameable')?.tame(player);
  } catch {}
  try {
    allay.runCommand('replaceitem entity @s slot.weapon.mainhand 0 chest');
  } catch {}
}

function penalizeItem(item) {
  const enchantable = item.getComponent('minecraft:enchantable');
  if (enchantable && hasEnchantment(enchantable, 'vanishing')) return undefined;

  const durability = item.getComponent('minecraft:durability');
  if (durability && getSetting('damageGear')) {
    const unbreaking = enchantable
      ? getEnchantmentLevel(enchantable, 'unbreaking')
      : 0;
    const fraction = GEAR_DAMAGE[Math.min(unbreaking, GEAR_DAMAGE.length - 1)];
    const extra = Math.max(1, Math.floor(durability.maxDurability * fraction));
    if (durability.damage + extra < durability.maxDurability) {
      durability.damage += extra;
    }
  }
  return item;
}

function hasEnchantment(enchantable, id) {
  return getEnchantmentLevel(enchantable, id) > 0;
}

function getEnchantmentLevel(enchantable, id) {
  try {
    return enchantable.getEnchantment(id)?.level ?? 0;
  } catch {
    return 0;
  }
}

world.afterEvents.playerSpawn.subscribe(({ player }) => {
  const pendingXp = player.getDynamicProperty('32k:pending_xp');
  if (pendingXp !== undefined) {
    player.resetLevel();
    if (pendingXp > 0) player.addExperience(pendingXp);
    player.setDynamicProperty('32k:pending_xp', undefined);
  }
});