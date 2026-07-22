import type { Ctx } from './types';

export const VENDING_BASE = 41;
export const VENDING_TOP = 42;

export function removeVendingMachine(ctx: Ctx) {
  const { SX, SY, SZ } = ctx.cfg.mundo;
  for (let y = 1; y < SY; y++) {
    for (let z = 0; z < SZ; z++) {
      for (let x = 0; x < SX; x++) {
        const id = ctx.world.get(x, y, z);
        if (id === VENDING_BASE || id === VENDING_TOP) ctx.world.set(x, y, z, 0);
      }
    }
  }
}

export function spawnVendingMachine(ctx: Ctx): { x: number; y: number; z: number } | null {
  const { SX, SZ } = ctx.cfg.mundo;
  const p = ctx.player;
  for (let tries = 0; tries < 400; tries++) {
    const x = 6 + Math.floor(Math.random() * (SX - 12));
    const z = 6 + Math.floor(Math.random() * (SZ - 12));
    if (Math.abs(x - p.x) < 8 && Math.abs(z - p.z) < 8) continue;
    const h = ctx.world.highestGround(x, z);
    if (h < 1) continue;
    const ground = ctx.world.get(x, h, z);
    if (ground !== 1 && ground !== 4) continue;
    if (ctx.world.get(x, h + 1, z) !== 0 || ctx.world.get(x, h + 2, z) !== 0) continue;
    ctx.world.set(x, h + 1, z, VENDING_BASE);
    ctx.world.set(x, h + 2, z, VENDING_TOP);
    return { x, y: h + 1, z };
  }
  return null;
}
