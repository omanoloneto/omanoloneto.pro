import * as THREE from 'three';
import { coloredBox, mergeParts, orientedBox, QuadBatch } from './mesh';
import { createAsphaltTexture } from './city-texture';
import type { City, Ctx, SurfaceKind } from './types';

const GRASS = 0;
const ROAD = 1;
const MEDIAN = 2;
const PILLAR = 3;
const BUILD = 4;

interface Seg {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  halfW: number;
  tipo: string;
  via: number;
  nome?: string;
}

export function createCity(ctx: Ctx): City {
  const { cfg, map } = ctx;
  const K = cfg.cores;
  const V = cfg.vias;
  const T = cfg.mundo.tamanho;
  const CELL = cfg.mundo.celula;
  const N = Math.floor(T / CELL);
  const HALF = T / 2;
  const grid = new Uint8Array(N * N);
  const tops = new Float32Array(N * N);

  const cellOf = (v: number) => Math.max(0, Math.min(N - 1, Math.floor((v + HALF) / CELL)));
  const centerOf = (c: number) => c * CELL - HALF + CELL / 2;
  const at = (cx: number, cz: number) => grid[cx + cz * N];
  const set = (cx: number, cz: number, t: number) => { grid[cx + cz * N] = t; };

  const halfWidth = (tipo: string) =>
    tipo === 'avenida' ? V.avenida.pista + V.avenida.canteiro / 2 : tipo === 'br' ? V.br.largura / 2 : V.rua.largura / 2;

  interface PaintOpts { skip?: number; only?: number }
  function paintSegment(x1: number, z1: number, x2: number, z2: number, w: number, t: number, opts?: PaintOpts) {
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
        const cur = at(cx, cz);
        if (opts?.skip !== undefined && cur === opts.skip) continue;
        if (opts?.only !== undefined && cur !== opts.only) continue;
        const px = centerOf(cx);
        const pz = centerOf(cz);
        const u = Math.max(0, Math.min(1, ((px - x1) * dx + (pz - z1) * dz) / len2));
        const qx = x1 + dx * u - px;
        const qz = z1 + dz * u - pz;
        if (qx * qx + qz * qz <= half * half) set(cx, cz, t);
      }
    }
  }

  function fillCells(x: number, z: number, w: number, d: number, t: number, top: number) {
    const cx1 = cellOf(x - w / 2);
    const cx2 = cellOf(x + w / 2 - 0.01);
    const cz1 = cellOf(z - d / 2);
    const cz2 = cellOf(z + d / 2 - 0.01);
    for (let cz = cz1; cz <= cz2; cz++) {
      for (let cx = cx1; cx <= cx2; cx++) {
        set(cx, cz, t);
        tops[cx + cz * N] = top;
      }
    }
  }

  const allSegs: Seg[] = [];
  map.vias.forEach((via, vi) => {
    const hw = halfWidth(via.tipo);
    for (let i = 0; i < via.pontos.length - 1; i++) {
      const [ax, az] = via.pontos[i];
      const [bx, bz] = via.pontos[i + 1];
      allSegs.push({ ax, az, bx, bz, halfW: hw, tipo: via.tipo, via: vi, nome: via.nome });
    }
  });

  function distSeg2(px: number, pz: number, s: Seg) {
    const dx = s.bx - s.ax;
    const dz = s.bz - s.az;
    const len2 = dx * dx + dz * dz || 1;
    const u = Math.max(0, Math.min(1, ((px - s.ax) * dx + (pz - s.az) * dz) / len2));
    const qx = s.ax + dx * u - px;
    const qz = s.az + dz * u - pz;
    return qx * qx + qz * qz;
  }

  function blockedNear(px: number, pz: number, viaIdx: number, margin: number) {
    for (const s of allSegs) {
      if (s.via === viaIdx || s.tipo === 'br') continue;
      const lim = s.halfW + margin;
      if (distSeg2(px, pz, s) <= lim * lim) return true;
    }
    return false;
  }

  function arcCum(pts: [number, number][]) {
    const cum = [0];
    for (let i = 0; i < pts.length - 1; i++) {
      cum.push(cum[i] + Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]));
    }
    return cum;
  }

  function sampleAt(pts: [number, number][], cum: number[], arc: number) {
    const total = cum[cum.length - 1];
    arc = Math.max(0, Math.min(total, arc));
    let i = 0;
    while (i < cum.length - 2 && cum[i + 1] < arc) i++;
    const segLen = cum[i + 1] - cum[i] || 1;
    const t = (arc - cum[i]) / segLen;
    const ax = pts[i][0];
    const az = pts[i][1];
    const dx = pts[i + 1][0] - ax;
    const dz = pts[i + 1][1] - az;
    const l = Math.hypot(dx, dz) || 1;
    return { x: ax + dx * t, z: az + dz * t, ux: dx / l, uz: dz / l };
  }

  function nearVertex(cum: number[], arc: number, margin: number) {
    for (let i = 1; i < cum.length - 1; i++) if (Math.abs(arc - cum[i]) < margin) return true;
    return false;
  }

  function offsetPolyline(pts: [number, number][], d: number): [number, number][] {
    const n = pts.length;
    const segN: [number, number][] = [];
    for (let i = 0; i < n - 1; i++) {
      const dx = pts[i + 1][0] - pts[i][0];
      const dz = pts[i + 1][1] - pts[i][1];
      const l = Math.hypot(dx, dz) || 1;
      segN.push([-dz / l, dx / l]);
    }
    const out: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      let nx: number;
      let nz: number;
      if (i === 0) [nx, nz] = segN[0];
      else if (i === n - 1) [nx, nz] = segN[n - 2];
      else {
        const a = segN[i - 1];
        const b = segN[i];
        let mx = a[0] + b[0];
        let mz = a[1] + b[1];
        const ml = Math.hypot(mx, mz) || 1;
        mx /= ml;
        mz /= ml;
        const cos = mx * b[0] + mz * b[1];
        const scale = cos > 0.25 ? 1 / cos : 1;
        nx = mx * scale;
        nz = mz * scale;
      }
      out.push([pts[i][0] + nx * d, pts[i][1] + nz * d]);
    }
    return out;
  }

  for (const via of map.vias) {
    if (via.tipo === 'br') continue;
    const w = via.tipo === 'avenida' ? V.avenida.pista * 2 + V.avenida.canteiro : V.rua.largura;
    for (let i = 0; i < via.pontos.length - 1; i++) {
      const [x1, z1] = via.pontos[i];
      const [x2, z2] = via.pontos[i + 1];
      paintSegment(x1, z1, x2, z2, w, ROAD);
    }
  }

  const deco = new QuadBatch();
  const glowDecals = new QuadBatch();
  const parts: THREE.BufferGeometry[] = [];
  const emissiveParts: THREE.BufferGeometry[] = [];
  const laneWhite = new THREE.Color(K.faixa);
  const laneYellow = new THREE.Color(K.faixaAmarela);
  const canteiroColor = new THREE.Color(K.canteiro);
  const guiaColor = new THREE.Color(K.guia);
  const poleColor = new THREE.Color(K.poste);
  const lampColor = new THREE.Color(K.luzPoste);
  const pool = new THREE.Color(K.poolLuz);
  const deckColor = new THREE.Color(K.deckBR);
  const muretaColor = new THREE.Color(K.muretaBR);
  const pilarColor = new THREE.Color(K.pilarBR);
  const asfaltoColor = new THREE.Color(K.asfalto);

  function emitMedian(via: (typeof map.vias)[number], vi: number) {
    const pts = via.pontos;
    const cum = arcCum(pts);
    const total = cum[cum.length - 1];
    const step = V.amostraPasso;
    const nS = Math.floor(total / step);
    const blocked: boolean[] = [];
    const arcs: number[] = [];
    for (let k = 0; k <= nS; k++) {
      const arc = Math.min(k * step, total);
      arcs.push(arc);
      const s = sampleAt(pts, cum, arc);
      blocked.push(blockedNear(s.x, s.z, vi, V.gapMargem));
    }
    const runs: Array<[number, number]> = [];
    let rs: number | null = null;
    for (let k = 0; k < blocked.length; k++) {
      if (!blocked[k]) {
        if (rs === null) rs = k;
      } else if (rs !== null) {
        runs.push([rs, k - 1]);
        rs = null;
      }
    }
    if (rs !== null) runs.push([rs, blocked.length - 1]);

    const shrink = V.avenida.canteiro / 2;
    const guiaOff = V.avenida.canteiro / 2 - V.avenida.guia / 2;
    for (const [i0, i1] of runs) {
      const runStart = arcs[i0];
      const runEnd = arcs[i1];
      if (runEnd - runStart < 6) continue;
      const gapStart = i0 !== 0;
      const gapEnd = i1 !== blocked.length - 1;

      const cuts = [runStart];
      for (let vv = 1; vv < cum.length - 1; vv++) if (cum[vv] > runStart && cum[vv] < runEnd) cuts.push(cum[vv]);
      cuts.push(runEnd);
      for (let c = 0; c < cuts.length - 1; c++) {
        let a = cuts[c];
        let b = cuts[c + 1];
        if (c === 0 && gapStart) a += shrink;
        if (c === cuts.length - 2 && gapEnd) b -= shrink;
        if (b - a < 2) continue;
        const pa = sampleAt(pts, cum, a);
        const pb = sampleAt(pts, cum, b);
        const cx = (pa.x + pb.x) / 2;
        const cz = (pa.z + pb.z) / 2;
        const ddx = pb.x - pa.x;
        const ddz = pb.z - pa.z;
        const len = Math.hypot(ddx, ddz) || 1;
        const ux = ddx / len;
        const uz = ddz / len;
        const nx = -uz;
        const nz = ux;
        paintSegment(pa.x, pa.z, pb.x, pb.z, V.avenida.canteiro, MEDIAN, { only: ROAD });
        parts.push(orientedBox(cx, cz, ux, uz, len, V.avenida.canteiro - 0.7, V.avenida.alturaCanteiro, V.avenida.alturaCanteiro / 2, canteiroColor));
        for (const side of [-1, 1]) {
          parts.push(orientedBox(cx + nx * guiaOff * side, cz + nz * guiaOff * side, ux, uz, len, V.avenida.guia, 0.26, 0.13, guiaColor));
        }
      }

      for (let arc = runStart + 8; arc < runEnd - 6; arc += V.avenida.postePasso) {
        const s = sampleAt(pts, cum, arc);
        const nx = -s.uz;
        const nz = s.ux;
        parts.push(coloredBox(0.25, V.avenida.posteAltura, 0.25, s.x, V.avenida.posteAltura / 2, s.z, poleColor));
        parts.push(orientedBox(s.x, s.z, s.ux, s.uz, 0.25, 3.4, 0.15, V.avenida.posteAltura - 0.1, poleColor));
        for (const side of [-1, 1]) {
          emissiveParts.push(coloredBox(0.6, 0.25, 0.6, s.x + nx * 1.5 * side, V.avenida.posteAltura - 0.05, s.z + nz * 1.5 * side, lampColor));
          const gx = s.x + nx * 3.2 * side;
          const gz = s.z + nz * 3.2 * side;
          glowDecals.quad(gx - 2.6, gz - 2.6, gx + 2.6, gz + 2.6, 0.02, pool);
        }
      }
    }
  }

  function emitDashes(via: (typeof map.vias)[number], vi: number) {
    const pts = via.pontos;
    const cum = arcCum(pts);
    const total = cum[cum.length - 1];
    const p = via.tipo === 'avenida' ? V.avenida : via.tipo === 'br' ? V.br : V.rua;
    const isBR = via.tipo === 'br';
    const offsets = via.tipo === 'avenida'
      ? [-(V.avenida.canteiro / 2 + V.avenida.pista / 2), V.avenida.canteiro / 2 + V.avenida.pista / 2]
      : isBR
        ? [-V.br.faixaOffsets[1], -V.br.faixaOffsets[0], V.br.faixaOffsets[0], V.br.faixaOffsets[1]]
        : [0];
    const color = via.tipo === 'rua' ? laneYellow : laneWhite;
    const y = isBR ? V.br.deckTopo + 0.04 : 0.04;
    for (let arc = p.faixaPasso / 2; arc < total; arc += p.faixaPasso) {
      if (nearVertex(cum, arc, p.faixaLen / 2 + 0.5)) continue;
      const s = sampleAt(pts, cum, arc);
      if (!isBR && blockedNear(s.x, s.z, vi, 1)) continue;
      const nx = -s.uz;
      const nz = s.ux;
      for (const off of offsets) {
        deco.quadRot(s.x + nx * off, s.z + nz * off, s.ux, s.uz, p.faixaLen, p.faixaLarg, y, color);
      }
    }
  }

  function emitRuaLamps(via: (typeof map.vias)[number]) {
    const pts = via.pontos;
    const cum = arcCum(pts);
    const total = cum[cum.length - 1];
    const off = V.rua.largura / 2 + 1.2;
    let flip = 1;
    for (let arc = 10; arc < total - 10; arc += V.rua.postePasso) {
      flip = -flip;
      const s = sampleAt(pts, cum, arc);
      const px = s.x + -s.uz * off * flip;
      const pz = s.z + s.ux * off * flip;
      const t = at(cellOf(px), cellOf(pz));
      if (t === BUILD || t === PILLAR) continue;
      parts.push(coloredBox(0.2, V.rua.posteAltura, 0.2, px, V.rua.posteAltura / 2, pz, poleColor));
      emissiveParts.push(coloredBox(0.6, 0.3, 0.6, px, V.rua.posteAltura + 0.1, pz, lampColor));
      glowDecals.quad(px - 2.6, pz - 2.6, px + 2.6, pz + 2.6, 0.02, pool);
    }
  }

  const asphaltGround = new QuadBatch(8);

  function emitBR(via: (typeof map.vias)[number]) {
    const pts = via.pontos;
    const hw = V.br.largura / 2;
    const deckY = V.br.deckTopo - V.br.deckEspessura / 2;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i];
      const [bx, bz] = pts[i + 1];
      let dx = bx - ax;
      let dz = bz - az;
      const l = Math.hypot(dx, dz) || 1;
      const ux = dx / l;
      const uz = dz / l;
      const turnExt = (vi: number) => {
        if (vi <= 0 || vi >= pts.length - 1) return 0;
        const p0 = pts[vi - 1];
        const p1 = pts[vi];
        const p2 = pts[vi + 1];
        const a1 = Math.atan2(p1[0] - p0[0], p1[1] - p0[1]);
        const a2 = Math.atan2(p2[0] - p1[0], p2[1] - p1[1]);
        let d = Math.abs(a2 - a1);
        if (d > Math.PI) d = 2 * Math.PI - d;
        return Math.min(6, hw * Math.tan(d / 2));
      };
      const startExt = turnExt(i);
      const endExt = turnExt(i + 1);
      const sax = ax - ux * startExt;
      const saz = az - uz * startExt;
      const sbx = bx + ux * endExt;
      const sbz = bz + uz * endExt;
      const cx = (sax + sbx) / 2;
      const cz = (saz + sbz) / 2;
      const len = Math.hypot(sbx - sax, sbz - saz) || 1;
      parts.push(orientedBox(cx, cz, ux, uz, len, V.br.largura, V.br.deckEspessura, deckY, deckColor));
      asphaltGround.quadRot(cx, cz, ux, uz, len, V.br.largura - 1, V.br.deckTopo + 0.02, asfaltoColor);
    }

    const muretaY = V.br.deckTopo + V.br.mureta.alt / 2;
    for (const d of [hw - V.br.mureta.larg / 2, -(hw - V.br.mureta.larg / 2), 0]) {
      const op = offsetPolyline(pts, d);
      for (let i = 0; i < op.length - 1; i++) {
        const [ax, az] = op[i];
        const [bx, bz] = op[i + 1];
        const dx = bx - ax;
        const dz = bz - az;
        const l = Math.hypot(dx, dz) || 1;
        parts.push(orientedBox((ax + bx) / 2, (az + bz) / 2, dx / l, dz / l, l + 0.1, V.br.mureta.larg, V.br.mureta.alt, muretaY, muretaColor));
      }
    }

    const cum = arcCum(pts);
    const total = cum[cum.length - 1];
    const checkHalf = V.br.pilarLarg / 2 + CELL;
    const stampHalf = V.br.pilarLarg / 2;
    for (let arc = V.br.pilarPasso / 2; arc < total; arc += V.br.pilarPasso) {
      const s = sampleAt(pts, cum, arc);
      const nx = -s.uz;
      const nz = s.ux;
      let any = false;
      for (const side of [-1, 1]) {
        const px = s.x + nx * V.br.pilarOffset * side;
        const pz = s.z + nz * V.br.pilarOffset * side;
        let block = false;
        const cx1 = cellOf(px - checkHalf);
        const cx2 = cellOf(px + checkHalf);
        const cz1 = cellOf(pz - checkHalf);
        const cz2 = cellOf(pz + checkHalf);
        for (let cz = cz1; cz <= cz2 && !block; cz++) {
          for (let cx = cx1; cx <= cx2; cx++) {
            const t = at(cx, cz);
            if (t === ROAD || t === MEDIAN) { block = true; break; }
          }
        }
        if (block) continue;
        any = true;
        const sx1 = cellOf(px - stampHalf);
        const sx2 = cellOf(px + stampHalf);
        const sz1 = cellOf(pz - stampHalf);
        const sz2 = cellOf(pz + stampHalf);
        for (let cz = sz1; cz <= sz2; cz++) for (let cx = sx1; cx <= sx2; cx++) set(cx, cz, PILLAR);
        parts.push(coloredBox(V.br.pilarLarg, 6.4, V.br.pilarLarg, px, 3.2, pz, pilarColor));
      }
      if (any) parts.push(orientedBox(s.x, s.z, s.ux, s.uz, 1.6, 16, V.br.vigaAltura, V.br.deckTopo - V.br.deckEspessura - V.br.vigaAltura / 2, pilarColor));
    }

    const lampOff = hw - 0.6;
    let flip = 1;
    for (let arc = V.br.postePasso / 2; arc < total; arc += V.br.postePasso) {
      flip = -flip;
      const s = sampleAt(pts, cum, arc);
      const px = s.x + -s.uz * lampOff * flip;
      const pz = s.z + s.ux * lampOff * flip;
      parts.push(coloredBox(0.2, V.br.posteAltura, 0.2, px, V.br.deckTopo + V.br.posteAltura / 2, pz, poleColor));
      emissiveParts.push(coloredBox(0.6, 0.3, 0.6, px, V.br.deckTopo + V.br.posteAltura + 0.15, pz, lampColor));
      glowDecals.quad(px - 2.5, pz - 2.5, px + 2.5, pz + 2.5, V.br.deckTopo + 0.06, pool);
    }
  }

  map.vias.forEach((via, vi) => {
    if (via.tipo === 'avenida') emitMedian(via, vi);
  });
  map.vias.forEach((via) => {
    if (via.tipo === 'br') emitBR(via);
  });
  map.vias.forEach((via) => {
    if (via.tipo === 'rua') emitRuaLamps(via);
  });
  map.vias.forEach((via, vi) => emitDashes(via, vi));

  for (const b of map.predios) {
    fillCells(b.x, b.z, b.w, b.d, BUILD, b.h);
    parts.push(coloredBox(b.w, b.h, b.d, b.x, b.h / 2, b.z, new THREE.Color(b.cor)));
  }

  const ground = new QuadBatch();
  const asphaltTypes = new Set([ROAD, MEDIAN, BUILD]);
  const paint: Record<number, THREE.Color> = {
    [GRASS]: new THREE.Color(K.grama),
    [ROAD]: asfaltoColor,
    [MEDIAN]: asfaltoColor,
    [PILLAR]: new THREE.Color(K.grama),
    [BUILD]: asfaltoColor,
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
        const batch = asphaltTypes.has(runType) ? asphaltGround : ground;
        batch.quad(x0, z0, x1, z0 + CELL, 0, paint[runType]);
        runStart = cx;
        runType = t;
      }
    }
  }

  const material = new THREE.MeshBasicMaterial({ vertexColors: true });
  const asphaltTexture = createAsphaltTexture(ctx.stage.lowTier);
  ctx.textures.asfalto = asphaltTexture;
  const asphaltMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, map: asphaltTexture });
  const groundGeo = ground.build();
  if (groundGeo) ctx.scene.add(new THREE.Mesh(groundGeo, material));
  const asphaltGeo = asphaltGround.build();
  if (asphaltGeo) ctx.scene.add(new THREE.Mesh(asphaltGeo, asphaltMaterial));
  const decoGeo = deco.build();
  if (decoGeo) ctx.scene.add(new THREE.Mesh(decoGeo, material));
  const merged = mergeParts(parts);
  if (merged) ctx.scene.add(new THREE.Mesh(merged, material));
  const emissiveMaterial = new THREE.MeshBasicMaterial({ vertexColors: true });
  const emissiveGeo = mergeParts(emissiveParts);
  if (emissiveGeo) ctx.scene.add(new THREE.Mesh(emissiveGeo, emissiveMaterial));
  const glowDecalMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false });
  const glowGeo = glowDecals.build();
  if (glowGeo) ctx.scene.add(new THREE.Mesh(glowGeo, glowDecalMaterial));

  function typeAt(x: number, z: number): number {
    return at(cellOf(x), cellOf(z));
  }

  const MAP_COLORS: Record<number, [number, number, number]> = {
    [GRASS]: [24, 41, 29],
    [ROAD]: [70, 77, 96],
    [MEDIAN]: [40, 72, 48],
    [PILLAR]: [120, 124, 134],
    [BUILD]: [39, 46, 64],
  };

  const GPS_COLORS: Record<number, [number, number, number]> = {
    [GRASS]: [15, 16, 18],
    [ROAD]: [178, 182, 189],
    [MEDIAN]: [178, 182, 189],
    [PILLAR]: [90, 94, 100],
    [BUILD]: [36, 38, 43],
  };

  return {
    tintables: [material, asphaltMaterial],
    nightGlow: emissiveMaterial,
    nightDecals: glowDecalMaterial,
    paintMap(canvas, style = 'padrao') {
      canvas.width = N;
      canvas.height = N;
      const g = canvas.getContext('2d')!;
      const img = g.createImageData(N, N);
      const pal = style === 'gps' ? GPS_COLORS : MAP_COLORS;
      for (let i = 0; i < N * N; i++) {
        const c = pal[grid[i]];
        img.data[i * 4] = c[0];
        img.data[i * 4 + 1] = c[1];
        img.data[i * 4 + 2] = c[2];
        img.data[i * 4 + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      const s = N / T;
      g.lineJoin = 'round';
      g.lineCap = 'round';
      for (const via of map.vias) {
        if (via.tipo !== 'br') continue;
        g.beginPath();
        via.pontos.forEach(([x, z], i) => {
          const px = (x + HALF) * s;
          const py = (z + HALF) * s;
          if (i) g.lineTo(px, py);
          else g.moveTo(px, py);
        });
        if (style === 'gps') {
          g.strokeStyle = '#b26a1e';
          g.lineWidth = 9;
          g.stroke();
          g.strokeStyle = '#f6a33a';
          g.lineWidth = 7;
          g.stroke();
        } else {
          g.strokeStyle = '#8b93a6';
          g.lineWidth = 8;
          g.stroke();
          g.strokeStyle = '#565e72';
          g.lineWidth = 6.4;
          g.stroke();
        }
      }
    },
    streetAt(x, z, current = null) {
      let best: string | null = null;
      let bestD2 = Infinity;
      let currentHolds = false;
      for (const s of allSegs) {
        if (s.tipo === 'br') continue;
        const d2 = distSeg2(x, z, s);
        const lim = s.halfW + 6;
        if (d2 > lim * lim) continue;
        if (current && s.nome === current) currentHolds = true;
        if (d2 < bestD2) {
          bestD2 = d2;
          best = s.nome ?? null;
        }
      }
      return currentHolds ? current : best;
    },
    solidAt(x, z) {
      if (Math.abs(x) > HALF - 2 || Math.abs(z) > HALF - 2) return true;
      const t = typeAt(x, z);
      return t === BUILD || t === PILLAR;
    },
    surfaceAt(x, z): SurfaceKind {
      return typeAt(x, z) === ROAD ? 'rua' : 'grama';
    },
    gridAt(x, z) {
      return typeAt(x, z);
    },
    buildingTopAt(x, z) {
      return tops[cellOf(x) + cellOf(z) * N];
    },
  };
}
