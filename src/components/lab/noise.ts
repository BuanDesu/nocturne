/**
 * Deterministic value noise for the curl field.
 * A LUT is baked from this a few times a second, never per particle per frame.
 */
export function hash2(ix: number, iy: number): number {
  let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function vnoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

export function fbm(x: number, y: number, octaves = 3): number {
  let value = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i += 1) {
    value += amp * vnoise(x * freq, y * freq);
    freq *= 2.03;
    amp *= 0.5;
  }
  return value;
}
