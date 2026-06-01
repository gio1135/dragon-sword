import { world, EquipmentSlot } from "@minecraft/server";
import {
  GetBlockCategory,
  IsActivated,
  IsBlockAllowed,
} from "./requirements.js";
import { GetPattern } from "./modes.js";
import {
  GetLocId,
  DisplayActionBar,
  CONNECTION_OFFSETS,
} from "./utils.js";
import {
  OUTLINE_STYLES,
  LIQUIDS,
  HOEBLOCK,
  SHOVELABLE_BLOCKS,
} from "./registry.js";
import {
  CheckModeActive,
  ValidateMining,
  RunChainBreak2,
} from "./break_handler.js";

const BREAK_QUEUE = new Map();

class HighlightManager {
  createSession(player, blockType, location, face, direction, extras = {}) {
    const locId = GetLocId(location);
    const session = {
      currentIndex: 0,
      blockCache: new Map(),
      blockType: blockType,
      lastToolTypeId: undefined,
      origin: location,
      queue: [[location, 0]],
      visited: new Set([locId]),
      blockSet: new Set([locId]),
      lightsMap: new Map(),
      faceMap: new Map(),
      isFinished: false,
      isMining: false,
      isBigTree: false,
      treeOrigin: undefined,
      treeLogId: undefined,
      leavesBroken: 0,
      saplingPlanted: false,
      scanFace: face,
      scanDir: direction || player.getViewDirection(),
      patternCalculated: false,
      startSlot: player.selectedSlotIndex,
      switchTimer: 0,
      isStopped: false,
      ...extras,
    };

    this.sessions.set(player.id, session);
    return session;
  }

  removeBlockHighlight(playerId, locId) {
    const session = this.sessions.get(playerId);
    if (!session) return;

    const entity = session.lightsMap.get(locId);
    if (entity && entity.isValid) {
      try {
        entity.remove();
      } catch (e) {}
    }
    session.lightsMap.delete(locId);
    session.blockSet.delete(locId);
    if (session.blockSet.size === 0) {
      const player = world.getAllPlayers().find((p) => p.id === playerId);
      if (player) player.onScreenDisplay.setActionBar("");
    }
  }

  constructor() {
    this.sessions = new Map();
    this.trackedEntities = new Set();
    this.lastHeavyCleanup = 0;
  }

  pushToQueue(playerId, data) {
    if (!BREAK_QUEUE.has(playerId)) BREAK_QUEUE.set(playerId, []);
    BREAK_QUEUE.get(playerId).push(data);
  }

  getQueue(playerId) {
    return BREAK_QUEUE.get(playerId) || [];
  }

  clearQueue(playerId) {
    BREAK_QUEUE.delete(playerId);
  }

  isValidLocation(loc, dimensionId = "minecraft:overworld") {
    if (dimensionId === "minecraft:nether") {
      return loc.y >= 0 && loc.y <= 127;
    }
    if (dimensionId === "minecraft:the_end") {
      return loc.y >= 0 && loc.y <= 255;
    }
    return loc.y >= -64 && loc.y <= 320;
  }

  processBreakQueue(player) {
    const queue = this.getQueue(player.id);
    if (queue.length === 0) return;

    let session = this.sessions.get(player.id);

    while (queue.length > 0) {
      const breakData = queue.shift();

      if (session?.isMining) continue;

      if (session && session.blockSet.has(breakData.locId)) {
        const blockList = Array.from(session.blockSet);
        RunChainBreak2(
          player,
          blockList,
          breakData.typeId,
          breakData.pos,
          blockList.length,
        );
        continue;
      }

      const isHoeTarget = HOEBLOCK.includes(breakData.typeId);
      const isShovelTarget = SHOVELABLE_BLOCKS.includes(breakData.typeId);

      if (
        IsBlockAllowed(player, breakData.typeId) &&
        CheckModeActive(player) &&
        ValidateMining(player, breakData.typeId)
      ) {
        this.forceCreateSession(player, breakData, {
          isHoe: isHoeTarget,
          isShovel: isShovelTarget,
        });

        const newSession = this.sessions.get(player.id);
        const blockList = Array.from(newSession.blockSet);
        RunChainBreak2(
          player,
          blockList,
          breakData.typeId,
          breakData.pos,
          blockList.length,
        );
      }
    }
  }

