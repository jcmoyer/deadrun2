import { vec3, mat4 } from 'gl-matrix';

export class Camera {
  private up: vec3;
  private eye: vec3;
  private forward: vec3;
  private right: vec3;

  // contains view matrix for shader
  private view: mat4;

  public yaw = 0;
  public pitch = 0;

  constructor() {
    this.up = vec3.set(
      vec3.create(),
      0, 1, 0
    );
    this.eye = vec3.set(
      vec3.create(),
      0, 0, 0
    );
    this.forward = vec3.set(
      vec3.create(),
      0, 0, -1
    );
  }

  getEye() {
    return this.eye;
  }

  getFront() {
    const v = vec3.create();
    v[0] = Math.cos(this.pitch) * Math.cos(this.yaw);
    v[1] = Math.sin(this.pitch);
    v[2] = Math.cos(this.pitch) * Math.sin(this.yaw);
    return v;
  }

  getFrontWithoutPitch() {
    const v = vec3.create();
    v[0] = 1 * Math.cos(this.yaw);
    v[1] = 0;
    v[2] = 1 * Math.sin(this.yaw);
    return v;
  }

  getLook() {
    vec3.normalize(this.forward, this.getFront());

    const look = vec3.clone(this.eye);
    vec3.add(look, look, this.forward);
    return look;
  }

  moveXZ(d: number) {
    const forceVec = this.getFrontWithoutPitch();
    vec3.normalize(forceVec, forceVec);
    vec3.mul(forceVec, forceVec, [d, d, d]);
    vec3.add(
      this.eye,
      this.eye,
      forceVec
    );
  }

  move(d: number) {
    const forceVec = vec3.clone(this.forward);
    vec3.normalize(forceVec, forceVec);
    vec3.mul(forceVec, forceVec, [d, d, d]);
    vec3.add(
      this.eye,
      this.eye,
      forceVec
    );
  }

  strafe(d: number) {
    this.right = vec3.cross(
      vec3.create(),
      this.forward,
      this.up
    );
    vec3.normalize(this.right, this.right);

    const forceVec = vec3.clone(this.right);
    vec3.mul(forceVec, forceVec, [d, d, d]);
    vec3.add(
      this.eye,
      this.eye,
      forceVec
    );
  }

  setEye(x: number, y: number, z: number) {
    vec3.set(
      this.eye, x, y, z
    );
  }

  getUp() {
    return this.up;
  }

  rotateY(r: number) {
    this.yaw += r;
    vec3.normalize(this.forward, this.getFront());
  }

  updateViewMatrix() {
    this.view = mat4.lookAt(
      mat4.create(),
      this.eye,
      this.getLook(),
      this.up
    );
  }

  getViewMatrix(): mat4 {
    this.updateViewMatrix();
    return this.view;
  }
}
