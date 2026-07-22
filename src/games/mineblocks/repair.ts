import { gerarMundo } from './geracao';
import type { Ctx } from './types';

const WATER = 13;
const LEGACY_Y0 = 40;
const ARTIFICIAL = new Set([6, 8, 9, 10, 16, 17, 18, 19, 20, 27, 29, 34, 35, 36]);

export function fixSquareLake(ctx: Ctx, blocks: Uint8Array, seed: number, metasRaw: unknown): number {
  const { SX, SZ, SY, nivelAgua } = ctx.cfg.mundo;
  const plane = SX * SZ;

  const candidates = new Set<number>();
  for (let y = nivelAgua + 1; y < SY; y++) {
    const base = y * plane;
    for (let i = 0; i < plane; i++) {
      if (blocks[base + i] === WATER) candidates.add(i);
    }
  }
  if (!candidates.size) return 0;

  const metaCols = new Set<number>();
  if (metasRaw && typeof metasRaw === 'object') {
    for (const k of Object.keys(metasRaw as Record<string, unknown>)) {
      const n = +k;
      if (Number.isInteger(n) && n >= 0) metaCols.add(n % plane);
    }
  }

  gerarMundo(ctx, seed);
  const pristine = ctx.world.data;

  let swapped = 0;
  for (const col of candidates) {
    if (metaCols.has(col)) continue;
    let touched = false;
    for (let y = LEGACY_Y0; y < SY; y++) {
      if (ARTIFICIAL.has(blocks[col + y * plane])) { touched = true; break; }
    }
    if (touched) continue;
    for (let y = LEGACY_Y0; y < SY; y++) {
      blocks[col + y * plane] = pristine[col + y * plane];
    }
    swapped++;
  }

  for (let y = nivelAgua + 1; y < SY; y++) {
    const base = y * plane;
    for (let i = 0; i < plane; i++) {
      if (blocks[base + i] === WATER) blocks[base + i] = 0;
    }
  }

  return swapped || 1;
}
