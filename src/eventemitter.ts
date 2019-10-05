export default class EventEmitter {
  private events: Map<string, any[]>;

  constructor() {
    this.events = new Map();
  }

  emit(name: string, ...args: any[]) {
    for (const f of this.getOrCreate(name)) {
      f(...args);
    }
  }

  on(name: string, callback) {
    this.getOrCreate(name).push(callback);
  }

  removeListener(name: string, callback) {
    if (this.events.has(name)) {
      const list = this.events.get(name);
      const i = list.findIndex((value) => value == callback);
      if (i >= 0) {
        list.splice(i, 1);
      }
    }
  }

  clearListeners(name: string) {
    this.events.set(name, []);
  }

  private getOrCreate(name: string) {
    if (this.events.has(name)) {
      return this.events.get(name);
    } else {
      const array = [];
      this.events.set(name, array);
      return array;
    }
  }
}
