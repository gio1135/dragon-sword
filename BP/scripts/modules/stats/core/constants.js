
export const VERSION = '1.0.0'

export const STORAGE_KEYS = {
CORE: 'ds:stats_core',
TRAVEL: 'ds:stats_travel',
COMBAT: 'ds:stats_combat',
BLOCKS: 'ds:stats_blocks',
ITEMS: 'ds:stats_items',
INTERACTIONS: 'ds:stats_interactions',
MISC: 'ds:stats_misc'
}

export const UPDATE_INTERVALS = {
MOVEMENT: 100,
TIME_TRACKING: 20,
FLUSH: 100
}

export const DEATH_CAUSE_MAP = {
'fall': 'Fall damage',
'fall_damage': 'Fall damage',
'drowning': 'Drowning',
'drown': 'Drowning',
'lava': 'Lava',
'fire': 'Fire',
'fire_tick': 'Fire',
'suffocation': 'Suffocation',
'suffocate': 'Suffocation',
'void': 'The void',
'outOfWorld': 'The void',
'starve': 'Starvation',
'starvation': 'Starvation',
'magic': 'Magic',
'wither': 'Wither effect',
'anvil': 'Falling anvil',
'fallingBlock': 'Falling block',
'thorns': 'Thorns',
'cactus': 'Cactus',
'flyIntoWall': 'Kinetic energy',
'cramming': 'Cramming',
'dryout': 'Drying out',
'freeze': 'Freezing',
'lightning': 'Lightning',
'explosion': 'Explosion',
'fireworks': 'Fireworks',
'projectile': 'Projectile',
'mob': 'Mob attack',
'player': 'Player attack',
'generic': 'Unknown'
}

export const DIMENSION_NAMES = {
'overworld': 'Overworld',
'minecraft:overworld': 'Overworld',
'nether': 'Nether',
'minecraft:nether': 'Nether',
'the_end': 'The end',
'minecraft:the_end': 'The end'
}

export function normalizeDimension(dimId) {
if (dimId.includes('nether')) return 'nether'
if (dimId.includes('end')) return 'the_end'
return 'overworld'
}

export const BLOCK_INTERACTION_MAP = {
'minecraft:chest': 'chest',
'minecraft:trapped_chest': 'trappedChest',
'minecraft:ender_chest': 'enderChest',
'minecraft:barrel': 'barrel',

'minecraft:copper_chest': 'copperChest',
'minecraft:exposed_copper_chest': 'copperChest',
'minecraft:weathered_copper_chest': 'copperChest',
'minecraft:oxidized_copper_chest': 'copperChest',
'minecraft:waxed_copper_chest': 'copperChest',
'minecraft:waxed_exposed_copper_chest': 'copperChest',
'minecraft:waxed_weathered_copper_chest': 'copperChest',
'minecraft:waxed_oxidized_copper_chest': 'copperChest',

'minecraft:shulker_box': 'shulkerBox',
'minecraft:white_shulker_box': 'shulkerBox',
'minecraft:orange_shulker_box': 'shulkerBox',
'minecraft:magenta_shulker_box': 'shulkerBox',
'minecraft:light_blue_shulker_box': 'shulkerBox',
'minecraft:yellow_shulker_box': 'shulkerBox',
'minecraft:lime_shulker_box': 'shulkerBox',
'minecraft:pink_shulker_box': 'shulkerBox',
'minecraft:gray_shulker_box': 'shulkerBox',
'minecraft:light_gray_shulker_box': 'shulkerBox',
'minecraft:cyan_shulker_box': 'shulkerBox',
'minecraft:purple_shulker_box': 'shulkerBox',
'minecraft:blue_shulker_box': 'shulkerBox',
'minecraft:brown_shulker_box': 'shulkerBox',
'minecraft:green_shulker_box': 'shulkerBox',
'minecraft:red_shulker_box': 'shulkerBox',
'minecraft:black_shulker_box': 'shulkerBox',
'minecraft:undyed_shulker_box': 'shulkerBox',

'minecraft:crafting_table': 'craftingTable',
'minecraft:furnace': 'furnace',
'minecraft:lit_furnace': 'furnace',
'minecraft:blast_furnace': 'blastFurnace',
'minecraft:lit_blast_furnace': 'blastFurnace',
'minecraft:smoker': 'smoker',
'minecraft:lit_smoker': 'smoker',
'minecraft:brewing_stand': 'brewingStand',
'minecraft:enchanting_table': 'enchantingTable',
'minecraft:anvil': 'anvil',
'minecraft:chipped_anvil': 'anvil',
'minecraft:damaged_anvil': 'anvil',
'minecraft:grindstone': 'grindstone',
'minecraft:stonecutter': 'stonecutter',
'minecraft:stonecutter_block': 'stonecutter',
'minecraft:cartography_table': 'cartographyTable',
'minecraft:loom': 'loom',
'minecraft:smithing_table': 'smithingTable',

'minecraft:beacon': 'beacon',
'minecraft:lectern': 'lectern',
'minecraft:jukebox': 'jukebox',
'minecraft:noteblock': 'noteblock.played',
'minecraft:bell': 'bell',
'minecraft:campfire': 'campfire',
'minecraft:soul_campfire': 'campfire',

'minecraft:cauldron': 'cauldron.used',
'minecraft:water_cauldron': 'cauldron.used',
'minecraft:lava_cauldron': 'cauldron.used',
'minecraft:powder_snow_cauldron': 'cauldron.used',
'minecraft:cake': 'cake',

'minecraft:dispenser': 'dispenser',
'minecraft:dropper': 'dropper',
'minecraft:hopper': 'hopper',
'minecraft:crafter': 'crafter'
}

