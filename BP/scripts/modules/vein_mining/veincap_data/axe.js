const AxeDefaultBlocks = {
  "$tagulkd_ess:tree_log_palm": {
    connectedBlocks: ["$includes_leaves", "$tagulkd_ess:tree_log_palm", "cc:coconut"]
  },
  "cc:coconut": {
    silkTouch: false,
    lowerDurability: false,
    default: false
  },
  "$includes_log": {
    connectedBlocks: ["$includes_leaves", "$includes_wood", "$taglog", "$tagminecraft:is_hoe_item_destructible"]
  },
  "$includes_wood": {
    connectedBlocks: ["$includes_log", "$includes_leaves", "$taglog", "$tagminecraft:is_hoe_item_destructible"]
  },
  "$taglog": {
    connectedBlocks: ["$includes_leaves", "$includes_wood", "$tagminecraft:is_hoe_item_destructible"]
  },
  "$includes_leaves": {
    silkTouch: false,
    lowerDurability: false,
    default: false,
    connectedLimit: 8
  },
  "$tagminecraft:is_hoe_item_destructible": {
    silkTouch: false,
    lowerDurability: false,
    default: false,
    connectedLimit: 8
  },
 
  "spark:tree_base_oak_mossy": {
    connectedBlocks: ["minecraft:oak_log", "minecraft:oak_wood"]
  },
  "spark:tree_base_oak_frost": {
    connectedBlocks: ["minecraft:oak_log", "minecraft:oak_wood"]
  },
  "spark:log_oak_mossy_1": {
    connectedBlocks: ["minecraft:oak_log", "minecraft:oak_wood"]
  },
  "spark:log_oak_frost": {
    connectedBlocks: ["minecraft:oak_log", "minecraft:oak_wood"]
  },
 
  "cc:thin_oak_log": {
    connectedBlocks: [
      "minecraft:oak_leaves",
      "minecraft:oak_wood",
      "minecraft:oak_log"
    ]
  },
  "cc:thin_birch_log": {
    connectedBlocks: [
      "minecraft:birch_leaves",
      "minecraft:birch_wood",
      "minecraft:birch_log"
    ]
  },
 
  "minecraft:oak_log": {
    connectedBlocks: [
      "minecraft:oak_leaves",
      "minecraft:oak_wood",
      "spark:oak_branch_slab",
      "spark:oak_branch_slab_up",
      "spark:oak_branch_slant",
      "spark:oak_branch_stair",
      "cc:thin_oak_log"
    ]
  },
  "spark:oak_branch_slab": {
    connectedBlocks: [
      "minecraft:oak_leaves",
      "minecraft:oak_log",
      "minecraft:oak_wood",
      "spark:oak_branch_slab_up",
      "spark:oak_branch_stair",
      "spark:oak_branch_slant"
    ]
  },
  "spark:oak_branch_slab_up": {
    connectedBlocks: [
      "minecraft:oak_leaves",
      "minecraft:oak_log",
      "minecraft:oak_wood",
      "spark:oak_branch_slab",
      "spark:oak_branch_stair",
      "spark:oak_branch_slant"
    ]
  },
  "spark:oak_branch_slant": {
    connectedBlocks: [
      "minecraft:oak_leaves",
      "minecraft:oak_log",
      "minecraft:oak_wood",
      "spark:oak_branch_slab",
      "spark:oak_branch_slab_up",
      "spark:oak_branch_stair"
    ]
  },
  "spark:oak_branch_stair": {
    connectedBlocks: [
      "minecraft:oak_leaves",
      "minecraft:oak_log",
      "minecraft:oak_wood",
      "spark:oak_branch_slab",
      "spark:oak_branch_slab_up",
      "spark:oak_branch_slant"
    ]
  },
 
  "minecraft:spruce_log": {
    connectedBlocks: [
      "minecraft:spruce_leaves",
      "minecraft:spruce_wood",
      "spark:spruce_branch_slab",
      "spark:spruce_branch_slab_up",
      "spark:spruce_branch_slant",
      "spark:spruce_branch_stair"
    ]
  },
  "spark:spruce_branch_slab": {
    connectedBlocks: [
      "minecraft:spruce_leaves",
      "minecraft:spruce_log",
      "minecraft:spruce_wood",
      "spark:spruce_branch_slab_up",
      "spark:spruce_branch_stair",
      "spark:spruce_branch_slant"
    ]
  },
  "spark:spruce_branch_slab_up": {
    connectedBlocks: [
      "minecraft:spruce_leaves",
      "minecraft:spruce_log",
      "minecraft:spruce_wood",
      "spark:spruce_branch_slab",
      "spark:spruce_branch_stair",
      "spark:spruce_branch_slant"
    ]
  },
  "spark:spruce_branch_slant": {
    connectedBlocks: [
      "minecraft:spruce_leaves",
      "minecraft:spruce_log",
      "minecraft:spruce_wood",
      "spark:spruce_branch_slab",
      "spark:spruce_branch_slab_up",
      "spark:spruce_branch_stair"
    ]
  },
  "spark:spruce_branch_stair": {
    connectedBlocks: [
      "minecraft:spruce_leaves",
      "minecraft:spruce_log",
      "minecraft:spruce_wood",
      "spark:spruce_branch_slab",
      "spark:spruce_branch_slab_up",
      "spark:spruce_branch_slant"
    ]
  },
 
  "minecraft:birch_log": {
    connectedBlocks: [
      "minecraft:birch_leaves",
      "minecraft:birch_wood",
      "spark:birch_branch_slab",
      "spark:birch_branch_slab_up",
      "spark:birch_branch_slant",
      "spark:birch_branch_stair",
      "cc:thin_birch_log"
    ]
  },
  "spark:birch_branch_slab": {
    connectedBlocks: [
      "minecraft:birch_leaves",
      "minecraft:birch_log",
      "minecraft:birch_wood",
      "spark:birch_branch_slab_up",
      "spark:birch_branch_stair",
      "spark:birch_branch_slant"
    ]
  },
  "spark:birch_branch_slab_up": {
    connectedBlocks: [
      "minecraft:birch_leaves",
      "minecraft:birch_log",
      "minecraft:birch_wood",
      "spark:birch_branch_slab",
      "spark:birch_branch_stair",
      "spark:birch_branch_slant"
    ]
  },
  "spark:birch_branch_slant": {
    connectedBlocks: [
      "minecraft:birch_leaves",
      "minecraft:birch_log",
      "minecraft:birch_wood",
      "spark:birch_branch_slab",
      "spark:birch_branch_slab_up",
      "spark:birch_branch_stair"
    ]
  },
  "spark:birch_branch_stair": {
    connectedBlocks: [
      "minecraft:birch_leaves",
      "minecraft:birch_log",
      "minecraft:birch_wood",
      "spark:birch_branch_slab",
      "spark:birch_branch_slab_up",
      "spark:birch_branch_slant"
    ]
  },
 
  "minecraft:jungle_log": {
    connectedBlocks: [
      "minecraft:jungle_leaves",
      "minecraft:jungle_wood",
      "spark:jungle_branch_slab",
      "spark:jungle_branch_slab_up",
      "spark:jungle_branch_slant",
      "spark:jungle_branch_stair"
    ]
  },
  "spark:jungle_branch_slab": {
    connectedBlocks: [
      "minecraft:jungle_leaves",
      "minecraft:jungle_log",
      "minecraft:jungle_wood",
      "spark:jungle_branch_slab_up",
      "spark:jungle_branch_stair",
      "spark:jungle_branch_slant"
    ]
  },
  "spark:jungle_branch_slab_up": {
    connectedBlocks: [
      "minecraft:jungle_leaves",
      "minecraft:jungle_log",
      "minecraft:jungle_wood",
      "spark:jungle_branch_slab",
      "spark:jungle_branch_stair",
      "spark:jungle_branch_slant"
    ]
  },
  "spark:jungle_branch_slant": {
    connectedBlocks: [
      "minecraft:jungle_leaves",
      "minecraft:jungle_log",
      "minecraft:jungle_wood",
      "spark:jungle_branch_slab",
      "spark:jungle_branch_slab_up",
      "spark:jungle_branch_stair"
    ]
  },
  "spark:jungle_branch_stair": {
    connectedBlocks: [
      "minecraft:jungle_leaves",
      "minecraft:jungle_log",
      "minecraft:jungle_wood",
      "spark:jungle_branch_slab",
      "spark:jungle_branch_slab_up",
      "spark:jungle_branch_slant"
    ]
  },
 
  "minecraft:acacia_log": {
    connectedBlocks: [
      "minecraft:acacia_leaves",
      "minecraft:acacia_wood",
      "spark:acacia_branch_slab",
      "spark:acacia_branch_slab_up",
      "spark:acacia_branch_slant",
      "spark:acacia_branch_stair"
    ]
  },
  "spark:acacia_branch_slab": {
    connectedBlocks: [
      "minecraft:acacia_leaves",
      "minecraft:acacia_log",
      "minecraft:acacia_wood",
      "spark:acacia_branch_slab_up",
      "spark:acacia_branch_stair",
      "spark:acacia_branch_slant"
    ]
  },
  "spark:acacia_branch_slab_up": {
    connectedBlocks: [
      "minecraft:acacia_leaves",
      "minecraft:acacia_log",
      "minecraft:acacia_wood",
      "spark:acacia_branch_slab",
      "spark:acacia_branch_stair",
      "spark:acacia_branch_slant"
    ]
  },
  "spark:acacia_branch_slant": {
    connectedBlocks: [
      "minecraft:acacia_leaves",
      "minecraft:acacia_log",
      "minecraft:acacia_wood",
      "spark:acacia_branch_slab",
      "spark:acacia_branch_slab_up",
      "spark:acacia_branch_stair"
    ]
  },
  "spark:acacia_branch_stair": {
    connectedBlocks: [
      "minecraft:acacia_leaves",
      "minecraft:acacia_log",
      "minecraft:acacia_wood",
      "spark:acacia_branch_slab",
      "spark:acacia_branch_slab_up",
      "spark:acacia_branch_slant"
    ]
  },
 
  "minecraft:dark_oak_log": {
    connectedBlocks: [
      "minecraft:dark_oak_leaves",
      "minecraft:dark_oak_wood",
      "spark:dark_oak_branch_slab",
      "spark:dark_oak_branch_slab_up",
      "spark:dark_oak_branch_slant",
      "spark:dark_oak_branch_stair"
    ]
  },
  "spark:dark_oak_branch_slab": {
    connectedBlocks: [
      "minecraft:dark_oak_leaves",
      "minecraft:dark_oak_log",
      "minecraft:dark_oak_wood",
      "spark:dark_oak_branch_slab_up",
      "spark:dark_oak_branch_stair",
      "spark:dark_oak_branch_slant"
    ]
  },
  "spark:dark_oak_branch_slab_up": {
    connectedBlocks: [
      "minecraft:dark_oak_leaves",
      "minecraft:dark_oak_log",
      "minecraft:dark_oak_wood",
      "spark:dark_oak_branch_slab",
      "spark:dark_oak_branch_stair",
      "spark:dark_oak_branch_slant"
    ]
  },
  "spark:dark_oak_branch_slant": {
    connectedBlocks: [
      "minecraft:dark_oak_leaves",
      "minecraft:dark_oak_log",
      "minecraft:dark_oak_wood",
      "spark:dark_oak_branch_slab",
      "spark:dark_oak_branch_slab_up",
      "spark:dark_oak_branch_stair"
    ]
  },
  "spark:dark_oak_branch_stair": {
    connectedBlocks: [
      "minecraft:dark_oak_leaves",
      "minecraft:dark_oak_log",
      "minecraft:dark_oak_wood",
      "spark:dark_oak_branch_slab",
      "spark:dark_oak_branch_slab_up",
      "spark:dark_oak_branch_slant"
    ]
  },
 
  "minecraft:mangrove_log": {
    connectedBlocks: [
      "minecraft:mangrove_leaves",
      "minecraft:mangrove_wood",
      "spark:mangrove_branch_slab",
      "spark:mangrove_branch_slab_up",
      "spark:mangrove_branch_slant",
      "spark:mangrove_branch_stair"
    ]
  },
  "spark:mangrove_branch_slab": {
    connectedBlocks: [
      "minecraft:mangrove_leaves",
      "minecraft:mangrove_log",
      "minecraft:mangrove_wood",
      "spark:mangrove_branch_slab_up",
      "spark:mangrove_branch_stair",
      "spark:mangrove_branch_slant"
    ]
  },
  "spark:mangrove_branch_slab_up": {
    connectedBlocks: [
      "minecraft:mangrove_leaves",
      "minecraft:mangrove_log",
      "minecraft:mangrove_wood",
      "spark:mangrove_branch_slab",
      "spark:mangrove_branch_stair",
      "spark:mangrove_branch_slant"
    ]
  },
  "spark:mangrove_branch_slant": {
    connectedBlocks: [
      "minecraft:mangrove_leaves",
      "minecraft:mangrove_log",
      "minecraft:mangrove_wood",
      "spark:mangrove_branch_slab",
      "spark:mangrove_branch_slab_up",
      "spark:mangrove_branch_stair"
    ]
  },
  "spark:mangrove_branch_stair": {
    connectedBlocks: [
      "minecraft:mangrove_leaves",
      "minecraft:mangrove_log",
      "minecraft:mangrove_wood",
      "spark:mangrove_branch_slab",
      "spark:mangrove_branch_slab_up",
      "spark:mangrove_branch_slant"
    ]
  },
 
  "minecraft:cherry_log": {
    connectedBlocks: [
      "minecraft:cherry_leaves",
      "minecraft:cherry_wood",
      "spark:cherry_branch_slab",
      "spark:cherry_branch_slab_up",
      "spark:cherry_branch_slant",
      "spark:cherry_branch_stair"
    ]
  },
  "spark:cherry_branch_slab": {
    connectedBlocks: [
      "minecraft:cherry_leaves",
      "minecraft:cherry_log",
      "minecraft:cherry_wood",
      "spark:cherry_branch_slab_up",
      "spark:cherry_branch_stair",
      "spark:cherry_branch_slant"
    ]
  },
  "spark:cherry_branch_slab_up": {
    connectedBlocks: [
      "minecraft:cherry_leaves",
      "minecraft:cherry_log",
      "minecraft:cherry_wood",
      "spark:cherry_branch_slab",
      "spark:cherry_branch_stair",
      "spark:cherry_branch_slant"
    ]
  },
  "spark:cherry_branch_slant": {
    connectedBlocks: [
      "minecraft:cherry_leaves",
      "minecraft:cherry_log",
      "minecraft:cherry_wood",
      "spark:cherry_branch_slab",
      "spark:cherry_branch_slab_up",
      "spark:cherry_branch_stair"
    ]
  },
  "spark:cherry_branch_stair": {
    connectedBlocks: [
      "minecraft:cherry_leaves",
      "minecraft:cherry_log",
      "minecraft:cherry_wood",
      "spark:cherry_branch_slab",
      "spark:cherry_branch_slab_up",
      "spark:cherry_branch_slant"
    ]
  },
 
  "minecraft:pale_oak_log": {
    connectedBlocks: [
      "minecraft:pale_oak_leaves",
      "minecraft:pale_oak_wood",
      "spark:pale_oak_branch_slab",
      "spark:pale_oak_branch_slab_up",
      "spark:pale_oak_branch_slant",
      "spark:pale_oak_branch_stair"
    ]
  },
  "spark:pale_oak_branch_slab": {
    connectedBlocks: [
      "minecraft:pale_oak_leaves",
      "minecraft:pale_oak_log",
      "minecraft:pale_oak_wood",
      "spark:pale_oak_branch_slab_up",
      "spark:pale_oak_branch_stair",
      "spark:pale_oak_branch_slant"
    ]
  },
  "spark:pale_oak_branch_slab_up": {
    connectedBlocks: [
      "minecraft:pale_oak_leaves",
      "minecraft:pale_oak_log",
      "minecraft:pale_oak_wood",
      "spark:pale_oak_branch_slab",
      "spark:pale_oak_branch_stair",
      "spark:pale_oak_branch_slant"
    ]
  },
  "spark:pale_oak_branch_slant": {
    connectedBlocks: [
      "minecraft:pale_oak_leaves",
      "minecraft:pale_oak_log",
      "minecraft:pale_oak_wood",
      "spark:pale_oak_branch_slab",
      "spark:pale_oak_branch_slab_up",
      "spark:pale_oak_branch_stair"
    ]
  },
  "spark:pale_oak_branch_stair": {
    connectedBlocks: [
      "minecraft:pale_oak_leaves",
      "minecraft:pale_oak_log",
      "minecraft:pale_oak_wood",
      "spark:pale_oak_branch_slab",
      "spark:pale_oak_branch_slab_up",
      "spark:pale_oak_branch_slant"
    ]
  },
 
  "spark:tree_base_spruce_mossy": {
    connectedBlocks: ["minecraft:spruce_log", "minecraft:spruce_wood"]
  },
  "spark:tree_base_spruce_frost": {
    connectedBlocks: ["minecraft:spruce_log", "minecraft:spruce_wood"]
  },
  "spark:log_spruce_mossy_1": {
    connectedBlocks: ["minecraft:spruce_log", "minecraft:spruce_wood"]
  },
  "spark:log_spruce_frost": {
    connectedBlocks: ["minecraft:spruce_log", "minecraft:spruce_wood"]
  },
 
  "spark:tree_base_birch_mossy": {
    connectedBlocks: ["minecraft:birch_log", "minecraft:birch_wood"]
  },
  "spark:tree_base_birch_frost": {
    connectedBlocks: ["minecraft:birch_log", "minecraft:birch_wood"]
  },
  "spark:log_birch_mossy_1": {
    connectedBlocks: ["minecraft:birch_log", "minecraft:birch_wood"]
  },
  "spark:log_birch_frost": {
    connectedBlocks: ["minecraft:birch_log", "minecraft:birch_wood"]
  },
 
  "spark:tree_base_jungle_mossy": {
    connectedBlocks: ["minecraft:jungle_log", "minecraft:jungle_wood"]
  },
  "spark:tree_base_jungle_frost": {
    connectedBlocks: ["minecraft:jungle_log", "minecraft:jungle_wood"]
  },
  "spark:log_jungle_mossy_1": {
    connectedBlocks: ["minecraft:jungle_log", "minecraft:jungle_wood"]
  },
  "spark:log_jungle_frost": {
    connectedBlocks: ["minecraft:jungle_log", "minecraft:jungle_wood"]
  },
 
  "spark:tree_base_acacia_mossy": {
    connectedBlocks: ["minecraft:acacia_log", "minecraft:acacia_wood"]
  },
  "spark:tree_base_acacia_frost": {
    connectedBlocks: ["minecraft:acacia_log", "minecraft:acacia_wood"]
  },
  "spark:log_acacia_mossy_1": {
    connectedBlocks: ["minecraft:acacia_log", "minecraft:acacia_wood"]
  },
  "spark:log_acacia_frost": {
    connectedBlocks: ["minecraft:acacia_log", "minecraft:acacia_wood"]
  },
 
  "spark:tree_base_big_oak_mossy": {
    connectedBlocks: ["minecraft:dark_oak_log", "minecraft:dark_oak_wood"]
  },
  "spark:tree_base_big_oak_frost": {
    connectedBlocks: ["minecraft:dark_oak_log", "minecraft:dark_oak_wood"]
  },
  "spark:log_big_oak_mossy_1": {
    connectedBlocks: ["minecraft:dark_oak_log", "minecraft:dark_oak_wood"]
  },
  "spark:log_big_oak_frost": {
    connectedBlocks: ["minecraft:dark_oak_log", "minecraft:dark_oak_wood"]
  },
 
  "spark:tree_base_mangrove_mossy": {
    connectedBlocks: ["minecraft:mangrove_log", "minecraft:mangrove_wood"]
  },
  "spark:tree_base_mangrove_frost": {
    connectedBlocks: ["minecraft:mangrove_log", "minecraft:mangrove_wood"]
  },
  "spark:log_mangrove_mossy_1": {
    connectedBlocks: ["minecraft:mangrove_log", "minecraft:mangrove_wood"]
  },
  "spark:log_mangrove_frost": {
    connectedBlocks: ["minecraft:mangrove_log", "minecraft:mangrove_wood"]
  },
 
  "spark:tree_base_cherry_mossy": {
    connectedBlocks: ["minecraft:cherry_log", "minecraft:cherry_wood"]
  },
  "spark:tree_base_cherry_frost": {
    connectedBlocks: ["minecraft:cherry_log", "minecraft:cherry_wood"]
  },
  "spark:log_cherry_mossy_1": {
    connectedBlocks: ["minecraft:cherry_log", "minecraft:cherry_wood"]
  },
  "spark:log_cherry_frost": {
    connectedBlocks: ["minecraft:cherry_log", "minecraft:cherry_wood"]
  },
 
  "spark:tree_base_pale_oak_mossy": {
    connectedBlocks: ["minecraft:pale_oak_log", "minecraft:pale_oak_wood"]
  },
  "spark:tree_base_pale_oak_frost": {
    connectedBlocks: ["minecraft:pale_oak_log", "minecraft:pale_oak_wood"]
  },
  "spark:log_pale_oak_mossy_1": {
    connectedBlocks: ["minecraft:pale_oak_log", "minecraft:pale_oak_wood"]
  },
  "spark:log_pale_oak_frost": {
    connectedBlocks: ["minecraft:pale_oak_log", "minecraft:pale_oak_wood"]
  },
  "minecraft:spruce_wood": {
    connectedBlocks: ["minecraft:spruce_leaves", "minecraft:spruce_log"]
  },
 
  "minecraft:birch_wood": {
    connectedBlocks: ["minecraft:birch_leaves", "minecraft:birch_log"]
  },
 
  "minecraft:jungle_wood": {
    connectedBlocks: ["minecraft:jungle_leaves", "minecraft:jungle_log"]
  },
 
  "minecraft:acacia_wood": {
    connectedBlocks: ["minecraft:acacia_leaves", "minecraft:acacia_log"]
  },
 
  "minecraft:dark_oak_wood": {
    connectedBlocks: ["minecraft:dark_oak_leaves", "minecraft:dark_oak_log"]
  },
 
  "minecraft:mangrove_wood": {
    connectedBlocks: ["minecraft:mangrove_leaves", "minecraft:mangrove_log"]
  },
  "minecraft:mangrove_roots": {
    connectedBlocks: ["minecraft:mangrove_log", "minecraft:mangrove_wood"]
  },
 
  "minecraft:cherry_wood": {
    connectedBlocks: ["minecraft:cherry_leaves", "minecraft:cherry_log"]
  },
 
  "minecraft:crimson_stem": {
    connectedBlocks: ["minecraft:nether_wart_block", "minecraft:shroomlight", "minecraft:crimson_hyphae"]
  },
  "minecraft:crimson_hyphae": {
    connectedBlocks: ["minecraft:nether_wart_block", "minecraft:shroomlight", "minecraft:crimson_stem"]
  },
 
  "minecraft:warped_stem": {
    connectedBlocks: ["minecraft:warped_wart_block", "minecraft:shroomlight", "minecraft:warped_hyphae"]
  },
  "minecraft:warped_hyphae": {
    connectedBlocks: ["minecraft:warped_wart_block", "minecraft:shroomlight", "minecraft:warped_stem"]
  },
 
  "minecraft:pale_oak_wood": {
    connectedBlocks: ["minecraft:pale_oak_leaves", "minecraft:pale_oak_log"]
  },
 
  "minecraft:mushroom_stem": {
    connectedBlocks: ["minecraft:brown_mushroom_block", "minecraft:red_mushroom_block"]
  },
  "minecraft:brown_mushroom_block": { default: false },
  "minecraft:red_mushroom_block": { default: false },
 
  "minecraft:oak_leaves": {
    connectedLimit: 3,
    lowerDurability: false,
    default: false,
    silkTouch: false
  },
  "minecraft:azalea_leaves": {
    connectedLimit: 8,
    connectedBlocks: ["minecraft:azalea_leaves_flowered"],
    lowerDurability: false,
    default: false,
    silkTouch: false
  },
  "minecraft:azalea_leaves_flowered": {
    connectedLimit: 8,
    lowerDurability: false,
    default: false,
    silkTouch: false,
    connectedBlocks: ["minecraft:azalea_leaves"]
  },
  "minecraft:spruce_leaves": {
    connectedLimit: 6,
    lowerDurability: false,
    default: false,
    silkTouch: false
  },
  "minecraft:birch_leaves": {
    connectedLimit: 3,
    lowerDurability: false,
    default: false,
    silkTouch: false
  },
  "minecraft:jungle_leaves": {
    connectedLimit: 7,
    lowerDurability: false,
    default: false,
    silkTouch: false
  },
  "minecraft:acacia_leaves": {
    connectedLimit: 3,
    lowerDurability: false,
    default: false,
    silkTouch: false
  },
  "minecraft:dark_oak_leaves": {
    connectedLimit: 5,
    lowerDurability: false,
    default: false,
    silkTouch: false
  },
  "minecraft:mangrove_leaves": {
    connectedLimit: 11,
    lowerDurability: false,
    default: false,
    silkTouch: false
  },
  "minecraft:cherry_leaves": {
    connectedLimit: 10,
    lowerDurability: false,
    default: false,
    silkTouch: false
  },
  "minecraft:nether_wart_block": {
    connectedLimit: 8,
    lowerDurability: false,
    default: false,
    silkTouch: false
  },
  "minecraft:warped_wart_block": {
    connectedLimit: 8,
    lowerDurability: false,
    default: false,
    silkTouch: false
  },
  "minecraft:pale_oak_leaves": {
    connectedLimit: 5,
    lowerDurability: false,
    default: false,
    silkTouch: false
  },
  "minecraft:shroomlight": {
    connectedBlocks: ["minecraft:warped_wart_block", "minecraft:nether_wart_block"],
    default: false,
    lowerDurability: false
  }
};
const AxeNoLeaves = {
  "$tagulkd_ess:tree_log_palm": {
    connectedBlocks: ["$tagulkd_ess:tree_log_palm", "cc:coconut"]
  },
  "cc:coconut": {
    silkTouch: false,
    lowerDurability: false,
    default: false
  },
  "$includes_log": {
    connectedBlocks: ["$includes_wood", "$taglog"]
  },
  "$includes_wood": {
    connectedBlocks: ["$includes_log", "$taglog"]
  },
  "$taglog": {
    connectedBlocks: ["$includes_wood"]
  },
  "cc:thin_oak_log": {
    connectedBlocks: [
      "minecraft:oak_wood",
      "minecraft:oak_log"
    ]
  },
  "cc:thin_birch_log": {
    connectedBlocks: [
      "minecraft:birch_wood",
      "minecraft:birch_log"
    ]
  },
  "minecraft:oak_log": {
    connectedBlocks: ["minecraft:oak_wood", "cc:thin_oak_log"]
  },
  "minecraft:spruce_log": {
    connectedBlocks: ["minecraft:spruce_wood"]
  },
  "minecraft:birch_log": {
    connectedBlocks: ["minecraft:birch_wood", "cc:thin_birch_log"]
  },
  "minecraft:jungle_log": {
    connectedBlocks: ["minecraft:jungle_wood"]
  },
  "minecraft:acacia_log": {
    connectedBlocks: ["minecraft:acacia_wood"]
  },
  "minecraft:dark_oak_log": {
    connectedBlocks: ["minecraft:dark_oak_wood"]
  },
  "minecraft:mangrove_log": {
    connectedBlocks: ["minecraft:mangrove_wood"]
  },
  "minecraft:mangrove_roots": {
    connectedBlocks: ["minecraft:mangrove_log", "minecraft:mangrove_wood"]
  },
  "minecraft:cherry_log": {
    connectedBlocks: ["minecraft:cherry_wood"]
  },
  "minecraft:crimson_stem": {
    connectedBlocks: ["minecraft:crimson_hyphae"]
  },
  "minecraft:warped_stem": {
    connectedBlocks: ["minecraft:warped_hyphae"]
  },
  "minecraft:pale_oak_log": {
    connectedBlocks: ["minecraft:pale_oak_wood"]
  },
  "minecraft:oak_wood": {
    connectedBlocks: ["minecraft:oak_log"]
  },
  "minecraft:spruce_wood": {
    connectedBlocks: ["minecraft:spruce_log"]
  },
  "minecraft:birch_wood": {
    connectedBlocks: ["minecraft:birch_log"]
  },
  "minecraft:jungle_wood": {
    connectedBlocks: ["minecraft:jungle_log"]
  },
  "minecraft:acacia_wood": {
    connectedBlocks: ["minecraft:acacia_log"]
  },
  "minecraft:dark_oak_wood": {
    connectedBlocks: ["minecraft:dark_oak_log"]
  },
  "minecraft:mangrove_wood": {
    connectedBlocks: ["minecraft:mangrove_log"]
  },
  "minecraft:cherry_wood": {
    connectedBlocks: ["minecraft:cherry_log"]
  },
  "minecraft:crimson_hyphae": {
    connectedBlocks: ["minecraft:crimson_stem"]
  },
  "minecraft:warped_hyphae": {
    connectedBlocks: ["minecraft:warped_stem"]
  },
  "minecraft:pale_oak_wood": {
    connectedBlocks: ["minecraft:pale_oak_log"]
  }
};
export {
  AxeDefaultBlocks,
  AxeNoLeaves
};
