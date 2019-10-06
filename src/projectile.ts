import { vec3 } from "gl-matrix";

export default class Projectile {
  prevWorldPos: vec3;
  worldPos: vec3;
  billboardWidth: number = 8;
  billboardHeight: number = 8;
  direction: vec3;
  speed: number;
  texture: WebGLTexture;
  damage: number = 10;

  velocity: vec3;

  constructor(pos: vec3, dir: vec3, speed: number) {
    this.prevWorldPos = vec3.clone(pos);
    this.worldPos = vec3.clone(pos);
    this.direction = dir;
    this.speed = speed;
    this.velocity = vec3.clone(this.direction);
    vec3.normalize(this.velocity, this.velocity);
    vec3.scale(this.velocity, this.velocity, this.speed);
  }

  update() {
    vec3.copy(this.prevWorldPos, this.worldPos);

    vec3.add(
      this.worldPos,
      this.worldPos,
      this.velocity
    );
  }
}
