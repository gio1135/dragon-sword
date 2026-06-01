import { world, system } from '@minecraft/server';
import { DS } from '../../core/ds.js';
import { Utils } from '../../core/utils.js';
import { Lang } from '../../lang/Lang.js';

// Dimension lock feature
const SETTINGS = {
  LOCK_NETHER: 'ds:lock_nether',
  LOCK_END: 'ds:lock_end'
};

const DIMENSIONS = {
  NETHER: 'minecraft:nether',
  THE_END: 'minecraft:the_end',
  OVERWORLD: 'minecraft:overworld'
};

// 0. Register Properties
function isLocked(propertyId) {
  const val = world.getDynamicProperty(propertyId);
  return val === undefined ? false : val;
}

// 1. Monitor dimension changes (Breach Protection)
world.afterEvents.playerDimensionChange.subscribe((event) => {
  const { player, toDimension, fromDimension, fromLocation } = event;

  let locked = false;
  let msgKey = '';

  if (toDimension.id === DIMENSIONS.NETHER && isLocked(SETTINGS.LOCK_NETHER)) {
    locked = true;
    msgKey = 'chat.locked:nether';
  } else if (toDimension.id === DIMENSIONS.THE_END && isLocked(SETTINGS.LOCK_END)) {
    locked = true;
    msgKey = 'chat.locked:the_end';
  }

  if (locked) {
    system.run(() => {
      try {
        // Break portal blocks and restore terrain
        cleanupPortal(resultLoc(player.location), toDimension);

        // Teleport back
        const safeLoc = Utils.findSafeLocation(fromDimension, fromLocation);
        player.teleport(safeLoc, { dimension: fromDimension });
        
        if (msgKey) player.sendMessage(Lang.translate(msgKey));

      } catch (e) {
        DS.log(`Dimension lock error: ${e}`);
      }
    });
  }
});

function resultLoc(loc) {
  return { x: Math.floor(loc.x), y: Math.floor(loc.y), z: Math.floor(loc.z) };
}

function cleanupPortal(center, dim) {
  // Heuristic: Check block below the portal 'frame' bottom to decide if mid-air or embedded.
  // Standard portal base is at player y-1. Platform is y-1. Check y-2.
  const below = dim.getBlock({ x: center.x, y: center.y - 2, z: center.z });
  const isMidAir = below && below.isAir; // Simple check

  const fillBlock = isMidAir ? 'minecraft:air' : 'minecraft:netherrack';

  // Scan area covering standard 4x5 frame + platform extensions
  // Bounds: x/z +/- 3, y -1 to 5
  // Note: 11 blocks wide platform? Let's check radius 4 just to be safe.
  
  for (let x = -4; x <= 4; x++) {
    for (let y = -1; y <= 5; y++) {
      for (let z = -4; z <= 4; z++) {
        const pos = { x: center.x + x, y: center.y + y, z: center.z + z };
        try {
          const b = dim.getBlock(pos);
          if (!b) continue;

          // Break Portal
          if (b.typeId === 'minecraft:portal') {
            b.setType('minecraft:air');
            continue;
          }

          // Handle Frame/Platform
          if (b.typeId === 'minecraft:obsidian' || (b.typeId === 'minecraft:netherrack' && y <= 0)) {
            // Only affect blocks that seem part of the portal structure
            // Refine heuristic: adjacent to original portal center?
            // Distance check?
            if (isPartofPortal(dim, pos, center)) {
               b.setType(fillBlock);
            }
          }
        } catch (e) { }
      }
    }
  }
}

function isPartofPortal(dim, pos, center) {
  // Simple distance check for now, can be improved to flood fill
  const dx = Math.abs(pos.x - center.x);
  const dy = pos.y - center.y; // relative to player feet
  const dz = Math.abs(pos.z - center.z);
  
  // Standard frame is roughly 4x5. Platform extends out.
  // If it's obsidian close to center, it's likely frame.
  if (dx <= 2 && dz <= 2 && dy <= 5 && dy >= -1) return true;
  
  // Platform netherrack extensions
  if (dy === -1 && (dx <= 5 || dz <= 5)) return true;
  
  return false;
}

