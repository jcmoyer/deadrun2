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
}

export const DEBRIS_BONE = new DebrisInfo();
DEBRIS_BONE.textureName = 'bone';
DEBRIS_BONE.velX = () => Math.cos(Math.random() * 2 * Math.PI) * 5;
DEBRIS_BONE.velY = () => Math.random() * 3 - Math.random() * 3;
DEBRIS_BONE.velZ = () => Math.sin(Math.random() * 2 * Math.PI) * 5;
DEBRIS_BONE.ignoresGravity = false;
DEBRIS_BONE.size = 4;

export const DEBRIS_EMBER = new DebrisInfo();
DEBRIS_EMBER.textureName = 'ember';
DEBRIS_EMBER.velX = () => Math.cos(Math.random() * 2 * Math.PI) * 5;
DEBRIS_EMBER.velY = () => Math.random() * 5 - Math.random() * 5;
DEBRIS_EMBER.velZ = () => Math.sin(Math.random() * 2 * Math.PI) * 5;
DEBRIS_EMBER.ignoresGravity = true;
DEBRIS_EMBER.size = 8;

class Debris implements BillboardRenderable {
  prevWorldPos: vec3;
  worldPos: vec3;
  billboardWidth: number;
  billboardHeight: number;
  texture: WebGLTexture;
  billboardFlash?: boolean;

  velocity: vec3;
  info: DebrisInfo;

  timeAlive: number = 0;

  constructor(info: DebrisInfo) {
    this.info = info;
    this.billboardWidth = info.size;
    this.billboardHeight = info.size;
  }

  update(gravity: vec3, dt: number) {
    vec3.copy(this.prevWorldPos, this.worldPos);
    vec3.add(this.worldPos, this.worldPos, this.velocity);
    if (!this.info.ignoresGravity) {
      vec3.add(this.velocity, this.velocity, gravity);
    }
    this.timeAlive += dt;
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

  spawnMulti(info: DebrisInfo, world: vec3, n: number) {
    const texture = this.textureProvider.getTexture(info.textureName);
    for (let i = 0; i < n; ++i) {
      const d = new Debris(info);
      d.worldPos = vec3.clone(world);
      d.prevWorldPos = vec3.clone(world);
      d.texture = texture;
      d.velocity = vec3.fromValues(
        info.velX(),
        info.velY(),
        info.velZ()
      );
      this.debris.push(d);
    }
  }

  update(dt: number) {
    for (let i = this.debris.length - 1; i >= 0; --i) {
      const d = this.debris[i];
      d.update(this.gravity, dt);
      if (d.timeAlive >= 5000) {
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
