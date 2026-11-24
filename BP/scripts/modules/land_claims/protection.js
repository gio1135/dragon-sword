import { world, system, BlockPermutation } from '@minecraft/server';
import { ClaimManager } from './manager.js';
import { PermissionTypes } from './classes/data_model.js';
import { DS } from '../../core/ds.js';
import { FeatureFlags } from '../../core/feature_flags.js';

const SHOVEL_ID = 'minecraft:golden_shovel';

const UTILITY_ITEMS = [
  'minecraft:armor_stand',
  'minecraft:painting',
  'minecraft:end_crystal',
  'minecraft:minecart',
  'minecraft:chest_minecart',
  'minecraft:hopper_minecart',
  'minecraft:tnt_minecart',
  'minecraft:furnace_minecart',
  'minecraft:command_block_minecart'
];

const MODIFICATION_TOOLS = [
  'minecraft:shears',
  'minecraft:flint_and_steel',
  'minecraft:fire_charge',
  'minecraft:bone_meal'
];

const COOLDOWNS = new Map();
function notify(player, message) {
  const last = COOLDOWNS.get(player.id) ?? 0;
  const now = system.currentTick;
  if (now - last > 20) {
    system.run(() => {
      if (message) player.sendMessage(`§c${message}`);
      player.playSound('note.bass');
    });
    COOLDOWNS.set(player.id, now);
  }
}

