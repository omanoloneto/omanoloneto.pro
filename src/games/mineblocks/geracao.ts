// Geração procedural da ilha: value noise 2D pro relevo, camadas
// grama/terra/pedra, praia, lagos, árvores e flores. Funções puras
// (mesma seed = mesmo mundo).
import type { Contexto } from './tipos';

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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

export function gerarMundo(ctx: Contexto, seed: number) {
  const { mundo, cfg } = ctx;
  const { SX, SZ, SY, nivelAgua } = cfg.mundo;
  const G = cfg.geracao;
  const rng = mulberry32(seed ^ 0xc0ffee);
  mundo.limpar();

  const meioX = SX / 2;
  const meioZ = SZ / 2;
  const meia = SX / 2;

  // ----- relevo + camadas -----
  const alturas = new Int16Array(SX * SZ);
  for (let z = 0; z < SZ; z++) {
    for (let x = 0; x < SX; x++) {
      const n = relevo(x, z, seed, G.escalaRuido);
      // ilha: afunda suavemente do miolo pra borda
      const r = Math.hypot(x - meioX, z - meioZ) / meia;
      const borda = suave(Math.min(1, Math.max(0, (r - G.ilhaInicioR) / (1.08 - G.ilhaInicioR))));
      let h = Math.round(G.alturaBase + (n * 2 - 1) * G.amplitude - borda * G.ilhaQueda);
      h = Math.max(2, Math.min(SY - 16, h));
      alturas[x + z * SX] = h;

      const praia = h <= nivelAgua + 1;
      for (let y = 0; y <= h; y++) {
        let id: number;
        if (y === 0) id = 14; // rocha-mãe inquebrável
        else if (y >= h - 2 && praia) id = 4; // areia na beira d'água
        else if (y === h) id = 1; // grama
        else if (y >= h - 2) id = 2; // terra
        else id = 3; // pedra
        mundo.dados[x + z * SX + y * SX * SZ] = id;
      }
      // água até o nível do mar
      for (let y = h + 1; y <= nivelAgua; y++) {
        mundo.dados[x + z * SX + y * SX * SZ] = 13;
      }
    }
  }

  const alturaEm = (x: number, z: number) => alturas[x + z * SX];
  const ehGrama = (x: number, z: number) =>
    mundo.obter(x, alturaEm(x, z), z) === 1;

  // ----- árvores (tronco 4-5 + copa) -----
  const copas: Array<[number, number]> = [];
  for (let i = 0; i < G.arvores; i++) {
    const x = 4 + Math.floor(rng() * (SX - 8));
    const z = 4 + Math.floor(rng() * (SZ - 8));
    const h = alturaEm(x, z);
    if (!ehGrama(x, z) || h <= nivelAgua) continue;
    // clareira do spawn: ninguém nasce em pé no topo de uma copa
    if (Math.abs(x - SX / 2) < 4 && Math.abs(z - SZ / 2) < 4) continue;
    if (copas.some(([cx, cz]) => Math.abs(cx - x) < 5 && Math.abs(cz - z) < 5)) continue;
    copas.push([x, z]);
    const alt = 4 + Math.floor(rng() * 2);
    for (let y = 1; y <= alt; y++) mundo.definir(x, h + y, z, 5);
    // copa: caixa 5×5 em 2 camadas (cantos ralos) + cruz no topo
    for (const dy of [alt - 1, alt]) {
      for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
          if (dx === 0 && dz === 0 && dy === alt - 1) continue; // tronco
          if (Math.abs(dx) === 2 && Math.abs(dz) === 2 && rng() > 0.4) continue;
          if (mundo.obter(x + dx, h + dy + 1, z + dz) === 0) mundo.definir(x + dx, h + dy + 1, z + dz, 7);
        }
      }
    }
    for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      if (mundo.obter(x + dx, h + alt + 2, z + dz) === 0) mundo.definir(x + dx, h + alt + 2, z + dz, 7);
    }
  }

  // ----- flores em grama livre -----
  for (let i = 0; i < G.flores; i++) {
    const x = 1 + Math.floor(rng() * (SX - 2));
    const z = 1 + Math.floor(rng() * (SZ - 2));
    const h = alturaEm(x, z);
    if (!ehGrama(x, z) || h <= nivelAgua) continue;
    if (mundo.obter(x, h + 1, z) !== 0) continue;
    mundo.definir(x, h + 1, z, rng() > 0.5 ? 11 : 12);
  }

  mundo.sujos.clear(); // construirTudo vem a seguir; nada pendente
}
