import { world, system, EntityComponentTypes } from '@minecraft/server';
import { ClaimManager } from './manager.js';
import { PermissionTypes } from './classes/data_model.js';

const SHOVEL_ID = 'minecraft:golden_shovel';

// Main Particle Loop - Runs every 0.5s (10 ticks)
system.runInterval(() => {
  const players = world.getAllPlayers().filter(p => p.dimension.id === 'minecraft:overworld');

  for (const player of players) {
    const playerData = ClaimManager.getOrCreatePlayer(player);
    if (!playerData) continue;
    // 1. Render First Point (if setting a new claim)
    if (playerData.firstPoint && playerData.resizingClaimName === '') {
      const fP = playerData.firstPoint;
      const minSize = ClaimManager.settings.claimMinimumWidth || 8;
      
      // Spawn a vertical pillar at the anchor
      for (let yOffset = 0; yOffset < 3; yOffset += 0.5) {
        try { player.spawnParticle('minecraft:end_rod', { x: fP.x + 0.5, y: fP.y + 0.5 + yOffset, z: fP.z + 0.5 }); } catch (e) { }
      }

      // Visualize 4 Quadrants (Min Size)
      const particle = 'minecraft:villager_happy';
      const y = fP.y + 1.5; // Slightly above ground
      
      const drawRect = (x, z, w, h) => {
          // Perimeter only
          // Top & Bottom
          for(let i=0; i<w; i++) {
              try { player.spawnParticle(particle, { x: x + i + 0.5, y, z: z + 0.5 }); } catch(e){}
              try { player.spawnParticle(particle, { x: x + i + 0.5, y, z: z + h - 1 + 0.5 }); } catch(e){}
          }
          // Left & Right (exclude corners already drawn? keeping simple is fine)
          for(let i=0; i<h; i++) {
              try { player.spawnParticle(particle, { x: x + 0.5, y, z: z + i + 0.5 }); } catch(e){}
              try { player.spawnParticle(particle, { x: x + w - 1 + 0.5, y, z: z + i + 0.5 }); } catch(e){}
          }
      };

      // Q1: x to x+min, z to z+min
      drawRect(fP.x, fP.z, minSize, minSize);
      // Q2: x-min+1 to x, z to z+min
      drawRect(fP.x - minSize + 1, fP.z, minSize, minSize);
      // Q3: x-min+1 to x, z-min+1 to z
      drawRect(fP.x - minSize + 1, fP.z - minSize + 1, minSize, minSize);
      // Q4: x to x+min, z-min+1 to z
      drawRect(fP.x, fP.z - minSize + 1, minSize, minSize);
    }
    
    // 1.5 Render Resize Preview
    if (playerData.firstPoint && playerData.resizingClaimName !== '') {
        const anchor = playerData.firstPoint;
        const target = { x: Math.floor(player.location.x), z: Math.floor(player.location.z) };
        const minSize = ClaimManager.settings.claimMinimumWidth || 8;
        
        let previewX = target.x;
        let previewZ = target.z;
        let particle = 'minecraft:villager_happy';

        // Calculate Cost & Limit
        const pd = playerData;
        const claim = pd.claims.find(c => c.name === pd.resizingClaimName);
        
        if (claim) {
             const oldWidth = Math.abs(claim.end.x - claim.start.x) + 1;
             const oldLength = Math.abs(claim.end.z - claim.start.z) + 1;
             const oldArea = oldWidth * oldLength;
             
             // Max affordable new area
             const maxArea = pd.claimBlocks.amount + oldArea;
             
             const newWidth = Math.abs(previewX - anchor.x) + 1;
             const newLength = Math.abs(previewZ - anchor.z) + 1;
             const newArea = newWidth * newLength;
             
             if (newArea > maxArea) {
                 // Too big! Clamp.
                 const ratio = Math.sqrt(maxArea / newArea);
                 
                 // Vector from anchor
                 const vecX = previewX - anchor.x;
                 const vecZ = previewZ - anchor.z;
                 
                 // Scaled vector
                 const scaledVecX = vecX * ratio;
                 const scaledVecZ = vecZ * ratio;
                 
                 // New target
                 previewX = Math.floor(anchor.x + scaledVecX);
                 previewZ = Math.floor(anchor.z + scaledVecZ);
                 
                 particle = 'minecraft:villager_happy';
             }
        }
        
        const dx = (previewX >= anchor.x) ? -1 : 1;
        const dz = (previewZ >= anchor.z) ? -1 : 1; // Direction towards anchor
        
        // Draw L-Shaped Corner
        const y = player.location.y + 1;
        
        // Draw Line along X axis (from previewX towards anchor)
        // dx is direction (-1 or 1).
        for(let i=0; i < minSize; i++) {
            const px = previewX + (i * dx);
            try { player.spawnParticle(particle, { x: px + 0.5, y, z: previewZ + 0.5 }); } catch(e){}
        }
        
        // Draw Line along Z axis (from previewZ towards anchor)
        for(let i=0; i < minSize; i++) {
            const pz = previewZ + (i * dz);
            try { player.spawnParticle(particle, { x: previewX + 0.5, y, z: pz + 0.5 }); } catch(e){}
        }
    }
    
    // Define pLoc for use in Claim iteration
    const pLoc = player.location;
    
    // Check if player is holding the shovel
    let claimShovelOut = false;
    const inventory = player.getComponent(EntityComponentTypes.Inventory)?.container;
    if (inventory) {
      const item = inventory.getItem(player.selectedSlotIndex);
      if (item?.typeId === SHOVEL_ID) {
        claimShovelOut = true;
      }
    }
    
    // Debug tag override
    if (player.hasTag('debug_claims')) claimShovelOut = true;

    // 2. Iterate Claims
    ClaimManager.runInAllClaims((claim) => {
      if (!claim || !claim.start || !claim.end) return;

      // Distance Check (Optimization)
      const claimCenter = {
        x: (claim.start.x + claim.end.x) / 2,
        z: (claim.start.z + claim.end.z) / 2
      };
      
      const distSquared = Math.pow(pLoc.x - claimCenter.x, 2) + Math.pow(pLoc.z - claimCenter.z, 2);
      if (distSquared > 4096) return; // > 64 blocks away

      showClaimParticles(player, claim, pLoc, claimShovelOut);
    });
  }
}, 10);

