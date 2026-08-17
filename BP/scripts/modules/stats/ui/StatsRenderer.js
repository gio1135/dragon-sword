import {
  formatTime,
  formatDistance,
  formatNumber,
  formatDamage,
  formatTypeId,
  formatPerHour,
  formatDate,
  getTopEntries,
  getAllEntries,
} from '../utils/formatters.js';
import { DIMENSION_NAMES, DEATH_CAUSE_MAP } from '../core/constants.js';

function percent(value, total) {
  if (!total || total === 0) return '0.0%';
  return ((value / total) * 100).toFixed(1) + '%';
}

export class StatsRenderer {
  static renderGeneral(stats) {
    const core = stats['ds:stats_core'] || {};
    const combat = stats['ds:stats_combat'] || {};
    const blocks = stats['ds:stats_blocks'] || {};
    const items = stats['ds:stats_items'] || {};

    const timePlayed = core.time?.played || 0;
    const deaths = core.deaths?.total || 0;
    const mobKills = combat.kills?.mobs?.total || 0;
    const blocksMined = blocks.mined?.total || 0;
    const blocksPlaced = blocks.placed?.total || 0;

    let text = '§l§6- General statistics -§r\n\n';

    text += '§e- Time -§r\n';
    text += `§7• §fTime played: §a${formatTime(timePlayed)}§r\n`;
    text += `§7• §fSessions: §e${formatNumber(core.sessions?.total || 0)}§r\n`;
    text += `§7• §fFirst joined: §b${formatDate(core.time?.firstJoined)}§r\n`;
    text += `§7• §fCurrent life: §a${formatTime(core.life?.current || 0)}§r\n`;
    text += `§7• §fLongest life: §6${formatTime(core.life?.longest || 0)}§r\n\n`;

    text += '§a- Experience -§r\n';
    text += `§7• §fTotal xp collected: §a${formatNumber(core.xp?.total || 0)}§r\n`;
    text += `§7• §fCurrent level: §e${formatNumber(core.xp?.level || 0)}§r\n`;
    text += `§7• §fHighest level: §6${formatNumber(core.xp?.highest || 0)}§r\n\n`;

    text += '§b- Quick stats -§r\n';
    text += `§7• §fDeaths: §c${formatNumber(deaths)} §8(${formatPerHour(deaths, timePlayed)})§r\n`;
    text += `§7• §fMob kills: §e${formatNumber(mobKills)} §8(${formatPerHour(mobKills, timePlayed)})§r\n`;
    text += `§7• §fBlocks mined: §e${formatNumber(blocksMined)}§r\n`;
    text += `§7• §fBlocks placed: §a${formatNumber(blocksPlaced)}§r\n`;
    text += `§7• §fFood consumed: §d${formatNumber(items.food?.total || 0)}§r\n`;

    return text;
  }

