import { world, system } from '@minecraft/server';
import { CHUNK_SIZE } from './constants.js';
import { BorderCleanupJob } from './cleanup_job.js';
import { DS } from '../../core/ds.js';

class PhysicalBorderManager {
 constructor() {
  this.config = null;
  this.chunkStateCache = new Map();
 }

 updateNearPlayer(player, borderConfig) {
  if (!borderConfig.enabled || player.dimension.id === 'minecraft:the_end') return;

  const dimension = player.dimension;
  const dimId = dimension.id;

  if (!this.chunkStateCache.has(dimId)) {
   this.chunkStateCache.set(dimId, new Set());
  }
  const processedChunks = this.chunkStateCache.get(dimId);

  const playerChunkX = Math.floor(player.location.x / CHUNK_SIZE);
  const playerChunkZ = Math.floor(player.location.z / CHUNK_SIZE);

  const chunksToCheck = 2;
  const borderSizeChunks = borderConfig.sizeChunks;
  const borderSizeBlocks = borderSizeChunks * CHUNK_SIZE;

  const minBorderX = borderConfig.centerX - borderSizeBlocks - 1;
  const maxBorderX = borderConfig.centerX + borderSizeBlocks;
  const minBorderZ = borderConfig.centerZ - borderSizeBlocks - 1;
  const maxBorderZ = borderConfig.centerZ + borderSizeBlocks;

  const minChunkX = Math.floor(minBorderX / CHUNK_SIZE);
  const maxChunkX = Math.floor(maxBorderX / CHUNK_SIZE);
  const minChunkZ = Math.floor(minBorderZ / CHUNK_SIZE);
  const maxChunkZ = Math.floor(maxBorderZ / CHUNK_SIZE);

  const centerChunkX = Math.floor(borderConfig.centerX / CHUNK_SIZE);
  const centerChunkZ = Math.floor(borderConfig.centerZ / CHUNK_SIZE);

  for (let x = playerChunkX - chunksToCheck; x <= playerChunkX + chunksToCheck; x++) {
   for (let z = playerChunkZ - chunksToCheck; z <= playerChunkZ + chunksToCheck; z++) {
    const chunkKey = `${x},${z}`;

    if (processedChunks.has(chunkKey)) continue;

    const cMinX = x * CHUNK_SIZE;
    const cMaxX = cMinX + 15;
    const cMinZ = z * CHUNK_SIZE;
    const cMaxZ = cMinZ + 15;

    let hasBorder = false;

    if (minBorderX >= cMinX && minBorderX <= cMaxX && cMaxZ >= minBorderZ && cMinZ <= maxBorderZ) hasBorder = true;
    if (maxBorderX >= cMinX && maxBorderX <= cMaxX && cMaxZ >= minBorderZ && cMinZ <= maxBorderZ) hasBorder = true;
    if (minBorderZ >= cMinZ && minBorderZ <= cMaxZ && cMaxX >= minBorderX && cMinX <= maxBorderX) hasBorder = true;
    if (maxBorderZ >= cMinZ && maxBorderZ <= cMaxZ && cMaxX >= minBorderX && cMinX <= maxBorderX) hasBorder = true;

    if (hasBorder) {
     this.generateBorderInChunk(dimension, x, z, minBorderX, maxBorderX, minBorderZ, maxBorderZ, processedChunks, chunkKey);
    }
   }
  }
 }

