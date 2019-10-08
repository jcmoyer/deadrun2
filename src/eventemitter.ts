type AnyFunction = (...args: any[]) => any;

export default class EventEmitter<Events extends {[K in keyof Events]: AnyFunction}> {
  private events: Map<keyof Events, AnyFunction[]>;

  constructor() {
    this.events = new Map();
  }

  protected emit<K extends keyof Events>(name: K, ...args: Parameters<Events[K]>) {
    for (const f of this.getOrCreate(name)) {
      f(...args);
    }
  }

  on<K extends keyof Events>(name: K, callback: Events[K]) {
    this.getOrCreate(name).push(callback);
  }

  removeListener<K extends keyof Events>(name: K, callback: Events[K]) {
    if (this.events.has(name)) {
      const list = this.events.get(name);
      const i = list.indexOf(callback);
      if (i >= 0) {
        list.splice(i, 1);
      }
    }
  }

  clearListeners<K extends keyof Events>(name: K) {
    this.events.set(name, []);
  }

  private getOrCreate<K extends keyof Events>(name: K): Events[K][] {
    if (this.events.has(name)) {
      return this.events.get(name) as Events[K][];
    } else {
      const array = [] as Events[K][];
      this.events.set(name, array);
      return array;
    }
  }
}
