import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32 } from '../../lib/rng';
import { DIA_S } from './ceu';
import type { RemoteMob, Ctx, Mob } from './types';

const CANDY = 21;
const PACKAGE = 35;

interface Winpup {
  group: THREE.Group;
  x: number; y: number; z: number;
  yaw: number;
  ox: number; oz: number;
  targetX: number; targetZ: number;
  retargetMs: number;
  dropMs: number;
  fleeMs: number;
  phase: number;
  rx: number; ry: number; rz: number; ryaw: number;
}

function part(w: number, h: number, d: number, x: number, y: number, z: number, color: THREE.Color): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  const n = g.attributes.position.count;
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { colors[i * 3] = color.r; colors[i * 3 + 1] = color.g; colors[i * 3 + 2] = color.b; }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
}

function winpupGeometry(): THREE.BufferGeometry {
  const cream = new THREE.Color('#e9e1c6');
  const creamDark = new THREE.Color('#d8cca6');
  const gold = new THREE.Color('#c9a227');
  const goldLight = new THREE.Color('#e6c65a');
  const eye = new THREE.Color('#d8463a');
  const pupil = new THREE.Color('#2a1410');

  const p: THREE.BufferGeometry[] = [
    part(0.72, 0.6, 0.72, 0, 0, 0, cream),
    part(0.8, 0.34, 0.78, 0, 0.28, 0, gold),
    part(0.8, 0.08, 0.8, 0, 0.11, 0, goldLight),
    part(0.16, 0.16, 0.16, -0.16, 0.16, 0.38, creamDark),
    part(0.16, 0.16, 0.16, 0.16, 0.16, 0.38, creamDark),
    part(0.16, 0.16, 0.16, 0, 0.26, 0.4, creamDark),
    part(0.14, 0.14, 0.14, -0.28, 0.02, 0.32, creamDark),
    part(0.14, 0.14, 0.14, 0.28, 0.02, 0.32, creamDark),
    part(0.13, 0.13, 0.13, 0, -0.02, 0.42, creamDark),
    part(0.13, 0.15, 0.05, -0.16, -0.04, -0.37, eye),
    part(0.13, 0.15, 0.05, 0.16, -0.04, -0.37, eye),
    part(0.05, 0.06, 0.04, -0.16, -0.04, -0.39, pupil),
    part(0.05, 0.06, 0.04, 0.16, -0.04, -0.39, pupil),
    part(0.12, 0.1, 0.12, -0.16, -0.34, -0.02, creamDark),
    part(0.12, 0.1, 0.12, 0.16, -0.34, -0.02, creamDark),
  ];
  const geo = mergeGeometries(p)!;
  p.forEach((g) => g.dispose());
  return geo;
}

