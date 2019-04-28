import * as glm from "gl-matrix";
import { Camera } from "./camera";
import { buildProgram, loadTexture } from './glutil';
import { AssetManager } from './assetmanager';
import { Death, DeathRenderer } from './death';
import { Player } from './player';
import { Tilemap, Tile, SOLID, FLOOR, DEATH, SPAWN, EXIT } from './tilemap';
import ExitEmitter from './exitemitter';

import leveldata from "./leveldata";

const orthoQuadVS = `
attribute vec4 position;
attribute vec2 texcoord;

uniform mat4 projection;

varying highp vec2 f_texcoord;

void main() {
  gl_Position = projection * position;
  f_texcoord = texcoord;
}
`;

const orthoQuadFS = `
varying highp vec2 f_texcoord;
uniform sampler2D screentexture;

uniform highp vec4  color;
uniform highp float color_mix;

void main() {
  gl_FragColor = mix(texture2D(screentexture, f_texcoord), color, color_mix);
}
`;

interface LevelObject {
  text: string;
  enableFog: boolean;
  fogColor: number[];
}

enum Direction {
  right, up, left, down
}

function isSpawn(s: string) {
  return s === 'P';
}

function isWall(s: string) {
  return s === '#';
}

function isFloor(s: string) {
  return s === '_' || s === 'D' || s === 'P';
}

function isDeath(s: string) {
  return s === 'D';
}

function isExit(s: string) {
  return s === 'E';
}

const TILE_SIZE = 32;
const HALF_TILE = TILE_SIZE / 2;

function loadTilemap(data: string) {
  data = data.trim();
  const lines = data.split(/\n/g);

  const width = lines[0].length;
  const height = lines.length;

  const tilemap = new Tilemap(width, height);

  for (let y = 0; y < lines.length; ++y) {
    const line = lines[y];
    if (line.length !== width) {
      // TODO subclass error
      throw new Error('FATAL: Inconsistent map width');
    }

    for (let x = 0; x < line.length; ++x) {
      if (isWall(lines[y][x])) {
        tilemap.setFlag(x, y, SOLID);
      }

      if (isSpawn(lines[y][x])) {
        tilemap.setFlag(x, y, SPAWN);
      }

      if (isFloor(lines[y][x])) {
        tilemap.setFlag(x, y, FLOOR);
      }

      if (isDeath(lines[y][x])) {
        tilemap.setFlag(x, y, DEATH);
      }

      if (isExit(lines[y][x])) {
        tilemap.setFlag(x, y, EXIT);
      }
    }
  }

  return tilemap;
}

class Wall {
  public originX: number;
  public originY: number;
  public originZ: number;
  /**
   * Direction the wall faces (i.e. the direction of the wall's normal)
   */
  public direction: Direction;
}

class Floor {
  public originX: number;
  public originY: number;
  public originZ: number;
}

class LevelGeometry {
  public walls: Array<Wall>;
  public floors: Array<Floor>;
  public exitFloor: Floor;
}

function generateSparseGeometry(tilemap: Tilemap) {
  let geo = new LevelGeometry();
  let walls = new Array<Wall>();
  let floors = new Array<Floor>();

  for (let y = 0; y < tilemap.getHeight(); ++y) {
    for (let x = 0; x < tilemap.getWidth(); ++x) {
      const t = tilemap.getTile(x, y);

      // generate border walls
      if (!tilemap.inBounds(x - 1, y) || tilemap.getFlag(x - 1, y) & SOLID) {
        const w = new Wall();
        w.originX = x * TILE_SIZE - HALF_TILE;
        w.originY = 0;
        w.originZ = y * TILE_SIZE;
        w.direction = Direction.right;
        walls.push(w);
      }

      if (!tilemap.inBounds(x + 1, y) || tilemap.getFlag(x + 1, y) & SOLID) {
        const w = new Wall();
        w.originX = x * TILE_SIZE + HALF_TILE;
        w.originY = 0;
        w.originZ = y * TILE_SIZE;
        w.direction = Direction.left;
        walls.push(w);
      }

      if (!tilemap.inBounds(x, y - 1) || tilemap.getFlag(x, y - 1) & SOLID) {
        const w = new Wall();
        w.originX = x * TILE_SIZE;
        w.originY = 0;
        w.originZ = y * TILE_SIZE - HALF_TILE;
        w.direction = Direction.down;
        walls.push(w);
      }

      if (!tilemap.inBounds(x, y + 1) || tilemap.getFlag(x, y + 1) & SOLID) {
        const w = new Wall();
        w.originX = x * TILE_SIZE;
        w.originY = 0;
        w.originZ = y * TILE_SIZE + HALF_TILE;
        w.direction = Direction.up;
        walls.push(w);
      }

      if (tilemap.getFlag(x, y) & FLOOR) {
        const f = new Floor();
        f.originX = x * TILE_SIZE;
        f.originY = 0;
        f.originZ = y * TILE_SIZE;
        floors.push(f);
      }

      if (tilemap.getFlag(x, y) & EXIT) {
        const f = new Floor();
        f.originX = x * TILE_SIZE;
        f.originY = 0;
        f.originZ = y * TILE_SIZE;
        geo.exitFloor = f;
      }
    }
  }

  geo.walls = walls;
  geo.floors = floors;
  return geo;
}

