import { ItemDurabilityComponent, ItemEnchantableComponent } from "@minecraft/server";
import { randomNum } from "./math";
function calculateFortune(enchantLevel, levels) {
  let extraItems = 0;
  if (enchantLevel > 3) {
    enchantLevel = 3;
  } else if (enchantLevel <= 0) enchantLevel = 1;
  const level = levels[enchantLevel - 1];
  for (let i = 0; i < level.amount; i++) {
    if (Math.random() * 100 <= (i === 0 ? level.initialChance ? level.initialChance : level.chance : level.chance)) extraItems++;
  }
  return extraItems;
}
function reduceDurability(player, item) {
  const comp = item.getComponent(ItemDurabilityComponent.componentId);
  if (!comp) return item;
  const enchantComp = item.getComponent(ItemEnchantableComponent.componentId);
  if (enchantComp) {
    const unbreaking = enchantComp.getEnchantment("unbreaking") || enchantComp.getEnchantment("minecraft:unbreaking");
    if ((unbreaking == null ? void 0 : unbreaking.level) !== void 0) {
      if (Math.random() * 100 > 100 / (unbreaking.level + 1)) return item;
      if (comp.damage + 1 > comp.maxDurability) {
        player.dimension.playSound("random.break", player.location);
        return void 0;
      } else {
        comp.damage++;
        return item;
      }
    } else if (comp.damage + 1 > comp.maxDurability) {
      player.dimension.playSound("random.break", player.location);
      return void 0;
    } else {
      comp.damage++;
      return item;
    }
  } else if (comp.damage + 1 > comp.maxDurability) {
    player.dimension.playSound("random.break", player.location);
    return void 0;
  } else {
    comp.damage++;
    return item;
  }
}
function spawnItem(item, dimension, location, velocity) {
  const itemEntity = dimension.spawnItem(item, { x: location.x, y: 100, z: location.z });
  itemEntity.teleport(location);
  if (velocity !== false) itemEntity == null ? void 0 : itemEntity.applyImpulse({
    x: randomNum(-0.1, 0.1),
    y: randomNum(0.1, 0.25),
    z: randomNum(-0.1, 0.1)
  });
  return itemEntity;
}
function getToolLevel(item) {
  let level = 5;
  if (item.typeId.includes("wooden_")) {
    level = 1;
  } else if (item.typeId.includes("golden_")) {
    level = 1;
  } else if (item.typeId.includes("stone_") || item.typeId.includes("copper_")) {
    level = 2;
  } else if (item.typeId.includes("iron_") || item.typeId === "better_on_bedrock:amethyst_pickaxe") {
    level = 3;
  } else if (item.typeId.includes("diamond_")) {
    level = 4;
  }
  return level;
}
export {
  calculateFortune,
  getToolLevel,
  reduceDurability,
  spawnItem
};
