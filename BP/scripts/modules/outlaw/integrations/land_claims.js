import { PermissionRegistry } from '../../land_claims/classes/permission_registry.js';

/**
 * Outlaw Integration with Land Claims
 * Registers the 'Allow Outlaws' permission toggle.
 */

PermissionRegistry.register('allowOutlaws', 'Allow outlaws', false);
