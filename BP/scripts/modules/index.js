import { world, system } from '@minecraft/server';
import './glass_migration/main.js';
import './dimension_lock/main.js';
import './anti_dupe/main.js';
import './land_claims/main.js';
import './admin/main.js';
import { initializeStats } from './stats/main.js';
initializeStats();
import './saturation/main.js';
import './outlaw/main.js';
import './mounts/main.js';
import './bedrock_border/index.js';
import './vein_mining/main.js';
import './mobs/skeleton.js'
import './mobs/elder_guardian.js'
import './mobs/enderman.js'
import './mobs/mount_effects.js'