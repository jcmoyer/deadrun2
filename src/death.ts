import * as glm from 'gl-matrix';
import * as glutil from './glutil';
import {Player} from './player';
import { Tilemap } from './tilemap';
import { toMapX, toMapY } from './level';

const deathVS = `
attribute vec4 position;
attribute vec4 prev_position;

uniform mat4 view;
uniform mat4 projection;

uniform highp float interpolation;
uniform highp float sprite_scale;

void main() {
  vec4 interp_pos = mix(prev_position, position, interpolation);
  gl_Position = projection * view * interp_pos;
  gl_PointSize = sprite_scale / gl_Position.w;
}
`;

const deathFS = `
uniform sampler2D death_texture;

uniform highp vec4  fog_color;
uniform highp float fog_density;

void main() {
  highp float dist = gl_FragCoord.z / gl_FragCoord.w;
  highp float fog  = 1.0 / exp(dist * fog_density) * 2.0;
  fog              = clamp(fog, 0.0, 1.0);

  highp vec2 texcoord   = gl_PointCoord;
  highp vec4 base_color = texture2D(death_texture, texcoord);

  gl_FragColor = mix(fog_color, base_color, fog);
  gl_FragColor.a = base_color.a;
}
`;

export class Death {
  public prevWorldPos: glm.vec3;
  public worldPos: glm.vec3;
  private velocity: glm.vec3;
  private awake: boolean = false;
  private wakeCallback;

  constructor() {
    this.worldPos = glm.vec3.create();
    this.velocity = glm.vec3.create();
    this.prevWorldPos = glm.vec3.create();
  }

  beginUpdate() {
    glm.vec3.copy(this.prevWorldPos, this.worldPos);
  }

  update(player: Player, tilemap: Tilemap) {
    this.beginUpdate();

    const px = player.getWorldX();
    const py = player.getWorldZ();
    const dx = px - this.worldPos[0];
    const dy = py - this.worldPos[2];
    const dir = glm.vec3.create();
    glm.vec3.set(dir, dx, 0, dy);
    glm.vec3.normalize(dir, dir);
    
    if (this.awake) {
      glm.vec3.set(this.velocity, px - this.worldPos[0], 0, py - this.worldPos[2]);
      glm.vec3.normalize(this.velocity, this.velocity);
      glm.vec3.scale(this.velocity, this.velocity, 0.2);
      glm.vec3.add(this.worldPos, this.worldPos, this.velocity);
    } else {
      const ray = glm.vec3.clone(dir);
      glm.vec3.scale(ray, ray, 16);
      const amt = glm.vec3.clone(ray);
      glm.vec3.copy(ray, this.worldPos);
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

        glm.vec3.add(ray, ray, amt);
      }
    }
    this.worldPos[1] = 16 + Math.sin(Date.now() / 1000) * 2;
  }

  setWorldPos(x, z) {
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

  onWake(f) {
    this.wakeCallback = f;
  }
}

export class DeathRenderer {
  private gl: WebGLRenderingContext;
  private texture: WebGLTexture;
  private program: WebGLProgram;
  private pointBuffer: WebGLBuffer;

  private positionAttrib: number;
  private prevPositionAttrib: number;

  private viewUni: WebGLUniformLocation;
  private projUni: WebGLUniformLocation;
  private interpolationUni: WebGLUniformLocation;
  private fogColorUni: WebGLUniformLocation;
  private fogDensityUni: WebGLUniformLocation;
  private spriteScaleUni: WebGLUniformLocation;

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.pointBuffer = gl.createBuffer();
    this.program = glutil.buildProgram(gl, deathVS, deathFS);
    this.positionAttrib = gl.getAttribLocation(this.program, 'position');
    this.prevPositionAttrib = gl.getAttribLocation(this.program, 'prev_position');
    this.viewUni = gl.getUniformLocation(this.program, 'view');
    this.projUni = gl.getUniformLocation(this.program, 'projection');
    this.interpolationUni = gl.getUniformLocation(this.program, 'interpolation');
    this.fogColorUni = gl.getUniformLocation(this.program, 'fog_color');
    this.fogDensityUni = gl.getUniformLocation(this.program, 'fog_density');
    this.spriteScaleUni = gl.getUniformLocation(this.program, 'sprite_scale');
  }

  setTexture(t: WebGLTexture) {
    this.texture = t;
  }

  render(death: Death, view: glm.mat4, proj: glm.mat4, fogColor: number[], fogDensity: number, alpha: number) {
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.pointBuffer);

    const pointData = new Float32Array([
      // TODO previous position (also change pointers below)
      death.prevWorldPos[0], death.prevWorldPos[1], death.prevWorldPos[2],
      // latest position
      death.worldPos[0], death.worldPos[1], death.worldPos[2]
    ]);

    gl.bufferData(gl.ARRAY_BUFFER, pointData, gl.STREAM_DRAW);

    gl.enableVertexAttribArray(this.positionAttrib);
    gl.vertexAttribPointer(this.positionAttrib, 3, gl.FLOAT, false, 0, 12);
    gl.enableVertexAttribArray(this.prevPositionAttrib);
    gl.vertexAttribPointer(this.prevPositionAttrib, 3, gl.FLOAT, false, 0, 0);

    gl.uniformMatrix4fv(this.viewUni, false, view);
    gl.uniformMatrix4fv(this.projUni, false, proj);
    gl.uniform1f(this.interpolationUni, alpha);
    gl.uniform4fv(this.fogColorUni, fogColor);
    gl.uniform1f(this.fogDensityUni, fogDensity);
    // don't ask
    gl.uniform1f(this.spriteScaleUni, 14096);
    
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.drawArrays(gl.POINTS, 0, 1);
  }
}
