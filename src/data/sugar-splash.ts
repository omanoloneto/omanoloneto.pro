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
    alturaParede: 5,
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

export type MapId = 'piscina' | 'deserto';

export interface MapTheme {
  ceu: number;
  nevoa: [number, number];
  deck: [string, string];
  perimetro: [string, string, string];
  interna: [string, string];
  sol: number;
}

export interface MapDef {
  id: MapId;
  nome: string;
  emoji: string;
  larg: number;
  prof: number;
  piscina: { x0: number; z0: number; x1: number; z1: number; fundo: number };
  vestiarios: boolean;
  tema: MapTheme;
  paredes: Caixote[];
  caixotes: Caixote[];
  spawnsTime: Array<{ x: number; z: number; yaw: number }>;
  spawnsBots: Array<[number, number]>;
}

export const mapas: MapDef[] = [
  {
    id: 'piscina',
    nome: 'Clube da Piscina',
    emoji: '🏊',
    larg: 56,
    prof: 32,
    piscina: { x0: -9, z0: -6, x1: 9, z1: 6, fundo: -1.5 },
    vestiarios: true,
    tema: {
      ceu: 0x8fd4f0,
      nevoa: [40, 90],
      deck: ['#e8e4da', '#b8b4aa'],
      perimetro: ['#dce8ec', '#a8b8c0', '#3878c0'],
      interna: ['#dce8ec', '#a8b8c0'],
      sol: 0xfff2d5,
    },
    paredes: [],
    caixotes: [
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
    ],
    spawnsTime: [
      { x: -24.5, z: 12, yaw: -0.53 },
      { x: 24.5, z: 12, yaw: 0.53 },
    ],
    spawnsBots: [
      [-21, -6], [21, -6], [-21, 6], [21, 6], [-12, -13], [12, 13], [-12, 13], [12, -13],
    ],
  },
  // dust2 de doce: simetria de ponto (obstáculo em (x,z) tem gêmeo em
  // (-x,-z)) pra nenhum time levar vantagem; fonte central recarrega água
  {
    id: 'deserto',
    nome: 'Deserto Doce',
    emoji: '🏜️',
    larg: 64,
    prof: 44,
    piscina: { x0: -4, z0: -4, x1: 4, z1: 4, fundo: -1.2 },
    vestiarios: false,
    tema: {
      ceu: 0xffddab,
      nevoa: [45, 105],
      deck: ['#f0d8a0', '#d0b070'],
      perimetro: ['#e8c088', '#c09858', '#e85898'],
      interna: ['#d9a86c', '#b08048'],
      sol: 0xffe2b8,
    },
    paredes: [
      { x: -13, z: -12, w: 14, d: 1, h: 5 },
      { x: 7, z: -12, w: 14, d: 1, h: 5 },
      { x: 13, z: 12, w: 14, d: 1, h: 5 },
      { x: -7, z: 12, w: 14, d: 1, h: 5 },
      { x: -10, z: -3, w: 1, d: 8, h: 5 },
      { x: 10, z: 3, w: 1, d: 8, h: 5 },
    ],
    caixotes: [
      { x: 20, z: -15, w: 2, d: 2, h: 1.6 },
      { x: 22, z: -15, w: 2, d: 2, h: 1.6 },
      { x: 20, z: -15, w: 2, d: 2, h: 3.2 },
      { x: -20, z: 15, w: 2, d: 2, h: 1.6 },
      { x: -22, z: 15, w: 2, d: 2, h: 1.6 },
      { x: -20, z: 15, w: 2, d: 2, h: 3.2 },
      { x: -16, z: -17, w: 2.4, d: 2.4, h: 2 },
      { x: 16, z: 17, w: 2.4, d: 2.4, h: 2 },
      { x: 1, z: -8.5, w: 3, d: 1.6, h: 1.8 },
      { x: -1, z: 8.5, w: 3, d: 1.6, h: 1.8 },
      { x: -26, z: 8, w: 2, d: 2, h: 1.6 },
      { x: 26, z: -8, w: 2, d: 2, h: 1.6 },
    ],
    spawnsTime: [
      { x: -27, z: 17, yaw: -1.01 },
      { x: 27, z: -17, yaw: 2.13 },
    ],
    spawnsBots: [
      [-24, -17], [-27, -8], [-18, 18], [-8, -19], [24, 17], [27, 8], [18, -18], [8, 19],
    ],
  },
];
