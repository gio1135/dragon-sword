import { world } from '@minecraft/server';
import { OUTLINE_STYLES } from './registry.js';
import { highlightManager } from './highlight.js';

export function CheckGlobalHighlights() {
  const activeEntityIds = new Set();
  for (const session of highlightManager.sessions.values()) {
    if (!session.lightsMap) continue;
    for (const entity of session.lightsMap.values()) {
      if (entity?.isValid) {
        activeEntityIds.add(entity.id);
      }
    }
  }

  const dims = ['overworld', 'nether', 'the_end'];
  for (const dimId of dims) {
    try {
      const dim = world.getDimension(dimId);
      for (const style of OUTLINE_STYLES) {
        const entities = dim.getEntities({ type: style.entity });
        for (const entity of entities) {
          if (!activeEntityIds.has(entity.id)) {
            try {
              entity.remove();
            } catch (e) {}
          }
        }
      }
    } catch (e) {}
  }
}