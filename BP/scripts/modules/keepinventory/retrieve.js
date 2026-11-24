import { world, EquipmentSlot } from '@minecraft/server';
import {
  SOUL_ALLAY_IDENTIFIERS,
  OFFHAND_SLOT,
  ARMOR_SLOTS_CONFIG,
  getSetting,
} from './config.js';

world.afterEvents.playerInteractWithEntity.subscribe(({ player, target }) => {
  if (SOUL_ALLAY_IDENTIFIERS.includes(target.typeId)) collect(player, target);
});

world.afterEvents.entityHitEntity.subscribe(({ damagingEntity, hitEntity }) => {
  if (
    SOUL_ALLAY_IDENTIFIERS.includes(hitEntity.typeId) &&
    damagingEntity.typeId === 'minecraft:player'
  ) {
    collect(damagingEntity, hitEntity);
  }
});

function collect(player, allay) {
  if (!allay.isValid) return;

  const ownerId = allay.getDynamicProperty('32k:owner_id');
  if (getSetting('ownerOnly') && ownerId && ownerId !== player.id) {
    const owner = allay.getDynamicProperty('32k:owner_name') ?? 'someone else';
    player.sendMessage(`§cThis soul allay belongs to ${owner}`);
    return;
  }

  const storage = allay.getComponent('minecraft:inventory')?.container;
  const inventory = player.getComponent('minecraft:inventory')?.container;
  const equippable = player.getComponent('minecraft:equippable');

  if (!storage || !inventory) return;

  for (let slot = 0; slot < inventory.size; slot++) {
    if (storage.getItem(slot) && !inventory.getItem(slot)) {
      storage.moveItem(slot, slot, inventory);
    }
  }

  if (equippable) {
    const offhand = storage.getItem(OFFHAND_SLOT);
    if (offhand && !equippable.getEquipment(EquipmentSlot.Offhand)) {
      equippable.setEquipment(EquipmentSlot.Offhand, offhand);
      storage.setItem(OFFHAND_SLOT, undefined);
    }

    for (const entry of ARMOR_SLOTS_CONFIG) {
      const armor = storage.getItem(entry.containerSlot);
      if (armor && !equippable.getEquipment(entry.slot)) {
        equippable.setEquipment(entry.slot, armor);
        storage.setItem(entry.containerSlot, undefined);
      }
    }
  }

  for (let slot = 0; slot < storage.size; slot++) {
    const item = storage.getItem(slot);
    if (!item) continue;
    storage.setItem(slot, undefined);
    const leftover = inventory.addItem(item);
    if (leftover) player.dimension.spawnItem(leftover, player.location);
  }

  releaseAllay(allay);
}

export function releaseAllay(allay) {
  const { dimension, location } = allay;
  const storage = allay.getComponent('minecraft:inventory')?.container;
  if (storage) {
    for (let slot = 0; slot < storage.size; slot++) {
      const item = storage.getItem(slot);
      if (!item) continue;
      storage.setItem(slot, undefined);
      dimension.spawnItem(item, location);
    }
  }

  dimension.playSound('mob.allay.item_given', location);
  for (let i = 0; i < 25; i++) {
    dimension.spawnParticle('minecraft:endrod', {
      x: location.x + (Math.random() - 0.5) * 0.8,
      y: location.y + 0.3 + (Math.random() - 0.5) * 0.8,
      z: location.z + (Math.random() - 0.5) * 0.8,
    });
  }
  allay.remove();
}