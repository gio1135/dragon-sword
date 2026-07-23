
import { DS } from '../../core/ds.js';

export class BorderEventEmitter {
 constructor() {
  this.listeners = new Map();
 }

 on(event, handler) {
  if (!this.listeners.has(event)) {
   this.listeners.set(event, []);
  }
  this.listeners.get(event).push(handler);
 }

 off(event, handler) {
  if (!this.listeners.has(event)) return;

  const handlers = this.listeners.get(event);
  const index = handlers.indexOf(handler);
  if (index > -1) {
   handlers.splice(index, 1);
  }
 }

 emit(event, data) {
  if (!this.listeners.has(event)) return;

  const handlers = this.listeners.get(event);
  for (const handler of handlers) {
   try {
    handler(data);
   } catch (error) {
    DS.log(`Error in event handler for ${event}: ${error}`);
   }
  }
 }

 once(event, handler) {
  const onceHandler = (data) => {
   handler(data);
   this.off(event, onceHandler);
  };
  this.on(event, onceHandler);
 }

 removeAllListeners(event) {
  if (event) {
   this.listeners.delete(event);
  } else {
   this.listeners.clear();
  }
 }
}

export const BorderEvents = {
 PLAYER_CROSS_BORDER: 'playerCrossBorder',
 PLAYER_NEAR_BORDER: 'playerNearBorder',
 PLAYER_TELEPORTED: 'playerTeleported',
 PLAYER_KNOCKED_BACK: 'playerKnockedBack',
 CONFIG_CHANGED: 'configChanged',
 BORDER_ENABLED: 'borderEnabled',
 BORDER_DISABLED: 'borderDisabled',
 PLAYER_CLEANUP: 'playerCleanup',
};