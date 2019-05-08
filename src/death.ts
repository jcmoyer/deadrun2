import { vec3, mat4 } from 'gl-matrix';
import { Player } from './player';
import { Tilemap } from './tilemap';
import { toMapX, toMapY } from './level';
import GridWalker from './gridwalker';
import DeathShader from './shaders/death';

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
