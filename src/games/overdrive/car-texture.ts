import * as THREE from 'three';
import type { UVRect } from './mesh';

const SIZE = 128;
const SCALE = 4;

export interface CarAtlas {
  texture: THREE.CanvasTexture;
  r: {
    white: UVRect;
    dark: UVRect;
    hubcap: UVRect;
    rimFace: UVRect;
    fascia: UVRect;
    plate: UVRect;
    tail: UVRect;
    glassFront: UVRect;
    glassRear: UVRect;
    glassSide: UVRect;
    side: UVRect;
    hood: UVRect;
  };
}

function rect(x: number, y: number, w: number, h: number): UVRect {
  return [(x + 0.5) / SIZE, 1 - (y + h - 0.5) / SIZE, (x + w - 0.5) / SIZE, 1 - (y + 0.5) / SIZE];
}

export function subU(r: UVRect, a: number, b: number): UVRect {
  return [r[0] + (r[2] - r[0]) * a, r[1], r[0] + (r[2] - r[0]) * b, r[3]];
}

export function subV(r: UVRect, a: number, b: number): UVRect {
  return [r[0], r[3] + (r[1] - r[3]) * b, r[2], r[3] + (r[1] - r[3]) * a];
}

export function createCarAtlas(lowTier: boolean, onUpdate?: () => void): CarAtlas {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE * SCALE;
  canvas.height = SIZE * SCALE;
  const g = canvas.getContext('2d')!;
  g.scale(SCALE, SCALE);

  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, SIZE, SIZE);
  g.fillStyle = '#17171c';
  g.fillRect(0, 10, 6, 6);

  function disc(cx: number, cy: number, radius: number, fill: string) {
    g.fillStyle = fill;
    g.beginPath();
    g.arc(cx, cy, radius, 0, Math.PI * 2);
    g.fill();
  }

  {
    const [x, y, w, h] = [10, 2, 26, 26];
    const cx = x + w / 2;
    const cy = y + h / 2;
    disc(cx, cy, 12.5, '#5e6066');
    disc(cx, cy, 10.5, '#43454c');
    disc(cx, cy, 8, '#c9cdd4');
    g.strokeStyle = '#eef0f4';
    g.lineWidth = 1.4;
    g.beginPath();
    g.arc(cx, cy, 6.2, Math.PI * 1.05, Math.PI * 1.6);
    g.stroke();
    disc(cx, cy, 2, '#33343a');
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      disc(cx + Math.cos(a) * 9.4, cy + Math.sin(a) * 9.4, 1.1, '#2e3036');
    }
  }

  {
    const [x, y, w, h] = [40, 2, 26, 26];
    const cx = x + w / 2;
    const cy = y + h / 2;
    disc(cx, cy, 12.5, '#1b1b21');
    g.strokeStyle = '#2c2c34';
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(cx, cy, 9, 0, Math.PI * 2);
    g.stroke();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      disc(cx + Math.cos(a) * 4.4, cy + Math.sin(a) * 4.4, 1.2, '#4a4c55');
    }
    disc(cx, cy, 1.6, '#55575f');
  }

  {
    const [x, y, w, h] = [0, 32, 96, 20];
    g.fillStyle = '#101015';
    g.fillRect(x, y, w, h);
    g.strokeStyle = '#22222b';
    g.lineWidth = 1;
    for (let ly = y + 4; ly < y + h - 3; ly += 3) {
      g.beginPath();
      g.moveTo(x + 2, ly);
      g.lineTo(x + w - 2, ly);
      g.stroke();
    }
    g.fillStyle = '#b9bdc6';
    g.fillRect(x, y, w, 2);
    const cy = y + h / 2;
    for (const lx of [9, 26, 70, 87]) {
      disc(x + lx, cy, 7, '#d9dade');
      disc(x + lx, cy, 5.6, '#efe9d4');
      disc(x + lx - 1.6, cy - 1.6, 1.8, '#fffdf2');
    }
    g.fillStyle = '#e8842a';
    g.fillRect(x, y + h - 7, 4, 6);
    g.fillRect(x + w - 4, y + h - 7, 4, 6);
    disc(x + w / 2, cy, 3.4, '#d9dade');
    disc(x + w / 2, cy, 2.2, '#23252c');
  }

  {
    const [x, y, w, h] = [100, 32, 26, 12];
    g.fillStyle = '#d8d9de';
    g.fillRect(x, y, w, h);
    g.strokeStyle = '#7a7c85';
    g.lineWidth = 1;
    g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    g.fillStyle = '#2a2c33';
    for (let i = 0; i < 6; i++) g.fillRect(x + 3 + i * 3.4, y + 4, 2, 5);
  }

  {
    const [x, y, w, h] = [0, 56, 96, 14];
    const grad = g.createLinearGradient(0, y, 0, y + h);
    grad.addColorStop(0, '#d02a36');
    grad.addColorStop(1, '#7e141d');
    g.fillStyle = grad;
    g.fillRect(x, y, w, h);
    g.fillStyle = '#c9ccd4';
    g.fillRect(x, y, w, 1.5);
    g.fillStyle = '#4d0c13';
    for (let lx = x + 8; lx < x + w - 4; lx += 8) g.fillRect(lx, y + 2, 1, h - 4);
    g.fillStyle = '#e08a2a';
    g.fillRect(x + 24, y + 3, 7, h - 6);
    g.fillRect(x + 65, y + 3, 7, h - 6);
    g.fillStyle = '#cfcabd';
    g.fillRect(x + 38, y + 4, 5, h - 8);
    g.fillRect(x + 53, y + 4, 5, h - 8);
  }

  function glass(x: number, y: number, w: number, h: number, top: string) {
    const grad = g.createLinearGradient(0, y, 0, y + h);
    grad.addColorStop(0, top);
    grad.addColorStop(0.45, '#1d2436');
    grad.addColorStop(1, '#0f1420');
    g.fillStyle = grad;
    g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(150, 170, 210, 0.5)';
    g.fillRect(x, y, w, 1.5);
    g.strokeStyle = 'rgba(130, 150, 190, 0.28)';
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(x + w * 0.2, y + h);
    g.lineTo(x + w * 0.55, y);
    g.stroke();
  }
  glass(98, 52, 28, 18, '#56648a');
  glass(98, 74, 28, 16, '#3c4866');
  glass(98, 94, 28, 18, '#48547a');

  {
    const [x, y, w, h] = [0, 74, 96, 26];
    g.strokeStyle = '#94949c';
    g.lineWidth = 1;
    for (const z of [-0.66, 0.58]) {
      const lx = x + ((z + 2.05) / 4.21) * w;
      g.beginPath();
      g.moveTo(lx, y + 2);
      g.lineTo(lx, y + 21);
      g.stroke();
    }
    g.fillStyle = '#55555c';
    g.fillRect(x + 53, y + 6, 5, 2);
    g.fillStyle = '#b6b6bc';
    g.fillRect(x, y + 20, w, 1);
    g.fillStyle = '#232329';
    g.fillRect(x, y + 21, w, h - 21);
  }

  {
    const [x, y, w, h] = [0, 104, 80, 22];
    g.strokeStyle = '#dedee3';
    g.lineWidth = 1;
    for (const ly of [y + 5, y + 16]) {
      g.beginPath();
      g.moveTo(x + 2, ly);
      g.lineTo(x + w - 4, ly);
      g.stroke();
    }
    const grad = g.createLinearGradient(x + w - 8, 0, x + w, 0);
    grad.addColorStop(0, 'rgba(160, 160, 170, 0)');
    grad.addColorStop(1, 'rgba(120, 120, 132, 0.45)');
    g.fillStyle = grad;
    g.fillRect(x + w - 8, y, 8, h);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = lowTier ? THREE.NearestFilter : THREE.LinearFilter;
  texture.minFilter = lowTier ? THREE.LinearMipmapNearestFilter : THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;

  const painted = new Image();
  painted.onload = () => {
    g.drawImage(painted, 0, 0, SIZE, SIZE);
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 8, 8);
    g.fillStyle = '#17171c';
    g.fillRect(0, 10, 6, 6);
    texture.needsUpdate = true;
    onUpdate?.();
  };
  painted.src = '/class/img/overdrive/carro.png';

  return {
    texture,
    r: {
      white: rect(0, 0, 8, 8),
      dark: rect(0, 10, 6, 6),
      hubcap: rect(10, 2, 26, 26),
      rimFace: rect(40, 2, 26, 26),
      fascia: rect(0, 32, 96, 20),
      plate: rect(100, 32, 26, 12),
      tail: rect(0, 56, 96, 14),
      glassFront: rect(98, 52, 28, 18),
      glassRear: rect(98, 74, 28, 16),
      glassSide: rect(98, 94, 28, 18),
      side: rect(0, 74, 96, 26),
      hood: rect(0, 104, 80, 22),
    },
  };
}
