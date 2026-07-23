import { world, system, BlockPermutation } from '@minecraft/server';
import { ClaimManager } from './manager.js';
import { PermissionTypes } from './classes/data_model.js';
import { DS } from '../../core/ds.js';
import { FeatureFlags } from '../../core/feature_flags.js';

const SHOVEL_ID = 'minecraft:golden_shovel';

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

world.beforeEvents.playerBreakBlock.subscribe(ev => {
if (!FeatureFlags.isEnabled(FeatureFlags.FEATURES.LAND_CLAIMS)) return;

const { player, block, itemStack, dimension } = ev;
if (dimension.id !== 'minecraft:overworld') return;

if (itemStack?.typeId === SHOVEL_ID) {
 ev.cancel = true;
 return;
}

let cancelled = false;
ClaimManager.runInAllClaims(claim => {
 if (cancelled) return;
 if (claim.isOverlap(block.location)) {
 if (!claim.hasPermission(PermissionTypes.BREAK_BLOCKS, player, ClaimManager.database)) {
  cancelled = true;
  notify(player, "You don't have permission to break blocks");
 }
 }
});

if (cancelled) ev.cancel = true;
});

world.beforeEvents.playerInteractWithBlock.subscribe(ev => {
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
ClaimManager.runInAllClaims(claim => {
 if (cancelled) return;
 if (!claim.isOverlap(block.location)) return;

 const id = block.typeId;

 if ((id.includes('door') || id.includes('fence_gate')) && !player.isSneaking) {
 if (!claim.hasPermission(PermissionTypes.USE_DOORS, player, ClaimManager.database)) {
  cancelled = true; notify(player, "You don't have permission to use doors");
 }
 return;
 }
 if ((id.includes('button') || id.includes('lever') || id.includes('repeater') || id.includes('comparator')) && !player.isSneaking) {
 if (!claim.hasPermission(PermissionTypes.USE_SWITCHES, player, ClaimManager.database)) {
  cancelled = true; notify(player, "You don't have permission to use switches");
 }
 return;
 }
 if (id.includes('bed') && !player.isSneaking) {
 if (!claim.hasPermission(PermissionTypes.USE_BEDS, player, ClaimManager.database)) {
  cancelled = true; notify(player, "You don't have permission to use beds");
 }
 return;
 }
 if (id.includes('sign')) {
 if (!claim.hasPermission(PermissionTypes.EDIT_SIGNS, player, ClaimManager.database)) {
  cancelled = true; notify(player, "You don't have permission to edit signs");
 }
 return;
 }
 if (id === 'minecraft:tnt') {
 if (itemStack?.typeId === 'minecraft:flint_and_steel' || itemStack?.typeId === 'minecraft:fire_charge') {
  if (!claim.hasPermission(PermissionTypes.ALLOW_TNT, player, ClaimManager.database)) {
   cancelled = true; notify(player, 'Explosions are disabled in this claim');
  }
 }
 return;
 }
 const isContainer = block.getComponent('minecraft:inventory') || id.includes('chest') || id.includes('barrel') || id.includes('shulker');
 if (isContainer) {
 const isTryingToPlace = player.isSneaking && isBlockPlacement;

 if (!isTryingToPlace) {
  if (!claim.hasPermission(PermissionTypes.OPEN_CONTAINERS, player, ClaimManager.database)) {
   cancelled = true; notify(player, "You don't have permission to open containers");
  }
  return;
 }
 }

 if (itemStack?.typeId === SHOVEL_ID) return;

 if (isBlockPlacement) {
 if (itemStack.typeId === 'minecraft:tnt') {
  if (!claim.hasPermission(PermissionTypes.ALLOW_TNT, player, ClaimManager.database)) {
   cancelled = true; notify(player, 'Explosions are disabled in this claim');
  }
 }

 if (cancelled) return;

 if (!claim.hasPermission(PermissionTypes.BREAK_BLOCKS, player, ClaimManager.database)) {
  cancelled = true;
  notify(player, "You don't have permission to place blocks");
 }
 } else if (itemStack) {
 const id = itemStack.typeId;

 if (id === 'minecraft:fishing_rod') {
  if (!claim.hasPermission(PermissionTypes.USE_FISHING_RODS, player, ClaimManager.database)) {
   cancelled = true; notify(player, "You don't have permission to use fishing rods");
  }
 }
 else if (id.includes('trident') || id.includes('spear')) {
  if (!claim.hasPermission(PermissionTypes.USE_SPEARS, player, ClaimManager.database)) {
   cancelled = true; notify(player, "You don't have permission to use spears");
  }
 }
 else if (id.includes('bow') || id.includes('crossbow') || id.includes('arrow')) {
  if (!claim.hasPermission(PermissionTypes.USE_PROJECTILE_WEAPONS, player, ClaimManager.database)) {
   cancelled = true; notify(player, "You don't have permission to use projectile weapons");
  }
 }
 else if (id === 'minecraft:snowball' || id === 'minecraft:egg' || id === 'minecraft:ender_pearl' || id.includes('splash_potion') || id.includes('lingering_potion')) {
  if (!claim.hasPermission(PermissionTypes.USE_THROWABLE_WEAPONS, player, ClaimManager.database)) {
   cancelled = true; notify(player, "You don't have permission to throw potions");
  }
 }

 if (!cancelled) {
  if (!claim.hasPermission(PermissionTypes.USE_ITEMS_ON_BLOCKS, player, ClaimManager.database)) {
   cancelled = true;
   notify(player, "You don't have permission to use items on blocks");
  }
 }
 }
});

if (cancelled) ev.cancel = true;
});

