import { world, system, GameMode } from "@minecraft/server";
import { DS } from "./ds.js";

/**
 * Admin Interactions
 * Handles special operator interactions.
 * 
 * - Item: Compass
 * - Sneak + Use: Toggle Gamemode (Creative <-> Survival)
 * - Stand + Use: Open Admin Menu (Emits 'ds:admin_open')
 */

const ADMIN_TOOL = "minecraft:compass";

function handleAdminTool(player, itemStack, cancelCallback) {
  // 1. Check Tool
  if (!itemStack || itemStack.typeId !== ADMIN_TOOL) return;
  
  // Prevent menu while gliding (conflicts with elytra boost)
  if (player.isGliding) return;

  // 2. Check Permissions (Op only)
  // Level 1 = Operator (can use commands)
  // Level 2 = Admin
  // For this server context, Level 1 seems to be the Op level the user has.
  if (player.commandPermissionLevel < 1) return;

  // Prevent default behavior
  if (cancelCallback) cancelCallback();

  system.run(() => {
    // 3. Logic
    if (player.isSneaking) {
      const current = player.getGameMode();
      // Try to match current gamemode
      const next = current === GameMode.Creative ? GameMode.Survival : GameMode.Creative;
      
      player.setGameMode(next);
      // Silent / No Feedback as requested
    } else {
      // Open Admin Menu
      DS.events.emit("ds:admin_open", { player });
    }
  });
}

// Handle Item Use (Air or Block)
world.beforeEvents.itemUse.subscribe((ev) => {
    const player = ev.source;
    
    // Check if player is NOT looking at a block (Air Only)
    // getBlockFromViewDirection returns a BlockRaycastHit or undefined
    const blockHit = player.getBlockFromViewDirection({ maxDistance: 5 });
    
    // If we hit a block, do NOT trigger the admin menu.
    // This allows default interactions (Lodestones, Chests, etc.) to proceed clearly.
    if (blockHit) return;

    handleAdminTool(player, ev.itemStack, () => { ev.cancel = true; });
});
// Removed playerInteractWithBlock subscriber to prevent conflicts with blocks entirely.
