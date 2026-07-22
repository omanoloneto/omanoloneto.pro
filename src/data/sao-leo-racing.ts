export interface FisicaCarro {
  accel: number;
  topSpeed: number;
  reverseMax: number;
  brakeForce: number;
  coastDrag: number;
  steerRate: number;
  steerFalloff: number;
  gripRoad: number;
  gripDrift: number;
  driftSteerBoost: number;
  minSteerSpeed: number;
  driftThreshold: number;
}

export interface Carro {
  id: string;
  nome: string;
  cor: string;
  corCabine: string;
  neon: string;
  fisica: FisicaCarro;
}

export const carros: Carro[] = [
  {
    id: 'neon-gt',
    nome: 'Neon GT',
    cor: '#7a2ff0',
    corCabine: '#14091f',
    neon: '#00e5ff',
    fisica: {
      accel: 13,
      topSpeed: 46,
      reverseMax: 9,
      brakeForce: 30,
      coastDrag: 0.55,
      steerRate: 2.6,
      steerFalloff: 0.02,
      gripRoad: 6,
      gripDrift: 1.15,
      driftSteerBoost: 1.6,
      minSteerSpeed: 0.5,
      driftThreshold: 3.5,
    },
  },
];

export interface Rua {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  w: number;
  nome?: string;
}

export interface Marco {
  nome: string;
  x: number;
  z: number;
  emoji: string;
  predio?: { w: number; d: number; h: number; cor: string };
}

export const mapa = {
  nome: 'São Leopoldo',
  ruas: [
    { x1: 0, z1: -340, x2: 0, z2: 340, w: 16, nome: 'Rua Grande' },
    { x1: 120, z1: -160, x2: 120, z2: 340, w: 10 },
    { x1: -80, z1: -340, x2: -80, z2: 180, w: 10 },
    { x1: -240, z1: -340, x2: -240, z2: 180, w: 10 },
    { x1: 240, z1: -340, x2: 240, z2: 180, w: 10 },
    { x1: -300, z1: -320, x2: 300, z2: -320, w: 10 },
    { x1: -340, z1: -240, x2: 340, z2: -240, w: 10 },
    { x1: -340, z1: -160, x2: 340, z2: -160, w: 10 },
    { x1: -340, z1: -80, x2: 340, z2: -80, w: 14, nome: 'Av. João Corrêa' },
    { x1: -340, z1: 0, x2: 340, z2: 0, w: 10 },
    { x1: -340, z1: 100, x2: 340, z2: 100, w: 10, nome: 'Av. Mauá' },
    { x1: -340, z1: 180, x2: 340, z2: 180, w: 10 },
    { x1: -60, z1: 320, x2: 340, z2: 320, w: 12, nome: 'Av. Unisinos' },
  ] as Rua[],
  rio: { z1: 210, z2: 280, nome: 'Rio dos Sinos' },
  pontes: [
    { x: 0, w: 18 },
    { x: 120, w: 14 },
  ],
  trilho: { x: -160, w: 8, nome: 'Trensurb' },
  estacaoTrem: { x: -146, z: -80 },
  pracas: [{ x1: 16, z1: -72, x2: 72, z2: -8 }],
  marcos: [
    { nome: 'Rua Grande', x: 0, z: -40, emoji: '🛍️' },
    { nome: 'Prefeitura', x: -32, z: -18, emoji: '🏛️', predio: { w: 22, d: 14, h: 12, cor: '#caa84a' } },
    { nome: 'Praça do Imigrante', x: 44, z: -40, emoji: '🌳' },
    { nome: 'Estação Trensurb', x: -142, z: -80, emoji: '🚈', predio: { w: 24, d: 10, h: 8, cor: '#3f6fb0' } },
    { nome: 'Museu do Trem', x: -140, z: 40, emoji: '🚂', predio: { w: 20, d: 12, h: 9, cor: '#8a4a2f' } },
    { nome: 'Ponte 25 de Julho', x: 0, z: 245, emoji: '🌉' },
    { nome: 'Rio dos Sinos', x: -200, z: 245, emoji: '🐟' },
    { nome: 'Unisinos', x: 160, z: 344, emoji: '🎓', predio: { w: 60, d: 22, h: 14, cor: '#2f7fd0' } },
    { nome: 'Estádio do Aimoré', x: -285, z: -285, emoji: '⚽', predio: { w: 44, d: 30, h: 9, cor: '#b03030' } },
    { nome: 'Casa do Imigrante', x: -50, z: 145, emoji: '🏠', predio: { w: 14, d: 10, h: 7, cor: '#d8d4c0' } },
  ] as Marco[],
  spawn: { x: 0, z: 60, heading: Math.PI },
};

export const config = {
  mundo: { tamanho: 720, celula: 4 },
  camera: {
    fov: 60,
    dist: 9.5,
    altura: 4.4,
    lookAhead: 6.5,
    lookAltura: 1.4,
    fovKick: 13,
    lagK: 6.5,
  },
  colisao: { raio: 1.5, batidaFreio: 0.45, batidaCooldownMs: 450 },
  superficies: {
    rua: { dragMul: 1, gripMul: 1, topSpeedMul: 1 },
    grama: { dragMul: 3.4, gripMul: 1.3, topSpeedMul: 0.5 },
    trilho: { dragMul: 1.5, gripMul: 1, topSpeedMul: 0.8 },
  },
  hud: { marcoDist: 42 },
  cores: {
    ceu: '#05070f',
    neblina: '#070c1a',
    neblinaPerto: 70,
    neblinaLonge: 330,
    asfalto: '#1c202a',
    faixa: '#d8d8e4',
    grama: '#101c13',
    praca: '#152619',
    agua: '#0a2740',
    aguaBrilho: '#134a6b',
    trilho: '#241f1a',
    dormente: '#4a4036',
    deckPonte: '#2c323e',
    guardaPonte: '#4a5264',
    poste: '#3a3f4a',
    luzPoste: '#ffd9a0',
    poolLuz: '#2c3346',
    predios: ['#1d2230', '#242a3a', '#202638', '#2a2333', '#1f2c33'],
    janelas: ['#ffd23f', '#00e5ff', '#ff3fa4', '#9dff57', '#ffffff'],
    arvoreCopa: '#0e2213',
    arvoreTronco: '#2c2318',
    trem: '#e8e8ee',
    tremFrente: '#ffd23f',
  },
  somLigadoInicial: true,
};