export const FUNCTIONAL_BLOCKS = new Set(Object.keys(BLOCK_INTERACTION_MAP))

export const FOOD_ITEMS = new Set([
'minecraft:beef', 'minecraft:porkchop', 'minecraft:chicken',
'minecraft:mutton', 'minecraft:rabbit', 'minecraft:cod', 'minecraft:salmon',

'minecraft:cooked_beef', 'minecraft:cooked_porkchop', 'minecraft:cooked_chicken',
'minecraft:cooked_mutton', 'minecraft:cooked_rabbit', 'minecraft:cooked_cod',
'minecraft:cooked_salmon',

'minecraft:apple', 'minecraft:golden_apple', 'minecraft:enchanted_golden_apple',
'minecraft:melon_slice', 'minecraft:sweet_berries', 'minecraft:glow_berries',
'minecraft:carrot', 'minecraft:golden_carrot', 'minecraft:potato',
'minecraft:baked_potato', 'minecraft:poisonous_potato', 'minecraft:beetroot',
'minecraft:chorus_fruit',

'minecraft:bread', 'minecraft:cookie', 'minecraft:pumpkin_pie',
'minecraft:mushroom_stew', 'minecraft:beetroot_soup', 'minecraft:rabbit_stew',
'minecraft:suspicious_stew', 'minecraft:dried_kelp',

'minecraft:rotten_flesh', 'minecraft:spider_eye',
'minecraft:tropical_fish', 'minecraft:pufferfish',

'minecraft:honey_bottle', 'minecraft:milk_bucket'
])

export const CONSUMABLE_ITEMS = new Set([
'minecraft:potion', 'minecraft:splash_potion', 'minecraft:lingering_potion',

'minecraft:ender_pearl', 'minecraft:eye_of_ender', 'minecraft:snowball',
'minecraft:egg', 'minecraft:experience_bottle', 'minecraft:firework_rocket',

'minecraft:bow', 'minecraft:crossbow', 'minecraft:trident',
'minecraft:fishing_rod', 'minecraft:flint_and_steel', 'minecraft:shears',
'minecraft:brush',

'minecraft:totem_of_undying', 'minecraft:spyglass', 'minecraft:goat_horn',
'minecraft:fire_charge', 'minecraft:bone_meal',
'minecraft:lead', 'minecraft:name_tag',

'minecraft:bucket', 'minecraft:water_bucket', 'minecraft:lava_bucket',
'minecraft:powder_snow_bucket', 'minecraft:axolotl_bucket',
'minecraft:cod_bucket', 'minecraft:salmon_bucket', 'minecraft:tropical_fish_bucket',
'minecraft:pufferfish_bucket', 'minecraft:tadpole_bucket'
])

