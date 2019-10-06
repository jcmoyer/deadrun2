import { mat4 } from "gl-matrix";
import WeaponViewShader from './shaders/weaponviewshader';
import Weapon from './weapon';
import { TextureProvider } from './glutil';
import WeaponInfo from "./weaponinfo";

export default class ViewWeaponRenderer {
  private gl: WebGLRenderingContext;
  private orthoProj: mat4;
  private shader: WeaponViewShader;

  private weaponBuffer: WebGLBuffer;
  private vertices: Float32Array;

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;

    this.orthoProj = mat4.ortho(
      mat4.create(),
      -1, 1, -1, 1, 0, 1
    );

    this.weaponBuffer = gl.createBuffer();
    
    this.vertices = new Float32Array([
      0, 0, 0, 0, 0,
      0, 0, 0, 0, 1,
      0, 0, 0, 1, 1,
      0, 0, 0, 1, 1,
      0, 0, 0, 1, 0,
      0, 0, 0, 0, 0,
    ]);

    this.shader = new WeaponViewShader(gl);
  }

  render(w: Weapon, tp: TextureProvider) {
    const gl = this.gl;

    this.shader.use();

    gl.bindBuffer(gl.ARRAY_BUFFER, this.weaponBuffer);
    this.updateBufferData(w.info);

    gl.enableVertexAttribArray(this.shader.aPosition);
    gl.vertexAttribPointer(this.shader.aPosition, 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(this.shader.aTexcoord);
    gl.vertexAttribPointer(this.shader.aTexcoord, 2, gl.FLOAT, false, 20, 12);

    gl.uniformMatrix4fv(this.shader.uProjection, false, this.orthoProj);

    if (w.info.animationStyle === 'swing' && w.state === 'action') {
      const progress = 1 - (w.actionTimer.getRemaining() / w.actionTimer.getDuration());
      gl.uniform1f(this.shader.uSwingProgress, progress);
    } else {
      gl.uniform1f(this.shader.uSwingProgress, 0);
    }

    gl.bindTexture(gl.TEXTURE_2D, tp.getTexture(w.currentTextureName));

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  updateBufferData(w: WeaponInfo) {
    const gl = this.gl;

    const viewWidth = w.viewScaleX;
    const viewHeight = w.viewScaleY;

    // must always be bottom-right-aligned
    const vpR = 1.0;
    const vpL = vpR - viewWidth;
    
    const vpB = -1.0;
    const vpT = vpB + viewHeight;

    this.vertices[0] = vpL;
    this.vertices[1] = vpT;
    this.vertices[5] = vpL;
    this.vertices[6] = vpB;
    this.vertices[10] = vpR;
    this.vertices[11] = vpB;
    this.vertices[15] = vpR;
    this.vertices[16] = vpB;
    this.vertices[20] = vpR;
    this.vertices[21] = vpT;
    this.vertices[25] = vpL;
    this.vertices[26] = vpT;

    gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STREAM_DRAW);
  }
}
