export const config = {
  jogador: {
    vel: 6.5,
    velAgua: 3.5,
    raio: 0.5,
    altura: 1.7,
    alturaAgua: 1.1,
    pulo: 5.2,
    gravidade: 14,
    solidezMax: 100,
  },
  partida: {
    duracaoS: 300,
    respawnS: 5,
    inimigos: 4,
    bonusVitoria: 500,
  },
  bisnaga: {
    cadenciaMs: 140,
    velJato: 38,
    dano: 12,
    tanqueMax: 40,
    recargaPiscinaPorS: 30,
    dropletGravity: 4,
    dropletLifeS: 2,
  },
  bots: {
    raio: 0.55,
    altura: 1.8,
    vel: 3.2,
    hp: 30,
    dano: 9,
    cadenciaMs: 1100,
    alcanceTiro: 12,
    velJato: 14,
    pontosPorBot: 100,
  },
  arena: {
    larg: 56,
    prof: 32,
    alturaParede: 5,
    piscina: { x0: -9, z0: -6, x1: 9, z1: 6, fundo: -1.5 },
    lockerRoom: { innerX: 21, wallH: 3.8, doorZ: 6, doorW: 3 },
  },
  ranking: {
    api: '/class/api/ranking.php',
    jogo: 'sugar-splash',
    max: 10,
    nomeMin: 2,
    nomeMax: 6,
  },
  sala: {
    api: '/class/api/ss-salas.php',
    pollMs: 500,
    pollLobbyMs: 1500,
    jitterMs: 200,
    maxJogadores: 12,
  },
  somLigadoInicial: true,
} as const;

export type Caixote = { x: number; z: number; w: number; d: number; h: number };

export const caixotes: Caixote[] = [
  { x: -16, z: -10, w: 2, d: 2, h: 1.6 },
  { x: -14, z: -10, w: 2, d: 2, h: 1.6 },
  { x: -16, z: -10, w: 2, d: 2, h: 3.2 },
  { x: 15, z: 10, w: 2, d: 2, h: 1.6 },
  { x: 17, z: 10, w: 2, d: 2, h: 1.6 },
  { x: 15, z: 10, w: 2, d: 2, h: 3.2 },
  { x: -17, z: 9, w: 2.4, d: 2.4, h: 2 },
  { x: 16, z: -11, w: 2.4, d: 2.4, h: 2 },
  { x: 0, z: -13, w: 3, d: 1.6, h: 1.8 },
  { x: 0, z: 13, w: 3, d: 1.6, h: 1.8 },
];

export const spawnsBots: Array<[number, number]> = [
  [-21, -6], [21, -6], [-21, 6], [21, 6], [-12, -13], [12, 13], [-12, 13], [12, -13],
];

export const spawnsTime: Array<{ x: number; z: number; yaw: number }> = [
  { x: -24.5, z: 12, yaw: -0.53 },
  { x: 24.5, z: 12, yaw: 0.53 },
];
