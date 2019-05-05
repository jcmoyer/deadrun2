import { Level, HALF_TILE, TILE_SIZE } from "./level";
import { buildProgram } from "./glutil";
import { mat4 } from "gl-matrix";
import { Tilemap, SOLID, FLOOR, EXIT } from "./tilemap";

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
uniform highp float fog_density;

void main() {
  highp float dist = gl_FragCoord.z / gl_FragCoord.w;
  highp float fog  = 1.0 / exp(dist * fog_density) * 2.0;
  fog              = clamp(fog, 0.0, 1.0);

  highp vec4 base_color = texture2D(wall_texture, f_texcoord);

  // linear
  //gl_FragColor = mix(base_color, fog_color, clamp(dist / 64.0, 0.0, 1.0));

  // exponential
  gl_FragColor = mix(fog_color, base_color, fog);
}
`;

enum Direction {
  right, up, left, down
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

      // generate border walls only for tiles that are floors or exits
      if (t.flags & FLOOR || t.flags & EXIT) {
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

export default class LevelRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;

  // Shader input locations
  private levelProjUni: WebGLUniformLocation;
  private levelViewUni: WebGLUniformLocation;
  private levelFogColorUni: WebGLUniformLocation;
  private levelFogDensityUni: WebGLUniformLocation;
  private levelPositionAttr: number;
  private levelTexCoordAttr: number;
  private levelShadeAttr: number;
  
  // Level geometry storage
  private wallPosBuffer: WebGLBuffer;
  private wallTexCoordBuffer: WebGLBuffer;
  private wallShadeBuffer: WebGLBuffer;
  private floorPosBuffer: WebGLBuffer;
  private floorTexCoordBuffer: WebGLBuffer;
  private exitPosBuffer: WebGLBuffer;
  private exitTexCoordBuffer: WebGLBuffer;

  // Level textures
  private wallTexture: WebGLTexture;
  private floorTexture: WebGLTexture;
  private exitTexture: WebGLTexture;

  private level: Level;
  private geometry: LevelGeometryBuffers;

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;

    // TODO: error handling
    this.program = buildProgram(this.gl, levelVS, levelFS);
    this.levelProjUni = gl.getUniformLocation(this.program, 'projection');
    this.levelViewUni = gl.getUniformLocation(this.program, 'view');
    this.levelFogColorUni = gl.getUniformLocation(this.program, 'fog_color');
    this.levelFogDensityUni = gl.getUniformLocation(this.program, 'fog_density');
    this.levelPositionAttr = gl.getAttribLocation(this.program, 'position');
    this.levelTexCoordAttr = gl.getAttribLocation(this.program, 'texcoord');
    this.levelShadeAttr = gl.getAttribLocation(this.program, 'shade');

    this.wallPosBuffer = gl.createBuffer();
    this.wallTexCoordBuffer = gl.createBuffer();
    this.wallShadeBuffer = gl.createBuffer();
    this.floorPosBuffer = gl.createBuffer();
    this.floorTexCoordBuffer = gl.createBuffer();
    this.exitPosBuffer = gl.createBuffer();
    this.exitTexCoordBuffer = gl.createBuffer();
  }

  setLevel(level: Level) {
    this.level = level;

    const sparseGeo = generateSparseGeometry(this.level.tilemap);
    const denseGeo = condenseGeometry(sparseGeo);

    this.setGeometry(denseGeo);
  }

  private setGeometry(g: LevelGeometryBuffers) {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.wallPosBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, g.wallVertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.wallTexCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, g.wallTexCoords, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.wallShadeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, g.wallShades, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.floorPosBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, g.floorVertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.floorTexCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, g.floorTexCoords, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.exitPosBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, g.exitFloorVertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.exitTexCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, g.exitFloorTexCoords, gl.STATIC_DRAW);

    this.geometry = g;
  }

  setExitTexture(t: WebGLTexture) {
    this.exitTexture = t;
  }

  setWallTexture(t: WebGLTexture) {
    this.wallTexture = t;
  }

  setFloorTexture(t: WebGLTexture) {
    this.floorTexture = t;
  }

  render(proj: mat4, view: mat4) {
    const gl = this.gl;

    // Set up shared render state
    gl.useProgram(this.program);
    gl.uniformMatrix4fv(this.levelProjUni, false, proj);
    gl.uniformMatrix4fv(this.levelViewUni, false, view);
    gl.uniform4fv(this.levelFogColorUni, this.level.fogColor);
    gl.uniform1f(this.levelFogDensityUni, this.level.fogDensity);

    // Walls
    gl.bindBuffer(gl.ARRAY_BUFFER, this.wallPosBuffer);
    gl.enableVertexAttribArray(this.levelPositionAttr);
    gl.vertexAttribPointer(this.levelPositionAttr, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.wallTexCoordBuffer);
    gl.enableVertexAttribArray(this.levelTexCoordAttr);
    gl.vertexAttribPointer(this.levelTexCoordAttr, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.wallShadeBuffer);
    gl.enableVertexAttribArray(this.levelShadeAttr);
    gl.vertexAttribPointer(this.levelShadeAttr, 1, gl.FLOAT, false, 0, 0);

    gl.bindTexture(gl.TEXTURE_2D, this.wallTexture);

    gl.drawArrays(gl.TRIANGLES, 0, this.geometry.wallVertices.length / 3);

    // Floors
    gl.bindBuffer(gl.ARRAY_BUFFER, this.floorPosBuffer);
    gl.vertexAttribPointer(this.levelPositionAttr, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.floorTexCoordBuffer);
    gl.vertexAttribPointer(this.levelTexCoordAttr, 2, gl.FLOAT, false, 0, 0);

    gl.disableVertexAttribArray(this.levelShadeAttr);

    gl.bindTexture(gl.TEXTURE_2D, this.floorTexture);
    
    gl.drawArrays(gl.TRIANGLES, 0, this.geometry.floorVertices.length / 3);

    // Exit
    gl.bindBuffer(gl.ARRAY_BUFFER, this.exitPosBuffer);
    gl.vertexAttribPointer(this.levelPositionAttr, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.exitTexCoordBuffer);
    gl.vertexAttribPointer(this.levelTexCoordAttr, 2, gl.FLOAT, false, 0, 0);

    gl.bindTexture(gl.TEXTURE_2D, this.exitTexture);

    gl.drawArrays(gl.TRIANGLES, 0, this.geometry.exitFloorVertices.length / 3);
  }
}
