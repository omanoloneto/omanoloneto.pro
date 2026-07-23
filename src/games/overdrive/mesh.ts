import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function coloredBox(w: number, h: number, d: number, x: number, y: number, z: number, color: THREE.Color): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  const n = g.attributes.position.count;
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
}

const LIGHT = new THREE.Vector3(0.35, 0.9, -0.3).normalize();

export function faceShade(normal: THREE.Vector3): number {
  return 0.58 + 0.42 * Math.max(0, normal.dot(LIGHT));
}

export type UVRect = [number, number, number, number];

export const WHITE_UV: UVRect = [0.02, 0.955, 0.045, 0.98];

export type PrismFace = 'front' | 'right' | 'back' | 'left' | 'top' | 'bottom';

export interface PrismMods {
  sx?: number;
  sz?: number;
  ox?: number;
  oz?: number;
  yFront?: number;
  yBack?: number;
  flat?: boolean;
  uv?: Partial<Record<PrismFace, UVRect>>;
}

export function shadedPrism(w: number, h: number, d: number, cx: number, cy: number, cz: number, color: THREE.Color, mods: PrismMods = {}): THREE.BufferGeometry {
  const sx = mods.sx ?? 1;
  const sz = mods.sz ?? 1;
  const ox = mods.ox ?? 0;
  const oz = mods.oz ?? 0;
  const yF = mods.yFront ?? 0;
  const yB = mods.yBack ?? 0;
  const hw = w / 2;
  const hd = d / 2;
  const y0 = cy - h / 2;
  const y1 = cy + h / 2;
  const b = [
    [cx - hw, y0, cz - hd],
    [cx + hw, y0, cz - hd],
    [cx + hw, y0, cz + hd],
    [cx - hw, y0, cz + hd],
  ];
  const t = [
    [cx - hw * sx + ox, y1 + yF, cz - hd * sz + oz],
    [cx + hw * sx + ox, y1 + yF, cz - hd * sz + oz],
    [cx + hw * sx + ox, y1 + yB, cz + hd * sz + oz],
    [cx - hw * sx + ox, y1 + yB, cz + hd * sz + oz],
  ];
  const quads: Array<{ face: PrismFace; c: number[][] }> = [
    { face: 'front', c: [b[0], b[1], t[1], t[0]] },
    { face: 'right', c: [b[1], b[2], t[2], t[1]] },
    { face: 'back', c: [b[2], b[3], t[3], t[2]] },
    { face: 'left', c: [b[3], b[0], t[0], t[3]] },
    { face: 'top', c: [t[0], t[1], t[2], t[3]] },
    { face: 'bottom', c: [b[3], b[2], b[1], b[0]] },
  ];
  const pos: number[] = [];
  const col: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const va = new THREE.Vector3();
  const vb = new THREE.Vector3();
  const vn = new THREE.Vector3();
  for (const { face, c: q } of quads) {
    va.set(q[1][0] - q[0][0], q[1][1] - q[0][1], q[1][2] - q[0][2]);
    vb.set(q[3][0] - q[0][0], q[3][1] - q[0][1], q[3][2] - q[0][2]);
    vn.crossVectors(vb, va).normalize();
    const k = mods.flat ? 1 : faceShade(vn);
    const r = mods.uv?.[face] ?? WHITE_UV;
    const base = pos.length / 3;
    for (const p of q) {
      pos.push(p[0], p[1], p[2]);
      col.push(color.r * k, color.g * k, color.b * k);
    }
    uv.push(r[0], r[1], r[2], r[1], r[2], r[3], r[0], r[3]);
    idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2));
  g.setIndex(idx);
  return g;
}

export interface LoftStation {
  z: number;
  pts: Array<[number, number]>;
}

export interface LoftOptions {
  colorFor?: (band: number, seg: number) => THREE.Color | null;
  flatFor?: (band: number, seg: number) => boolean;
  uvFor?: (band: number, seg: number, side: 1 | -1) => UVRect | null;
  capFront?: boolean;
  capBack?: boolean;
}

