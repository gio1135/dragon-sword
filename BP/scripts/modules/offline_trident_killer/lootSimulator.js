import {
  world,
  Difficulty,
  LootItem,
  LootTableEntry,
  LootTableReference,
  LootingEnchantFunction,
  SetItemCountFunction,
  SmeltItemFunction,
  KilledByPlayerCondition,
  KilledByPlayerOrPetsCondition,
  KilledByEntityCondition,
  DamagedByEntityCondition,
  EntityKilledCondition,
  IsBabyCondition,
  EntityHasVariantCondition,
  EntityHasMarkVariantCondition,
  RandomChanceCondition,
  RandomChanceWithLootingCondition,
  RandomDifficultyChanceCondition,
  RandomRegionalDifficultyChanceCondition
} from '@minecraft/server';

const LOOT_TABLE_OVERRIDES = {
  'minecraft:zombified_piglin': ['entities/zombie_pigman'],
  'minecraft:zombie_villager_v2': ['entities/zombie_villager'],
  'minecraft:cave_spider': ['entities/cave_spider', 'entities/spider']
};

const SMELTED_ITEMS = {
  'minecraft:beef': 'minecraft:cooked_beef',
  'minecraft:chicken': 'minecraft:cooked_chicken',
  'minecraft:cod': 'minecraft:cooked_cod',
  'minecraft:mutton': 'minecraft:cooked_mutton',
  'minecraft:porkchop': 'minecraft:cooked_porkchop',
  'minecraft:rabbit': 'minecraft:cooked_rabbit',
  'minecraft:salmon': 'minecraft:cooked_salmon'
};

const DIFFICULTY_INDEX = {
  [Difficulty.Peaceful]: 0,
  [Difficulty.Easy]: 1,
  [Difficulty.Normal]: 2,
  [Difficulty.Hard]: 3
};

const MAX_TABLE_DEPTH = 8;
const lootTableCache = new Map();

export function rollMissingLoot(mob, lootingLevel) {
  const missing = new Map();
  const table = getMobLootTable(mob.typeId);
  if (!table) return missing;

  const difficulty = DIFFICULTY_INDEX[world.getDifficulty()] ?? 2;

  for (const pool of table.pools) {
    const seed = Math.floor(Math.random() * 0x100000000);
    const online = new Map();
    const offline = new Map();

    simulatePool(pool, { mob, difficulty, lootingLevel, killedByPlayer: true, random: createRandom(seed) }, online, 0);
    simulatePool(pool, { mob, difficulty, lootingLevel: 0, killedByPlayer: false, random: createRandom(seed) }, offline, 0);

    for (const [itemId, count] of online) {
      const extra = count - (offline.get(itemId) ?? 0);
      if (extra > 0) addItem(missing, itemId, extra);
    }
  }

  return missing;
}

function getMobLootTable(typeId) {
  if (lootTableCache.has(typeId)) return lootTableCache.get(typeId);

  const name = typeId.split(':').pop();
  const paths = [...(LOOT_TABLE_OVERRIDES[typeId] ?? []), `entities/${name}`];

  let table = null;
  for (const path of paths) {
    table = getLootTable(path);
    if (table) break;
  }

  lootTableCache.set(typeId, table);
  return table;
}

function getLootTable(path) {
  try {
    return world.getLootTableManager().getLootTable(path) ?? null;
  } catch (e) {
    return null;
  }
}

function simulateTable(table, ctx, out, depth) {
  if (!table || depth > MAX_TABLE_DEPTH) return;
  for (const pool of table.pools) {
    simulatePool(pool, ctx, out, depth);
  }
}

function simulatePool(pool, ctx, out, depth) {
  if (pool.tiers) return;

  const rolls = randomInt(ctx, pool.rolls);
  if (!conditionsPass(pool.conditions, ctx)) return;

  for (let i = 0; i < rolls; i++) {
    const available = pool.entries.filter((entry) => conditionsPass(entry.conditions, ctx));
    const entry = pickWeighted(available, ctx);
    if (entry) resolveEntry(entry, ctx, out, depth);
  }
}