export const BREAKABLE_TOOLS = new Set([
'minecraft:wooden_pickaxe', 'minecraft:stone_pickaxe', 'minecraft:iron_pickaxe',
'minecraft:golden_pickaxe', 'minecraft:diamond_pickaxe', 'minecraft:netherite_pickaxe',

'minecraft:wooden_axe', 'minecraft:stone_axe', 'minecraft:iron_axe',
'minecraft:golden_axe', 'minecraft:diamond_axe', 'minecraft:netherite_axe',

'minecraft:wooden_shovel', 'minecraft:stone_shovel', 'minecraft:iron_shovel',
'minecraft:golden_shovel', 'minecraft:diamond_shovel', 'minecraft:netherite_shovel',

'minecraft:wooden_hoe', 'minecraft:stone_hoe', 'minecraft:iron_hoe',
'minecraft:golden_hoe', 'minecraft:diamond_hoe', 'minecraft:netherite_hoe',

'minecraft:wooden_sword', 'minecraft:stone_sword', 'minecraft:iron_sword',
'minecraft:golden_sword', 'minecraft:diamond_sword', 'minecraft:netherite_sword',

'minecraft:bow', 'minecraft:crossbow', 'minecraft:trident',
'minecraft:fishing_rod', 'minecraft:flint_and_steel', 'minecraft:shears',
'minecraft:brush', 'minecraft:carrot_on_a_stick', 'minecraft:warped_fungus_on_a_stick',
'minecraft:elytra', 'minecraft:shield', 'minecraft:mace',

'minecraft:leather_helmet', 'minecraft:leather_chestplate',
'minecraft:leather_leggings', 'minecraft:leather_boots',
'minecraft:chainmail_helmet', 'minecraft:chainmail_chestplate',
'minecraft:chainmail_leggings', 'minecraft:chainmail_boots',
'minecraft:iron_helmet', 'minecraft:iron_chestplate',
'minecraft:iron_leggings', 'minecraft:iron_boots',
'minecraft:golden_helmet', 'minecraft:golden_chestplate',
'minecraft:golden_leggings', 'minecraft:golden_boots',
'minecraft:diamond_helmet', 'minecraft:diamond_chestplate',
'minecraft:diamond_leggings', 'minecraft:diamond_boots',
'minecraft:netherite_helmet', 'minecraft:netherite_chestplate',
'minecraft:netherite_leggings', 'minecraft:netherite_boots',
'minecraft:turtle_helmet'
])

export const RIDEABLE_ENTITIES = new Set([
'minecraft:boat', 'minecraft:chest_boat',
'minecraft:minecart', 'minecraft:chest_minecart', 'minecraft:hopper_minecart',
'minecraft:tnt_minecart', 'minecraft:command_block_minecart',
'minecraft:horse', 'minecraft:donkey', 'minecraft:mule',
'minecraft:skeleton_horse', 'minecraft:zombie_horse',
'minecraft:pig', 'minecraft:strider', 'minecraft:camel',
'minecraft:llama', 'minecraft:trader_llama',
'minecraft:happy_ghast',
'minecraft:nautilus', 'minecraft:zombie_nautilus'
])

export const VEHICLE_STAT_MAP = {
'minecraft:boat': 'boat',
'minecraft:chest_boat': 'boat',
'minecraft:minecart': 'minecart',
'minecraft:chest_minecart': 'minecart',
'minecraft:hopper_minecart': 'minecart',
'minecraft:tnt_minecart': 'minecart',
'minecraft:command_block_minecart': 'minecart',
'minecraft:horse': 'horse',
'minecraft:donkey': 'donkey',
'minecraft:mule': 'mule',
'minecraft:skeleton_horse': 'horse',
'minecraft:zombie_horse': 'horse',
'minecraft:pig': 'pig',
'minecraft:strider': 'strider',
'minecraft:camel': 'camel',
'minecraft:llama': 'llama',
'minecraft:trader_llama': 'llama',
'minecraft:happy_ghast': 'happyGhast',
'minecraft:nautilus': 'nautilus',
'minecraft:zombie_nautilus': 'nautilus'
}