export function loftHull(stations: LoftStation[], color: THREE.Color, opts: LoftOptions = {}): THREE.BufferGeometry {
  const nS = stations.length;
  const nP = stations[0].pts.length;
  const point = (i: number, p: number, side: number) => {
    const pt = stations[i].pts[p];
    return new THREE.Vector3(pt[0] * side, pt[1], stations[i].z);
  };
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  const faceN: THREE.Vector3[][][] = [[], []];
  for (let s = 0; s < 2; s++) {
    const side = s === 0 ? 1 : -1;
    for (let i = 0; i < nS - 1; i++) {
      faceN[s][i] = [];
      for (let p = 0; p < nP - 1; p++) {
        e1.subVectors(point(i, p + 1, side), point(i, p, side));
        e2.subVectors(point(i + 1, p, side), point(i, p, side));
        const n = new THREE.Vector3().crossVectors(e1, e2);
        if (side < 0) n.negate();
        faceN[s][i][p] = n.lengthSq() < 1e-12 ? n.set(0, 0, 0) : n.normalize();
      }
    }
  }
  const shade: number[][][] = [[], []];
  const acc = new THREE.Vector3();
  for (let s = 0; s < 2; s++) {
    for (let i = 0; i < nS; i++) {
      shade[s][i] = [];
      for (let p = 0; p < nP; p++) {
        acc.set(0, 0, 0);
        for (const bi of [i - 1, i]) {
          for (const pi of [p - 1, p]) {
            if (bi >= 0 && bi < nS - 1 && pi >= 0 && pi < nP - 1) acc.add(faceN[s][bi][pi]);
          }
        }
        if (acc.lengthSq() < 1e-12) acc.set(0, 1, 0);
        shade[s][i][p] = faceShade(acc.normalize());
      }
    }
  }
  const pos: number[] = [];
  const col: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const wu = (WHITE_UV[0] + WHITE_UV[2]) / 2;
  const wv = (WHITE_UV[1] + WHITE_UV[3]) / 2;
  function push(v: THREE.Vector3, c: THREE.Color, k: number, u: number, vv: number) {
    pos.push(v.x, v.y, v.z);
    col.push(c.r * k, c.g * k, c.b * k);
    uv.push(u, vv);
  }
  for (let s = 0; s < 2; s++) {
    const side = (s === 0 ? 1 : -1) as 1 | -1;
    for (let i = 0; i < nS - 1; i++) {
      for (let p = 0; p < nP - 1; p++) {
        if (faceN[s][i][p].lengthSq() < 1e-12) continue;
        const c = opts.colorFor?.(i, p) ?? color;
        const flat = opts.flatFor?.(i, p) ?? false;
        const r = opts.uvFor?.(i, p, side) ?? WHITE_UV;
        const corners: Array<[number, number]> = [[i, p], [i, p + 1], [i + 1, p + 1], [i + 1, p]];
        const uvc = [[r[0], r[1]], [r[0], r[3]], [r[2], r[3]], [r[2], r[1]]];
        const base = pos.length / 3;
        for (let j = 0; j < 4; j++) {
          const [ci, cp] = corners[j];
          push(point(ci, cp, side), c, flat ? 1 : shade[s][ci][cp], uvc[j][0], uvc[j][1]);
        }
        if (side > 0) idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
        else idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
      }
    }
  }
  function cap(i: number, dir: 1 | -1) {
    const ring: THREE.Vector3[] = [];
    for (let p = 0; p < nP; p++) ring.push(point(i, p, 1));
    for (let p = nP - 2; p >= 1; p--) ring.push(point(i, p, -1));
    const cen = new THREE.Vector3();
    for (const v of ring) cen.add(v);
    cen.multiplyScalar(1 / ring.length);
    const k = faceShade(e1.set(0, 0, dir));
    const base = pos.length / 3;
    push(cen, color, k, wu, wv);
    for (const v of ring) push(v, color, k, wu, wv);
    for (let j = 0; j < ring.length; j++) {
      const a = base + 1 + j;
      const b = base + 1 + ((j + 1) % ring.length);
      if (dir < 0) idx.push(base, b, a);
      else idx.push(base, a, b);
    }
  }
  if (opts.capFront ?? true) cap(0, -1);
  if (opts.capBack ?? true) cap(nS - 1, 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2));
  g.setIndex(idx);
  return g;
}

export interface ArchOptions {
  x: number;
  y: number;
  z: number;
  radius: number;
  lipWidth: number;
  depth: number;
  segments: number;
  lipColor: THREE.Color;
  tubColor: THREE.Color;
}

