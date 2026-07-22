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
  const at = (cx: number, cz: number) => grid[cx + cz * N];
  const set = (cx: number, cz: number, t: number) => { grid[cx + cz * N] = t; };

  function fillRect(x1: number, z1: number, x2: number, z2: number, t: number, onlyIf?: number) {
    const cx1 = cellOf(Math.min(x1, x2));
    const cx2 = cellOf(Math.max(x1, x2) - 0.01);
    const cz1 = cellOf(Math.min(z1, z2));
    const cz2 = cellOf(Math.max(z1, z2) - 0.01);
    for (let cz = cz1; cz <= cz2; cz++) {
      for (let cx = cx1; cx <= cx2; cx++) {
        if (onlyIf === undefined || at(cx, cz) === onlyIf) set(cx, cz, t);
      }
    }
  }

  for (const p of map.pracas) fillRect(p.x1, p.z1, p.x2, p.z2, PARK);
  for (const r of map.ruas) {
    const h = r.w / 2;
    if (r.x1 === r.x2) fillRect(r.x1 - h, r.z1, r.x1 + h, r.z2, ROAD);
    else fillRect(r.x1, r.z1 - h, r.x2, r.z1 + h, ROAD);
  }
  {
    const h = map.trilho.w / 2;
    const cx1 = cellOf(map.trilho.x - h);
    const cx2 = cellOf(map.trilho.x + h - 0.01);
    for (let cz = 0; cz < N; cz++) {
      for (let cx = cx1; cx <= cx2; cx++) {
        if (at(cx, cz) !== ROAD) set(cx, cz, RAIL);
      }
    }
  }
  {
    const cz1 = cellOf(map.rio.z1);
    const cz2 = cellOf(map.rio.z2 - 0.01);
    for (let cz = cz1; cz <= cz2; cz++) {
      for (let cx = 0; cx < N; cx++) {
        const x = cx * CELL - HALF + CELL / 2;
        const t = at(cx, cz);
        if (t === ROAD && map.pontes.some((p) => Math.abs(x - p.x) <= p.w / 2)) set(cx, cz, BRIDGE);
        else if (t === RAIL) set(cx, cz, RAILBRIDGE);
        else set(cx, cz, WATER);
      }
    }
  }

  interface Building { x: number; z: number; w: number; d: number; h: number; body: string; win: string }
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
    stampBuilding({ x: m.x, z: m.z, w: m.predio.w, d: m.predio.d, h: m.predio.h, body: m.predio.cor, win: K.janelas[0] });
  }

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
          if (at(nx, nz) === ROAD) nearRoad = true;
        }
      }
      if (!nearRoad || rng() > 0.72) continue;
      const wx = cx * CELL - HALF + CELL;
      const wz = cz * CELL - HALF + CELL;
      stampBuilding({
        x: wx,
        z: wz,
        w: 7,
        d: 7,
        h: 7 + rng() * 19,
        body: K.predios[Math.floor(rng() * K.predios.length)],
        win: K.janelas[Math.floor(rng() * K.janelas.length)],
      });
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
  const lane = new THREE.Color(K.faixa);
  for (const r of map.ruas) {
    if (r.w < 10) continue;
    if (r.x1 === r.x2) {
      for (let z = Math.min(r.z1, r.z2) + 4; z < Math.max(r.z1, r.z2) - 4; z += 10) {
        const cz = cellOf(z);
        const cx = cellOf(r.x1);
        const t = at(cx, cz);
        if (t !== ROAD && t !== BRIDGE) continue;
        deco.quad(r.x1 - 0.2, z, r.x1 + 0.2, z + 2.8, 0.03, lane);
      }
    } else {
      for (let x = Math.min(r.x1, r.x2) + 4; x < Math.max(r.x1, r.x2) - 4; x += 10) {
        const cx = cellOf(x);
        const cz = cellOf(r.z1);
        const t = at(cx, cz);
        if (t !== ROAD && t !== BRIDGE) continue;
        deco.quad(x, r.z1 - 0.2, x + 2.8, r.z1 + 0.2, 0.03, lane);
      }
    }
  }
  const sleeper = new THREE.Color(K.dormente);
  for (let z = -HALF + 2; z < HALF - 2; z += 3) {
    deco.quad(map.trilho.x - map.trilho.w / 2 + 1, z, map.trilho.x + map.trilho.w / 2 - 1, z + 0.5, 0.03, sleeper);
  }
  const shine = new THREE.Color(K.aguaBrilho);
  for (let i = 0; i < 150; i++) {
    const x = -HALF + rng() * T;
    const z = map.rio.z1 + rng() * (map.rio.z2 - map.rio.z1);
    if (at(cellOf(x), cellOf(z)) !== WATER) continue;
    deco.quad(x, z, x + 1.6 + rng() * 2, z + 0.4, 0.02, shine);
  }
  const pool = new THREE.Color(K.poolLuz);

  const parts: THREE.BufferGeometry[] = [];
  for (const b of buildings) {
    const body = new THREE.Color(b.body);
    const win = new THREE.Color(b.win);
    parts.push(coloredBox(b.w, b.h, b.d, b.x, b.h / 2, b.z, body));
    parts.push(coloredBox(b.w + 0.12, 0.9, b.d + 0.12, b.x, b.h * 0.38, b.z, win));
    if (b.h > 11) parts.push(coloredBox(b.w + 0.12, 0.9, b.d + 0.12, b.x, b.h * 0.72, b.z, win));
  }

  const poleColor = new THREE.Color(K.poste);
  const lampColor = new THREE.Color(K.luzPoste);
  let lampFlip = 1;
  for (const r of map.ruas) {
    const h = r.w / 2 + 1.2;
    if (r.x1 === r.x2) {
      for (let z = Math.min(r.z1, r.z2) + 8; z < Math.max(r.z1, r.z2) - 8; z += 26) {
        lampFlip = -lampFlip;
        const x = r.x1 + h * lampFlip;
        const t = at(cellOf(x), cellOf(z));
        if (t === WATER || t === BUILD) continue;
        parts.push(coloredBox(0.2, 4.6, 0.2, x, 2.3, z, poleColor));
        parts.push(coloredBox(0.6, 0.3, 0.6, x, 4.7, z, lampColor));
        deco.quad(x - 2.6, z - 2.6, x + 2.6, z + 2.6, 0.02, pool);
      }
    } else {
      for (let x = Math.min(r.x1, r.x2) + 8; x < Math.max(r.x1, r.x2) - 8; x += 26) {
        lampFlip = -lampFlip;
        const z = r.z1 + h * lampFlip;
        const t = at(cellOf(x), cellOf(z));
        if (t === WATER || t === BUILD) continue;
        parts.push(coloredBox(0.2, 4.6, 0.2, x, 2.3, z, poleColor));
        parts.push(coloredBox(0.6, 0.3, 0.6, x, 4.7, z, lampColor));
        deco.quad(x - 2.6, z - 2.6, x + 2.6, z + 2.6, 0.02, pool);
      }
    }
  }

  const guard = new THREE.Color(K.guardaPonte);
  for (const p of map.pontes) {
    const len = map.rio.z2 - map.rio.z1 + 10;
    const zc = (map.rio.z1 + map.rio.z2) / 2;
    parts.push(coloredBox(0.5, 1.1, len, p.x - p.w / 2 + 0.4, 0.55, zc, guard));
    parts.push(coloredBox(0.5, 1.1, len, p.x + p.w / 2 - 0.4, 0.55, zc, guard));
  }

  const trunk = new THREE.Color(K.arvoreTronco);
  const leaf = new THREE.Color(K.arvoreCopa);
  for (let i = 0; i < 240; i++) {
    const x = -HALF + rng() * T;
    const z = -HALF + rng() * T;
    const t = at(cellOf(x), cellOf(z));
    if (t !== GRASS && t !== PARK) continue;
    const s = 0.8 + rng() * 0.9;
    parts.push(coloredBox(0.5 * s, 2.2 * s, 0.5 * s, x, 1.1 * s, z, trunk));
    parts.push(coloredBox(2.4 * s, 2.6 * s, 2.4 * s, x, 3.4 * s, z, leaf));
  }

  const trainBody = new THREE.Color(K.trem);
  const trainFace = new THREE.Color(K.tremFrente);
  for (let i = 0; i < 3; i++) {
    const z = map.estacaoTrem.z - 14 + i * 13;
    parts.push(coloredBox(3.2, 3, 12, map.trilho.x, 1.6, z, trainBody));
    parts.push(coloredBox(3.3, 0.8, 12.1, map.trilho.x, 1.1, z, trainFace));
  }
  parts.push(coloredBox(2.4, 0.5, 30, map.trilho.x + 4.4, 0.25, map.estacaoTrem.z, new THREE.Color(K.deckPonte)));

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

  return {
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
