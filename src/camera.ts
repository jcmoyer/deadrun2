import * as glm from 'gl-matrix';

export class Camera {
  private up: glm.vec3;
  private eye: glm.vec3;
  private forward: glm.vec3;
  private right: glm.vec3;

  // contains view matrix for shader
  private view: glm.mat4;

  public yaw = 0;
  private pitch = 0;

  constructor() {
    this.up = glm.vec3.set(
      glm.vec3.create(),
      0, 1, 0
    );
    this.eye = glm.vec3.set(
      glm.vec3.create(),
      0, 0, 0
    );
    this.forward = glm.vec3.set(
      glm.vec3.create(),
      0, 0, -1
    );
  }

  getEye() {
    return this.eye;
  }

  getFront() {
    const v = glm.vec3.create();
    v[0] = Math.cos(this.pitch) * Math.cos(this.yaw);
    v[1] = Math.sin(this.pitch);
    v[2] = Math.cos(this.pitch) * Math.sin(this.yaw);
    return v;
  }

  getLook() {
    glm.vec3.normalize(this.forward, this.getFront());

    const look = glm.vec3.clone(this.eye);
    glm.vec3.add(look, look, this.forward);
    return look;
  }

  move(d: number) {
    const forceVec = glm.vec3.clone(this.forward);

    glm.vec3.mul(forceVec, forceVec, [d, d, d]);
    glm.vec3.add(
      this.eye,
      this.eye,
      forceVec
    );
  }

  strafe(d: number) {
    this.right = glm.vec3.cross(
      glm.vec3.create(),
      this.forward,
      this.up
    );

    const forceVec = glm.vec3.clone(this.right);
    glm.vec3.mul(forceVec, forceVec, [d, d, d]);
    glm.vec3.add(
      this.eye,
      this.eye,
      forceVec
    );
  }

  setEye(x, y, z) {
    glm.vec3.set(
      this.eye, x, y, z
    );
  }

  getUp() {
    return this.up;
  }

  rotateY(r) {
    this.yaw += r;
    glm.vec3.normalize(this.forward, this.getFront());
  }

  updateViewMatrix() {
    this.view = glm.mat4.lookAt(
      glm.mat4.create(),
      this.eye,
      this.getLook(),
      this.up
    );
  }

  getViewMatrix(): glm.mat4 {
    this.updateViewMatrix();
    return this.view;
  }
}
