import { world, system } from '@minecraft/server';
import { BaseTracker } from './BaseTracker.js';
import { STORAGE_KEYS, cleanTypeId } from '../core/constants.js';

const MISC = STORAGE_KEYS.MISC;
const COMBAT = STORAGE_KEYS.COMBAT;

const FISHING_LOOT = new Set([
  'minecraft:cod',
  'minecraft:salmon',
  'minecraft:pufferfish',
  'minecraft:tropical_fish',
  'minecraft:bow',
  'minecraft:enchanted_book',
  'minecraft:fishing_rod',
  'minecraft:name_tag',
  'minecraft:nautilus_shell',
  'minecraft:saddle',
  'minecraft:leather_boots',
  'minecraft:stick',
  'minecraft:string',
  'minecraft:bowl',
  'minecraft:tripwire_hook',
  'minecraft:rotten_flesh',
  'minecraft:bone',
  'minecraft:ink_sac',
  'minecraft:water_bottle',
]);

export class MiscTracker extends BaseTracker {
  constructor() {
    super();

    this.interactionTracker = null;

    this.activeHooks = new Map();
  }

  setInteractionTracker(tracker) {
    this.interactionTracker = tracker;
  }

  registerEvents() {
    try {
      world.afterEvents.playerEmote.subscribe((event) => {
        this.onPlayerEmote(event);
      });
    } catch {}

    world.afterEvents.effectAdd.subscribe((event) => {
      this.onEffectAdded(event);
    });

    world.afterEvents.entitySpawn.subscribe((event) => {
      this.onEntitySpawn(event);
    });

    try {
      world.afterEvents.entityItemPickup.subscribe((event) => {
        this.onEntityItemPickup(event);
      });
    } catch {}

    try {
      world.afterEvents.entityItemDrop.subscribe((event) => {
        this.onEntityItemDrop(event);
      });
    } catch {}

    try {
      world.afterEvents.targetBlockHit.subscribe((event) => {
        this.onTargetBlockHit(event);
      });
    } catch {}

    try {
      world.afterEvents.dataDrivenEntityTrigger.subscribe((event) => {
        this.onDataDrivenEntityTrigger(event);
      });
    } catch {}
  }

  onPlayerEmote(event) {
    const player = event.player;
    this.increment(player, MISC, 'emotes.total', 1);
  }

  onChatMessage(event) {
    try {
      const player = event.sender;
      const message = event.message;

      if (!message || message.startsWith('/')) return;

      this.increment(player, MISC, 'chat.messages', 1);
      this.increment(player, MISC, 'chat.characters', message.length);

      this.max(player, MISC, 'chat.longest', message.length);

      const totalMessages = this.get(player, MISC, 'chat.messages') || 1;
      const totalChars = this.get(player, MISC, 'chat.characters') || 0;
      const average = Math.round(totalChars / totalMessages);
      this.set(player, MISC, 'chat.average', average);
    } catch {}
  }

  onEffectAdded(event) {
    const entity = event.entity;
    if (entity.typeId !== 'minecraft:player') return;

    const effect = event.effect;
    const effectType = cleanTypeId(effect.typeId);

    this.increment(entity, MISC, 'effects.total', 1);
    this.increment(entity, MISC, `effects.byType.${effectType}`, 1);

    this.addToSet(entity, MISC, 'effects.unique', effectType);

    if (effect.typeId === 'minecraft:village_hero' && effect.duration > 46800) {
      this.increment(entity, MISC, 'raids.won', 1);
    }
  }

  onEntitySpawn(event) {
    const entity = event.entity;

    if (this.isThrowableProjectile(entity.typeId)) {
      this.trackThrownProjectile(entity);
      return;
    }

    if (entity.typeId === 'minecraft:fishing_hook') {
      this.onFishingHookSpawn(entity);
      return;
    }

    if (entity.typeId === 'minecraft:item') {
      this.checkFishingCatch(entity);
    }
  }

  onEntityItemPickup(event) {
    try {
      const entity = event.entity;
      if (entity.typeId !== 'minecraft:player') return;
      if (!this.interactionTracker) return;

      const items = Array.from(event.items);
      for (const itemStack of items) {
        if (itemStack?.typeId) {
          this.interactionTracker.trackItemPickedUp(
            entity,
            itemStack.typeId,
            itemStack.amount || 1,
          );
        }
      }
    } catch {}
  }

  onEntityItemDrop(event) {
    try {
      const entity = event.entity;
      if (entity.typeId !== 'minecraft:player') return;
      if (!this.interactionTracker) return;

      const items = Array.from(event.items);
      for (const itemEntity of items) {
        const itemComponent = itemEntity?.getComponent?.('minecraft:item');
        if (itemComponent) {
          const itemStack = itemComponent.itemStack;
          this.interactionTracker.trackItemDropped(
            entity,
            itemStack.typeId,
            itemStack.amount || 1,
          );
        }
      }
    } catch {}
  }

  isThrowableProjectile(typeId) {
    return (
      typeId === 'minecraft:ender_pearl' ||
      typeId === 'minecraft:eye_of_ender_signal' ||
      typeId === 'minecraft:snowball' ||
      typeId === 'minecraft:egg' ||
      typeId === 'minecraft:splash_potion' ||
      typeId === 'minecraft:lingering_potion' ||
      typeId === 'minecraft:xp_bottle'
    );
  }

