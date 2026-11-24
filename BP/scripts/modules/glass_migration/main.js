import { world, system, BlockPermutation, BlockTypes, BlockVolume } from '@minecraft/server';

let filter;

function orphanFilter() {
  filter ??= { excludeTypes: BlockTypes.getAll().map((type) => type.id) };
  return filter;
}

function isOrphan(typeId) {
  return !BlockTypes.get(typeId);
}

const COLORS = [
  'white',
  'orange',
  'magenta',
  'light_blue',
  'yellow',
  'lime',
  'pink',
  'gray',
  'light_gray',
  'cyan',
  'purple',
  'blue',
  'brown',
  'green',
  'red',
  'black'
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

function shouldMigrate(id) {
  return (
    id === 'minecraft:info_update' ||
    id === 'minecraft:info_update2' ||
    id === 'minecraft:unknown' ||
    id.includes('connected_glass') ||
    id.includes('32k:connected_') ||
    id.includes('kwz:') ||
    isOrphan(id)
  );
}

function boxAround(dimension, center, radius) {
  const { min, max } = dimension.heightRange;
  const x = Math.floor(center.x);
  const y = Math.floor(center.y);
  const z = Math.floor(center.z);
  const bottom = Math.max(min, y - radius);
  const top = Math.min(max - 1, y + radius);
  if (bottom > top) return undefined;
  return new BlockVolume(
    { x: x - radius, y: bottom, z: z - radius },
    { x: x + radius, y: top, z: z + radius }
  );
}

function scanAndMigrate(dimension, center, radius = 16) {
  const volume = boxAround(dimension, center, radius);
  if (!volume) return 0;

  let converted = 0;
  try {
    const list = dimension.getBlocks(volume, orphanFilter(), true);
    for (const loc of list.getBlockLocationIterator()) {
      try {
        const block = dimension.getBlock(loc);
        if (!block) continue;
        const id = block.typeId;
        if (shouldMigrate(id)) {
          const targetId = getVanillaEquivalent(id);
          block.setPermutation(BlockPermutation.resolve(targetId));
          converted++;
        }
      } catch (e) {}
    }
  } catch (e) {}
  return converted;
}

const lastPlayerChunk = new Map();

system.runInterval(() => {
  for (const player of world.getAllPlayers()) {
    if (!player.isValid) continue;

    const cx = Math.floor(player.location.x / 16);
    const cz = Math.floor(player.location.z / 16);
    const key = `${player.dimension.id}:${cx},${cz}`;

    if (lastPlayerChunk.get(player.id) === key) continue;
    lastPlayerChunk.set(player.id, key);

    scanAndMigrate(player.dimension, player.location, 16);
  }
}, 100);

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  lastPlayerChunk.delete(playerId);
});

world.beforeEvents.playerBreakBlock.subscribe((ev) => {
  const { block, player, dimension } = ev;
  const id = block.typeId;

  if (shouldMigrate(id)) {
    ev.cancel = true;

    const targetId = getVanillaEquivalent(id);
    const centerLoc = { x: block.location.x, y: block.location.y, z: block.location.z };

    system.run(() => {
      try {
        const currentBlock = dimension.getBlock(centerLoc);
        if (currentBlock) {
          currentBlock.setPermutation(BlockPermutation.resolve(targetId));
        }

        const count = scanAndMigrate(dimension, centerLoc, 24);
        if (player.isValid) {
          const total = count + 1;
          player.onScreenDisplay.setActionBar(`Converted ${total} glass block${total === 1 ? '' : 's'}`);
          player.playSound('random.orb');
        }
      } catch (e) {}
    });
  }
});