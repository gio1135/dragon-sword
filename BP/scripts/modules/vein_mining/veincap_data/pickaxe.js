const PickaxeDefaultBlocks = {
  "minecraft:coal_ore": {
    connectedBlocks: ["minecraft:deepslate_coal_ore"],
    fortune: {
      item: "minecraft:coal",
      levels: [
        { amount: 2, initialChance: 66, chance: 33 },
        { amount: 3, initialChance: 50, chance: 25 },
        { amount: 4, initialChance: 40, chance: 20 }
      ]
    }
  },
  "minecraft:deepslate_coal_ore": {
    connectedBlocks: ["minecraft:coal_ore"],
    fortune: {
      item: "minecraft:coal",
      levels: [
        { amount: 2, initialChance: 66, chance: 33 },
        { amount: 3, initialChance: 50, chance: 25 },
        { amount: 4, initialChance: 40, chance: 20 }
      ]
    }
  },
  "cc:ruby_ore": {
    connectedBlocks: ["cc:deepslate_ruby_ore"]
  },
  "cc:deepslate_ruby_ore": {
    connectedBlocks: ["cc:ruby_ore"]
  },
  "minecraft:iron_ore": {
    connectedBlocks: ["minecraft:deepslate_iron_ore"],
    fortune: {
      item: "minecraft:raw_iron",
      levels: [
        { amount: 2, initialChance: 66, chance: 33 },
        { amount: 3, initialChance: 50, chance: 25 },
        { amount: 4, initialChance: 40, chance: 20 }
      ]
    }
  },
  "minecraft:deepslate_iron_ore": {
    connectedBlocks: ["minecraft:iron_ore"],
    fortune: {
      item: "minecraft:raw_iron",
      levels: [
        { amount: 2, initialChance: 66, chance: 33 },
        { amount: 3, initialChance: 50, chance: 25 },
        { amount: 4, initialChance: 40, chance: 20 }
      ]
    }
  },
  "minecraft:lapis_ore": {
    connectedBlocks: ["minecraft:deepslate_lapis_ore"],
    fortune: {
      item: "minecraft:lapis_lazuli",
      levels: [
        { amount: 18, initialChance: 66, chance: 33 },
        { amount: 27, initialChance: 50, chance: 25 },
        { amount: 36, initialChance: 40, chance: 20 }
      ]
    }
  },
  "minecraft:deepslate_lapis_ore": {
    connectedBlocks: ["minecraft:lapis_ore"],
    fortune: {
      item: "minecraft:lapis_lazuli",
      levels: [
        { amount: 18, initialChance: 66, chance: 33 },
        { amount: 27, initialChance: 50, chance: 25 },
        { amount: 36, initialChance: 40, chance: 20 }
      ]
    }
  },
  "minecraft:gold_ore": {
    connectedBlocks: ["minecraft:deepslate_gold_ore"],
    fortune: {
      item: "minecraft:raw_gold",
      levels: [
        { amount: 2, initialChance: 66, chance: 33 },
        { amount: 3, initialChance: 50, chance: 25 },
        { amount: 4, initialChance: 40, chance: 20 }
      ]
    }
  },
  "minecraft:deepslate_gold_ore": {
    connectedBlocks: ["minecraft:gold_ore"],
    fortune: {
      item: "minecraft:raw_gold",
      levels: [
        { amount: 2, initialChance: 66, chance: 33 },
        { amount: 3, initialChance: 50, chance: 25 },
        { amount: 4, initialChance: 40, chance: 20 }
      ]
    }
  },
  "minecraft:emerald_ore": {
    connectedBlocks: ["minecraft:deepslate_emerald_ore"],
    fortune: {
      item: "minecraft:emerald",
      levels: [
        { amount: 2, initialChance: 66, chance: 33 },
        { amount: 3, initialChance: 50, chance: 25 },
        { amount: 4, initialChance: 40, chance: 20 }
      ]
    }
  },
  "minecraft:deepslate_emerald_ore": {
    connectedBlocks: ["minecraft:emerald_ore"],
    fortune: {
      item: "minecraft:emerald",
      levels: [
        { amount: 2, initialChance: 66, chance: 33 },
        { amount: 3, initialChance: 50, chance: 25 },
        { amount: 4, initialChance: 40, chance: 20 }
      ]
    }
  },
  "minecraft:diamond_ore": {
    connectedBlocks: ["minecraft:deepslate_diamond_ore"],
    fortune: {
      item: "minecraft:diamond",
      levels: [
        { amount: 2, initialChance: 66, chance: 33 },
        { amount: 3, initialChance: 50, chance: 25 },
        { amount: 4, initialChance: 40, chance: 20 }
      ]
    }
  },
  "minecraft:deepslate_diamond_ore": {
    connectedBlocks: ["minecraft:diamond_ore"],
    fortune: {
      item: "minecraft:diamond",
      levels: [
        { amount: 2, initialChance: 66, chance: 33 },
        { amount: 3, initialChance: 50, chance: 25 },
        { amount: 4, initialChance: 40, chance: 20 }
      ]
    }
  },
  "minecraft:copper_ore": {
    connectedBlocks: ["minecraft:deepslate_copper_ore"],
    fortune: {
      item: "minecraft:raw_copper",
      levels: [
        { amount: 2, initialChance: 66, chance: 33 },
        { amount: 3, initialChance: 50, chance: 25 },
        { amount: 4, initialChance: 40, chance: 20 }
      ]
    }
  },
  "minecraft:deepslate_copper_ore": {
    connectedBlocks: ["minecraft:copper_ore"],
    fortune: {
      item: "minecraft:raw_copper",
      levels: [
        { amount: 2, initialChance: 66, chance: 33 },
        { amount: 3, initialChance: 50, chance: 25 },
        { amount: 4, initialChance: 40, chance: 20 }
      ]
    }
  },
  "minecraft:redstone_ore": {
    connectedBlocks: ["minecraft:lit_deepslate_redstone_ore", "minecraft:deepslate_redstone_ore", "minecraft:lit_redstone_ore"],
    fortune: {
      item: "minecraft:redstone",
      levels: [
        { amount: 2, initialChance: 66, chance: 33 },
        { amount: 3, initialChance: 50, chance: 25 },
        { amount: 4, initialChance: 40, chance: 20 }
      ]
    }
  },
  "minecraft:deepslate_redstone_ore": {
    connectedBlocks: ["minecraft:lit_deepslate_redstone_ore", "minecraft:redstone_ore", "minecraft:lit_redstone_ore"],
    fortune: {
      item: "minecraft:redstone",
      levels: [
        { amount: 2, initialChance: 66, chance: 33 },
        { amount: 3, initialChance: 50, chance: 25 },
        { amount: 4, initialChance: 40, chance: 20 }
      ]
    }
  },
  "minecraft:lit_redstone_ore": {
    connectedBlocks: ["minecraft:lit_deepslate_redstone_ore", "minecraft:deepslate_redstone_ore", "minecraft:redstone_ore"],
    fortune: {
      item: "minecraft:redstone",
      levels: [
        { amount: 2, initialChance: 66, chance: 33 },
        { amount: 3, initialChance: 50, chance: 25 },
        { amount: 4, initialChance: 40, chance: 20 }
      ]
    },
    silkTouch: "minecraft:redstone_ore"
  },
  "minecraft:lit_deepslate_redstone_ore": {
    connectedBlocks: ["minecraft:deepslate_redstone_ore", "minecraft:redstone_ore", "minecraft:lit_redstone_ore"],
    fortune: {
      item: "minecraft:redstone",
      levels: [
        { amount: 2, initialChance: 66, chance: 33 },
        { amount: 3, initialChance: 50, chance: 25 },
        { amount: 4, initialChance: 40, chance: 20 }
      ]
    },
    silkTouch: "minecraft:deepslate_redstone_ore"
  },
  "minecraft:nether_gold_ore": {
    fortune: {
      item: "minecraft:gold_nugget",
      levels: [
        { amount: 2, initialChance: 66, chance: 33 },
        { amount: 3, initialChance: 50, chance: 25 },
        { amount: 4, initialChance: 40, chance: 20 }
      ]
    }
  },
  "minecraft:quartz_ore": {
    fortune: {
      item: "minecraft:quartz",
      levels: [
        { amount: 2, initialChance: 66, chance: 33 },
        { amount: 3, initialChance: 50, chance: 25 },
        { amount: 4, initialChance: 40, chance: 20 }
      ]
    }
  },
  "minecraft:ancient_debris": {},
  "better_on_bedrock:tin_ore": {
    fortune: {
      item: "better_on_bedrock:raw_tin",
      levels: [
        { amount: 8, initialChance: 90, chance: 33 },
        { amount: 10, initialChance: 85, chance: 33 },
        { amount: 14, initialChance: 75, chance: 33 }
      ]
    }
  },
  "better_on_bedrock:alluminum_ore": {
    fortune: {
      item: "better_on_bedrock:raw_alluminum",
      levels: [
        { amount: 8, initialChance: 90, chance: 33 },
        { amount: 10, initialChance: 85, chance: 33 },
        { amount: 14, initialChance: 75, chance: 33 }
      ]
    }
  },
  "better_on_bedrock:stardust_ore": {
    fortune: {
      item: "better_on_bedrock:stardust_nugget",
      levels: [
        { amount: 6, initialChance: 90, chance: 33 },
        { amount: 8, initialChance: 85, chance: 33 },
        { amount: 12, initialChance: 75, chance: 33 }
      ]
    }
  },
  "better_on_bedrock:deepslate_stardust_ore": {
    fortune: {
      item: "better_on_bedrock:stardust_nugget",
      levels: [
        { amount: 6, initialChance: 90, chance: 33 },
        { amount: 8, initialChance: 85, chance: 33 },
        { amount: 12, initialChance: 75, chance: 33 }
      ]
    }
  },
  "better_on_bedrock:corstinite_ore": {
    fortune: {
      item: "better_on_bedrock:corstinite_ingot",
      levels: [
        { amount: 8, initialChance: 90, chance: 33 },
        { amount: 10, initialChance: 85, chance: 33 },
        { amount: 14, initialChance: 75, chance: 33 }
      ]
    }
  },
  "better_on_bedrock:ender_ore": {
    fortune: {
      item: "better_on_bedrock:enderium",
      levels: [
        { amount: 8, initialChance: 90, chance: 33 },
        { amount: 10, initialChance: 85, chance: 33 },
        { amount: 14, initialChance: 75, chance: 33 }
      ]
    }
  }
};
export {
  PickaxeDefaultBlocks
};
