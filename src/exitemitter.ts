import { buildProgram } from './glutil';
import { vec3, mat4 } from 'gl-matrix';

const emitterVS = `
attribute vec4 base_position;
attribute highp float y_offset_0;
attribute highp float y_offset_1;
attribute highp float rotation;

uniform mat4 model;
uniform mat4 view;
uniform mat4 projection;

uniform highp float interpolation;

void main() {
  vec4 interp_pos = base_position;
  interp_pos.y += mix(y_offset_0, y_offset_1, interpolation);

  // translate the model matrix relative to this vertex instead of the emitter so that
  // rotations are about the particle center rather than the emitter center
  vec4 model_offset = vec4(
    cos(rotation) * 8.0,
    0,
    sin(rotation) * 8.0,
    0
  );

  mat4 model_t = model;
  model_t[3] += model_offset;

  // compute the model-view matrix using the offset model matrix and discard the rotation submatrix
  mat4 mv = view * model_t;
  mv[0] = vec4(1, 0, 0, 0);
  mv[1] = vec4(0, 1, 0, 0);
  mv[2] = vec4(0, 0, 1, 0);

  gl_Position = projection * mv * interp_pos;
}
`;

const emitterFS = `
uniform highp vec4  fog_color;
uniform highp float fog_density;

void main() {
  highp float dist = gl_FragCoord.z / gl_FragCoord.w;
  highp float fog  = 1.0 / exp(dist * fog_density) * 2.0;
  fog              = clamp(fog, 0.0, 1.0);

  highp vec4 base_color = vec4(48.0 / 255.0, 104.0 / 255.0, 216.0 / 255.0, 1.0);

  gl_FragColor = mix(fog_color, base_color, fog);
}
`;

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
  private program: WebGLProgram;
  private worldPos: vec3;
  private particleCount = 30;
  private emitHeight = 24;

  private posAttrib: number;
  private rotationAttrib: number;
  private yOffset0Attrib: number;
  private yOffset1Attrib: number;
  private viewUni: WebGLUniformLocation;
  private projUni: WebGLUniformLocation;
  private interpolationUni: WebGLUniformLocation;
  private fogColorUni: WebGLUniformLocation;
  private fogDensityUni: WebGLUniformLocation;
  private modelUni: WebGLUniformLocation;

  private model: mat4 = mat4.create();

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.program = buildProgram(gl, emitterVS, emitterFS);
    this.rotationAttrib = gl.getAttribLocation(this.program, 'rotation');
    this.posAttrib = gl.getAttribLocation(this.program, 'base_position');
    this.yOffset0Attrib = gl.getAttribLocation(this.program, 'y_offset_0');
    this.yOffset1Attrib = gl.getAttribLocation(this.program, 'y_offset_1');
    this.modelUni = gl.getUniformLocation(this.program, 'model');
    this.viewUni = gl.getUniformLocation(this.program, 'view');
    this.projUni = gl.getUniformLocation(this.program, 'projection');
    this.interpolationUni = gl.getUniformLocation(this.program, 'interpolation');
    this.fogColorUni = gl.getUniformLocation(this.program, 'fog_color');
    this.fogDensityUni = gl.getUniformLocation(this.program, 'fog_density');

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
    gl.useProgram(this.program);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.basePosBuffer);
    gl.enableVertexAttribArray(this.posAttrib);
    gl.vertexAttribPointer(this.posAttrib, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.rotationBuffer);
    gl.enableVertexAttribArray(this.rotationAttrib);
    gl.vertexAttribPointer(this.rotationAttrib, 1, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.yOffset0Buffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.prevYOffsets, gl.STREAM_DRAW);
    gl.enableVertexAttribArray(this.yOffset0Attrib);
    gl.vertexAttribPointer(this.yOffset0Attrib, 1, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.yOffset1Buffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.yOffsets, gl.STREAM_DRAW);
    gl.enableVertexAttribArray(this.yOffset1Attrib);
    gl.vertexAttribPointer(this.yOffset1Attrib, 1, gl.FLOAT, false, 0, 0);

    gl.uniformMatrix4fv(this.viewUni, false, view);
    gl.uniformMatrix4fv(this.projUni, false, proj);
    gl.uniform1f(this.interpolationUni, alpha);
    gl.uniform4fv(this.fogColorUni, fogColor);
    gl.uniform1f(this.fogDensityUni, fogDensity);

    gl.uniformMatrix4fv(this.modelUni, false, this.model);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indicesBuffer);

    gl.drawElements(gl.TRIANGLES, this.particleCount * 6, gl.UNSIGNED_SHORT, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  }
}
