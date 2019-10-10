export default class LightList {
  private lightData: Float32Array;
  private lightCount: number;

  constructor(lightCount: number) {
    this.lightCount = lightCount;
    this.lightData = new Float32Array(lightCount * 4);
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
