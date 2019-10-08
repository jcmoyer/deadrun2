// based on hug.timer
import EventEmitter from './eventemitter';

export type TimerStatus = 'cancelled' | 'active' | 'finished';

interface TimerEvents {
  expire(): any;
}

export default class Timer extends EventEmitter<TimerEvents> {
  private duration: number;
  private remaining: number;
  private state: any;
  private cancelled: boolean;

  constructor(duration: number, state?: any) {
    super();
    this.duration = duration;
    this.remaining = duration;
    this.state = state;
    this.cancelled = false;
  }

  getState() {
    return this.state;
  }

  getRemaining() {
    return this.remaining;
  }

  getDuration() {
    return this.duration;
  }

  evaluate(f: (percentComplete: number) => any) {
    return f(1 - this.remaining / this.duration);
  }

  status(): TimerStatus {
    if (this.cancelled) {
      return 'cancelled';
    } else if (this.remaining > 0) {
      return 'active';
    } else if (this.remaining <= 0) {
      return 'finished';
    }
  }

  update(dt: number) {
    const ostat = this.status();
    this.remaining = Math.max(this.remaining - dt, 0);
    const nstat = this.status();
    if (nstat !== ostat && nstat === 'finished') {
      this.emit('expire');
    }
  }

  restart(duration: number) {
    this.cancelled = false;
    this.duration = duration;
    this.remaining = duration;
  }

  cancel() {
    this.cancelled = true;
  }
}