class LevelGeometryBuffers {
  public wallVertices: Float32Array;
  public wallTexCoords: Float32Array;
  public wallShades: Float32Array;

  public floorVertices: Float32Array;
  public floorTexCoords: Float32Array;

  public exitFloorVertices: Float32Array;
  public exitFloorTexCoords: Float32Array;

  constructor(wallCount: number, floorCount: number) {
    this.wallVertices = new Float32Array(wallCount * 6 * 3);
    this.wallTexCoords = new Float32Array(wallCount * 6 * 2);
    this.wallShades = new Float32Array(wallCount * 6);
    this.floorVertices = new Float32Array(floorCount * 6 * 3);
    this.floorTexCoords = new Float32Array(floorCount * 6 * 2);

    this.exitFloorVertices = new Float32Array(1 * 6 * 3);
    this.exitFloorTexCoords = new Float32Array(1 * 6 * 2);
  }
}

function condenseGeometry(geo: LevelGeometry) {
  const buffers = new LevelGeometryBuffers(geo.walls.length, geo.floors.length);

  let vertexOffset = 0;
  let texCoordOffset = 0;
  let shadeOffset = 0;
  let floorVOffset = 0;

  buffers.exitFloorVertices.set([
    geo.exitFloor.originX - HALF_TILE, geo.exitFloor.originY, geo.exitFloor.originZ - HALF_TILE,
    geo.exitFloor.originX - HALF_TILE, geo.exitFloor.originY, geo.exitFloor.originZ + HALF_TILE,
    geo.exitFloor.originX + HALF_TILE, geo.exitFloor.originY, geo.exitFloor.originZ - HALF_TILE,

    geo.exitFloor.originX + HALF_TILE, geo.exitFloor.originY, geo.exitFloor.originZ - HALF_TILE,
    geo.exitFloor.originX - HALF_TILE, geo.exitFloor.originY, geo.exitFloor.originZ + HALF_TILE,
    geo.exitFloor.originX + HALF_TILE, geo.exitFloor.originY, geo.exitFloor.originZ + HALF_TILE,
  ]);
  buffers.exitFloorTexCoords.set([
    0, 0,
    0, 1,
    1, 0,

    1, 0,
    0, 1,
    1, 1
  ]);

  for (let floor of geo.floors) {
    buffers.floorVertices.set([
      floor.originX - HALF_TILE, floor.originY, floor.originZ - HALF_TILE,
      floor.originX - HALF_TILE, floor.originY, floor.originZ + HALF_TILE,
      floor.originX + HALF_TILE, floor.originY, floor.originZ - HALF_TILE,

      floor.originX + HALF_TILE, floor.originY, floor.originZ - HALF_TILE,
      floor.originX - HALF_TILE, floor.originY, floor.originZ + HALF_TILE,
      floor.originX + HALF_TILE, floor.originY, floor.originZ + HALF_TILE,
    ], floorVOffset);
    floorVOffset += 6 * 3;

    buffers.floorTexCoords.set([
      0, 0,
      0, 1,
      1, 0,

      1, 0,
      0, 1,
      1, 1
    ], texCoordOffset);
    texCoordOffset += 6 * 2;
  }

  texCoordOffset = 0;

  for (let wall of geo.walls) {
    buffers.wallTexCoords.set([
      0, 0,
      0, 1,
      1, 0,

      1, 0,
      0, 1,
      1, 1
    ], texCoordOffset);

    if (wall.direction == Direction.down) {
      buffers.wallVertices.set([
        wall.originX - HALF_TILE, wall.originY + TILE_SIZE, wall.originZ,
        wall.originX - HALF_TILE, wall.originY, wall.originZ,
        wall.originX + HALF_TILE, wall.originY + TILE_SIZE, wall.originZ,

        wall.originX + HALF_TILE, wall.originY + TILE_SIZE, wall.originZ,
        wall.originX - HALF_TILE, wall.originY, wall.originZ,
        wall.originX + HALF_TILE, wall.originY, wall.originZ,
      ], vertexOffset);
    }

    if (wall.direction == Direction.up) {
      buffers.wallVertices.set([
        wall.originX + HALF_TILE, wall.originY + TILE_SIZE, wall.originZ,
        wall.originX + HALF_TILE, wall.originY, wall.originZ,
        wall.originX - HALF_TILE, wall.originY + TILE_SIZE, wall.originZ,

        wall.originX - HALF_TILE, wall.originY + TILE_SIZE, wall.originZ,
        wall.originX + HALF_TILE, wall.originY, wall.originZ,
        wall.originX - HALF_TILE, wall.originY, wall.originZ,
      ], vertexOffset);
    }

    if (wall.direction == Direction.left) {
      buffers.wallVertices.set([
        wall.originX, wall.originY + TILE_SIZE, wall.originZ - HALF_TILE,
        wall.originX, wall.originY, wall.originZ - HALF_TILE,
        wall.originX, wall.originY + TILE_SIZE, wall.originZ + HALF_TILE,

        wall.originX, wall.originY + TILE_SIZE, wall.originZ + HALF_TILE,
        wall.originX, wall.originY, wall.originZ - HALF_TILE,
        wall.originX, wall.originY, wall.originZ + HALF_TILE,
      ], vertexOffset);
    }

    if (wall.direction == Direction.right) {
      buffers.wallVertices.set([
        wall.originX, wall.originY + TILE_SIZE, wall.originZ + HALF_TILE,
        wall.originX, wall.originY, wall.originZ + HALF_TILE,
        wall.originX, wall.originY + TILE_SIZE, wall.originZ - HALF_TILE,

        wall.originX, wall.originY + TILE_SIZE, wall.originZ - HALF_TILE,
        wall.originX, wall.originY, wall.originZ + HALF_TILE,
        wall.originX, wall.originY, wall.originZ - HALF_TILE,
      ], vertexOffset);
    }

    let shadeAmount = 0.6;
    if (wall.direction == Direction.down) {
      shadeAmount = 1;
    } else if (wall.direction == Direction.left) {
      shadeAmount = 0.8;
    } else if (wall.direction == Direction.right) {
      shadeAmount = 0.7;
    }

    buffers.wallShades.set([
      shadeAmount, shadeAmount, shadeAmount, shadeAmount, shadeAmount, shadeAmount
    ], shadeOffset);

    vertexOffset += 6 * 3;
    shadeOffset += 6;
    texCoordOffset += 6 * 2;
  }

  return buffers;
}

