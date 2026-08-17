import { world, system, EntityInitializationCause } from '@minecraft/server';
import { BaseTracker } from './BaseTracker.js';
import {
  STORAGE_KEYS,
  BLOCK_INTERACTION_MAP,
  cleanTypeId,
  isFood,
} from '../core/constants.js';

const LEATHER_ARMOR = new Set([
  'minecraft:leather_helmet',
  'minecraft:leather_chestplate',
  'minecraft:leather_leggings',
  'minecraft:leather_boots',
  'minecraft:leather_horse_armor',
]);

const BANNERS = new Set([
  'minecraft:banner',
  'minecraft:white_banner',
  'minecraft:orange_banner',
  'minecraft:magenta_banner',
  'minecraft:light_blue_banner',
  'minecraft:yellow_banner',
  'minecraft:lime_banner',
  'minecraft:pink_banner',
  'minecraft:gray_banner',
  'minecraft:light_gray_banner',
  'minecraft:cyan_banner',
  'minecraft:purple_banner',
  'minecraft:blue_banner',
  'minecraft:brown_banner',
  'minecraft:green_banner',
  'minecraft:red_banner',
  'minecraft:black_banner',
]);

const SHULKER_BOXES = new Set([
  'minecraft:shulker_box',
  'minecraft:white_shulker_box',
  'minecraft:orange_shulker_box',
  'minecraft:magenta_shulker_box',
  'minecraft:light_blue_shulker_box',
  'minecraft:yellow_shulker_box',
  'minecraft:lime_shulker_box',
  'minecraft:pink_shulker_box',
  'minecraft:gray_shulker_box',
  'minecraft:light_gray_shulker_box',
  'minecraft:cyan_shulker_box',
  'minecraft:purple_shulker_box',
  'minecraft:blue_shulker_box',
  'minecraft:brown_shulker_box',
  'minecraft:green_shulker_box',
  'minecraft:red_shulker_box',
  'minecraft:black_shulker_box',
  'minecraft:undyed_shulker_box',
]);

const MUSIC_DISCS = new Set([
  'minecraft:music_disc_13',
  'minecraft:music_disc_cat',
  'minecraft:music_disc_blocks',
  'minecraft:music_disc_chirp',
  'minecraft:music_disc_far',
  'minecraft:music_disc_mall',
  'minecraft:music_disc_mellohi',
  'minecraft:music_disc_stal',
  'minecraft:music_disc_strad',
  'minecraft:music_disc_ward',
  'minecraft:music_disc_11',
  'minecraft:music_disc_wait',
  'minecraft:music_disc_otherside',
  'minecraft:music_disc_5',
  'minecraft:music_disc_pigstep',
  'minecraft:music_disc_relic',
  'minecraft:music_disc_creator',
  'minecraft:music_disc_creator_music_box',
  'minecraft:music_disc_precipice',
  'minecraft:music_disc_lava_chicken',
  'minecraft:music_disc_tears',
]);

const PLANTABLE_ITEMS = new Set([
  'minecraft:oak_sapling',
  'minecraft:spruce_sapling',
  'minecraft:birch_sapling',
  'minecraft:jungle_sapling',
  'minecraft:acacia_sapling',
  'minecraft:dark_oak_sapling',
  'minecraft:cherry_sapling',
  'minecraft:mangrove_propagule',
  'minecraft:red_mushroom',
  'minecraft:brown_mushroom',
  'minecraft:crimson_fungus',
  'minecraft:warped_fungus',
  'minecraft:cactus',
  'minecraft:bamboo',
  'minecraft:dead_bush',
  'minecraft:dandelion',
  'minecraft:poppy',
  'minecraft:blue_orchid',
  'minecraft:allium',
  'minecraft:azure_bluet',
  'minecraft:red_tulip',
  'minecraft:orange_tulip',
  'minecraft:white_tulip',
  'minecraft:pink_tulip',
  'minecraft:oxeye_daisy',
  'minecraft:cornflower',
  'minecraft:lily_of_the_valley',
  'minecraft:wither_rose',
  'minecraft:torchflower',
  'minecraft:fern',
  'minecraft:azalea',
  'minecraft:flowering_azalea',
]);

const INTERACTIONS = STORAGE_KEYS.INTERACTIONS;
const ITEMS = STORAGE_KEYS.ITEMS;

export class InteractionTracker extends BaseTracker {
  constructor() {
    super();

    this.recentPlacements = new Map();
  }

