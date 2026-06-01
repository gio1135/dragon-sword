import { world, system } from '@minecraft/server';
import { ClaimManager } from './manager.js';
import { ClaimUI } from './ui.js';
import { FeatureFlags } from '../../core/feature_flags.js';
import './protection.js';
import './visuals.js';

/**
 * Main Entry Point
 */
const SHOVEL_ID = 'minecraft:golden_shovel';

// Item Use (Right Click) -> Open Menu
world.beforeEvents.itemUse.subscribe(ev => {
  const { source: player, itemStack } = ev;
  if (!FeatureFlags.isEnabled(FeatureFlags.FEATURES.LAND_CLAIMS)) return;

  if (itemStack.typeId === SHOVEL_ID) {
    system.run(() => {
      ClaimUI.openMainMenu(player);
    });
  }
});

// Track History
world.afterEvents.playerSpawn.subscribe(ev => {
  ClaimManager.getOrCreatePlayer(ev.player);
});

// Shovel Interact (Right Click Block)
world.beforeEvents.playerBreakBlock.subscribe(ev => {
  const { player, block, itemStack } = ev;
  if (itemStack?.typeId === SHOVEL_ID) {
    if (!FeatureFlags.isEnabled(FeatureFlags.FEATURES.LAND_CLAIMS)) return;
    
    ev.cancel = true;
    system.run(() => {
      const pd = ClaimManager.getOrCreatePlayer(player);
      
      // 1. Check if we are interacting with a corner of an existing claim (Resizing)
      let isResize = false;
      
      for (const claim of pd.claims) {
        if (!claim || !claim.start || !claim.end) continue;
        // Check all 4 corners
        const corners = [
          { x: claim.start.x, z: claim.start.z },
          { x: claim.start.x, z: claim.end.z },
          { x: claim.end.x, z: claim.start.z },
          { x: claim.end.x, z: claim.end.z }
        ];
        
        if (corners.some(c => c.x === block.location.x && c.z === block.location.z)) {
          // Found a corner!
          
          // Determine which corner I clicked
          const clicked = corners.find(c => c.x === block.location.x && c.z === block.location.z);
          
          // Opposite X: if clicked start.x, take end.x
          const oppX = (clicked.x === claim.start.x) ? claim.end.x : claim.start.x;
          const oppZ = (clicked.z === claim.start.z) ? claim.end.z : claim.start.z;
          
          pd.firstPoint = { x: oppX, y: block.location.y, z: oppZ };
          pd.resizingClaimName = claim.name;
          isResize = true;
          
          player.sendMessage(`§aResizing '§f${claim.name}§a'. Select new corner`);
          player.playSound('random.orb');
          break;
        }
      }

      // 2. If not resizing, treat as normal shovel interaction (Set Corner 1)
      if (!isResize) {
        // Cancel resize state ONLY if we are starting fresh (no firstPoint set)
        if (!pd.firstPoint) {
          pd.resizingClaimName = ''; 
        }
        handleShovelInteraction(player, block.location);
      }
    });
  }
});

