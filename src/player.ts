import { vec3 } from 'gl-matrix';
import { clamp } from './math';
import Weapon from './weapon';

export class Player {
  public prevPos: vec3;
  public pos: vec3;
  public prevEye: vec3;
  public prevLook: vec3;
  public prevYaw = 0;
  public prevPitch = 0;
  public yaw = 0;
  public pitch = 0;
  public dead = false;

  public weapons: Weapon[];
  private currentWeapon: number = -1;

  constructor() {
    this.prevPos = vec3.create();
    this.pos = vec3.create();
    this.weapons = [];
  }

  beginUpdate() {
    vec3.copy(this.prevPos, this.pos);
    this.prevYaw = this.yaw;
    this.prevPitch = this.pitch;
  }

  getFront() {
    const v = vec3.create();
    v[0] = Math.cos(this.pitch) * Math.cos(this.yaw);
    v[1] = Math.sin(this.pitch);
    v[2] = Math.cos(this.pitch) * Math.sin(this.yaw);
    return v;
  }

  private getFrontWithoutPitch() {
    const v = vec3.create();
    v[0] = Math.cos(this.yaw);
    v[1] = 0;
    v[2] = Math.sin(this.yaw);
    return v;
  }

  move(d: number) {
    const forceVec = this.getFrontWithoutPitch();
    vec3.normalize(forceVec, forceVec);
    vec3.mul(forceVec, forceVec, [d, d, d]);
    vec3.add(
      this.pos,
      this.pos,
      forceVec
    );
  }

  strafe(d: number) {
    const forward = this.getFrontWithoutPitch();
    const up = vec3.fromValues(0, 1, 0);
    const right = vec3.cross(vec3.create(), forward, up);
    vec3.normalize(right, right);
    vec3.mul(right, right, [d, d, d]);
    vec3.add(this.pos, this.pos, right);
  }

  addYaw(d: number) {
    this.yaw += d;
  }

  addPitch(d: number) {
    this.pitch += d;
    this.pitch = clamp(this.pitch, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01);
  }

  getWorldPos() {
    return this.pos;
  }

  getWorldX() {
    return this.pos[0];
  }

  getWorldZ() {
    return this.pos[2];
  }

  setWorldPos(x: number, z: number) {
    this.pos[0] = x;
    this.pos[2] = z;
  }

  resetYaw() {
    this.prevYaw = 0;
    this.yaw = 0;
  }

  resetPitch() {
    this.prevPitch = 0;
    this.pitch = 0;
  }

  get pickupRadius() {
    return 8;
  }

  get equippedWeapon(): Weapon | null {
    if (this.weapons.length === 0) {
      return null;
    } else {
      return this.weapons[this.currentWeapon];
    }
  }

  giveWeapon(w: Weapon) {
    this.weapons.push(w);
    if (this.currentWeapon === -1) {
      this.currentWeapon = 0;
    }
  }

  hasWeapon(id: number) {
    return this.weapons.length > id;
  }

  changeWeapon(id: number) {
    this.currentWeapon = id;
  }
}
