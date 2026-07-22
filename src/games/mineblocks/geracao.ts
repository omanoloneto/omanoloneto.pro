// Geração procedural da ilha: value noise 2D pro relevo, camadas
// grama/terra/pedra, praia, lagos, árvores e flores. Funções puras
// (mesma seed = mesmo mundo).
import { mulberry32 } from '../../lib/rng';
import type { Ctx } from './types';

// hash inteiro determinístico do ponto da grade (independente de Math.sin)
function hash2(ix: number, iz: number, seed: number): number {
  let h = (ix * 374761393 + iz * 668265263) ^ seed;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const suave = (t: number) => t * t * (3 - 2 * t);

function ruido2D(x: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = suave(x - ix);
  const fz = suave(z - iz);
  const a = hash2(ix, iz, seed);
  const b = hash2(ix + 1, iz, seed);
  const c = hash2(ix, iz + 1, seed);
  const d = hash2(ix + 1, iz + 1, seed);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}

// 3 oitavas — colinas grandes + detalhe
function relevo(x: number, z: number, seed: number, escala: number): number {
  return (
    ruido2D(x * escala, z * escala, seed) * 0.62 +
    ruido2D(x * escala * 2.1, z * escala * 2.1, seed ^ 0x9e3779b9) * 0.26 +
    ruido2D(x * escala * 4.3, z * escala * 4.3, seed ^ 0x85ebca6b) * 0.12
  );
}

export function brotarArvore(ctx: Ctx, x: number, h: number, z: number, rng: () => number) {
  const { world: mundo } = ctx;
  const alt = 4 + Math.floor(rng() * 2);
  for (let y = 1; y <= alt; y++) mundo.set(x, h + y, z, 5);
  const leaves: Array<[number, number, number]> = [];
  const putLeaf = (lx: number, ly: number, lz: number) => {
    if (mundo.get(lx, ly, lz) === 0) {
      mundo.set(lx, ly, lz, 7);
      leaves.push([lx, ly, lz]);
    }
  };
  for (const dy of [alt - 1, alt]) {
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        if (dx === 0 && dz === 0 && dy === alt - 1) continue;
        if (Math.abs(dx) === 2 && Math.abs(dz) === 2 && rng() > 0.4) continue;
        putLeaf(x + dx, h + dy + 1, z + dz);
      }
    }
  }
  for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    putLeaf(x + dx, h + alt + 2, z + dz);
  }
  for (let i = leaves.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [leaves[i], leaves[j]] = [leaves[j], leaves[i]];
  }
  leaves.forEach(([lx, ly, lz], i) => {
    if (i < 2 || rng() < 0.1) mundo.set(lx, ly, lz, 37);
  });
}

