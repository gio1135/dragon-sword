/**
 * Simple Event Emitter for cross-feature communication.
 */
export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Register an event listener.
   * @param {string} eventName 
   * @param {Function} callback 
   */
  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName).push(callback);
  }

  /**
   * Emit an event.
   * @param {string} eventName 
   * @param {any} data 
   */
  emit(eventName, data) {
    if (this.listeners.has(eventName)) {
      this.listeners.get(eventName).forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.warn(`[DS Event Error] ${eventName}: ${e}`);
        }
      });
    }
  }

  /**
   * Remove an event listener.
   * @param {string} eventName 
   * @param {Function} callback 
   */
  off(eventName, callback) {
    if (this.listeners.has(eventName)) {
      const filtered = this.listeners.get(eventName).filter(cb => cb !== callback);
      this.listeners.set(eventName, filtered);
    }
  }
}