export function criarMob(ctx: Ctx): Mob {
  const { cfg, world } = ctx;
  const B = cfg.bichos;
  const { SX, SZ } = cfg.mundo;
  const material = new THREE.MeshBasicMaterial({ vertexColors: true });
  const geo = winpupGeometry();
  const alive: Winpup[] = [];
  let timeMs = 0;
  let collectMs = 0;
  let despawnMs = 0;
  const dropped = new Map<number, number>();

  const candyKey = (x: number, y: number, z: number) => x + z * SX + y * SX * SZ;

  const groundAt = (x: number, z: number) =>
    world.highestGround(Math.floor(x), Math.floor(z));

  function hoverY(x: number, z: number): number {
    return groundAt(x, z) + 1 + B.altura;
  }

  function clear() {
    for (const w of alive) ctx.scene.remove(w.group);
    alive.length = 0;
  }

  function newWinpup(x: number, z: number, rng: () => number): Winpup {
    const group = new THREE.Group();
    group.add(new THREE.Mesh(geo, material));
    ctx.scene.add(group);
    const y = hoverY(x, z);
    group.position.set(x, y, z);
    return {
      group, x, y, z, yaw: rng() * Math.PI * 2,
      ox: x, oz: z, targetX: x, targetZ: z,
      retargetMs: 0, dropMs: 1500 + rng() * 4000, fleeMs: 0,
      phase: rng() * Math.PI * 2,
      rx: x, ry: y, rz: z, ryaw: 0,
    };
  }

  function spawn(seed: number) {
    clear();
    timeMs = 0;
    dropped.clear();
    for (let y = 1; y < cfg.mundo.SY; y++)
      for (let z = 0; z < SZ; z++)
        for (let x = 0; x < SX; x++)
          if (world.get(x, y, z) === CANDY) dropped.set(candyKey(x, y, z), B.woolDespawnMs);
    const rng = mulberry32((seed ^ 0x7712bb) >>> 0);
    let tries = 0;
    while (alive.length < B.quantos && tries < 400) {
      tries++;
      const x = 6 + Math.floor(rng() * (SX - 12)) + 0.5;
      const z = 6 + Math.floor(rng() * (SZ - 12)) + 0.5;
      const h = groundAt(x, z);
      if (world.get(Math.floor(x), h, Math.floor(z)) !== 1) continue;
      alive.push(newWinpup(x, z, rng));
    }
  }

  function candyNearby(cx: number, cz: number, surf: number): number {
    let n = 0;
    for (let dz = -5; dz <= 5; dz++) {
      for (let dx = -5; dx <= 5; dx++) {
        if (world.get(cx + dx, surf + 1, cz + dz) === CANDY) n++;
      }
    }
    return n;
  }

  function dropCandy(w: Winpup) {
    const cx = Math.floor(w.x);
    const cz = Math.floor(w.z);
    const surf = groundAt(cx, cz);
    if (surf < 1) return;
    if (world.get(cx, surf + 1, cz) !== 0) return;
    if (candyNearby(cx, cz, surf) >= B.maxLaPerto) return;
    world.set(cx, surf + 1, cz, CANDY);
    dropped.set(candyKey(cx, surf + 1, cz), timeMs + B.woolDespawnMs);
  }

  function despawnCandy() {
    for (const [key, expiresMs] of dropped) {
      if (timeMs < expiresMs) continue;
      const x = key % SX;
      const z = Math.floor(key / SX) % SZ;
      const y = Math.floor(key / (SX * SZ));
      if (world.get(x, y, z) === CANDY) world.set(x, y, z, 0);
      dropped.delete(key);
    }
  }

  function simulate(dt: number) {
    const dtMs = dt * 1000;
    const daytime = ctx.sky.time() < DIA_S;
    for (const w of alive) {
      if (timeMs >= w.retargetMs) {
        const ang = Math.random() * Math.PI * 2;
        const r = Math.random() * B.raioPasseio;
        w.targetX = Math.max(2, Math.min(SX - 2, w.ox + Math.cos(ang) * r));
        w.targetZ = Math.max(2, Math.min(SZ - 2, w.oz + Math.sin(ang) * r));
        w.retargetMs = timeMs + B.trocaAlvoMin + Math.random() * (B.trocaAlvoMax - B.trocaAlvoMin);
      }
      if (w.fleeMs > 0) w.fleeMs = Math.max(0, w.fleeMs - dtMs);
      const speed = w.fleeMs > 0 ? B.passeio * 3.2 : B.passeio;
      const dx = w.targetX - w.x;
      const dz = w.targetZ - w.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.05) {
        const step = Math.min(dist, speed * dt);
        w.x += (dx / dist) * step;
        w.z += (dz / dist) * step;
        w.yaw = Math.atan2(-dx, -dz);
      }
      w.y = hoverY(w.x, w.z);
      if (daytime && timeMs >= w.dropMs) {
        dropCandy(w);
        w.dropMs = timeMs + B.larguraDropMin + Math.random() * (B.larguraDropMax - B.larguraDropMin);
      } else if (!daytime) {
        w.dropMs = Math.max(w.dropMs, timeMs + 4000);
      }
      position(w, w.x, w.y, w.z, w.yaw);
    }
  }

  function position(w: Winpup, x: number, y: number, z: number, yaw: number) {
    const bob = Math.sin(timeMs / 1000 * Math.PI * 2 * B.bobHz + w.phase) * B.bobAmp;
    w.group.position.set(x, y + bob, z);
    w.group.rotation.y = yaw;
  }

  function followNet(dt: number) {
    const k = 1 - Math.exp(-dt * 5);
    for (const w of alive) {
      const dx = w.rx - w.x, dy = w.ry - w.y, dz = w.rz - w.z;
      if (dx * dx + dy * dy + dz * dz > 64) { w.x = w.rx; w.y = w.ry; w.z = w.rz; }
      else { w.x += dx * k; w.y += dy * k; w.z += dz * k; }
      let dyaw = w.ryaw - w.yaw;
      dyaw = ((dyaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
      w.yaw += dyaw * k;
      position(w, w.x, w.y, w.z, w.yaw);
    }
  }

  function collect() {
    const p = ctx.player;
    const halfW = 0.32;
    const x0 = Math.floor(p.x - halfW), x1 = Math.floor(p.x + halfW);
    const z0 = Math.floor(p.z - halfW), z1 = Math.floor(p.z + halfW);
    const y0 = Math.floor(p.y), y1 = Math.floor(p.y + 1);
    let n = 0;
    for (let y = y0; y <= y1; y++)
      for (let z = z0; z <= z1; z++)
        for (let x = x0; x <= x1; x++) {
          const id = world.get(x, y, z);
          if (id === CANDY) { world.set(x, y, z, 0); n++; }
          else if (id === PACKAGE) {
            const m = ctx.metas.get(x, y, z);
            world.set(x, y, z, 0);
            ctx.metas.remove(x, y, z);
            if (m && m.tipo === 'drop') {
              ctx.editing.gainItem(m.item, m.n);
              ctx.audio.soundSaved();
              ctx.ui.showToast('🎁 Pegou ' + m.n + '× ' + ctx.byId(m.item).nome + '!', 'ok', 1400);
            }
          }
        }
    if (n > 0) {
      ctx.editing.gainItem(CANDY, n);
      ctx.audio.soundSaved();
      ctx.ui.showToast(n > 1 ? '🍭 Peguei ' + n + ' algodões-doces!' : '🍭 Peguei um algodão-doce!', 'ok', 1400);
    }
  }

  return {
    spawn,
    step(dt, simulateMobs) {
      timeMs += dt * 1000;
      if (simulateMobs) {
        despawnMs += dt * 1000;
        if (despawnMs >= 1000) { despawnMs = 0; despawnCandy(); }
      }
      if (!alive.length) return;
      if (simulateMobs) simulate(dt);
      else followNet(dt);
      collectMs += dt * 1000;
      if (collectMs >= 120) { collectMs = 0; collect(); }
    },
    applyNet(mobs) {
      for (const b of mobs) {
        const w = alive[b.i];
        if (!w) continue;
        w.rx = b.x; w.ry = b.y; w.rz = b.z; w.ryaw = b.yaw;
      }
    },
    netState(): RemoteMob[] {
      return alive.map((w, i) => ({
        i, x: +w.x.toFixed(2), y: +w.y.toFixed(2), z: +w.z.toFixed(2), yaw: +w.yaw.toFixed(2),
      }));
    },
    scare(ox, oy, oz, fx, fy, fz, range, cone) {
      let best: Winpup | null = null;
      let bestD = Infinity;
      for (const w of alive) {
        const dx = w.x - ox;
        const dy = w.y - oy;
        const dz = w.z - oz;
        const d = Math.hypot(dx, dy, dz);
        if (d > range || d < 0.001) continue;
        if ((fx * dx + fy * dy + fz * dz) / d < cone) continue;
        if (d < bestD) { bestD = d; best = w; }
      }
      if (!best) return false;
      const p = ctx.player;
      let ax = best.x - p.x;
      let az = best.z - p.z;
      const al = Math.hypot(ax, az) || 1;
      ax /= al;
      az /= al;
      best.ox = Math.max(2, Math.min(SX - 2, best.x + ax * 24));
      best.oz = Math.max(2, Math.min(SZ - 2, best.z + az * 24));
      best.targetX = best.ox;
      best.targetZ = best.oz;
      best.retargetMs = timeMs + 6000;
      best.fleeMs = 6000;
      return true;
    },
    clear,
    count: () => alive.length,
  };
}
