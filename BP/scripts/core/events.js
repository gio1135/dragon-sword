
export class EventBus {
constructor() {
 this.listeners = new Map();
}

on(eventName, callback) {
 if (!this.listeners.has(eventName)) {
 this.listeners.set(eventName, []);
 }
 this.listeners.get(eventName).push(callback);
}

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

off(eventName, callback) {
 if (this.listeners.has(eventName)) {
 const filtered = this.listeners.get(eventName).filter(cb => cb !== callback);
 this.listeners.set(eventName, filtered);
 }
}
}