class Level {
  public tilemap: Tilemap;
  public enableFog: boolean;
  public fogColor: number[];

  public geometry: LevelGeometry;
  public geometryBuffers: LevelGeometryBuffers;

  constructor(obj: LevelObject) {
    this.tilemap = loadTilemap(obj.text);
    this.geometry = generateSparseGeometry(this.tilemap);
    this.geometryBuffers = condenseGeometry(this.geometry);

    if (obj.fogColor.length !== 4) {
      throw new Error('fogColor must contain 4 components');
    }

    this.fogColor = obj.fogColor;
    this.enableFog = obj.enableFog;
  }
}

const levelVS = `
attribute vec4  position;
attribute vec2  texcoord;

attribute float shade;

uniform mat4 view;
uniform mat4 projection;

varying highp float f_shade;
varying vec2        f_texcoord;


void main() {
  gl_Position = projection * view * position;
  f_shade     = shade;
  f_texcoord  = texcoord;
}
`;

const levelFS = `
varying highp float f_shade;
varying highp vec2  f_texcoord;

uniform sampler2D   wall_texture;
uniform highp vec4  fog_color;

void main() {
  highp float dist = gl_FragCoord.z / gl_FragCoord.w;
  highp float fog  = 1.0 / exp(dist * 0.03) * 2.0;
  fog              = clamp(fog, 0.0, 1.0);

  highp vec4 base_color = texture2D(wall_texture, f_texcoord);

  // linear
  //gl_FragColor = mix(base_color, fog_color, clamp(dist / 64.0, 0.0, 1.0));

  // exponential
  gl_FragColor = mix(fog_color, base_color, fog);
}
`;

