import { world, system } from '@minecraft/server';
import {
    CHUNK_SIZE,
    DEFAULTS,
    DEFAULT_DIMENSION_CONFIG,
    SOUNDS,
} from './constants.js';
import {
    getDimensionKey,
    hasBypassPermission,
    findSafeY,
} from './utils.js';
import { BorderEventEmitter, BorderEvents } from './events.js';
import { DS } from '../../core/ds.js';
import { BorderBlockManager } from './physical_border.js';
import { FeatureFlags } from '../../core/feature_flags.js';

/**
 * Manages world border functionality across all dimensions.
 * All border sizes are stored and managed in CHUNKS.
 */
class WorldBorderManagerClass {
    constructor() {
        this.config = JSON.parse(JSON.stringify(DEFAULT_DIMENSION_CONFIG));
        this.events = new BorderEventEmitter();
        this.init();
    }

    // ==========================================
    // HELPER: Convert chunks to blocks
    // ==========================================
    
    chunksToBlocks(chunks) {
        return chunks * CHUNK_SIZE;
    }

    // ==========================================
    // INITIALIZATION
    // ==========================================

    init() {
        system.runTimeout(() => {
            this.loadConfig();
            this.startPlayerMonitoring();
            this.registerPlayerCleanup();
            
            // Run migration for precise cleanup of legacy (non-offset) border blocks
            const migrated = world.getDynamicProperty('worldBorderMigratedV5');
            if (!migrated) {
                BorderBlockManager.runMigration(this.config);
                world.setDynamicProperty('worldBorderMigratedV5', 'true');
            }
            
        }, DEFAULTS.INIT_DELAY);
    }

    registerPlayerCleanup() {
        world.afterEvents.playerLeave.subscribe((event) => {
            this.events.emit(BorderEvents.PLAYER_CLEANUP, { playerId: event.playerId });
        });
    }

    // ==========================================
    // CONFIG MANAGEMENT
    // ==========================================

    loadConfig() {
        try {
            const savedConfig = world.getDynamicProperty('worldBorderConfig');
            if (savedConfig) {
                const parsedConfig = JSON.parse(savedConfig);
                for (const dim in this.config) {
                    if (parsedConfig[dim]) {
                        this.config[dim] = { ...this.config[dim], ...parsedConfig[dim] };
                        
                        // Migration config cleanup
                        delete this.config[dim].action;
                        delete this.config[dim].warning;
                        delete this.config[dim].warnDistance;
                        delete this.config[dim].preventInteraction;
                        delete this.config[dim].particleStyle;

                        // Migration: convert old 'size' (blocks) to 'sizeChunks'
                        if (parsedConfig[dim].size && !parsedConfig[dim].sizeChunks) {
                            this.config[dim].sizeChunks = Math.ceil(parsedConfig[dim].size / CHUNK_SIZE);
                            delete this.config[dim].size;
                        }
                    }
                }
            }
        } catch (error) {
            DS.log('Failed to load world border config, using defaults');
        }
    }

    saveConfig() {
        try {
            const oldConfig = JSON.parse(world.getDynamicProperty('worldBorderConfig') || JSON.stringify(DEFAULT_DIMENSION_CONFIG));
            
            world.setDynamicProperty('worldBorderConfig', JSON.stringify(this.config));
            this.events.emit(BorderEvents.CONFIG_CHANGED, { config: this.config });

            // Trigger border block cleanup/update if size changed
            BorderBlockManager.onConfigChange(oldConfig, this.config);

        } catch (error) {
            DS.log('Failed to save world border config');
        }
    }

    // ==========================================
    // PLAYER MONITORING
    // ==========================================

