import { vec3 } from "gl-matrix";

export default class WorldItem {
  prevWorldPos: vec3;
  worldPos: vec3;
  billboardWidth: number = 4;
  billboardHeight: number = 8;
  texture: WebGLTexture;

  hoverHeight: number = 0;

  itemName: string;

  constructor(type: string, pos: vec3) {
    this.prevWorldPos = vec3.clone(pos);
    this.worldPos = vec3.clone(pos);

    this.itemName = type;
    if (type === 'sword') {
      this.billboardWidth = 4;
      this.billboardHeight = 8;
      this.hoverHeight = 12;
    } else if (type === 'spellbook') {
      this.billboardWidth = 4;
      this.billboardHeight = 4;
      this.hoverHeight = 8;
    } else if (type === 'mana') {
      this.billboardWidth = 2;
      this.billboardHeight = 2;
      this.hoverHeight = 8;
    } else {
      throw new Error('invalid item type');
    }
  }

  update() {
    vec3.copy(this.prevWorldPos, this.worldPos);

    const seed = this.worldPos[0] * this.worldPos[2];

    this.worldPos[1] = this.hoverHeight + Math.sin(seed + Date.now() / 500) * 3;
  }
}