  registerEvents() {
    world.afterEvents.playerPlaceBlock.subscribe((event) => {
      const key = `${event.player.id}:${event.block.typeId}`;
      this.recentPlacements.set(key, Date.now());
    });

    world.afterEvents.playerInteractWithBlock.subscribe((event) => {
      this.onBlockInteraction(event);
    });

    world.afterEvents.playerInteractWithEntity.subscribe((event) => {
      this.onEntityInteraction(event);
    });

    world.afterEvents.itemCompleteUse.subscribe((event) => {
      this.onItemCompleteUse(event);
    });

    world.afterEvents.itemReleaseUse.subscribe((event) => {
      this.onItemReleaseUse(event);
    });

    if (world.afterEvents.itemStartUse) {
      world.afterEvents.itemStartUse.subscribe((event) => {
        this.onItemStartUse(event);
      });
    }

    world.afterEvents.entitySpawn.subscribe((event) => {
      this.onEntitySpawn(event);
    });

    world.afterEvents.playerLeave.subscribe((event) => {
      for (const key of this.recentPlacements.keys()) {
        if (key.startsWith(event.playerId)) {
          this.recentPlacements.delete(key);
        }
      }
    });
  }

  onBlockInteraction(event) {
    const player = event.player;
    const blockType = event.block.typeId;

    const placementKey = `${player.id}:${blockType}`;
    const placementTime = this.recentPlacements.get(placementKey);
    if (placementTime && Date.now() - placementTime < 500) {
      this.recentPlacements.delete(placementKey);
      return;
    }

    const interactionPath = BLOCK_INTERACTION_MAP[blockType];
    if (interactionPath) {
      this.increment(player, INTERACTIONS, interactionPath, 1);
    }

    if (blockType.includes('cauldron')) {
      this.handleCauldronInteraction(player, blockType, event.itemStack);
    }

    if (blockType === 'minecraft:jukebox' && event.itemStack) {
      if (MUSIC_DISCS.has(event.itemStack.typeId)) {
        this.increment(player, INTERACTIONS, 'musicDisc.played', 1);
      }
    }

    if (blockType === 'minecraft:flower_pot' && event.itemStack) {
      const itemType = event.itemStack.typeId;
      if (PLANTABLE_ITEMS.has(itemType)) {
        this.increment(player, INTERACTIONS, 'flowerPot.planted', 1);
      }
    }

    this.trackItemUsedOnBlock(player, event.itemStack);
  }

  trackItemUsedOnBlock(player, itemStack) {
    if (!itemStack) return;

    const itemType = itemStack.typeId;

    if (itemType === 'minecraft:bone_meal') {
      const cleanItem = cleanTypeId(itemType);
      this.increment(player, ITEMS, 'used.total', 1);
      this.increment(player, ITEMS, `used.byType.${cleanItem}`, 1);
      return;
    }

    if (itemType === 'minecraft:flint_and_steel') {
      const cleanItem = cleanTypeId(itemType);
      this.increment(player, ITEMS, 'used.total', 1);
      this.increment(player, ITEMS, `used.byType.${cleanItem}`, 1);
      return;
    }

    if (itemType.includes('bucket')) {
      const cleanItem = cleanTypeId(itemType);
      this.increment(player, ITEMS, 'used.total', 1);
      this.increment(player, ITEMS, `used.byType.${cleanItem}`, 1);
      return;
    }

    if (itemType.includes('spawn_egg')) {
      const cleanItem = cleanTypeId(itemType);
      this.increment(player, ITEMS, 'used.total', 1);
      this.increment(player, ITEMS, `used.byType.${cleanItem}`, 1);
      return;
    }

    if (itemType === 'minecraft:cocoa_beans') {
      const cleanItem = cleanTypeId(itemType);
      this.increment(player, ITEMS, 'used.total', 1);
      this.increment(player, ITEMS, `used.byType.${cleanItem}`, 1);
      return;
    }
  }

  handleCauldronInteraction(player, blockType, itemStack) {
    if (!itemStack) return;

    const itemType = itemStack.typeId;

    if (itemType === 'minecraft:water_bucket') {
      this.increment(player, INTERACTIONS, 'cauldron.filled', 1);
      return;
    }

    if (itemType === 'minecraft:glass_bottle') {
      this.increment(player, INTERACTIONS, 'cauldron.bottleFilled', 1);
      return;
    }

    if (LEATHER_ARMOR.has(itemType)) {
      this.increment(player, INTERACTIONS, 'cauldron.armorCleaned', 1);
      return;
    }

    if (BANNERS.has(itemType)) {
      this.increment(player, INTERACTIONS, 'cauldron.bannerCleaned', 1);
      return;
    }

    if (SHULKER_BOXES.has(itemType)) {
      this.increment(player, INTERACTIONS, 'cauldron.shulkerCleaned', 1);
      return;
    }
  }