 generateBorderInChunk(dimension, cx, cz, minX, maxX, minZ, maxZ, processedChunks, chunkKey) {
  const y = dimension.id === 'minecraft:overworld' ? -64 : 0;

  const xStart = cx * CHUNK_SIZE;
  const xEnd = xStart + 15;
  const zStart = cz * CHUNK_SIZE;
  const zEnd = zStart + 15;

  if (minX >= xStart && minX <= xEnd) {
   const zLineStart = Math.max(zStart, minZ);
   const zLineEnd = Math.min(zEnd, maxZ);
   if (zLineStart <= zLineEnd) {
    dimension.runCommandAsync(`fill ${minX} ${y} ${zLineStart} ${minX} ${y} ${zLineEnd} border_block replace bedrock`);
   }
  }

  if (maxX >= xStart && maxX <= xEnd) {
   const zLineStart = Math.max(zStart, minZ);
   const zLineEnd = Math.min(zEnd, maxZ);
   if (zLineStart <= zLineEnd) {
    dimension.runCommandAsync(`fill ${maxX} ${y} ${zLineStart} ${maxX} ${y} ${zLineEnd} border_block replace bedrock`);
   }
  }

  if (minZ >= zStart && minZ <= zEnd) {
   const xLineStart = Math.max(xStart, minX);
   const xLineEnd = Math.min(xEnd, maxX);
   if (xLineStart <= xLineEnd) {
    dimension.runCommandAsync(`fill ${xLineStart} ${y} ${minZ} ${xLineEnd} ${y} ${minZ} border_block replace bedrock`);
   }
  }

  if (maxZ >= zStart && maxZ <= zEnd) {
   const xLineStart = Math.max(xStart, minX);
   const xLineEnd = Math.min(xEnd, maxX);
   if (xLineStart <= xLineEnd) {
    dimension.runCommandAsync(`fill ${xLineStart} ${y} ${maxZ} ${xLineEnd} ${y} ${maxZ} border_block replace bedrock`);
   }
  }

  processedChunks.add(chunkKey);
 }

 onConfigChange(oldConfig, newConfig) {
  this.chunkStateCache.clear();

  this.checkAndCleanupDimension('overworld', oldConfig.overworld, newConfig.overworld);
  this.checkAndCleanupDimension('nether', oldConfig.nether, newConfig.nether);
  this.checkAndCleanupDimension('end', oldConfig.end, newConfig.end);
 }

 checkAndCleanupDimension(dimId, oldConf, newConf) {
  if (!oldConf || !newConf) return;

  if (oldConf.sizeChunks !== newConf.sizeChunks ||
   oldConf.centerX !== newConf.centerX ||
   oldConf.centerZ !== newConf.centerZ) {

   this.scheduleCleanup(dimId, oldConf);
  }
 }

 scheduleCleanup(dimKey, oldConf) {
  const actualDimId = dimKey === 'overworld' ? 'minecraft:overworld' :
       dimKey === 'nether' ? 'minecraft:nether' : 'minecraft:the_end';

  const chunksToClean = [];

  const sizeBlocks = oldConf.sizeChunks * CHUNK_SIZE;

  const minX = oldConf.centerX - sizeBlocks - 1;
  const maxX = oldConf.centerX + sizeBlocks;
  const minZ = oldConf.centerZ - sizeBlocks - 1;
  const maxZ = oldConf.centerZ + sizeBlocks;

  const added = new Set();
  const addChunk = (bx, bz) => {
   const cx = Math.floor(bx / CHUNK_SIZE);
   const cz = Math.floor(bz / CHUNK_SIZE);
   const key = `${cx},${cz}`;
   if (!added.has(key)) {
    added.add(key);
    chunksToClean.push({ x: cx, z: cz });
   }
  };

  for (let x = minX; x <= maxX; x += CHUNK_SIZE) {
   addChunk(x, minZ);
   addChunk(x, maxZ);
  }
  addChunk(maxX, minZ);
  addChunk(maxX, maxZ);

  for (let z = minZ; z <= maxZ; z += CHUNK_SIZE) {
   addChunk(minX, z);
   addChunk(maxX, z);
  }
  addChunk(minX, maxZ);
  addChunk(maxX, maxZ);

  const job = new BorderCleanupJob(actualDimId, chunksToClean);
  job.start();

  DS.log(`Scheduled border cleanup for ${dimKey} (${chunksToClean.length} chunks)`);
 }

 runMigration(config) {
  ['overworld', 'nether', 'end'].forEach(dim => {
   if (!config[dim].enabled) return;

   const conf = config[dim];
   const actualDimId = dim === 'overworld' ? 'minecraft:overworld' :
        dim === 'nether' ? 'minecraft:nether' : 'minecraft:the_end';

   const dist = conf.sizeChunks * CHUNK_SIZE;

   this.runSpecificLineCleanup(actualDimId, conf.centerX, conf.centerZ, dist, dist);

   const minX1 = conf.centerX - dist;
   const maxX1 = conf.centerX + dist - 1;
   this.runSpecificLineCleanupManual(actualDimId, minX1, maxX1, minX1, maxX1);

   const offsets = [-dist, -dist-1, dist, dist-1, dist+1];

   const minX_err = conf.centerX - dist;
   const maxX_err = conf.centerX + dist - 1;
   const minZ_err = conf.centerZ - dist;
   const maxZ_err = conf.centerZ + dist - 1;

   this.runSpecificLineCleanupManual(actualDimId, minX_err, maxX_err, minZ_err, maxZ_err);

   DS.log(`Scheduled extensive legacy migration for ${dim}`);
  });
 }