function digDungeon(ctx: Ctx, rng: () => number, heightAt: (x: number, z: number) => number) {
  const { world: mundo, cfg } = ctx;
  const { SX, SZ, nivelAgua } = cfg.mundo;
  const D = cfg.geracao.dungeon;
  const midX = SX / 2;
  const midZ = SZ / 2;
  // meia-profundidade: a escada até a superfície fica com tamanho de gente
  // e ainda sobra um subsolo inteiro pra minerar abaixo da dungeon
  const FLOOR_Y = 26;
  const ROOM_TOP = FLOOR_Y + 4;
  const HALL_TOP = FLOOR_Y + 3;
  const KEEP_OUT = SX / 4 + 3;

  function areaOk(x0: number, x1: number, z0: number, z1: number): boolean {
    if (x0 < 3 || z0 < 3 || x1 >= SX - 3 || z1 >= SZ - 3) return false;
    for (let z = z0; z <= z1; z++) {
      for (let x = x0; x <= x1; x++) {
        if (heightAt(x, z) < nivelAgua) return false;
      }
    }
    return true;
  }

  function setCell(x: number, y: number, z: number, id: number) {
    mundo.data[x + z * SX + y * SX * SZ] = id;
  }

  function carveBox(x0: number, x1: number, z0: number, z1: number, yTop: number) {
    for (let z = z0; z <= z1; z++) {
      for (let x = x0; x <= x1; x++) {
        setCell(x, FLOOR_Y, z, 10);
        for (let y = FLOOR_Y + 1; y <= yTop; y++) setCell(x, y, z, 0);
      }
    }
  }

  type Room = { x: number; z: number; w: number; d: number };
  const todas: Room[] = [];
  const baseGlobal = rng() * Math.PI * 2;

  // cada dungeon vive num setor angular próprio ao redor do spawn; a lista
  // `todas` impede sala de uma invadir sala da outra
  function digOne(baseAngle: number) {
    const rooms: Room[] = [];
    const spin = rng() < 0.5 ? 1 : -1;
    for (let i = 0; i < D.salas; i++) {
      for (let t = 0; t < 60; t++) {
        const ang = baseAngle + spin * i * 0.22 + (rng() - 0.5) * 0.12;
        const need = KEEP_OUT / Math.max(Math.abs(Math.cos(ang)), Math.abs(Math.sin(ang)));
        const dist = need + 3 + rng() * 8;
        const cx = Math.round(midX + Math.cos(ang) * dist);
        const cz = Math.round(midZ + Math.sin(ang) * dist);
        const w = 7 + 2 * Math.floor(rng() * 3);
        const d = 7 + 2 * Math.floor(rng() * 2);
        const x0 = cx - (w >> 1);
        const z0 = cz - (d >> 1);
        if (Math.max(Math.abs(cx - midX), Math.abs(cz - midZ)) <= KEEP_OUT) continue;
        if (!areaOk(x0 - 1, x0 + w, z0 - 1, z0 + d)) continue;
        if (todas.some((r) => Math.abs(r.x - cx) < (r.w + w) / 2 + 3 && Math.abs(r.z - cz) < (r.d + d) / 2 + 3)) continue;
        rooms.push({ x: cx, z: cz, w, d });
        todas.push({ x: cx, z: cz, w, d });
        break;
      }
    }
    if (!rooms.length) return;

    for (let i = 1; i < rooms.length; i++) {
      const a = rooms[i - 1];
      const b = rooms[i];
      const xLo = Math.min(a.x, b.x);
      const xHi = Math.max(a.x, b.x);
      const zLo = Math.min(a.z, b.z);
      const zHi = Math.max(a.z, b.z);
      if (areaOk(xLo, xHi + 1, a.z, a.z + 1) && areaOk(b.x, b.x + 1, zLo, zHi + 1)) {
        carveBox(xLo, xHi + 1, a.z, a.z + 1, HALL_TOP);
        carveBox(b.x, b.x + 1, zLo, zHi + 1, HALL_TOP);
      } else if (areaOk(a.x, a.x + 1, zLo, zHi + 1) && areaOk(xLo, xHi + 1, b.z, b.z + 1)) {
        carveBox(a.x, a.x + 1, zLo, zHi + 1, HALL_TOP);
        carveBox(xLo, xHi + 1, b.z, b.z + 1, HALL_TOP);
      }
    }

    function seedOre(roomIndex: number, oreId: number, quota: number) {
      const r = rooms[roomIndex];
      const x0 = r.x - (r.w >> 1);
      const z0 = r.z - (r.d >> 1);
      const x1 = x0 + r.w - 1;
      const z1 = z0 + r.d - 1;
      let placed = 0;
      for (let t = 0; t < quota * 5 && placed < quota; t++) {
        const face = Math.floor(rng() * 5);
        let x = x0 + Math.floor(rng() * r.w);
        let z = z0 + Math.floor(rng() * r.d);
        let y = FLOOR_Y + 1 + Math.floor(rng() * 4);
        if (face === 0) x = x0 - 1;
        else if (face === 1) x = x1 + 1;
        else if (face === 2) z = z0 - 1;
        else if (face === 3) z = z1 + 1;
        else y = ROOM_TOP + 1;
        if (mundo.get(x, y, z) === 3) {
          setCell(x, y, z, oreId);
          placed++;
        }
      }
    }

    for (let i = 0; i < rooms.length; i++) {
      const r = rooms[i];
      const x0 = r.x - (r.w >> 1);
      const z0 = r.z - (r.d >> 1);
      carveBox(x0, x0 + r.w - 1, z0, z0 + r.d - 1, ROOM_TOP);
    }
    for (let i = 0; i < rooms.length; i++) {
      seedOre(i, 22, D.carvaoPorSala);
      if (i >= 2) seedOre(i, 25, D.ferroPorSala);
    }

    const last = rooms[rooms.length - 1];
    setCell(last.x, FLOOR_Y + 1, last.z, 17);
    const loot = new Array(ctx.blocks.length).fill(0);
    loot[6] = 8;
    loot[8] = 4;
    loot[9] = 6;
    loot[23] = 6;
    loot[26] = 2;
    ctx.metas.set(last.x, FLOOR_Y + 1, last.z, { tipo: 'bau', dono: '*', itens: loot });

    const first = rooms[0];
    const stepX = Math.abs(first.x - midX) >= Math.abs(first.z - midZ) ? Math.sign(first.x - midX) : 0;
    const stepZ = stepX === 0 ? Math.sign(first.z - midZ) : 0;
    let sx = first.x + stepX * ((first.w >> 1) + 1);
    let sz = first.z + stepZ * ((first.d >> 1) + 1);
    let floorY = FLOOR_Y;
    for (let i = 0; i < 60; i++) {
      if (sx < 2 || sx >= SX - 2 || sz < 2 || sz >= SZ - 2) return;
      const h = heightAt(sx, sz);
      if (h < nivelAgua) return;
      setCell(sx, floorY, sz, 10);
      const emerged = floorY + 3 >= h;
      const topo = emerged ? h + 1 : floorY + 3;
      for (let y = floorY + 1; y <= topo; y++) setCell(sx, y, sz, 0);
      if (floorY >= h) {
        const px = stepZ;
        const pz = stepX;
        for (const s of [-1, 1]) {
          const bx = sx + px * s;
          const bz = sz + pz * s;
          if (bx < 1 || bx >= SX - 1 || bz < 1 || bz >= SZ - 1) continue;
          const hh = heightAt(bx, bz);
          setCell(bx, hh + 1, bz, 10);
          setCell(bx, hh + 2, bz, 10);
        }
        return;
      }
      floorY++;
      sx += stepX;
      sz += stepZ;
    }
    }

  for (let d = 0; d < D.n; d++) digOne(baseGlobal + (d * Math.PI * 2) / D.n);
}

