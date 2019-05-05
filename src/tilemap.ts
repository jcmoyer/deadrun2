// tile flags
export const SOLID = 0b0000_0001;
export const SPAWN = 0b0000_0010;
export const FLOOR = 0b0000_0100;
export const DEATH = 0b0000_1000;
export const EXIT  = 0b0001_0000;

export class Tile {
  // tile-space coordinates
  x: number;
  y: number;

  flags: number = 0;
}

export class Tilemap {
  private tiles: Array<Tile>;
  private width: number;
  private height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.tiles = new Array<Tile>(width * height);
    for (let y = 0; y < height; ++y) {
      for (let x = 0; x < width; ++x) {
        this.initTile(x, y);
      } 
    }
  }

  isSolid(x: number, y: number): boolean {
    if (!this.inBounds(x, y)) {
      return true;
    }
    return (this.getFlag(x, y) & SOLID) > 0;
  }

  inBounds(x: number, y: number) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  setFlag(x: number, y: number, flag: number) {
    if (x < 0 || x >= this.width) throw new Error('tile coordinate oob');
    if (y < 0 || y >= this.height) throw new Error('tile coordinate oob');
    this.tiles[y * this.width + x].flags |= flag;
  }

  getFlag(x: number, y: number) {
    if (x < 0 || x >= this.width) throw new Error('tile coordinate oob');
    if (y < 0 || y >= this.height) throw new Error('tile coordinate oob');
    return this.tiles[y * this.width + x].flags;
  }

  private initTile(x: number, y: number) {
    if (x < 0 || x >= this.width) throw new Error('tile coordinate oob');
    if (y < 0 || y >= this.height) throw new Error('tile coordinate oob');
    const tile = new Tile();
    tile.x = x;
    tile.y = y;
    this.tiles[y * this.width + x] = tile;
  }

  setTile(x: number, y: number, t: Tile) {
    if (x < 0 || x >= this.width) throw new Error('tile coordinate oob');
    if (y < 0 || y >= this.height) throw new Error('tile coordinate oob');
    this.tiles[y * this.width + x] = t;
  }

  getTile(x: number, y: number): Tile {
    if (x < 0 || x >= this.width) throw new Error('tile coordinate oob');
    if (y < 0 || y >= this.height) throw new Error('tile coordinate oob');
    return this.tiles[y * this.width + x];
  }

  findFirstWithFlag(flag: number): Tile {
    for (let y = 0; y < this.height; ++y) {
      for (let x = 0; x < this.width; ++x) {
        if (this.getFlag(x, y) & flag) {
          return this.tiles[y * this.width + x];
        }
      } 
    }
    throw new Error(`no tile with flag ${flag} set`);
  }

  getSpawnTile(): Tile {
    return this.findFirstWithFlag(SPAWN);
  }

  getExitTile(): Tile {
    return this.findFirstWithFlag(EXIT);
  }

  getWidth() { return this.width; }
  getHeight() { return this.height; }
  
  get size() {
    return this.width * this.height;
  }
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

export function loadTilemap(data: string) {
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
