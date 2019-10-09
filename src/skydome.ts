import SkyboxShader from './shaders/skybox';
import { mat4 } from 'gl-matrix';
import { Mesh, buildInterleavedMesh } from './objloader';

export default class SkydomeRenderer {
  private gl: WebGLRenderingContext;
  private mesh: Mesh;
  private shader: SkyboxShader;
  private buffer: WebGLBuffer;

  constructor(gl: WebGLRenderingContext, mesh: Mesh) {
    this.gl = gl;
    this.mesh = mesh;

    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(buildInterleavedMesh(mesh)), gl.STATIC_DRAW);

    this.shader = new SkyboxShader(gl);
  }

  render(view: mat4, proj: mat4, sky0: WebGLTexture, sky1: WebGLTexture, time: number, fogColor: number[], fogDensity: number) {
    const gl = this.gl;
    gl.depthMask(false);
    this.shader.use();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);

    gl.enableVertexAttribArray(this.shader.aPosition);
    gl.vertexAttribPointer(this.shader.aPosition, 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(this.shader.aTexcoord);
    gl.vertexAttribPointer(this.shader.aTexcoord, 2, gl.FLOAT, false, 20, 12);

    gl.uniformMatrix4fv(this.shader.uView, false, view);
    gl.uniformMatrix4fv(this.shader.uProjection, false, proj);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sky0);
    gl.uniform1i(this.shader.uSky0, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, sky1);
    gl.uniform1i(this.shader.uSky1, 1);

    gl.uniform1f(this.shader.uTime, time);

    gl.uniform4fv(this.shader.uFogColor, fogColor);
    gl.uniform1f(this.shader.uFogDensity, fogDensity);

    gl.drawArrays(gl.TRIANGLES, 0, this.mesh.faces.length * 3);

    gl.depthMask(true);

    gl.activeTexture(gl.TEXTURE0);
  }
}
