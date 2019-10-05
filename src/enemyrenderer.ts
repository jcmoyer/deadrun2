import { mat4, vec3 } from "gl-matrix";
import { Death } from './death';
import DeathShader from './shaders/death';

export class DeathRenderer {
  private gl: WebGLRenderingContext;
  private texture: WebGLTexture;
  private pointBuffer: WebGLBuffer;

  private shader: DeathShader;

  // scratch buffers for calculation so we don't allocate every frame
  private world: mat4 = mat4.create();
  private translation: vec3 = vec3.create();

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.pointBuffer = gl.createBuffer();
    this.shader = new DeathShader(gl);

    const ENT_SIZE = 14;
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

  setTexture(t: WebGLTexture) {
    this.texture = t;
  }

  render(death: Death, view: mat4, proj: mat4, fogColor: number[], fogDensity: number, alpha: number) {
    const gl = this.gl;
    this.shader.use();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.pointBuffer);

    vec3.lerp(this.translation, death.prevWorldPos, death.worldPos, alpha);
    mat4.fromTranslation(this.world, this.translation);

    gl.enableVertexAttribArray(this.shader.aPosition);
    gl.vertexAttribPointer(this.shader.aPosition, 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(this.shader.aTexcoord);
    gl.vertexAttribPointer(this.shader.aTexcoord, 2, gl.FLOAT, false, 20, 12);

    gl.uniformMatrix4fv(this.shader.uView, false, view);
    gl.uniformMatrix4fv(this.shader.uProjection, false, proj);
    gl.uniformMatrix4fv(this.shader.uModel, false, this.world);
    gl.uniform1f(this.shader.uInterpolation, alpha);
    gl.uniform4fv(this.shader.uFogColor, fogColor);
    gl.uniform1f(this.shader.uFogDensity, fogDensity);

    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}
