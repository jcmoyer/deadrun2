import { mat4, vec3 } from "gl-matrix";
import BillboardShader from './shaders/billboard';
import LightList from "./light";

export interface BillboardRenderable {
  prevWorldPos: vec3;
  worldPos: vec3;
  billboardWidth: number;
  billboardHeight: number;
  texture: WebGLTexture;
  billboardFlash?: boolean;
  billboardRotation?: number;
  billboardAlpha?: number;
}

export default class BillboardRenderer {
  private gl: WebGLRenderingContext;
  private pointBuffer: WebGLBuffer;

  private shader: BillboardShader;

  // scratch buffers for calculation so we don't allocate every frame
  private world: mat4 = mat4.create();
  private translation: vec3 = vec3.create();

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.pointBuffer = gl.createBuffer();
    this.shader = new BillboardShader(gl);

    const ENT_SIZE = 1;
    const vertexData = new Float32Array([
      -ENT_SIZE, ENT_SIZE, 0, 0, 0,
      -ENT_SIZE, -ENT_SIZE, 0 , 0, 1,
      ENT_SIZE, -ENT_SIZE, 0, 1, 1,

      ENT_SIZE, -ENT_SIZE, 0, 1, 1,
      ENT_SIZE, ENT_SIZE, 0, 1, 0,
      -ENT_SIZE, ENT_SIZE, 0, 0, 0,
    ]);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.pointBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);
  }

  render(bbs: BillboardRenderable[], view: mat4, proj: mat4, fogColor: number[], fogDensity: number, alpha: number, lights: LightList) {
    if (bbs.length === 0) {
      return;
    }

    const gl = this.gl;

    gl.depthMask(false);

    this.shader.use();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.pointBuffer);

    // constant state
    gl.enableVertexAttribArray(this.shader.aPosition);
    gl.vertexAttribPointer(this.shader.aPosition, 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(this.shader.aTexcoord);
    gl.vertexAttribPointer(this.shader.aTexcoord, 2, gl.FLOAT, false, 20, 12);

    gl.uniformMatrix4fv(this.shader.uView, false, view);
    gl.uniformMatrix4fv(this.shader.uProjection, false, proj);

    gl.uniform1f(this.shader.uInterpolation, alpha);
    gl.uniform4fv(this.shader.uFogColor, fogColor);
    gl.uniform1f(this.shader.uFogDensity, fogDensity);
    gl.uniform4fv(this.shader.uLights, lights.getLightArray());

    let lastTexture = bbs[0].texture;
    gl.bindTexture(gl.TEXTURE_2D, lastTexture);

    for (const bb of bbs) {
      // minimize state changes
      if (bb.texture !== lastTexture) {
        gl.bindTexture(gl.TEXTURE_2D, bb.texture);
        lastTexture = bb.texture;
      }
      vec3.lerp(this.translation, bb.prevWorldPos, bb.worldPos, alpha);
      mat4.fromTranslation(this.world, this.translation);
      gl.uniform1f(this.shader.uRotation, bb.billboardRotation !== undefined ? bb.billboardRotation : 0);
      gl.uniform1f(this.shader.uBillboardAlpha, bb.billboardAlpha !== undefined ? bb.billboardAlpha : 1);
      gl.uniformMatrix4fv(this.shader.uModel, false, this.world);
      gl.uniform2f(this.shader.uScale, bb.billboardWidth, bb.billboardHeight);
      gl.uniform1f(this.shader.uBillboardFlash, bb.billboardFlash ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    gl.depthMask(true);
  }
}
