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