export function archFlare(o: ArchOptions): THREE.BufferGeometry {
  const sign = o.x >= 0 ? 1 : -1;
  const pos: number[] = [];
  const col: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const wu = (WHITE_UV[0] + WHITE_UV[2]) / 2;
  const wv = (WHITE_UV[1] + WHITE_UV[3]) / 2;
  const tmp = new THREE.Vector3();
  function vert(x: number, y: number, z: number, c: THREE.Color, k: number) {
    pos.push(x, y, z);
    col.push(c.r * k, c.g * k, c.b * k);
    uv.push(wu, wv);
  }
  function quad(c: number[][], color: THREE.Color, k: number, flip: boolean) {
    const base = pos.length / 3;
    for (const v of c) vert(v[0], v[1], v[2], color, k);
    if (flip) idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
    else idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const lipK = faceShade(tmp.set(sign, 0, 0));
  const xi = o.x - sign * o.depth;
  for (let s = 0; s < o.segments; s++) {
    const a0 = (s / o.segments) * Math.PI;
    const a1 = ((s + 1) / o.segments) * Math.PI;
    const y0 = o.y + Math.sin(a0) * o.radius;
    const z0 = o.z + Math.cos(a0) * o.radius;
    const y1 = o.y + Math.sin(a1) * o.radius;
    const z1 = o.z + Math.cos(a1) * o.radius;
    const yo0 = o.y + Math.sin(a0) * (o.radius + o.lipWidth);
    const zo0 = o.z + Math.cos(a0) * (o.radius + o.lipWidth);
    const yo1 = o.y + Math.sin(a1) * (o.radius + o.lipWidth);
    const zo1 = o.z + Math.cos(a1) * (o.radius + o.lipWidth);
    quad(
      [[o.x, y0, z0], [o.x, y1, z1], [o.x, yo1, zo1], [o.x, yo0, zo0]],
      o.lipColor,
      lipK,
      sign < 0,
    );
    quad(
      [[o.x, y0, z0], [o.x, y1, z1], [xi, y1, z1], [xi, y0, z0]],
      o.tubColor,
      1,
      sign > 0,
    );
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2));
  g.setIndex(idx);
  return g;
}

export interface WheelStyle {
  radius: number;
  width: number;
  rimRadius: number;
  dishDepth: number;
  spokes: number;
  spokeWidth: number;
  segments: number;
  tireColor: THREE.Color;
  rimColor: THREE.Color;
  spokeColor: THREE.Color;
  hubColor: THREE.Color;
  faceUV?: UVRect;
}