export function gerarMundo(ctx: Ctx, seed: number) {
  const { world: mundo, cfg } = ctx;
  const { SX, SZ, SY, nivelAgua } = cfg.mundo;
  const G = cfg.geracao;
  const rng = mulberry32(seed ^ 0xc0ffee);
  mundo.clear();

  const meioX = SX / 2;
  const meioZ = SZ / 2;
  const meia = SX / 2;

  // ----- relevo + camadas -----
  const P = G.pampa;
  const alturas = new Int16Array(SX * SZ);
  const pampaMask = new Uint8Array(SX * SZ);
  for (let z = 0; z < SZ; z++) {
    for (let x = 0; x < SX; x++) {
      const n = relevo(x, z, seed, G.escalaRuido);
      const r = Math.hypot(x - meioX, z - meioZ) / meia;
      const borda = suave(Math.min(1, Math.max(0, (r - G.ilhaInicioR) / (1.08 - G.ilhaInicioR))));
      let h = Math.round(G.alturaBase + (n * 2 - 1) * G.amplitude - borda * G.ilhaQueda);

      const rp = Math.hypot(x - P.x, z - P.z) / P.raio;
      let pampa = false;
      if (rp < 1.2) {
        const np = relevo(x, z, seed ^ 0x5199, 0.012);
        const bordaP = suave(Math.min(1, Math.max(0, (rp - 0.55) / (1.2 - 0.55))));
        const hp = Math.round(nivelAgua + 4 + (np * 2 - 1) * 2.5 - bordaP * 14);
        if (hp > h) {
          h = hp;
          pampa = hp > nivelAgua + 1;
        }
      }
      h = Math.max(2, Math.min(SY - 16, h));
      alturas[x + z * SX] = h;
      pampaMask[x + z * SX] = pampa ? 1 : 0;

      const praia = h <= nivelAgua + 1;
      for (let y = 0; y <= h; y++) {
        let id: number;
        if (y === 0) id = 14;
        else if (y >= h - 2 && praia) id = 4;
        else if (y === h) id = pampa ? 47 : 1;
        else if (y >= h - 2) id = 2;
        else id = 3;
        mundo.data[x + z * SX + y * SX * SZ] = id;
      }
      for (let y = h + 1; y <= nivelAgua; y++) {
        mundo.data[x + z * SX + y * SX * SZ] = 13;
      }
    }
  }

  const alturaEm = (x: number, z: number) => alturas[x + z * SX];
  const ehGrama = (x: number, z: number) =>
    mundo.get(x, alturaEm(x, z), z) === 1;

  digDungeon(ctx, rng, alturaEm);

  // ----- veios de minério espalhados no subsolo (random walk na pedra) -----
  const semearVeios = (oreId: number, v: { n: number; sizeMin: number; sizeMax: number; yMin: number; yMax?: number }) => {
    for (let i = 0; i < v.n; i++) {
      let x = 2 + Math.floor(rng() * (SX - 4));
      let z = 2 + Math.floor(rng() * (SZ - 4));
      const teto = Math.min(v.yMax ?? SY, alturaEm(x, z) - 3);
      if (teto <= v.yMin) continue;
      let y = v.yMin + Math.floor(rng() * (teto - v.yMin + 1));
      const tam = v.sizeMin + Math.floor(rng() * (v.sizeMax - v.sizeMin + 1));
      for (let b = 0; b < tam; b++) {
        if (mundo.data[x + z * SX + y * SX * SZ] === 3) {
          mundo.data[x + z * SX + y * SX * SZ] = oreId;
        }
        const eixo = Math.floor(rng() * 3);
        const passo = rng() < 0.5 ? -1 : 1;
        if (eixo === 0) x = Math.max(1, Math.min(SX - 2, x + passo));
        else if (eixo === 1) y = Math.max(1, Math.min(SY - 2, y + passo));
        else z = Math.max(1, Math.min(SZ - 2, z + passo));
      }
    }
  };
  semearVeios(22, G.veins.coal);
  semearVeios(25, G.veins.iron);
  semearVeios(38, G.veins.ouro);

  // ----- árvores (tronco 4-5 + copa) -----
  const copas: Array<[number, number]> = [];
  for (let i = 0; i < G.arvores; i++) {
    const x = 4 + Math.floor(rng() * (SX - 8));
    const z = 4 + Math.floor(rng() * (SZ - 8));
    const h = alturaEm(x, z);
    if (!ehGrama(x, z) || h <= nivelAgua) continue;
    // clareira do spawn: ninguém nasce em pé no topo de uma copa
    if (Math.abs(x - SX / 2) < 4 && Math.abs(z - SZ / 2) < 4) continue;
    // 7 de distância: copas (raio 2) nunca se encostam — senão cortar uma
    // árvore deixa meia copa da vizinha "segurando" folhas no ar
    if (copas.some(([cx, cz]) => Math.abs(cx - x) < 7 && Math.abs(cz - z) < 7)) continue;
    copas.push([x, z]);
    brotarArvore(ctx, x, h, z, rng);
  }

  // ----- flores em grama livre -----
  for (let i = 0; i < G.flores; i++) {
    const x = 1 + Math.floor(rng() * (SX - 2));
    const z = 1 + Math.floor(rng() * (SZ - 2));
    const h = alturaEm(x, z);
    if (!ehGrama(x, z) || h <= nivelAgua) continue;
    if (mundo.get(x, h + 1, z) !== 0) continue;
    mundo.set(x, h + 1, z, rng() > 0.5 ? 11 : 12);
  }

  const pampaTop = (x: number, z: number) => {
    const h = alturaEm(x, z);
    return pampaMask[x + z * SX] === 1 && mundo.get(x, h, z) === 47 && mundo.get(x, h + 1, z) === 0 ? h : -1;
  };
  const pampaSpot = () => {
    const x = Math.max(2, Math.min(SX - 3, Math.floor(P.x - P.raio + rng() * P.raio * 2)));
    const z = Math.max(2, Math.min(SZ - 3, Math.floor(P.z - P.raio + rng() * P.raio * 2)));
    return { x, z };
  };
  for (let i = 0; i < P.capim; i++) {
    const { x, z } = pampaSpot();
    const h = pampaTop(x, z);
    if (h > 0) mundo.set(x, h + 1, z, 48);
  }
  for (let i = 0; i < P.moitas; i++) {
    const { x, z } = pampaSpot();
    const h = pampaTop(x, z);
    if (h > 0) mundo.set(x, h + 1, z, 49);
  }
  let umbus = 0;
  for (let tries = 0; tries < 400 && umbus < P.umbus; tries++) {
    const { x, z } = pampaSpot();
    if (x < 6 || z < 6 || x >= SX - 6 || z >= SZ - 6) continue;
    const h = pampaTop(x, z);
    if (h <= nivelAgua + 2) continue;
    brotarUmbu(ctx, x, h, z, rng);
    umbus++;
  }
  const A = P.ametista;
  let seeded = 0;
  for (let tries = 0; tries < A.n * 30 && seeded < A.n; tries++) {
    const { x, z } = pampaSpot();
    if (pampaMask[x + z * SX] !== 1) continue;
    const y0 = A.yMin + Math.floor(rng() * (A.yMax - A.yMin));
    const size = A.sizeMin + Math.floor(rng() * (A.sizeMax - A.sizeMin + 1));
    let cx = x;
    let cy = y0;
    let cz = z;
    for (let s = 0; s < size; s++) {
      if (mundo.get(cx, cy, cz) === 3) mundo.data[cx + cz * SX + cy * SX * SZ] = 51;
      cx += Math.floor(rng() * 3) - 1;
      cy += Math.floor(rng() * 3) - 1;
      cz += Math.floor(rng() * 3) - 1;
      cy = Math.max(A.yMin, Math.min(A.yMax, cy));
    }
    seeded++;
  }

  mundo.dirty.clear(); // construirTudo vem a seguir; nada pendente
}

