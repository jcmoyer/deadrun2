import { vec3, mat4 } from 'gl-matrix';
import ExitEmitterShader from './shaders/exitemitter';

export default class ExitEmitter {
  private gl: WebGLRenderingContext;
  private indicesBuffer: WebGLBuffer;
  private basePositions: Float32Array;
  private basePosBuffer: WebGLBuffer;
  private yOffset0Buffer: WebGLBuffer;
  private yOffset1Buffer: WebGLBuffer;
  private yOffsets: Float32Array;
  private prevYOffsets: Float32Array;
  private rotationBuffer: WebGLBuffer;
  private shader: ExitEmitterShader;
  private worldPos: vec3;
  private particleCount = 30;
  private emitHeight = 24;

  private model: mat4 = mat4.create();

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.shader = new ExitEmitterShader(gl);
    this.yOffsets = new Float32Array(4 * this.particleCount);
    this.prevYOffsets = new Float32Array(4 * this.particleCount);
    this.basePositions = new Float32Array(3 * 4 * this.particleCount);
    this.basePosBuffer = gl.createBuffer();
    this.rotationBuffer = gl.createBuffer();
    this.yOffset0Buffer = gl.createBuffer();
    this.yOffset1Buffer = gl.createBuffer();

    const rotations = new Float32Array(this.particleCount * 4);
    for (let i = 0; i < this.particleCount; ++i) {
      const a = Math.random() * 2 * Math.PI;
      rotations[i * 4 + 0] = a;
      rotations[i * 4 + 1] = a;
      rotations[i * 4 + 2] = a;
      rotations[i * 4 + 3] = a;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.rotationBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, rotations, gl.STATIC_DRAW);

    this.indicesBuffer = gl.createBuffer();

    const indices = new Uint16Array(this.particleCount * 6);
    for (let i = 0; i < this.particleCount; ++i) {
      const base = i * 6;
      indices[base + 0] = i * 4 + 0;
      indices[base + 1] = i * 4 + 1;
      indices[base + 2] = i * 4 + 2;
      indices[base + 3] = i * 4 + 2;
      indices[base + 4] = i * 4 + 1;
      indices[base + 5] = i * 4 + 3;
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indicesBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
  }

  setWorldPos(x: number, z: number) {
    this.worldPos = vec3.create();
    vec3.set(this.worldPos, x, 0, z);
    mat4.identity(this.model);
    this.model[12] = this.worldPos[0];
    this.model[13] = this.worldPos[1];
    this.model[14] = this.worldPos[2];
    this.initParticles();
  }

  initParticles() {
    for (let i = 0; i < this.particleCount; ++i) {
      this.initBasePosition(i);
      this.initOffset(i);
    }
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.basePosBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.basePositions, gl.STATIC_DRAW);
  }

  initBasePosition(i: number) {
    const ENT_SIZE = 1;
    const HALF_SIZE = ENT_SIZE / 2;
    const a = Math.random() * 2 * Math.PI;
    const localX = + Math.cos(a) * 0;
    const localY = - Math.random() * this.emitHeight;
    const localZ = + Math.sin(a) * 0;
    // generate 4 vertices centered about this point
    const base = i * 3 * 4;
    this.basePositions[base + 0] = localX - HALF_SIZE;
    this.basePositions[base + 1] = localY + HALF_SIZE;
    this.basePositions[base + 2] = localZ;

    this.basePositions[base + 3] = localX - HALF_SIZE;
    this.basePositions[base + 4] = localY - HALF_SIZE;
    this.basePositions[base + 5] = localZ;

    this.basePositions[base + 6] = localX + HALF_SIZE;
    this.basePositions[base + 7] = localY + HALF_SIZE;
    this.basePositions[base + 8] = localZ;

    this.basePositions[base + 9] = localX + HALF_SIZE;
    this.basePositions[base + 10] = localY - HALF_SIZE;
    this.basePositions[base + 11] = localZ;
  }

  initOffset(i: number) {
    this.prevYOffsets[i * 4 + 0] = this.yOffsets[i * 4 + 0] = 0;
    this.prevYOffsets[i * 4 + 1] = this.yOffsets[i * 4 + 1] = 0;
    this.prevYOffsets[i * 4 + 2] = this.yOffsets[i * 4 + 2] = 0;
    this.prevYOffsets[i * 4 + 3] = this.yOffsets[i * 4 + 3] = 0;
  }

  updateParticle(i: number) {
    // save prev pos for interpolation
    // since particles only move along the Y axis we only need to save that coordinate
    this.prevYOffsets[i * 4 + 0] = this.yOffsets[i * 4 + 0]++;
    this.prevYOffsets[i * 4 + 1] = this.yOffsets[i * 4 + 1]++;
    this.prevYOffsets[i * 4 + 2] = this.yOffsets[i * 4 + 2]++;
    this.prevYOffsets[i * 4 + 3] = this.yOffsets[i * 4 + 3]++;

    const worldY = this.basePositions[i * 3 * 4 + 1] + this.yOffsets[i * 4];
    if (worldY > this.emitHeight) {
      this.initOffset(i);
    }
  }

  update() {
    for (let i = 0; i < this.particleCount; ++i) {
      this.updateParticle(i);
    }
  }

  render(view: mat4, proj: mat4, fogColor: number[], fogDensity: number, alpha: number) {
    const gl = this.gl;
    this.shader.use();

    gl.bindBuffer(gl.ARRAY_BUFFER, this.basePosBuffer);
    gl.enableVertexAttribArray(this.shader.aBasePosition);
    gl.vertexAttribPointer(this.shader.aBasePosition, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.rotationBuffer);
    gl.enableVertexAttribArray(this.shader.aRotation);
    gl.vertexAttribPointer(this.shader.aRotation, 1, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.yOffset0Buffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.prevYOffsets, gl.STREAM_DRAW);
    gl.enableVertexAttribArray(this.shader.aYOffset0);
    gl.vertexAttribPointer(this.shader.aYOffset0, 1, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.yOffset1Buffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.yOffsets, gl.STREAM_DRAW);
    gl.enableVertexAttribArray(this.shader.aYOffset1);
    gl.vertexAttribPointer(this.shader.aYOffset1, 1, gl.FLOAT, false, 0, 0);

    gl.uniformMatrix4fv(this.shader.uView, false, view);
    gl.uniformMatrix4fv(this.shader.uProjection, false, proj);
    gl.uniform1f(this.shader.uInterpolation, alpha);
    gl.uniform4fv(this.shader.uFogColor, fogColor);
    gl.uniform1f(this.shader.uFogDensity, fogDensity);

    gl.uniformMatrix4fv(this.shader.uModel, false, this.model);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indicesBuffer);

    gl.drawElements(gl.TRIANGLES, this.particleCount * 6, gl.UNSIGNED_SHORT, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  }
}
