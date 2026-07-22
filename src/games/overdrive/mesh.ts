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

export interface PrismMods {
  sx?: number;
  sz?: number;
  ox?: number;
  oz?: number;
  yFront?: number;
  yBack?: number;
  flat?: boolean;
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
  const quads: number[][][] = [
    [b[0], b[1], t[1], t[0]],
    [b[1], b[2], t[2], t[1]],
    [b[2], b[3], t[3], t[2]],
    [b[3], b[0], t[0], t[3]],
    [t[0], t[1], t[2], t[3]],
    [b[3], b[2], b[1], b[0]],
  ];
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const va = new THREE.Vector3();
  const vb = new THREE.Vector3();
  const vn = new THREE.Vector3();
  for (const q of quads) {
    va.set(q[1][0] - q[0][0], q[1][1] - q[0][1], q[1][2] - q[0][2]);
    vb.set(q[3][0] - q[0][0], q[3][1] - q[0][1], q[3][2] - q[0][2]);
    vn.crossVectors(va, vb).normalize();
    const k = mods.flat ? 1 : faceShade(vn);
    const base = pos.length / 3;
    for (const p of q) {
      pos.push(p[0], p[1], p[2]);
      col.push(color.r * k, color.g * k, color.b * k);
    }
    idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3));
  g.setIndex(idx);
  return g;
}

export function shadeGeometry(geo: THREE.BufferGeometry, color: THREE.Color): THREE.BufferGeometry {
  const n = geo.attributes.position.count;
  const normals = geo.attributes.normal;
  const col = new Float32Array(n * 3);
  const vn = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    vn.set(normals.getX(i), normals.getY(i), normals.getZ(i));
    const k = faceShade(vn);
    col[i * 3] = color.r * k;
    col[i * 3 + 1] = color.g * k;
    col[i * 3 + 2] = color.b * k;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.deleteAttribute('normal');
  geo.deleteAttribute('uv');
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
  idx: number[] = [];

  quad(x0: number, z0: number, x1: number, z1: number, y: number, color: THREE.Color) {
    const b = this.pos.length / 3;
    this.pos.push(x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z1);
    for (let i = 0; i < 4; i++) this.col.push(color.r, color.g, color.b);
    this.idx.push(b, b + 2, b + 1, b, b + 3, b + 2);
  }

  build(): THREE.BufferGeometry | null {
    if (!this.idx.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.pos), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.col), 3));
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
