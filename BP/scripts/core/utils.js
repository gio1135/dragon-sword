/**
 * Dragon Sword Core Utilities
 */
import { Dimension, Vector3 } from "@minecraft/server";

export const Utils = {
    /**
     * Finds a safe location near the given position in the specified dimension.
     * Scans a small radius for a solid block with air above it.
     * @param {Dimension} dimension
     * @param {Vector3} centerLocation
     * @returns {Vector3}
     */
    findSafeLocation(dimension, centerLocation) {
        const radius = 3;
        
        // Iterate spirally or just simple loops to find a safe spot
        for (let x = -radius; x <= radius; x++) {
            for (let z = -radius; z <= radius; z++) {
                // Avoid exact center if it's potentially unsafe (portal)
                if (x === 0 && z === 0) continue;

                const targetBase = {
                    x: Math.floor(centerLocation.x) + x,
                    y: Math.floor(centerLocation.y),
                    z: Math.floor(centerLocation.z)
                };

                // Check vertical column
                for (let yOffset = -2; yOffset <= 2; yOffset++) {
                    const checkPos = { x: targetBase.x, y: targetBase.y + yOffset, z: targetBase.z };
                    
                    try {
                        const block = dimension.getBlock(checkPos);
                        if (!block) continue;

                        // Unsafe blocks to stand on
                        if (block.isAir || 
                            block.typeId.includes("portal") || 
                            block.typeId.includes("lava") || 
                            block.typeId.includes("fire")) {
                            continue;
                        }

                        // Check space above
                        const above1 = block.above(1);
                        const above2 = block.above(2);

                        if (above1 && above1.isAir && above2 && above2.isAir) {
                            return { 
                                x: checkPos.x + 0.5, 
                                y: checkPos.y + 1, 
                                z: checkPos.z + 0.5 
                            };
                        }
                    } catch (e) {
                        // Chunk not loaded or error
                        continue;
                    }
                }
            }
        }

        // Fallback: simple offset
        return {
            x: centerLocation.x + 3,
            y: centerLocation.y,
            z: centerLocation.z + 3
        };
    }
};