world.beforeEvents.itemUse.subscribe(ev => {
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
 ClaimManager.runInAllClaims(claim => {
  if (cancelled) return;
  if (!claim.isOverlap(player.location)) return;

  const id = itemStack.typeId;

  if (id === 'minecraft:fishing_rod') {
   if (!claim.hasPermission(PermissionTypes.USE_FISHING_RODS, player, ClaimManager.database)) {
    cancelled = true; notify(player, "You don't have permission to use fishing rods");
   }
  }
  if (id.includes('trident') || id.includes('spear')) {
   if (!claim.hasPermission(PermissionTypes.USE_SPEARS, player, ClaimManager.database)) {
    cancelled = true; notify(player, "You don't have permission to use spears");
   }
  }
  else if (id.includes('bow') || id.includes('crossbow') || id.includes('arrow')) {
   if (!claim.hasPermission(PermissionTypes.USE_PROJECTILE_WEAPONS, player, ClaimManager.database)) {
    cancelled = true; notify(player, "You don't have permission to use projectile weapons");
   }
  }
  else if (id === 'minecraft:snowball' || id === 'minecraft:egg' || id === 'minecraft:ender_pearl' || id.includes('splash_potion') || id.includes('lingering_potion')) {
   if (!claim.hasPermission(PermissionTypes.USE_THROWABLE_WEAPONS, player, ClaimManager.database)) {
    cancelled = true; notify(player, "You don't have permission to throw potions");
   }
  }
 });

 if (cancelled) ev.cancel = true;
});

world.beforeEvents.explosion.subscribe(ev => {
 if (!FeatureFlags.isEnabled(FeatureFlags.FEATURES.LAND_CLAIMS)) return;
 const affectedBlocks = ev.getImpactedBlocks();
 if (affectedBlocks.length === 0) return;

 DS.debug(`Explosion at ${ev.source?.location?.x},${ev.source?.location?.z} affecting ${affectedBlocks.length} blocks.`, 'ExplosionDebug');

 const safeBlocks = [];

 for (const block of affectedBlocks) {
  let protectedBlock = false;
  ClaimManager.runInAllClaims(claim => {
   if (protectedBlock) return;
   if (claim.isOverlap(block.location)) {
    const allowed = claim.hasPermission(PermissionTypes.ALLOW_TNT, null, ClaimManager.database);
    DS.debug(`Block at ${block.location.x},${block.location.z} in claim '${claim.name}'. Allowed: ${allowed}`, 'ExplosionDebug');

    if (!allowed) {
     protectedBlock = true;
    }
   }
  });

  if (!protectedBlock) {
   safeBlocks.push(block);
  } else {
   DS.debug(`Protected block at ${block.location.x},${block.location.z}`, 'ExplosionDebug');
  }
 }

 if (safeBlocks.length !== affectedBlocks.length) {
  DS.debug(`Preventing damage to ${affectedBlocks.length - safeBlocks.length} blocks.`, 'ExplosionDebug');
  ev.setImpactedBlocks(safeBlocks);
 }
});