  forceCreateSession(player, breakData, extraFlags = {}) {
    this.clearHighlights(player);

    const newSession = this.createSession(
      player,
      breakData.typeId,
      breakData.pos,
      undefined,
      player.getViewDirection(),
      extraFlags,
    );

    if (extraFlags.isHoe) {
      this.expandHoeSearch(player, newSession, 256);
    } else if (extraFlags.isShovel) {
      this.expandShovelSearch(player, newSession, 256);
    } else {
      this.expandSearch(
        player,
        newSession,
        "standard_v3",
        512,
      );
    }

    newSession.isFinished = true;
  }

  static getInstance() {
    if (!HighlightManager.instance) {
      HighlightManager.instance = new HighlightManager();
    }
    return HighlightManager.instance;
  }

  buildFaceMap(blockSet) {
    const faceMap = new Map();

    blockSet.forEach((locId) => {
      const parts = locId.split(",");
      const x = parseInt(parts[0]);
      const y = parseInt(parts[1]);
      const z = parseInt(parts[2]);

      const hiddenFaces = new Set();

      for (const offset of CONNECTION_OFFSETS) {
        const nx = x + offset.x;
        const ny = y + offset.y;
        const nz = z + offset.z;
        const nid = `${nx},${ny},${nz}`;

        if (blockSet.has(nid)) {
          hiddenFaces.add(offset.prop);
        }
      }

      faceMap.set(locId, hiddenFaces);
    });

    return faceMap;
  }

  isFullyEnclosed(hiddenFaces) {
    const n = hiddenFaces.has("ds:north");
    const s = hiddenFaces.has("ds:south");
    const e = hiddenFaces.has("ds:east");
    const w = hiddenFaces.has("ds:west");
    const u = hiddenFaces.has("ds:up");
    const d = hiddenFaces.has("ds:down");

    return (
      (n && s && e && w && u && d) ||
      (n && s && e && w) ||
      (n && s && u && d) ||
      (e && w && u && d)
    );
  }

  clearHighlights(player) {
    if (!player) return;
    const session = this.sessions.get(player.id);
    if (session) {
      player.onScreenDisplay.setActionBar("");
      if (session.lightsMap) {
        session.lightsMap.forEach((ent) => {
          if (ent && ent.isValid) {
            try {
              ent.remove();
            } catch (e) {}
          }
        });
      }
      if (session.blockCache) {
        session.blockCache.clear();
        session.blockCache = null;
      }
      this.sessions.delete(player.id);
    }
  }

  spawnOutline(player, location, hiddenFaces) {
    try {
      const colorIdx = 0;
      const styleConfig = OUTLINE_STYLES[0];
      const entityId = styleConfig.entity;
      const entity = player.dimension.spawnEntity(entityId, {
        x: location.x + 0.5,
        y: location.y + 0.5,
        z: location.z + 0.5,
      });
      if (entity) {
        this.trackedEntities.add(entity);
        entity.setProperty("ds:style_id", colorIdx);
        entity.setProperty("ds:opacity", 100);

        hiddenFaces.forEach((prop) => {
          try {
            entity.setProperty(prop, false);
          } catch (e) {}
        });
      }
      return entity;
    } catch (e) {
      return null;
    }
  }

  updateOutline(entity, hiddenFaces, colorIdx, opacity) {
    if (!entity || !entity.isValid) return;
    try {
      entity.setProperty("ds:style_id", colorIdx);
      entity.setProperty("ds:opacity", opacity);
      for (const offset of CONNECTION_OFFSETS) {
        if (offset.prop) {
          entity.setProperty(offset.prop, true);
        }
      }
      hiddenFaces.forEach((prop) => {
        entity.setProperty(prop, false);
      });
    } catch (e) {}
  }

