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

class WorldBorderManagerClass {
 constructor() {
  this.config = JSON.parse(JSON.stringify(DEFAULT_DIMENSION_CONFIG));
  this.events = new BorderEventEmitter();
  this.init();
 }

 chunksToBlocks(chunks) {
  return chunks * CHUNK_SIZE;
 }

 init() {
  system.runTimeout(() => {
   this.loadConfig();
   this.startPlayerMonitoring();
   this.registerPlayerCleanup();

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

 loadConfig() {
  try {
   const savedConfig = world.getDynamicProperty('worldBorderConfig');
   if (savedConfig) {
    const parsedConfig = JSON.parse(savedConfig);
    for (const dim in this.config) {
     if (parsedConfig[dim]) {
      this.config[dim] = { ...this.config[dim], ...parsedConfig[dim] };

      delete this.config[dim].action;
      delete this.config[dim].warning;
      delete this.config[dim].warnDistance;
      delete this.config[dim].preventInteraction;
      delete this.config[dim].particleStyle;

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

   BorderBlockManager.onConfigChange(oldConfig, this.config);

  } catch (error) {
   DS.log('Failed to save world border config');
  }
 }

 startPlayerMonitoring() {
  system.runInterval(() => {
   if (!FeatureFlags.isEnabled(FeatureFlags.FEATURES.WORLD_BORDER)) return;

   for (const player of world.getAllPlayers()) {
    const dimKey = getDimensionKey(player.dimension.id);
    if (!this.config[dimKey].enabled) continue;
    this.checkPlayerPosition(player);

    BorderBlockManager.updateNearPlayer(player, this.config[dimKey]);
   }
  }, DEFAULTS.WARNING_CHECK_INTERVAL);

  system.runInterval(() => {
   if (!FeatureFlags.isEnabled(FeatureFlags.FEATURES.WORLD_BORDER)) return;

   for (const player of world.getAllPlayers()) {
    const dimKey = getDimensionKey(player.dimension.id);
    const config = this.config[dimKey];

    if (!config.enabled || !config.particlesEnabled) continue;
    this.showWallParticles(player);
   }
  }, DEFAULTS.PARTICLE_SPAWN_INTERVAL);
 }

 checkPlayerPosition(player) {
  const location = player.location;
  const dimensionKey = getDimensionKey(player.dimension.id);
  const borderConfig = this.config[dimensionKey];

  if (!borderConfig.enabled) return;

  const sizeBlocks = this.chunksToBlocks(borderConfig.sizeChunks);

  const minSafe = borderConfig.centerX - sizeBlocks;
  const maxSafe = borderConfig.centerX + sizeBlocks;

  const x = location.x;
  const z = location.z;
  const hasBypass = hasBypassPermission(player);

  let outside = false;

  if (x <= minSafe || x >= maxSafe || z <= minSafe || z >= maxSafe) {
   outside = true;
  }

  if (outside) {
   if (hasBypass) {
   } else {
    this.teleportPlayerBack(player, location, borderConfig, minSafe, maxSafe, minSafe, maxSafe);
    this.events.emit(BorderEvents.PLAYER_CROSS_BORDER, { player, dimension: dimensionKey });
   }
  }
 }

 teleportPlayerBack(player, currentLocation, borderConfig, minSafe, maxSafe) {
  const x = currentLocation.x;
  const z = currentLocation.z;
  const y = currentLocation.y;

  let newX = x;
  let newZ = z;

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
  }
 }

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

  const finalWestX = centerX - sizeBlocks;
  const finalEastX = centerX + sizeBlocks;
  const finalNorthZ = centerZ - sizeBlocks;
  const finalSouthZ = centerZ + sizeBlocks;

  const distToEast = Math.abs(finalEastX - playerX);
  const distToWest = Math.abs(playerX - finalWestX);
  const distToSouth = Math.abs(finalSouthZ - playerZ);
  const distToNorth = Math.abs(playerZ - finalNorthZ);

  const playerChunkX = Math.floor(playerX / CHUNK_SIZE) * CHUNK_SIZE;
  const playerChunkZ = Math.floor(playerZ / CHUNK_SIZE) * CHUNK_SIZE;

  if (distToEast <= visibilityDistance) {
   this.spawnWallChunks(player, finalEastX, playerChunkZ, finalNorthZ, finalSouthZ, segmentRadius, 'z', particleIdNS);
  }

  if (distToWest <= visibilityDistance) {
   this.spawnWallChunks(player, finalWestX, playerChunkZ, finalNorthZ, finalSouthZ, segmentRadius, 'z', particleIdNS);
  }

  if (distToSouth <= visibilityDistance) {
   this.spawnWallChunks(player, finalSouthZ, playerChunkX, finalWestX, finalEastX, segmentRadius, 'x', particleIdEW);
  }

  if (distToNorth <= visibilityDistance) {
   this.spawnWallChunks(player, finalNorthZ, playerChunkX, finalWestX, finalEastX, segmentRadius, 'x', particleIdEW);
  }
 }

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
   }
  }
 }
}

export const BedrockBorderManager = new WorldBorderManagerClass();