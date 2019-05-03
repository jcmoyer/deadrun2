import {buildProgram} from './glutil';
import * as glm from 'gl-matrix';

const emitterVS = `
attribute vec4 position;
attribute vec4 prev_position;

uniform mat4 view;
uniform mat4 projection;

uniform highp float interpolation;

void main() {
  vec4 interp_pos = mix(prev_position, position, interpolation);
  gl_Position = projection * view * interp_pos;
  gl_PointSize = 512.0 / gl_Position.w;
}
`;

const emitterFS = `
uniform highp vec4  fog_color;
uniform highp float fog_density;

void main() {
  highp float dist = gl_FragCoord.z / gl_FragCoord.w;
  highp float fog  = 1.0 / exp(dist * fog_density) * 2.0;
  fog              = clamp(fog, 0.0, 1.0);

  highp vec2 texcoord   = gl_PointCoord;
  highp vec4 base_color = vec4(48.0 / 255.0, 104.0 / 255.0, 216.0 / 255.0, 1.0);

  gl_FragColor = mix(fog_color, base_color, fog);
}
`;

export default class ExitEmitter {
  private gl: WebGLRenderingContext;
  private positions: Float32Array;
  private posBuffer: WebGLBuffer;
  private prevPositions: Float32Array;
  private prevPosBuffer: WebGLBuffer;
  private program: WebGLProgram;
  private worldPos: glm.vec3;
  private particleCount = 30;

  private prevPosAttrib: number;
  private posAttrib: number;
  private viewUni: WebGLUniformLocation;
  private projUni: WebGLUniformLocation;
  private interpolationUni: WebGLUniformLocation;
  private fogColorUni: WebGLUniformLocation;
  private fogDensityUni: WebGLUniformLocation;

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.program = buildProgram(gl, emitterVS, emitterFS);
    this.prevPosAttrib = gl.getAttribLocation(this.program, 'prev_position');
    this.posAttrib = gl.getAttribLocation(this.program, 'position');
    this.viewUni = gl.getUniformLocation(this.program, 'view');
    this.projUni = gl.getUniformLocation(this.program, 'projection');
    this.interpolationUni = gl.getUniformLocation(this.program, 'interpolation');
    this.fogColorUni = gl.getUniformLocation(this.program, 'fog_color');
    this.fogDensityUni = gl.getUniformLocation(this.program, 'fog_density');

    this.prevPositions = new Float32Array(3 * this.particleCount);
    this.positions = new Float32Array(3 * this.particleCount);
    this.posBuffer = gl.createBuffer();
    this.prevPosBuffer = gl.createBuffer();
  }

  setWorldPos(x, z) {
    this.worldPos = glm.vec3.create();
    glm.vec3.set(this.worldPos, x, 0, z);
    this.initParticles();
  }

  initParticles() {
    for (let i = 0; i < this.particleCount; ++i) {
      this.initParticle(i);
    }
  }

  initParticle(i) {
    const a = Math.random() * 2 * Math.PI;
    this.prevPositions[i * 3 + 0] = this.positions[i * 3 + 0] = this.worldPos[0] + Math.cos(a) * 8;
    this.prevPositions[i * 3 + 1] = this.positions[i * 3 + 1] = this.worldPos[1] - Math.random() * 32;
    this.prevPositions[i * 3 + 2] = this.positions[i * 3 + 2] = this.worldPos[2] + Math.sin(a) * 8;


  }

  updateParticle(i) {
    // save prev pos for interpolation
    this.prevPositions[i * 3 + 0] = this.positions[i * 3 + 0];
    this.prevPositions[i * 3 + 1] = this.positions[i * 3 + 1];
    this.prevPositions[i * 3 + 2] = this.positions[i * 3 + 2];

    // update pos
    this.positions[i * 3 + 1]++;

    if (this.positions[i * 3 + 1] > 24) {
      this.initParticle(i);
    }
  }

  update() {
    for (let i = 0; i < this.particleCount; ++i) {
      this.updateParticle(i);
    }
  }

  render(view: glm.mat4, proj: glm.mat4, fogColor: number[], fogDensity: number, alpha: number) {
    const gl = this.gl;
    gl.useProgram(this.program);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.prevPosBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.prevPositions, gl.STREAM_DRAW);
    gl.enableVertexAttribArray(this.prevPosAttrib);
    gl.vertexAttribPointer(this.prevPosAttrib, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.positions, gl.STREAM_DRAW);
    gl.enableVertexAttribArray(this.posAttrib);
    gl.vertexAttribPointer(this.posAttrib, 3, gl.FLOAT, false, 0, 0);

    gl.uniformMatrix4fv(this.viewUni, false, view);
    gl.uniformMatrix4fv(this.projUni, false, proj);
    gl.uniform1f(this.interpolationUni, alpha);
    gl.uniform4fv(this.fogColorUni, fogColor);
    gl.uniform1f(this.fogDensityUni, fogDensity);

    gl.drawArrays(gl.POINTS, 0, this.positions.length / 3);
  }
}
