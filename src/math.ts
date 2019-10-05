export function clamp(x: number, min: number, max: number) {
  if (x < min) return min;
  else if (x > max) return max;
  return x;
}

// sphere-sphere collision
export function collideSS(x0: number, y0: number, z0: number, r0: number, x1: number, y1: number, z1: number, r1: number) {
  const r_2 = r0 * r0 + r1 * r1;
  let dx = x1 - x0;
  let dy = y1 - y0;
  let dz = z1 - z0;
  dx *= dx;
  dy *= dy;
  dz *= dz;
  const d_2 = dx + dy + dz;
  if (r_2 > d_2) {
    return true;
  } else {
    return false;
  }
}