const PLAYER_POSITIONS = new Map();

system.runInterval(() => {
if (!FeatureFlags.isEnabled(FeatureFlags.FEATURES.LAND_CLAIMS)) return;

for (const player of world.getAllPlayers()) {
 if (player.dimension.id !== 'minecraft:overworld') continue;

 const currentPos = player.location;
 let insideClaim = null;

 ClaimManager.runInAllClaims(claim => {
 if (insideClaim) return;
 if (claim.isOverlap(currentPos)) {
  insideClaim = claim;
 }
 });

 if (insideClaim) {
 const canEnter = insideClaim.hasPermission(PermissionTypes.ENTER_CLAIM, player, ClaimManager.database);

 const ownerData = insideClaim.getOwnerData(ClaimManager.database);
 const ownerName = ownerData ? ownerData.name : 'Unknown';
 const infoString = `${insideClaim.name}§r - ${ownerName}`;

 if (!canEnter) {
  const safePos = PLAYER_POSITIONS.get(player.id);
  if (safePos && !insideClaim.isOverlap(safePos)) {
   player.teleport(safePos, { dimension: player.dimension });
   player.onScreenDisplay.setActionBar(infoString);
  } else {
   player.onScreenDisplay.setActionBar(infoString);
   notify(player, "You don't have permission to enter this claim");
  }
 } else {
  player.onScreenDisplay.setActionBar(infoString);

  const lastClaimId = player.getDynamicProperty('ds:last_claim_id');
  const currentSig = insideClaim.name + insideClaim.start.x;

  if (lastClaimId !== currentSig) {
   player.setDynamicProperty('ds:last_claim_id', currentSig);
  }
  PLAYER_POSITIONS.set(player.id, currentPos);
 }
 } else {
  PLAYER_POSITIONS.set(player.id, currentPos);
 }
}
}, 10);

world.afterEvents.pistonActivate.subscribe(ev => {
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

 let pistonClaim = null;
 ClaimManager.runInAllClaims(c => {
  if (pistonClaim) return;
  if (c.isOverlap(pistonLoc)) pistonClaim = c;
 });

 const attachedBlocks = piston.getAttachedBlocks();
 let violationDetected = false;
 const restoreData = [];

 for (const block of attachedBlocks) {
  const newPos = block.location;
  const oldPos = {
   x: newPos.x - moveVector.x,
   y: newPos.y - moveVector.y,
   z: newPos.z - moveVector.z
  };

  restoreData.push({
   perm: block.permutation,
   newLoc: newPos,
   oldLoc: oldPos
  });

  if (!violationDetected) {
   let sourceClaim = null;
   ClaimManager.runInAllClaims(c => {
    if (sourceClaim) return;
    if (c.isOverlap(oldPos)) sourceClaim = c;
   });
   if (sourceClaim && (!pistonClaim || pistonClaim.id !== sourceClaim.id)) {
    violationDetected = true;
   }

   let targetClaim = null;
   ClaimManager.runInAllClaims(c => {
    if (targetClaim) return;
    if (c.isOverlap(newPos)) targetClaim = c;
   });
   if (targetClaim && (!pistonClaim || pistonClaim.id !== targetClaim.id)) {
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

     const headLoc = { x: pistonLoc.x + faceOff.x, y: pistonLoc.y + faceOff.y, z: pistonLoc.z + faceOff.z };
     dimension.setBlockPermutation(headLoc, BlockPermutation.resolve('minecraft:air'));
    }

    dimension.setBlockPermutation(pistonLoc, BlockPermutation.resolve('minecraft:air'));

    for (const data of restoreData) {
     dimension.setBlockPermutation(data.newLoc, BlockPermutation.resolve('minecraft:air'));
    }

    for (const data of restoreData) {
     dimension.setBlockPermutation(data.oldLoc, data.perm);
    }

   } catch (e) {
   }
  });
 }
});