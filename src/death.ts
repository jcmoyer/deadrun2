import { vec3, mat4 } from 'gl-matrix';
import { Player } from './player';
import { Tilemap } from './tilemap';
import { toMapX, toMapY } from './level';
import GridWalker from './gridwalker';
import Timer from './timer';

const gridWalker = new GridWalker();

export class Death {
  public prevWorldPos: vec3;
  public worldPos: vec3;
  public billboardWidth: number = 14;
  public billboardHeight: number = 14;
  public texture: WebGLTexture;
  private velocity: vec3;
  private awake: boolean = false;
  private wakeCallback: () => void;
  public billboardFlash: boolean;
  private flashTimer: Timer;

  private health: number = 50;
  public alive: boolean = true;

  constructor() {
    this.worldPos = vec3.create();
    this.velocity = vec3.create();
    this.prevWorldPos = vec3.create();
    this.flashTimer = new Timer(0);
    this.flashTimer.on('expire', () => {
      this.billboardFlash = false;
    });
  }

  beginUpdate() {
    vec3.copy(this.prevWorldPos, this.worldPos);
  }

  update(player: Player, tilemap: Tilemap, dt: number) {
    if (!this.alive) return;

    this.flashTimer.update(dt);

    this.beginUpdate();

    if (this.awake) {
      this.chasePlayer(player);
    } else {
      if (this.canSeePlayer(player, tilemap)) {
        this.wake();
      }
    }

    this.worldPos[1] = 16 + Math.sin(Date.now() / 1000) * 2;
  }

  private chasePlayer(player: Player) {
    vec3.set(
      this.velocity,
      player.getWorldX() - this.getWorldX(),
      0,
      player.getWorldZ() - this.getWorldZ()
    );
    vec3.normalize(this.velocity, this.velocity);
    vec3.scale(this.velocity, this.velocity, 0.2);
    vec3.add(this.worldPos, this.worldPos, this.velocity);
  }

  private canSeePlayer(player: Player, tilemap: Tilemap) {
    const deathMapX = toMapX(this.getWorldX());
    const deathMapY = toMapY(this.getWorldZ());
    const playerMapX = toMapX(player.getWorldX());
    const playerMapY = toMapY(player.getWorldZ());

    gridWalker.setStartPoint(deathMapX, deathMapY);
    gridWalker.setEndPoint(playerMapX, playerMapY);
    gridWalker.begin();

    while (!gridWalker.isFinished() && gridWalker.getSteps() < 6) {
      gridWalker.step();
      if (tilemap.isSolid(gridWalker.getX(), gridWalker.getY())) {
        return false;
      } else if (gridWalker.getX() === playerMapX && gridWalker.getY() === playerMapY) {
        return true;
      }
    }

    return false;
  }

  setWorldPos(x: number, z: number) {
    this.worldPos[0] = x;
    this.worldPos[1] = 16;
    this.worldPos[2] = z;
  }

  getWorldX() {
    return this.worldPos[0];
  }

  getWorldZ() {
    return this.worldPos[2];
  }

  wake() {
    this.awake = true;
    if (this.wakeCallback) {
      this.wakeCallback();
    }
  }

  onWake(f: typeof Death.prototype.wakeCallback) {
    this.wakeCallback = f;
  }

  kill() {
    this.alive = false;
  }

  hurt(amount: number) {
    this.health -= amount;
    if (this.health <= 0) {
      this.kill();
    }

    this.billboardFlash = true;
    this.flashTimer.restart(50);
  }
}