// 2. Continuous Portal Scan (Prevent Dispensers/Other Methods)
system.runInterval(() => {
  const netherLocked = isLocked(SETTINGS.LOCK_NETHER);
  const endLocked = isLocked(SETTINGS.LOCK_END);

  if (!netherLocked && !endLocked) return;

  for (const player of world.getAllPlayers()) {
    const dim = player.dimension;
    const { x: px, y: py, z: pz } = player.location;
    const rad = 4; 
    
    for (let x = -rad; x <= rad; x++) {
      for (let y = -2; y <= 4; y++) {
        for (let z = -rad; z <= rad; z++) {
          try {
            const block = dim.getBlock({ x: px + x, y: py + y, z: pz + z });
            if (!block) continue;
            
            // Just break the portal blocks here, full cleanup happens on breach
            if (netherLocked && block.typeId === 'minecraft:portal') {
              block.setType('minecraft:air');
            }
            if (endLocked && block.typeId === 'minecraft:end_portal') {
              block.setType('minecraft:air');
            }
          } catch (e) { }
        }
      }
    }
  }
}, 30);

// 3. Prevent Interaction
world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
  const { player, itemStack, block } = event;
  if (!itemStack) return;

  if (block.typeId === 'minecraft:obsidian') {
    if (itemStack.typeId === 'minecraft:flint_and_steel' || itemStack.typeId === 'minecraft:fire_charge') {
      if (isLocked(SETTINGS.LOCK_NETHER)) {
        event.cancel = true;
        system.run(() => player.sendMessage(Lang.translate('chat.locked:nether')));
      }
    }
  }

  if (block.typeId === 'minecraft:end_portal_frame') {
    if (itemStack.typeId === 'minecraft:ender_eye') {
      if (isLocked(SETTINGS.LOCK_END)) {
        event.cancel = true;
        system.run(() => player.sendMessage(Lang.translate('chat.locked:the_end')));
      }
    }
  }
});

export const DimensionLock = {
  toggleNether() {
    const oldVal = isLocked(SETTINGS.LOCK_NETHER);
    const newVal = !oldVal;
    world.setDynamicProperty(SETTINGS.LOCK_NETHER, newVal);
    
    if (newVal) kickPlayers(DIMENSIONS.NETHER);
    return newVal;
  },
  toggleEnd() {
    const oldVal = isLocked(SETTINGS.LOCK_END);
    const newVal = !oldVal;
    world.setDynamicProperty(SETTINGS.LOCK_END, newVal);

    if (newVal) kickPlayers(DIMENSIONS.THE_END);
    return newVal;
  },
  isNetherLocked: () => isLocked(SETTINGS.LOCK_NETHER),
  isEndLocked: () => isLocked(SETTINGS.LOCK_END)
};

function kickPlayer(player) {
  const overworld = world.getDimension(DIMENSIONS.OVERWORLD);
  const dimId = player.dimension.id;
  
  let msgKey = '';
  if (dimId === DIMENSIONS.NETHER) msgKey = 'chat.locked:nether';
  else if (dimId === DIMENSIONS.THE_END) msgKey = 'chat.locked:the_end';
  
  if (msgKey) player.sendMessage(Lang.translate(msgKey));

  // Try Bed/Spawn point
  const spawnPoint = player.getSpawnPoint();
  if (spawnPoint && spawnPoint.dimension.id === DIMENSIONS.OVERWORLD) {
     player.teleport(spawnPoint, { dimension: overworld });
     return;
  }
  
  // Fallback to World Spawn
  const worldSpawn = world.getDefaultSpawnLocation();
  const safe = Utils.findSafeLocation(overworld, worldSpawn);
  player.teleport(safe, { dimension: overworld });
}

function kickPlayers(dimId) {
  for (const p of world.getAllPlayers()) {
     if (p.dimension.id === dimId) {
       kickPlayer(p);
     }
  }
}

// 4. On Join Check
world.afterEvents.playerSpawn.subscribe((ev) => {
  const { player } = ev;
  const dimId = player.dimension.id;
  
  if (dimId === DIMENSIONS.NETHER && isLocked(SETTINGS.LOCK_NETHER)) {
    kickPlayer(player);
  } else if (dimId === DIMENSIONS.THE_END && isLocked(SETTINGS.LOCK_END)) {
    kickPlayer(player);
  }
});
