import { world, system } from '@minecraft/server';
import { CHUNK_SIZE } from './constants.js';
import { DS } from '../../core/ds.js';

export class BorderCleanupJob {
    constructor(dimensionId, chunksToClean) {
        this.dimensionId = dimensionId;
        this.queue = chunksToClean; // Array of {x, z} (chunk coords)
        this.isRunning = false;
        this.currentJobId = null;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.processQueue();
    }

    processQueue() {
        if (this.queue.length === 0) {
            this.isRunning = false;
            return;
        }

        const chunk = this.queue.shift();
        
        try {
            const dimension = world.getDimension(this.dimensionId);
            
            // Define ticking area for this chunk
            const areaName = `clean_${chunk.x}_${chunk.z}`;
            const xMin = chunk.x * CHUNK_SIZE;
            const zMin = chunk.z * CHUNK_SIZE;
            const xMax = xMin + 15;
            const zMax = zMin + 15;

            // Add ticking area
            system.run(() => {
                try {
                    dimension.runCommandAsync(`tickingarea add ${xMin} 0 ${zMin} ${xMax} 0 ${zMax} ${areaName}`);
                } catch (e) {
                    // Ticking area might already exist or be full. 
                    // Retry this chunk later? For now, we log and skip to avoid infinite loops if it's a persistent error.
                    // Actually, if it's full, we should probably wait.
                    // But for simplicity, we'll try to proceed.
                }

                // Wait for tick (next run)
                system.run(() => {
                    try {
                        const y = dimension.id === 'minecraft:overworld' ? -64 : 0;
                        
                        // We need to clean the loop around the chunk manually or fill?
                        // Since we know this whole chunk WAS part of the border line, 
                        // we can iterate the relevant blocks.
                        // However, strictly speaking, a chunk is only "dirty" if it contains the border.
                        // The queued chunks should only be the ones that actually had border blocks.
                        
                        // Optimization: Just replace border_block with bedrock in the whole chunk at Y level
                        // This assumes border_block is ONLY used for this purpose at this Y level.
                        dimension.runCommandAsync(`fill ${xMin} ${y} ${zMin} ${xMax} ${y} ${zMax} bedrock replace border_block`);
    
                    } catch (e) {
                         DS.log(`Error cleaning chunk ${chunk.x},${chunk.z}: ${e}`);
                    }
    
                    // Remove ticking area
                    system.run(() => {
                        try {
                            dimension.runCommandAsync(`tickingarea remove ${areaName}`);
                        } catch(e) {}
                        
                        // Schedule next batch
                        this.processQueue();
                    });
                });
            });

        } catch (error) {
            DS.log(`Cleanup job error: ${error}`);
            this.isRunning = false;
        }
    }
}
