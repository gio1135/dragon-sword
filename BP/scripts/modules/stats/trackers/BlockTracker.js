import { world } from '@minecraft/server';
import { BaseTracker } from './BaseTracker.js';
import { STORAGE_KEYS, cleanTypeId } from '../core/constants.js';

const BLOCKS = STORAGE_KEYS.BLOCKS;

export class BlockTracker extends BaseTracker {
  constructor() {
    super();

    this.interactionTracker = null;
  }

  setInteractionTracker(tracker) {
    this.interactionTracker = tracker;
  }

  registerEvents() {
    world.afterEvents.playerBreakBlock.subscribe((event) => {
      this.onBlockBreak(event);
    });

    world.afterEvents.playerPlaceBlock.subscribe((event) => {
      this.onBlockPlace(event);
    });
  }

  onBlockBreak(event) {
    const player = event.player;
    const blockType = cleanTypeId(event.brokenBlockPermutation.type.id);

    this.increment(player, BLOCKS, 'mined.total', 1);
    this.increment(player, BLOCKS, `mined.byType.${blockType}`, 1);

    const toolUsed = event.itemStackBeforeBreak;
    if (
      toolUsed &&
      this.interactionTracker &&
      this.isToolForItemUsed(toolUsed.typeId)
    ) {
      this.interactionTracker.trackItemUsed(player, toolUsed.typeId);
    }
  }

  onBlockPlace(event) {
    const player = event.player;
    const blockType = cleanTypeId(event.block.typeId);

    this.increment(player, BLOCKS, 'placed.total', 1);
    this.increment(player, BLOCKS, `placed.byType.${blockType}`, 1);
  }

  isToolForItemUsed(typeId) {
    return (
      typeId.includes('_shovel') ||
      typeId.includes('_pickaxe') ||
      typeId.includes('_axe') ||
      typeId.includes('_hoe') ||
      typeId.includes('_sword') ||
      typeId === 'minecraft:shears' ||
      typeId === 'minecraft:flint_and_steel'
    );
  }
}
