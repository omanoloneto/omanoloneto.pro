// Meshing dos chunks: só faces expostas (culled), com "sol" cozido no
// vertex color — sombreado por direção da face × AO fake por vértice.
// Sem luz na cena, sem shadow map: MeshBasicMaterial puro (SwiftShader).
// 3 camadas por chunk: opaca / recorte (alphaTest: vidro+flores) / água.
import * as THREE from 'three';
import type { Ctx, Meshes } from './types';

// sombreado por direção (o "sol" vem de cima)
const SOMBRA_FACE = [0.66, 0.66, 1.0, 0.5, 0.8, 0.8]; // +x -x +y -y +z -z
const BRILHO_AO = [0.55, 0.7, 0.85, 1.0];

// [verts 4×3, tangentes do AO] por face — winding CCW visto de fora,
// v0 embaixo-esquerda pros lados (textura em pé)
const FACES: Array<{
  n: [number, number, number];
  v: number[][]; // 4 cantos
  uvTopo: boolean; // topo/base usam uv girado
}> = [
  { n: [1, 0, 0], v: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], uvTopo: false },
  { n: [-1, 0, 0], v: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]], uvTopo: false },
  { n: [0, 1, 0], v: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], uvTopo: true },
  { n: [0, -1, 0], v: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], uvTopo: true },
  { n: [0, 0, 1], v: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]], uvTopo: false },
  { n: [0, 0, -1], v: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]], uvTopo: false },
];

interface Camada {
  pos: number[];
  uv: number[];
  cor: number[];
  idx: number[];
}

const OUTLINE_GROUP: Record<number, number> = { 7: 38, 16: 38, 37: 38, 5: 39, 60: 40 };
const OUTLINE_WIDTH = 0.08;
const OUTLINE_LIFT = 0.004;

type FurniturePiece = { box: [number, number, number, number, number, number]; cor: string; semBorda?: boolean };

const MADEIRA = '#a06b3a';
const MADEIRA_ESCURA = '#7c4f28';
const MADEIRA_CLARA = '#b9884e';
const VERDE = '#3fae8f';
const VERDE_ESCURO = '#2c8a6e';
const DOURADO = '#e0c35a';
const CREME = '#e8e2d0';
const CREME_ESCURO = '#d6cfba';

