import * as THREE from 'three';
import { mulberry32 } from '../../lib/rng';
import { coloredBox, mergeParts, QuadBatch, textSprite } from './mesh';
import type { City, Ctx, SurfaceKind } from './types';

const GRASS = 0;
const ROAD = 1;
const WATER = 2;
const RAIL = 3;
const BUILD = 4;
const PARK = 5;
const BRIDGE = 6;
const RAILBRIDGE = 7;

export function createCity(ctx: Ctx): City {
  const { cfg, map } = ctx;
  const K = cfg.cores;
  const T = cfg.mundo.tamanho;
  const CELL = cfg.mundo.celula;
  const N = Math.floor(T / CELL);
  const HALF = T / 2;
  const grid = new Uint8Array(N * N);
  const tops = new Float32Array(N * N);
  const rng = mulberry32(20260722);

  const cellOf = (v: number) => Math.max(0, Math.min(N - 1, Math.floor((v + HALF) / CELL)));
  const centerOf = (c: number) => c * CELL - HALF + CELL / 2;
  const at = (cx: number, cz: number) => grid[cx + cz * N];
  const set = (cx: number, cz: number, t: number) => { grid[cx + cz * N] = t; };

  function fillRect(x1: number, z1: number, x2: number, z2: number, t: number) {
    const cx1 = cellOf(Math.min(x1, x2));
    const cx2 = cellOf(Math.max(x1, x2) - 0.01);
    const cz1 = cellOf(Math.min(z1, z2));
    const cz2 = cellOf(Math.max(z1, z2) - 0.01);
    for (let cz = cz1; cz <= cz2; cz++) {
      for (let cx = cx1; cx <= cx2; cx++) set(cx, cz, t);
    }
  }

  function paintSegment(x1: number, z1: number, x2: number, z2: number, w: number, t: number, skip?: number) {
    const half = w / 2;
    const cx1 = cellOf(Math.min(x1, x2) - half);
    const cx2 = cellOf(Math.max(x1, x2) + half);
    const cz1 = cellOf(Math.min(z1, z2) - half);
    const cz2 = cellOf(Math.max(z1, z2) + half);
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len2 = dx * dx + dz * dz || 1;
    for (let cz = cz1; cz <= cz2; cz++) {
      for (let cx = cx1; cx <= cx2; cx++) {
        if (skip !== undefined && at(cx, cz) === skip) continue;
        const px = centerOf(cx);
        const pz = centerOf(cz);
        const u = Math.max(0, Math.min(1, ((px - x1) * dx + (pz - z1) * dz) / len2));
        const qx = x1 + dx * u - px;
        const qz = z1 + dz * u - pz;
        if (qx * qx + qz * qz <= half * half) set(cx, cz, t);
      }
    }
  }

  const rio = map.rio;
  const riverCenter = (x: number) =>
    rio.zCentro + rio.onda1.amp * Math.sin(x / rio.onda1.freq + rio.onda1.fase) + rio.onda2.amp * Math.sin(x / rio.onda2.freq + rio.onda2.fase);
  const riverHalf = (x: number) => rio.meia + rio.meiaOnda.amp * Math.sin(x / rio.meiaOnda.freq + rio.meiaOnda.fase);
  const inRiver = (x: number, z: number) => Math.abs(z - riverCenter(x)) <= riverHalf(x);

  for (const p of map.pracas) fillRect(p.x1, p.z1, p.x2, p.z2, PARK);
  for (const r of map.ruas) paintSegment(r.x1, r.z1, r.x2, r.z2, r.w, ROAD);
  paintSegment(map.trilho.x1, map.trilho.z1, map.trilho.x2, map.trilho.z2, map.trilho.w, RAIL, ROAD);
  for (let cz = 0; cz < N; cz++) {
    for (let cx = 0; cx < N; cx++) {
      const x = centerOf(cx);
      const z = centerOf(cz);
      if (!inRiver(x, z)) continue;
      const t = at(cx, cz);
      if (t === ROAD && map.pontes.some((p) => Math.abs(x - p.x) <= p.w / 2)) set(cx, cz, BRIDGE);
      else if (t === RAIL) set(cx, cz, RAILBRIDGE);
      else set(cx, cz, WATER);
    }
  }

  interface Building { x: number; z: number; w: number; d: number; h: number; body: string; win: string | null; roof: boolean }
  const buildings: Building[] = [];

  function stampBuilding(b: Building) {
    const cx1 = cellOf(b.x - b.w / 2);
    const cx2 = cellOf(b.x + b.w / 2 - 0.01);
    const cz1 = cellOf(b.z - b.d / 2);
    const cz2 = cellOf(b.z + b.d / 2 - 0.01);
    for (let cz = cz1; cz <= cz2; cz++) {
      for (let cx = cx1; cx <= cx2; cx++) {
        set(cx, cz, BUILD);
        tops[cx + cz * N] = b.h;
      }
    }
    buildings.push(b);
  }

  for (const m of map.marcos) {
    if (!m.predio) continue;
    stampBuilding({ x: m.x, z: m.z, w: m.predio.w, d: m.predio.d, h: m.predio.h, body: m.predio.cor, win: K.janelas[0], roof: false });
  }

  const centro = map.centro;
  for (let cz = 1; cz < N - 3; cz += 3) {
    for (let cx = 1; cx < N - 3; cx += 3) {
      let free = true;
      for (let dz = 0; dz < 2 && free; dz++) {
        for (let dx = 0; dx < 2 && free; dx++) {
          if (at(cx + dx, cz + dz) !== GRASS) free = false;
        }
      }
      if (!free) continue;
      let nearRoad = false;
      for (let dz = -2; dz <= 3 && !nearRoad; dz++) {
        for (let dx = -2; dx <= 3 && !nearRoad; dx++) {
          const nx = cx + dx;
          const nz = cz + dz;
          if (nx < 0 || nz < 0 || nx >= N || nz >= N) continue;
          const t = at(nx, nz);
          if (t === ROAD || t === BRIDGE) nearRoad = true;
        }
      }
      if (!nearRoad || rng() > 0.72) continue;
      const wx = centerOf(cx) + CELL / 2;
      const wz = centerOf(cz) + CELL / 2;
      const inCentro = wx >= centro.x1 && wx <= centro.x2 && wz >= centro.z1 && wz <= centro.z2;
      if (inCentro) {
        stampBuilding({
          x: wx,
          z: wz,
          w: 7,
          d: 7,
          h: 9 + rng() * 19,
          body: K.predios[Math.floor(rng() * K.predios.length)],
          win: K.janelas[Math.floor(rng() * K.janelas.length)],
          roof: false,
        });
      } else {
        stampBuilding({
          x: wx,
          z: wz,
          w: 5.5 + rng() * 1.5,
          d: 5.5 + rng() * 1.5,
          h: 3.2 + rng() * 2.4,
          body: K.casas[Math.floor(rng() * K.casas.length)],
          win: rng() < 0.6 ? K.janelaCasa : null,
          roof: true,
        });
      }
    }
  }

  const ground = new QuadBatch();
  const paint: Record<number, THREE.Color> = {
    [GRASS]: new THREE.Color(K.grama),
    [ROAD]: new THREE.Color(K.asfalto),
    [WATER]: new THREE.Color(K.agua),
    [RAIL]: new THREE.Color(K.trilho),
    [BUILD]: new THREE.Color(K.asfalto),
    [PARK]: new THREE.Color(K.praca),
    [BRIDGE]: new THREE.Color(K.deckPonte),
    [RAILBRIDGE]: new THREE.Color(K.trilho),
  };
  for (let cz = 0; cz < N; cz++) {
    let runStart = 0;
    let runType = at(0, cz);
    for (let cx = 1; cx <= N; cx++) {
      const t = cx < N ? at(cx, cz) : -1;
      if (t !== runType) {
        const x0 = runStart * CELL - HALF;
        const x1 = cx * CELL - HALF;
        const z0 = cz * CELL - HALF;
        ground.quad(x0, z0, x1, z0 + CELL, 0, paint[runType]);
        runStart = cx;
        runType = t;
      }
    }
  }

  const deco = new QuadBatch();
  const parts: THREE.BufferGeometry[] = [];
  const lane = new THREE.Color(K.faixa);
  const pool = new THREE.Color(K.poolLuz);
  const poleColor = new THREE.Color(K.poste);
  const lampColor = new THREE.Color(K.luzPoste);
  let lampFlip = 1;

  for (const r of map.ruas) {
    const dx = r.x2 - r.x1;
    const dz = r.z2 - r.z1;
    const len = Math.hypot(dx, dz);
    const ux = dx / len;
    const uz = dz / len;
    const nx = -uz;
    const nz = ux;
    if (r.w >= 10) {
      for (let s = 6; s < len - 6; s += 10) {
        const px = r.x1 + ux * s;
        const pz = r.z1 + uz * s;
        const t = at(cellOf(px), cellOf(pz));
        if (t !== ROAD && t !== BRIDGE) continue;
        if (Math.abs(ux) >= Math.abs(uz)) deco.quad(px, pz - 0.2, px + 2.8 * Math.sign(ux || 1), pz + 0.2, 0.03, lane);
        else deco.quad(px - 0.2, pz, px + 0.2, pz + 2.8 * Math.sign(uz || 1), 0.03, lane);
      }
    }
    for (let s = 10; s < len - 10; s += 26) {
      lampFlip = -lampFlip;
      const off = (r.w / 2 + 1.2) * lampFlip;
      const px = r.x1 + ux * s + nx * off;
      const pz = r.z1 + uz * s + nz * off;
      const t = at(cellOf(px), cellOf(pz));
      if (t === WATER || t === BUILD || t === RAILBRIDGE) continue;
      parts.push(coloredBox(0.2, 4.6, 0.2, px, 2.3, pz, poleColor));
      parts.push(coloredBox(0.6, 0.3, 0.6, px, 4.7, pz, lampColor));
      deco.quad(px - 2.6, pz - 2.6, px + 2.6, pz + 2.6, 0.02, pool);
    }
  }

  const shine = new THREE.Color(K.aguaBrilho);
  for (let i = 0; i < 170; i++) {
    const x = -HALF + rng() * T;
    const zc = riverCenter(x);
    const z = zc - riverHalf(x) + rng() * riverHalf(x) * 2;
    if (at(cellOf(x), cellOf(z)) !== WATER) continue;
    deco.quad(x, z, x + 1.6 + rng() * 2, z + 0.4, 0.02, shine);
  }

  {
    const tr = map.trilho;
    const dx = tr.x2 - tr.x1;
    const dz = tr.z2 - tr.z1;
    const len = Math.hypot(dx, dz);
    const ux = dx / len;
    const uz = dz / len;
    const angle = Math.atan2(dx, dz);
    const sleeper = new THREE.Color(K.dormente);
    for (let s = 2; s < len - 2; s += 3.2) {
      const px = tr.x1 + ux * s;
      const pz = tr.z1 + uz * s;
      if (Math.abs(px) > HALF - 2 || Math.abs(pz) > HALF - 2) continue;
      const g = coloredBox(tr.w - 3, 0.12, 0.6, 0, 0.06, 0, sleeper);
      g.rotateY(angle);
      g.translate(px, 0, pz);
      parts.push(g);
    }
    const railColor = new THREE.Color('#6a6f7a');
    for (const side of [-1.4, 1.4]) {
      const g = coloredBox(0.3, 0.22, len, 0, 0.14, 0, railColor);
      g.rotateY(angle);
      g.translate((tr.x1 + tr.x2) / 2 + side, 0, (tr.z1 + tr.z2) / 2);
      parts.push(g);
    }
    const railXAt = (z: number) => tr.x1 + (tr.x2 - tr.x1) * ((z - tr.z1) / (tr.z2 - tr.z1));
    const trainBody = new THREE.Color(K.trem);
    const trainFace = new THREE.Color(K.tremFrente);
    for (let i = 0; i < 3; i++) {
      const z = map.estacaoTrem.z - 16 + i * 13;
      const x = railXAt(z);
      for (const [w, h, d, y, c] of [[3.2, 3, 12, 1.6, trainBody], [3.3, 0.8, 12.1, 1.1, trainFace]] as const) {
        const g = coloredBox(w, h, d, 0, y, 0, c);
        g.rotateY(angle);
        g.translate(x, 0, z);
        parts.push(g);
      }
    }
    const platform = coloredBox(2.4, 0.5, 34, 0, 0.25, 0, new THREE.Color(K.deckPonte));
    platform.rotateY(angle);
    platform.translate(railXAt(map.estacaoTrem.z) - 4.4, 0, map.estacaoTrem.z);
    parts.push(platform);
  }

  const guard = new THREE.Color(K.guardaPonte);
  for (const p of map.pontes) {
    const zc = riverCenter(p.x);
    const half = riverHalf(p.x) + 6;
    parts.push(coloredBox(0.5, 1.1, half * 2, p.x - p.w / 2 + 0.4, 0.55, zc, guard));
    parts.push(coloredBox(0.5, 1.1, half * 2, p.x + p.w / 2 - 0.4, 0.55, zc, guard));
  }

  for (const b of buildings) {
    const body = new THREE.Color(b.body);
    parts.push(coloredBox(b.w, b.h, b.d, b.x, b.h / 2, b.z, body));
    if (b.win) {
      const win = new THREE.Color(b.win);
      if (b.roof) {
        parts.push(coloredBox(b.w * 0.4, 0.7, 0.14, b.x, b.h * 0.5, b.z - b.d / 2 - 0.02, win));
      } else {
        parts.push(coloredBox(b.w + 0.12, 0.9, b.d + 0.12, b.x, b.h * 0.38, b.z, win));
        if (b.h > 13) parts.push(coloredBox(b.w + 0.12, 0.9, b.d + 0.12, b.x, b.h * 0.72, b.z, win));
      }
    }
    if (b.roof) {
      parts.push(coloredBox(b.w + 0.7, 1.1, b.d + 0.7, b.x, b.h + 0.45, b.z, new THREE.Color(K.telhado)));
    }
  }

  const trunk = new THREE.Color(K.arvoreTronco);
  const leaf = new THREE.Color(K.arvoreCopa);
  for (let i = 0; i < 260; i++) {
    const x = -HALF + rng() * T;
    const z = -HALF + rng() * T;
    const t = at(cellOf(x), cellOf(z));
    if (t !== GRASS && t !== PARK) continue;
    const s = 0.8 + rng() * 0.9;
    parts.push(coloredBox(0.5 * s, 2.2 * s, 0.5 * s, x, 1.1 * s, z, trunk));
    parts.push(coloredBox(2.4 * s, 2.6 * s, 2.4 * s, x, 3.4 * s, z, leaf));
  }

  const material = new THREE.MeshBasicMaterial({ vertexColors: true });
  const groundGeo = ground.build();
  if (groundGeo) ctx.scene.add(new THREE.Mesh(groundGeo, material));
  const decoGeo = deco.build();
  if (decoGeo) ctx.scene.add(new THREE.Mesh(decoGeo, material));
  const merged = mergeParts(parts);
  if (merged) ctx.scene.add(new THREE.Mesh(merged, material));

  for (const m of map.marcos) {
    const sprite = textSprite(m.emoji + ' ' + m.nome, 26);
    const h = m.predio ? m.predio.h + 5 : 9;
    sprite.position.set(m.x, h, m.z);
    ctx.scene.add(sprite);
  }

  function typeAt(x: number, z: number): number {
    return at(cellOf(x), cellOf(z));
  }

  const MAP_COLORS: Record<number, [number, number, number]> = {
    [GRASS]: [24, 41, 29],
    [ROAD]: [70, 77, 96],
    [WATER]: [30, 92, 143],
    [RAIL]: [88, 74, 60],
    [BUILD]: [39, 46, 64],
    [PARK]: [33, 80, 49],
    [BRIDGE]: [83, 91, 112],
    [RAILBRIDGE]: [88, 74, 60],
  };

  return {
    paintMap(canvas) {
      canvas.width = N;
      canvas.height = N;
      const g = canvas.getContext('2d')!;
      const img = g.createImageData(N, N);
      for (let i = 0; i < N * N; i++) {
        const c = MAP_COLORS[grid[i]];
        img.data[i * 4] = c[0];
        img.data[i * 4 + 1] = c[1];
        img.data[i * 4 + 2] = c[2];
        img.data[i * 4 + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    },
    solidAt(x, z) {
      if (Math.abs(x) > HALF - 2 || Math.abs(z) > HALF - 2) return true;
      const t = typeAt(x, z);
      return t === BUILD || t === WATER || t === RAILBRIDGE;
    },
    surfaceAt(x, z): SurfaceKind {
      const t = typeAt(x, z);
      if (t === ROAD || t === BRIDGE) return 'rua';
      if (t === WATER) return 'agua';
      if (t === RAIL) return 'trilho';
      return 'grama';
    },
    buildingTopAt(x, z) {
      return tops[cellOf(x) + cellOf(z) * N];
    },
    nearestLandmark(x, z) {
      let best = null as { nome: string; emoji: string; dist: number } | null;
      for (const m of map.marcos) {
        const d = Math.hypot(m.x - x, m.z - z);
        if (!best || d < best.dist) best = { nome: m.nome, emoji: m.emoji, dist: d };
      }
      return best;
    },
  };
}