function handleShovelInteraction(player, location) {
  const pd = ClaimManager.getOrCreatePlayer(player);

  // Logic: Set Point 1 -> Set Point 2 -> Create/Resize.
  if (!pd.firstPoint) {
    const maxClaims = ClaimManager.settings.maxClaimAmount;
    if (pd.claims.length >= maxClaims && pd.resizingClaimName === '') {
      // Only check limit for NEW claims
      player.sendMessage(`§cYou have reached the maximum of §6${maxClaims}§c claims`);
      return;
    }

    pd.firstPoint = location;
    player.sendMessage('§aFirst corner set. Sneak + break second corner to claim');
    player.playSound('random.orb');
    
    // Visuals
    const min = ClaimManager.settings.claimMinimumWidth;
    const y = location.y + 1;
    const { x, z } = location;
    const particle = 'minecraft:villager_happy';
    const offsets = [
      { x: min - 1, z: min - 1 },
      { x: -(min - 1), z: min - 1 },
      { x: -(min - 1), z: -(min - 1) },
      { x: min - 1, z: -(min - 1) }
    ];
    for (const off of offsets) {
      try { 
        // Only spawn if player is valid
        if (player && player.isValid()) {
          player.spawnParticle(particle, { x: x + off.x, y, z: z + off.z }); 
        }
      } catch(e) {}
    }

  } else {
    // Create/Resize Claim
    pd.oppositeCorner = location;
    
    // Calculate Area
    const dx = Math.abs(pd.firstPoint.x - pd.oppositeCorner.x) + 1;
    const dz = Math.abs(pd.firstPoint.z - pd.oppositeCorner.z) + 1;
    const area = dx * dz;

    // Validate Min Size
    const minSize = ClaimManager.settings.claimMinimumWidth;
    if (dx < minSize || dz < minSize) {
      player.sendMessage(`§cClaim too small! Minimum is §6${minSize}x${minSize}`);
      return;
    }

    // Validate Max Claims (Only if New)
    if (pd.resizingClaimName === '') {
      const maxClaims = ClaimManager.settings.maxClaimAmount;
      if (pd.claims.length >= maxClaims) {
        player.sendMessage(`§cYou have reached the maximum of §6${maxClaims}§c claims`);
        pd.firstPoint = null;
        return;
      }
    }

    // Cost Check / Preview
    // If Resizing, we need to know the OLD area to calc difference.
    let costDiff = area;
    let oldArea = 0;
    
    if (pd.resizingClaimName !== '') {
      const existing = pd.claims.find(c => c.name === pd.resizingClaimName);
      if (existing) {
        const oldDx = Math.abs(existing.start.x - existing.end.x) + 1;
        const oldDz = Math.abs(existing.start.z - existing.end.z) + 1;
        oldArea = oldDx * oldDz;
        costDiff = area - oldArea;
      } else {
        // Error state
        pd.firstPoint = null;
        pd.resizingClaimName = '';
        return;
      }
    }

    if (pd.claimBlocks.amount < costDiff) {
       player.sendMessage(`§cNot enough claim blocks! Cost: §6${costDiff}§c, You have: §6${pd.claimBlocks.amount}`);
       return; 
    }

    // Validate Overlap
    let overlap = false;
    let overlappingClaimName = '';
    
    ClaimManager.runInAllClaims(c => {
       if (overlap) return; // already found one
       
       const isSelfName = (pd.resizingClaimName !== '' && c.name === pd.resizingClaimName);

       // Ignore self if resizing. Check both name and owner match just in case.
       if (isSelfName) {
           const owner = c.getOwnerData(ClaimManager.database);
           if (owner && owner.id === player.id) {
               return; 
           }
       }
       
       if (c.isOverlap(pd.firstPoint, pd.oppositeCorner)) {
           overlap = true;
           overlappingClaimName = c.name;
       }
    });

    if (overlap) {
      player.sendMessage(`§cClaim overlaps with existing claim: '§f${overlappingClaimName}§c'`);
      return; 
    }

    // Opens Confirmation UI (Async)
    // CAPTURE VALUES NOW before clearing state
    const fP = pd.firstPoint;
    const oppC = pd.oppositeCorner;
    const rName = pd.resizingClaimName;
    const finalArea = area;
    const diff = costDiff;

    system.run(() => {
        if (rName !== '') {
            ClaimUI.openResizeConfirmMenu(player, rName, fP, oppC, finalArea, diff);
        } else {
            ClaimUI.openNewClaimMenu(player, fP, oppC, finalArea);
        }
    });
    
    // Clear state
    pd.firstPoint = null;
    pd.resizingClaimName = '';
  }
}

// Slot Monitor for Cancellation
system.runInterval(() => {
   for (const player of world.getAllPlayers()) {
       const pd = ClaimManager.getOrCreatePlayer(player);
       if (!pd || (!pd.firstPoint && pd.resizingClaimName === '')) continue;

       const inventory = player.getComponent('inventory')?.container;
       const item = inventory?.getItem(player.selectedSlotIndex);
       
       if (item?.typeId !== SHOVEL_ID) {
           // Player deselected shovel while in creation/resize mode
           pd.firstPoint = null;
           pd.resizingClaimName = '';
           player.sendMessage('§7Claim creation canceled');
           player.playSound('note.bass');
       }
   }
}, 10);

// Active Playtime Loop (20 ticks = 1 second)
system.runInterval(() => {
    const paymentAmount = ClaimManager.settings.hourlyClaimBlockPayment;
    if (paymentAmount <= 0) return;

    const TICKS_PER_HOUR = 72000; // 20 * 60 * 60

    for (const player of world.getAllPlayers()) {
        const pd = ClaimManager.getOrCreatePlayer(player);
        if (!pd) continue;
        
        // Outlaw Check: No blocks if stage >= 2
        if (pd.outlawStatus && pd.outlawStatus.stage >= 2) continue;

        // Increment ticks (runInterval is 20 ticks)
        if (!pd.playtimeTicks) pd.playtimeTicks = 0;
        pd.playtimeTicks += 20;

        if (pd.playtimeTicks >= TICKS_PER_HOUR) {
            pd.claimBlocks.amount += paymentAmount;
            pd.playtimeTicks -= TICKS_PER_HOUR; // Keep overflow
            
            player.sendMessage(`§aReceived §6${paymentAmount} §aclaim blocks`);
            player.playSound('random.levelup');
            ClaimManager.save();
        }
    }
}, 20); // Run every second to update ticks accurately
