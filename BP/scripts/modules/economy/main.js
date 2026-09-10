import { world, system } from '@minecraft/server';

const FISHING_RADIUS_SQR = 225; // 15^2
const activeClaims = new Map(); // map of playerId to { x, y, z, dimensionId }

world.afterEvents.playerInteractWithBlock.subscribe((ev) => {
    const block = ev.block;
    if (block.typeId === 'minecraft:bell') {
        const dim = block.dimension;
        const blockBelow = dim.getBlock({x: block.x, y: block.y - 1, z: block.z});
        if (blockBelow && blockBelow.typeId === 'minecraft:gold_block') {
            const player = ev.player;
            activeClaims.set(player.id, { x: block.x, y: block.y, z: block.z, dimensionId: dim.id });
            player.sendMessage("§aFishing Claim Activated! Stay within 15 blocks to keep your loot buff.");
            player.addTag('active_fishing_claim');
        }
    }
});

system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        const claim = activeClaims.get(player.id);
        if (claim) {
            if (player.dimension.id !== claim.dimensionId) {
                player.removeTag('active_fishing_claim');
                activeClaims.delete(player.id);
                player.sendMessage("§cFishing Claim lost: You left the dimension.");
                continue;
            }
            
            const dx = player.location.x - claim.x;
            const dy = player.location.y - claim.y;
            const dz = player.location.z - claim.z;
            const distSqr = (dx*dx) + (dy*dy) + (dz*dz);
            
            if (distSqr > FISHING_RADIUS_SQR) {
                player.removeTag('active_fishing_claim');
                activeClaims.delete(player.id);
                player.sendMessage("§cFishing Claim lost: You left the claim area.");
            }
        }
    }
}, 40); // Every 2 seconds
