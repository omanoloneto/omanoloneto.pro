import * as THREE from 'three';
import { coloredBox, mergeParts, orientedBox, QuadBatch, shadeInto } from './mesh';
import { createAsphaltTexture, createGraffitiTexture, createMallTexture } from './city-texture';
import type { City, Ctx, SurfaceKind } from './types';

type Pt = [number, number];
const lerp2 = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

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

  const morros = map.morros;
  function heightAt(x: number, z: number): number {
    let h = 0;
    for (const m of morros) {
      const dx = x - m.x;
      const dz = z - m.z;
      const s = m.raio * 0.5;
      h += m.altura * Math.exp(-(dx * dx + dz * dz) / (2 * s * s));
    }
    return h;
  }

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

  function stampDisk(x: number, z: number, radius: number, t: number, top: number) {
    const c1x = cellOf(x - radius);
    const c2x = cellOf(x + radius);
    const c1z = cellOf(z - radius);
    const c2z = cellOf(z + radius);
    for (let cz = c1z; cz <= c2z; cz++) {
      for (let cx = c1x; cx <= c2x; cx++) {
        const dx = centerOf(cx) - x;
        const dz = centerOf(cz) - z;
        if (dx * dx + dz * dz <= radius * radius) {
          set(cx, cz, t);
          tops[cx + cz * N] = top;
        }
      }
    }
  }

  function stampRing(x: number, z: number, rIn: number, rOut: number, top: number) {
    const c1x = cellOf(x - rOut);
    const c2x = cellOf(x + rOut);
    const c1z = cellOf(z - rOut);
    const c2z = cellOf(z + rOut);
    for (let cz = c1z; cz <= c2z; cz++) {
      for (let cx = c1x; cx <= c2x; cx++) {
        const dx = centerOf(cx) - x;
        const dz = centerOf(cz) - z;
        const d2 = dx * dx + dz * dz;
        if (d2 <= rIn * rIn) {
          set(cx, cz, BUILD);
          tops[cx + cz * N] = top;
        } else if (d2 <= rOut * rOut) {
          set(cx, cz, ROAD);
        }
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
  const curbs = new QuadBatch();
  const parts: THREE.BufferGeometry[] = [];
  const emissiveParts: THREE.BufferGeometry[] = [];
  const graffitiParts: THREE.BufferGeometry[] = [];
  const mallParts: THREE.BufferGeometry[] = [];
  const calcadaColor = new THREE.Color(K.calcada);
  const calcadaMuretaColor = new THREE.Color(K.calcadaMureta);
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
        const bedHalf = V.avenida.canteiro / 2 - V.avenida.guia;
        const guiaOut = V.avenida.canteiro / 2;
        const bedTop = V.avenida.alturaCanteiro;
        const guiaTop = 0.26;
        const yAt = (px: number, pz: number, up: number) => heightAt(px, pz) + up;
        const nSub = Math.max(1, Math.round(len / 3));
        const paP: Pt = [pa.x, pa.z];
        const pbP: Pt = [pb.x, pb.z];
        for (let k = 0; k < nSub; k++) {
          const A = lerp2(paP, pbP, k / nSub);
          const Bp = lerp2(paP, pbP, (k + 1) / nSub);
          const eA = (o: number): Pt => [A[0] + nx * o, A[1] + nz * o];
          const eB = (o: number): Pt => [Bp[0] + nx * o, Bp[1] + nz * o];
          const l1 = eA(-bedHalf), r1 = eA(bedHalf), r2 = eB(bedHalf), l2 = eB(-bedHalf);
          curbs.quad3(l1[0], yAt(l1[0], l1[1], bedTop), l1[1], r1[0], yAt(r1[0], r1[1], bedTop), r1[1], r2[0], yAt(r2[0], r2[1], bedTop), r2[1], l2[0], yAt(l2[0], l2[1], bedTop), l2[1], canteiroColor);
          for (const side of [-1, 1]) {
            const iA = eA(side * bedHalf), oA = eA(side * guiaOut), oB = eB(side * guiaOut), iB = eB(side * bedHalf);
            curbs.quad3(iA[0], yAt(iA[0], iA[1], guiaTop), iA[1], oA[0], yAt(oA[0], oA[1], guiaTop), oA[1], oB[0], yAt(oB[0], oB[1], guiaTop), oB[1], iB[0], yAt(iB[0], iB[1], guiaTop), iB[1], guiaColor);
            curbs.quadWall3(oA[0], oA[1], oB[0], oB[1], heightAt(oA[0], oA[1]), yAt(oA[0], oA[1], guiaTop), heightAt(oB[0], oB[1]), yAt(oB[0], oB[1], guiaTop), guiaColor);
          }
        }
      }

      for (let arc = runStart + 8; arc < runEnd - 6; arc += V.avenida.postePasso) {
        const s = sampleAt(pts, cum, arc);
        const nx = -s.uz;
        const nz = s.ux;
        const hs = heightAt(s.x, s.z);
        parts.push(coloredBox(0.25, V.avenida.posteAltura, 0.25, s.x, hs + V.avenida.posteAltura / 2, s.z, poleColor));
        parts.push(orientedBox(s.x, s.z, s.ux, s.uz, 0.25, 3.4, 0.15, hs + V.avenida.posteAltura - 0.1, poleColor));
        for (const side of [-1, 1]) {
          emissiveParts.push(coloredBox(0.6, 0.25, 0.6, s.x + nx * 1.5 * side, hs + V.avenida.posteAltura - 0.05, s.z + nz * 1.5 * side, lampColor));
          const gx = s.x + nx * 3.2 * side;
          const gz = s.z + nz * 3.2 * side;
          glowDecals.quad(gx - 2.6, gz - 2.6, gx + 2.6, gz + 2.6, heightAt(gx, gz) + 0.05, pool);
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
    for (let arc = p.faixaPasso / 2; arc < total; arc += p.faixaPasso) {
      if (nearVertex(cum, arc, p.faixaLen / 2 + 0.5)) continue;
      const s = sampleAt(pts, cum, arc);
      if (!isBR && blockedNear(s.x, s.z, vi, 1)) continue;
      const nx = -s.uz;
      const nz = s.ux;
      for (const off of offsets) {
        const dx = s.x + nx * off;
        const dz = s.z + nz * off;
        const y = isBR ? V.br.deckTopo + 0.04 : heightAt(dx, dz) + 0.1;
        deco.quadRot(dx, dz, s.ux, s.uz, p.faixaLen, p.faixaLarg, y, color);
      }
    }
  }

  function buildRoadRibbon(via: (typeof map.vias)[number], vi: number) {
    const hw = halfWidth(via.tipo);
    const L = offsetPolyline(via.pontos, hw);
    const R = offsetPolyline(via.pontos, -hw);
    const yoff = 0.06 + vi * 0.001;
    const wSteps = Math.max(2, Math.round((hw * 2) / 5));
    const y = (p: Pt) => heightAt(p[0], p[1]) + yoff;
    for (let i = 0; i < via.pontos.length - 1; i++) {
      const segLen = Math.hypot(L[i + 1][0] - L[i][0], L[i + 1][1] - L[i][1]);
      const lSteps = Math.max(1, Math.round(segLen / 5));
      for (let k = 0; k < lSteps; k++) {
        const la = lerp2(L[i], L[i + 1], k / lSteps);
        const lb = lerp2(L[i], L[i + 1], (k + 1) / lSteps);
        const ra = lerp2(R[i], R[i + 1], k / lSteps);
        const rb = lerp2(R[i], R[i + 1], (k + 1) / lSteps);
        for (let w = 0; w < wSteps; w++) {
          const a0 = lerp2(la, ra, w / wSteps);
          const a1 = lerp2(la, ra, (w + 1) / wSteps);
          const b0 = lerp2(lb, rb, w / wSteps);
          const b1 = lerp2(lb, rb, (w + 1) / wSteps);
          asphaltGround.quad3(a0[0], y(a0), a0[1], a1[0], y(a1), a1[1], b1[0], y(b1), b1[1], b0[0], y(b0), b0[1], asfaltoColor);
        }
      }
    }
  }

  function buildSidewalks(via: (typeof map.vias)[number], vi: number) {
    const S = V.calcada;
    const hw = halfWidth(via.tipo);
    for (const side of [1, -1]) {
      const inner = offsetPolyline(via.pontos, side * hw);
      const outer = offsetPolyline(via.pontos, side * (hw + S.larg));
      for (let i = 0; i < inner.length - 1; i++) {
        const segLen = Math.hypot(inner[i + 1][0] - inner[i][0], inner[i + 1][1] - inner[i][1]);
        const steps = Math.max(1, Math.round(segLen / 4));
        for (let k = 0; k < steps; k++) {
          const t0 = k / steps;
          const t1 = (k + 1) / steps;
          const iA = lerp2(inner[i], inner[i + 1], t0);
          const iB = lerp2(inner[i], inner[i + 1], t1);
          const oA = lerp2(outer[i], outer[i + 1], t0);
          const oB = lerp2(outer[i], outer[i + 1], t1);
          const mx = (iA[0] + iB[0] + oA[0] + oB[0]) / 4;
          const mz = (iA[1] + iB[1] + oA[1] + oB[1]) / 4;
          if (blockedNear(mx, mz, vi, S.raioEsquina)) continue;
          const hiA = heightAt(iA[0], iA[1]);
          const hiB = heightAt(iB[0], iB[1]);
          const hoA = heightAt(oA[0], oA[1]);
          const hoB = heightAt(oB[0], oB[1]);
          curbs.quad3(iA[0], hiA + S.alt, iA[1], oA[0], hoA + S.alt, oA[1], oB[0], hoB + S.alt, oB[1], iB[0], hiB + S.alt, iB[1], calcadaColor);
          curbs.quadWall3(iA[0], iA[1], iB[0], iB[1], hiA, hiA + S.alt, hiB, hiB + S.alt, calcadaMuretaColor);
          curbs.quadWall3(oA[0], oA[1], oB[0], oB[1], hoA, hoA + S.alt, hoB, hoB + S.alt, calcadaMuretaColor);
        }
      }
    }
  }

  function fanArc(ocx: number, ocz: number, r0: number, r1: number, angA: number, angB: number, up: number, batch: QuadBatch, topColor: THREE.Color, wallColor?: THREE.Color) {
    let a0 = angA;
    let da = angB - angA;
    while (da > Math.PI) da -= 2 * Math.PI;
    while (da < -Math.PI) da += 2 * Math.PI;
    if (da < 0) { a0 = angB; da = -da; }
    const n = Math.max(3, Math.round(da / (Math.PI / 10)));
    const y = (x: number, z: number) => heightAt(x, z) + up;
    for (let i = 0; i < n; i++) {
      const t0 = a0 + da * (i / n);
      const t1 = a0 + da * ((i + 1) / n);
      const ix0 = ocx + Math.cos(t0) * r0, iz0 = ocz + Math.sin(t0) * r0;
      const ix1 = ocx + Math.cos(t1) * r0, iz1 = ocz + Math.sin(t1) * r0;
      const ox0 = ocx + Math.cos(t0) * r1, oz0 = ocz + Math.sin(t0) * r1;
      const ox1 = ocx + Math.cos(t1) * r1, oz1 = ocz + Math.sin(t1) * r1;
      batch.quad3(ix0, y(ix0, iz0), iz0, ox0, y(ox0, oz0), oz0, ox1, y(ox1, oz1), oz1, ix1, y(ix1, iz1), iz1, topColor);
      if (wallColor) {
        batch.quadWall3(ox0, oz0, ox1, oz1, heightAt(ox0, oz0), y(ox0, oz0), heightAt(ox1, oz1), y(ox1, oz1), wallColor);
        if (r0 > 0.05) batch.quadWall3(ix0, iz0, ix1, iz1, heightAt(ix0, iz0), y(ix0, iz0), heightAt(ix1, iz1), y(ix1, iz1), wallColor);
      }
    }
  }

  function emitJuncoes() {
    const rfBase = V.calcada.raioEsquina;
    const sw = V.calcada.larg;
    const info = allSegs
      .filter((s) => s.tipo !== 'br')
      .map((s) => {
        const dx = s.bx - s.ax;
        const dz = s.bz - s.az;
        const len = Math.hypot(dx, dz) || 1;
        return { s, dx: dx / len, dz: dz / len, len };
      });
    for (let i = 0; i < info.length; i++) {
      for (let k = i + 1; k < info.length; k++) {
        const A = info[i];
        const B = info[k];
        if (A.s.via === B.s.via) continue;
        const den = A.dx * B.dz - A.dz * B.dx;
        if (Math.abs(den) < 0.12) continue;
        const rx = B.s.ax - A.s.ax;
        const rz = B.s.az - A.s.az;
        const tA = (rx * B.dz - rz * B.dx) / den;
        const tB = (rx * A.dz - rz * A.dx) / den;
        if (tA < -0.5 || tA > A.len + 0.5 || tB < -0.5 || tB > B.len + 0.5) continue;
        const Px = A.s.ax + A.dx * tA;
        const Pz = A.s.az + A.dz * tA;
        const hwA = A.s.halfW;
        const hwB = B.s.halfW;
        const naX = -A.dz, naZ = A.dx;
        const nbX = -B.dz, nbZ = B.dx;
        const tol = 1.0;
        const aInt = tA > tol && tA < A.len - tol;
        const bInt = tB > tol && tB < B.len - tol;
        let combos: [number, number][];
        if (aInt && bInt) combos = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
        else if (aInt && !bInt) {
          const d = tB < B.len / 2 ? 1 : -1;
          const sa = (B.dx * d * naX + B.dz * d * naZ) >= 0 ? 1 : -1;
          combos = [[sa, 1], [sa, -1]];
        } else if (!aInt && bInt) {
          const d = tA < A.len / 2 ? 1 : -1;
          const sb = (A.dx * d * nbX + A.dz * d * nbZ) >= 0 ? 1 : -1;
          combos = [[1, sb], [-1, sb]];
        } else continue;
        const rf = Math.min(rfBase, hwA - 0.2, hwB - 0.2);
        if (rf < 1) continue;
        for (const [sa, sb] of combos) {
          const eAx = naX * sa, eAz = naZ * sa;
          const eBx = nbX * sb, eBz = nbZ * sb;
          const p1x = Px + eAx * hwA, p1z = Pz + eAz * hwA;
          const p2x = Px + eBx * hwB, p2z = Pz + eBz * hwB;
          const t1 = ((p2x - p1x) * B.dz - (p2z - p1z) * B.dx) / den;
          const Cix = p1x + A.dx * t1;
          const Ciz = p1z + A.dz * t1;
          const Ocx = Cix + eAx * rf + eBx * rf;
          const Ocz = Ciz + eAz * rf + eBz * rf;
          const angA = Math.atan2(-eAz, -eAx);
          const angB = Math.atan2(-eBz, -eBx);
          fanArc(Ocx, Ocz, 0, rf + 0.4, angA, angB, 0.07, asphaltGround, asfaltoColor);
          fanArc(Ocx, Ocz, rf, rf + sw, angA, angB, V.calcada.alt, curbs, calcadaColor, calcadaMuretaColor);
        }
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
      const h = heightAt(px, pz);
      parts.push(coloredBox(0.2, V.rua.posteAltura, 0.2, px, h + V.rua.posteAltura / 2, pz, poleColor));
      emissiveParts.push(coloredBox(0.6, 0.3, 0.6, px, h + V.rua.posteAltura + 0.1, pz, lampColor));
      glowDecals.quad(px - 2.6, pz - 2.6, px + 2.6, pz + 2.6, h + 0.05, pool);
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

  function emitGinasio(m: (typeof map.marcos)[number]) {
    const g = cfg.marcos.ginasio;
    stampDisk(m.x, m.z, g.drumR + 1, BUILD, g.base + g.drumH + g.domeH + 2);
    const baseColor = new THREE.Color(K.ginasioBase);
    const base = new THREE.CylinderGeometry(g.drumR + 1.2, g.drumR + 1.8, g.base, 36);
    base.translate(m.x, g.base / 2, m.z);
    parts.push(shadeInto(base, baseColor));
    const drumY = g.base;
    const drum = new THREE.CylinderGeometry(g.drumR, g.drumR, g.drumH, 36);
    drum.translate(m.x, drumY + g.drumH / 2, m.z);
    parts.push(shadeInto(drum, new THREE.Color(K.ginasioDrum)));
    const cornice = new THREE.CylinderGeometry(g.drumR + 0.7, g.drumR + 0.7, 0.8, 36);
    cornice.translate(m.x, drumY + g.drumH, m.z);
    parts.push(shadeInto(cornice, baseColor));
    const domeY = drumY + g.drumH + 0.2;
    const dome = new THREE.SphereGeometry(g.domeR, 36, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    dome.scale(1, g.domeH / g.domeR, 1);
    dome.translate(m.x, domeY, m.z);
    parts.push(shadeInto(dome, new THREE.Color(K.ginasioDome)));
    const ribColor = new THREE.Color(K.ginasioRib);
    const ribLen = Math.hypot(g.domeR, g.domeH) + 0.5;
    const ribAng = Math.atan2(g.domeH, -g.domeR);
    for (let i = 0; i < g.ribs; i++) {
      const a = (i / g.ribs) * Math.PI * 2;
      const rib = new THREE.BoxGeometry(ribLen, 0.4, g.ribW);
      rib.rotateZ(ribAng);
      rib.translate(g.domeR / 2, domeY + g.domeH / 2 + 0.25, 0);
      rib.rotateY(-a);
      rib.translate(m.x, 0, m.z);
      parts.push(shadeInto(rib, ribColor));
    }
    const finial = new THREE.CylinderGeometry(0.4, 0.95, 1.6, 12);
    finial.translate(m.x, domeY + g.domeH + 0.5, m.z);
    parts.push(shadeInto(finial, baseColor));
    const colColor = new THREE.Color(K.ginasioColuna);
    for (let i = 0; i < g.colunas; i++) {
      const a = (i / g.colunas) * Math.PI * 2;
      const ux = -Math.sin(a);
      const uz = Math.cos(a);
      const cx = m.x + Math.cos(a) * (g.drumR + 0.3);
      const cz = m.z + Math.sin(a) * (g.drumR + 0.3);
      parts.push(orientedBox(cx, cz, ux, uz, g.colW, g.colD, g.drumH, drumY + g.drumH / 2, colColor));
      parts.push(orientedBox(cx, cz, ux, uz, g.colW + 0.5, g.colD + 0.35, 0.55, drumY + g.drumH - 0.3, colColor));
    }
    const janela = new THREE.Color(K.ginasioJanela);
    const bandLen = (2 * Math.PI * g.drumR / g.bandaSegs) * 1.06;
    for (let j = 0; j < g.bandaSegs; j++) {
      const a = (j / g.bandaSegs) * Math.PI * 2;
      const ux = -Math.sin(a);
      const uz = Math.cos(a);
      const cx = m.x + Math.cos(a) * (g.drumR + 0.05);
      const cz = m.z + Math.sin(a) * (g.drumR + 0.05);
      emissiveParts.push(orientedBox(cx, cz, ux, uz, bandLen, 0.25, 1.5, drumY + g.drumH * 0.7, janela));
      emissiveParts.push(orientedBox(cx, cz, ux, uz, bandLen * 0.62, 0.25, 2.0, drumY + g.drumH * 0.26, janela));
    }
    const tunEndZ = m.z + g.drumR + g.tunelLen / 2 - 2;
    const tun = new THREE.CylinderGeometry(g.tunelR, g.tunelR, g.tunelLen, 18, 1, true, 0, Math.PI);
    tun.rotateX(Math.PI / 2);
    tun.rotateZ(Math.PI / 2);
    tun.translate(m.x, 0, tunEndZ);
    parts.push(shadeInto(tun, new THREE.Color(K.ginasioTunel)));
    parts.push(coloredBox(g.tunelR * 2 + 0.6, 0.4, g.tunelLen, m.x, g.base, tunEndZ, baseColor));
    emissiveParts.push(coloredBox(g.tunelR * 1.6, 3.2, 0.3, m.x, 1.9, m.z + g.drumR - 0.3, new THREE.Color(K.ginasioJanela)));
    fillCells(m.x, tunEndZ, g.tunelR * 2 + 1, g.tunelLen, BUILD, g.base + g.tunelR);
  }

  function emitPrefeitura(m: (typeof map.marcos)[number]) {
    const p = cfg.marcos.prefeitura;
    fillCells(m.x, m.z, p.w, p.d, BUILD, p.h);
    const white = new THREE.Color(K.prefeituraCorpo);
    const glass = new THREE.Color(K.prefeituraGlass);
    const jan = new THREE.Color(K.prefeituraJanela);
    const terreo = new THREE.Color(K.prefeituraTerreo);
    const vidro = new THREE.Color(K.prefeituraVidro);
    parts.push(coloredBox(p.w - p.terreoInset * 2, p.terreoH, p.d - p.terreoInset * 2, m.x, p.terreoH / 2, m.z, terreo));
    for (const sxx of [-1, 1]) for (const szz of [-1, 1]) {
      parts.push(coloredBox(0.9, p.terreoH, 0.9, m.x + sxx * (p.w / 2 - 0.7), p.terreoH / 2, m.z + szz * (p.d / 2 - 0.7), white));
    }
    const bodyH = p.h - p.terreoH;
    const y0 = p.terreoH;
    parts.push(coloredBox(p.w - 0.6, bodyH, p.d - 0.6, m.x, y0 + bodyH / 2, m.z, glass));
    for (const sxx of [-1, 1]) for (const szz of [-1, 1]) {
      parts.push(coloredBox(1.5, bodyH, 1.5, m.x + sxx * (p.w / 2 - 0.5), y0 + bodyH / 2, m.z + szz * (p.d / 2 - 0.5), white));
    }
    const nFloors = Math.round(bodyH / p.andarH);
    for (let f = 0; f <= nFloors; f++) {
      const y = y0 + f * p.andarH;
      parts.push(coloredBox(p.w + 0.5, 0.55, p.d + 0.5, m.x, y, m.z, white));
    }
    for (let f = 0; f < nFloors; f++) {
      const y = y0 + f * p.andarH + p.andarH / 2;
      const fz = p.d / 2 - 0.28;
      const fx = p.w / 2 - 0.28;
      emissiveParts.push(coloredBox(p.w - 3.4, p.andarH - 1.1, 0.16, m.x, y, m.z + fz, jan));
      emissiveParts.push(coloredBox(p.w - 3.4, p.andarH - 1.1, 0.16, m.x, y, m.z - fz, jan));
      emissiveParts.push(coloredBox(0.16, p.andarH - 1.1, p.d - 3.4, m.x + fx, y, m.z, jan));
      emissiveParts.push(coloredBox(0.16, p.andarH - 1.1, p.d - 3.4, m.x - fx, y, m.z, jan));
    }
    const coreH = bodyH + 2.6;
    const coreX = m.x - p.w / 2 + p.coreW / 2;
    parts.push(coloredBox(p.coreW, coreH, p.d * 0.55, coreX, y0 + coreH / 2, m.z - p.d * 0.12, white));
    parts.push(coloredBox(p.coreW - 1.6, coreH - 1.4, 0.25, coreX, y0 + coreH / 2, m.z + p.d * 0.14, vidro));
    parts.push(coloredBox(p.w + 0.7, 0.7, p.d + 0.7, m.x, p.h + 0.35, m.z, white));
    parts.push(coloredBox(p.w * 0.38, 1.8, p.d * 0.4, m.x + p.w * 0.16, p.h + 1.2, m.z, terreo));
    parts.push(coloredBox(7, 0.3, 3.2, m.x + 1.5, p.terreoH * 0.72, m.z + p.d / 2 + 1.3, white));
    parts.push(coloredBox(6.4, p.terreoH - 0.8, 0.22, m.x + 1.5, (p.terreoH - 0.8) / 2 + 0.3, m.z + p.d / 2 + 0.02, vidro));
  }

  function emitSkate(m: (typeof map.marcos)[number]) {
    const s = cfg.marcos.skate;
    fillCells(m.x, m.z, s.padW, s.padD, ROAD, 0);
    parts.push(coloredBox(s.padW, 0.12, s.padD, m.x, 0.06, m.z, new THREE.Color(K.skateConcreto)));
    const rampColor = new THREE.Color(K.skateRampa);
    const neon = new THREE.Color(K.skateNeon);
    const wedge = (dir: number, ox: number) => {
      const g = new THREE.BoxGeometry(8, 2.4, 6);
      g.rotateX(dir * s.rampaAng);
      g.translate(m.x + ox, 1.0, m.z - 5);
      parts.push(shadeInto(g, rampColor));
      fillCells(m.x + ox, m.z - 5, 8, 6, BUILD, 2.4);
    };
    wedge(-1, -8);
    wedge(1, 8);
    const fb = new THREE.BoxGeometry(7, s.funboxH, 5);
    fb.translate(m.x, s.funboxH / 2, m.z + 5);
    parts.push(shadeInto(fb, rampColor));
    fillCells(m.x, m.z + 5, 7, 5, BUILD, s.funboxH);
    emissiveParts.push(coloredBox(8, 0.12, 0.12, m.x - 8, 2.3, m.z - 8, neon));
    emissiveParts.push(coloredBox(8, 0.12, 0.12, m.x + 8, 2.3, m.z - 8, neon));
    emissiveParts.push(coloredBox(7, 0.12, 0.12, m.x, s.funboxH + 0.06, m.z + 2.5, neon));
  }

  function emitRotatoria(r: (typeof map.rotatorias)[number]) {
    const rc = cfg.marcos.rotatoria;
    const h0 = heightAt(r.x, r.z);
    stampRing(r.x, r.z, r.raioInterno, r.raioExterno, rc.ilhaH);
    const rMid = (r.raioInterno + r.raioExterno) / 2;
    const segLen = 2 * rMid * Math.sin(Math.PI / rc.ringSegs) * 1.06;
    for (let k = 0; k < rc.ringSegs; k++) {
      const a = ((k + 0.5) / rc.ringSegs) * Math.PI * 2;
      asphaltGround.quadRot(r.x + Math.cos(a) * rMid, r.z + Math.sin(a) * rMid, -Math.sin(a), Math.cos(a), segLen, rc.ringWid, h0 + 0.03, asfaltoColor);
    }
    const island = new THREE.CylinderGeometry(r.raioInterno, r.raioInterno, rc.ilhaH, 32);
    island.translate(r.x, h0 + rc.ilhaH / 2, r.z);
    parts.push(shadeInto(island, new THREE.Color(K.rotatoriaIlha)));
    const curb = new THREE.CylinderGeometry(r.raioInterno + 0.4, r.raioInterno + 0.4, 0.5, 32, 1, true);
    curb.translate(r.x, h0 + 0.25, r.z);
    parts.push(shadeInto(curb, new THREE.Color(K.guia)));
    const ob = new THREE.CylinderGeometry(0.3, 1.2, rc.obeliscoH, 4);
    ob.translate(r.x, h0 + rc.ilhaH + rc.obeliscoH / 2, r.z);
    parts.push(shadeInto(ob, new THREE.Color(K.rotatoriaMonumento)));
    emissiveParts.push(coloredBox(0.6, 0.6, 0.6, r.x, h0 + rc.ilhaH + rc.obeliscoH, r.z, new THREE.Color(K.luzPoste)));
  }

  function emitCasa(m: (typeof map.marcos)[number]) {
    const c = cfg.marcos.casa;
    fillCells(m.x, m.z, c.w, c.d, BUILD, c.h);
    const body = new THREE.BoxGeometry(c.w, c.h, c.d);
    body.translate(m.x, c.h / 2, m.z);
    graffitiParts.push(body);
    const cornija = new THREE.Color(K.casaCornija);
    const frame = new THREE.Color(K.casaJanelaFrame);
    const jan = new THREE.Color(K.casaJanela);
    parts.push(coloredBox(c.w + 0.5, 0.7, c.d + 0.5, m.x, 0.35, m.z, frame));
    parts.push(coloredBox(c.w + 0.6, 1.0, c.d + 0.6, m.x, c.h + 0.3, m.z, cornija));
    parts.push(coloredBox(c.w + 0.3, 0.7, c.d + 0.3, m.x, c.h - 1.7, m.z, cornija));
    parts.push(coloredBox(9, 1.7, c.d * 0.55, m.x, c.h + 1.1, m.z, cornija));
    const front = m.z + c.d / 2;
    for (const wx of [-9, -5, 5, 9]) {
      parts.push(coloredBox(2.4, 4.0, 0.2, m.x + wx, 4.3, front + 0.02, frame));
      parts.push(coloredBox(2.0, 3.6, 0.28, m.x + wx, 4.3, front + 0.12, jan));
    }
    parts.push(coloredBox(2.2, 4.8, 0.2, m.x, 2.5, front + 0.02, frame));
    parts.push(coloredBox(1.7, 4.3, 0.34, m.x, 2.35, front + 0.14, new THREE.Color(K.casaPorta)));
    emissiveParts.push(coloredBox(3.0, 0.9, 0.15, m.x - 8, 6.4, front + 0.16, new THREE.Color(K.casaVitrine)));
    const west = m.x - c.w / 2;
    for (const wz of [-4.5, 0, 4.5]) {
      parts.push(coloredBox(0.2, 4.0, 2.4, west - 0.02, 4.3, m.z + wz, frame));
      parts.push(coloredBox(0.28, 3.6, 2.0, west - 0.12, 4.3, m.z + wz, jan));
    }
  }

  function emitBourbon(m: (typeof map.marcos)[number]) {
    const bb = cfg.marcos.bourbon;
    fillCells(m.x, m.z, bb.w, bb.d, BUILD, bb.h);
    const body = new THREE.BoxGeometry(bb.w, bb.h, bb.d);
    body.translate(m.x, bb.h / 2, m.z);
    mallParts.push(body);
    const tw = 16;
    const tH = bb.h + 8;
    const tower = new THREE.BoxGeometry(tw, tH, tw);
    tower.translate(m.x - bb.w / 2 + tw / 2, tH / 2, m.z - bb.d / 2 + tw / 2);
    mallParts.push(tower);
    parts.push(coloredBox(bb.w + 1.5, 1.6, bb.d + 1.5, m.x, bb.h + 0.8, m.z, new THREE.Color(K.bourbonTelhado)));
    parts.push(coloredBox(tw + 1, 1.2, tw + 1, m.x - bb.w / 2 + tw / 2, tH + 0.6, m.z - bb.d / 2 + tw / 2, new THREE.Color(K.bourbonTelhado)));
    parts.push(coloredBox(bb.w + 0.4, 3.2, bb.d + 0.4, m.x, 1.6, m.z, new THREE.Color(K.bourbonGranito)));
    const glass = new THREE.Color(K.bourbonVidro);
    const front = m.z + bb.d / 2;
    for (let i = -3; i <= 3; i++) {
      emissiveParts.push(coloredBox(4.5, bb.h - 6, 0.3, m.x + i * 8, bb.h / 2 + 1.5, front + 0.05, glass));
    }
    const east = m.x + bb.w / 2;
    for (let i = -3; i <= 3; i++) {
      emissiveParts.push(coloredBox(0.3, bb.h - 6, 4.2, east + 0.05, bb.h / 2 + 1.5, m.z + i * 6, glass));
    }
    parts.push(coloredBox(24, 1.2, 8, m.x, 6.6, front + 3.5, new THREE.Color(K.bourbonMarquise)));
    for (const cx of [-10, 10]) parts.push(coloredBox(0.6, 6.6, 0.6, m.x + cx, 3.3, front + 7, new THREE.Color(K.bourbonMarquise)));
    emissiveParts.push(coloredBox(21, 2.6, 0.7, m.x, 9.0, front + 0.35, new THREE.Color(K.bourbonSign)));
    emissiveParts.push(coloredBox(14, 6.5, 0.4, m.x, 13.0, front + 0.1, glass));
    const arch = new THREE.CylinderGeometry(7, 7, 0.4, 22, 1, false, 0, Math.PI);
    arch.rotateX(Math.PI / 2);
    arch.rotateZ(Math.PI / 2);
    arch.translate(m.x, 16.2, front + 0.1);
    emissiveParts.push(shadeInto(arch, glass, true));
    parts.push(coloredBox(11, 4.6, 0.3, m.x, 2.9, front + 0.15, new THREE.Color(K.portaGen)));
    const tx = m.x - bb.w / 2 + tw / 2;
    const tz = m.z - bb.d / 2 + tw / 2;
    facadeWindows(tx, tz, tw, tw, bb.h + 1, tH - bb.h - 3, 3, glass);
  }

  function facadeWindows(cx: number, cz: number, w: number, d: number, y0: number, h: number, floors: number, color: THREE.Color) {
    const fh = h / floors;
    const colsW = Math.max(2, Math.round(w / 3.2));
    const colsD = Math.max(2, Math.round(d / 3.2));
    const winW = (w / colsW) * 0.62;
    const winD = (d / colsD) * 0.62;
    for (let f = 0; f < floors; f++) {
      const y = y0 + f * fh + fh * 0.5;
      const wh = fh * 0.55;
      for (let c = 0; c < colsW; c++) {
        const x = cx - w / 2 + (c + 0.5) * (w / colsW);
        emissiveParts.push(coloredBox(winW, wh, 0.16, x, y, cz + d / 2 + 0.04, color));
        emissiveParts.push(coloredBox(winW, wh, 0.16, x, y, cz - d / 2 - 0.04, color));
      }
      for (let c = 0; c < colsD; c++) {
        const z = cz - d / 2 + (c + 0.5) * (d / colsD);
        emissiveParts.push(coloredBox(0.16, wh, winD, cx + w / 2 + 0.04, y, z, color));
        emissiveParts.push(coloredBox(0.16, wh, winD, cx - w / 2 - 0.04, y, z, color));
      }
    }
  }

  function emitTorre(b: (typeof map.predios)[number]) {
    const roof = new THREE.Color(K.telhadoGen);
    parts.push(coloredBox(b.w, b.h, b.d, b.x, b.h / 2, b.z, new THREE.Color(b.cor)));
    facadeWindows(b.x, b.z, b.w, b.d, 1.0, b.h - 1.5, Math.max(6, Math.round(b.h / 3.2)), new THREE.Color(K.janelaFria));
    parts.push(coloredBox(b.w + 0.5, 0.7, b.d + 0.5, b.x, b.h + 0.35, b.z, roof));
    parts.push(coloredBox(b.w * 0.42, 1.8, b.d * 0.42, b.x, b.h + 1.6, b.z, roof));
    parts.push(coloredBox(0.2, 4, 0.2, b.x, b.h + 4, b.z, roof));
    emissiveParts.push(coloredBox(0.5, 0.5, 0.5, b.x, b.h + 6, b.z, new THREE.Color('#ff3b3b')));
  }

  function emitPredio(b: (typeof map.predios)[number]) {
    const cor = new THREE.Color(b.cor);
    parts.push(coloredBox(b.w, b.h, b.d, b.x, b.h / 2, b.z, cor));
    const floors = Math.max(3, Math.round(b.h / 3.2));
    facadeWindows(b.x, b.z, b.w, b.d, 0.8, b.h - 1.2, floors, new THREE.Color(K.janelaQuente));
    const light = cor.clone().multiplyScalar(1.28);
    const fh = (b.h - 1.2) / floors;
    for (let f = 1; f < floors; f++) {
      const y = 0.8 + f * fh;
      parts.push(coloredBox(b.w + 0.5, 0.25, 0.5, b.x, y, b.z + b.d / 2 + 0.12, light));
      parts.push(coloredBox(b.w + 0.5, 0.25, 0.5, b.x, y, b.z - b.d / 2 - 0.12, light));
    }
    parts.push(coloredBox(b.w + 0.4, 0.7, b.d + 0.4, b.x, b.h + 0.35, b.z, light));
    const tank = new THREE.CylinderGeometry(1.4, 1.4, 2.2, 12);
    tank.translate(b.x + b.w * 0.22, b.h + 1.4, b.z - b.d * 0.15);
    parts.push(shadeInto(tank, new THREE.Color(K.telhadoGen)));
  }

  function emitLoja(b: (typeof map.predios)[number]) {
    const cor = new THREE.Color(b.cor);
    const dark = cor.clone().multiplyScalar(0.62);
    parts.push(coloredBox(b.w, b.h, b.d, b.x, b.h / 2, b.z, cor));
    parts.push(coloredBox(b.w + 0.3, 1.1, b.d + 0.3, b.x, b.h * 0.5, b.z, dark));
    facadeWindows(b.x, b.z, b.w, b.d, b.h * 0.6, b.h * 0.34, 1, new THREE.Color(K.janelaQuente));
    const vitrine = new THREE.Color(K.vitrineLoja);
    const porta = new THREE.Color(K.portaGen);
    for (const fz of [1, -1]) {
      const zf = b.z + fz * (b.d / 2);
      emissiveParts.push(coloredBox(b.w - 1.2, b.h * 0.4, 0.2, b.x, b.h * 0.22, zf + fz * 0.06, vitrine));
      parts.push(coloredBox(b.w - 0.6, 0.3, 1.8, b.x, b.h * 0.44, zf + fz * 0.9, dark));
      parts.push(coloredBox(1.4, b.h * 0.42, 0.22, b.x + b.w * 0.32, b.h * 0.21, zf + fz * 0.07, porta));
    }
    parts.push(coloredBox(b.w + 0.3, 0.5, b.d + 0.3, b.x, b.h + 0.25, b.z, dark));
  }

  function emitGalpao(b: (typeof map.predios)[number]) {
    const cor = new THREE.Color(b.cor);
    const roofCol = new THREE.Color(K.telhadoGen);
    const roofDark = roofCol.clone().multiplyScalar(0.8);
    const porta = new THREE.Color(K.portaGen);
    const cool = new THREE.Color(K.janelaFria);
    parts.push(coloredBox(b.w, b.h, b.d, b.x, b.h / 2, b.z, cor));
    parts.push(coloredBox(b.w + 0.6, 0.5, b.d + 0.6, b.x, b.h + 0.25, b.z, roofCol));
    for (let i = -2; i <= 2; i++) parts.push(coloredBox(b.w + 0.6, 0.14, 0.22, b.x, b.h + 0.52, b.z + i * (b.d / 5), roofDark));
    for (const fz of [1, -1]) {
      const zf = b.z + fz * (b.d / 2);
      parts.push(coloredBox(b.w + 0.7, 0.9, 0.45, b.x, b.h + 0.45, zf + fz * 0.1, roofCol));
      parts.push(coloredBox(b.w * 0.34, b.h * 0.72, 0.2, b.x, b.h * 0.36, zf + fz * 0.06, porta));
      emissiveParts.push(coloredBox(b.w * 0.72, 0.8, 0.14, b.x, b.h * 0.82, zf + fz * 0.06, cool));
    }
    for (const cx of [-0.22, 0.22]) parts.push(coloredBox(2.2, 1.2, 2.2, b.x + b.w * cx, b.h + 0.9, b.z, roofDark));
  }

  map.vias.forEach((via, vi) => {
    if (via.tipo !== 'br') {
      buildRoadRibbon(via, vi);
      buildSidewalks(via, vi);
    }
  });
  emitJuncoes();
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

  function emitBuilding(x: number, z: number, rot: number, fn: () => void) {
    const s0 = parts.length;
    const s1 = emissiveParts.length;
    const s2 = graffitiParts.length;
    const s3 = mallParts.length;
    fn();
    const y0 = heightAt(x, z);
    if (rot === 0 && y0 === 0) return;
    const apply = (arr: THREE.BufferGeometry[], from: number) => {
      for (let i = from; i < arr.length; i++) {
        const g = arr[i];
        if (rot !== 0) {
          g.translate(-x, 0, -z);
          g.rotateY(rot);
          g.translate(x, 0, z);
        }
        if (y0 !== 0) g.translate(0, y0, 0);
      }
    };
    apply(parts, s0);
    apply(emissiveParts, s1);
    apply(graffitiParts, s2);
    apply(mallParts, s3);
  }

  for (const b of map.predios) {
    fillCells(b.x, b.z, b.w, b.d, BUILD, b.h);
    emitBuilding(b.x, b.z, b.rot ?? 0, () => {
      if (b.tipo === 'torre') emitTorre(b);
      else if (b.tipo === 'predio') emitPredio(b);
      else if (b.tipo === 'loja') emitLoja(b);
      else if (b.tipo === 'galpao') emitGalpao(b);
      else parts.push(coloredBox(b.w, b.h, b.d, b.x, b.h / 2, b.z, new THREE.Color(b.cor)));
    });
  }
  for (const m of map.marcos) {
    emitBuilding(m.x, m.z, m.rot ?? 0, () => {
      if (m.tipo === 'ginasio') emitGinasio(m);
      else if (m.tipo === 'prefeitura') emitPrefeitura(m);
      else if (m.tipo === 'skate') emitSkate(m);
      else if (m.tipo === 'casa') emitCasa(m);
      else if (m.tipo === 'bourbon') emitBourbon(m);
    });
  }
  for (const r of map.rotatorias) emitRotatoria(r);

  const ground = new QuadBatch();
  const grama = new THREE.Color(K.grama);
  const gcol = new THREE.Color();
  const GS = 6;
  const nG = Math.ceil(T / GS);
  for (let gz = 0; gz < nG; gz++) {
    for (let gx = 0; gx < nG; gx++) {
      const x0 = -HALF + gx * GS;
      const x1 = Math.min(HALF, x0 + GS);
      const z0 = -HALF + gz * GS;
      const z1 = Math.min(HALF, z0 + GS);
      const h00 = heightAt(x0, z0);
      const h10 = heightAt(x1, z0);
      const h11 = heightAt(x1, z1);
      const h01 = heightAt(x0, z1);
      const k = 1 + Math.max(-0.25, Math.min(0.4, ((h00 + h10 + h11 + h01) / 4) * 0.018));
      gcol.copy(grama).multiplyScalar(k);
      ground.quad3(x0, h00, z0, x1, h10, z0, x1, h11, z1, x0, h01, z1, gcol);
    }
  }

  const cityMeshes: THREE.Mesh[] = [];
  const addMesh = (geo: THREE.BufferGeometry | null, mat: THREE.Material) => {
    if (!geo) return;
    const mesh = new THREE.Mesh(geo, mat);
    ctx.scene.add(mesh);
    cityMeshes.push(mesh);
  };
  const material = new THREE.MeshBasicMaterial({ vertexColors: true });
  const asphaltTexture = createAsphaltTexture(ctx.stage.lowTier);
  ctx.textures.asfalto = asphaltTexture;
  const asphaltMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, map: asphaltTexture });
  addMesh(ground.build(), material);
  addMesh(asphaltGround.build(), asphaltMaterial);
  addMesh(deco.build(), material);
  const curbMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
  addMesh(curbs.build(), curbMaterial);
  addMesh(mergeParts(parts), material);
  const graffitiTexture = createGraffitiTexture(ctx.stage.lowTier);
  ctx.textures.grafite = graffitiTexture;
  const graffitiMaterial = new THREE.MeshBasicMaterial({ map: graffitiTexture });
  addMesh(mergeParts(graffitiParts), graffitiMaterial);
  const mallTexture = createMallTexture(ctx.stage.lowTier);
  ctx.textures.mall = mallTexture;
  const mallMaterial = new THREE.MeshBasicMaterial({ map: mallTexture });
  addMesh(mergeParts(mallParts), mallMaterial);
  const emissiveMaterial = new THREE.MeshBasicMaterial({ vertexColors: true });
  addMesh(mergeParts(emissiveParts), emissiveMaterial);
  const glowDecalMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false });
  addMesh(glowDecals.build(), glowDecalMaterial);

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
    tintables: [material, asphaltMaterial, curbMaterial, graffitiMaterial, mallMaterial],
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
      const roadCasing = style === 'gps' ? '#6a6e76' : '#2a2f3c';
      const roadFill = style === 'gps' ? '#b2b6bd' : '#464d60';
      for (const pass of [0, 1]) {
        for (const via of map.vias) {
          if (via.tipo === 'br') continue;
          const wide = via.tipo === 'avenida';
          g.beginPath();
          via.pontos.forEach(([x, z], i) => {
            const px = (x + HALF) * s;
            const py = (z + HALF) * s;
            if (i) g.lineTo(px, py);
            else g.moveTo(px, py);
          });
          g.strokeStyle = pass === 0 ? roadCasing : roadFill;
          g.lineWidth = pass === 0 ? (wide ? 8 : 5) : (wide ? 6.5 : 3.5);
          g.stroke();
        }
      }
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
    heightAt(x, z) {
      return heightAt(x, z);
    },
    dispose() {
      for (const mesh of cityMeshes) {
        ctx.scene.remove(mesh);
        mesh.geometry.dispose();
      }
      for (const mat of [material, asphaltMaterial, curbMaterial, graffitiMaterial, mallMaterial, emissiveMaterial, glowDecalMaterial]) mat.dispose();
      for (const tex of [asphaltTexture, graffitiTexture, mallTexture]) tex.dispose();
    },
    buildingTopAt(x, z) {
      return tops[cellOf(x) + cellOf(z) * N];
    },
  };
}