    startPlayerMonitoring() {
        // Position enforcement
        system.runInterval(() => {
            // Global Feature Flag Check
            if (!FeatureFlags.isEnabled(FeatureFlags.FEATURES.WORLD_BORDER)) return;

            for (const player of world.getAllPlayers()) {
                const dimKey = getDimensionKey(player.dimension.id);
                if (!this.config[dimKey].enabled) continue;
                this.checkPlayerPosition(player);
                
                // Update physical border blocks near player
                BorderBlockManager.updateNearPlayer(player, this.config[dimKey]);
            }
        }, DEFAULTS.WARNING_CHECK_INTERVAL);

        // Wall particle rendering
        system.runInterval(() => {
            // Global Feature Flag Check
            if (!FeatureFlags.isEnabled(FeatureFlags.FEATURES.WORLD_BORDER)) return;

            for (const player of world.getAllPlayers()) {
                const dimKey = getDimensionKey(player.dimension.id);
                const config = this.config[dimKey];
                
                if (!config.enabled || !config.particlesEnabled) continue;
                this.showWallParticles(player);
            }
        }, DEFAULTS.PARTICLE_SPAWN_INTERVAL);
    }

    // ==========================================
    // POSITION CHECKING
    // ==========================================

    // ==========================================
    // POSITION CHECKING
    // ==========================================



    checkPlayerPosition(player) {
        const location = player.location;
        const dimensionKey = getDimensionKey(player.dimension.id);
        const borderConfig = this.config[dimensionKey];

        if (!borderConfig.enabled) return;

        const sizeBlocks = this.chunksToBlocks(borderConfig.sizeChunks);
        // Playable area is technically -size to +size-1 in standard chunk terms?
        // But user wants border blocks at -size-1 and +size.
        // So the WALLS are at +/- size (approximately).
        // West Wall Block (-129) ends at -128.
        // East Wall Block (128) starts at 128.
        // So playable is [-128, 128).
        
        const minSafe = borderConfig.centerX - sizeBlocks;
        const maxSafe = borderConfig.centerX + sizeBlocks;
        
        const x = location.x;
        const z = location.z;
        const hasBypass = hasBypassPermission(player);

        let outside = false;
        // Check if OUTSIDE open range (-128, 128)
        // If x <= -128 or x >= 128
        
        if (x <= minSafe || x >= maxSafe || z <= minSafe || z >= maxSafe) {
             outside = true;
        }

        if (outside) {
             if (hasBypass) {
                // Bypass
            } else {
                // Teleport to 1 block inside
                // If hit -128, TP to -127.
                // If hit 128, TP to 127.
                // MinSafe + 1 etc.
                this.teleportPlayerBack(player, location, borderConfig, minSafe, maxSafe, minSafe, maxSafe);
                this.events.emit(BorderEvents.PLAYER_CROSS_BORDER, { player, dimension: dimensionKey });
            }
        }
    }

    // ==========================================
    // BORDER ENFORCEMENT
    // ==========================================

    teleportPlayerBack(player, currentLocation, borderConfig, minSafe, maxSafe) {
        const x = currentLocation.x;
        const z = currentLocation.z;
        const y = currentLocation.y;

        let newX = x;
        let newZ = z;
        
        // Push back 1 block from the limit
        if (x <= minSafe) newX = minSafe + 1;
        if (x >= maxSafe) newX = maxSafe - 1;
        if (z <= minSafe) newZ = minSafe + 1;
        if (z >= maxSafe) newZ = maxSafe - 1;

        const safeY = findSafeY(player, newX, newZ, y);

        try {
            player.teleport({ x: newX, y: safeY, z: newZ }, {
                dimension: player.dimension
            });
            player.playSound(SOUNDS.BORDER_HIT, { volume: 0.5, pitch: 0.8 });
            this.events.emit(BorderEvents.PLAYER_TELEPORTED, { player, from: currentLocation, to: { x: newX, y: safeY, z: newZ } });
        } catch (error) {
            // Silently fail
        }
    }

    // ==========================================
    // WALL PARTICLES (chunk-aligned)
    // ==========================================

