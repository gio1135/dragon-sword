import { world } from "@minecraft/server";
import { OUTLINE_STYLES } from "./registry.js";

export function CheckGlobalHighlights() {
  const dims = ["overworld", "nether", "the_end"];
  for (const dimId of dims) {
    try {
      const dim = world.getDimension(dimId);
      for (const style of OUTLINE_STYLES) {
        const entities = dim.getEntities({ type: style.entity });
        for (const entity of entities) {
          let hasOwner = false;
          for (const player of world.getAllPlayers()) {
            if (player.dimension.id === dim.id) {
              const dist = Math.sqrt(
                Math.pow(entity.location.x - player.location.x, 2) +
                Math.pow(entity.location.y - player.location.y, 2) +
                Math.pow(entity.location.z - player.location.z, 2)
              );
              if (dist < 30) { hasOwner = true; break; }
            }
          }
          if (!hasOwner) {
            try { entity.remove(); } catch(e) {}
          }
        }
      }
    } catch (e) {}
  }
}
