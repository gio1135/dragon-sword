import { world, system } from '@minecraft/server';
import { CHUNK_SIZE } from './constants.js';
import { DS } from '../../core/ds.js';

export class BorderCleanupJob {
 constructor(dimensionId, chunksToClean) {
  this.dimensionId = dimensionId;
  this.queue = chunksToClean;
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

   const areaName = `clean_${chunk.x}_${chunk.z}`;
   const xMin = chunk.x * CHUNK_SIZE;
   const zMin = chunk.z * CHUNK_SIZE;
   const xMax = xMin + 15;
   const zMax = zMin + 15;

   system.run(() => {
    try {
     dimension.runCommandAsync(`tickingarea add ${xMin} 0 ${zMin} ${xMax} 0 ${zMax} ${areaName}`);
    } catch (e) {
    }

    system.run(() => {
     try {
      const y = dimension.id === 'minecraft:overworld' ? -64 : 0;

      dimension.runCommandAsync(`fill ${xMin} ${y} ${zMin} ${xMax} ${y} ${zMax} bedrock replace border_block`);

     } catch (e) {
      DS.log(`Error cleaning chunk ${chunk.x},${chunk.z}: ${e}`);
     }

     system.run(() => {
      try {
       dimension.runCommandAsync(`tickingarea remove ${areaName}`);
      } catch(e) {}

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