 runSpecificLineCleanup(dimId, cx, cz, distH, distV) {
  const minX = cx - distH;
  const maxX = cx + distH;
  const minZ = cz - distV;
  const maxZ = cz + distV;
  this.runSpecificLineCleanupManual(dimId, minX, maxX, minZ, maxZ);
 }

 runSpecificLineCleanupManual(dimId, minX, maxX, minZ, maxZ) {
  const segments = [];
  segments.push({ x1: minX, z1: minZ, x2: minX, z2: maxZ });
  segments.push({ x1: maxX, z1: minZ, x2: maxX, z2: maxZ });
  segments.push({ x1: minX, z1: minZ, x2: maxX, z2: minZ });
  segments.push({ x1: minX, z1: maxZ, x2: maxX, z2: maxZ });
  this.executeSegmentCleanup(dimId, segments);
 }

 executeSegmentCleanup(dimId, segments) {
  if (segments.length === 0) return;

  const chunksToVisit = new Map();

  segments.forEach(seg => {
   const startChunkX = Math.floor(Math.min(seg.x1, seg.x2) / CHUNK_SIZE);
   const endChunkX = Math.floor(Math.max(seg.x1, seg.x2) / CHUNK_SIZE);
   const startChunkZ = Math.floor(Math.min(seg.z1, seg.z2) / CHUNK_SIZE);
   const endChunkZ = Math.floor(Math.max(seg.z1, seg.z2) / CHUNK_SIZE);

   for (let cx = startChunkX; cx <= endChunkX; cx++) {
    for (let cz = startChunkZ; cz <= endChunkZ; cz++) {
     const key = `${cx},${cz}`;
     if (!chunksToVisit.has(key)) {
      chunksToVisit.set(key, { cx, cz, rects: [] });
     }

     const xMin = Math.max(seg.x1, cx * 16);
     const xMax = Math.min(seg.x2, cx * 16 + 15);
     const zMin = Math.max(seg.z1, cz * 16);
     const zMax = Math.min(seg.z2, cz * 16 + 15);

     if (xMin <= xMax && zMin <= zMax) {
      chunksToVisit.get(key).rects.push({ xMin, xMax, zMin, zMax });
     }
    }
   }
  });

  const queue = Array.from(chunksToVisit.values());
  this.processChunkQueue(dimId, queue);
 }

 processChunkQueue(dimId, queue) {
  if (queue.length === 0) {
   DS.log(`Migration cleanup for ${dimId} complete.`);
   return;
  }

  const item = queue.shift();
  const { cx, cz, rects } = item;
  const areaName = `mig_${cx}_${cz}`;

  try {
   const dimension = world.getDimension(dimId);
   const y = dimId === 'minecraft:overworld' ? -64 : 0;

   system.run(() => {
    try {
     dimension.runCommandAsync(`tickingarea add ${cx * 16} 0 ${cz * 16} ${cx * 16 + 15} 0 ${cz * 16 + 15} ${areaName}`);
    } catch(e) {
    }

    system.run(() => {
     try {
      rects.forEach(r => {
       dimension.runCommandAsync(`fill ${r.xMin} ${y} ${r.zMin} ${r.xMax} ${y} ${r.zMax} bedrock replace border_block`);
      });
     } catch(e) {}

     system.run(() => {
      try {
       dimension.runCommandAsync(`tickingarea remove ${areaName}`);
      } catch (e) {}

      this.processChunkQueue(dimId, queue);
     });
    });
   });

  } catch (error) {
   DS.log(`Error processing chunk ${cx},${cz}: ${error}`);
   system.run(() => this.processChunkQueue(dimId, queue));
  }
 }
}

export const BorderBlockManager = new PhysicalBorderManager();