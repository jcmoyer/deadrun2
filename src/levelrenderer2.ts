import { Level, TILE_SIZE } from "./level";
import { mat4 } from "gl-matrix";
import LevelShader from './shaders/level';
import { Mesh, buildInterleavedMesh } from "./objloader";

interface MeshTexturePair {
  mesh: Mesh;
  texture: WebGLTexture;
}

export class TileSet {
  private meshes: Map<string, MeshTexturePair>;
  private fallback: string;

  constructor() {
    this.meshes = new Map();
    // floor tile
    this.fallback = '_';
  }

  setMeshTexture(char: string, mesh: Mesh, texture: WebGLTexture) {
    if (this.meshes.has(char)) {
      throw new Error(`${char} already in tileset`);
    }
    this.meshes.set(char, {mesh, texture});
  }

  getMeshTexture(char: string): MeshTexturePair {
    let pair = this.meshes.get(char);
    if (!pair) {
      pair = this.meshes.get(this.fallback);
      if (!pair) {
        throw new Error('fallback not in tileset');
      }
    }
    return pair;
  }
}

interface GeometrySpan {
  texture: WebGLTexture;
  offset: number;
  vertexCount: number;
}

export default class LevelRenderer2 {
  private gl: WebGLRenderingContext;
  private shader: LevelShader;
  
  // Level geometry storage
  private geometry: WebGLBuffer;

  private level: Level;

  private spans: GeometrySpan[] = [];

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.shader = new LevelShader(gl);
    this.geometry = gl.createBuffer();
  }

  setLevel(level: Level, tileset: TileSet) {
    const gl = this.gl;

    this.level = level;

    let vertexSets = new Map<WebGLTexture, number[]>();
    let totalVertexCount = 0;

    for (let y = 0; y < level.tilemap.getHeight(); ++y) {
      for (let x = 0; x < level.tilemap.getWidth(); ++x) {
        const worldX = x * TILE_SIZE;
        const worldZ = y * TILE_SIZE;
        let char = level.tilemap.getTile(x, y).char;
        let meshTexture = tileset.getMeshTexture(char);
        const tileMesh = buildInterleavedMesh(meshTexture.mesh);
        for (let i = 0; i < tileMesh.length; i += 5) {
          tileMesh[i + 0] += worldX;
          tileMesh[i + 2] += worldZ;
        }

        let destinationSet: number[];
        if (vertexSets.has(meshTexture.texture)) {
          destinationSet = vertexSets.get(meshTexture.texture);
        } else {
          destinationSet = [];
        }
        destinationSet = destinationSet.concat(tileMesh);
        vertexSets.set(meshTexture.texture, destinationSet);
        totalVertexCount += tileMesh.length / 5;
      }
    }

    // allocate storage for vertex data
    gl.bindBuffer(gl.ARRAY_BUFFER, this.geometry);
    gl.bufferData(gl.ARRAY_BUFFER, totalVertexCount * 5 * 4, gl.STATIC_DRAW);

    this.spans = [];
    let runningVertexCount = 0;
    for (const [texture, vertexData] of vertexSets.entries()) {
      gl.bufferSubData(gl.ARRAY_BUFFER, runningVertexCount * 5 * 4, new Float32Array(vertexData));
      this.spans.push({
        offset: runningVertexCount,
        texture: texture,
        vertexCount: vertexData.length / 5
      });
      runningVertexCount += vertexData.length / 5;
    }
  }

  render(proj: mat4, view: mat4) {
    const gl = this.gl;

    this.shader.use();
    gl.uniformMatrix4fv(this.shader.uProjection, false, proj);
    gl.uniformMatrix4fv(this.shader.uView, false, view);
    gl.uniform4fv(this.shader.uFogColor, this.level.fogColor);
    gl.uniform1f(this.shader.uFogDensity, this.level.fogDensity);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.geometry);
    gl.enableVertexAttribArray(this.shader.aPosition);
    gl.enableVertexAttribArray(this.shader.aTexcoord);
    gl.disableVertexAttribArray(this.shader.aShade);

    gl.vertexAttribPointer(this.shader.aPosition, 3, gl.FLOAT, false, 20, 0);
    gl.vertexAttribPointer(this.shader.aTexcoord, 2, gl.FLOAT, false, 20, 12);

    for (const span of this.spans) {
      gl.bindTexture(gl.TEXTURE_2D, span.texture);
      gl.drawArrays(gl.TRIANGLES, span.offset, span.vertexCount);
    }
  }
}
