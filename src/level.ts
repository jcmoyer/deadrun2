export const TILE_SIZE = 32;
export const HALF_TILE = TILE_SIZE / 2;

export function toMapX(worldX) {
  return Math.floor(worldX / TILE_SIZE + 0.5);
}

export function toMapY(worldZ) {
  return Math.floor(worldZ / TILE_SIZE + 0.5);
}
