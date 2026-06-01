import { EquipmentSlot } from "@minecraft/server";

export function handleAutoSwap(player) {
  const inventory = player.getComponent("minecraft:inventory")?.container;
  if (!inventory) return false;

  const currentSlot = player.selectedSlotIndex;
  const currentItem = inventory.getItem(currentSlot);
  if (!currentItem) return false;

  let bestSlot = -1;
  let minDamage = Infinity;

  for (let i = 0; i < inventory.size; i++) {
    if (i === currentSlot) continue;
    const item = inventory.getItem(i);
    if (!item || item.typeId !== currentItem.typeId) continue;
    const dur = item.getComponent("minecraft:durability");
    if (!dur) continue;
    if (dur.damage >= dur.maxDurability - 1) continue;
    if (dur.damage < minDamage) {
      minDamage = dur.damage;
      bestSlot = i;
    }
  }

  if (bestSlot !== -1) {
    inventory.swapItems(bestSlot, currentSlot, inventory);
    return true;
  }

  return false;
}

export function SwapReplacementTool(player, toolTypeId) {
  const inventory = player.getComponent("minecraft:inventory")?.container;
  if (!inventory || !toolTypeId) return false;

  let bestSlot = -1;
  let minDamage = Infinity;

  for (let i = 0; i < inventory.size; i++) {
    const item = inventory.getItem(i);
    if (!item || item.typeId !== toolTypeId) continue;
    const dur = item.getComponent("minecraft:durability");
    if (!dur || dur.damage >= dur.maxDurability - 1) continue;
    if (dur.damage < minDamage) {
      minDamage = dur.damage;
      bestSlot = i;
    }
  }

  if (bestSlot === -1) return false;

  if (bestSlot >= 0 && bestSlot <= 8) {
    player.selectedSlotIndex = bestSlot;
  } else {
    const currentSlot = player.selectedSlotIndex;
    if (currentSlot >= 0 && currentSlot <= 8) {
      inventory.swapItems(bestSlot, currentSlot, inventory);
    } else {
      inventory.moveItem(bestSlot, 0, inventory);
      player.selectedSlotIndex = 0;
    }
  }

  player.playSound("random.orb", { pitch: 0.6 });
  return true;
}

export function HandleDurability(player, tool, equipment) {
  if (!tool?.hasComponent("minecraft:durability")) return;

  const dur = tool.getComponent("minecraft:durability");
  const ench = tool.getComponent("minecraft:enchantable");
  const unb = (ench?.getEnchantment("unbreaking") || ench?.getEnchantment("minecraft:unbreaking"))?.level || 0;

  const chance = 1 / (unb + 1);
  if (Math.random() < chance) {
    dur.damage++;
  }
  if (dur.damage >= dur.maxDurability) {
    player.playSound("random.break");
    equipment.setEquipment(EquipmentSlot.Mainhand, undefined);
  } else {
    equipment.setEquipment(EquipmentSlot.Mainhand, tool);
  }
}
