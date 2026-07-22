import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32 } from '../../lib/rng';
import { DIA_S } from './ceu';
import type { RemoteMob, Ctx, Mob } from './types';

const CANDY = 21;
const PACKAGE = 35;
const WATER = 13;
const FISH_WIRE_BASE = 8;

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

interface Bubbish {
  group: THREE.Group;
  x: number; y: number; z: number;
  yaw: number;
  targetX: number; targetY: number; targetZ: number;
  retargetMs: number;
  dieMs: number;
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

function bubbishGeometry(): THREE.BufferGeometry {
  const bodyLight = new THREE.Color('#6fa8d8');
  const bodyMid = new THREE.Color('#4c82b8');
  const bodyShadow = new THREE.Color('#2e5e8e');
  const fins = new THREE.Color('#cfe8f2');
  const crystalLight = new THREE.Color('#8b6fd6');
  const crystalShadow = new THREE.Color('#6a45b8');
  const mouth = new THREE.Color('#e6a7b7');
  const white = new THREE.Color('#ffffff');
  const pupil = new THREE.Color('#3a3a3a');

  const p: THREE.BufferGeometry[] = [
    part(0.6, 0.44, 0.64, 0, 0.02, 0, bodyLight),
    part(0.56, 0.1, 0.6, 0, -0.21, 0, bodyShadow),
    part(0.62, 0.28, 0.16, 0, 0, 0.26, bodyMid),
    part(0.34, 0.12, 0.05, 0, -0.11, -0.325, mouth),
    part(0.4, 0.04, 0.05, 0, -0.03, -0.327, bodyShadow),
    part(0.14, 0.16, 0.04, -0.15, 0.08, -0.33, pupil),
    part(0.14, 0.16, 0.04, 0.15, 0.08, -0.33, pupil),
    part(0.05, 0.05, 0.03, -0.12, 0.12, -0.345, white),
    part(0.05, 0.05, 0.03, 0.18, 0.12, -0.345, white),
    part(0.16, 0.1, 0.3, -0.37, -0.14, -0.05, bodyMid),
    part(0.16, 0.1, 0.3, 0.37, -0.14, -0.05, bodyMid),
    part(0.14, 0.09, 0.09, -0.38, -0.16, -0.24, bodyMid),
    part(0.14, 0.09, 0.09, 0.38, -0.16, -0.24, bodyMid),
    part(0.08, 0.28, 0.14, 0, 0.02, 0.4, fins),
    part(0.08, 0.16, 0.1, 0, 0.02, 0.5, fins),
    part(0.14, 0.05, 0.24, 0, 0.25, 0.02, crystalShadow),
    part(0.09, 0.2, 0.09, 0, 0.34, -0.04, crystalLight),
    part(0.08, 0.12, 0.08, 0, 0.3, 0.08, crystalLight),
    part(0.06, 0.08, 0.06, 0, 0.28, -0.14, crystalShadow),
    part(0.05, 0.07, 0.05, -0.2, 0.25, -0.1, bodyMid),
    part(0.05, 0.07, 0.05, 0.22, 0.25, 0.06, bodyMid),
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
  const fishGeo = bubbishGeometry();
  const alive: Winpup[] = [];
  const fish: (Bubbish | null)[] = new Array(FISH_WIRE_BASE).fill(null);
  const F = cfg.peixes;
  let timeMs = 0;
  let collectMs = 0;
  let despawnMs = 0;
  let fishTryMs = 0;
  let nextFishTryMs = 3000;
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
    for (let s = 0; s < fish.length; s++) {
      const f = fish[s];
      if (f) ctx.scene.remove(f.group);
      fish[s] = null;
    }
  }

  function waterTopAt(x: number, z: number): number {
    const cx = Math.floor(x);
    const cz = Math.floor(z);
    for (let y = cfg.mundo.SY - 1; y >= 1; y--) {
      const id = world.get(cx, y, cz);
      if (id === 0) continue;
      return id === WATER ? y : -1;
    }
    return -1;
  }

  function waterDepthAt(x: number, z: number): number {
    const top = waterTopAt(x, z);
    if (top < 0) return 0;
    const cx = Math.floor(x);
    const cz = Math.floor(z);
    let d = 0;
    while (world.get(cx, top - d, cz) === WATER) d++;
    return d;
  }

  const inWater = (x: number, y: number, z: number) =>
    world.get(Math.floor(x), Math.floor(y), Math.floor(z)) === WATER;

  function createFish(x: number, y: number, z: number): Bubbish {
    const group = new THREE.Group();
    group.add(new THREE.Mesh(fishGeo, material));
    ctx.scene.add(group);
    group.position.set(x, y, z);
    return {
      group, x, y, z, yaw: Math.random() * Math.PI * 2,
      targetX: x, targetY: y, targetZ: z,
      retargetMs: 0,
      dieMs: timeMs + F.vidaMinMs + Math.random() * (F.vidaMaxMs - F.vidaMinMs),
      phase: Math.random() * Math.PI * 2,
      rx: x, ry: y, rz: z, ryaw: 0,
    };
  }

  function fishCount(): number {
    let n = 0;
    for (const f of fish) if (f) n++;
    return n;
  }

  function trySpawnFish(x: number, z: number): boolean {
    const slot = fish.indexOf(null);
    if (slot < 0) return false;
    const depth = waterDepthAt(x, z);
    if (depth < 2) return false;
    const top = waterTopAt(x, z);
    const y = top + 0.4 - Math.random() * Math.min(depth - 1, 2);
    fish[slot] = createFish(x, y, z);
    return true;
  }

  function randomFishSpawn() {
    let x: number;
    let z: number;
    if (Math.random() < 0.6) {
      const players = [{ x: ctx.player.x, z: ctx.player.z }];
      for (const a of ctx.avatars.list()) players.push({ x: a.x, z: a.z });
      const p = players[Math.floor(Math.random() * players.length)];
      const ang = Math.random() * Math.PI * 2;
      const r = 6 + Math.random() * 22;
      x = p.x + Math.cos(ang) * r;
      z = p.z + Math.sin(ang) * r;
    } else {
      x = 4 + Math.random() * (SX - 8);
      z = 4 + Math.random() * (SZ - 8);
    }
    if (x < 2 || z < 2 || x > SX - 2 || z > SZ - 2) return;
    trySpawnFish(x, z);
  }

  function positionFish(f: Bubbish) {
    const bob = Math.sin(timeMs / 1000 * Math.PI * 2 * F.bobHz + f.phase) * F.bobAmp;
    f.group.position.set(f.x, f.y + bob, f.z);
    f.group.rotation.y = f.yaw;
    f.group.rotation.z = Math.sin(timeMs / 1000 * 5 + f.phase) * 0.06;
  }

  function simulateFish(dt: number) {
    for (let s = 0; s < fish.length; s++) {
      const f = fish[s];
      if (!f) continue;
      if (timeMs >= f.dieMs) {
        ctx.scene.remove(f.group);
        fish[s] = null;
        continue;
      }
      if (timeMs >= f.retargetMs) {
        f.retargetMs = timeMs + 2500 + Math.random() * 3500;
        for (let t = 0; t < 3; t++) {
          const ang = Math.random() * Math.PI * 2;
          const r = 1 + Math.random() * F.raioPasseio;
          const tx = Math.max(2, Math.min(SX - 2, f.x + Math.cos(ang) * r));
          const tz = Math.max(2, Math.min(SZ - 2, f.z + Math.sin(ang) * r));
          const top = waterTopAt(tx, tz);
          if (top < 0) continue;
          const depth = waterDepthAt(tx, tz);
          if (depth < 1) continue;
          const maxY = top + 0.45;
          const minY = top - depth + 1.3;
          if (maxY <= minY) continue;
          const ty = minY + Math.random() * (maxY - minY);
          if (!inWater(tx, ty, tz)) continue;
          f.targetX = tx;
          f.targetY = ty;
          f.targetZ = tz;
          break;
        }
      }
      const dx = f.targetX - f.x;
      const dy = f.targetY - f.y;
      const dz = f.targetZ - f.z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist > 0.05) {
        const step = Math.min(dist, F.nado * dt);
        const nx = f.x + (dx / dist) * step;
        const ny = f.y + (dy / dist) * step;
        const nz = f.z + (dz / dist) * step;
        if (inWater(nx, ny, nz)) {
          f.x = nx;
          f.y = ny;
          f.z = nz;
          f.yaw = Math.atan2(-dx, -dz);
        } else {
          f.retargetMs = 0;
        }
      }
      positionFish(f);
    }
  }