  static renderCombat(stats) {
    const combat = stats['ds:stats_combat'] || {};
    const core = stats['ds:stats_core'] || {};
    const timePlayed = core.time?.played || 0;

    let text = '§l§c- Combat statistics -§r\n\n';

    const mobKills = combat.kills?.mobs?.total || 0;
    const playerKills = combat.kills?.players?.total || 0;

    text += '§c- Kills -§r\n';
    text += `§7• §fMob kills: §e${formatNumber(mobKills)} §8(${formatPerHour(mobKills, timePlayed)})§r\n`;

    const topMobs = getTopEntries(combat.kills?.mobs?.byType, 5);
    if (topMobs.length > 0) {
      text += '§7  Top mobs:§r\n';
      for (const { type, count } of topMobs) {
        text += `§8    - §f${formatTypeId(type)}: §e${formatNumber(count)}§r\n`;
      }
    }

    text += `§7• §fPlayer kills: §c${formatNumber(playerKills)}§r\n`;

    const topPlayers = getTopEntries(combat.kills?.players?.byPlayer, 5);
    if (topPlayers.length > 0) {
      text += '§7  Top players:§r\n';
      for (const { type, count } of topPlayers) {
        text += `§8    - §f${type}: §c${formatNumber(count)}§r\n`;
      }
    }
    text += '\n';

    text += '§6- Damage -§r\n';
    text += `§7• §fDealt: §e${formatDamage(combat.damage?.dealt?.total || 0)} §7hearts§r\n`;
    text += `§8    To mobs: ${formatDamage(combat.damage?.dealt?.toMobs || 0)}§r\n`;
    text += `§8    To players: ${formatDamage(combat.damage?.dealt?.toPlayers || 0)}§r\n`;
    text += `§7• §fTaken: §c${formatDamage(combat.damage?.taken?.total || 0)} §7hearts§r\n`;
    text += `§8    From mobs: ${formatDamage(combat.damage?.taken?.fromMobs || 0)}§r\n`;
    text += `§8    From players: ${formatDamage(combat.damage?.taken?.fromPlayers || 0)}§r\n`;
    text += `§8    Environmental: ${formatDamage(combat.damage?.taken?.environmental || 0)}§r\n`;
    text += `§7• §fProjectiles blocked: §a${formatNumber(combat.damage?.blocked?.projectiles || 0)}§r\n\n`;

    const deaths = combat.deaths?.total || 0;
    text += '§4- Deaths -§r\n';
    text += `§7• §fTotal: §c${formatNumber(deaths)} §8(${formatPerHour(deaths, timePlayed)})§r\n`;
    text += `§7• §fBy mob: §c${formatNumber(combat.deaths?.byMob || 0)}§r\n`;
    text += `§7• §fBy player: §c${formatNumber(combat.deaths?.byPlayer || 0)}§r\n`;

    const topCauses = getTopEntries(combat.deaths?.causes, 5);
    if (topCauses.length > 0) {
      text += '§7  Top causes:§r\n';
      for (const { type, count } of topCauses) {
        const displayCause = DEATH_CAUSE_MAP[type] || formatTypeId(type);
        text += `§8    - §f${displayCause}: §c${formatNumber(count)}§r\n`;
      }
    }

    return text;
  }

  static renderBuilding(stats) {
    const blocks = stats['ds:stats_blocks'] || {};
    const interactions = stats['ds:stats_interactions'] || {};

    let text = '§l§6- Building statistics -§r\n\n';

    text += '§e- Blocks mined -§r\n';
    text += `§7• §fTotal: §e${formatNumber(blocks.mined?.total || 0)}§r\n`;

    const topMined = getTopEntries(blocks.mined?.byType, 8);
    if (topMined.length > 0) {
      for (const { type, count } of topMined) {
        text += `§8    - §f${formatTypeId(type)}: §e${formatNumber(count)}§r\n`;
      }
    }
    text += '\n';

    text += '§a- Blocks placed -§r\n';
    text += `§7• §fTotal: §a${formatNumber(blocks.placed?.total || 0)}§r\n`;

    const topPlaced = getTopEntries(blocks.placed?.byType, 8);
    if (topPlaced.length > 0) {
      for (const { type, count } of topPlaced) {
        text += `§8    - §f${formatTypeId(type)}: §a${formatNumber(count)}§r\n`;
      }
    }
    text += '\n';

    text += '§d- Workstation usage -§r\n';
    text += `§7• §fCrafting tables: §e${formatNumber(interactions.craftingTable || 0)}§r\n`;
    text += `§7• §fFurnaces: §e${formatNumber(interactions.furnace || 0)}§r\n`;
    text += `§7• §fBlast furnaces: §e${formatNumber(interactions.blastFurnace || 0)}§r\n`;
    text += `§7• §fSmokers: §e${formatNumber(interactions.smoker || 0)}§r\n`;
    text += `§7• §fAnvils: §e${formatNumber(interactions.anvil || 0)}§r\n`;
    text += `§7• §fEnchanting tables: §d${formatNumber(interactions.enchantingTable || 0)}§r\n`;
    text += `§7• §fBrewing stands: §d${formatNumber(interactions.brewingStand || 0)}§r\n`;
    text += `§7• §fGrindstones: §e${formatNumber(interactions.grindstone || 0)}§r\n`;
    text += `§7• §fStonecutters: §e${formatNumber(interactions.stonecutter || 0)}§r\n`;
    text += `§7• §fLooms: §e${formatNumber(interactions.loom || 0)}§r\n`;
    text += `§7• §fCartography tables: §e${formatNumber(interactions.cartographyTable || 0)}§r\n`;
    text += `§7• §fSmithing tables: §e${formatNumber(interactions.smithingTable || 0)}§r\n`;
    text += `§7• §fBeacons: §b${formatNumber(interactions.beacon || 0)}§r\n`;
    text += `§7• §fCampfires: §6${formatNumber(interactions.campfire || 0)}§r\n`;
    text += `§7• §fLecterns: §e${formatNumber(interactions.lectern || 0)}§r\n\n`;

    text += '§c- Redstone components -§r\n';
    text += `§7• §fHoppers: §e${formatNumber(interactions.hopper || 0)}§r\n`;
    text += `§7• §fDroppers: §e${formatNumber(interactions.dropper || 0)}§r\n`;
    text += `§7• §fDispensers: §e${formatNumber(interactions.dispenser || 0)}§r\n`;
    text += `§7• §fCrafters: §e${formatNumber(interactions.crafter || 0)}§r\n`;

    return text;
  }

