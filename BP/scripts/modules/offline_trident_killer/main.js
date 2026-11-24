import {
  world,
  system,
  ItemStack,
  EquipmentSlot,
  GameMode,
  CommandPermissionLevel,
  CustomCommandStatus,
  CustomCommandParamType
} from '@minecraft/server';
import { mobXpTable, DEFAULT_XP, EQUIPMENT_BONUS, BABY_ZOMBIE_XP, XP_PER_ORB, rollXp } from './xpTable.js';
import { rollMissingLoot } from './lootSimulator.js';

const PREFIX = '§7[§6Trident killer§7]';

const THROWER_ID_PROPERTY = '32k:otk:thrower_id';
const LEGACY_THROWER_ID_PROPERTY = 'offlineTridentKiller:throwerId';
const LEGACY_THROWER_NAME_PROPERTY = 'offlineTridentKiller:thrower';
const ENABLED_PROPERTY = '32k:otk:enabled';
const DEBUG_PROPERTY = '32k:otk:debug';
const RANGE_PROPERTY = '32k:otk:looter_range';

const DEFAULT_LOOTER_RANGE = 32;
const MIN_LOOTER_RANGE = 1;
const MAX_LOOTER_RANGE = 256;

const BABY_ZOMBIE_TYPES = new Set([
  'minecraft:zombie',
  'minecraft:zombie_villager',
  'minecraft:zombie_villager_v2',
  'minecraft:husk',
  'minecraft:drowned',
  'minecraft:zombified_piglin'
]);

const EQUIPMENT_SLOTS = [
  EquipmentSlot.Head,
  EquipmentSlot.Chest,
  EquipmentSlot.Legs,
  EquipmentSlot.Feet,
  EquipmentSlot.Mainhand,
  EquipmentSlot.Offhand
];

export function initTridentTracker() {
  world.afterEvents.entitySpawn.subscribe(onTridentSpawn);
  world.afterEvents.entityDie.subscribe(onEntityDie);

  system.beforeEvents.startup.subscribe(({ customCommandRegistry }) => {
    customCommandRegistry.registerCommand(
      {
        name: '32k:otk_toggle',
        description: 'Enable or disable offline trident killer',
        permissionLevel: CommandPermissionLevel.GameDirectors
      },
      () => {
        system.run(toggleEnabled);
        return { status: CustomCommandStatus.Success };
      }
    );
    customCommandRegistry.registerCommand(
      {
        name: '32k:otk_debug',
        description: "Show offline trident killer's extra drops in chat",
        permissionLevel: CommandPermissionLevel.GameDirectors
      },
      () => {
        system.run(toggleDebug);
        return { status: CustomCommandStatus.Success };
      }
    );
    customCommandRegistry.registerCommand(
      {
        name: '32k:otk_range',
        description: 'Set how close a player must be to the trident to lend it their looting',
        permissionLevel: CommandPermissionLevel.GameDirectors,
        optionalParameters: [{ name: 'blocks', type: CustomCommandParamType.Integer }]
      },
      (origin, blocks) => {
        if (blocks === undefined) {
          return { status: CustomCommandStatus.Success, message: `${PREFIX} Looting range is §f${getLooterRange()}§7 blocks` };
        }
        if (blocks < MIN_LOOTER_RANGE || blocks > MAX_LOOTER_RANGE) {
          return {
            status: CustomCommandStatus.Failure,
            message: `Range must be between ${MIN_LOOTER_RANGE} and ${MAX_LOOTER_RANGE} blocks`
          };
        }
        system.run(() => setLooterRange(blocks));
        return { status: CustomCommandStatus.Success };
      }
    );
  });

  system.afterEvents.scriptEventReceive.subscribe((event) => {
    if (event.sourceEntity?.typeId !== 'minecraft:player') return;
    if (event.id === '32k:otk_toggle' || event.id === 'otk:toggle') toggleEnabled();
    if (event.id === '32k:otk_debug' || event.id === 'otk:debug') toggleDebug();
    if (event.id === '32k:otk_range' || event.id === 'otk:range') {
      const blocks = Number.parseInt(event.message, 10);
      if (blocks >= MIN_LOOTER_RANGE && blocks <= MAX_LOOTER_RANGE) setLooterRange(blocks);
    }
  });
}

function isEnabled() {
  return world.getDynamicProperty(ENABLED_PROPERTY) ?? true;
}

function isDebug() {
  return world.getDynamicProperty(DEBUG_PROPERTY) ?? false;
}

function getLooterRange() {
  return world.getDynamicProperty(RANGE_PROPERTY) ?? DEFAULT_LOOTER_RANGE;
}

function setLooterRange(blocks) {
  world.setDynamicProperty(RANGE_PROPERTY, blocks);
  world.sendMessage(`${PREFIX} Looting range set to §f${blocks}§7 blocks`);
}

function toggleEnabled() {
  const enabled = !isEnabled();
  world.setDynamicProperty(ENABLED_PROPERTY, enabled);
  world.sendMessage(`${PREFIX} ${enabled ? '§aEnabled' : '§cDisabled'}`);
}

