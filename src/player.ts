import { Camera } from './camera';
import { vec2, vec3, mat4 } from 'gl-matrix';
import { clamp } from './math';
import Weapon from './weapon';

export class Player {
  public cam: Camera = new Camera();
  private pos: vec3;
  public prevEye: vec3;
  public prevLook: vec3;
  public yaw = 0;
  public pitch = 0;
  public dead = false;

  public weapons: Weapon[];
  private currentWeapon: number = -1;

  constructor() {
    this.pos = vec3.create();
    this.syncCamToMe();
    this.prevEye = vec3.clone(this.cam.getEye());
    this.prevLook = vec3.clone(this.cam.getLook());
    this.weapons = [];
  }

  beginUpdate() {
    vec3.copy(this.prevEye, this.cam.getEye());
    vec3.copy(this.prevLook, this.cam.getLook());
  }

  private getInterpolatedCameraPosition(alpha: number): vec3 {
    const interp = vec3.create();
    vec3.lerp(interp, this.prevEye, this.cam.getEye(), alpha);
    return interp;
  }

  private getInterpolatedCameraLook(alpha: number): vec3 {
    const interp = vec3.create();
    vec3.lerp(interp, this.prevLook, this.cam.getLook(), alpha);
    return interp;
  }

  getInterpolatedViewMatrix(alpha: number): mat4 {
    const view = mat4.create();
    return mat4.lookAt(
      view,
      this.getInterpolatedCameraPosition(alpha),
      this.getInterpolatedCameraLook(alpha),
      this.cam.getUp()
    );
  }

  move(d: number) {
    this.cam.moveXZ(d);
    this.syncToCamPos();
  }

  strafe(d: number) {
    this.cam.strafe(d);
    this.syncToCamPos();
  }

  addYaw(d: number) {
    this.yaw += d;
    this.cam.yaw = this.yaw;
  }

  addPitch(d: number) {
    this.pitch += d;
    this.pitch = clamp(this.pitch, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01);
    this.cam.pitch = this.pitch;
  }

  private syncToCamPos() {
    this.pos[0] = this.cam.getEye()[0];
    this.pos[1] = this.cam.getEye()[1];
    this.pos[2] = this.cam.getEye()[2];
  }

  private syncCamToMe() {
    this.cam.setEye(this.pos[0], 16, this.pos[2]);
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
    this.syncCamToMe();
  }

  resetYaw() {
    this.yaw = 0;
    this.cam.yaw = this.yaw;
  }

  resetPitch() {
    this.pitch = 0;
    this.cam.pitch = this.pitch;
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
