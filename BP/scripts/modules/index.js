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

import './bedrock_border/index.js';
import './vein_mining/main.js';
import './mobs/enderman.js';
import './dungeons/main.js';
import './tpa/lodestone.js';