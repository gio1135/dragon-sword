import { EquipmentSlot } from "@minecraft/server";
import { IsBlockAllowedForTool } from "./vein_registry.js";
import { BLOCK_REQUIREMENTS } from "./registry.js";

export function GetBlockCategory(blockTypeId) {
  if (
    blockTypeId.includes("_ore") ||
    blockTypeId.includes("ancient_debris") ||
    blockTypeId.includes("raw_")
  )
    return "ores";
  if (
    blockTypeId.includes("log") ||
    blockTypeId.includes("wood") ||
    blockTypeId.includes("stem")
  )
    return "logs";
  if (
    blockTypeId.includes("stone") ||
    blockTypeId.includes("deepslate") ||
    blockTypeId.includes("tuff") ||
    blockTypeId.includes("granite")
  )
    return "stones";
  if (
    blockTypeId.includes("dirt") ||
    blockTypeId.includes("sand") ||
    blockTypeId.includes("gravel") ||
    blockTypeId.includes("clay")
  )
    return "shovel";
  if (blockTypeId.includes("leaves")) return "leaves";
  return "misc";
}

export function IsActivated(player) {
  if (player.hasTag("ds:disable_veinminer")) return false;

  const equipment = player.getComponent("minecraft:equippable");
  const heldItem = equipment?.getEquipment(EquipmentSlot.Mainhand);

  if (!heldItem) return false;

  if (!CheckDurability(heldItem)) {
    return false;
  }

  return player.isSneaking;
}

export function IsBlockAllowed(player, blockTypeId) {
  if (player.hasTag("ds:disable_veinminer")) return false;

  const equipment = player.getComponent("minecraft:equippable");
  const heldItem = equipment?.getEquipment(EquipmentSlot.Mainhand);
  if (!heldItem) return false;

  const enchant = heldItem.getComponent("minecraft:enchantable");
  const hasSilk =
    enchant?.getEnchantment("silk_touch") !== undefined ||
    enchant?.getEnchantment("minecraft:silk_touch") !== undefined;
  const hasFortune = 
    enchant?.getEnchantment("fortune") !== undefined ||
    enchant?.getEnchantment("minecraft:fortune") !== undefined;

  return IsBlockAllowedForTool(blockTypeId, heldItem.typeId, hasSilk, hasFortune);
}

export function CheckDurability(itemStack) {
  if (!itemStack) return true;

  const durability = itemStack.getComponent("minecraft:durability");
  if (!durability) return true;

  const remaining = durability.maxDurability - durability.damage;
  return remaining > 5;
}

export function getToolTier(toolId) {
  if (!toolId) return 0;
  if (toolId.includes("wooden_")) return 0;
  if (toolId.includes("gold_")) return 0;
  if (toolId.includes("stone_")) return 1;
  if (toolId.includes("iron_")) return 2;
  if (toolId.includes("diamond_")) return 3;
  if (toolId.includes("netherite_")) return 4;
  return 0;
}

export function CheckCanHarvest(blockId, tool) {
  if (!tool) return { allowed: false, requiredTier: 0 };
  
  const req = BLOCK_REQUIREMENTS[blockId];
  if (!req) return { allowed: true, requiredTier: 0 };

  const toolTier = getToolTier(tool.typeId);
  if (toolTier < req.tier) {
    return { allowed: false, requiredTier: req.tier };
  }

  return { allowed: true, requiredTier: req.tier };
}

export function ApplyExhaustion() {}
export function ApplyMassExhaustion() {}
export function CheckHunger() { return true; }