  getActiveToolMode(player) {
    const tool = player
      .getComponent("minecraft:equippable")
      ?.getEquipment(EquipmentSlot.Mainhand);
    if (!tool) return "none";

    if (tool.typeId.includes("_hoe")) return "hoe";
    if (tool.typeId.includes("_shovel")) return "shovel";
    if (tool.typeId === "minecraft:bucket") return "bucket";
    return "mining";
  }

  syncEntities(player, session) {
    if (!session || !session.blockSet || !session.faceMap) return;

    const colorIdx = 0;
    const opacity = 100;

    session.blockSet.forEach((locId) => {
      const hiddenFaces = session.faceMap.get(locId);
      if (this.isFullyEnclosed(hiddenFaces)) {
        const entity = session.lightsMap.get(locId);
        if (entity && entity.isValid) {
          try {
            entity.remove();
          } catch (e) {}
        }
        session.lightsMap.delete(locId);
      } else {
        const entity = session.lightsMap.get(locId);
        if (entity && entity.isValid) {
          this.updateOutline(entity, hiddenFaces, colorIdx, opacity);
        } else {
          const parts = locId.split(",");
          const location = {
            x: parseInt(parts[0]),
            y: parseInt(parts[1]),
            z: parseInt(parts[2]),
          };
          const newEntity = this.spawnOutline(player, location, hiddenFaces);
          if (newEntity) {
            session.lightsMap.set(locId, newEntity);
          }
        }
      }
    });

    const toRemove = [];
    session.lightsMap.forEach((entity, locId) => {
      if (!session.blockSet.has(locId)) {
        if (entity && entity.isValid) {
          try {
            entity.remove();
          } catch (e) {}
        }
        toRemove.push(locId);
      }
    });

    toRemove.forEach((locId) => session.lightsMap.delete(locId));
  }

  handleScanning(player, enableVisual = true) {
    if (!player?.isValid) return;

    const tool = player
      .getComponent("minecraft:equippable")
      ?.getEquipment(EquipmentSlot.Mainhand);

    let session = this.sessions.get(player.id);
    if (session && player.selectedSlotIndex !== session.startSlot) {
      this.clearHighlights(player);
      session = null;
    }
    if (session?.isMining) return;

    if (!IsActivated(player)) {
      this.clearHighlights(player);
      return;
    }

    const raycast = this.getTargetRaycast(player);
    const currentBlock = raycast?.block;
    const currentLocId = currentBlock
      ? GetLocId(currentBlock.location)
      : null;

    if (session && !session.isMining) {
      if (
        !currentBlock ||
        currentBlock.typeId === "minecraft:air" ||
        !session.blockSet.has(currentLocId)
      ) {
        const currentBlock = player.dimension.getBlock(session.origin);
        if (!session.isMining && (!currentBlock || currentBlock.typeId !== session.blockType)) {
          this.sessions.delete(player.id);
          this.clearHighlights(player);
          return;
        }
      } else {
        session.switchTimer = 0;
      }
    }

    if (!session && currentBlock && currentBlock.typeId !== "minecraft:air") {
      if (!IsBlockAllowed(player, currentBlock.typeId)) return;
      if (!GetBlockCategory(currentBlock.typeId)) return;

      session = this.createSession(
        player,
        currentBlock.typeId,
        currentBlock.location,
        raycast.face,
      );
    }

    if (!session) return;

    const prevSize = session.blockSet.size;

    if (!session.isFinished && session.blockSet.size < 256) {
      this.expandSearch(
        player,
        session,
        "standard_v3",
        256,
      );
      if (session.queue.length === 0) {
        session.isFinished = true;
      }
    }

    if (true && !session.isMining) {
      const blockName = session.blockType.split(":")[1].replace(/_/g, " ");
      DisplayActionBar(player, {
        type: session.isFinished ? "ready" : "scanning",
        current: session.blockSet.size,
        max: 256,
        blockName,
      });
    }

    if (session.blockSet.size > prevSize || session.isFinished) {
      session.faceMap = this.buildFaceMap(session.blockSet);

      if (enableVisual) {
        this.syncEntities(player, session);
      } else {
        session.lightsMap.forEach((ent) => {
          if (ent?.isValid) {
            try {
              ent.remove();
            } catch {}
          }
        });
        session.lightsMap.clear();
      }
    }
  }

