import { world, system, EquipmentSlot, ItemStack } from '@minecraft/server';
import { ClaimManager } from '../land_claims/manager.js';
import { PermissionTypes } from '../land_claims/classes/data_model.js';
import { FeatureFlags } from '../../core/feature_flags.js';

// Dictionary to track active teleport timers
const activeTeleports = new Map();

world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
    const { player, block, itemStack } = ev;
    if (!itemStack) return;

    if (block.typeId === 'minecraft:lodestone') {
        if (itemStack.typeId === 'minecraft:compass' || itemStack.typeId === 'minecraft:lodestone_compass') {
            // Check land claims permissions.
            let hasPermission = true;
            if (FeatureFlags.isEnabled(FeatureFlags.FEATURES.LAND_CLAIMS)) {
                ClaimManager.runInAllClaims(claim => {
                    if (!hasPermission) return;
                    if (claim.isOverlap(block.location)) {
                        if (!claim.hasPermission(PermissionTypes.USE_ITEMS_ON_BLOCKS, player, ClaimManager.database)) {
                            hasPermission = false;
                        }
                    }
                });
            }

            if (!hasPermission) {
                // Deny interaction
                system.run(() => {
                    player.sendMessage("§cYou don't have permission to use this lodestone.");
                });
                ev.cancel = true;
                return;
            }

            // Bind compass manually
            ev.cancel = true;
            
            system.run(() => {
                const eq = player.getComponent('minecraft:equippable');
                const slot = eq.getEquipmentSlot(EquipmentSlot.Mainhand);
                
                // Create bound compass
                const boundCompass = new ItemStack('minecraft:lodestone_compass', 1);
                const loc = block.location;
                boundCompass.nameTag = "§bBound Compass";
                boundCompass.setLore([`§7Lodestone: ${loc.x}, ${loc.y}, ${loc.z}`]);
                
                if (itemStack.amount > 1) {
                    slot.amount -= 1;
                    // Try to give the bound compass, otherwise drop it
                    const inv = player.getComponent('minecraft:inventory').container;
                    let added = false;
                    for (let i = 0; i < inv.size; i++) {
                        if (!inv.getItem(i)) {
                            inv.setItem(i, boundCompass);
                            added = true;
                            break;
                        }
                    }
                    if (!added) {
                        player.dimension.spawnItem(boundCompass, player.location);
                    }
                } else {
                    slot.setItem(boundCompass);
                }
                
                player.playSound('respawn_anchor.set_spawn');
                player.sendMessage("§aCompass bound to lodestone.");
            });
        }
    }
});

world.beforeEvents.itemUse.subscribe((ev) => {
    const { source: player, itemStack } = ev;
    if (itemStack.typeId !== 'minecraft:lodestone_compass') return;

    const lore = itemStack.getLore();
    if (!lore || lore.length === 0) return;

    const match = lore[0].match(/Lodestone:\s*(-?\d+),\s*(-?\d+),\s*(-?\d+)/);
    if (!match) return;

    ev.cancel = true;

    const targetX = parseInt(match[1]);
    const targetY = parseInt(match[2]);
    const targetZ = parseInt(match[3]);

    system.run(() => {
        // Prevent overlapping teleports
        if (activeTeleports.has(player.id)) {
            player.sendMessage("§cTeleportation already in progress.");
            return;
        }

        let block;
        try {
            block = player.dimension.getBlock({ x: targetX, y: targetY, z: targetZ });
        } catch (e) {}
        
        if (!block || block.typeId !== 'minecraft:lodestone') {
            player.sendMessage("§cThe lodestone has been destroyed or is inaccessible.");
            return;
        }

        const startLoc = player.location;
        let ticks = 0;
        const totalTicks = 100; // 5 seconds

        const tpInterval = system.runInterval(() => {
            const currentLoc = player.location;
            
            // Check for movement (more than 0.5 blocks)
            const dist = Math.sqrt(
                Math.pow(currentLoc.x - startLoc.x, 2) +
                Math.pow(currentLoc.y - startLoc.y, 2) +
                Math.pow(currentLoc.z - startLoc.z, 2)
            );

            if (dist > 0.5) {
                player.onScreenDisplay.setTitle(" "); // Clear title
                player.sendMessage("§cTeleportation cancelled due to movement.");
                system.clearRun(tpInterval);
                activeTeleports.delete(player.id);
                return;
            }

            if (ticks >= totalTicks) {
                // Teleport
                system.clearRun(tpInterval);
                activeTeleports.delete(player.id);
                
                // Check lodestone one last time
                let finalBlock;
                try {
                    finalBlock = player.dimension.getBlock({ x: targetX, y: targetY, z: targetZ });
                } catch (e) {}

                if (!finalBlock || finalBlock.typeId !== 'minecraft:lodestone') {
                    player.onScreenDisplay.setTitle(" ");
                    player.sendMessage("§cThe lodestone was destroyed.");
                    return;
                }

                player.teleport({ x: targetX + 0.5, y: targetY + 1, z: targetZ + 0.5 }, { dimension: player.dimension });
                player.playSound('mob.endermen.portal');
                player.onScreenDisplay.setTitle(" ");
                player.sendMessage("§aTeleported successfully.");
                return;
            }

            // Countdown title
            const remainingSeconds = Math.ceil((totalTicks - ticks) / 20);
            player.onScreenDisplay.setTitle(`§bTeleporting in ${remainingSeconds}...`);
            ticks += 10;
        }, 10);

        activeTeleports.set(player.id, tpInterval);
    });
});
