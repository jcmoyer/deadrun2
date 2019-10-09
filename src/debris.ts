import { vec3, mat4 } from 'gl-matrix';
import { BillboardRenderable } from './billboardrenderer';
import { TextureProvider } from './glutil';

export class DebrisInfo {
  textureName: string;
  velX: Function;
  velY: Function;
  velZ: Function;
  ignoresGravity: boolean;
  size: number;
  velocityModifier?: (velocity: vec3) => void;
  lifetime: number;
}

export const DEBRIS_BONE = new DebrisInfo();
DEBRIS_BONE.textureName = 'bone';
DEBRIS_BONE.velX = () => Math.cos(Math.random() * 2 * Math.PI) * 5;
DEBRIS_BONE.velY = () => Math.random() * 3;
DEBRIS_BONE.velZ = () => Math.sin(Math.random() * 2 * Math.PI) * 5;
DEBRIS_BONE.ignoresGravity = false;
DEBRIS_BONE.size = 4;
DEBRIS_BONE.lifetime = 10000;

export const DEBRIS_EMBER = new DebrisInfo();
DEBRIS_EMBER.textureName = 'smoke';
DEBRIS_EMBER.velX = () => Math.cos(Math.random() * 2 * Math.PI) * 8;
DEBRIS_EMBER.velY = () => Math.random();
DEBRIS_EMBER.velZ = () => Math.sin(Math.random() * 2 * Math.PI) * 8;
DEBRIS_EMBER.ignoresGravity = true;
DEBRIS_EMBER.size = 16;
DEBRIS_EMBER.velocityModifier = (velocity: vec3) => {
  if (velocity[1] < 0) {
    velocity[1] = 0;
  }
  velocity[0] *= 0.8;
  velocity[1] += 0.005;
  velocity[2] *= 0.8;
};
DEBRIS_EMBER.lifetime = 5000;

class Debris implements BillboardRenderable {
  prevWorldPos: vec3;
  worldPos: vec3;
  billboardWidth: number;
  billboardHeight: number;
  texture: WebGLTexture;
  billboardFlash?: boolean;
  billboardAlpha: number;

  velocity: vec3;
  info: DebrisInfo;

  timeAlive: number = 0;

  bounceCount = 0;
  billboardRotation: number = Math.random() * 2 * Math.PI;
  angularVelocity: number;

  constructor(info: DebrisInfo) {
    this.info = info;
    this.billboardWidth = info.size;
    this.billboardHeight = info.size;
    this.angularVelocity = Math.random() * 2 * Math.PI / 30;
  }

  update(gravity: vec3, dt: number) {
    vec3.copy(this.prevWorldPos, this.worldPos);
    vec3.add(this.worldPos, this.worldPos, this.velocity);
    if (!this.info.ignoresGravity) {
      vec3.add(this.velocity, this.velocity, gravity);
    }
    this.timeAlive += dt;
    this.billboardAlpha = (this.info.lifetime - this.timeAlive) / this.info.lifetime;
    
    // reflect and dampen
    const floorY = this.info.size / 2;
    if (this.worldPos[1] <= floorY) {
      this.velocity[0] *= 0.2;
      if (this.bounceCount < 3) {
        this.velocity[1] = -this.velocity[1] * 0.3;
        this.angularVelocity *= -0.5;
        ++this.bounceCount;
      } else {
        this.angularVelocity = 0;
        this.velocity[1] = 0;
      }
      this.velocity[2] *= 0.2;
      this.prevWorldPos[1] = floorY;
      this.worldPos[1] = floorY;
    }
    this.billboardRotation += this.angularVelocity;

    if (this.info.velocityModifier) {
      this.info.velocityModifier(this.velocity);
    }
  }
}

export default class DebrisManager {
  private debris: Debris[] = [];
  private textureProvider: TextureProvider;
  private gravity: vec3;

  constructor(tp: TextureProvider) {
    this.textureProvider = tp;
    this.gravity = vec3.fromValues(0, -1, 0);
  }

  spawnMulti(info: DebrisInfo, world: vec3, n: number, extraForce?: number) {
    extraForce = extraForce === undefined ? 1 : extraForce;
    const texture = this.textureProvider.getTexture(info.textureName);
    for (let i = 0; i < n; ++i) {
      const d = new Debris(info);
      d.worldPos = vec3.clone(world);
      d.prevWorldPos = vec3.clone(world);
      d.texture = texture;
      d.velocity = vec3.fromValues(
        info.velX() * extraForce,
        info.velY() * extraForce,
        info.velZ() * extraForce
      );
      this.debris.push(d);
    }
  }

  update(dt: number) {
    for (let i = this.debris.length - 1; i >= 0; --i) {
      const d = this.debris[i];
      d.update(this.gravity, dt);
      if (d.timeAlive >= d.info.lifetime) {
        this.debris.splice(i, 1);
      }
    }
  }

  submitToRenderList(bbs: BillboardRenderable[]) {
    for (const d of this.debris) {
      bbs.push(d);
    }
  }
}
