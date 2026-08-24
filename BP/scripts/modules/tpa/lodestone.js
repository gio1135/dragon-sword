import { world, system, EquipmentSlot } from '@minecraft/server';
import { DS } from '../../core/ds.js';
import { FeatureFlags } from '../../core/feature_flags.js';

const tpQueue = [];
const activeTeleports = new Map();
const recentTeleports = new Map();

function tryTeleport(player, itemStack) {
  if (itemStack.typeId !== 'minecraft:lodestone_compass') return false;

  const lore = itemStack.getLore();
  if (!lore || lore.length === 0) return false;

  const match = lore[0].match(/(-?\d+),\s*(-?\d+),\s*(-?\d+)(?:\s*\[(.*?)\])?/);
  if (!match) return false;

  const targetX = parseInt(match[1]);
  const targetY = parseInt(match[2]);
  const targetZ = parseInt(match[3]);

  system.run(() => {
    const playerId = player.id;
    const now = Date.now();

    for (const [id, expireTime] of recentTeleports.entries()) {
      if (now > expireTime) {
        recentTeleports.delete(id);
      }
    }

    if (
      activeTeleports.has(playerId) ||
      tpQueue.find((q) => q.playerId === playerId)
    ) {
      return;
    }
    if (recentTeleports.has(playerId)) return;

    const targetDimId = match[4] || player.dimension.id;
    let targetDim;
    try {
      targetDim = world.getDimension(targetDimId);
    } catch (e) {
      targetDim = player.dimension;
    }

    const req = {
      playerId,
      player,
      targetX,
      targetY,
      targetZ,
      dimension: targetDim,
      startLoc: player.location,
      ticks: 0,
      canceled: false,
      hasTickingArea: false
    };

    tpQueue.push(req);

    const position = tpQueue.length;
    if (activeTeleports.size === 10) {
      const waitTime = getEstimatedWaitTime(position);
      player.sendMessage(`§eTeleporting in ${waitTime + 5}s (position in queue: ${position})`);
    } else {
      player.sendMessage('§eTeleporting in 5 seconds');
    }
  });

  return true;
}

world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
  const { player, block, itemStack } = ev;
  if (!itemStack) return;
  if (!FeatureFlags.isEnabled(FeatureFlags.FEATURES.TPA)) return;

  if (block.typeId === 'minecraft:lodestone') {
    if (
      itemStack.typeId === 'minecraft:compass' ||
      itemStack.typeId === 'minecraft:lodestone_compass'
    ) {
      const hasPermission = DS.claims.hasPermission(block.location, player, 'useItemsOnBlocks');

      if (!hasPermission) {
        ev.cancel = true;
        return;
      }

      const loc = block.location;

      system.run(() => {
        const inv = player.getComponent('minecraft:inventory').container;
        const eq = player.getComponent('minecraft:equippable');

        const processItem = (item, slot, isEq) => {
          if (item && item.typeId === 'minecraft:lodestone_compass') {
            const lore = item.getLore();
            if (isEq || !lore || lore.length === 0) {
              item.setLore([`§7${loc.x}, ${loc.y}, ${loc.z} [${player.dimension.id}]`]);
              if (isEq) {
                eq.setEquipment(slot, item);
              } else {
                inv.setItem(slot, item);
              }
            }
          }
        };

        processItem(eq.getEquipment(EquipmentSlot.Mainhand), EquipmentSlot.Mainhand, true);

        for (let i = 0; i < inv.size; i++) {
          processItem(inv.getItem(i), i, false);
        }
      });
    }
  } else {
    if (tryTeleport(player, itemStack)) {
      ev.cancel = true;
    }
  }
});

function getEstimatedWaitTime(position) {
  if (activeTeleports.size < 10) return 0;

  const remainingTicksList = [];
  for (const req of activeTeleports.values()) {
    remainingTicksList.push(100 - req.ticks);
  }
  remainingTicksList.sort((a, b) => a - b);

  const batchIndex = Math.floor((position - 1) / 10);
  const slotIndex = (position - 1) % 10;

  const waitTicks = remainingTicksList[slotIndex] + batchIndex * 100;
  return Math.ceil(waitTicks / 20);
}

world.beforeEvents.itemUse.subscribe((ev) => {
  const { source: player, itemStack } = ev;
  if (tryTeleport(player, itemStack)) {
    ev.cancel = true;
  }
});

system.runInterval(() => {
  try {
    while (activeTeleports.size < 10 && tpQueue.length > 0) {
      const req = tpQueue.shift();

      let chunkLoaded = false;
      try {
        const finalBlock = req.dimension.getBlock({ x: req.targetX, y: req.targetY, z: req.targetZ });
        if (finalBlock) chunkLoaded = true;
      } catch (e) {}

    if (!chunkLoaded) {
      req.hasTickingArea = true;
      req.tickingAreaName = `lode_${req.playerId.replace(/-/g, '')}`;
      try {
        req.dimension.runCommand(`tickingarea add circle ${req.targetX} 0 ${req.targetZ} 1 ${req.tickingAreaName} true`);
      } catch (e) {}
    }

    activeTeleports.set(req.playerId, req);
  }

  for (const [playerId, req] of activeTeleports.entries()) {
    let currentLoc;
    try {
      currentLoc = req.player.location;
    } catch (e) {
      cleanUpReq(req);
      continue;
    }
    const dist = Math.sqrt(
      Math.pow(currentLoc.x - req.startLoc.x, 2) +
      Math.pow(currentLoc.y - req.startLoc.y, 2) +
      Math.pow(currentLoc.z - req.startLoc.z, 2)
    );

    if (dist > 0.5 && !req.canceled) {
      try {
        req.player.playSound('note.bass');
      } catch (e) {}
      cleanUpReq(req);
      continue;
    }

    if (req.ticks >= 100) {
      if (!req.canceled) {
        let finalBlock;
        try {
          finalBlock = req.dimension.getBlock({ x: req.targetX, y: req.targetY, z: req.targetZ });
        } catch (e) {}

        if (!finalBlock || finalBlock.typeId !== 'minecraft:lodestone') {
          try {
            req.player.playSound('note.bass');
          } catch (e) {}
        } else {
          try {
            req.player.teleport(
              { x: req.targetX + 0.5, y: req.targetY + 1, z: req.targetZ + 0.5 },
              { dimension: req.dimension }
            );
          } catch (e) {}
        }
      }
      cleanUpReq(req);
      continue;
    }

    if (!req.canceled) {
      if (req.ticks % 20 === 0) {
        try {
          req.player.playSound('random.click');
        } catch (e) {}
      }
      try {
        req.player.dimension.spawnParticle('minecraft:shriek_particle', {
          x: req.startLoc.x,
          y: req.startLoc.y + 0.1,
          z: req.startLoc.z
        });
      } catch (e) {}
    }

    req.ticks += 10;
  }
  } catch (err) {
    console.warn("LODESTONE INTERVAL CRASH: " + err);
  }
}, 10);

function cleanUpReq(req) {
  if (req.hasTickingArea) {
    try {
      req.dimension.runCommand(`tickingarea remove ${req.tickingAreaName}`);
    } catch (e) {}
  }
  activeTeleports.delete(req.playerId);
  recentTeleports.set(req.playerId, Date.now() + 5000);
}
