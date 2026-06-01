import { world, system, BlockPermutation } from '@minecraft/server';

let currentPlayerIndex = 0;

console.warn('[Glass Migration] Module loaded - Intelligent mapping mode');

const COLORS = [
  'white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 
  'pink', 'gray', 'light_gray', 'cyan', 'purple', 'blue', 
  'brown', 'green', 'red', 'black'
];

function getVanillaEquivalent(id) {
  if (id.includes('tinted_glass')) return 'minecraft:tinted_glass';
  
  const isPane = id.includes('pane');
  const type = isPane ? 'glass_pane' : 'glass';
  
  for (const color of COLORS) {
    if (id.includes(color)) {
      return `minecraft:${color}_stained_${type}`;
    }
  }
  
  return `minecraft:${type}`;
}

system.runInterval(() => {
  const players = world.getAllPlayers();
  if (players.length === 0) return;

  if (currentPlayerIndex >= players.length) {
    currentPlayerIndex = 0;
  }

  const player = players[currentPlayerIndex];
  currentPlayerIndex++;

  if (!player || !player.isValid) return;

  const loc = player.location;
  const dim = player.dimension;

  for (let x = -16; x <= 16; x++) {
    for (let y = -8; y <= 8; y++) {
      for (let z = -16; z <= 16; z++) {
        const blockLoc = {
          x: Math.floor(loc.x + x),
          y: Math.floor(loc.y + y),
          z: Math.floor(loc.z + z)
        };

        try {
          const block = dim.getBlock(blockLoc);
          if (block) {
            const id = block.typeId;
            
            if (
              id === 'minecraft:info_update' || 
              id === 'minecraft:info_update2' || 
              id.includes('ds:connected_') || 
              id.includes('kwz:') || 
              id.includes('connected_glass') || 
              id === 'minecraft:unknown'
            ) {
              const targetId = getVanillaEquivalent(id);
              block.setPermutation(BlockPermutation.resolve(targetId));
              console.warn(`[Glass Migration] SUCCESS: Converted ${id} -> ${targetId} at ${blockLoc.x}, ${blockLoc.y}, ${blockLoc.z}`);
            }
          }
        } catch (e) {
          // Ignore
        }
      }
    }
  }
}, 200);