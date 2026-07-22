import type { Ctx } from './types';

export const SHED_SIGN_AUTHOR = 'Yujack';
export const BENCH_FROM_SIGN = { x: -1, y: 0, z: 4 };
export const PATROL_FROM_SIGN = [
  { x: -3, z: -2 },
  { x: 3, z: -1 },
  { x: 0, z: -4 },
];

export function buildShed(ctx: Ctx, rng: () => number, pampaTop: (x: number, z: number) => number): boolean {
  const { world: mundo, cfg } = ctx;
  const { SX, SZ } = cfg.mundo;
  const P = cfg.geracao.pampa;
  for (let tries = 0; tries < 300; tries++) {
    const cx = Math.max(10, Math.min(SX - 11, Math.floor(P.x - P.raio / 2 + rng() * P.raio)));
    const cz = Math.max(10, Math.min(SZ - 11, Math.floor(P.z - P.raio / 2 + rng() * P.raio)));
    const h0 = pampaTop(cx, cz);
    if (h0 <= cfg.mundo.nivelAgua + 2) continue;
    let flat = true;
    for (let dz = -4; dz <= 4 && flat; dz++) {
      for (let dx = -5; dx <= 5 && flat; dx++) {
        const h = pampaTop(cx + dx, cz + dz);
        if (h < 0 || Math.abs(h - h0) > 1) flat = false;
      }
    }
    if (!flat) continue;
    let blocked = false;
    for (let dz = -5; dz <= 5 && !blocked; dz++) {
      for (let dx = -6; dx <= 6 && !blocked; dx++) {
        for (let y = h0 + 1; y <= h0 + 8; y++) {
          if (mundo.get(cx + dx, y, cz + dz) === 5) { blocked = true; break; }
        }
      }
    }
    if (blocked) continue;

    for (let dz = -4; dz <= 4; dz++) {
      for (let dx = -5; dx <= 5; dx++) {
        const x = cx + dx;
        const z = cz + dz;
        for (let y = h0 + 1; y <= h0 + 6; y++) mundo.set(x, y, z, 0);
        mundo.set(x, h0, z, 47);
        if (mundo.get(x, h0 - 1, z) === 0 || mundo.get(x, h0 - 1, z) === 13) mundo.set(x, h0 - 1, z, 2);
      }
    }

    const x0 = cx - 3;
    const z0 = cz - 1;
    for (let dz = 0; dz <= 4; dz++) {
      for (let dx = 0; dx <= 6; dx++) mundo.set(x0 + dx, h0, z0 + dz, 6);
    }
    for (const [px, pz] of [[0, 0], [6, 0], [0, 4], [6, 4]] as const) {
      for (let y = 1; y <= 3; y++) mundo.set(x0 + px, h0 + y, z0 + pz, 5);
    }
    for (let dx = 1; dx <= 5; dx++) {
      for (let y = 1; y <= 3; y++) mundo.set(x0 + dx, h0 + y, z0 + 4, 6);
    }
    for (let dz = 2; dz <= 3; dz++) {
      for (let y = 1; y <= 3; y++) {
        mundo.set(x0, h0 + y, z0 + dz, 6);
        mundo.set(x0 + 6, h0 + y, z0 + dz, 6);
      }
    }
    for (let dz = -1; dz <= 5; dz++) {
      for (let dx = -1; dx <= 7; dx++) mundo.set(x0 + dx, h0 + 4, z0 + dz, 6);
    }
    const signX = cx;
    const signY = h0 + 1;
    const signZ = z0 - 1;
    mundo.set(signX + BENCH_FROM_SIGN.x, signY + BENCH_FROM_SIGN.y, signZ + BENCH_FROM_SIGN.z, 6);
    mundo.set(signX + BENCH_FROM_SIGN.x + 1, signY + BENCH_FROM_SIGN.y, signZ + BENCH_FROM_SIGN.z, 6);
    mundo.set(x0 + 5, h0 + 1, z0 + 3, 27);
    mundo.set(signX, signY, signZ, 20);
    ctx.metas.set(signX, signY, signZ, { tipo: 'placa', autor: SHED_SIGN_AUTHOR, texto: 'Galpão do Yujack — bem-vindo ao Pampa!' });
    return true;
  }
  return false;
}
