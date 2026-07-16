// Atlas de texturas procedural: 4×4 tiles de 16px pintados num canvas,
// estilo pixelado (NearestFilter, sem mipmaps). Nenhum asset externo.
import * as THREE from 'three';
import type { Contexto, Textura } from './tipos';

const TILE = 16;
const GRADE = 4;      // colunas
const LINHAS = 8;     // linhas (com folga pra novos tiles)
const LADO = TILE * GRADE; // 64
const ALTO = TILE * LINHAS; // 128

// rng determinístico pro ruído dos tiles (mesma cara em todo mundo)
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function criarTextura(_ctx: Contexto): Textura {
  const canvas = document.createElement('canvas');
  canvas.width = LADO;
  canvas.height = ALTO;
  const g = canvas.getContext('2d')!;
  const rng = mulberry32(20260714);

  // pinta o tile n com cor base + variação por pixel (ruído sutil)
  function base(n: number, cor: [number, number, number], var_: number) {
    const ox = (n % GRADE) * TILE;
    const oy = Math.floor(n / GRADE) * TILE;
    const img = g.createImageData(TILE, TILE);
    for (let i = 0; i < TILE * TILE; i++) {
      const v = 1 + (rng() * 2 - 1) * var_;
      img.data[i * 4] = Math.min(255, cor[0] * v);
      img.data[i * 4 + 1] = Math.min(255, cor[1] * v);
      img.data[i * 4 + 2] = Math.min(255, cor[2] * v);
      img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, ox, oy);
    return [ox, oy] as const;
  }

  function px(ox: number, oy: number, x: number, y: number, cor: string) {
    g.fillStyle = cor;
    g.fillRect(ox + x, oy + y, 1, 1);
  }

  // --- 0 grama (topo) ---
  base(0, [106, 190, 92], 0.10);
  // --- 1 grama (lado): terra com franja verde no topo ---
  {
    const [ox, oy] = base(1, [134, 96, 67], 0.10);
    for (let x = 0; x < TILE; x++) {
      const alt = 2 + Math.floor(rng() * 3);
      for (let y = 0; y < alt; y++) px(ox, oy, x, y, y < 2 ? '#6abe5c' : '#57a24c');
    }
  }
  // --- 2 terra ---
  base(2, [134, 96, 67], 0.12);
  // --- 3 pedra ---
  base(3, [138, 138, 142], 0.08);
  // --- 4 areia ---
  base(4, [226, 210, 154], 0.07);
  // --- 5 tronco (lado): casca com estrias verticais ---
  {
    const [ox, oy] = base(5, [110, 85, 55], 0.08);
    for (let x = 1; x < TILE; x += 3 + Math.floor(rng() * 2)) {
      for (let y = 0; y < TILE; y++) if (rng() > 0.25) px(ox, oy, x, y, '#54402a');
    }
  }
  // --- 6 tronco (topo): anéis ---
  {
    const [ox, oy] = base(6, [176, 142, 96], 0.06);
    g.strokeStyle = '#8a6b45';
    for (const r of [2.5, 5, 7]) {
      g.beginPath();
      g.arc(ox + 8, oy + 8, r, 0, Math.PI * 2);
      g.stroke();
    }
  }
  // --- 7 tábuas: pranchas horizontais ---
  {
    const [ox, oy] = base(7, [186, 148, 92], 0.06);
    for (const y of [3, 7, 11, 15]) for (let x = 0; x < TILE; x++) px(ox, oy, x, y, '#8f6c3f');
    px(ox, oy, 4, 1, '#6e522f'); px(ox, oy, 12, 5, '#6e522f');
    px(ox, oy, 3, 9, '#6e522f'); px(ox, oy, 11, 13, '#6e522f');
  }
  // --- 8 folhas ---
  {
    const [ox, oy] = base(8, [64, 142, 52], 0.16);
    for (let i = 0; i < 14; i++) px(ox, oy, Math.floor(rng() * TILE), Math.floor(rng() * TILE), '#2e6b26');
  }
  // --- 9 vidro: moldura + brilho, centro TRANSPARENTE (alphaTest) ---
  {
    const ox = (9 % GRADE) * TILE;
    const oy = Math.floor(9 / GRADE) * TILE;
    g.clearRect(ox, oy, TILE, TILE);
    g.fillStyle = '#dff3ff';
    g.fillRect(ox, oy, TILE, 1); g.fillRect(ox, oy + TILE - 1, TILE, 1);
    g.fillRect(ox, oy, 1, TILE); g.fillRect(ox + TILE - 1, oy, 1, TILE);
    for (const [x, y] of [[3, 4], [4, 3], [5, 6], [11, 10], [12, 11]] as const) px(ox, oy, x, y, '#eef9ff');
  }
  // --- 10 tijolos ---
  {
    const [ox, oy] = base(10, [168, 78, 60], 0.07);
    g.fillStyle = '#c8b8ad';
    for (const y of [0, 4, 8, 12]) g.fillRect(ox, oy + y, TILE, 1);
    for (let fila = 0; fila < 4; fila++) {
      const desloca = fila % 2 === 0 ? 4 : 0;
      for (let x = desloca; x < TILE; x += 8) g.fillRect(ox + x, oy + fila * 4, 1, 4);
    }
  }
  // --- 11 pedregulho: manchas ---
  {
    const [ox, oy] = base(11, [126, 126, 128], 0.10);
    for (let i = 0; i < 9; i++) {
      const x = Math.floor(rng() * 13);
      const y = Math.floor(rng() * 13);
      g.fillStyle = rng() > 0.5 ? '#9d9da1' : '#6a6a6e';
      g.fillRect(ox + x, oy + y, 2 + Math.floor(rng() * 2), 2 + Math.floor(rng() * 2));
    }
  }
  // --- 12/13 flores (cruz, fundo transparente) ---
  for (const [n, corFlor, corMiolo] of [[12, '#ffd23f', '#e08a12'], [13, '#e04a3a', '#ffd23f']] as const) {
    const ox = (n % GRADE) * TILE;
    const oy = Math.floor(n / GRADE) * TILE;
    g.clearRect(ox, oy, TILE, TILE);
    for (let y = 8; y < 15; y++) px(ox, oy, 8, y, '#3f8f37'); // caule
    px(ox, oy, 6, 11, '#3f8f37'); px(ox, oy, 7, 10, '#3f8f37'); // folhinha
    for (const [x, y] of [[8, 4], [7, 5], [9, 5], [8, 6], [6, 5], [10, 5], [8, 3], [8, 7]] as const) px(ox, oy, x, y, corFlor);
    px(ox, oy, 8, 5, corMiolo);
  }
  // --- 14 água ---
  base(14, [58, 120, 214], 0.08);
  // --- 15 rocha-mãe (inquebrável, mais escura) ---
  {
    const [ox, oy] = base(15, [70, 70, 74], 0.10);
    for (let i = 0; i < 10; i++) {
      g.fillStyle = '#2c2c30';
      g.fillRect(ox + Math.floor(rng() * 13), oy + Math.floor(rng() * 13), 2, 2);
    }
  }
  // --- 16 muda de árvore (cruz, fundo transparente) ---
  {
    const ox = (16 % GRADE) * TILE;
    const oy = Math.floor(16 / GRADE) * TILE;
    g.clearRect(ox, oy, TILE, TILE);
    for (let y = 9; y < 15; y++) px(ox, oy, 8, y, '#6e5537'); // caulinho
    for (const [x, y] of [[8, 4], [7, 5], [9, 5], [8, 6], [6, 6], [10, 6], [7, 7], [9, 7], [8, 8], [8, 3], [6, 5], [10, 5]] as const) {
      px(ox, oy, x, y, '#3f8f37');
    }
    px(ox, oy, 7, 4, '#57a24c'); px(ox, oy, 9, 6, '#57a24c');
  }

  // --- 20 baú (topo): tampa de madeira com ferrolho ---
  {
    const [ox, oy] = base(20, [150, 104, 58], 0.06);
    g.fillStyle = '#6e4a24';
    for (const y of [0, 15]) g.fillRect(ox, oy + y, TILE, 1);
    for (const x of [0, 15]) g.fillRect(ox + x, oy, 1, TILE);
    g.fillRect(ox, oy + 7, TILE, 1); // linha da tampa
    g.fillStyle = '#c9a227'; // ferrolho dourado no meio
    g.fillRect(ox + 7, oy + 6, 2, 3);
  }
  // --- 21 baú (lado): pranchas + tranca ---
  {
    const [ox, oy] = base(21, [138, 94, 50], 0.06);
    g.fillStyle = '#6e4a24';
    for (const y of [0, 6, 15]) g.fillRect(ox, oy + y, TILE, 1);
    for (const x of [0, 15]) g.fillRect(ox + x, oy, 1, TILE);
    g.fillStyle = '#4a3418';
    g.fillRect(ox + 6, oy + 4, 4, 5); // fechadura
    g.fillStyle = '#c9a227';
    g.fillRect(ox + 7, oy + 6, 2, 2); // buraco da chave
  }
  // --- 22 porta (fechada): duas folhas com maçaneta ---
  {
    const [ox, oy] = base(22, [150, 110, 66], 0.05);
    g.fillStyle = '#6e4a24';
    for (const x of [0, 7, 15]) g.fillRect(ox + x, oy, 1, TILE);
    for (const y of [0, 15]) g.fillRect(ox, oy + y, TILE, 1);
    g.fillRect(ox, oy + 5, TILE, 1); g.fillRect(ox, oy + 10, TILE, 1);
    g.fillStyle = '#c9a227';
    g.fillRect(ox + 5, oy + 8, 2, 2); // maçaneta
  }
  // --- 23 porta (aberta): batente com vão transparente ---
  {
    const ox = (23 % GRADE) * TILE;
    const oy = Math.floor(23 / GRADE) * TILE;
    g.clearRect(ox, oy, TILE, TILE);
    // só a folha encostada num lado; resto = vão (passa e vê através)
    g.fillStyle = '#8a6438';
    g.fillRect(ox, oy, 4, TILE);
    g.fillStyle = '#6e4a24';
    g.fillRect(ox, oy, 1, TILE); g.fillRect(ox + 3, oy, 1, TILE);
    g.fillStyle = '#c9a227';
    g.fillRect(ox + 1, oy + 8, 1, 2);
  }
  // --- 24 placa: prancha em pé com risquinhos de texto ---
  {
    const ox = (24 % GRADE) * TILE;
    const oy = Math.floor(24 / GRADE) * TILE;
    g.clearRect(ox, oy, TILE, TILE);
    g.fillStyle = '#b98a4e'; // tábua
    g.fillRect(ox + 2, oy + 2, 12, 9);
    g.fillStyle = '#7c5a30'; // moldura + poste
    g.fillRect(ox + 2, oy + 2, 12, 1); g.fillRect(ox + 2, oy + 10, 12, 1);
    g.fillRect(ox + 2, oy + 2, 1, 9); g.fillRect(ox + 13, oy + 2, 1, 9);
    g.fillRect(ox + 7, oy + 11, 2, 4); // poste
    g.fillStyle = '#4a3418'; // linhas de "texto"
    for (const y of [5, 7]) g.fillRect(ox + 4, oy + y, 8, 1);
  }

  // --- 25 lã: tufo felpudo off-white (cruz, fundo transparente) ---
  {
    const ox = (25 % GRADE) * TILE;
    const oy = Math.floor(25 / GRADE) * TILE;
    g.clearRect(ox, oy, TILE, TILE);
    // corpo do tufo (bloco irregular de nuvem)
    g.fillStyle = '#f3efe4';
    g.fillRect(ox + 3, oy + 5, 10, 8);
    g.fillRect(ox + 2, oy + 7, 12, 5);
    g.fillRect(ox + 5, oy + 3, 6, 3);
    // caroços claros e sombra pra dar textura de lã
    g.fillStyle = '#fffdf6';
    for (const [x, y] of [[4, 6], [7, 5], [10, 7], [5, 10], [9, 10], [11, 5]] as const) g.fillRect(ox + x, oy + y, 2, 2);
    g.fillStyle = '#d9d2c0';
    for (const [x, y] of [[3, 11], [12, 10], [6, 12], [9, 12]] as const) g.fillRect(ox + x, oy + y, 2, 1);
  }

  // --- 17/18/19 rachaduras (overlay de quebra, cutout) ---
  {
    const riscos: Array<Array<[number, number, number, number]>> = [
      // estágio 1: uns riscos
      [[7, 4, 8, 8], [8, 8, 6, 11], [9, 7, 11, 9]],
      // estágio 2: teia crescendo
      [[7, 2, 8, 8], [8, 8, 5, 12], [8, 8, 12, 11], [4, 6, 8, 8], [9, 4, 11, 2]],
      // estágio 3: quase quebrando
      [[7, 1, 8, 8], [8, 8, 3, 13], [8, 8, 13, 12], [2, 6, 8, 8], [8, 8, 12, 3], [5, 13, 8, 8], [8, 8, 14, 7], [1, 10, 5, 9]],
    ];
    riscos.forEach((linhas, i) => {
      const n = 17 + i;
      const ox = (n % GRADE) * TILE;
      const oy = Math.floor(n / GRADE) * TILE;
      g.clearRect(ox, oy, TILE, TILE);
      g.strokeStyle = 'rgba(20, 14, 8, 0.9)';
      g.lineWidth = 1;
      for (const [x0, y0, x1, y1] of linhas) {
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

  // meio texel de inset: NearestFilter não faz bleed, mas a borda exata
  // entre tiles pode amostrar o vizinho com arredondamento infeliz
  const insetU = 0.5 / LADO;
  const insetV = 0.5 / ALTO;
  function uv(tile: number): [number, number, number, number] {
    const tx = tile % GRADE;
    const ty = Math.floor(tile / GRADE);
    // canvas Y cresce pra baixo; UV do three cresce pra cima
    const u0 = tx / GRADE + insetU;
    const v1 = 1 - ty / LINHAS - insetV;
    const u1 = (tx + 1) / GRADE - insetU;
    const v0 = 1 - (ty + 1) / LINHAS + insetV;
    return [u0, v0, u1, v1];
  }

  return { atlas, uv, dataURL: canvas.toDataURL() };
}
