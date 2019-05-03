import { vec3, mat4 } from 'gl-matrix';
import * as glutil from './glutil';
import { Player } from './player';
import { Tilemap } from './tilemap';
import { toMapX, toMapY } from './level';

const deathVS = `
attribute vec4 position;
attribute vec2 texcoord;

uniform mat4 view;
uniform mat4 projection;
uniform mat4 model;

uniform highp float interpolation;

varying highp vec2 f_texcoord;

void main() {
  mat4 model_view = view * model;
  model_view[0][0] = 1.0;
  model_view[0][1] = 0.0;
  model_view[0][2] = 0.0;
  model_view[2][0] = 0.0;
  model_view[2][1] = 1.0;
  model_view[2][2] = 0.0;
  gl_Position = projection * model_view * position;
  f_texcoord = texcoord;
}
`;

const deathFS = `
uniform sampler2D death_texture;

uniform highp vec4  fog_color;
uniform highp float fog_density;

varying highp vec2 f_texcoord;

void main() {
  highp float dist = gl_FragCoord.z / gl_FragCoord.w;
  highp float fog  = 1.0 / exp(dist * fog_density) * 2.0;
  fog              = clamp(fog, 0.0, 1.0);

  highp vec4 base_color = texture2D(death_texture, f_texcoord);

  gl_FragColor = mix(fog_color, base_color, fog);
  gl_FragColor.a = base_color.a;
}
`;

export class Death {
  public prevWorldPos: vec3;
  public worldPos: vec3;
  private velocity: vec3;
  private awake: boolean = false;
  private wakeCallback: () => void;

  constructor() {
    this.worldPos = vec3.create();
    this.velocity = vec3.create();
    this.prevWorldPos = vec3.create();
  }

  beginUpdate() {
    vec3.copy(this.prevWorldPos, this.worldPos);
  }

  update(player: Player, tilemap: Tilemap) {
    this.beginUpdate();

    const px = player.getWorldX();
    const py = player.getWorldZ();
    const dx = px - this.worldPos[0];
    const dy = py - this.worldPos[2];
    const dir = vec3.create();
    vec3.set(dir, dx, 0, dy);
    vec3.normalize(dir, dir);

    if (this.awake) {
      vec3.set(this.velocity, px - this.worldPos[0], 0, py - this.worldPos[2]);
      vec3.normalize(this.velocity, this.velocity);
      vec3.scale(this.velocity, this.velocity, 0.2);
      vec3.add(this.worldPos, this.worldPos, this.velocity);
    } else {
      const ray = vec3.clone(dir);
      vec3.scale(ray, ray, 16);
      const amt = vec3.clone(ray);
      vec3.copy(ray, this.worldPos);
      for (let i = 0; i < 12; ++i) {
        const rmx = toMapX(ray[0]);
        const rmy = toMapY(ray[2]);
        const pmx = toMapX(player.getWorldX());
        const pmy = toMapY(player.getWorldZ());

        if (tilemap.isSolid(rmx, rmy)) {
          // hit a wall
          break;
        } else if (rmx === pmx && rmy === pmy) {
          // hit player tile
          this.wake();
        }

        vec3.add(ray, ray, amt);
      }
    }
    this.worldPos[1] = 16 + Math.sin(Date.now() / 1000) * 2;
  }

  setWorldPos(x: number, z: number) {
    this.worldPos[0] = x;
    this.worldPos[1] = 16;
    this.worldPos[2] = z;
  }

  getWorldX() {
    return this.worldPos[0];
  }

  getWorldZ() {
    return this.worldPos[2];
  }

  wake() {
    this.awake = true;
    if (this.wakeCallback) {
      this.wakeCallback();
    }
  }

  onWake(f: typeof Death.prototype.wakeCallback) {
    this.wakeCallback = f;
  }
}

export class DeathRenderer {
  private gl: WebGLRenderingContext;
  private texture: WebGLTexture;
  private program: WebGLProgram;
  private pointBuffer: WebGLBuffer;

  private positionAttrib: number;
  private texcoordAttrib: number;

  private viewUni: WebGLUniformLocation;
  private projUni: WebGLUniformLocation;
  private modelUni: WebGLUniformLocation;
  private interpolationUni: WebGLUniformLocation;
  private fogColorUni: WebGLUniformLocation;
  private fogDensityUni: WebGLUniformLocation;

  // scratch buffers for calculation so we don't allocate every frame
  private world: mat4 = mat4.create();
  private translation: vec3 = vec3.create();

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.pointBuffer = gl.createBuffer();
    this.program = glutil.buildProgram(gl, deathVS, deathFS);
    this.positionAttrib = gl.getAttribLocation(this.program, 'position');
    this.texcoordAttrib = gl.getAttribLocation(this.program, 'texcoord');
    this.viewUni = gl.getUniformLocation(this.program, 'view');
    this.projUni = gl.getUniformLocation(this.program, 'projection');
    this.modelUni = gl.getUniformLocation(this.program, 'model');
    this.interpolationUni = gl.getUniformLocation(this.program, 'interpolation');
    this.fogColorUni = gl.getUniformLocation(this.program, 'fog_color');
    this.fogDensityUni = gl.getUniformLocation(this.program, 'fog_density');

    const ENT_SIZE = 14;
    const vertexData = new Float32Array([
      -ENT_SIZE, 0, ENT_SIZE, 0, 0,
      -ENT_SIZE, 0, -ENT_SIZE, 0, 1,
      ENT_SIZE, 0, -ENT_SIZE, 1, 1,

      ENT_SIZE, 0, -ENT_SIZE, 1, 1,
      ENT_SIZE, 0, ENT_SIZE, 1, 0,
      -ENT_SIZE, 0, ENT_SIZE, 0, 0,
    ]);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.pointBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);
  }

  setTexture(t: WebGLTexture) {
    this.texture = t;
  }

  render(death: Death, view: mat4, proj: mat4, fogColor: number[], fogDensity: number, alpha: number) {
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.pointBuffer);

    vec3.lerp(this.translation, death.prevWorldPos, death.worldPos, alpha);
    mat4.fromTranslation(this.world, this.translation);

    gl.enableVertexAttribArray(this.positionAttrib);
    gl.vertexAttribPointer(this.positionAttrib, 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(this.texcoordAttrib);
    gl.vertexAttribPointer(this.texcoordAttrib, 2, gl.FLOAT, false, 20, 12);

    gl.uniformMatrix4fv(this.viewUni, false, view);
    gl.uniformMatrix4fv(this.projUni, false, proj);
    gl.uniformMatrix4fv(this.modelUni, false, this.world);
    gl.uniform1f(this.interpolationUni, alpha);
    gl.uniform4fv(this.fogColorUni, fogColor);
    gl.uniform1f(this.fogDensityUni, fogDensity);

    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}
