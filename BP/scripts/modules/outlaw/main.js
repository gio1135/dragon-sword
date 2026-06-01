/**
 * Outlaw Module Entry Point
 */

// Register Integration with Land Claims
import './integrations/land_claims.js';

// Import core outlaw logic
import { initOutlawSystem } from './system.js';

// Initialize
initOutlawSystem();
