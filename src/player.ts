import {Camera} from './camera';
import * as glm from 'gl-matrix';

export class Player {
  public cam: Camera = new Camera();
  public pos: glm.vec2;
  public prevEye: glm.vec3;
  public prevLook: glm.vec3;
  public yaw = 0;

  constructor() {
    this.pos = glm.vec2.create();
    this.syncCamToMe();
    this.prevEye = glm.vec3.clone(this.cam.getEye());
    this.prevLook = glm.vec3.clone(this.cam.getLook());
  }

  beginUpdate() {
    this.prevEye = glm.vec3.clone(this.cam.getEye());
    this.prevLook = glm.vec3.clone(this.cam.getLook());
  }

  getInterpolatedCameraPosition(alpha: number): glm.vec3 {
    const interp = glm.vec3.create();
    glm.vec3.lerp(interp, this.prevEye, this.cam.getEye(), alpha);
    return interp;
  }

  getInterpolatedCameraLook(alpha: number): glm.vec3 {
    const interp = glm.vec3.create();
    glm.vec3.lerp(interp, this.prevLook, this.cam.getLook(), alpha);
    return interp;
  }

  getInterpolatedViewMatrix(alpha: number): glm.mat4 {
    const view = glm.mat4.create();
    return glm.mat4.lookAt(
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

  setWorldPos(x, z) {
    this.pos[0] = x;
    this.pos[1] = z;
    this.syncCamToMe();
  }

  resetYaw() {
    this.yaw = 0;
    this.cam.yaw = this.yaw;
  }
}
