import { vec3, mat4 } from 'gl-matrix';
import * as glutil from './glutil';
import { Player } from './player';
import { Tilemap } from './tilemap';
import { toMapX, toMapY } from './level';
import GridWalker from './gridwalker';
import { fogFragmentShader } from './shaderfog';

const deathVS = `
attribute vec4 position;
attribute vec2 texcoord;

uniform mat4 view;
uniform mat4 projection;
uniform mat4 model;

uniform highp float interpolation;

varying highp vec2 f_texcoord;

void main() {
  mat4 mv = view * model;
  mv[0] = vec4(1, 0, 0, 0);
  mv[1] = vec4(0, 1, 0, 0);
  mv[2] = vec4(0, 0, 1, 0);
  gl_Position = projection * mv * position;
  f_texcoord = texcoord;
}
`;

const deathFS = `
${fogFragmentShader}

uniform sampler2D death_texture;

varying highp vec2 f_texcoord;

void main() {
  highp vec4 base_color = texture2D(death_texture, f_texcoord);

  gl_FragColor = mix_fog(base_color);
  gl_FragColor.a = base_color.a;
}
`;

const gridWalker = new GridWalker();

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

    if (this.awake) {
      this.chasePlayer(player);
    } else {
      if (this.canSeePlayer(player, tilemap)) {
        this.wake();
      }
    }

    this.worldPos[1] = 16 + Math.sin(Date.now() / 1000) * 2;
  }

  private chasePlayer(player: Player) {
    vec3.set(
      this.velocity,
      player.getWorldX() - this.getWorldX(),
      0,
      player.getWorldZ() - this.getWorldZ()
    );
    vec3.normalize(this.velocity, this.velocity);
    vec3.scale(this.velocity, this.velocity, 0.2);
    vec3.add(this.worldPos, this.worldPos, this.velocity);
  }

  private canSeePlayer(player: Player, tilemap: Tilemap) {
    const deathMapX = toMapX(this.getWorldX());
    const deathMapY = toMapY(this.getWorldZ());
    const playerMapX = toMapX(player.getWorldX());
    const playerMapY = toMapY(player.getWorldZ());

    gridWalker.setStartPoint(deathMapX, deathMapY);
    gridWalker.setEndPoint(playerMapX, playerMapY);
    gridWalker.begin();

    while (!gridWalker.isFinished() && gridWalker.getSteps() < 6) {
      gridWalker.step();
      if (tilemap.isSolid(gridWalker.getX(), gridWalker.getY())) {
        return false;
      } else if (gridWalker.getX() === playerMapX && gridWalker.getY() === playerMapY) {
        return true;
      }
    }

    return false;
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
