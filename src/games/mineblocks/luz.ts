import type { Ctx, BlockLight } from './types';

const TORCH = 62;
const MAX_LIGHT = 12;

export function createBlockLight(ctx: Ctx): BlockLight {
  const { SX, SZ, SY, CHUNK } = ctx.cfg.mundo;
  const NCX = SX / CHUNK;
  const data = new Uint8Array(SX * SZ * SY);
  const torches = new Set<number>();

  const keyOf = (x: number, y: number, z: number) => x + z * SX + y * SX * SZ;
  const passes = (id: number) => id === 0 || !ctx.byId(id).solido;

  function flood(tx: number, ty: number, tz: number) {
    let frontier: Array<[number, number, number]> = [[tx, ty, tz]];
    if (data[keyOf(tx, ty, tz)] < MAX_LIGHT) data[keyOf(tx, ty, tz)] = MAX_LIGHT;
    for (let level = MAX_LIGHT - 1; level > 0 && frontier.length; level--) {
      const next: Array<[number, number, number]> = [];
      for (const [x, y, z] of frontier) {
        for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const) {
          const nx = x + dx;
          const ny = y + dy;
          const nz = z + dz;
          if (nx < 0 || nx >= SX || nz < 0 || nz >= SZ || ny < 0 || ny >= SY) continue;
          const k = keyOf(nx, ny, nz);
          if (data[k] >= level) continue;
          if (!passes(ctx.world.data[k])) continue;
          data[k] = level;
          next.push([nx, ny, nz]);
        }
      }
      frontier = next;
    }
  }

  function recomputeRegion(cx: number, cy: number, cz: number) {
    const r = MAX_LIGHT;
    const x0 = Math.max(0, cx - r);
    const x1 = Math.min(SX - 1, cx + r);
    const y0 = Math.max(0, cy - r);
    const y1 = Math.min(SY - 1, cy + r);
    const z0 = Math.max(0, cz - r);
    const z1 = Math.min(SZ - 1, cz + r);
    for (let y = y0; y <= y1; y++) {
      for (let z = z0; z <= z1; z++) {
        for (let x = x0; x <= x1; x++) data[keyOf(x, y, z)] = 0;
      }
    }
    for (const k of torches) {
      const tx = k % SX;
      const tz = Math.floor(k / SX) % SZ;
      const ty = Math.floor(k / (SX * SZ));
      if (tx < cx - r * 2 || tx > cx + r * 2 || tz < cz - r * 2 || tz > cz + r * 2 || ty < cy - r * 2 || ty > cy + r * 2) continue;
      flood(tx, ty, tz);
    }
    for (let z = Math.floor(z0 / CHUNK); z <= Math.floor(z1 / CHUNK); z++) {
      for (let x = Math.floor(x0 / CHUNK); x <= Math.floor(x1 / CHUNK); x++) {
        ctx.world.dirty.add(x + z * NCX);
      }
    }
  }

  return {
    level(x, y, z) {
      if (x < 0 || x >= SX || z < 0 || z >= SZ || y < 0 || y >= SY) return 0;
      return data[keyOf(x, y, z)];
    },

    rebuildAll() {
      data.fill(0);
      torches.clear();
      const d = ctx.world.data;
      for (let i = 0; i < d.length; i++) {
        if (d[i] === TORCH) torches.add(i);
      }
      for (const k of torches) {
        flood(k % SX, Math.floor(k / (SX * SZ)), Math.floor(k / SX) % SZ);
      }
    },

    onBlockChange(x, y, z, oldId, newId) {
      const wasTorch = oldId === TORCH;
      const isTorch = newId === TORCH;
      if (!wasTorch && !isTorch) {
        if (!torches.size) return;
        if (passes(oldId) === passes(newId)) return;
        let near = false;
        for (const k of torches) {
          const tx = k % SX;
          const tz = Math.floor(k / SX) % SZ;
          const ty = Math.floor(k / (SX * SZ));
          if (Math.abs(tx - x) <= MAX_LIGHT && Math.abs(tz - z) <= MAX_LIGHT && Math.abs(ty - y) <= MAX_LIGHT) {
            near = true;
            break;
          }
        }
        if (!near) return;
      } else {
        const k = keyOf(x, y, z);
        if (isTorch) torches.add(k);
        if (wasTorch) torches.delete(k);
      }
      recomputeRegion(x, y, z);
    },
  };
}