  static renderExploration(stats) {
    const travel = stats['ds:stats_travel'] || {};
    const core = stats['ds:stats_core'] || {};

    let text = '§l§b- Exploration statistics -§r\n\n';

    const distance = travel.distance || {};
    const totalDistance =
      (distance.walked || 0) +
      (distance.sprinted || 0) +
      (distance.crouched || 0) +
      (distance.swum || 0) +
      (distance.flown || 0) +
      (distance.climbed || 0);

    text += '§b- Travel stats -§r\n';
    text += `§7• §fTotal distance: §a${formatDistance(totalDistance)}§r\n`;
    text += `§7• §fHighest point: §e${formatNumber(core.coordinates?.highest || 0)}§7Y§r\n`;
    text += `§7• §fLowest point: §e${formatNumber(core.coordinates?.lowest || 0)}§7Y§r\n`;
    text += `§7• §fFurthest from spawn: §b${formatNumber(core.coordinates?.furthest || 0)} §7blocks§r\n\n`;

    text += '§e- Travel methods -§r\n';
    const walked = distance.walked || 0;
    const sprinted = distance.sprinted || 0;
    const crouched = distance.crouched || 0;
    const swum = distance.swum || 0;
    const flown = distance.flown || 0;
    const climbed = distance.climbed || 0;
    const fallen = distance.fallen || 0;

    if (walked > 0) {
      text += `§7• §fWalking: §a${formatTime(Math.floor((walked / 100) * 20))} §7- §b${formatDistance(walked)} §8(${percent(walked, totalDistance)})§r\n`;
    }
    if (sprinted > 0) {
      text += `§7• §fSprinting: §a${formatTime(Math.floor(((sprinted / 100) * 20) / 1.3))} §7- §b${formatDistance(sprinted)} §8(${percent(sprinted, totalDistance)})§r\n`;
    }
    if (crouched > 0) {
      text += `§7• §fCrouching: §a${formatTime(Math.floor(((crouched / 100) * 20) / 0.3))} §7- §b${formatDistance(crouched)} §8(${percent(crouched, totalDistance)})§r\n`;
    }
    if (swum > 0) {
      text += `§7• §fSwimming: §a${formatTime(Math.floor((swum / 100) * 20))} §7- §b${formatDistance(swum)} §8(${percent(swum, totalDistance)})§r\n`;
    }
    if (flown > 0) {
      text += `§7• §fFlying: §a${formatTime(Math.floor(((flown / 100) * 20) / 1.5))} §7- §b${formatDistance(flown)} §8(${percent(flown, totalDistance)})§r\n`;
    }
    if (climbed > 0) {
      text += `§7• §fClimbing: §b${formatDistance(climbed)} §8(${percent(climbed, totalDistance)})§r\n`;
    }
    if (fallen > 0) {
      text += `§7• §fFallen: §c${formatDistance(fallen)}§r\n`;
    }
    text += '\n';

    const vehicles = travel.vehicles || {};
    const vehicleEntries = Object.entries(vehicles).filter(
      ([_, data]) => data.distance > 0,
    );
    if (vehicleEntries.length > 0) {
      const totalVehicleDistance = vehicleEntries.reduce(
        (sum, [_, data]) => sum + (data.distance || 0),
        0,
      );

      text += '§9- Vehicle travel -§r\n';
      for (const [vehicle, data] of vehicleEntries) {
        const vDist = data.distance || 0;
        const vTime = data.time || 0;
        text += `§7• §f${formatTypeId(vehicle)}: §a${formatTime(vTime)} §7- §b${formatDistance(vDist)} §8(${percent(vDist, totalVehicleDistance)})§r\n`;
      }
      text += '\n';
    }

    const dims = core.dimensions || {};
    const dimEntries = Object.entries(dims).filter(
      ([dim, time]) => dim !== 'current' && time > 0,
    );
    if (dimEntries.length > 0) {
      const totalDimTime = dimEntries.reduce((sum, [_, time]) => sum + time, 0);

      text += '§5- Dimension time -§r\n';
      for (const [dim, time] of dimEntries) {
        const displayName = DIMENSION_NAMES[dim] || formatTypeId(dim);
        text += `§7• §f${displayName}: §a${formatTime(time)} §8(${percent(time, totalDimTime)})§r\n`;
      }
      text += '\n';
    }

    const biomes = core.biomes?.discovered || [];
    const biomeTime = core.biomes?.timeIn || {};
    text += '§2- Biomes discovered -§r\n';
    text += `§7• §fTotal discovered: §a${biomes.length}§r\n`;

    if (biomes.length > 0) {
      const totalBiomeTime = Object.values(biomeTime).reduce(
        (sum, t) => sum + t,
        0,
      );

      const biomesWithTime = biomes
        .map((b) => ({
          name: b,
          time: biomeTime[b] || 0,
        }))
        .sort((a, b) => b.time - a.time);

      const topBiomes = biomesWithTime.slice(0, 6);
      for (const { name, time } of topBiomes) {
        if (time > 0) {
          text += `§8    - §f${formatTypeId(name)}: §a${formatTime(time)} §8(${percent(time, totalBiomeTime)})§r\n`;
        } else {
          text += `§8    - §f${formatTypeId(name)}: §7discovered§r\n`;
        }
      }
      if (biomes.length > 6) {
        text += `§8    ...and ${biomes.length - 6} more§r\n`;
      }
    }
    text += '\n';

    text += '§d- Portal usage -§r\n';
    text += `§7• §fTotal transitions: §d${formatNumber(travel.portals?.total || 0)}§r\n\n`;

    text += '§f- Movement -§r\n';
    text += `§7• §fJumps: §e${formatNumber(core.movement?.jumped || 0)}§r\n`;

    return text;
  }

