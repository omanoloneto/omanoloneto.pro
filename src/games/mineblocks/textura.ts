import * as THREE from 'three';
import { mulberry32 } from '../../lib/rng';
import type { Ctx, Texture } from './types';

const TILE = 16;
const GRID = 4;
const ROWS = 10;
const W = TILE * GRID;
const H = TILE * ROWS;

export function criarTextura(_ctx: Ctx): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d')!;
  const rng = mulberry32(20260714);

  function base(n: number, color: [number, number, number], variance: number) {
    const ox = (n % GRID) * TILE;
    const oy = Math.floor(n / GRID) * TILE;
    const img = g.createImageData(TILE, TILE);
    for (let i = 0; i < TILE * TILE; i++) {
      const v = 1 + (rng() * 2 - 1) * variance;
      img.data[i * 4] = Math.min(255, color[0] * v);
      img.data[i * 4 + 1] = Math.min(255, color[1] * v);
      img.data[i * 4 + 2] = Math.min(255, color[2] * v);
      img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, ox, oy);
    return [ox, oy] as const;
  }

  function px(ox: number, oy: number, x: number, y: number, color: string) {
    g.fillStyle = color;
    g.fillRect(ox + x, oy + y, 1, 1);
  }


  base(0, [106, 190, 92], 0.10);
  {
    const [ox, oy] = base(1, [134, 96, 67], 0.10);
    for (let x = 0; x < TILE; x++) {
      const h = 2 + Math.floor(rng() * 3);
      for (let y = 0; y < h; y++) px(ox, oy, x, y, y < 2 ? '#6abe5c' : '#57a24c');
    }
  }
  base(2, [134, 96, 67], 0.12);
  base(3, [138, 138, 142], 0.08);
  base(4, [226, 210, 154], 0.07);
  {
    const [ox, oy] = base(5, [160, 107, 58], 0.015);
    for (const sx of [3, 8, 13]) {
      const h0 = Math.floor(rng() * 3);
      for (let y = h0; y < TILE - Math.floor(rng() * 3); y++) {
        px(ox, oy, sx, y, '#7c4f28');
        if (rng() > 0.6) px(ox, oy, sx + 1, y, '#7c4f28');
      }
    }
    for (let y = 2; y < 13; y++) px(ox, oy, 6, y, '#b9884e');
  }
  {
    const [ox, oy] = base(6, [185, 138, 78], 0.015);
    g.strokeStyle = '#8a6340';
    for (const r of [3, 6]) {
      g.beginPath();
      g.arc(ox + 8, oy + 8, r, 0, Math.PI * 2);
      g.stroke();
    }
    px(ox, oy, 8, 8, '#8a6340');
  }
  {
    const [ox, oy] = base(7, [186, 148, 92], 0.06);
    for (const y of [3, 7, 11, 15]) for (let x = 0; x < TILE; x++) px(ox, oy, x, y, '#8f6c3f');
    px(ox, oy, 4, 1, '#6e522f'); px(ox, oy, 12, 5, '#6e522f');
    px(ox, oy, 3, 9, '#6e522f'); px(ox, oy, 11, 13, '#6e522f');
  }
  {
    const [ox, oy] = base(8, [88, 179, 60], 0.015);
    g.fillStyle = '#7bd455';
    for (const [bx, by, bw, bh] of [[2, 2, 4, 3], [9, 4, 5, 4], [4, 9, 3, 3], [11, 11, 3, 2]] as const) {
      g.fillRect(ox + bx, oy + by, bw, bh);
    }
    g.fillStyle = '#8ee06a';
    for (const [bx, by] of [[3, 3], [10, 5], [5, 10]] as const) g.fillRect(ox + bx, oy + by, 2, 1);
    g.fillStyle = '#3b8a2a';
    for (const [bx, by, bw, bh] of [[6, 6, 3, 2], [1, 12, 3, 2], [12, 1, 3, 2]] as const) {
      g.fillRect(ox + bx, oy + by, bw, bh);
    }
  }
  {
    const ox = (38 % GRID) * TILE;
    const oy = Math.floor(38 / GRID) * TILE;
    g.fillStyle = '#2e7020';
    g.fillRect(ox, oy, TILE, TILE);
  }
  {
    const ox = (39 % GRID) * TILE;
    const oy = Math.floor(39 / GRID) * TILE;
    g.fillStyle = '#5e3b1e';
    g.fillRect(ox, oy, TILE, TILE);
  }
  {
    const ox = (9 % GRID) * TILE;
    const oy = Math.floor(9 / GRID) * TILE;
    g.clearRect(ox, oy, TILE, TILE);
    g.fillStyle = '#dff3ff';
    g.fillRect(ox, oy, TILE, 1); g.fillRect(ox, oy + TILE - 1, TILE, 1);
    g.fillRect(ox, oy, 1, TILE); g.fillRect(ox + TILE - 1, oy, 1, TILE);
    for (const [x, y] of [[3, 4], [4, 3], [5, 6], [11, 10], [12, 11]] as const) px(ox, oy, x, y, '#eef9ff');
  }
  {
    const [ox, oy] = base(10, [168, 78, 60], 0.07);
    g.fillStyle = '#c8b8ad';
    for (const y of [0, 4, 8, 12]) g.fillRect(ox, oy + y, TILE, 1);
    for (let row = 0; row < 4; row++) {
      const shift = row % 2 === 0 ? 4 : 0;
      for (let x = shift; x < TILE; x += 8) g.fillRect(ox + x, oy + row * 4, 1, 4);
    }
  }
  {
    const [ox, oy] = base(11, [126, 126, 128], 0.10);
    for (let i = 0; i < 9; i++) {
      const x = Math.floor(rng() * 13);
      const y = Math.floor(rng() * 13);
      g.fillStyle = rng() > 0.5 ? '#9d9da1' : '#6a6a6e';
      g.fillRect(ox + x, oy + y, 2 + Math.floor(rng() * 2), 2 + Math.floor(rng() * 2));
    }
  }
  for (const [n, petal, core] of [[12, '#ffd23f', '#e08a12'], [13, '#e04a3a', '#ffd23f']] as const) {
    const ox = (n % GRID) * TILE;
    const oy = Math.floor(n / GRID) * TILE;
    g.clearRect(ox, oy, TILE, TILE);
    for (let y = 8; y < 15; y++) px(ox, oy, 8, y, '#3f8f37');
    px(ox, oy, 6, 11, '#3f8f37'); px(ox, oy, 7, 10, '#3f8f37');
    for (const [x, y] of [[8, 4], [7, 5], [9, 5], [8, 6], [6, 5], [10, 5], [8, 3], [8, 7]] as const) px(ox, oy, x, y, petal);
    px(ox, oy, 8, 5, core);
  }
  base(14, [58, 120, 214], 0.08);
  {
    const [ox, oy] = base(15, [70, 70, 74], 0.10);
    for (let i = 0; i < 10; i++) {
      g.fillStyle = '#2c2c30';
      g.fillRect(ox + Math.floor(rng() * 13), oy + Math.floor(rng() * 13), 2, 2);
    }
  }
  {
    const ox = (16 % GRID) * TILE;
    const oy = Math.floor(16 / GRID) * TILE;
    g.clearRect(ox, oy, TILE, TILE);
    for (let y = 9; y < 15; y++) px(ox, oy, 8, y, '#7c4f28');
    for (const [x, y] of [[8, 4], [7, 5], [9, 5], [8, 6], [6, 6], [10, 6], [7, 7], [9, 7], [8, 8], [8, 3], [6, 5], [10, 5]] as const) {
      px(ox, oy, x, y, '#58b33c');
    }
    px(ox, oy, 7, 4, '#7bd455'); px(ox, oy, 9, 6, '#7bd455');
  }

  {
    const [ox, oy] = base(20, [150, 104, 58], 0.06);
    g.fillStyle = '#6e4a24';
    for (const y of [0, 15]) g.fillRect(ox, oy + y, TILE, 1);
    for (const x of [0, 15]) g.fillRect(ox + x, oy, 1, TILE);
    g.fillRect(ox, oy + 7, TILE, 1);
    g.fillStyle = '#c9a227';
    g.fillRect(ox + 7, oy + 6, 2, 3);
  }
  {
    const [ox, oy] = base(21, [138, 94, 50], 0.06);
    g.fillStyle = '#6e4a24';
    for (const y of [0, 6, 15]) g.fillRect(ox, oy + y, TILE, 1);
    for (const x of [0, 15]) g.fillRect(ox + x, oy, 1, TILE);
    g.fillStyle = '#4a3418';
    g.fillRect(ox + 6, oy + 4, 4, 5);
    g.fillStyle = '#c9a227';
    g.fillRect(ox + 7, oy + 6, 2, 2);
  }
  {
    const [ox, oy] = base(22, [150, 110, 66], 0.05);
    g.fillStyle = '#6e4a24';
    for (const x of [0, 7, 15]) g.fillRect(ox + x, oy, 1, TILE);
    for (const y of [0, 15]) g.fillRect(ox, oy + y, TILE, 1);
    g.fillRect(ox, oy + 5, TILE, 1); g.fillRect(ox, oy + 10, TILE, 1);
    g.fillStyle = '#c9a227';
    g.fillRect(ox + 5, oy + 8, 2, 2);
  }
  {
    const ox = (23 % GRID) * TILE;
    const oy = Math.floor(23 / GRID) * TILE;
    g.clearRect(ox, oy, TILE, TILE);
    g.fillStyle = '#8a6438';
    g.fillRect(ox, oy, 4, TILE);
    g.fillStyle = '#6e4a24';
    g.fillRect(ox, oy, 1, TILE); g.fillRect(ox + 3, oy, 1, TILE);
    g.fillStyle = '#c9a227';
    g.fillRect(ox + 1, oy + 8, 1, 2);
  }
  {
    const ox = (24 % GRID) * TILE;
    const oy = Math.floor(24 / GRID) * TILE;
    g.clearRect(ox, oy, TILE, TILE);
    g.fillStyle = '#b98a4e';
    g.fillRect(ox + 2, oy + 2, 12, 9);
    g.fillStyle = '#7c5a30';
    g.fillRect(ox + 2, oy + 2, 12, 1); g.fillRect(ox + 2, oy + 10, 12, 1);
    g.fillRect(ox + 2, oy + 2, 1, 9); g.fillRect(ox + 13, oy + 2, 1, 9);
    g.fillRect(ox + 7, oy + 11, 2, 4);
    g.fillStyle = '#4a3418';
    for (const y of [5, 7]) g.fillRect(ox + 4, oy + y, 8, 1);
  }

  {
    const ox = (25 % GRID) * TILE;
    const oy = Math.floor(25 / GRID) * TILE;
    g.clearRect(ox, oy, TILE, TILE);
    g.fillStyle = '#e6d9bf';
    g.fillRect(ox + 7, oy + 9, 2, 6);
    px(ox, oy, 8, 14, '#c4b291');
    g.fillStyle = '#f5a8cf';
    g.fillRect(ox + 3, oy + 3, 10, 7);
    g.fillRect(ox + 2, oy + 5, 12, 4);
    g.fillRect(ox + 5, oy + 2, 6, 3);
    g.fillStyle = '#ffd2e8';
    for (const [x, y] of [[4, 4], [7, 3], [10, 5], [5, 7], [9, 7], [11, 3]] as const) g.fillRect(ox + x, oy + y, 2, 2);
    g.fillStyle = '#d97fb0';
    for (const [x, y] of [[3, 8], [12, 7], [6, 9], [9, 9]] as const) g.fillRect(ox + x, oy + y, 2, 1);
  }

  {
    const [ox, oy] = base(26, [138, 138, 142], 0.08);
    g.fillStyle = '#1c1c20';
    for (const [x, y, w, h] of [[2, 3, 3, 2], [9, 2, 3, 3], [4, 8, 3, 3], [11, 9, 3, 2], [7, 12, 3, 2], [2, 12, 2, 2]] as const) g.fillRect(ox + x, oy + y, w, h);
    g.fillStyle = '#3a3a42';
    for (const [x, y] of [[3, 3], [10, 2], [5, 8], [12, 9], [8, 12]] as const) g.fillRect(ox + x, oy + y, 1, 1);
  }
  {
    const ox = (27 % GRID) * TILE;
    const oy = Math.floor(27 / GRID) * TILE;
    g.clearRect(ox, oy, TILE, TILE);
    g.fillStyle = '#1c1c20';
    g.fillRect(ox + 4, oy + 6, 8, 6);
    g.fillRect(ox + 6, oy + 4, 5, 3);
    g.fillRect(ox + 3, oy + 8, 2, 3);
    g.fillStyle = '#3a3a42';
    for (const [x, y] of [[5, 7], [8, 5], [10, 8], [6, 10], [9, 11]] as const) g.fillRect(ox + x, oy + y, 2, 1);
    g.fillStyle = '#55555f';
    px(ox, oy, 7, 5, '#55555f'); px(ox, oy, 5, 9, '#55555f'); px(ox, oy, 10, 7, '#55555f');
  }
  {
    const ox = (28 % GRID) * TILE;
    const oy = Math.floor(28 / GRID) * TILE;
    g.clearRect(ox, oy, TILE, TILE);
    g.fillStyle = '#8a6a3c';
    for (let i = 0; i < 9; i++) g.fillRect(ox + 3 + i, oy + 12 - i, 2, 2);
    g.fillStyle = '#b98a4e';
    g.fillRect(ox + 7, oy + 2, 6, 2);
    g.fillRect(ox + 5, oy + 3, 3, 2);
    g.fillRect(ox + 12, oy + 4, 2, 3);
    g.fillRect(ox + 3, oy + 4, 2, 2);
    g.fillRect(ox + 13, oy + 6, 1, 2);
    g.fillStyle = '#7c5a30';
    g.fillRect(ox + 7, oy + 2, 6, 1);
    px(ox, oy, 3, 4, '#7c5a30'); px(ox, oy, 13, 7, '#7c5a30');
  }
  {
    const [ox, oy] = base(29, [138, 138, 142], 0.08);
    g.fillStyle = '#c98a5a';
    for (const [x, y, w, h] of [[3, 2, 3, 2], [10, 3, 3, 3], [2, 8, 3, 3], [11, 10, 3, 2], [6, 11, 3, 2], [7, 6, 2, 2]] as const) g.fillRect(ox + x, oy + y, w, h);
    g.fillStyle = '#e8b088';
    for (const [x, y] of [[4, 2], [11, 4], [3, 9], [12, 10], [7, 12]] as const) g.fillRect(ox + x, oy + y, 1, 1);
  }
  {
    const ox = (30 % GRID) * TILE;
    const oy = Math.floor(30 / GRID) * TILE;
    g.clearRect(ox, oy, TILE, TILE);
    g.fillStyle = '#c9ccd4';
    g.fillRect(ox + 3, oy + 6, 10, 5);
    g.fillRect(ox + 2, oy + 7, 12, 3);
    g.fillStyle = '#eef1f6';
    g.fillRect(ox + 3, oy + 6, 10, 1);
    g.fillRect(ox + 4, oy + 7, 3, 1);
    g.fillStyle = '#8e929c';
    g.fillRect(ox + 3, oy + 10, 10, 1);
    g.fillRect(ox + 12, oy + 7, 2, 3);
  }
  {
    const [ox, oy] = base(31, [122, 122, 126], 0.08);
    g.fillStyle = '#55555a';
    g.fillRect(ox + 2, oy + 2, 12, 2);
    g.fillRect(ox + 2, oy + 12, 12, 2);
    g.fillStyle = '#1c1410';
    g.fillRect(ox + 4, oy + 6, 8, 5);
    g.fillStyle = '#f07818';
    g.fillRect(ox + 5, oy + 8, 2, 3); g.fillRect(ox + 8, oy + 7, 2, 4); g.fillRect(ox + 11, oy + 9, 1, 2);
    g.fillStyle = '#ffc93c';
    px(ox, oy, 6, 10, '#ffc93c'); px(ox, oy, 8, 9, '#ffc93c'); px(ox, oy, 9, 10, '#ffc93c');
  }
  {
    const ox = (32 % GRID) * TILE;
    const oy = Math.floor(32 / GRID) * TILE;
    g.clearRect(ox, oy, TILE, TILE);
    g.fillStyle = '#8a6a3c';
    for (let i = 0; i < 9; i++) g.fillRect(ox + 3 + i, oy + 12 - i, 2, 2);
    g.fillStyle = '#c9ccd4';
    g.fillRect(ox + 7, oy + 2, 6, 2);
    g.fillRect(ox + 5, oy + 3, 3, 2);
    g.fillRect(ox + 12, oy + 4, 2, 3);
    g.fillRect(ox + 3, oy + 4, 2, 2);
    g.fillRect(ox + 13, oy + 6, 1, 2);
    g.fillStyle = '#8e929c';
    g.fillRect(ox + 7, oy + 2, 6, 1);
    px(ox, oy, 3, 4, '#8e929c'); px(ox, oy, 13, 7, '#8e929c');
  }
  {
    const [ox, oy] = base(33, [138, 140, 146], 0.06);
    g.fillStyle = '#5f6169';
    for (const y of [0, 4, 8, 12]) g.fillRect(ox, oy + y, TILE, 1);
    for (let row = 0; row < 4; row++) {
      const shift = row % 2 === 0 ? 4 : 0;
      for (let x = shift; x < TILE; x += 8) g.fillRect(ox + x, oy + row * 4, 1, 4);
    }
    g.fillStyle = '#b8bcc6';
    for (const y of [1, 5, 9, 13]) g.fillRect(ox, oy + y, TILE, 1);
  }

  {
    const ox = (34 % GRID) * TILE;
    const oy = Math.floor(34 / GRID) * TILE;
    g.clearRect(ox, oy, TILE, TILE);
    g.fillStyle = '#3a6ea5';
    g.fillRect(ox + 3, oy + 6, 9, 7);
    g.fillStyle = '#2b527c';
    g.fillRect(ox + 3, oy + 12, 9, 1);
    g.fillStyle = '#5a8fd0';
    g.fillRect(ox + 3, oy + 5, 9, 2);
    g.fillStyle = '#12233a';
    g.fillRect(ox + 5, oy + 8, 5, 3);
    g.fillStyle = '#d33a2c';
    g.fillRect(ox + 12, oy + 4, 3, 3);
    g.fillStyle = '#7c5a30';
    g.fillRect(ox + 12, oy + 4, 1, 6);
    g.fillStyle = '#7c5a30';
    g.fillRect(ox + 7, oy + 13, 2, 2);
  }
  {
    const ox = (35 % GRID) * TILE;
    const oy = Math.floor(35 / GRID) * TILE;
    g.clearRect(ox, oy, TILE, TILE);
    g.fillStyle = '#c9955a';
    g.fillRect(ox + 3, oy + 4, 10, 9);
    g.fillStyle = '#a9793f';
    g.fillRect(ox + 3, oy + 11, 10, 2);
    g.fillStyle = '#e0b578';
    g.fillRect(ox + 3, oy + 4, 10, 1);
    g.fillStyle = '#efe6d2';
    g.fillRect(ox + 7, oy + 4, 2, 9);
    g.fillRect(ox + 3, oy + 7, 10, 2);
  }

  {
    const ox = (36 % GRID) * TILE;
    const oy = Math.floor(36 / GRID) * TILE;
    g.clearRect(ox, oy, TILE, TILE);
    g.fillStyle = '#8a6a3c';
    g.fillRect(ox + 2, oy, 2, TILE);
    g.fillRect(ox + 12, oy, 2, TILE);
    g.fillStyle = '#b98a4e';
    for (const y of [2, 6, 10, 14]) g.fillRect(ox + 2, oy + y, 12, 1);
    g.fillStyle = '#d9ac6a';
    for (const y of [2, 6, 10, 14]) g.fillRect(ox + 4, oy + y, 3, 1);
    g.fillStyle = '#6e522f';
    g.fillRect(ox + 2, oy, 1, TILE);
    g.fillRect(ox + 13, oy, 1, TILE);
  }

  {
    const cracks: Array<Array<[number, number, number, number]>> = [
      [[7, 4, 8, 8], [8, 8, 6, 11], [9, 7, 11, 9]],
      [[7, 2, 8, 8], [8, 8, 5, 12], [8, 8, 12, 11], [4, 6, 8, 8], [9, 4, 11, 2]],
      [[7, 1, 8, 8], [8, 8, 3, 13], [8, 8, 13, 12], [2, 6, 8, 8], [8, 8, 12, 3], [5, 13, 8, 8], [8, 8, 14, 7], [1, 10, 5, 9]],
    ];
    cracks.forEach((lines, i) => {
      const n = 17 + i;
      const ox = (n % GRID) * TILE;
      const oy = Math.floor(n / GRID) * TILE;
      g.clearRect(ox, oy, TILE, TILE);
      g.strokeStyle = 'rgba(20, 14, 8, 0.9)';
      g.lineWidth = 1;
      for (const [x0, y0, x1, y1] of lines) {
        g.beginPath();
        g.moveTo(ox + x0 + 0.5, oy + y0 + 0.5);
        g.lineTo(ox + x1 + 0.5, oy + y1 + 0.5);
        g.stroke();
      }
    });
  }

  const atlas = new THREE.CanvasTexture(canvas);
  atlas.magFilter = THREE.NearestFilter;
  atlas.minFilter = THREE.NearestFilter;
  atlas.generateMipmaps = false;
  atlas.colorSpace = THREE.SRGBColorSpace;

  const insetU = 0.5 / W;
  const insetV = 0.5 / H;
  function uv(tile: number): [number, number, number, number] {
    const tx = tile % GRID;
    const ty = Math.floor(tile / GRID);
    const u0 = tx / GRID + insetU;
    const v1 = 1 - ty / ROWS - insetV;
    const u1 = (tx + 1) / GRID - insetU;
    const v0 = 1 - (ty + 1) / ROWS + insetV;
    return [u0, v0, u1, v1];
  }

  return { atlas, uv, dataURL: canvas.toDataURL() };
}
