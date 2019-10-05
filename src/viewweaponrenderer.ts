import { mat4 } from "gl-matrix";
import WeaponViewShader from './shaders/weaponviewshader';

export default class ViewWeaponRenderer {
  private gl: WebGLRenderingContext;
  private texture: WebGLTexture;
  private orthoProj: mat4;
  private shader: WeaponViewShader;

  private weaponBuffer: WebGLBuffer;

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;

    this.orthoProj = mat4.ortho(
      mat4.create(),
      -1, 1, -1, 1, 0, 1
    );

    this.weaponBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.weaponBuffer);

    // not exactly the most intuitive thing...
    const viewPosX = 0.3
    const viewPosY = -0.3
    const viewWidth = 0.7;

    const vpL = viewPosX;
    const vpR = viewPosX + viewWidth;
    const vpT = viewPosY;
    const vpB = -1.0; // must always be bottom-aligned

    const orthoVerts = [
      vpL, vpT, 0, 0, 0,
      vpL, vpB, 0, 0, 1,
      vpR, vpB, 0, 1, 1,

      vpR, vpB, 0, 1, 1,
      vpR, vpT, 0, 1, 0,
      vpL, vpT, 0, 0, 0,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(orthoVerts), gl.STATIC_DRAW);

    this.shader = new WeaponViewShader(gl);
  }

  setTexture(t: WebGLTexture) {
    this.texture = t;
  }

  render() {
    const gl = this.gl;

    this.shader.use();

    gl.bindBuffer(gl.ARRAY_BUFFER, this.weaponBuffer);
    gl.enableVertexAttribArray(this.shader.aPosition);
    gl.vertexAttribPointer(this.shader.aPosition, 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(this.shader.aTexcoord);
    gl.vertexAttribPointer(this.shader.aTexcoord, 2, gl.FLOAT, false, 20, 12);

    gl.uniformMatrix4fv(this.shader.uProjection, false, this.orthoProj);

    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}
