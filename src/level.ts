import { Tilemap, loadTilemap } from "./tilemap";

export const TILE_SIZE = 32;
export const HALF_TILE = TILE_SIZE / 2;

export function toMapX(worldX: number) {
  return Math.floor(worldX / TILE_SIZE + 0.5);
}

export function toMapY(worldZ: number) {
  return Math.floor(worldZ / TILE_SIZE + 0.5);
}

interface LevelItem {
  type: string;
  x: number;
  y: number;
}

interface LevelObject {
  text: string;
  enableFog: boolean;
  fogDensity?: number;
  fogColor: number[];
  floor: string;
  wall: string;
  music?: string;
  items?: LevelItem[];
}

export class Level {
  public tilemap: Tilemap;
  public enableFog: boolean;
  public fogColor: number[];
  public fogDensity: number;

  public floor: string;
  public wall: string;
  public music?: string;
  public items: LevelItem[];

  constructor(obj: LevelObject) {
    this.tilemap = loadTilemap(obj.text);

    if (obj.fogColor.length !== 4) {
      throw new Error('fogColor must contain 4 components');
    }

    if (obj.fogDensity === undefined) {
      this.fogDensity = 0.03;
    } else {
      this.fogDensity = obj.fogDensity;
    }

    this.fogColor = obj.fogColor;
    this.enableFog = obj.enableFog;

    this.floor = obj.floor;
    this.wall = obj.wall;
    this.music = obj.music;

    if (obj.items) {
      this.items = obj.items;
    } else {
      this.items = [];
    }
  }
}
