
import { CHUNK_SIZE, DEFAULTS } from './constants.js';

export function getDimensionKey(dimensionId) {
 if (dimensionId.includes('nether')) return 'nether';
 if (dimensionId.includes('end')) return 'end';
 return 'overworld';
}

export function validateNumericInput(value, min, max, fieldName) {
 const num = typeof value === 'string' ? parseInt(value) : value;

 if (isNaN(num)) {
  return { valid: false, error: `${fieldName} must be a valid number.` };
 }

 if (num < min || num > max) {
  return { valid: false, error: `${fieldName} must be between ${min} and ${max}.` };
 }

 return { valid: true, value: num };
}

export function hasBypassPermission(player) {
 const gameMode = player.getGameMode();
 return gameMode === 'creative' || gameMode === 'spectator' || player.hasTag('border_bypass');
}

export function isGameDirector(player) {
 return player.playerPermissionLevel >= 2;
}

export function findSafeY(player, x, z, currentY) {
 try {
  const dimension = player.dimension;
  const floorX = Math.floor(x);
  const floorZ = Math.floor(z);
  let startY = Math.floor(currentY);

  if (startY < -64) startY = -64;
  if (startY > 320) startY = 320;

  const isSafe = (y) => {
   try {
    const block = dimension.getBlock({ x: floorX, y: y, z: floorZ });
    const blockAbove = dimension.getBlock({ x: floorX, y: y + 1, z: floorZ });
    return block && blockAbove &&
     (block.typeId === 'minecraft:air' || block.typeId === 'minecraft:cave_air') &&
     (blockAbove.typeId === 'minecraft:air' || blockAbove.typeId === 'minecraft:cave_air');
   } catch {
    return false;
   }
  };

  if (isSafe(startY)) return startY;

  for (let offset = 1; offset <= DEFAULTS.SAFE_Y_SEARCH_RANGE; offset++) {
   const yAbove = startY + offset;
   if (yAbove <= 319 && isSafe(yAbove)) return yAbove;
  }

  for (let offset = 1; offset <= DEFAULTS.SAFE_Y_SEARCH_RANGE; offset++) {
   const yBelow = startY - offset;
   if (yBelow >= -64 && isSafe(yBelow)) return yBelow;
  }

  return currentY;
 } catch {
  return currentY;
 }
}

export function sanitizePlayerName(name) {
 return name.trim().substring(0, 16);
}