export const BREEDING_ITEMS = new Set([
'minecraft:wheat', 'minecraft:carrot', 'minecraft:potato',
'minecraft:beetroot', 'minecraft:golden_carrot', 'minecraft:golden_apple',
'minecraft:enchanted_golden_apple', 'minecraft:apple',
'minecraft:hay_block', 'minecraft:sugar',
'minecraft:cod', 'minecraft:salmon', 'minecraft:tropical_fish',
'minecraft:raw_rabbit', 'minecraft:rotten_flesh',
'minecraft:bone', 'minecraft:raw_chicken', 'minecraft:raw_mutton',
'minecraft:raw_beef', 'minecraft:raw_porkchop',
'minecraft:seeds', 'minecraft:wheat_seeds', 'minecraft:beetroot_seeds',
'minecraft:melon_seeds', 'minecraft:pumpkin_seeds', 'minecraft:torchflower_seeds',
'minecraft:pitcher_pod',
'minecraft:sweet_berries', 'minecraft:glow_berries',
'minecraft:bamboo', 'minecraft:seagrass', 'minecraft:cactus',
'minecraft:warped_fungus', 'minecraft:crimson_fungus'
])

export const BREEDABLE_ENTITIES = new Set([
'minecraft:cow', 'minecraft:pig', 'minecraft:sheep', 'minecraft:chicken',
'minecraft:horse', 'minecraft:donkey', 'minecraft:mule',
'minecraft:rabbit', 'minecraft:wolf', 'minecraft:cat', 'minecraft:ocelot',
'minecraft:llama', 'minecraft:trader_llama',
'minecraft:fox', 'minecraft:bee', 'minecraft:panda',
'minecraft:turtle', 'minecraft:axolotl', 'minecraft:goat',
'minecraft:frog', 'minecraft:camel', 'minecraft:sniffer',
'minecraft:armadillo', 'minecraft:strider', 'minecraft:hoglin'
])

export const HOSTILE_MOBS = new Set([
'minecraft:zombie', 'minecraft:husk', 'minecraft:drowned', 'minecraft:zombie_villager',
'minecraft:skeleton', 'minecraft:stray', 'minecraft:wither_skeleton', 'minecraft:bogged',
'minecraft:spider', 'minecraft:cave_spider',
'minecraft:creeper',
'minecraft:enderman', 'minecraft:endermite',
'minecraft:slime', 'minecraft:magma_cube',
'minecraft:witch',
'minecraft:phantom',
'minecraft:blaze', 'minecraft:ghast',
'minecraft:piglin', 'minecraft:piglin_brute', 'minecraft:zombified_piglin',
'minecraft:hoglin', 'minecraft:zoglin',
'minecraft:guardian', 'minecraft:elder_guardian',
'minecraft:shulker',
'minecraft:silverfish',
'minecraft:ravager', 'minecraft:pillager', 'minecraft:vindicator',
'minecraft:evoker', 'minecraft:vex', 'minecraft:illusioner',
'minecraft:warden',
'minecraft:breeze',

'minecraft:wither', 'minecraft:ender_dragon'
])

export const NEUTRAL_MOBS = new Set([
'minecraft:wolf', 'minecraft:polar_bear', 'minecraft:llama',
'minecraft:bee', 'minecraft:dolphin', 'minecraft:panda',
'minecraft:iron_golem', 'minecraft:snow_golem',
'minecraft:piglin', 'minecraft:zombified_piglin',
'minecraft:goat'
])

export function cleanTypeId(typeId) {
if (!typeId) return 'unknown'
return typeId.replace('minecraft:', '')
}

export function formatTypeId(typeId) {
const clean = cleanTypeId(typeId)
return clean
 .split('_')
 .map(word => word.charAt(0).toUpperCase() + word.slice(1))
 .join(' ')
}

export function isHostileMob(typeId) {
return HOSTILE_MOBS.has(typeId)
}

export function isFood(typeId) {
return FOOD_ITEMS.has(typeId)
}

export function isBreakableTool(typeId) {
return BREAKABLE_TOOLS.has(typeId)
}

export function isVehicle(typeId) {
return RIDEABLE_ENTITIES.has(typeId)
}

export function getVehicleStatKey(typeId) {
return VEHICLE_STAT_MAP[typeId] || null
}