function toMapX(worldX) {
  return Math.floor(worldX / TILE_SIZE + 0.5);
}

function toMapY(worldZ) {
  return Math.floor(worldZ / TILE_SIZE + 0.5);
}

export default class Game {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private renderClosure: any;

  private projMatrix: glm.mat4;
  private camera: Camera;
  private player: Player = new Player();
  private enemies: Death[];

  private wallPosBuffer: WebGLBuffer;
  private wallTexCoordBuffer: WebGLBuffer;
  private wallShadeBuffer: WebGLBuffer;

  private floorPosBuffer: WebGLBuffer;
  private floorTexCoordBuffer: WebGLBuffer;

  private exitPosBuffer: WebGLBuffer;
  private exitTexCoordBuffer: WebGLBuffer;

  private levelProg: WebGLProgram;

  private keyboard = new Map<string, boolean>();
  private havePointerLock = false;

  private lastUpdate = Date.now();
  private pendingUpdateTime = 0;

  private yawQueue = 0;

  private wallTexture: WebGLTexture;
  private floorTexture: WebGLTexture;
  private exitTexture: WebGLTexture;

  private level: Level;
  private levelID: number = 0;

  private music: HTMLAudioElement;
  private deathRenderer: DeathRenderer;

  private assetMan: AssetManager;
  private exitEmitter: ExitEmitter;

  private gameFinished = false;
  private gameFinishedCallback;

  private fb: WebGLFramebuffer;
  private fbTexture: WebGLTexture;
  private fbDepthBuffer: WebGLRenderbuffer;

  private orthoProj: glm.mat4;
  private orthoProgram: WebGLProgram;
  private orthoBuffer: WebGLBuffer;

  private fadeTimer: number = 2000;
  private fadeColor = [0, 0, 0, 1];
  private fadeDirection = 'in';
  private paused = false;

  constructor(canvas: HTMLCanvasElement, am: AssetManager) {
    this.assetMan = am;

    this.canvas = canvas;
    this.gl = this.canvas.getContext('webgl');

    this.camera = new Camera();
    this.camera.setEye(0, 16, 0);

    const gl = this.gl;

    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    this.wallPosBuffer = gl.createBuffer();
    this.wallTexCoordBuffer = gl.createBuffer();
    this.wallShadeBuffer = gl.createBuffer();

    this.floorPosBuffer = gl.createBuffer();
    this.floorTexCoordBuffer = gl.createBuffer();

    this.exitPosBuffer = gl.createBuffer();
    this.exitTexCoordBuffer = gl.createBuffer();

    // TODO: error handling
    this.levelProg = buildProgram(this.gl, levelVS, levelFS);

    this.wallTexture = loadTexture(gl, am.getImage('wall'));
    this.floorTexture = loadTexture(gl, am.getImage('floor'));
    this.exitTexture = loadTexture(gl, am.getImage('exitfloor'));

    this.deathRenderer = new DeathRenderer(gl);
    this.deathRenderer.setTexture(loadTexture(gl, am.getImage('death')));

    this.music = am.getAudio('music');
    this.music.loop = true;

    this.exitEmitter = new ExitEmitter(gl);

    this.fb = gl.createFramebuffer();
    this.createFBTexture();

    this.orthoProgram = buildProgram(gl, orthoQuadVS, orthoQuadFS);

    this.orthoBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.orthoBuffer);
    const orthoVerts = [
      -1, 1, 0, 0, 1,
      -1, -1, 0, 0, 0,
      1, -1, 0, 1, 0,

      1, -1, 0, 1, 0,
      1, 1, 0, 1, 1,
      -1, 1, 0, 0, 1,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(orthoVerts), gl.STATIC_DRAW);

