export class Lang {
  static translate(key, ...args) {
    let text = Dict[key];
    if (text === undefined)
      return key;
    if (args.length > 0) {
      // Replace %s placeholders sequentially
      let i = 0;
      text = text.replace(/%s/g, () => {
        const val = args[i++];
        return val !== undefined ? String(val) : '%s';
      });
    }
    return text;
  }
}
import { Dict } from "./en_US.js";