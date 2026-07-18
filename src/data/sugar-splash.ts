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
export type Rect = { x0: number; z0: number; x1: number; z1: number };
export type Piscina = Rect & { fundo: number };

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
  piscinas: Piscina[];
  vestiarios: boolean;
  tema: MapTheme;
  // blueprint: praças (áreas abertas) + corredores (fechados, com teto);
  // as paredes saem do contorno da união — fora dos retângulos é sólido
  blueprint?: { pracas: Rect[]; corredores: Rect[] };
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
    piscinas: [{ x0: -9, z0: -6, x1: 9, z1: 6, fundo: -1.5 }],
    vestiarios: true,
    tema: {
      ceu: 0x8fd4f0,
      nevoa: [40, 90],
      deck: ['#e8e4da', '#b8b4aa'],
      perimetro: ['#dce8ec', '#a8b8c0', '#3878c0'],
      interna: ['#dce8ec', '#a8b8c0'],
      sol: 0xfff2d5,
    },
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
  // dust2 de doce seguindo o blueprint do Manolo (2026-07-18): duas bases
  // com piscina própria, espinha de corredores fechados no norte, praça
  // central e praça leste ligadas embaixo, anexo aberto na direita
  {
    id: 'deserto',
    nome: 'Deserto Doce',
    emoji: '🏜️',
    larg: 64,
    prof: 52,
    piscinas: [
      { x0: 8, z0: -22, x1: 12, z1: -18, fundo: -1.2 },
      { x0: -29, z0: 15, x1: -23, z1: 23, fundo: -1.2 },
    ],
    vestiarios: false,
    tema: {
      ceu: 0xffddab,
      nevoa: [45, 105],
      deck: ['#f0d8a0', '#d0b070'],
      perimetro: ['#e8c088', '#c09858', '#e85898'],
      interna: ['#d9a86c', '#b08048'],
      sol: 0xffe2b8,
    },
    blueprint: {
      pracas: [
        { x0: 3, z0: -26, x1: 16, z1: -14 },
        { x0: -15, z0: 2, x1: 3, z1: 25 },
        { x0: 7, z0: 6, x1: 24, z1: 26 },
        { x0: 28, z0: -2, x1: 32, z1: 4 },
        { x0: -32, z0: 11, x1: -21, z1: 25 },
      ],
      corredores: [
        { x0: 7, z0: -14, x1: 13, z1: -7 },
        { x0: -10, z0: -8, x1: 28, z1: -2 },
        { x0: -11, z0: -2, x1: -5, z1: 2 },
        { x0: 7, z0: -2, x1: 13, z1: 6 },
        { x0: 23, z0: -2, x1: 29, z1: 10 },
        { x0: -21, z0: 20, x1: -15, z1: 25 },
        { x0: 2, z0: 20, x1: 8, z1: 25 },
      ],
    },
    caixotes: [
      { x: -9, z: 12, w: 2, d: 2, h: 1.6 },
      { x: -7, z: 12, w: 2, d: 2, h: 1.6 },
      { x: -9, z: 12, w: 2, d: 2, h: 3.2 },
      { x: 18, z: 12, w: 2, d: 2, h: 1.6 },
      { x: 20, z: 12, w: 2, d: 2, h: 1.6 },
      { x: 18, z: 12, w: 2, d: 2, h: 3.2 },
      { x: -3, z: 6, w: 2.4, d: 2.4, h: 2 },
      { x: 12, z: 22, w: 2.4, d: 2.4, h: 2 },
      { x: 30.5, z: 1, w: 1.6, d: 1.6, h: 1.6 },
    ],
    spawnsTime: [
      { x: 10, z: -24, yaw: 3.14 },
      { x: -26.5, z: 13, yaw: -2.6 },
    ],
    spawnsBots: [
      [-26, 12], [-10, 10], [-5, 20], [-13, 16], [12, -24], [16, 10], [10, 16], [30, 3],
    ],
  },
];