    this.setLevel(new Level(leveldata[this.levelID]));
  }

  update(dt) {
    if (this.paused) {
      this.yawQueue = 0;
      this.player.beginUpdate();
      for (let death of this.enemies) {
        death.beginUpdate();
      }
      return;
    }
    this.player.beginUpdate();

    const old_px = this.player.getWorldX();
    const old_pz = this.player.getWorldZ();

    if (this.keyboard.get('w')) {
      this.player.move(1);
    }
    if (this.keyboard.get('s')) {
      this.player.move(-1);
    }
    if (this.keyboard.get('a')) {
      this.player.strafe(-1);
    }
    if (this.keyboard.get('d')) {
      this.player.strafe(1);
    }

    let new_px = this.player.getWorldX();
    let new_pz = this.player.getWorldZ();

    // step one axis at a time so the player can slide against walls
    // however this is super jank and will probably break
    // need to do aabb or something but didn't have time to read up on 3d
    // collisions so this is a poor adaptation of a 2d method

    const tilemap = this.level.tilemap;

    if (tilemap.isSolid(toMapX(new_px), toMapY(old_pz))) {
      new_px = old_px;
    }

    if (tilemap.isSolid(toMapX(new_px), toMapY(new_pz))) {
      new_pz = old_pz;
    }

    this.player.setWorldPos(new_px, new_pz);

    const playerMapX = toMapX(this.player.getWorldX());
    const playerMapY = toMapY(this.player.getWorldZ());

    const exitTile = this.level.tilemap.getExitTile();

    for (let death of this.enemies) {
      const deathMapX = toMapX(death.getWorldX());
      const deathMapY = toMapY(death.getWorldZ());
      if (playerMapX == deathMapX && playerMapY == deathMapY) {
        this.killPlayer();
        return;
      }
    }


    if (playerMapX == exitTile.x && playerMapY == exitTile.y) {
      this.nextLevel();
      return;
    }

    for (let death of this.enemies) {
      death.update(this.player);
    }

    // TODO: clean this up by converting player worldpos to vec3...
    const playerWorld = glm.vec3.create();
    glm.vec3.set(playerWorld, this.player.pos[0], 16, this.player.pos[1]);
    this.enemies.sort((a, b) => {
      return glm.vec3.dist(playerWorld, b.worldPos) - glm.vec3.dist(playerWorld, a.worldPos);
    });

    this.exitEmitter.update();

    // TODO does this also need to be interpolated?
    this.player.addYaw(this.yawQueue);
    this.yawQueue = 0;
  }

  render() {
    const gl = this.gl;

    const now = Date.now();
    const last = this.lastUpdate;
    const elapsed = now - last;
    this.pendingUpdateTime += elapsed;

    const UPDATE_HZ = 30;
    const UPDATE_FRAME_MS = 1000 / UPDATE_HZ;

    while (this.pendingUpdateTime >= UPDATE_FRAME_MS) {
      this.update(UPDATE_FRAME_MS);
      this.pendingUpdateTime -= UPDATE_FRAME_MS;
      this.fadeTimer -= UPDATE_FRAME_MS;
    }

    let alpha = this.pendingUpdateTime / UPDATE_FRAME_MS;
    if (this.paused) {
      alpha = 0;
    }

    this.lastUpdate = now;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);


    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(this.levelProg);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.levelProg, 'projection'), false, this.projMatrix);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.levelProg, 'view'), false,
      this.player.getInterpolatedViewMatrix(alpha)
    );
    gl.uniform4f(gl.getUniformLocation(this.levelProg, 'fog_color'),
      this.level.fogColor[0],
      this.level.fogColor[1],
      this.level.fogColor[2],
      this.level.fogColor[3]
    );

    gl.bindBuffer(gl.ARRAY_BUFFER, this.wallPosBuffer);
    const positionAttrib = gl.getAttribLocation(this.levelProg, 'position');
    gl.enableVertexAttribArray(positionAttrib);
    gl.vertexAttribPointer(positionAttrib, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.wallTexCoordBuffer);
    const texCoordAttrib = gl.getAttribLocation(this.levelProg, 'texcoord');
    gl.enableVertexAttribArray(texCoordAttrib);
    gl.vertexAttribPointer(texCoordAttrib, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.wallShadeBuffer);
    const shadeAttrib = gl.getAttribLocation(this.levelProg, 'shade');
    gl.enableVertexAttribArray(shadeAttrib);
    gl.vertexAttribPointer(shadeAttrib, 1, gl.FLOAT, false, 0, 0);

    gl.bindTexture(gl.TEXTURE_2D, this.wallTexture);

    gl.drawArrays(gl.TRIANGLES, 0, this.level.geometryBuffers.wallVertices.length / 3);

    // draw floors
    gl.bindBuffer(gl.ARRAY_BUFFER, this.floorPosBuffer);
    gl.vertexAttribPointer(positionAttrib, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.floorTexCoordBuffer);
    gl.vertexAttribPointer(texCoordAttrib, 2, gl.FLOAT, false, 0, 0);

    gl.disableVertexAttribArray(shadeAttrib);

    gl.bindTexture(gl.TEXTURE_2D, this.floorTexture);
    gl.drawArrays(gl.TRIANGLES, 0, this.level.geometryBuffers.floorVertices.length / 3);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.exitPosBuffer);
    gl.vertexAttribPointer(positionAttrib, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.exitTexCoordBuffer);
    gl.vertexAttribPointer(texCoordAttrib, 2, gl.FLOAT, false, 0, 0);
    gl.bindTexture(gl.TEXTURE_2D, this.exitTexture);

    gl.drawArrays(gl.TRIANGLES, 0, this.level.geometryBuffers.exitFloorVertices.length / 3);

    for (let death of this.enemies) {
      this.deathRenderer.render(death, this.player.getInterpolatedViewMatrix(alpha), this.projMatrix, this.level.fogColor, alpha);
    }

    //
    this.exitEmitter.render(this.player.getInterpolatedViewMatrix(alpha), this.projMatrix, this.level.fogColor, alpha);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.useProgram(this.orthoProgram);
    const orthoProjUni = gl.getUniformLocation(this.orthoProgram, 'projection');
    const orthoColorUni = gl.getUniformLocation(this.orthoProgram, 'color');
    const orthoColorMixUni = gl.getUniformLocation(this.orthoProgram, 'color_mix');
    gl.uniformMatrix4fv(orthoProjUni, false, this.orthoProj);
    gl.uniform4fv(orthoColorUni, this.fadeColor);
    gl.uniform1f(orthoColorMixUni, this.getFadeAmount());

    const orthoPosAttr = gl.getAttribLocation(this.orthoProgram, 'position');
    const orthoTexCoordAttr = gl.getAttribLocation(this.orthoProgram, 'texcoord');


    gl.bindBuffer(gl.ARRAY_BUFFER, this.orthoBuffer);
    gl.enableVertexAttribArray(orthoPosAttr);
    gl.vertexAttribPointer(orthoPosAttr, 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(orthoTexCoordAttr);
    gl.vertexAttribPointer(orthoTexCoordAttr, 2, gl.FLOAT, false, 20, 12);

    gl.bindTexture(gl.TEXTURE_2D, this.fbTexture);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    if (!this.gameFinished) {
      window.requestAnimationFrame(this.renderClosure);
    }
  }

  run() {
    window.addEventListener('resize', this.performLayout.bind(this));
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
    this.canvas.addEventListener('click', this.onCanvasClick.bind(this));
    this.canvas.addEventListener('mousemove', this.onCanvasMouseMove.bind(this));
    document.addEventListener('pointerlockchange', this.onPointerLockChange.bind(this));

    // perform initial layout since canvas backbuffer dimensions are certainly incorrect
    this.performLayout();

    // store bound render function to avoid allocating every frame
    this.renderClosure = this.render.bind(this);

    // start the render loop
    window.requestAnimationFrame(this.renderClosure);
  }

  onKeyDown(e: KeyboardEvent) {
    this.keyboard.set(e.key, true);
  }

  onKeyUp(e: KeyboardEvent) {
    this.keyboard.set(e.key, false);
  }

  onCanvasClick() {
    if (!this.havePointerLock) {
      this.canvas.requestPointerLock();
      this.canvas.requestFullscreen();

      if (this.music.paused) {
        try {
          this.music.play();
        } catch {
          // TODO
          // this might fail to play if the context is one where the event is
          // not user-initiated, I don't have time to research workarounds now
        }
      }

    }
  }

  onCanvasMouseMove(e: MouseEvent) {
    if (this.havePointerLock) {
      this.yawQueue += e.movementX / 100;
    }
  }

  onPointerLockChange() {
    this.havePointerLock = !this.havePointerLock;
  }

  performLayout() {
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.projMatrix = glm.mat4.perspective(
      glm.mat4.create(), Math.PI / 2, this.canvas.width / this.canvas.height, 1, 1000
    );
    this.orthoProj = glm.mat4.ortho(
      glm.mat4.create(),
      -1, 1, -1, 1, 0, 1
    );
    this.createFBTexture();
  }

  createFBTexture() {
    const gl = this.gl;
    gl.deleteTexture(this.fbTexture);
    this.fbTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.fbTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.canvas.width, this.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    gl.deleteRenderbuffer(this.fbDepthBuffer);
    this.fbDepthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.fbDepthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.canvas.width, this.canvas.height);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.fbTexture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.fbDepthBuffer);
  }

  killPlayer() {
    this.assetMan.tryPlayAudio('playerdeath');
    this.player.dead = true;
    this.fadeTimer = 2000;
    this.fadeColor = [125 / 255, 0, 0, 1];
    this.paused = true;
    this.fadeDirection = 'out';
    setTimeout(() => {
      this.setLevel(new Level(leveldata[this.levelID]));
      this.fadeTimer = 2000;
      this.fadeDirection = 'in';
      setTimeout(() => {
        this.paused = false;
      }, 2000);
    }, 2000);
  }

  getFadeAmount() {
    const a = Math.max(this.fadeTimer / 2000, 0);

    if (this.fadeDirection === 'in') {
      return a;
    } else {
      return 1 - a;
    }
  }

  setLevel(level: Level) {
    const gl = this.gl;

    this.level = level;

    const spawn = this.level.tilemap.getSpawnTile();
    this.player.setWorldPos(
      spawn.x * TILE_SIZE,
      spawn.y * TILE_SIZE
    );
    // HACK this syncs prev and current pos
    this.player.beginUpdate();
    this.player.resetYaw();

    this.enemies = [];

    for (let y = 0; y < this.level.tilemap.getHeight(); ++y) {
      for (let x = 0; x < this.level.tilemap.getWidth(); ++x) {
        if (this.level.tilemap.getFlag(x, y) & DEATH) {
          const death = new Death();
          death.setWorldPos(
            x * TILE_SIZE,
            y * TILE_SIZE
          );
          this.enemies.push(death);
        }
      }
    }

    const exit = this.level.tilemap.getExitTile();
    this.exitEmitter.setWorldPos(exit.x * TILE_SIZE, exit.y * TILE_SIZE);

    gl.clearColor(
      this.level.fogColor[0],
      this.level.fogColor[1],
      this.level.fogColor[2],
      this.level.fogColor[3]
    );

    // fill geometry buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, this.wallPosBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.level.geometryBuffers.wallVertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.wallTexCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.level.geometryBuffers.wallTexCoords, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.wallShadeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.level.geometryBuffers.wallShades, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.floorPosBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.level.geometryBuffers.floorVertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.floorTexCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.level.geometryBuffers.floorTexCoords, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.exitPosBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.level.geometryBuffers.exitFloorVertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.exitTexCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.level.geometryBuffers.exitFloorTexCoords, gl.STATIC_DRAW);
  }

  nextLevel() {
    this.assetMan.tryPlayAudio('levelcomplete');

    this.fadeTimer = 2000;
    this.fadeColor = [0, 0, 0, 1];
    this.paused = true;
    this.fadeDirection = 'out';
    setTimeout(() => {
      ++this.levelID;
      if (this.levelID === leveldata.length) {
        this.win();
        return;
      }
      this.setLevel(new Level(leveldata[this.levelID]));
      this.fadeTimer = 2000;
      this.fadeDirection = 'in';
      setTimeout(() => {
        this.paused = false;
      }, 2000);
    }, 2000);
  }

  onGameFinished(f) {
    this.gameFinishedCallback = f;
  }

  win() {
    document.exitPointerLock();
    document.exitFullscreen();

    this.gameFinished = true;
    this.gameFinishedCallback();
  }
}
