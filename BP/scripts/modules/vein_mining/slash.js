import { EquipmentSlot, EntityDamageCause, system } from "@minecraft/server";
const SWORD_BASE_DAMAGE = {
    "minecraft:wooden_sword": 4,
    "minecraft:golden_sword": 4,
    "minecraft:stone_sword": 5,
    "minecraft:iron_sword": 6,
    "minecraft:diamond_sword": 7,
    "minecraft:netherite_sword": 8
};

const PLAYER_DRAW_DATA = new Map();

function getSlashTargets(player) {
    const viewDir = player.getViewDirection();
    const pLoc = player.location;
    const centerPos = {
        x: pLoc.x + viewDir.x * 2.5,
        y: pLoc.y,
        z: pLoc.z + viewDir.z * 2.5
    };

    return player.dimension.getEntities({
        location: centerPos,
        maxDistance: 3,
        families: ["mob"],
        excludeTypes: ["minecraft:player"]
    }).filter(e => Math.abs(e.location.y - pLoc.y) < 2);
}


export function HandleSlashHighlight(player) {
    if (!player.isSneaking || !settings?.passiveVeinFlow?.includes("slash")) {
        PLAYER_DRAW_DATA.delete(player.id);
        return;
    }

    
    if (!true) {
        PLAYER_DRAW_DATA.delete(player.id);
        return;
    }

    const tool = player.getComponent("minecraft:equippable")?.getEquipment(EquipmentSlot.Mainhand);
    if (!tool?.typeId.includes("sword")) {
        PLAYER_DRAW_DATA.delete(player.id);
        return;
    }

    let data = PLAYER_DRAW_DATA.get(player.id);
    if (!data) {
        data = { angle: 0, lastTick: 0 };
        PLAYER_DRAW_DATA.set(player.id, data);
    }

    const currentTick = system.currentTick;

    
    if (currentTick - data.lastTick >= 5) {
        const viewDir = player.getViewDirection();
        const centerPos = {
            x: player.location.x + viewDir.x * 2.5,
            y: player.location.y + 0.2,
            z: player.location.z + viewDir.z * 2.5
        };

        const x = centerPos.x + 3 * Math.cos(data.angle);
        const z = centerPos.z + 3 * Math.sin(data.angle);

        
        for (let i = 0; i < 3; i++) {
            player.dimension.spawnParticle("minecraft:basic_flame_particle", { x, y: centerPos.y, z });
        }

        data.angle += Math.PI / 8; 
        data.lastTick = currentTick;

        if (data.angle >= Math.PI * 2) data.angle = 0;
    }
}


export function ExecuteSlash(player, targetEntity) {
    if (!player.isSneaking || !settings?.passiveVeinFlow?.includes("slash")) return;

    const sword = player.getComponent("minecraft:equippable")?.getEquipment(EquipmentSlot.Mainhand);
    if (!sword?.typeId.includes("sword")) return;

    const baseDamage = SWORD_BASE_DAMAGE[sword.typeId] || 4;
    const slashDamage = baseDamage / 2; 

    const targets = getSlashTargets(player);

    for (const mob of targets) {
        if (mob.id === targetEntity.id) continue;

        mob.applyDamage(slashDamage, {
            damagingEntity: player,
            cause: EntityDamageCause.entityAttack
        });

        
        player.dimension.spawnParticle("minecraft:sonic_explosion", {
            x: mob.location.x, y: mob.location.y + 1, z: mob.location.z
        });
    }
}