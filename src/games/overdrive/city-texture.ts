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
