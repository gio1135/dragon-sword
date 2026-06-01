import { world, system, ItemStack } from '@minecraft/server';
import { DS } from '../../core/ds.js';

// Ghost stack detection
world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
  if (!initialSpawn || !player) return;

  try {
    const cursor = player.getComponent('minecraft:cursor_inventory');
    if (!cursor) return;

    const held = cursor.item;

    if (held) {
      DS.log(`Anti-dupe: ${player.name} joined with item on cursor (${held.typeId}). Removing ghost`);

      try {
        const item = new ItemStack(held.typeId, 1);
        item.amount = held.amount;
        player.dimension.spawnItem(item, player.location);
      } catch (e) { }
      cursor.clear();
    }
  } catch (e) {
    DS.log(`Anti-dupe error (ghost): ${e}`);
  }
});

// Piston plant duplication
const TWO_HIGH_PLANTS = new Set([
  'minecraft:tall_grass', 'minecraft:tall_dry_grass', 'minecraft:large_fern',
  'minecraft:sunflower', 'minecraft:rose_bush', 'minecraft:peony',
  'minecraft:lilac', 'minecraft:cornflower', 'minecraft:tall_seagrass',
  'minecraft:torchflower_crop', 'minecraft:torchflower'
]);

const OFFSETS = [
  { x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 },
  { x: 1, z: 1 }, { x: -1, z: 1 }, { x: 1, z: -1 }, { x: -1, z: -1 },
  { x: 2, z: 0 }, { x: -2, z: 0 }, { x: 0, z: 2 }, { x: 0, z: -2 }
];

world.afterEvents.pistonActivate.subscribe((event) => {
  const { block } = event;
  const dim = block.dimension;

  for (const off of OFFSETS) {
    try {
      const checkPos = { x: block.x + off.x, y: block.y, z: block.z + off.z };
      const plant = dim.getBlock(checkPos);

      if (plant && TWO_HIGH_PLANTS.has(plant.typeId)) {
        DS.log(`Anti-dupe: Piston at ${block.location.x},${block.location.y},${block.location.z} tried to break ${plant.typeId}. Breaking piston`);

        (block.dimension.setBlockType(block.location, 'minecraft:air'));

        const players = dim.getPlayers({ location: block.location, maxDistance: 10, closest: 1 });
        if (players.length > 0) {
          DS.log(`Anti-dupe: Suspect is ${players[0].name}`);
        }

        return;
      }
    } catch (e) { }
  }
});

// Hopper bundle purge
const HOPPER_RADIUS = 4;
const SCAN_INTERVAL = 60;

system.runInterval(() => {
  try {
    for (const player of world.getAllPlayers()) {
      const dim = player.dimension;
      const { x: px, y: py, z: pz } = player.location;
      const baseX = Math.floor(px);
      const baseY = Math.floor(py);
      const baseZ = Math.floor(pz);

      for (let x = -HOPPER_RADIUS; x <= HOPPER_RADIUS; x++) {
        for (let y = -HOPPER_RADIUS; y <= HOPPER_RADIUS; y++) {
          for (let z = -HOPPER_RADIUS; z <= HOPPER_RADIUS; z++) {
            try {
              const block = dim.getBlock({ x: baseX + x, y: baseY + y, z: baseZ + z });
              if (block && block.typeId === 'minecraft:hopper') {
                const inv = block.getComponent('minecraft:inventory');
                if (inv && inv.container) {
                  const container = inv.container;
                  for (let i = 0; i < container.size; i++) {
                    const item = container.getItem(i);
                    if (item && (item.typeId.includes('bundle') || item.typeId === 'minecraft:bundle')) {
                      DS.log(`Anti-dupe: Removing bundle from hopper at ${block.x},${block.y},${block.z} near ${player.name}`);
                      container.setItem(i, undefined);
                    }
                  }
                }
              }
            } catch (e) { }
          }
        }
      }
    }
  } catch (e) {
    DS.log(`Anti-dupe scan error: ${e}`);
  }
}, SCAN_INTERVAL);