  function followNetFish(dt: number) {
    const k = 1 - Math.exp(-dt * 5);
    for (const f of fish) {
      if (!f) continue;
      const dx = f.rx - f.x;
      const dy = f.ry - f.y;
      const dz = f.rz - f.z;
      if (dx * dx + dy * dy + dz * dz > 64) {
        f.x = f.rx;
        f.y = f.ry;
        f.z = f.rz;
      } else {
        f.x += dx * k;
        f.y += dy * k;
        f.z += dz * k;
      }
      let dyaw = f.ryaw - f.yaw;
      dyaw = ((dyaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
      f.yaw += dyaw * k;
      positionFish(f);
    }
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
        fishTryMs += dt * 1000;
        if (fishTryMs >= nextFishTryMs) {
          fishTryMs = 0;
          nextFishTryMs = F.tentativaMinMs + Math.random() * (F.tentativaMaxMs - F.tentativaMinMs);
          if (fishCount() < F.max) randomFishSpawn();
        }
        simulateFish(dt);
      } else {
        followNetFish(dt);
      }
      if (!alive.length) return;
      if (simulateMobs) simulate(dt);
      else followNet(dt);
      collectMs += dt * 1000;
      if (collectMs >= 120) { collectMs = 0; collect(); }
    },
    applyNet(mobs) {
      const seen = new Set<number>();
      for (const b of mobs) {
        if (b.i < FISH_WIRE_BASE) {
          const w = alive[b.i];
          if (!w) continue;
          w.rx = b.x; w.ry = b.y; w.rz = b.z; w.ryaw = b.yaw;
          continue;
        }
        const slot = b.i - FISH_WIRE_BASE;
        if (slot >= fish.length) continue;
        seen.add(slot);
        let f = fish[slot];
        if (!f) {
          f = createFish(b.x, b.y, b.z);
          fish[slot] = f;
        }
        f.rx = b.x; f.ry = b.y; f.rz = b.z; f.ryaw = b.yaw;
      }
      for (let s = 0; s < fish.length; s++) {
        const f = fish[s];
        if (f && !seen.has(s)) {
          ctx.scene.remove(f.group);
          fish[s] = null;
        }
      }
    },
    netState(): RemoteMob[] {
      const out: RemoteMob[] = alive.map((w, i) => ({
        i, x: +w.x.toFixed(2), y: +w.y.toFixed(2), z: +w.z.toFixed(2), yaw: +w.yaw.toFixed(2),
      }));
      fish.forEach((f, s) => {
        if (!f) return;
        out.push({
          i: FISH_WIRE_BASE + s,
          x: +f.x.toFixed(2), y: +f.y.toFixed(2), z: +f.z.toFixed(2), yaw: +f.yaw.toFixed(2),
        });
      });
      return out;
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
    fishCount,
    spawnFishAt: (x, z) => trySpawnFish(x, z),
  };
}