    showWallParticles(player) {
        const dimensionKey = getDimensionKey(player.dimension.id);
        const borderConfig = this.config[dimensionKey];

        if (!borderConfig.enabled || !borderConfig.particlesEnabled) {
            return;
        }

        const playerX = player.location.x;
        const playerZ = player.location.z;
        const centerX = borderConfig.centerX;
        const centerZ = borderConfig.centerZ;
        
        const sizeBlocks = this.chunksToBlocks(borderConfig.sizeChunks);
        const visibilityDistance = DEFAULTS.WALL_VISIBILITY_CHUNKS * CHUNK_SIZE;
        const segmentRadius = DEFAULTS.WALL_SEGMENT_CHUNKS * CHUNK_SIZE;

        const particleIdNS = 'worldborder:worldborder';
        const particleIdEW = 'worldborder:worldborder_ew';

        // Wall positions (Inner Face)
        // Walls at -128 and +128
        
        const finalWestX = centerX - sizeBlocks;
        const finalEastX = centerX + sizeBlocks;
        const finalNorthZ = centerZ - sizeBlocks;
        const finalSouthZ = centerZ + sizeBlocks;

        // Absolute distance to each wall (works from both sides)
        const distToEast = Math.abs(finalEastX - playerX);
        const distToWest = Math.abs(playerX - finalWestX);
        const distToSouth = Math.abs(finalSouthZ - playerZ);
        const distToNorth = Math.abs(playerZ - finalNorthZ);

        // Player's chunk position
        const playerChunkX = Math.floor(playerX / CHUNK_SIZE) * CHUNK_SIZE;
        const playerChunkZ = Math.floor(playerZ / CHUNK_SIZE) * CHUNK_SIZE;

        // East wall
        if (distToEast <= visibilityDistance) {
            this.spawnWallChunks(player, finalEastX, playerChunkZ, finalNorthZ, finalSouthZ, segmentRadius, 'z', particleIdNS);
        }

        // West wall
        if (distToWest <= visibilityDistance) {
            this.spawnWallChunks(player, finalWestX, playerChunkZ, finalNorthZ, finalSouthZ, segmentRadius, 'z', particleIdNS);
        }

        // South wall
        if (distToSouth <= visibilityDistance) {
            this.spawnWallChunks(player, finalSouthZ, playerChunkX, finalWestX, finalEastX, segmentRadius, 'x', particleIdEW);
        }

        // North wall
        if (distToNorth <= visibilityDistance) {
            this.spawnWallChunks(player, finalNorthZ, playerChunkX, finalWestX, finalEastX, segmentRadius, 'x', particleIdEW);
        }
    }

    /**
     * Spawn chunk-aligned particles along a wall segment.
     */
    spawnWallChunks(player, wallPos, playerChunkCoord, wallMin, wallMax, segmentRadius, axis, particleId) {
        const minChunk = Math.max(
            Math.floor(wallMin / CHUNK_SIZE) * CHUNK_SIZE,
            playerChunkCoord - segmentRadius
        );
        const maxChunk = Math.min(
            Math.floor(wallMax / CHUNK_SIZE) * CHUNK_SIZE,
            playerChunkCoord + segmentRadius
        );

        for (let chunk = minChunk; chunk <= maxChunk; chunk += CHUNK_SIZE) {
            const spawnCoord = chunk + (CHUNK_SIZE / 2);
            
            if (spawnCoord < wallMin || spawnCoord > wallMax) continue;

            const spawnPos = axis === 'z'
                ? { x: wallPos, y: DEFAULTS.PARTICLE_SPAWN_Y, z: spawnCoord }
                : { x: spawnCoord, y: DEFAULTS.PARTICLE_SPAWN_Y, z: wallPos };

            try {
                player.spawnParticle(particleId, spawnPos);
            } catch (e) {
                // Chunk not loaded or error
            }
        }
    }
}

export const BedrockBorderManager = new WorldBorderManagerClass();