const FURNITURE: Record<number, FurniturePiece[]> = {
  52: [
    { box: [0, 0, 12, 3, 14, 15], cor: MADEIRA },
    { box: [13, 0, 12, 16, 14, 15], cor: MADEIRA },
    { box: [0, 12, 12, 3, 14, 15], cor: VERDE, semBorda: true },
    { box: [13, 12, 12, 16, 14, 15], cor: VERDE, semBorda: true },
    { box: [3, 4, 12, 13, 11, 15], cor: MADEIRA_CLARA },
    { box: [4, 5, 11.5, 12, 10, 12], cor: VERDE, semBorda: true },
    { box: [6.5, 6.5, 11, 9.5, 9, 11.6], cor: DOURADO, semBorda: true },
    { box: [0, 2, 0, 16, 4, 16], cor: MADEIRA },
    { box: [1, 4, 0, 15, 7, 16], cor: CREME },
    { box: [3, 7, 8, 13, 9, 14], cor: CREME_ESCURO },
    { box: [0, 0, 0, 3, 2, 3], cor: MADEIRA_ESCURA },
    { box: [13, 0, 0, 16, 2, 3], cor: MADEIRA_ESCURA },
  ],
  53: [
    { box: [0, 2, 0, 16, 4, 16], cor: MADEIRA },
    { box: [1, 4, 0, 15, 7, 16], cor: CREME },
    { box: [1, 6.9, 2, 15, 7.7, 12], cor: VERDE, semBorda: true },
    { box: [0, 0, 13, 3, 9, 16], cor: MADEIRA },
    { box: [13, 0, 13, 16, 9, 16], cor: MADEIRA },
    { box: [0, 7, 13, 3, 9, 16], cor: VERDE, semBorda: true },
    { box: [13, 7, 13, 16, 9, 16], cor: VERDE, semBorda: true },
    { box: [3, 4, 13.5, 13, 8, 15.5], cor: MADEIRA_CLARA },
    { box: [0, 0, 0, 3, 2, 3], cor: MADEIRA_ESCURA },
    { box: [13, 0, 0, 16, 2, 3], cor: MADEIRA_ESCURA },
  ],
  54: [
    { box: [0, 0, 0, 4, 10, 16], cor: MADEIRA },
    { box: [0.5, 10, 2, 3.5, 11.5, 14], cor: VERDE_ESCURO, semBorda: true },
    { box: [1.2, 5.5, 1.5, 2.9, 8.5, 3.2], cor: DOURADO, semBorda: true },
    { box: [4, 0, 0, 16, 3, 16], cor: MADEIRA },
    { box: [4, 3, 2, 16, 7, 15], cor: VERDE },
    { box: [4, 7, 11, 16, 14, 15.5], cor: VERDE },
    { box: [0, 0, 0, 3, 2, 3], cor: MADEIRA_ESCURA },
  ],
  55: [
    { box: [12, 0, 0, 16, 10, 16], cor: MADEIRA },
    { box: [12.5, 10, 2, 15.5, 11.5, 14], cor: VERDE_ESCURO, semBorda: true },
    { box: [13.1, 5.5, 1.5, 14.8, 8.5, 3.2], cor: DOURADO, semBorda: true },
    { box: [0, 0, 0, 12, 3, 16], cor: MADEIRA },
    { box: [0, 3, 2, 12, 7, 15], cor: VERDE },
    { box: [0, 7, 11, 12, 14, 15.5], cor: VERDE },
    { box: [13, 0, 0, 16, 2, 3], cor: MADEIRA_ESCURA },
  ],
  56: [
    { box: [1, 2, 4, 15, 13, 14], cor: MADEIRA },
    { box: [0, 13, 3, 16, 15, 15], cor: MADEIRA_CLARA },
    { box: [2, 9.5, 3, 7.5, 12.5, 4.4], cor: MADEIRA_ESCURA },
    { box: [8.5, 9.5, 3, 14, 12.5, 4.4], cor: MADEIRA_ESCURA },
    { box: [2, 5.8, 3, 7.5, 8.8, 4.4], cor: MADEIRA_ESCURA },
    { box: [8.5, 5.8, 3, 14, 8.8, 4.4], cor: MADEIRA_ESCURA },
    { box: [2, 2.2, 3, 7.5, 5.2, 4.4], cor: MADEIRA_ESCURA },
    { box: [8.5, 2.2, 3, 14, 5.2, 4.4], cor: MADEIRA_ESCURA },
    { box: [4.2, 10.5, 2.4, 5.4, 11.7, 3.2], cor: VERDE, semBorda: true },
    { box: [10.7, 10.5, 2.4, 11.9, 11.7, 3.2], cor: VERDE, semBorda: true },
    { box: [4.2, 6.8, 2.4, 5.4, 8, 3.2], cor: VERDE, semBorda: true },
    { box: [10.7, 6.8, 2.4, 11.9, 8, 3.2], cor: VERDE, semBorda: true },
    { box: [4.2, 3.2, 2.4, 5.4, 4.4, 3.2], cor: VERDE, semBorda: true },
    { box: [10.7, 3.2, 2.4, 11.9, 4.4, 3.2], cor: VERDE, semBorda: true },
    { box: [1, 0, 4, 4, 2, 7], cor: MADEIRA_ESCURA },
    { box: [12, 0, 4, 15, 2, 7], cor: MADEIRA_ESCURA },
    { box: [1, 0, 11, 4, 2, 14], cor: MADEIRA_ESCURA },
    { box: [12, 0, 11, 15, 2, 14], cor: MADEIRA_ESCURA },
  ],
  57: [
    { box: [0, 10, 0, 16, 13, 16], cor: MADEIRA },
    { box: [1.5, 12.9, 1.5, 14.5, 13.02, 14.5], cor: MADEIRA_CLARA, semBorda: true },
    { box: [1, 0, 1, 4, 10, 4], cor: MADEIRA },
    { box: [12, 0, 1, 15, 10, 4], cor: MADEIRA },
    { box: [1, 0, 12, 4, 10, 15], cor: MADEIRA },
    { box: [12, 0, 12, 15, 10, 15], cor: MADEIRA },
    { box: [0.5, 8, 0.5, 4.5, 10, 4.5], cor: VERDE, semBorda: true },
    { box: [11.5, 8, 0.5, 15.5, 10, 4.5], cor: VERDE, semBorda: true },
    { box: [0.5, 8, 11.5, 4.5, 10, 15.5], cor: VERDE, semBorda: true },
    { box: [11.5, 8, 11.5, 15.5, 10, 15.5], cor: VERDE, semBorda: true },
    { box: [1.8, 8.8, 0.4, 3.2, 9.6, 0.9], cor: DOURADO, semBorda: true },
    { box: [12.8, 8.8, 0.4, 14.2, 9.6, 0.9], cor: DOURADO, semBorda: true },
  ],
  58: [
    { box: [0, 0, 5, 2, 16, 13], cor: MADEIRA },
    { box: [14, 0, 5, 16, 16, 13], cor: MADEIRA },
    { box: [2, 0, 11, 14, 16, 13], cor: MADEIRA_ESCURA, semBorda: true },
    { box: [0, 0, 5, 16, 2, 13], cor: MADEIRA },
    { box: [2, 9, 5.5, 14, 10.5, 12], cor: MADEIRA_CLARA },
    { box: [2.5, 2, 6.5, 5, 8.5, 11], cor: '#2e8c7b', semBorda: true },
    { box: [5.4, 2, 6.5, 7.9, 7.8, 11], cor: '#59a24c', semBorda: true },
    { box: [8.3, 2, 6.5, 10.6, 8.2, 11], cor: '#ddd6c0', semBorda: true },
    { box: [11, 2, 6.5, 13.4, 7.5, 11], cor: '#2e8c7b', semBorda: true },
    { box: [2.5, 10.5, 6.5, 6, 15.5, 11], cor: '#59a24c', semBorda: true },
    { box: [6.4, 10.5, 6.5, 9.6, 14.8, 11], cor: '#ddd6c0', semBorda: true },
    { box: [10, 10.5, 6.5, 13.4, 15.2, 11], cor: '#2e8c7b', semBorda: true },
  ],
  59: [
    { box: [0, 0, 5, 2, 14, 13], cor: MADEIRA },
    { box: [14, 0, 5, 16, 14, 13], cor: MADEIRA },
    { box: [2, 0, 11, 14, 14, 13], cor: MADEIRA_ESCURA, semBorda: true },
    { box: [0, 14, 4, 16, 16, 14], cor: MADEIRA_CLARA },
    { box: [2, 7, 5.5, 14, 8.5, 12], cor: MADEIRA_CLARA },
    { box: [2.5, 0, 6.5, 5.5, 6.5, 11], cor: '#ddd6c0', semBorda: true },
    { box: [6, 0, 6.5, 8.6, 6, 11], cor: '#2e8c7b', semBorda: true },
    { box: [9, 0, 6.5, 13.5, 5.5, 11], cor: '#59a24c', semBorda: true },
    { box: [2.5, 8.5, 6.5, 6.5, 13.5, 11], cor: '#2e8c7b', semBorda: true },
    { box: [7, 8.5, 6.5, 10, 12.8, 11], cor: '#59a24c', semBorda: true },
    { box: [10.4, 8.5, 6.5, 13.5, 13.2, 11], cor: '#ddd6c0', semBorda: true },
  ],
};

