import type { Ctx } from './types';

export const VENDING_IDS = [41, 42, 43, 44];

export function spawnVendingMachine(ctx: Ctx): { x: number; y: number; z: number } | null {
  const { SX, SZ } = ctx.cfg.mundo;
  const p = ctx.player;
  for (let tries = 0; tries < 400; tries++) {
    const x = 6 + Math.floor(Math.random() * (SX - 13));
    const z = 6 + Math.floor(Math.random() * (SZ - 12));
    if (Math.abs(x - p.x) < 8 && Math.abs(z - p.z) < 8) continue;
    const h = ctx.world.highestGround(x, z);
    if (h < 1 || h !== ctx.world.highestGround(x + 1, z)) continue;
    const groundL = ctx.world.get(x, h, z);
    const groundR = ctx.world.get(x + 1, h, z);
    if ((groundL !== 1 && groundL !== 4) || (groundR !== 1 && groundR !== 4)) continue;
    let clear = true;
    for (const dx of [0, 1]) {
      for (const dy of [1, 2]) {
        if (ctx.world.get(x + dx, h + dy, z) !== 0) clear = false;
      }
    }
    if (!clear) continue;
    ctx.world.set(x, h + 1, z, 41);
    ctx.world.set(x, h + 2, z, 42);
    ctx.world.set(x + 1, h + 1, z, 43);
    ctx.world.set(x + 1, h + 2, z, 44);
    return { x, y: h + 1, z };
  }
  return null;
}