function wouldBucketAffectProtectedClaims(bucketLocation, player) {
  const radius = 8;
  const minChunkX = Math.floor((bucketLocation.x - radius) / 16);
  const maxChunkX = Math.floor((bucketLocation.x + radius) / 16);
  const minChunkZ = Math.floor((bucketLocation.z - radius) / 16);
  const maxChunkZ = Math.floor((bucketLocation.z + radius) / 16);

  const checkedClaims = new Set();
  for (let cx = minChunkX; cx <= maxChunkX; cx++) {
    for (let cz = minChunkZ; cz <= maxChunkZ; cz++) {
      const claims = ClaimManager.spatialCache.get(`${cx},${cz}`);
      if (!claims) continue;
      for (const claim of claims) {
        if (checkedClaims.has(claim)) continue;
        checkedClaims.add(claim);

        const minX = Math.min(claim.start.x, claim.end.x);
        const maxX = Math.max(claim.start.x, claim.end.x);
        const minZ = Math.min(claim.start.z, claim.end.z);
        const maxZ = Math.max(claim.start.z, claim.end.z);

        const clampedX = Math.max(minX, Math.min(bucketLocation.x, maxX));
        const clampedZ = Math.max(minZ, Math.min(bucketLocation.z, maxZ));
        const dx = bucketLocation.x - clampedX;
        const dz = bucketLocation.z - clampedZ;

        if (dx * dx + dz * dz <= radius * radius) {
          if (
            !claim.hasPermission(
              PermissionTypes.USE_ITEMS_ON_BLOCKS,
              player,
              ClaimManager.database,
            )
          ) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

function wouldExplosionAffectProtectedClaims(explosionLocation, sourcePlayer) {
  const radius = 8;
  const minChunkX = Math.floor((explosionLocation.x - radius) / 16);
  const maxChunkX = Math.floor((explosionLocation.x + radius) / 16);
  const minChunkZ = Math.floor((explosionLocation.z - radius) / 16);
  const maxChunkZ = Math.floor((explosionLocation.z + radius) / 16);

  const checkedClaims = new Set();
  for (let cx = minChunkX; cx <= maxChunkX; cx++) {
    for (let cz = minChunkZ; cz <= maxChunkZ; cz++) {
      const claims = ClaimManager.spatialCache.get(`${cx},${cz}`);
      if (!claims) continue;
      for (const claim of claims) {
        if (checkedClaims.has(claim)) continue;
        checkedClaims.add(claim);

        const minX = Math.min(claim.start.x, claim.end.x);
        const maxX = Math.max(claim.start.x, claim.end.x);
        const minZ = Math.min(claim.start.z, claim.end.z);
        const maxZ = Math.max(claim.start.z, claim.end.z);

        const clampedX = Math.max(minX, Math.min(explosionLocation.x, maxX));
        const clampedZ = Math.max(minZ, Math.min(explosionLocation.z, maxZ));
        const dx = explosionLocation.x - clampedX;
        const dz = explosionLocation.z - clampedZ;

        if (dx * dx + dz * dz <= radius * radius) {
          if (
            !claim.hasPermission(
              PermissionTypes.ALLOW_TNT,
              sourcePlayer,
              ClaimManager.database,
            )
          ) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

world.beforeEvents.playerBreakBlock.subscribe((ev) => {
  if (!FeatureFlags.isEnabled(FeatureFlags.FEATURES.LAND_CLAIMS)) return;

  const { player, block, itemStack, dimension } = ev;
  if (dimension.id !== 'minecraft:overworld') return;

  if (itemStack?.typeId === SHOVEL_ID) {
    ev.cancel = true;
    return;
  }

  let cancelled = false;
  const claims = ClaimManager.getClaimsAt(block.location);
  for (const claim of claims) {
    if (cancelled) break;
    if (
      !claim.hasPermission(
        PermissionTypes.BREAK_BLOCKS,
        player,
        ClaimManager.database,
      )
    ) {
      cancelled = true;
      notify(player, "You don't have permission to break blocks");
    }
  }

  if (cancelled) ev.cancel = true;
});

world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
  if (!FeatureFlags.isEnabled(FeatureFlags.FEATURES.LAND_CLAIMS)) return;
  const { player, block, itemStack } = ev;
  if (block.dimension.id !== 'minecraft:overworld') return;

  if (itemStack) {
    const disallowed = ClaimManager.settings.disallowedBlocks || [];
    if (disallowed.includes(itemStack.typeId)) {
      ev.cancel = true;
      notify(player, '');
      return;
    }

    if (
      itemStack.typeId === 'minecraft:water_bucket' ||
      itemStack.typeId === 'minecraft:lava_bucket' ||
      itemStack.typeId === 'minecraft:powder_snow_bucket'
    ) {
      if (wouldBucketAffectProtectedClaims(block.location, player)) {
        ev.cancel = true;
        notify(player, "You don't have permission to place fluids near claims");
        return;
      }
    }
  }

  let isBlockPlacement = false;
  if (itemStack) {
    try {
      if (BlockPermutation.resolve(itemStack.typeId)) {
        isBlockPlacement = true;
      }
    } catch (e) {}
  }

  let cancelled = false;
  const claims = ClaimManager.getClaimsAt(block.location);
  for (const claim of claims) {
    if (cancelled) break;

    const id = block.typeId;
    const isTryingToPlace = player.isSneaking && isBlockPlacement;

    if (id.includes('door') || id.includes('fence_gate')) {
      if (!isTryingToPlace) {
        if (
          !claim.hasPermission(
            PermissionTypes.USE_DOORS,
            player,
            ClaimManager.database,
          )
        ) {
          cancelled = true;
          notify(player, "You don't have permission to use doors");
        }
        continue;
      }
    }

    if (
      id.includes('button') ||
      id.includes('lever') ||
      id.includes('repeater') ||
      id.includes('comparator') ||
      id.includes('daylight_detector') ||
      id === 'minecraft:tripwire_hook' ||
      id === 'minecraft:bell' ||
      id.includes('pressure_plate')
    ) {
      if (!isTryingToPlace) {
        if (
          !claim.hasPermission(
            PermissionTypes.USE_SWITCHES,
            player,
            ClaimManager.database,
          )
        ) {
          cancelled = true;
          notify(player, "You don't have permission to use switches");
        }
        continue;
      }
    }

    if (id.includes('bed') || id.includes('cushion')) {
      if (!isTryingToPlace) {
        if (
          !claim.hasPermission(
            PermissionTypes.USE_BEDS,
            player,
            ClaimManager.database,
          )
        ) {
          cancelled = true;
          notify(player, "You don't have permission to use beds and cushions");
        }
        continue;
      }
    }

    if (id.includes('sign')) {
      if (!isTryingToPlace) {
        if (
          !claim.hasPermission(
            PermissionTypes.EDIT_SIGNS,
            player,
            ClaimManager.database,
          )
        ) {
          cancelled = true;
          notify(player, "You don't have permission to edit signs");
        }
        continue;
      }
    }

    if (id === 'minecraft:frame' || id === 'minecraft:glow_frame' || id.includes('frame')) {
      if (!isTryingToPlace) {
        const allowAttack = claim.permissions.get(PermissionTypes.ALLOW_ATTACKING_UTILITY_ENTITIES);
        const ownerData = claim.getOwnerData(ClaimManager.database);
        const isOwner = ownerData && ownerData.id === player.id;
        if (!allowAttack && !isOwner) {
          cancelled = true;
          notify(player, 'Utility entities are protected in this claim');
        }
        continue;
      }
    }

    if (id === 'minecraft:tnt') {
      if (
        itemStack?.typeId === 'minecraft:flint_and_steel' ||
        itemStack?.typeId === 'minecraft:fire_charge'
      ) {
        if (
          !claim.hasPermission(
            PermissionTypes.ALLOW_TNT,
            player,
            ClaimManager.database,
          )
        ) {
          cancelled = true;
          notify(player, 'Explosions are disabled in this claim');
        }
      }
      continue;
    }

    const isContainer =
      block.getComponent('minecraft:inventory') ||
      id.includes('chest') ||
      id.includes('barrel') ||
      id.includes('shulker') ||
      id.includes('bookshelf') ||
      id.includes('decorated_pot') ||
      id.includes('pot') ||
      id.includes('shelf') ||
      id.includes('anvil') ||
      id.includes('table') ||
      id.includes('loom') ||
      id.includes('grindstone') ||
      id.includes('stonecutter') ||
      id.includes('crafter') ||
      id.includes('brewing_stand') ||
      id.includes('beacon') ||
      id.includes('composter') ||
      id.includes('respawn_anchor');

    if (isContainer) {
      if (!isTryingToPlace) {
        if (
          !claim.hasPermission(
            PermissionTypes.OPEN_CONTAINERS,
            player,
            ClaimManager.database,
          )
        ) {
          cancelled = true;
          notify(player, "You don't have permission to open containers");
        }
        continue;
      }
    }

    if (itemStack?.typeId === SHOVEL_ID) continue;

    if (isBlockPlacement) {
      if (itemStack.typeId === 'minecraft:tnt') {
        if (
          !claim.hasPermission(
            PermissionTypes.ALLOW_TNT,
            player,
            ClaimManager.database,
          )
        ) {
          cancelled = true;
          notify(player, 'Explosions are disabled in this claim');
        }
      }

      if (cancelled) break;

      if (
        !claim.hasPermission(
          PermissionTypes.BREAK_BLOCKS,
          player,
          ClaimManager.database,
        )
      ) {
        cancelled = true;
        notify(player, "You don't have permission to place blocks");
      }
    } else if (itemStack) {
      const id = itemStack.typeId;

      const isUtilityItem =
        UTILITY_ITEMS.includes(id) ||
        id.includes('boat') ||
        id.includes('raft') ||
        id.includes('_spawn_egg') ||
        id === 'minecraft:spawn_egg';

      if (isUtilityItem) {
        if (
          !claim.hasPermission(
            PermissionTypes.BREAK_BLOCKS,
            player,
            ClaimManager.database,
          )
        ) {
          cancelled = true;
          notify(player, "You don't have permission to place entities");
        }
        continue;
      }

      const isTool =
        MODIFICATION_TOOLS.includes(id) ||
        id.includes('_hoe') ||
        (id.includes('_shovel') && id !== SHOVEL_ID) ||
        id.includes('_axe');

      if (isTool) {
        if (
          !claim.hasPermission(
            PermissionTypes.BREAK_BLOCKS,
            player,
            ClaimManager.database,
          )
        ) {
          cancelled = true;
          notify(player, "You don't have permission to modify blocks");
        }
        continue;
      }

      if (id === 'minecraft:fishing_rod') {
        if (
          !claim.hasPermission(
            PermissionTypes.USE_FISHING_RODS,
            player,
            ClaimManager.database,
          )
        ) {
          cancelled = true;
          notify(player, "You don't have permission to use fishing rods");
        }
      } else if (id.includes('trident') || id.includes('spear')) {
        if (
          !claim.hasPermission(
            PermissionTypes.USE_SPEARS,
            player,
            ClaimManager.database,
          )
        ) {
          cancelled = true;
          notify(player, "You don't have permission to use spears");
        }
      } else if (
        id.includes('bow') ||
        id.includes('crossbow') ||
        id.includes('arrow')
      ) {
        if (
          !claim.hasPermission(
            PermissionTypes.USE_PROJECTILE_WEAPONS,
            player,
            ClaimManager.database,
          )
        ) {
          cancelled = true;
          notify(player, "You don't have permission to use projectile weapons");
        }
      } else if (
        id === 'minecraft:snowball' ||
        id === 'minecraft:egg' ||
        id === 'minecraft:ender_pearl' ||
        id.includes('splash_potion') ||
        id.includes('lingering_potion')
      ) {
        if (
          !claim.hasPermission(
            PermissionTypes.USE_THROWABLE_WEAPONS,
            player,
            ClaimManager.database,
          )
        ) {
          cancelled = true;
          notify(player, "You don't have permission to throw potions");
        }
      }

      if (!cancelled) {
        if (
          !claim.hasPermission(
            PermissionTypes.USE_ITEMS_ON_BLOCKS,
            player,
            ClaimManager.database,
          )
        ) {
          cancelled = true;
          notify(player, "You don't have permission to use items on blocks");
        }
      }
    }
  }

  if (cancelled) ev.cancel = true;
});

world.beforeEvents.itemUse.subscribe((ev) => {
  if (!FeatureFlags.isEnabled(FeatureFlags.FEATURES.LAND_CLAIMS)) return;
  const { source: player, itemStack } = ev;
  if (player.dimension.id !== 'minecraft:overworld') return;
  if (!itemStack) return;

  const disallowed = ClaimManager.settings.disallowedBlocks || [];
  if (disallowed.includes(itemStack.typeId)) {
    ev.cancel = true;
    notify(player, '');
    return;
  }

  let cancelled = false;
  const claims = ClaimManager.getClaimsAt(player.location);
  for (const claim of claims) {
    if (cancelled) break;

    const id = itemStack.typeId;

    if (id === 'minecraft:fishing_rod') {
      if (
        !claim.hasPermission(
          PermissionTypes.USE_FISHING_RODS,
          player,
          ClaimManager.database,
        )
      ) {
        cancelled = true;
        notify(player, "You don't have permission to use fishing rods");
      }
    }
    if (id.includes('trident') || id.includes('spear')) {
      if (
        !claim.hasPermission(
          PermissionTypes.USE_SPEARS,
          player,
          ClaimManager.database,
        )
      ) {
        cancelled = true;
        notify(player, "You don't have permission to use spears");
      }
    } else if (
      id.includes('bow') ||
      id.includes('crossbow') ||
      id.includes('arrow')
    ) {
      if (
        !claim.hasPermission(
          PermissionTypes.USE_PROJECTILE_WEAPONS,
          player,
          ClaimManager.database,
        )
      ) {
        cancelled = true;
        notify(player, "You don't have permission to use projectile weapons");
      }
    } else if (
      id === 'minecraft:snowball' ||
      id === 'minecraft:egg' ||
      id === 'minecraft:ender_pearl' ||
      id.includes('splash_potion') ||
      id.includes('lingering_potion')
    ) {
      if (
        !claim.hasPermission(
          PermissionTypes.USE_THROWABLE_WEAPONS,
          player,
          ClaimManager.database,
        )
      ) {
        cancelled = true;
        notify(player, "You don't have permission to throw potions");
      }
    }
  }

  if (cancelled) ev.cancel = true;
});

world.beforeEvents.playerInteractWithEntity.subscribe((ev) => {
  if (!FeatureFlags.isEnabled(FeatureFlags.FEATURES.LAND_CLAIMS)) return;
  const { player, target, itemStack } = ev;
  if (player.dimension.id !== 'minecraft:overworld') return;

  const claims = ClaimManager.getClaimsAt(target.location);
  if (claims.length === 0) return;

  const claim = claims[0];
  let cancelled = false;
  const ownerData = claim.getOwnerData(ClaimManager.database);
  const isOwner = ownerData && ownerData.id === player.id;

  const utilityTypes = [
    'minecraft:armor_stand',
    'minecraft:boat',
    'minecraft:chest_boat',
    'minecraft:minecart',
    'minecraft:chest_minecart',
    'minecraft:hopper_minecart',
    'minecraft:tnt_minecart',
    'minecraft:furnace_minecart',
    'minecraft:command_block_minecart'
  ];

  if (utilityTypes.includes(target.typeId) || target.typeId.includes('boat') || target.typeId.includes('minecart')) {
    if (target.typeId.includes('chest') || target.typeId.includes('hopper')) {
      if (!claim.hasPermission(PermissionTypes.OPEN_CONTAINERS, player, ClaimManager.database)) {
        cancelled = true;
        notify(player, "You don't have permission to open containers");
      }
    } else {
      const allowAttack = claim.permissions.get(PermissionTypes.ALLOW_ATTACKING_UTILITY_ENTITIES);
      if (!allowAttack && !isOwner) {
        cancelled = true;
        notify(player, 'Utility entities are protected in this claim');
      }
    }
  } else if (target.typeId === 'minecraft:sheep') {
    const allowPassive = claim.permissions.get(PermissionTypes.ALLOW_ATTACKING_PASSIVE_MOBS);
    if (!allowPassive && !isOwner) {
      cancelled = true;
      notify(player, 'Passive mobs are protected in this claim');
    }
  } else {
    const itemId = itemStack?.typeId;
    if (itemId === 'minecraft:shears' || itemId === 'minecraft:lead' || itemId === 'minecraft:name_tag' || itemId?.includes('dye')) {
      const allowPassive = claim.permissions.get(PermissionTypes.ALLOW_ATTACKING_PASSIVE_MOBS);
      if (!allowPassive && !isOwner) {
        cancelled = true;
        notify(player, 'Entities are protected in this claim');
      }
    }
  }

  if (cancelled) {
    ev.cancel = true;
  }
});

world.beforeEvents.explosion.subscribe((ev) => {
  if (!FeatureFlags.isEnabled(FeatureFlags.FEATURES.LAND_CLAIMS)) return;
  if (ev.dimension.id !== 'minecraft:overworld') return;

  let origin = null;
  if (ev.source?.location) {
    origin = ev.source.location;
  }
  const sourcePlayer = ev.source?.typeId === 'minecraft:player' ? ev.source : null;

  if (origin && wouldExplosionAffectProtectedClaims(origin, sourcePlayer)) {
    ev.cancel = true;
    return;
  }

  const affectedBlocks = ev.getImpactedBlocks();
  if (affectedBlocks.length === 0) return;

  const safeBlocks = [];
  for (const block of affectedBlocks) {
    let protectedBlock = false;
    const claims = ClaimManager.getClaimsAt(block.location);
    for (const claim of claims) {
      if (protectedBlock) break;
      const allowed = claim.hasPermission(
        PermissionTypes.ALLOW_TNT,
        sourcePlayer,
        ClaimManager.database,
      );
      if (!allowed) {
        protectedBlock = true;
      }
    }

    if (!protectedBlock) {
      safeBlocks.push(block);
    }
  }

  if (safeBlocks.length !== affectedBlocks.length) {
    ev.setImpactedBlocks(safeBlocks);
  }
});

const PLAYER_POSITIONS = new Map();
const LAST_BLOCK_POSITIONS = new Map();

system.runInterval(() => {
  if (!FeatureFlags.isEnabled(FeatureFlags.FEATURES.LAND_CLAIMS)) return;

  for (const player of world.getAllPlayers()) {
    if (player.dimension.id !== 'minecraft:overworld') continue;

    const currentPos = player.location;
    const bx = Math.floor(currentPos.x);
    const by = Math.floor(currentPos.y);
    const bz = Math.floor(currentPos.z);
    const blockKey = `${bx},${by},${bz}`;
    const lastBlockKey = LAST_BLOCK_POSITIONS.get(player.id);
    if (blockKey === lastBlockKey) continue;
    LAST_BLOCK_POSITIONS.set(player.id, blockKey);

    const overlapping = ClaimManager.getClaimsAt(currentPos);
    let insideClaim = overlapping.length > 0 ? overlapping[0] : null;

    if (insideClaim) {
      const canEnter = insideClaim.hasPermission(
        PermissionTypes.ENTER_CLAIM,
        player,
        ClaimManager.database,
      );

      const ownerData = insideClaim.getOwnerData(ClaimManager.database);
      const ownerName = ownerData ? ownerData.name : 'Unknown';

      let infoString = '';
      if (insideClaim.showTitle !== false || (ownerData && ownerData.id === player.id)) {
        infoString = `${insideClaim.name}§r - ${ownerName}`;
      }

      if (!canEnter) {
        const safePos = PLAYER_POSITIONS.get(player.id);
        if (safePos && !insideClaim.isOverlap(safePos)) {
          player.teleport(safePos, { dimension: player.dimension });
          LAST_BLOCK_POSITIONS.set(
            player.id,
            `${Math.floor(safePos.x)},${Math.floor(safePos.y)},${Math.floor(safePos.z)}`,
          );
          if (infoString) player.onScreenDisplay.setActionBar(infoString);
        } else {
          if (infoString) player.onScreenDisplay.setActionBar(infoString);
          notify(player, "You don't have permission to enter this claim");
        }
      } else {
        const lastClaimId = player.getDynamicProperty('32k:last_claim_id');
        const currentSig = insideClaim.name + insideClaim.start.x;

        if (lastClaimId !== currentSig) {
          player.setDynamicProperty('32k:last_claim_id', currentSig);
          if (infoString && !player.getDynamicProperty('32k:has_holoprint')) player.onScreenDisplay.setActionBar(infoString);
        }
        PLAYER_POSITIONS.set(player.id, currentPos);
      }
    } else {
      player.setDynamicProperty('32k:last_claim_id', undefined);
      PLAYER_POSITIONS.set(player.id, currentPos);
    }
  }
}, 10);

world.afterEvents.playerLeave.subscribe((ev) => {
  PLAYER_POSITIONS.delete(ev.playerId);
  LAST_BLOCK_POSITIONS.delete(ev.playerId);
  COOLDOWNS.delete(ev.playerId);
});

world.afterEvents.pistonActivate.subscribe((ev) => {
  if (!FeatureFlags.isEnabled(FeatureFlags.FEATURES.LAND_CLAIMS)) return;
  const { dimension, isExpanding, piston } = ev;
  if (dimension.id !== 'minecraft:overworld') return;

  const pistonBlock = piston.block;
  const pistonLoc = pistonBlock.location;

  const direction = pistonBlock.permutation.getState('facing_direction');
  const moveVector = { x: 0, y: 0, z: 0 };
  if (direction === 0) moveVector.y = -1;
  else if (direction === 1) moveVector.y = 1;
  else if (direction === 2) moveVector.z = -1;
  else if (direction === 3) moveVector.z = 1;
  else if (direction === 4) moveVector.x = -1;
  else if (direction === 5) moveVector.x = 1;

  if (!isExpanding) {
    moveVector.x = -moveVector.x;
    moveVector.y = -moveVector.y;
    moveVector.z = -moveVector.z;
  }

  const pistonClaims = ClaimManager.getClaimsAt(pistonLoc);
  let pistonClaim = pistonClaims.length > 0 ? pistonClaims[0] : null;

  const attachedBlocks = piston.getAttachedBlocks();
  let violationDetected = false;
  const restoreData = [];

  for (const block of attachedBlocks) {
    const newPos = block.location;
    const oldPos = {
      x: newPos.x - moveVector.x,
      y: newPos.y - moveVector.y,
      z: newPos.z - moveVector.z,
    };

    restoreData.push({
      perm: block.permutation,
      newLoc: newPos,
      oldLoc: oldPos,
    });

    if (!violationDetected) {
      const sourceClaims = ClaimManager.getClaimsAt(oldPos);
      let sourceClaim = sourceClaims.length > 0 ? sourceClaims[0] : null;
      if (sourceClaim && (!pistonClaim || pistonClaim.name !== sourceClaim.name)) {
        violationDetected = true;
      }

      const targetClaims = ClaimManager.getClaimsAt(newPos);
      let targetClaim = targetClaims.length > 0 ? targetClaims[0] : null;
      if (targetClaim && (!pistonClaim || pistonClaim.name !== targetClaim.name)) {
        violationDetected = true;
      }
    }
  }

  if (violationDetected) {
    system.run(() => {
      try {
        if (isExpanding) {
          const faceOff = { x: 0, y: 0, z: 0 };
          if (direction === 0) faceOff.y = -1;
          else if (direction === 1) faceOff.y = 1;
          else if (direction === 2) faceOff.z = -1;
          else if (direction === 3) faceOff.z = 1;
          else if (direction === 4) faceOff.x = -1;
          else if (direction === 5) faceOff.x = 1;

          const headLoc = {
            x: pistonLoc.x + faceOff.x,
            y: pistonLoc.y + faceOff.y,
            z: pistonLoc.z + faceOff.z,
          };
          dimension.setBlockPermutation(
            headLoc,
            BlockPermutation.resolve('minecraft:air'),
          );
        }

        dimension.setBlockPermutation(
          pistonLoc,
          BlockPermutation.resolve('minecraft:air'),
        );

        for (const data of restoreData) {
          dimension.setBlockPermutation(
            data.newLoc,
            BlockPermutation.resolve('minecraft:air'),
          );
        }

        for (const data of restoreData) {
          dimension.setBlockPermutation(data.oldLoc, data.perm);
        }
      } catch (e) {}
    });
  }
});

world.beforeEvents.entityHurt.subscribe((ev) => {
  if (!FeatureFlags.isEnabled(FeatureFlags.FEATURES.LAND_CLAIMS)) return;
  const { damageSource, hurtEntity } = ev;
  const damager = damageSource.damagingEntity;

  if (hurtEntity.dimension.id !== 'minecraft:overworld') return;
  if (!damager || damager.typeId !== 'minecraft:player') return;

  const claims = ClaimManager.getClaimsAt(hurtEntity.location);
  if (claims.length === 0) return;

  const claim = claims[0];
  let cancelled = false;

  const ownerData = claim.getOwnerData(ClaimManager.database);
  const isOwner = ownerData && ownerData.id === damager.id;
  const isPlayer = hurtEntity.typeId === 'minecraft:player';

  if (isPlayer) {
    const allowPvp = claim.permissions.get(PermissionTypes.ALLOW_PLAYER_COMBAT);
    if (!allowPvp) {
      cancelled = true;
      notify(damager, 'Player combat is disabled in this claim');
    }
  } else {
    const utilityTypes = [
      'minecraft:armor_stand',
      'minecraft:boat',
      'minecraft:chest_boat',
      'minecraft:minecart',
      'minecraft:chest_minecart',
      'minecraft:hopper_minecart',
      'minecraft:tnt_minecart',
      'minecraft:painting',
      'minecraft:item_frame',
      'minecraft:glow_item_frame',
      'minecraft:end_crystal'
    ];

    if (utilityTypes.includes(hurtEntity.typeId) || hurtEntity.typeId.includes('boat')) {
      const allowAttack = claim.permissions.get(PermissionTypes.ALLOW_ATTACKING_UTILITY_ENTITIES);
      if (!allowAttack && !isOwner) {
        cancelled = true;
        notify(damager, 'Utility entities are protected in this claim');
      }
    } else {
      const tameComponent = hurtEntity.getComponent('minecraft:tameable');
      const hasTameData = tameComponent && tameComponent.tamedToPlayer;
      const familyComp = hurtEntity.getComponent('minecraft:type_family');
      const isMonster = familyComp ? familyComp.hasTypeFamily('monster') : false;
      const isMob = familyComp ? familyComp.hasTypeFamily('mob') : false;

      if (hasTameData || hurtEntity.typeId === 'minecraft:wolf' || hurtEntity.typeId === 'minecraft:cat' || hurtEntity.typeId === 'minecraft:parrot' || hurtEntity.typeId === 'minecraft:horse') {
        const allowAttack = claim.permissions.get(PermissionTypes.ALLOW_ATTACKING_PETS);
        if (!allowAttack && !isOwner) {
          cancelled = true;
          notify(damager, 'Pets are protected in this claim');
        }
      } else if (isMonster) {
        const allowAttack = claim.permissions.get(PermissionTypes.ALLOW_ATTACKING_HOSTILE_MOBS);
        if (!allowAttack && !isOwner) {
          cancelled = true;
          notify(damager, 'Hostile mobs are protected in this claim');
        }
      } else if (hurtEntity.typeId === 'minecraft:bee' || hurtEntity.typeId === 'minecraft:iron_golem' || hurtEntity.typeId === 'minecraft:snow_golem' || hurtEntity.typeId === 'minecraft:polar_bear' || hurtEntity.typeId === 'minecraft:llama' || hurtEntity.typeId === 'minecraft:panda') {
        const allowAttack = claim.permissions.get(PermissionTypes.ALLOW_ATTACKING_NEUTRAL_MOBS);
        if (!allowAttack && !isOwner) {
          cancelled = true;
          notify(damager, 'Neutral mobs are protected in this claim');
        }
      } else if (isMob) {
        const allowAttack = claim.permissions.get(PermissionTypes.ALLOW_ATTACKING_PASSIVE_MOBS);
        if (!allowAttack && !isOwner) {
          cancelled = true;
          notify(damager, 'Passive mobs are protected in this claim');
        }
      } else {
        const allowAttack = claim.permissions.get(PermissionTypes.ALLOW_ATTACKING_PASSIVE_MOBS);
        if (!allowAttack && !isOwner) {
          cancelled = true;
          notify(damager, 'Entities are protected in this claim');
        }
      }
    }
  }

  if (cancelled) {
    ev.cancel = true;
    system.run(() => {
      try {
        if (hurtEntity.isValid) {
          hurtEntity.extinguishFire(true);
        }
      } catch (e) {}
    });
  }
});