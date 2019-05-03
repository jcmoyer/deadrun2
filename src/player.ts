import { Camera } from './camera';
import { vec2, vec3, mat4 } from 'gl-matrix';

export class Player {
  public cam: Camera = new Camera();
  public pos: vec2;
  public prevEye: vec3;
  public prevLook: vec3;
  public yaw = 0;
  public dead = false;

  constructor() {
    this.pos = vec2.create();
    this.syncCamToMe();
    this.prevEye = vec3.clone(this.cam.getEye());
    this.prevLook = vec3.clone(this.cam.getLook());
  }

  beginUpdate() {
    this.prevEye = vec3.clone(this.cam.getEye());
    this.prevLook = vec3.clone(this.cam.getLook());
  }

  getInterpolatedCameraPosition(alpha: number): vec3 {
    const interp = vec3.create();
    vec3.lerp(interp, this.prevEye, this.cam.getEye(), alpha);
    return interp;
  }

  getInterpolatedCameraLook(alpha: number): vec3 {
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
    this.cam.move(d);
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

  private syncToCamPos() {
    this.pos[0] = this.cam.getEye()[0];
    this.pos[1] = this.cam.getEye()[2];
  }

  private syncCamToMe() {
    this.cam.setEye(this.pos[0], 16, this.pos[1]);
  }

  getWorldX() {
    return this.pos[0];
  }

  getWorldZ() {
    return this.pos[1];
  }

  setWorldPos(x: number, z: number) {
    this.pos[0] = x;
    this.pos[1] = z;
    this.syncCamToMe();
  }

  resetYaw() {
    this.yaw = 0;
    this.cam.yaw = this.yaw;
  }
}
