import WeaponInfo from './weaponinfo';
import Timer from './timer';
import EventEmitter from './eventemitter';

type WeaponState = 'idle' | 'action';

export default class Weapon extends EventEmitter {
  state: WeaponState;
  actionTime: number;

  actionTimer: Timer;
  activationTimer: Timer;

  public readonly info: WeaponInfo;

  constructor(info: WeaponInfo) {
    super();
    this.state = 'idle';
    this.info = info;
    this.actionTimer = new Timer(0);
    this.activationTimer = new Timer(0);
    this.actionTimer.on('expire', () => {
      this.state = 'idle';
    });
    this.activationTimer.on('expire', () => {
      this.emit('activate');
    });
  }

  update(dt: number) {
    this.actionTimer.update(dt);
    this.activationTimer.update(dt);
  }

  canPerformAction() {
    return this.state === 'idle';
  }

  doAction() {
    this.state = 'action';
    this.actionTimer.restart(this.info.animationLength);
    this.activationTimer.restart(this.info.activationTime);
  }

  get currentTextureName() {
    if (this.state === 'idle') {
      return this.info.idleTextureName;
    } else {
      return this.info.actionTextureName;
    }
  }
}