  static renderSurvival(stats) {
    const items = stats['ds:stats_items'] || {};
    const interactions = stats['ds:stats_interactions'] || {};
    const misc = stats['ds:stats_misc'] || {};
    const combat = stats['ds:stats_combat'] || {};
    const core = stats['ds:stats_core'] || {};

    let text = '§l§a- Survival statistics -§r\n\n';

    text += '§a- Food consumed -§r\n';
    text += `§7• §fTotal: §a${formatNumber(items.food?.total || 0)}§r\n`;

    const topFood = getTopEntries(items.food?.byType, 5);
    if (topFood.length > 0) {
      for (const { type, count } of topFood) {
        text += `§8    - §f${formatTypeId(type)}: §a${formatNumber(count)}§r\n`;
      }
    }
    text += '\n';

    text += '§e- Items -§r\n';
    text += `§7• §fUsed: §e${formatNumber(items.used?.total || 0)}§r\n`;

    const topUsed = getTopEntries(items.used?.byType, 5);
    if (topUsed.length > 0) {
      for (const { type, count } of topUsed) {
        text += `§8    - §f${formatTypeId(type)}: §e${formatNumber(count)}§r\n`;
      }
    }

    text += `§7• §fPicked up: §b${formatNumber(items.picked?.total || 0)}§r\n`;

    const topPicked = getTopEntries(items.picked?.byType, 3);
    if (topPicked.length > 0) {
      for (const { type, count } of topPicked) {
        text += `§8    - §f${formatTypeId(type)}: §b${formatNumber(count)}§r\n`;
      }
    }

    text += `§7• §fDropped: §c${formatNumber(items.dropped?.total || 0)}§r\n`;

    const topDropped = getTopEntries(items.dropped?.byType, 3);
    if (topDropped.length > 0) {
      for (const { type, count } of topDropped) {
        text += `§8    - §f${formatTypeId(type)}: §c${formatNumber(count)}§r\n`;
      }
    }
    text += '\n';

    text += '§5- Status effects -§r\n';
    text += `§7• §fTotal applied: §d${formatNumber(misc.effects?.total || 0)}§r\n`;
    text += `§7• §fUnique effects: §a${(misc.effects?.unique || []).length}§r\n`;

    const topEffects = getTopEntries(misc.effects?.byType, 5);
    if (topEffects.length > 0) {
      for (const { type, count } of topEffects) {
        text += `§8    - §f${formatTypeId(type)}: §d${formatNumber(count)}§r\n`;
      }
    }
    text += '\n';

    text += '§6- Containers opened -§r\n';
    text += `§7• §fChests: §e${formatNumber(interactions.chest || 0)}§r\n`;
    text += `§7• §fEnder chests: §d${formatNumber(interactions.enderChest || 0)}§r\n`;
    text += `§7• §fCopper chests: §6${formatNumber(interactions.copperChest || 0)}§r\n`;
    text += `§7• §fBarrels: §e${formatNumber(interactions.barrel || 0)}§r\n`;
    text += `§7• §fShulker boxes: §d${formatNumber(interactions.shulkerBox || 0)}§r\n`;
    text += `§7• §fTrapped chests: §c${formatNumber(interactions.trappedChest || 0)}§r\n\n`;

    text += '§5- Tools broken -§r\n';
    text += `§7• §fTotal: §e${formatNumber(combat.tools?.totalBroken || 0)}§r\n`;
    const topTools = getTopEntries(combat.tools?.byType, 5);
    if (topTools.length > 0) {
      for (const { type, count } of topTools) {
        text += `§8    - §f${formatTypeId(type)}: §e${formatNumber(count)}§r\n`;
      }
    }
    text += '\n';

    text += '§9- Sleep -§r\n';
    text += `§7• §fTimes slept: §b${formatNumber(core.sleep?.total || 0)}§r\n`;
    text += `§7• §fTime since rest: §e${formatTime(core.time?.sinceRest || 0)}§r\n`;

    return text;
  }