export function criarMalha(ctx: Ctx): Meshes {
  const { scene, world: mundo, texture: textura, byId: porId, cfg, light: luzBloco } = ctx;
  const { SX, SY, CHUNK } = cfg.mundo;
  const NCX = SX / CHUNK;

  const matOpaca = new THREE.MeshBasicMaterial({ map: textura.atlas, vertexColors: true });
  const matRecorte = new THREE.MeshBasicMaterial({
    map: textura.atlas, vertexColors: true, alphaTest: 0.5, side: THREE.DoubleSide,
  });
  const matAgua = new THREE.MeshBasicMaterial({
    map: textura.atlas, vertexColors: true, transparent: true, opacity: 0.65,
    depthWrite: false, side: THREE.DoubleSide,
  });
  // camada de tocha: NUNCA recebe o tint de noite — faces iluminadas ficam acesas
  const matLuz = new THREE.MeshBasicMaterial({
    map: textura.atlas, vertexColors: true, alphaTest: 0.5, side: THREE.DoubleSide,
  });

  // meshes[ci] = [opaca, recorte, agua, luz] (null onde a camada é vazia)
  const meshes: Array<Array<THREE.Mesh | null>> = [];
  for (let i = 0; i < NCX * NCX; i++) meshes.push([null, null, null, null]);
  const materiais = [matOpaca, matRecorte, matAgua, matLuz];

  // AO: bloco 'cubo' oclui; vidro/água/flor não. Fora do mundo NÃO oclui
  // (a parede fantasma do obter é só pro culling — sem ela a borda inteira
  // do mapa ganharia cantos escuros cozidos)
  const SZt = cfg.mundo.SZ;
  const obterAO = (x: number, y: number, z: number) =>
    x < 0 || x >= SX || z < 0 || z >= SZt ? 0 : mundo.get(x, y, z);
  const oclui = (id: number) => id !== 0 && porId(id).render === 'cubo';

  function empurrarFace(
    c: Camada, f: number, bx: number, by: number, bz: number,
    tile: number, comAO: boolean, afundarTopo: number, recuo: number, luzTocha = 0
  ) {
    const face = FACES[f];
    const [u0, v0, u1, v1] = textura.uv(tile);
    const uvs = face.uvTopo
      ? [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]
      : [[u0, v0], [u0, v1], [u1, v1], [u1, v0]];
    const base = c.pos.length / 3;
    const sombra = SOMBRA_FACE[f];
    const ao: number[] = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
      const cv = face.v[i];
      let brilho = 1;
      if (comAO) {
        // vizinhos do canto no plano da face (deslocados pela normal)
        const [nx, ny, nz] = face.n;
        // tangentes apontando pro canto: coordenada 0 → -1, 1 → +1 (só nos eixos ⊥ à normal)
        const sx = nx !== 0 ? 0 : cv[0] * 2 - 1;
        const sy = ny !== 0 ? 0 : cv[1] * 2 - 1;
        const sz = nz !== 0 ? 0 : cv[2] * 2 - 1;
        // os dois lados = zerar uma tangente de cada vez
        let l1: boolean, l2: boolean;
        if (nx !== 0) {
          l1 = oclui(obterAO(bx + nx, by + sy, bz));
          l2 = oclui(obterAO(bx + nx, by, bz + sz));
        } else if (ny !== 0) {
          l1 = oclui(obterAO(bx + sx, by + ny, bz));
          l2 = oclui(obterAO(bx, by + ny, bz + sz));
        } else {
          l1 = oclui(obterAO(bx + sx, by, bz + nz));
          l2 = oclui(obterAO(bx, by + sy, bz + nz));
        }
        const canto = oclui(obterAO(bx + (nx || sx), by + (ny || sy), bz + (nz || sz)));
        ao[i] = l1 && l2 ? 0 : 3 - ((l1 ? 1 : 0) + (l2 ? 1 : 0) + (canto ? 1 : 0));
        brilho = BRILHO_AO[ao[i]];
      } else {
        ao[i] = 3;
      }
      let vy = by + cv[1];
      if (afundarTopo > 0 && cv[1] === 1) vy -= afundarTopo;
      const [rx, ry, rz] = face.n;
      c.pos.push(bx + cv[0] - rx * recuo, vy - ry * recuo, bz + cv[2] - rz * recuo);
      c.uv.push(uvs[i][0], uvs[i][1]);
      const luz = Math.max(sombra * brilho, luzTocha);
      c.cor.push(luz, luz, luz);
    }
    // diagonal consistente com o AO (evita o "X" invertido nas quinas)
    if (ao[0] + ao[2] > ao[1] + ao[3]) {
      c.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    } else {
      c.idx.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
    }
  }

  const corCache: Record<string, [number, number, number]> = {};
  const corDe = (hex: string): [number, number, number] => {
    if (!corCache[hex]) {
      const c = new THREE.Color(hex);
      corCache[hex] = [c.r, c.g, c.b];
    }
    return corCache[hex];
  };

  function rotBox(b: [number, number, number, number, number, number], rot: number): [number, number, number, number, number, number] {
    let [x0, y0, z0, x1, y1, z1] = b;
    for (let k = 0; k < rot; k++) {
      const nx0 = 16 - z1;
      const nx1 = 16 - z0;
      const nz0 = x0;
      const nz1 = x1;
      x0 = nx0; x1 = nx1; z0 = nz0; z1 = nz1;
    }
    return [x0, y0, z0, x1, y1, z1];
  }

  function empurrarCaixa(c: Camada, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, rgb: [number, number, number], luzExtra: number, invertida: boolean, u: number, v: number) {
    const quads: Array<[number[], number[], number[], number[], number]> = [
      [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], 0],
      [[x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0], 1],
      [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], 2],
      [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], 3],
      [[x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [x0, y0, z1], 4],
      [[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0], 5],
    ];
    for (const [v0, v1q, v2, v3, f] of quads) {
      const base = c.pos.length / 3;
      const luz = (invertida ? 1 : SOMBRA_FACE[f]) * luzExtra;
      for (const p of [v0, v1q, v2, v3]) {
        c.pos.push(p[0], p[1], p[2]);
        c.uv.push(u, v);
        c.cor.push(rgb[0] * luz, rgb[1] * luz, rgb[2] * luz);
      }
      if (invertida) c.idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
      else c.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }

  const OUTLINE_RGB: [number, number, number] = [26 / 255, 30 / 255, 36 / 255];

  function empurrarMovel(c: Camada, bx: number, by: number, bz: number, id: number) {
    const pecas = FURNITURE[id];
    if (!pecas) return;
    const m = ctx.metas.get(bx, by, bz);
    const rot = m && m.tipo === 'movel' ? m.rot & 3 : 0;
    const [wu0, wv0, wu1, wv1] = textura.uv(61);
    const u = (wu0 + wu1) / 2;
    const v = (wv0 + wv1) / 2;
    for (const peca of pecas) {
      const [x0, y0, z0, x1, y1, z1] = rotBox(peca.box, rot);
      const rgb = corDe(peca.cor);
      const inflar = 0.36;
      empurrarCaixa(c, bx + x0 / 16, by + y0 / 16, bz + z0 / 16, bx + x1 / 16, by + y1 / 16, bz + z1 / 16, rgb, 1, false, u, v);
      if (!peca.semBorda) {
        empurrarCaixa(
          c,
          bx + (x0 - inflar) / 16, by + (y0 - inflar) / 16, bz + (z0 - inflar) / 16,
          bx + (x1 + inflar) / 16, by + (y1 + inflar) / 16, bz + (z1 + inflar) / 16,
          OUTLINE_RGB, 1, true, u, v,
        );
      }
    }
  }

  function empurrarBordas(c: Camada, f: number, bx: number, by: number, bz: number, id: number) {
    const face = FACES[f];
    const [nx, ny, nz] = face.n;
    const normalAxis = nx !== 0 ? 0 : ny !== 0 ? 1 : 2;
    const group = OUTLINE_GROUP[id];
    const [u0, v0, u1, v1] = textura.uv(group);
    const mu = (u0 + u1) / 2;
    const mv = (v0 + v1) / 2;
    const luz = SOMBRA_FACE[f];
    const blockPos = [bx, by, bz];
    for (let k = 0; k < 4; k++) {
      const a = face.v[k];
      const b = face.v[(k + 1) % 4];
      let edgeAxis = -1;
      for (let ax = 0; ax < 3; ax++) {
        if (ax === normalAxis) continue;
        if (a[ax] === b[ax]) edgeAxis = ax;
      }
      if (edgeAxis < 0) continue;
      const dir = a[edgeAxis] === 1 ? 1 : -1;
      const npos = [bx, by, bz];
      npos[edgeAxis] += dir;
      if (OUTLINE_GROUP[mundo.get(npos[0], npos[1], npos[2])] === group) continue;
      const base = c.pos.length / 3;
      const corners = [a, b, b, a];
      for (let i = 0; i < 4; i++) {
        const cv = corners[i];
        const p = [blockPos[0] + cv[0], blockPos[1] + cv[1], blockPos[2] + cv[2]];
        if (i >= 2) p[edgeAxis] -= dir * OUTLINE_WIDTH;
        p[0] += nx * OUTLINE_LIFT;
        p[1] += ny * OUTLINE_LIFT;
        p[2] += nz * OUTLINE_LIFT;
        c.pos.push(p[0], p[1], p[2]);
        c.uv.push(mu, mv);
        c.cor.push(luz, luz, luz);
      }
      c.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }

  function empurrarCruz(c: Camada, bx: number, by: number, bz: number, tile: number, luz = 0.95) {
    const [u0, v0, u1, v1] = textura.uv(tile);
    for (const [x0, z0, x1, z1] of [[0.14, 0.14, 0.86, 0.86], [0.86, 0.14, 0.14, 0.86]] as const) {
      const base = c.pos.length / 3;
      c.pos.push(bx + x0, by, bz + z0, bx + x1, by, bz + z1, bx + x1, by + 1, bz + z1, bx + x0, by + 1, bz + z0);
      c.uv.push(u0, v0, u1, v0, u1, v1, u0, v1);
      for (let i = 0; i < 4; i++) c.cor.push(luz, luz, luz);
      c.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }

  // porta = painel chapado (não cubo): 1 quad fino de dois lados, 2 blocos
  // de altura. As metades compartilham o id (18 fechada / 19 aberta); qual
  // metade é (base/topo) e a orientação da folha saem dos vizinhos.
  function empurrarPorta(c: Camada, bx: number, by: number, bz: number, id: number) {
    const def = porId(id);
    const [u0, v0, u1, v1] = textura.uv(def.tiles[1]);
    const ehP = (v: number) => v === 18 || v === 19;
    const topo = ehP(mundo.get(bx, by - 1, bz)); // porta embaixo → sou o topo
    const base = ehP(mundo.get(bx, by + 1, bz)); // porta em cima → sou a base
    // UV vertical: base amostra a metade de baixo do tile, topo a de cima;
    // porta solta (1 bloco, save antigo) usa o tile inteiro
    const vm = (v0 + v1) / 2;
    const vLo = topo && !base ? vm : v0;
    const vHi = base && !topo ? vm : v1;
    // orientação: parede sólida nos lados define o eixo do batente
    const parede = (x: number, y: number, z: number) => {
      const w = mundo.get(x, y, z);
      return w !== 0 && porId(w).solido;
    };
    const eixoZ = parede(bx, by, bz - 1) && parede(bx, by, bz + 1);
    const aberta = id === 19;
    const e = 0.06; // recuo da folha aberta encostada na dobradiça
    let x0: number, z0: number, x1: number, z1: number;
    if (!eixoZ) {
      // batente ao longo de X: fechada = folha no meio (z=0.5); aberta = gira pra x=e
      if (!aberta) { x0 = 0; z0 = 0.5; x1 = 1; z1 = 0.5; }
      else { x0 = e; z0 = 0; x1 = e; z1 = 1; }
    } else {
      if (!aberta) { x0 = 0.5; z0 = 0; x1 = 0.5; z1 = 1; }
      else { x0 = 0; z0 = e; x1 = 1; z1 = e; }
    }
    const b = c.pos.length / 3;
    c.pos.push(bx + x0, by, bz + z0, bx + x1, by, bz + z1, bx + x1, by + 1, bz + z1, bx + x0, by + 1, bz + z0);
    c.uv.push(u0, vLo, u1, vLo, u1, vHi, u0, vHi);
    for (let i = 0; i < 4; i++) c.cor.push(0.9, 0.9, 0.9);
    c.idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }

  function faceVisivel(id: number, vizinho: number): boolean {
    if (vizinho === 0) return true;
    const meu = porId(id).render;
    const dele = porId(vizinho).render;
    if (dele === 'cubo') return false; // parede sólida cobre qualquer face
    // água desenha contra cruz E vidro (aquário!) — só não contra água
    if (meu === 'agua') return dele === 'cruz' || dele === 'recorte';
    return vizinho !== id; // vidro-vidro se culla, vidro-água/flor desenha
  }

  function reconstruirChunk(ci: number) {
    const cx = ci % NCX;
    const cz = Math.floor(ci / NCX);
    const camadas: Camada[] = [
      { pos: [], uv: [], cor: [], idx: [] },
      { pos: [], uv: [], cor: [], idx: [] },
      { pos: [], uv: [], cor: [], idx: [] },
      { pos: [], uv: [], cor: [], idx: [] },
    ];
    const x0 = cx * CHUNK;
    const z0 = cz * CHUNK;
    for (let y = 0; y < SY; y++) {
      for (let z = z0; z < z0 + CHUNK; z++) {
        for (let x = x0; x < x0 + CHUNK; x++) {
          const id = mundo.get(x, y, z);
          if (id === 0) continue;
          const def = porId(id);
          if (!def) continue; // id desconhecido (save de versão futura?): pula
          if (def.render === 'cruz') {
            const Lc = id === 62 ? 12 : luzBloco.level(x, y, z);
            if (Lc > 0) empurrarCruz(camadas[3], x, y, z, def.tiles[0], id === 62 ? 1 : Math.max(0.4, 0.35 + 0.65 * (Lc / 12)));
            else empurrarCruz(camadas[1], x, y, z, def.tiles[0]);
            continue;
          }
          if (def.render === 'porta') {
            empurrarPorta(camadas[1], x, y, z, id);
            continue;
          }
          if (def.render === 'movel') {
            empurrarMovel(luzBloco.level(x, y, z) > 0 ? camadas[3] : camadas[0], x, y, z, id);
            continue;
          }
          const comAO = def.render === 'cubo';
          // topo da água rebaixado quando tem ar em cima (linha d'água)
          const superficie = def.render === 'agua' && mundo.get(x, y + 1, z) === 0 ? 0.12 : 0;
          for (let f = 0; f < 6; f++) {
            const n = FACES[f].n;
            const viz = mundo.get(x + n[0], y + n[1], z + n[2]);
            if (!faceVisivel(id, viz)) continue;
            const Lf = def.render === 'cubo' ? luzBloco.level(x + n[0], y + n[1], z + n[2]) : 0;
            const luzTocha = Lf > 0 ? 0.35 + 0.65 * (Lf / 12) : 0;
            const camada = def.render === 'agua' ? camadas[2] : def.render === 'recorte' ? camadas[1] : luzTocha > 0 ? camadas[3] : camadas[0];
            const tile = f === 2 ? def.tiles[0] : f === 3 ? def.tiles[2] : def.tiles[1];
            const vizDef = viz === 0 ? null : porId(viz);
            const recuo = def.render === 'agua' && vizDef && vizDef.render === 'recorte' ? 0.0045 : 0;
            empurrarFace(camada, f, x, y, z, tile, comAO, superficie, recuo, luzTocha);
            if (OUTLINE_GROUP[id] !== undefined) empurrarBordas(camadas[0], f, x, y, z, id);
          }
        }
      }
    }

    for (let l = 0; l < 4; l++) {
      const velho = meshes[ci][l];
      if (velho) {
        velho.geometry.dispose();
        scene.remove(velho);
        meshes[ci][l] = null;
      }
      const c = camadas[l];
      if (!c.idx.length) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(c.pos), 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(c.uv), 2));
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(c.cor), 3));
      geo.setIndex(new THREE.BufferAttribute(new Uint32Array(c.idx), 1));
      geo.computeBoundingSphere(); // mesh ESTÁTICA: frustum culling ligado de graça
      const mesh = new THREE.Mesh(geo, materiais[l]);
      mesh.matrixAutoUpdate = false;
      if (l === 2) mesh.renderOrder = 2; // água por último (blend)
      scene.add(mesh);
      meshes[ci][l] = mesh;
    }
  }

  return {
    buildAll() {
      luzBloco.rebuildAll();
      for (let ci = 0; ci < NCX * NCX; ci++) reconstruirChunk(ci);
      mundo.dirty.clear();
    },
    rebuildDirty() {
      if (!mundo.dirty.size) return;
      for (const ci of mundo.dirty) reconstruirChunk(ci);
      mundo.dirty.clear();
    },
    // tint dia/noite: MeshBasicMaterial.color multiplica map × vertexColor,
    // então uma cor por material escurece/tinge o mundo inteiro de graça
    tint(cor: THREE.Color) {
      matOpaca.color.copy(cor);
      matRecorte.color.copy(cor);
      matAgua.color.copy(cor);
    },
  };
}
