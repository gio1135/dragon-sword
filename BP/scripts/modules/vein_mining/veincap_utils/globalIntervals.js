var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { system } from "@minecraft/server";
class GlobalIntervals {
  
  static initialize() {
    let tick = 0;
    system.runInterval(() => {
      tick++;
      if (tick > 999999) tick = 0;
      for (const stringInterval in this.intervals) {
        const intervalNum = JSON.parse(stringInterval);
        for (let i = 0; i < this.intervals[stringInterval].length; i++) {
          const interval = this.intervals[stringInterval][i];
          if (tick - (i - Math.floor(i / intervalNum) * intervalNum) == Math.floor(tick / intervalNum) * intervalNum)
            interval.callback({ tick, entry: i });
        }
      }
    });
  }
  
  static clear(id) {
    for (const stringInterval in this.intervals) {
      const intervals = this.intervals[stringInterval];
      for (let i = 0; i < intervals.length; i++) {
        const interval = intervals[i];
        if (interval.id !== id) continue;
        this.intervals[stringInterval].splice(i, 1);
        return;
      }
    }
  }
  
  static set(callback, interval) {
    var _a;
    const floored = Math.floor(interval);
    let randomNum = void 0;
    while (randomNum === void 0) {
      const random = Math.floor(Math.random() * 999999999);
      if ((_a = this.intervals[`${floored}`]) == null ? void 0 : _a.find((f) => f.id === random)) continue;
      randomNum = random;
    }
    if (!this.intervals[`${floored}`]) this.intervals[`${floored}`] = [];
    this.intervals[`${floored}`].push({ id: randomNum, callback });
    return randomNum;
  }
}
__publicField(GlobalIntervals, "intervals", {});
export {
  GlobalIntervals
};