export function buildWheel(st: WheelStyle): THREE.BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const wu = (WHITE_UV[0] + WHITE_UV[2]) / 2;
  const wv = (WHITE_UV[1] + WHITE_UV[3]) / 2;
  const tmp = new THREE.Vector3();
  const hx = st.width / 2;
  const wellR = st.rimRadius * 0.82;
  const hubR = st.rimRadius * 0.24;
  const ringY = (a: number, r: number) => Math.cos(a) * r;
  const ringZ = (a: number, r: number) => Math.sin(a) * r;
  function vert(x: number, y: number, z: number, c: THREE.Color, k: number, u = wu, v = wv) {
    pos.push(x, y, z);
    col.push(c.r * k, c.g * k, c.b * k);
    uv.push(u, v);
  }
  function quad(c: Array<[number, number, number]>, color: THREE.Color, ks: number[], flip: boolean) {
    const base = pos.length / 3;
    for (let j = 0; j < 4; j++) vert(c[j][0], c[j][1], c[j][2], color, ks[j]);
    if (flip) idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
    else idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const n = st.segments;
  const kx: Record<number, number> = {
    1: faceShade(tmp.set(1, 0, 0)),
    [-1]: faceShade(tmp.set(-1, 0, 0)),
  };
  for (let s = 0; s < n; s++) {
    const a0 = (s / n) * Math.PI * 2;
    const a1 = ((s + 1) / n) * Math.PI * 2;
    const k0 = faceShade(tmp.set(0, Math.cos(a0), Math.sin(a0)));
    const k1 = faceShade(tmp.set(0, Math.cos(a1), Math.sin(a1)));
    quad(
      [
        [-hx, ringY(a0, st.radius), ringZ(a0, st.radius)],
        [-hx, ringY(a1, st.radius), ringZ(a1, st.radius)],
        [hx, ringY(a1, st.radius), ringZ(a1, st.radius)],
        [hx, ringY(a0, st.radius), ringZ(a0, st.radius)],
      ],
      st.tireColor,
      [k0, k1, k1, k0],
      false,
    );
    for (const side of [1, -1]) {
      const xf = hx * side;
      const kf = kx[side];
      quad(
        [
          [xf, ringY(a0, st.rimRadius), ringZ(a0, st.rimRadius)],
          [xf, ringY(a1, st.rimRadius), ringZ(a1, st.rimRadius)],
          [xf, ringY(a1, st.radius), ringZ(a1, st.radius)],
          [xf, ringY(a0, st.radius), ringZ(a0, st.radius)],
        ],
        st.tireColor,
        [kf * 0.82, kf * 0.82, kf * 0.82, kf * 0.82],
        side > 0,
      );
      quad(
        [
          [xf, ringY(a0, wellR), ringZ(a0, wellR)],
          [xf, ringY(a1, wellR), ringZ(a1, wellR)],
          [xf, ringY(a1, st.rimRadius), ringZ(a1, st.rimRadius)],
          [xf, ringY(a0, st.rimRadius), ringZ(a0, st.rimRadius)],
        ],
        st.rimColor,
        [kf, kf, kf, kf],
        side > 0,
      );
      const xw = (hx - st.dishDepth) * side;
      quad(
        [
          [xf, ringY(a0, wellR), ringZ(a0, wellR)],
          [xf, ringY(a1, wellR), ringZ(a1, wellR)],
          [xw, ringY(a1, wellR), ringZ(a1, wellR)],
          [xw, ringY(a0, wellR), ringZ(a0, wellR)],
        ],
        st.rimColor,
        [kf * 0.55, kf * 0.55, kf * 0.55, kf * 0.55],
        side < 0,
      );
    }
  }
  for (const side of [1, -1]) {
    const xw = (hx - st.dishDepth) * side;
    const kf = kx[side];
    const useArt = !!st.faceUV;
    const floorColor = useArt ? new THREE.Color('#ffffff') : st.hubColor;
    const floorK = useArt ? 1 : kf * 0.7;
    const r = st.faceUV;
    const cu = r ? (r[0] + r[2]) / 2 : wu;
    const cv = r ? (r[1] + r[3]) / 2 : wv;
    const ru = r ? (r[2] - r[0]) / 2 : 0;
    const rv = r ? (r[3] - r[1]) / 2 : 0;
    const base = pos.length / 3;
    vert(xw, 0, 0, floorColor, floorK, cu, cv);
    for (let s = 0; s < n; s++) {
      const a = (s / n) * Math.PI * 2;
      vert(xw, ringY(a, wellR), ringZ(a, wellR), floorColor, floorK, cu + Math.cos(a) * ru, cv + Math.sin(a) * rv);
    }
    for (let s = 0; s < n; s++) {
      const a = base + 1 + s;
      const b = base + 1 + ((s + 1) % n);
      if (side > 0) idx.push(base, a, b);
      else idx.push(base, b, a);
    }
    if (st.spokes > 0) {
      const xs = (hx - st.dishDepth * 0.4) * side;
      for (let i = 0; i < st.spokes; i++) {
        const a = (i / st.spokes) * Math.PI * 2;
        const dy = Math.cos(a);
        const dz = Math.sin(a);
        const ty = -dz * (st.spokeWidth / 2);
        const tz = dy * (st.spokeWidth / 2);
        quad(
          [
            [xs, dy * hubR - ty, dz * hubR - tz],
            [xs, dy * hubR + ty, dz * hubR + tz],
            [xs, dy * wellR + ty, dz * wellR + tz],
            [xs, dy * wellR - ty, dz * wellR - tz],
          ],
          st.spokeColor,
          [kf, kf, kf, kf],
          side > 0,
        );
      }
      const xh = (hx - st.dishDepth * 0.25) * side;
      const hb = pos.length / 3;
      vert(xh, 0, 0, st.hubColor, kf);
      for (let s = 0; s < 8; s++) {
        const a = (s / 8) * Math.PI * 2;
        vert(xh, ringY(a, hubR), ringZ(a, hubR), st.hubColor, kf);
      }
      for (let s = 0; s < 8; s++) {
        const a = hb + 1 + s;
        const b = hb + 1 + ((s + 1) % 8);
        if (side > 0) idx.push(hb, a, b);
        else idx.push(hb, b, a);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2));
  g.setIndex(idx);
  return g;
}

export function orientedBox(cx: number, cz: number, ux: number, uz: number, len: number, wid: number, h: number, yCenter: number, color: THREE.Color): THREE.BufferGeometry {
  const g = coloredBox(wid, h, len, 0, yCenter, 0, color);
  g.rotateY(Math.atan2(ux, uz));
  g.translate(cx, 0, cz);
  return g;
}

export function shadeInto(geo: THREE.BufferGeometry, color: THREE.Color, flat = false): THREE.BufferGeometry {
  const normal = geo.attributes.normal;
  const count = geo.attributes.position.count;
  const colors = new Float32Array(count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    let k = 1;
    if (!flat && normal) {
      v.set(normal.getX(i), normal.getY(i), normal.getZ(i));
      k = faceShade(v);
    }
    colors[i * 3] = color.r * k;
    colors[i * 3 + 1] = color.g * k;
    colors[i * 3 + 2] = color.b * k;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

export function mergeParts(parts: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (!parts.length) return null;
  const geo = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return geo;
}

export class QuadBatch {
  pos: number[] = [];
  col: number[] = [];
  uv: number[] = [];
  idx: number[] = [];

  constructor(private uvScale?: number) {}

  quad(x0: number, z0: number, x1: number, z1: number, y: number, color: THREE.Color) {
    const b = this.pos.length / 3;
    this.pos.push(x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z1);
    for (let i = 0; i < 4; i++) this.col.push(color.r, color.g, color.b);
    if (this.uvScale) {
      const s = this.uvScale;
      this.uv.push(x0 / s, z0 / s, x1 / s, z0 / s, x1 / s, z1 / s, x0 / s, z1 / s);
    }
    this.idx.push(b, b + 2, b + 1, b, b + 3, b + 2);
  }

  quadCorners(ax: number, az: number, bx: number, bz: number, cx: number, cz: number, dx: number, dz: number, y: number, color: THREE.Color) {
    const b = this.pos.length / 3;
    this.pos.push(ax, y, az, bx, y, bz, cx, y, cz, dx, y, dz);
    for (let i = 0; i < 4; i++) this.col.push(color.r, color.g, color.b);
    if (this.uvScale) {
      const s = this.uvScale;
      this.uv.push(ax / s, az / s, bx / s, bz / s, cx / s, cz / s, dx / s, dz / s);
    }
    this.idx.push(b, b + 2, b + 1, b, b + 3, b + 2);
  }

  quadWall(ax: number, az: number, bx: number, bz: number, y0: number, y1: number, color: THREE.Color) {
    const b = this.pos.length / 3;
    this.pos.push(ax, y0, az, bx, y0, bz, bx, y1, bz, ax, y1, az);
    for (let i = 0; i < 4; i++) this.col.push(color.r, color.g, color.b);
    if (this.uvScale) {
      const s = this.uvScale;
      this.uv.push(ax / s, az / s, bx / s, bz / s, bx / s, bz / s, ax / s, az / s);
    }
    this.idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }

  quadRot(cx: number, cz: number, ux: number, uz: number, len: number, wid: number, y: number, color: THREE.Color) {
    const hl = len / 2;
    const hw = wid / 2;
    const nx = -uz;
    const nz = ux;
    const ax = cx - ux * hl;
    const az = cz - uz * hl;
    const bx = cx + ux * hl;
    const bz = cz + uz * hl;
    const c0x = ax - nx * hw, c0z = az - nz * hw;
    const c1x = bx - nx * hw, c1z = bz - nz * hw;
    const c2x = bx + nx * hw, c2z = bz + nz * hw;
    const c3x = ax + nx * hw, c3z = az + nz * hw;
    const b = this.pos.length / 3;
    this.pos.push(c0x, y, c0z, c1x, y, c1z, c2x, y, c2z, c3x, y, c3z);
    for (let i = 0; i < 4; i++) this.col.push(color.r, color.g, color.b);
    if (this.uvScale) {
      const s = this.uvScale;
      this.uv.push(c0x / s, c0z / s, c1x / s, c1z / s, c2x / s, c2z / s, c3x / s, c3z / s);
    }
    this.idx.push(b, b + 2, b + 1, b, b + 3, b + 2);
  }

  build(): THREE.BufferGeometry | null {
    if (!this.idx.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.pos), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.col), 3));
    if (this.uv.length) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(this.uv), 2));
    g.setIndex(this.idx);
    return g;
  }
}

export function textSprite(text: string, scale: number): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const c = canvas.getContext('2d')!;
  c.font = '800 44px Oxanium, Verdana, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineWidth = 9;
  c.strokeStyle = 'rgba(5, 8, 20, 0.95)';
  c.strokeText(text, 256, 48);
  c.fillStyle = '#ffffff';
  c.fillText(text, 256, 48);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sprite.scale.set(scale, scale * (96 / 512), 1);
  return sprite;
}