  handleScanningBucket(player) {
    if (!player?.isValid) return;
    if (!IsActivated(player)) {
      const session = this.sessions.get(player.id);
      if (session && session.isLiquid) this.clearHighlights(player);
      return;
    }

    const inventory = player.getComponent("minecraft:inventory").container;
    const tool = player
      .getComponent("minecraft:equippable")
      ?.getEquipment(EquipmentSlot.Mainhand);
    const bucketTypes = [
      "minecraft:bucket",
      "minecraft:water_bucket",
      "minecraft:lava_bucket",
    ];

    if (!bucketTypes.includes(tool?.typeId)) {
      const session = this.sessions.get(player.id);
      if (session && session.isLiquid) this.clearHighlights(player);
      return;
    }

    let emptyBucketCount = 0;
    for (let i = 0; i < inventory.size; i++) {
      const item = inventory.getItem(i);
      if (item?.typeId === "minecraft:bucket") {
        emptyBucketCount += item.amount;
      }
    }

    if (emptyBucketCount <= 0) {
      this.clearHighlights(player);
      return;
    }

    const scanLimit = Math.min(emptyBucketCount, 256);
    let session = this.sessions.get(player.id);
    if (session?.isMining) return;

    const raycast = this.getTargetRaycast(player);
    const currentBlock = raycast?.block;
    const currentLocId = currentBlock
      ? GetLocId(currentBlock.location)
      : null;

    if (session && session.isLiquid) {
      if (
        !currentBlock ||
        !LIQUIDS.includes(currentBlock.typeId) ||
        !session.blockSet.has(currentLocId)
      ) {
        this.clearHighlights(player);
        session = null;
      }
    }

    if (!session && currentBlock && LIQUIDS.includes(currentBlock.typeId)) {
      session = this.createSession(
        player,
        currentBlock.typeId,
        currentBlock.location,
        raycast.face,
        undefined,
        {
          isLiquid: true,
        },
      );
    }

    if (!session) return;

    if (!session.isFinished) {
      this.expandSearch(player, session, "standard_v3", scanLimit, scanLimit);
      session.isFinished = true;
    }

    if (session.blockSet.size > 0) {
      session.faceMap = this.buildFaceMap(session.blockSet);
      this.syncEntities(player, session);

      const blockName = session.blockType.split(":")[1].replace(/_/g, " ");
      DisplayActionBar(player, {
        type: "ready",
        current: session.blockSet.size,
        max: scanLimit,
        blockName: blockName,
      });
    }
  }

  getBlockCached(session, dim, pos) {
    const key = `${pos.x},${pos.y},${pos.z}`;
    let block = session.blockCache.get(key);
    if (block) return block;

    try {
      block = dim.getBlock(pos);
      session.blockCache.set(key, block);
      return block;
    } catch {
      return null;
    }
  }