function pickWeighted(entries, ctx) {
  const totalWeight = entries.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0);
  let roll = ctx.random() * totalWeight;
  if (totalWeight <= 0) return undefined;

  for (const entry of entries) {
    roll -= Math.max(0, entry.weight);
    if (roll < 0) return entry;
  }
  return entries[entries.length - 1];
}

function resolveEntry(entry, ctx, out, depth) {
  if (entry instanceof LootItem) {
    resolveItem(entry, ctx, out);
  } else if (entry instanceof LootTableEntry) {
    simulateTable(entry.lootTable, ctx, out, depth + 1);
  } else if (entry instanceof LootTableReference) {
    const path = entry.path.replace(/^loot_tables\//, '').replace(/\.json$/, '');
    simulateTable(getLootTable(path), ctx, out, depth + 1);
  }
}

function resolveItem(entry, ctx, out) {
  if (!entry.name) return;

  let itemId = entry.name.id;
  let count = 1;

  for (const fn of entry.functions) {
    if (fn instanceof SetItemCountFunction) {
      count = randomInt(ctx, fn.count);
    } else if (fn instanceof LootingEnchantFunction) {
      const bonus = Math.round(randomFloat(ctx, fn.count) * ctx.lootingLevel);
      if (conditionsPass(fn.conditions, ctx)) count += bonus;
    } else if (fn instanceof SmeltItemFunction) {
      if (ctx.mob.onFire) itemId = SMELTED_ITEMS[itemId] ?? itemId;
    }
  }

  if (count > 0) addItem(out, itemId, count);
}

function conditionsPass(conditions, ctx) {
  let pass = true;
  for (const condition of conditions ?? []) {
    if (!conditionPasses(condition, ctx)) pass = false;
  }
  return pass;
}

function conditionPasses(condition, ctx) {
  if (condition instanceof KilledByPlayerCondition || condition instanceof KilledByPlayerOrPetsCondition) {
    return ctx.killedByPlayer;
  }
  if (condition instanceof KilledByEntityCondition || condition instanceof DamagedByEntityCondition) {
    return ctx.killedByPlayer && condition.entityType === 'minecraft:player';
  }
  if (condition instanceof EntityKilledCondition) {
    return condition.entityType === ctx.mob.typeId;
  }
  if (condition instanceof IsBabyCondition) {
    return ctx.mob.isBaby;
  }
  if (condition instanceof EntityHasVariantCondition) {
    return ctx.mob.variant === condition.value;
  }
  if (condition instanceof EntityHasMarkVariantCondition) {
    return ctx.mob.markVariant === condition.value;
  }
  if (condition instanceof RandomChanceCondition) {
    return ctx.random() < condition.chance;
  }
  if (condition instanceof RandomChanceWithLootingCondition) {
    return ctx.random() < condition.chance + condition.lootingMultiplier * ctx.lootingLevel;
  }
  if (condition instanceof RandomDifficultyChanceCondition) {
    const chances = condition.chances;
    return ctx.random() < (chances[ctx.difficulty] ?? chances[chances.length - 1] ?? 0);
  }
  if (condition instanceof RandomRegionalDifficultyChanceCondition) {
    return ctx.random() < condition.maxChance * (ctx.difficulty / 3);
  }
  return false;
}

function randomInt(ctx, range) {
  const min = Math.ceil(range.min);
  const max = Math.floor(range.max);
  if (max <= min) return min;
  return min + Math.floor(ctx.random() * (max - min + 1));
}

function randomFloat(ctx, range) {
  return range.min + ctx.random() * (range.max - range.min);
}

function addItem(map, itemId, count) {
  map.set(itemId, (map.get(itemId) ?? 0) + count);
}

function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}