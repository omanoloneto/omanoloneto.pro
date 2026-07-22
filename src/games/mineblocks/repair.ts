import { mulberry32 } from '../../lib/rng';
import { gerarMundo } from './geracao';
import type { Ctx } from './types';

const WATER = 13;
const SAND = 4;
const LEGACY_Y0 = 40;
const BAND_MIN = 4;
const BAND_VAR = 9;
const NOISE_CELL = 8;
const ARTIFICIAL = new Set([6, 8, 9, 10, 16, 17, 18, 19, 20, 27, 29, 34, 35, 36]);

export function naturalizeLegacyLake(ctx: Ctx, blocks: Uint8Array, seed: number, metasRaw: unknown): number {
  const { SX, SZ, SY, nivelAgua } = ctx.cfg.mundo;
  const plane = SX * SZ;

  const isLake = new Uint8Array(plane);
  let found = 0;
  let minX = SX, maxX = 0, minZ = SZ, maxZ = 0, lakeY = 0;
  for (let y = nivelAgua + 1; y < SY; y++) {
    const base = y * plane;
    for (let i = 0; i < plane; i++) {
      if (blocks[base + i] !== WATER) continue;
      if (y > lakeY) lakeY = y;
      if (isLake[i]) continue;
      isLake[i] = 1;
      found++;
      const x = i % SX;
      const z = Math.floor(i / SX);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
  }
  if (!found) return 0;

  const metaCols = new Set<number>();
  if (metasRaw && typeof metasRaw === 'object') {
    for (const k of Object.keys(metasRaw as Record<string, unknown>)) {
      const n = +k;
      if (Number.isInteger(n) && n >= 0) metaCols.add(n % plane);
    }
  }

  gerarMundo(ctx, seed);
  const pristine = ctx.world.data;

  const gridCache = new Map<number, number>();
  function gridNoise(ix: number, iz: number): number {
    const key = ix * 65536 + iz;
    let v = gridCache.get(key);
    if (v === undefined) {
      v = mulberry32((seed ^ (ix * 374761393) ^ (iz * 668265263)) >>> 0)();
      gridCache.set(key, v);
    }
    return v;
  }
  const smooth = (t: number) => t * t * (3 - 2 * t);
  function noise2(x: number, z: number): number {
    const gx = x / NOISE_CELL;
    const gz = z / NOISE_CELL;
    const ix = Math.floor(gx);
    const iz = Math.floor(gz);
    const fx = smooth(gx - ix);
    const fz = smooth(gz - iz);
    const a = gridNoise(ix, iz);
    const b = gridNoise(ix + 1, iz);
    const c = gridNoise(ix, iz + 1);
    const d = gridNoise(ix + 1, iz + 1);
    return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
  }

  function pristineTop(col: number): number {
    for (let y = SY - 1; y > 1; y--) {
      if (pristine[col + y * plane] !== 0) return y;
    }
    return 1;
  }

  let changed = 0;
  for (let z = minZ; z <= maxZ; z++) {
    for (let x = minX; x <= maxX; x++) {
      const col = x + z * SX;
      if (!isLake[col]) continue;
      const d = Math.min(x - minX, maxX - x, z - minZ, maxZ - z);
      const band = BAND_MIN + BAND_VAR * noise2(x, z);
      if (d >= band) continue;
      if (metaCols.has(col)) continue;
      let touched = false;
      for (let y = LEGACY_Y0; y < SY; y++) {
        if (ARTIFICIAL.has(blocks[col + y * plane])) { touched = true; break; }
      }
      if (touched) continue;
      const t = smooth(Math.max(0, Math.min(1, d / band)));
      const ps = pristineTop(col);
      const bankTop = Math.round(ps + (lakeY - ps) * t);
      for (let y = LEGACY_Y0; y < SY; y++) {
        const idx = col + y * plane;
        blocks[idx] = y <= ps ? pristine[idx] : y <= bankTop ? SAND : 0;
      }
      changed++;
    }
  }
  return changed;
}