function showClaimParticles(player, claim, pLoc, claimShovelOut) {
      // Permissions
      const isOwner = claim.getOwnerData(ClaimManager.database)?.id === player.id;
      const canEnter = claim.hasPermission(PermissionTypes.ENTER_CLAIM, player, ClaimManager.database);

      // Render Condition:
      const isClose = claim.isOverlap(pLoc, pLoc, 24);
      const shouldRender = (claim.particlesEnabled && isClose) || (isOwner && claimShovelOut);

      if (shouldRender) {
        const particleType = (!canEnter) ? 'minecraft:villager_angry' : 'minecraft:villager_happy';

        const minX = Math.min(claim.start.x, claim.end.x);
        const maxX = Math.max(claim.start.x, claim.end.x);
        const minZ = Math.min(claim.start.z, claim.end.z);
        const maxZ = Math.max(claim.start.z, claim.end.z);
        
        renderClaimBox(player, minX, minZ, maxX, maxZ, pLoc, particleType);
      }
}

function renderClaimBox(player, minX, minZ, maxX, maxZ, pLoc, particleType) {
        const subchunkHeight = 16;
        const feetSubchunkY = Math.floor(pLoc.y / subchunkHeight) * subchunkHeight;
        const headSubchunkY = Math.floor((pLoc.y + 1.62) / subchunkHeight) * subchunkHeight;
        
        const subchunksToRender = new Set();
        subchunksToRender.add(feetSubchunkY);
        subchunksToRender.add(headSubchunkY);

        const density = 1.0; 

        // Helper: Spawn Line
        const spawnLine = (x1, z1, x2, z2, y) => {
           const midX = (x1 + x2) / 2;
           const midZ = (z1 + z2) / 2;
           const len = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(z2 - z1, 2));
           const distToLine = Math.sqrt(Math.pow(midX - pLoc.x, 2) + Math.pow(midZ - pLoc.z, 2));

           if (distToLine > 32 + (len / 2)) return;

           const steps = Math.ceil(len / density);
           for (let i = 0; i <= steps; i++) {
             const t = steps > 0 ? i / steps : 0;
             const x = x1 + (x2 - x1) * t;
             const z = z1 + (z2 - z1) * t;

             if (Math.abs(x - pLoc.x) + Math.abs(z - pLoc.z) > 32) continue;

             try {
                player.spawnParticle(particleType, { x: x + 0.5, y: y, z: z + 0.5 });
             } catch (e) {}
           }
        };

        // Helper: Spawn Vertical Column
        const spawnVerticalLine = (x, z, bottomY, topY) => {
           const dist = Math.sqrt(Math.pow(x - pLoc.x, 2) + Math.pow(z - pLoc.z, 2));
           if (dist > 32) return;

           const height = topY - bottomY;
           const steps = Math.ceil(height / density);
           for (let i = 0; i <= steps; i++) {
             const y = bottomY + (i * density);
             try {
               player.spawnParticle(particleType, { x: x + 0.5, y: y, z: z + 0.5 });
             } catch (e) {}
           }
        };

        subchunksToRender.forEach(baseY => {
           const topY = baseY + subchunkHeight;
           spawnLine(minX, minZ, maxX, minZ, baseY);
           spawnLine(maxX, minZ, maxX, maxZ, baseY);
           spawnLine(maxX, maxZ, minX, maxZ, baseY);
           spawnLine(minX, maxZ, minX, minZ, baseY);

           spawnLine(minX, minZ, maxX, minZ, topY);
           spawnLine(maxX, minZ, maxX, maxZ, topY);
           spawnLine(maxX, maxZ, minX, maxZ, topY);
           spawnLine(minX, maxZ, minX, minZ, topY);

           spawnVerticalLine(minX, minZ, baseY, topY);
           spawnVerticalLine(maxX, minZ, baseY, topY);
           spawnVerticalLine(maxX, maxZ, baseY, topY);
           spawnVerticalLine(minX, maxZ, baseY, topY);
        });
}
