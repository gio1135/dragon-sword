import { PermissionRegistry } from './permission_registry.js';

/**
 * Settings Class
 */
export class Settings {
  constructor() {
    this.hourlyClaimBlockPayment = 128;
    this.startingClaimBlocks = 2304;
    this.claimMinimumWidth = 8;
    this.disallowedBlocks = [
      'minecraft:sculk_catalyst'
    ];
    this.maxClaimAmount = 3;
    this.claimShovelItemBehavior = 0; // LOCK_TO_INVENTORY
  }

  static fromJSON(data) {
    const s = new Settings();
    if (!data) return s;
    s.hourlyClaimBlockPayment = data.hourlyClaimBlockPayment ?? data.claimBlockHourlyPayment ?? data._hourlyClaimBlockPayment ?? 128;
    s.startingClaimBlocks = data.startingClaimBlocks ?? data._startingClaimBlocks ?? 2304;
    s.claimMinimumWidth = data.claimMinimumWidth ?? data._claimMinimumWidth ?? 8;
    s.disallowedBlocks = data.disallowedBlocks ?? data._disallowedBlocks ?? ['minecraft:sculk_catalyst'];
    s.maxClaimAmount = data.maxClaimAmount ?? data._maxClaimAmount ?? 3;
    s.claimShovelItemBehavior = data.claimShovelItemBehavior ?? data._claimShovelItemBehavior ?? 0;
    return s;
  }
}

export const ClaimBlocksBehavior = {
    LOCK_TO_INVENTORY: 0,
    DROP_AT_FEET: 1,
    DEFAULT: 0
};

/**
 * Permissions Class
 */

// Legacy export for backward compatibility relative to other files, 
// but Registry is now the source of truth.
export const PermissionTypes = {
    ENTER_CLAIM: 'enterClaim',
    BREAK_BLOCKS: 'breakBlocks',
    USE_ITEMS_ON_BLOCKS: 'useItemsOnBlocks',
    USE_DOORS: 'useDoors',
    USE_SWITCHES: 'useSwitches',
    OPEN_CONTAINERS: 'openContainers',
    USE_BEDS: 'useBeds',
    ALLOW_TNT: 'allowTnt',
    EDIT_SIGNS: 'editSigns',
    USE_FISHING_RODS: 'useFishingRods',
    USE_PROJECTILE_WEAPONS: 'useProjectileWeapons',
    USE_THROWABLE_WEAPONS: 'useThrowableWeapons',
    USE_SPEARS: 'useSpears',
    // Legacy / Custom
    ALLOW_OUTLAWS: 'allowOutlaws' 
};

export class Permissions {
    constructor() {
        this.permissions = {};
        // Initialize from Registry
        for (const { key, defaultValue } of PermissionRegistry.getAll()) {
            this.permissions[key] = defaultValue;
        }
    }

    get(type) {
        return this.permissions[type] ?? false;
    }

    set(type, value) {
        // Allow any key that is registered OR legacy exist? 
        // For security/cleanliness, we only save what's in registry + existing?
        // Let's just allow setting any key to support dynamic loading.
        this.permissions[type] = value;
    }

    static fromJSON(data) {
        const p = new Permissions();
        if (!data) return p;
        const source = data.permissions ?? data._permissions ?? {};
        
        // Load saved values
        for (const key of Object.keys(source)) {
            p.permissions[key] = source[key];
        }
        
        // Migration: useTNT -> allowTnt
        if (source['useTNT'] !== undefined && p.permissions['allowTnt'] === undefined) {
            p.permissions['allowTnt'] = source['useTNT'];
            delete p.permissions['useTNT']; // Cleanup
        }
        
        // Ensure new registry items are initialized if missing from JSON
        for (const { key, defaultValue } of PermissionRegistry.getAll()) {
            if (p.permissions[key] === undefined) {
                p.permissions[key] = defaultValue;
            }
        }
        return p;
    }
}

export class PlayerPermissions extends Permissions {
    constructor(id, name) {
        super();
        this.id = id;
        this.name = name;
    }

    static fromJSON(data) {
        if (!data) return null;
        const pp = new PlayerPermissions(data.id ?? data._id, data.name ?? data._name);
        // Load permissions
        const source = data.permissions ?? data._permissions ?? {};
        for (const key of Object.keys(pp.permissions)) {
            if (source[key] !== undefined) {
                pp.permissions[key] = source[key];
            }
        }
        return pp;
    }
}

/**
 * Claim Class
 */
export class Claim {
    constructor(name, start, end) {
        this.name = name;
        this.start = start;
        this.end = end;
        this.permissions = new Permissions();
        this.particlesEnabled = true;
        this.playerPermissionsList = [];
    }

    addPlayerPermissions(pp) {
        this.playerPermissionsList.push(pp);
    }
    
    removePlayerPermissions(playerId) {
        this.playerPermissionsList = this.playerPermissionsList.filter(p => p.id !== playerId);
    }

    getOwnerData(allPlayerData) {
        // Compare by value since object references might differ after reload
        return allPlayerData.find(pd => pd.claims.some(c => 
            c.name === this.name &&
            c.start.x === this.start.x &&
            c.start.z === this.start.z &&
            c.end.x === this.end.x &&
            c.end.z === this.end.z
        ));
    }