export function brotarUmbu(ctx: Ctx, x: number, h: number, z: number, rng: () => number) {
  const { world: mundo } = ctx;
  const alt = 7 + Math.floor(rng() * 2);
  for (let y = 1; y <= alt; y++) mundo.set(x, h + y, z, 5);
  mundo.set(x + 1, h + alt - 1, z, 5);
  mundo.set(x - 1, h + alt - 2, z, 5);
  const leaves: Array<[number, number, number]> = [];
  const putLeaf = (lx: number, ly: number, lz: number) => {
    if (mundo.get(lx, ly, lz) === 0) {
      mundo.set(lx, ly, lz, 7);
      leaves.push([lx, ly, lz]);
    }
  };
  for (const [dy, radius] of [[alt - 1, 3], [alt, 3], [alt + 1, 2]] as const) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        if (Math.abs(dx) === radius && Math.abs(dz) === radius && rng() > 0.3) continue;
        if (dx === 0 && dz === 0 && dy <= alt) continue;
        putLeaf(x + dx, h + dy + 1, z + dz);
      }
    }
  }
  for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    putLeaf(x + dx, h + alt + 3, z + dz);
  }
  for (let i = leaves.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [leaves[i], leaves[j]] = [leaves[j], leaves[i]];
  }
  leaves.forEach(([lx, ly, lz], i) => {
    if (i < 2 || rng() < 0.1) mundo.set(lx, ly, lz, 37);
  });
}
