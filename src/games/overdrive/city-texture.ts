import * as THREE from 'three';
import { mulberry32 } from '../../lib/rng';

export function createAsphaltTexture(lowTier: boolean): THREE.CanvasTexture {
  const S = 256;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const g = canvas.getContext('2d')!;
  const rng = mulberry32(20260723);

  g.fillStyle = '#eeeef1';
  g.fillRect(0, 0, S, S);

  for (let i = 0; i < 9000; i++) {
    const v = 200 + Math.floor(rng() * 56);
    g.fillStyle = `rgb(${v},${v},${v + 3})`;
    g.fillRect(Math.floor(rng() * S), Math.floor(rng() * S), rng() < 0.8 ? 1 : 2, 1);
  }

  for (let i = 0; i < 26; i++) {
    const r = 9 + rng() * 20;
    const x = 32 + rng() * (S - 64);
    const y = 32 + rng() * (S - 64);
    const grad = g.createRadialGradient(x, y, 1, x, y, r);
    const dark = rng() < 0.5;
    grad.addColorStop(0, dark ? 'rgba(118,118,126,0.14)' : 'rgba(255,255,255,0.10)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }

  g.strokeStyle = 'rgba(84,84,94,0.42)';
  g.lineWidth = 1;
  for (let i = 0; i < 11; i++) {
    let x = 16 + rng() * (S - 32);
    let y = 16 + rng() * (S - 32);
    g.beginPath();
    g.moveTo(x, y);
    const steps = 3 + Math.floor(rng() * 5);
    for (let s = 0; s < steps; s++) {
      x = Math.max(10, Math.min(S - 10, x + (rng() - 0.5) * 34));
      y = Math.max(10, Math.min(S - 10, y + (rng() - 0.5) * 34));
      g.lineTo(x, y);
    }
    g.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = lowTier ? THREE.NearestFilter : THREE.LinearFilter;
  texture.minFilter = lowTier ? THREE.LinearMipmapNearestFilter : THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  return texture;
}

function finishTexture(canvas: HTMLCanvasElement, lowTier: boolean): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = lowTier ? THREE.NearestFilter : THREE.LinearFilter;
  texture.minFilter = lowTier ? THREE.LinearMipmapNearestFilter : THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  return texture;
}

export function createGraffitiTexture(lowTier: boolean): THREE.CanvasTexture {
  const S = 512;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const g = canvas.getContext('2d')!;
  const rng = mulberry32(20260724);
  const palette = ['#00b7ff', '#ff2d95', '#ffd200', '#7cff3a', '#ff6a00', '#8a2be2', '#ff3b3b', '#12e6c8', '#ffffff', '#f24b8a'];

  g.fillStyle = '#a85f54';
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 60; i++) {
    g.fillStyle = `rgba(${rng() < 0.5 ? '20,18,24' : '210,180,150'},${0.04 + rng() * 0.08})`;
    g.fillRect(rng() * S, rng() * S, 20 + rng() * 120, 20 + rng() * 120);
  }

  const blob = (x: number, y: number, w: number, h: number, col: string) => {
    g.beginPath();
    g.ellipse(x, y, w, h, rng() * Math.PI, 0, Math.PI * 2);
    g.fillStyle = col;
    g.fill();
    g.lineWidth = 3 + rng() * 5;
    g.strokeStyle = 'rgba(8,8,14,0.85)';
    g.stroke();
    g.beginPath();
    g.ellipse(x - w * 0.25, y - h * 0.3, w * 0.4, h * 0.35, 0, 0, Math.PI * 2);
    g.fillStyle = 'rgba(255,255,255,0.28)';
    g.fill();
  };

  for (let i = 0; i < 22; i++) {
    blob(rng() * S, rng() * S, 30 + rng() * 70, 22 + rng() * 48, palette[Math.floor(rng() * palette.length)]);
  }
  for (let i = 0; i < 34; i++) {
    const x = rng() * S;
    const y = rng() * S;
    const r = 20 + rng() * 60;
    const grad = g.createRadialGradient(x, y, 1, x, y, r);
    grad.addColorStop(0, palette[Math.floor(rng() * palette.length)]);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = 0.3 + rng() * 0.3;
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
  }
  for (let i = 0; i < 70; i++) {
    g.strokeStyle = palette[Math.floor(rng() * palette.length)];
    g.globalAlpha = 0.5 + rng() * 0.4;
    g.lineWidth = 1 + rng() * 3;
    const x = rng() * S;
    const y = rng() * S;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (rng() - 0.5) * 6, y + 10 + rng() * 50);
    g.stroke();
  }
  g.globalAlpha = 1;
  g.strokeStyle = 'rgba(8,8,12,0.9)';
  for (let i = 0; i < 26; i++) {
    g.lineWidth = 2 + rng() * 3;
    let x = rng() * S;
    let y = rng() * S;
    g.beginPath();
    g.moveTo(x, y);
    for (let s = 0; s < 4 + Math.floor(rng() * 4); s++) {
      x += (rng() - 0.5) * 90;
      y += (rng() - 0.5) * 60;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  return finishTexture(canvas, lowTier);
}

export function createMallTexture(lowTier: boolean): THREE.CanvasTexture {
  const S = 512;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const g = canvas.getContext('2d')!;
  const rng = mulberry32(20260725);
  const cols = 30;
  const rows = 22;
  const cw = S / cols;
  const ch = S / rows;
  g.fillStyle = '#78735f';
  g.fillRect(0, 0, S, S);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const t = 108 + Math.floor(rng() * 26);
      g.fillStyle = `rgb(${t},${t - 6},${t - 20})`;
      g.fillRect(c * cw + 0.5, r * ch + 0.5, cw - 1, ch - 1);
    }
  }
  g.strokeStyle = 'rgba(52,47,36,0.75)';
  g.lineWidth = 1;
  for (let c = 0; c <= cols; c++) {
    g.beginPath();
    g.moveTo(c * cw, 0);
    g.lineTo(c * cw, S);
    g.stroke();
  }
  for (let r = 0; r <= rows; r++) {
    g.beginPath();
    g.moveTo(0, r * ch);
    g.lineTo(S, r * ch);
    g.stroke();
  }
  return finishTexture(canvas, lowTier);
}