  trackThrownProjectile(entity) {
    try {
      const projectileComponent = entity.getComponent('minecraft:projectile');
      if (!projectileComponent) return;

      const owner = projectileComponent.owner;
      if (!owner || owner.typeId !== 'minecraft:player') return;

      const itemType = this.getItemTypeFromProjectile(entity.typeId);
      if (!itemType || !this.interactionTracker) return;

      this.interactionTracker.trackItemUsed(owner, itemType);
    } catch {}
  }

  getItemTypeFromProjectile(projectileType) {
    switch (projectileType) {
      case 'minecraft:ender_pearl':
        return 'minecraft:ender_pearl';
      case 'minecraft:eye_of_ender_signal':
        return 'minecraft:ender_eye';
      case 'minecraft:snowball':
        return 'minecraft:snowball';
      case 'minecraft:egg':
        return 'minecraft:egg';
      case 'minecraft:splash_potion':
        return 'minecraft:splash_potion';
      case 'minecraft:lingering_potion':
        return 'minecraft:lingering_potion';
      case 'minecraft:xp_bottle':
        return 'minecraft:experience_bottle';
      default:
        return null;
    }
  }

  onTargetBlockHit(event) {
    try {
      const source = event.source;
      const redstonePower = event.redstonePower;

      const trackHit = (player) => {
        this.increment(player, MISC, 'targetBlock.hit', 1);
        if (redstonePower === 15) {
          this.increment(player, MISC, 'targetBlock.bullseye', 1);
        }
      };

      if (source?.typeId === 'minecraft:player') {
        trackHit(source);
        return;
      }

      const projectileComponent = source?.getComponent('minecraft:projectile');
      if (projectileComponent) {
        const owner = projectileComponent.owner;
        if (owner?.typeId === 'minecraft:player') {
          trackHit(owner);
        }
      }
    } catch {}
  }

  onDataDrivenEntityTrigger(event) {
    const entity = event.entity;
    const eventId = event.eventId;

    if (entity.typeId !== 'minecraft:player') return;

    if (eventId === 'minecraft:remove_raid_trigger') {
      this.increment(entity, MISC, 'raids.triggered', 1);
    }
  }

  onFishingHookSpawn(hookEntity) {
    try {
      const players = hookEntity.dimension.getPlayers({
        location: hookEntity.location,
        maxDistance: 16,
      });
      let fisher = null;
      let closestDist = Infinity;

      for (const player of players) {
        const inv = player.getComponent('minecraft:inventory');
        const heldItem = inv?.container?.getItem(player.selectedSlotIndex);
        if (heldItem?.typeId === 'minecraft:fishing_rod') {
          const dx = player.location.x - hookEntity.location.x;
          const dy = player.location.y - hookEntity.location.y;
          const dz = player.location.z - hookEntity.location.z;
          const dist = dx * dx + dy * dy + dz * dz;
          if (dist < closestDist) {
            closestDist = dist;
            fisher = player;
          }
        }
      }

      if (!fisher) return;

      const hookId = hookEntity.id;
      const hookData = {
        location: hookEntity.location,
        playerId: fisher.id,
        intervalId: null,
        timeoutId: null,
      };

      hookData.intervalId = system.runInterval(() => {
        try {
          const hook = world.getEntity(hookId);
          if (!hook) {
            system.clearRun(hookData.intervalId);
            system.runTimeout(() => {
              this.activeHooks.delete(hookId);
            }, 10);
            return;
          }
          hookData.location = hook.location;
        } catch {
          system.clearRun(hookData.intervalId);
          this.activeHooks.delete(hookId);
        }
      }, 5);

      hookData.timeoutId = system.runTimeout(() => {
        system.clearRun(hookData.intervalId);
        this.activeHooks.delete(hookId);
      }, 1200);

      this.activeHooks.set(hookId, hookData);
    } catch {}
  }

  checkFishingCatch(itemEntity) {
    try {
      const itemComponent = itemEntity.getComponent('minecraft:item');
      if (!itemComponent) return;
      const itemStack = itemComponent.itemStack;
      if (!itemStack || !FISHING_LOOT.has(itemStack.typeId)) return;

      for (const [hookId, hookInfo] of this.activeHooks) {
        const hookLoc = hookInfo.location;
        const dx = itemEntity.location.x - hookLoc.x;
        const dy = itemEntity.location.y - hookLoc.y;
        const dz = itemEntity.location.z - hookLoc.z;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq <= 4) {
          const player = world.getEntity(hookInfo.playerId);
          if (player) {
            this.increment(player, MISC, 'fishing.caught', 1);
          }
          if (hookInfo.intervalId) system.clearRun(hookInfo.intervalId);
          if (hookInfo.timeoutId) system.clearRun(hookInfo.timeoutId);
          this.activeHooks.delete(hookId);
          return;
        }
      }
    } catch {}
  }

  onPlayerLeave(playerId) {
    for (const [hookId, hookInfo] of this.activeHooks) {
      if (hookInfo.playerId === playerId) {
        if (hookInfo.intervalId) system.clearRun(hookInfo.intervalId);
        if (hookInfo.timeoutId) system.clearRun(hookInfo.timeoutId);
        this.activeHooks.delete(hookId);
      }
    }
  }
}