  onEntityInteraction(event) {
    const player = event.player;
    const entity = event.target;
    const entityType = entity.typeId;

    if (
      entityType === 'minecraft:villager_v2' ||
      entityType === 'minecraft:wandering_trader'
    ) {
      this.increment(player, INTERACTIONS, 'villager.talked', 1);
    }
  }

  onEntitySpawn(event) {
    const entity = event.entity;
    const cause = event.cause;

    if (cause !== EntityInitializationCause.Born) {
      return;
    }

    if (
      entity.typeId === 'minecraft:slime' ||
      entity.typeId === 'minecraft:magma_cube'
    ) {
      return;
    }

    if (!entity.isValid) {
      return;
    }

    try {
      const ageableComponent = entity.getComponent('minecraft:ageable');
      if (ageableComponent && ageableComponent.age >= 0) {
        return;
      }
    } catch {}

    const nearbyPlayers = entity.dimension.getPlayers({
      location: entity.location,
      maxDistance: 10,
    });

    if (nearbyPlayers.length > 0) {
      let closestPlayer = nearbyPlayers[0];
      let closestDistance = Infinity;

      for (const player of nearbyPlayers) {
        const dx = player.location.x - entity.location.x;
        const dy = player.location.y - entity.location.y;
        const dz = player.location.z - entity.location.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestPlayer = player;
        }
      }

      this.increment(closestPlayer, INTERACTIONS, 'animals.bred', 1);
    }
  }

  onItemCompleteUse(event) {
    const player = event.source;
    const itemType = event.itemStack?.typeId;

    if (!itemType) return;

    const cleanItem = cleanTypeId(itemType);

    this.increment(player, ITEMS, 'used.total', 1);
    this.increment(player, ITEMS, `used.byType.${cleanItem}`, 1);

    if (isFood(itemType)) {
      this.increment(player, ITEMS, 'food.total', 1);
      this.increment(player, ITEMS, `food.byType.${cleanItem}`, 1);
    }
  }

  onItemReleaseUse(event) {
    const player = event.source;
    const itemType = event.itemStack?.typeId;

    if (!itemType) return;

    const cleanItem = cleanTypeId(itemType);

    this.increment(player, ITEMS, 'used.total', 1);
    this.increment(player, ITEMS, `used.byType.${cleanItem}`, 1);
  }

  onItemStartUse(event) {
    const player = event.source;
    const itemType = event.itemStack?.typeId;

    if (!itemType) return;

    if (
      itemType === 'minecraft:fishing_rod' ||
      itemType === 'minecraft:carrot_on_a_stick' ||
      itemType === 'minecraft:warped_fungus_on_a_stick'
    ) {
      const cleanItem = cleanTypeId(itemType);
      this.increment(player, ITEMS, 'used.total', 1);
      this.increment(player, ITEMS, `used.byType.${cleanItem}`, 1);
      return;
    }

    if (this.isArmorItem(itemType)) {
      const cleanItem = cleanTypeId(itemType);
      this.increment(player, ITEMS, 'used.total', 1);
      this.increment(player, ITEMS, `used.byType.${cleanItem}`, 1);
      return;
    }

    if (itemType === 'minecraft:elytra') {
      const cleanItem = cleanTypeId(itemType);
      this.increment(player, ITEMS, 'used.total', 1);
      this.increment(player, ITEMS, `used.byType.${cleanItem}`, 1);
    }
  }

  isArmorItem(typeId) {
    return (
      typeId.includes('_helmet') ||
      typeId.includes('_chestplate') ||
      typeId.includes('_leggings') ||
      typeId.includes('_boots') ||
      typeId === 'minecraft:turtle_helmet'
    );
  }

  trackItemDropped(player, itemType, amount = 1) {
    const cleanItem = cleanTypeId(itemType);
    this.increment(player, ITEMS, 'dropped.total', amount);
    this.increment(player, ITEMS, `dropped.byType.${cleanItem}`, amount);
  }

  trackItemPickedUp(player, itemType, amount = 1) {
    const cleanItem = cleanTypeId(itemType);
    this.increment(player, ITEMS, 'picked.total', amount);
    this.increment(player, ITEMS, `picked.byType.${cleanItem}`, amount);
  }

  trackItemUsed(player, itemType) {
    const cleanItem = cleanTypeId(itemType);
    this.increment(player, ITEMS, 'used.total', 1);
    this.increment(player, ITEMS, `used.byType.${cleanItem}`, 1);
  }
}