function toggleDebug() {
  const debug = !isDebug();
  world.setDynamicProperty(DEBUG_PROPERTY, debug);
  world.sendMessage(`${PREFIX} Debug ${debug ? '§aon' : '§coff'}`);
}

function onTridentSpawn(event) {
  if (!isEnabled()) return;

  const entity = event.entity;
  if (entity.typeId !== 'minecraft:thrown_trident') return;

  try {
    const owner = entity.getComponent('minecraft:projectile')?.owner;
    if (owner?.typeId !== 'minecraft:player') return;

    entity.setDynamicProperty(THROWER_ID_PROPERTY, owner.id);
  } catch (e) {}
}

function onEntityDie(event) {
  if (!isEnabled()) return;

  const { deadEntity, damageSource } = event;

  const trident = damageSource.damagingProjectile;
  if (trident?.typeId !== 'minecraft:thrown_trident') return;

  let isThrowerOnline;
  try {
    isThrowerOnline = checkThrowerOnline(trident);
  } catch (e) {
    return;
  }

  if (isThrowerOnline !== false) return;
  if (!world.gameRules.doMobLoot) return;

  const dimension = deadEntity.dimension;
  const location = deadEntity.location;
  const tridentLocation = trident.isValid ? trident.location : location;
  const mob = snapshotMob(deadEntity);

  const xpAmount = calculateXp(deadEntity, mob);
  if (xpAmount > 0) {
    spawnXpOrbs(dimension, location, Math.max(1, Math.round(xpAmount / XP_PER_ORB)));
  }

  const looter = findNearestPlayer(dimension, tridentLocation);
  const lootingLevel = looter ? getLootingLevel(looter) : 0;

  const drops = rollMissingLoot(mob, lootingLevel);
  spawnDrops(dimension, location, drops);

  if (isDebug()) {
    const lootedBy = looter ? `${looter.name} (Looting ${lootingLevel})` : 'no one nearby';
    const items = [...drops].map(([itemId, count]) => `${count}x ${itemId.replace('minecraft:', '')}`);
    world.sendMessage(
      `${PREFIX} §f${mob.typeId.replace('minecraft:', '')}§7: ${xpAmount} XP, looting from ${lootedBy}, extra drops: ${items.length ? `§f${items.join(', ')}` : 'none'}`
    );
  }
}

function checkThrowerOnline(trident) {
  const throwerId = trident.getDynamicProperty(THROWER_ID_PROPERTY) ?? trident.getDynamicProperty(LEGACY_THROWER_ID_PROPERTY);
  if (throwerId) {
    return world.getAllPlayers().some((p) => p.id === throwerId);
  }

  const throwerName = trident.getDynamicProperty(LEGACY_THROWER_NAME_PROPERTY);
  if (throwerName) {
    return world.getAllPlayers().some((p) => p.name === throwerName);
  }

  return undefined;
}

function snapshotMob(entity) {
  return {
    typeId: entity.typeId,
    isBaby: !!entity.getComponent('minecraft:is_baby'),
    variant: entity.getComponent('minecraft:variant')?.value,
    markVariant: entity.getComponent('minecraft:mark_variant')?.value,
    onFire: !!entity.getComponent('minecraft:onfire')
  };
}

function findNearestPlayer(dimension, location) {
  const [player] = dimension.getPlayers({
    location,
    maxDistance: getLooterRange(),
    closest: 1,
    excludeGameModes: [GameMode.Spectator]
  });
  return player;
}

function getLootingLevel(player) {
  try {
    const item = player.getComponent('minecraft:equippable')?.getEquipment(EquipmentSlot.Mainhand);
    return item?.getComponent('minecraft:enchantable')?.getEnchantment('looting')?.level ?? 0;
  } catch (e) {
    return 0;
  }
}

function calculateXp(entity, mob) {
  let baseXp;

  if (mob.isBaby && BABY_ZOMBIE_TYPES.has(mob.typeId)) {
    baseXp = BABY_ZOMBIE_XP;
  } else if (mob.isBaby) {
    return 0;
  } else {
    baseXp = rollXp(mobXpTable[mob.typeId] ?? DEFAULT_XP);
  }

  let equipmentXp = 0;
  try {
    const equippable = entity.getComponent('minecraft:equippable');
    if (equippable) {
      for (const slot of EQUIPMENT_SLOTS) {
        if (equippable.getEquipment(slot)) {
          equipmentXp += rollXp(EQUIPMENT_BONUS);
        }
      }
    }
  } catch (e) {}

  return baseXp + equipmentXp;
}

function spawnXpOrbs(dimension, location, amount) {
  for (let i = 0; i < amount; i++) {
    try {
      dimension.spawnEntity('minecraft:xp_orb', location);
    } catch (e) {
      break;
    }
  }
}

function spawnDrops(dimension, location, drops) {
  for (const [itemId, total] of drops) {
    try {
      let remaining = total;
      while (remaining > 0) {
        const stack = new ItemStack(itemId, 1);
        stack.amount = Math.min(remaining, stack.maxAmount);
        remaining -= stack.amount;
        dimension.spawnItem(stack, location);
      }
    } catch (e) {}
  }
}

initTridentTracker();