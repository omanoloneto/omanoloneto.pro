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
    vidas: 3,
    regenPorS: 4,
    regenAposS: 3,
  },
  bisnaga: {
    cadenciaMs: 140,
    velJato: 38,
    dano: 12,
    tanqueMax: 40,
    recargaPorS: 3,
    recargaPiscinaPorS: 30,
    dropletGravity: 4,
    dropletLifeS: 2,
  },
  bots: {
    raio: 0.55,
    altura: 1.8,
    velBase: 2.2,
    velPorOnda: 0.25,
    velMax: 4.6,
    hpBase: 30,
    hpPorOnda: 8,
    dano: 9,
    cadenciaMs: 1100,
    alcanceTiro: 12,
    alcanceVisao: 34,
    velJato: 14,
    pontosPorBot: 100,
    bonusOndaLimpa: 150,
  },
  ondas: {
    botsBase: 3,
    botsPorOnda: 1,
    botsMax: 10,
    respiroMs: 3500,
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

export const spawnJogador = { x: 0, z: 10, yaw: 0 };