    hasPermission(permType, player, allPlayerData) {
        if (!player) return this.permissions.get(permType);

        // 1. Owner Check
        const ownerData = this.getOwnerData(allPlayerData);
        if (ownerData && ownerData.id === player.id) return true;

        // Global Only Check
        const permDef = PermissionRegistry.get(permType);
        if (permDef && permDef.globalOnly) {
             return this.permissions.get(permType);
        }

        // 2. Outlaw Check (Stage 4+)
        // TODO: Import Utils or pass context? 
        // For now, we assume simple permission check. 
        // If we need outlaw check, we should pass outlaw status or handle it in the Manager.
        
        // 3. Player Specific
        const playerPerms = this.playerPermissionsList.find(p => p.id === player.id);
        if (playerPerms) return playerPerms.get(permType);

        // 4. Global Player Specific (from Owner)
        if (ownerData) {
            const list = ownerData.playerPermissionsList || [];
            const globalPerms = list.find(p => p.id === player.id);
            if (globalPerms) return globalPerms.get(permType);
        }

        // 5. Public
        return this.permissions.get(permType);
    }

    isOverlap(start, end, margin = 0) {
        if (!this.start || !this.end) return false;

        // Boundaries (Integers)
        // [Left, Right) convention for blocks
        let r1Left = Math.min(this.start.x, this.end.x) - margin;
        let r1Right = Math.max(this.start.x, this.end.x) + 1 + margin;
        
        let r1Top = Math.max(this.start.z, this.end.z) + 1 + margin;
        let r1Bottom = Math.min(this.start.z, this.end.z) - margin;

        let r2Left, r2Right, r2Top, r2Bottom;
        
        if (!end) {
            // Point Check (e.g. Block or Player)
            // Treat as 1x1 unit to ensure boundary overlap works for integers
            r2Left = start.x;
            r2Right = start.x + 1; // Width 1
            r2Top = start.z + 1;   // Height 1
            r2Bottom = start.z;
        } else {
            // Area Check (e.g. Claim overlapping Claim)
            r2Left = Math.min(start.x, end.x);
            r2Right = Math.max(start.x, end.x) + 1;
            r2Top = Math.max(start.z, end.z) + 1;
            r2Bottom = Math.min(start.z, end.z);
        }

        // Intersection:
        // No Overlap if R1 is totally right of R2, left of R2, above R2, below R2
        // Using strict > / < logic since we adjusted width to +1
        // If r1Left (0) >= r2Right (1) -> False (Overlap possible)
        // If r1Right (1) <= r2Left (0) -> False
        
        return !(r1Left >= r2Right || r1Right <= r2Left || r1Bottom >= r2Top || r1Top <= r2Bottom);
    }

    static fromJSON(data) {
        if (!data) return null;
        // Fix for "Undefined" name check in original code
        if (data._name === 'Undefined' || data.name === 'Undefined') {
             // console.warn("Invalid claim data (name Undefined):", JSON.stringify(data));
             return null;
        }

        const c = new Claim(
            data.name ?? data._name,
            data.start ?? data._start,
            data.end ?? data._end
        );
        c.particlesEnabled = data.particlesEnabled ?? data._particlesEnabled ?? true;
        c.permissions = Permissions.fromJSON(data.permissions ?? data._permissions);
        
        const ppl = data.playerPermissionsList ?? data._playerPermissionsList ?? [];
        c.playerPermissionsList = ppl.map(p => PlayerPermissions.fromJSON(p)).filter(p => p);
        
        return c;
    }
}

/**
 * Player Data Class
 */
export class PlayerData {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.claims = [];
        this.playerPermissionsList = [];
        this.claimBlocks = { amount: 200, behavior: 0 }; // Simplified
        this.lastSeen = Date.now();
        this.outlawStatus = { stage: 0, timeRemaining: 0 };
        // UI State
        this.viewingClaim = false;
        this.firstPoint = null;
        this.resizingClaimName = '';
        this.lastClaimBlockPayment = Date.now();
        this.playtimeTicks = 0;
    }

    removeClaim(claim) {
        this.claims = this.claims.filter(c => c !== claim);
    }

    static fromJSON(data) {
        if (!data) return null;
        const pd = new PlayerData(data.id ?? data._id, data.name ?? data._name);
        
        // Restore Claims
        const rawClaims = data.claims ?? data._claims ?? [];
        pd.claims = rawClaims.map(c => Claim.fromJSON(c)).filter(c => c);

        // Restore Perms
        const rawPerms = data.playerPermissionsList ?? data._playerPermissionsList ?? [];
        pd.playerPermissionsList = rawPerms.map(p => PlayerPermissions.fromJSON(p)).filter(p => p);

        // Restore Blocks
        const rawBlocks = data.claimBlocks ?? data._claimBlocks ?? {};
        pd.claimBlocks = {
            amount: rawBlocks.amount ?? rawBlocks._amount ?? 200,
            behavior: rawBlocks.behavior ?? rawBlocks._behavior ?? 0
        };

        if (data.outlawStatus ?? data._outlawStatus) {
            pd.outlawStatus = data.outlawStatus ?? data._outlawStatus;
        }

        pd.lastSeen = data.lastSeen ?? data._lastSeen ?? 0;
        pd.lastClaimBlockPayment = data.lastClaimBlockPayment ?? data._lastClaimBlockPayment ?? Date.now();
        pd.playtimeTicks = data.playtimeTicks ?? data._playtimeTicks ?? 0;

        return pd;
    }
}