  static renderMisc(stats) {
    const misc = stats['ds:stats_misc'] || {};
    const interactions = stats['ds:stats_interactions'] || {};

    let text = '§l§d- Miscellaneous statistics -§r\n\n';

    text += '§e- Emotes -§r\n';
    text += `§7• §fTotal used: §e${formatNumber(misc.emotes?.total || 0)}§r\n\n`;

    text += '§d- Interactions -§r\n';
    text += `§7• §fBells rung: §e${formatNumber(interactions.bell || 0)}§r\n`;
    text += `§7• §fCake slices eaten: §d${formatNumber(interactions.cake || 0)}§r\n`;
    text += `§7• §fVillagers talked to: §a${formatNumber(interactions.villager?.talked || 0)}§r\n`;
    text += `§7• §fAnimals bred: §a${formatNumber(interactions.animals?.bred || 0)}§r\n`;
    text += `§7• §fPlants potted: §a${formatNumber(interactions.flowerPot?.planted || 0)}§r\n`;
    text += `§7• §fNote blocks played: §b${formatNumber(interactions.noteblock?.played || 0)}§r\n`;
    text += `§7• §fMusic discs played: §d${formatNumber(interactions.musicDisc?.played || 0)}§r\n`;
    text += `§7• §fTarget blocks hit: §e${formatNumber(misc.targetBlock?.hit || 0)}§r\n`;
    text += `§7• §fBullseyes: §6${formatNumber(misc.targetBlock?.bullseye || 0)}§r\n\n`;

    text += '§b- Fishing -§r\n';
    text += `§7• §fFish caught: §b${formatNumber(misc.fishing?.caught || 0)}§r\n\n`;

    text += '§3- Cauldron usage -§r\n';
    text += `§7• §fTotal used: §b${formatNumber(interactions.cauldron?.used || 0)}§r\n`;
    text += `§7• §fFilled (water bucket): §b${formatNumber(interactions.cauldron?.filled || 0)}§r\n`;
    text += `§7• §fBottles filled: §b${formatNumber(interactions.cauldron?.bottleFilled || 0)}§r\n`;
    text += `§7• §fArmor cleaned: §e${formatNumber(interactions.cauldron?.armorCleaned || 0)}§r\n`;
    text += `§7• §fBanners cleaned: §e${formatNumber(interactions.cauldron?.bannerCleaned || 0)}§r\n`;
    text += `§7• §fShulkers cleaned: §d${formatNumber(interactions.cauldron?.shulkerCleaned || 0)}§r\n\n`;

    text += '§c- Raids -§r\n';
    text += `§7• §fTriggered: §c${formatNumber(misc.raids?.triggered || 0)}§r\n`;
    text += `§7• §fWon: §a${formatNumber(misc.raids?.won || 0)}§r\n`;

    return text;
  }

