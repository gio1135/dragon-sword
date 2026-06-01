const ShovelDefaultBlocks = {
  "minecraft:gravel": {
    fortune: {
      item: "minecraft:flint",
      levels: [
        { amount: 1, chance: 14 },
        { amount: 1, chance: 25 },
        { amount: 1, chance: 100 }
      ],
      replaceDefault: true
    }
  },
  "minecraft:clay": {}
};
export {
  ShovelDefaultBlocks
};