  expandSearch(player, session, mode, maxBlocks, maxRadius = -1) {
    const limit = maxBlocks || 256;
    const radiusLimit = maxRadius > 0 ? maxRadius : 24;
    const lowerMode = mode.toLowerCase();
    const dimId = player.dimension.id;

    if (!lowerMode.startsWith("standard")) {
      if (session.patternCalculated) return;

      const patternOffsets = GetPattern(
        mode,
        session.origin,
        session.scanFace,
        session.scanDir,
        limit,
      );
      if (!patternOffsets) return;

      const patternLookup = new Set(
        patternOffsets.map((o) => `${o.x},${o.y},${o.z}`),
      );

      const localQueue = [{ x: 0, y: 0, z: 0 }];
      const localVisited = new Set(["0,0,0"]);

      session.blockSet.clear();
      session.blockSet.add(GetLocId(session.origin));

      while (localQueue.length > 0 && session.blockSet.size < limit) {
        const curr = localQueue.shift();

        for (let dx = -4; dx <= 4; dx++) {
          for (let dy = -4; dy <= 4; dy++) {
            for (let dz = -4; dz <= 4; dz++) {
              if (dx === 0 && dy === 0 && dz === 0) continue;

              const relPos = { x: curr.x + dx, y: curr.y + dy, z: curr.z + dz };
              const relKey = `${relPos.x},${relPos.y},${relPos.z}`;

              if (patternLookup.has(relKey) && !localVisited.has(relKey)) {
                localVisited.add(relKey);

                const worldPos = {
                  x: session.origin.x + relPos.x,
                  y: session.origin.y + relPos.y,
                  z: session.origin.z + relPos.z,
                };

                if (!this.isValidLocation(worldPos, dimId)) continue;
                const dim = player.dimension;
                const nb = this.getBlockCached(session, dim, worldPos);

                if (nb && nb.typeId === session.blockType) {
                  session.blockSet.add(GetLocId(worldPos));
                  localQueue.push(relPos);
                }
              }
            }
          }
        }
      }
      session.patternCalculated = true;
      return;
    }

    for (let i = 0; i < 200; i++) {
      if (session.queue.length === 0 || session.blockSet.size >= limit) break;
      if (session.isStopped) break;

      const queueData = session.queue.shift();
      const currentPos = Array.isArray(queueData) ? queueData[0] : queueData;
      const currentRadius = Array.isArray(queueData) ? queueData[1] : 0;

      if (currentRadius >= radiusLimit) continue;

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            if (dx === 0 && dy === 0 && dz === 0) continue;

            const nextPos = {
              x: currentPos.x + dx,
              y: currentPos.y + dy,
              z: currentPos.z + dz,
            };

            const nid = GetLocId(nextPos);
            if (session.visited.has(nid)) continue;
            session.visited.add(nid);

            if (!this.isValidLocation(nextPos, dimId)) continue;

            const dist = Math.max(
              Math.abs(nextPos.x - session.origin.x),
              Math.abs(nextPos.y - session.origin.y),
              Math.abs(nextPos.z - session.origin.z)
            );

            if (dist > radiusLimit) continue;

            const nb = this.getBlockCached(session, player.dimension, nextPos);
            if (nb && nb.typeId === session.blockType) {
              if (session.isLiquid) {
                try {
                  const depth = nb.permutation.getState("liquid_depth");
                  if (depth !== 0) continue;
                } catch (e) {}
              }
              session.blockSet.add(nid);
              session.queue.push([nextPos, currentRadius + 1]);
            }
          }
        }
      }
    }
  }

  cleanupOrphanedHighlights() {
    const validIds = new Set();
    this.sessions.forEach((s) => {
      s.lightsMap?.forEach((ent) => {
        if (ent?.isValid) validIds.add(ent.id);
      });
    });

    for (const entity of this.trackedEntities) {
      if (!entity.isValid) {
        this.trackedEntities.delete(entity);
        continue;
      }

      if (!validIds.has(entity.id)) {
        try {
          entity.remove();
          this.trackedEntities.delete(entity);
        } catch (e) {}
      }
    }

    const now = Date.now();
    if (now - this.lastHeavyCleanup < 300000) return;
    this.lastHeavyCleanup = now;

    const allEntityTypes = OUTLINE_STYLES.map((s) => s.entity);
    for (const player of world.getAllPlayers()) {
      try {
        for (const typeId of allEntityTypes) {
          const nearby = player.dimension.getEntities({
            type: typeId,
            location: player.location,
            maxDistance: 8 + 10,
          });
          for (const entity of nearby) {
            if (!validIds.has(entity.id)) {
              try {
                entity.remove();
              } catch (e) {}
            }
          }
        }
      } catch (e) {}
    }
  }

  getTargetRaycast(player) {
    const equipment = player.getComponent("minecraft:equippable");
    const tool = equipment?.getEquipment(EquipmentSlot.Mainhand);
    const isBucket = tool?.typeId === "minecraft:bucket";

    try {
      const raycast = player.getBlockFromViewDirection({
        maxDistance: 8,
        includeLiquidBlocks: isBucket,
      });

      if (!raycast?.block) return null;

      if (isBucket) {
        const typeId = raycast.block.typeId;
        if (LIQUIDS.includes(typeId)) {
          return raycast;
        }
        return null;
      }

      return raycast;
    } catch {
      return null;
    }
  }

  handleScanningHoe(player) {
    if (!player?.isValid) return;
    if (!IsActivated(player)) {
      const session = this.sessions.get(player.id);
      if (session && session.isHoe) this.clearHighlights(player);
      return;
    }

    const tool = player
      .getComponent("minecraft:equippable")
      ?.getEquipment(EquipmentSlot.Mainhand);
    if (!tool?.typeId.includes("_hoe")) {
      const session = this.sessions.get(player.id);
      if (session && session.isHoe) this.clearHighlights(player);
      return;
    }

    const raycast = player.getBlockFromViewDirection({
      maxDistance: 8,
    });
    const currentBlock = raycast?.block;
    const currentLocId = currentBlock
      ? GetLocId(currentBlock.location)
      : null;
    let session = this.sessions.get(player.id);

    if (session?.isMining) return;

    if (session && session.isHoe && !session.isMining) {
      if (!currentBlock || !session.blockSet.has(currentLocId)) {
        if (currentBlock && HOEBLOCK.includes(currentBlock.typeId)) {
          session.switchTimer = (session.switchTimer || 0) + 1;
          if (session.switchTimer >= 10) {
            this.clearHighlights(player);
            session = null;
          }
          return;
        } else {
          this.clearHighlights(player);
          session = null;
        }
      } else {
        session.switchTimer = 0;
      }
    }

    if (!session && currentBlock && HOEBLOCK.includes(currentBlock.typeId)) {
      if (!this.isValidLocation(currentBlock.location, player.dimension.id))
        return;

      session = this.createSession(
        player,
        currentBlock.typeId,
        currentBlock.location,
        raycast.face,
        undefined,
        {
          isHoe: true,
        },
      );
    }

    if (!session) return;

    if (!session.isFinished) {
      this.expandHoeSearch(player, session, 256);
      if (session.queue.length === 0 || session.blockSet.size >= 256) {
        session.isFinished = true;
      }
    }

    if (session.blockSet.size > 0) {
      session.faceMap = this.buildFaceMap(session.blockSet);
      this.syncEntities(player, session);
    }
  }

  expandHoeSearch(player, session, limit) {
    let step = 0;
    const dimId = player.dimension.id;
    const MAX_PER_TICK = 100;
    while (
      !session.isStopped &&
      session.queue.length > 0 &&
      session.blockSet.size < limit &&
      step < MAX_PER_TICK
    ) {
      const [currentPos] = session.queue.shift();
      const dirs = [
        { x: 1, z: 0 },
        { x: -1, z: 0 },
        { x: 0, z: 1 },
        { x: 0, z: -1 },
        { x: 1, z: 1 },
        { x: 1, z: -1 },
        { x: -1, z: 1 },
        { x: -1, z: -1 },
      ];

      for (const d of dirs) {
        const nextPos = {
          x: currentPos.x + d.x,
          y: currentPos.y,
          z: currentPos.z + d.z,
        };
        if (!this.isValidLocation(nextPos, dimId)) continue;
        const nid = GetLocId(nextPos);
        if (session.visited.has(nid)) continue;
        session.visited.add(nid);

        const nb = this.getBlockCached(session, player.dimension, nextPos);
        if (nb && HOEBLOCK.includes(nb.typeId)) {
          const abovePos = { x: nextPos.x, y: nextPos.y + 1, z: nextPos.z };
          if (this.isValidLocation(abovePos, player.dimension.id)) {
            const above = this.getBlockCached(
              session,
              player.dimension,
              abovePos,
            );
            if (
              above &&
              (above.isAir || above.typeId === "minecraft:snow_layer")
            ) {
              session.blockSet.add(nid);
              session.queue.push([nextPos, 0]);
            }
          }
        }
      }
      step++;
    }
  }

  handleScanningShovel(player) {
    if (!player?.isValid) return;
    if (!IsActivated(player)) {
      const session = this.sessions.get(player.id);
      if (session && session.isShovel) this.clearHighlights(player);
      return;
    }

    const tool = player
      .getComponent("minecraft:equippable")
      ?.getEquipment(EquipmentSlot.Mainhand);
    if (!tool?.typeId.includes("_shovel")) {
      const session = this.sessions.get(player.id);
      if (session && session.isShovel) this.clearHighlights(player);
      return;
    }

    const raycast = player.getBlockFromViewDirection({
      maxDistance: 8,
    });
    const currentBlock = raycast?.block;
    const currentLocId = currentBlock
      ? GetLocId(currentBlock.location)
      : null;
    let session = this.sessions.get(player.id);

    if (session && session.isShovel && !session.isMining) {
      if (!currentBlock || !session.blockSet.has(currentLocId)) {
        if (currentBlock && SHOVELABLE_BLOCKS.includes(currentBlock.typeId)) {
          session.switchTimer = (session.switchTimer || 0) + 1;
          if (session.switchTimer >= 10) {
            this.clearHighlights(player);
            session = null;
          }
          return;
        } else {
          this.clearHighlights(player);
          session = null;
        }
      } else {
        session.switchTimer = 0;
      }
    }

    if (
      !session &&
      currentBlock &&
      SHOVELABLE_BLOCKS.includes(currentBlock.typeId)
    ) {
      if (!this.isValidLocation(currentBlock.location, player.dimension.id))
        return;

      session = this.createSession(
        player,
        currentBlock.typeId,
        currentBlock.location,
        raycast.face,
        undefined,
        {
          isShovel: true,
        },
      );
    }

    if (!session) return;

    if (!session.isFinished) {
      this.expandShovelSearch(player, session, 256);
      if (session.queue.length === 0 || session.blockSet.size >= 256) {
        session.isFinished = true;
      }
    }

    if (session.blockSet.size > 0) {
      session.faceMap = this.buildFaceMap(session.blockSet);
      this.syncEntities(player, session);
    }
  }

  expandShovelSearch(player, session, limit) {
    let step = 0;
    const dimId = player.dimension.id;
    const MAX_PER_TICK = 100;
    while (
      !session.isStopped &&
      session.queue.length > 0 &&
      session.blockSet.size < limit &&
      step < MAX_PER_TICK
    ) {
      const [currentPos] = session.queue.shift();
      const dirs = [
        { x: 1, z: 0 },
        { x: -1, z: 0 },
        { x: 0, z: 1 },
        { x: 0, z: -1 },
        { x: 1, z: 1 },
        { x: 1, z: -1 },
        { x: -1, z: 1 },
        { x: -1, z: -1 },
      ];

      for (const d of dirs) {
        const nextPos = {
          x: currentPos.x + d.x,
          y: currentPos.y,
          z: currentPos.z + d.z,
        };
        if (!this.isValidLocation(nextPos, dimId)) continue;
        const nid = GetLocId(nextPos);
        if (session.visited.has(nid)) continue;
        session.visited.add(nid);

        const nb = this.getBlockCached(session, player.dimension, nextPos);
        if (nb && SHOVELABLE_BLOCKS.includes(nb.typeId)) {
          const abovePos = { x: nextPos.x, y: nextPos.y + 1, z: nextPos.z };
          const above = this.getBlockCached(
            session,
            player.dimension,
            abovePos,
          );
          if (
            above &&
            (above.isAir || above.typeId === "minecraft:snow_layer")
          ) {
            session.blockSet.add(nid);
            session.queue.push([nextPos, 0]);
          }
        }
      }
      step++;
    }
  }
}

export const highlightManager = HighlightManager.getInstance();