  static renderCombatDetails(stats) {
    const combat = stats['ds:stats_combat'] || {};
    let text = '';

    const allMobs = getAllEntries(combat.kills?.mobs?.byType);
    if (allMobs.length > 0) {
      text += '§l§c- All mob kills -§r\n';
      for (const { type, count } of allMobs) {
        text += `§7• §f${formatTypeId(type)}: §e${formatNumber(count)}§r\n`;
      }
      text += '\n';
    }

    const allPlayers = getAllEntries(combat.kills?.players?.byPlayer);
    if (allPlayers.length > 0) {
      text += '§l§c- All player kills -§r\n';
      for (const { type, count } of allPlayers) {
        text += `§7• §f${type}: §c${formatNumber(count)}§r\n`;
      }
      text += '\n';
    }

    const allCauses = getAllEntries(combat.deaths?.causes);
    if (allCauses.length > 0) {
      text += '§l§4- All death causes -§r\n';
      for (const { type, count } of allCauses) {
        const displayCause = DEATH_CAUSE_MAP[type] || formatTypeId(type);
        text += `§7• §f${displayCause}: §c${formatNumber(count)}§r\n`;
      }
      text += '\n';
    }

    if (!text) text = '§7No detailed combat data yet§r';
    return text;
  }

  static renderBuildingDetails(stats) {
    const blocks = stats['ds:stats_blocks'] || {};
    let text = '';

    const allMined = getAllEntries(blocks.mined?.byType);
    if (allMined.length > 0) {
      text += '§l§e- All blocks mined -§r\n';
      for (const { type, count } of allMined) {
        text += `§7• §f${formatTypeId(type)}: §e${formatNumber(count)}§r\n`;
      }
      text += '\n';
    }

    const allPlaced = getAllEntries(blocks.placed?.byType);
    if (allPlaced.length > 0) {
      text += '§l§a- All blocks placed -§r\n';
      for (const { type, count } of allPlaced) {
        text += `§7• §f${formatTypeId(type)}: §a${formatNumber(count)}§r\n`;
      }
    }

    if (!text) text = '§7No detailed building data yet§r';
    return text;
  }

  static renderSurvivalDetails(stats) {
    const items = stats['ds:stats_items'] || {};
    const misc = stats['ds:stats_misc'] || {};
    const combat = stats['ds:stats_combat'] || {};
    let text = '';

    const allFood = getAllEntries(items.food?.byType);
    if (allFood.length > 0) {
      text += '§l§a- All food consumed -§r\n';
      for (const { type, count } of allFood) {
        text += `§7• §f${formatTypeId(type)}: §a${formatNumber(count)}§r\n`;
      }
      text += '\n';
    }

    const allUsed = getAllEntries(items.used?.byType);
    if (allUsed.length > 0) {
      text += '§l§e- All items used -§r\n';
      for (const { type, count } of allUsed) {
        text += `§7• §f${formatTypeId(type)}: §e${formatNumber(count)}§r\n`;
      }
      text += '\n';
    }

    const allPicked = getAllEntries(items.picked?.byType);
    if (allPicked.length > 0) {
      text += '§l§b- All items picked up -§r\n';
      for (const { type, count } of allPicked) {
        text += `§7• §f${formatTypeId(type)}: §b${formatNumber(count)}§r\n`;
      }
      text += '\n';
    }

    const allDropped = getAllEntries(items.dropped?.byType);
    if (allDropped.length > 0) {
      text += '§l§c- All items dropped -§r\n';
      for (const { type, count } of allDropped) {
        text += `§7• §f${formatTypeId(type)}: §c${formatNumber(count)}§r\n`;
      }
      text += '\n';
    }

    const allEffects = getAllEntries(misc.effects?.byType);
    if (allEffects.length > 0) {
      text += '§l§5- All status effects -§r\n';
      for (const { type, count } of allEffects) {
        text += `§7• §f${formatTypeId(type)}: §d${formatNumber(count)}§r\n`;
      }
      text += '\n';
    }

    const allTools = getAllEntries(combat.tools?.byType);
    if (allTools.length > 0) {
      text += '§l§5- All tools broken -§r\n';
      for (const { type, count } of allTools) {
        text += `§7• §f${formatTypeId(type)}: §e${formatNumber(count)}§r\n`;
      }
    }

    if (!text) text = '§7No detailed survival data yet§r';
    return text;
  }
}
