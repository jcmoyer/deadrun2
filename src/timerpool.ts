// based on hug.timerpool
import Timer from './timer';

export default class TimerPool {
  private timers: Timer[];

  constructor() {
    this.timers = [];
  }

  start(duration: number, callback) {
    const t = new Timer(duration, callback);
    this.timers.push(t);
    return t;
  }

  clear() {
    this.timers = []
  }

  size() {
    return this.timers.length;
  }

  update(dt: number) {
    for (let i = this.timers.length - 1; i >= 0; --i) {
      const t = this.timers[i];
      t.update(dt);

      if (t.status() == 'finished') {
        const f = t.getState();
        if (f) {
          f(t);
        }
      }

      const removable = t.status() !== 'active';

      if (removable) {
        this.timers.splice(i, 1);
      }
    }
  }
}
