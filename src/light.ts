export default class LightList {
  private lightData: Float32Array = new Float32Array(16 * 4);

  constructor() {
  }

  setLight(id: number, x: number, y: number, z: number, radius: number) {
    this.lightData[4 * id + 0] = x;
    this.lightData[4 * id + 1] = y;
    this.lightData[4 * id + 2] = z;
    this.lightData[4 * id + 3] = radius;
  }

  clearLights() {
    this.lightData.fill(0);
  }

  getLightArray() {
    return this.lightData;
  }
}
