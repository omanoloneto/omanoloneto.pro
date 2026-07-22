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
    { x1: -120, z1: -340, x2: -120, z2: 180, w: 10, nome: 'R. São Joaquim' },
    { x1: -60, z1: -340, x2: -60, z2: 340, w: 14, nome: 'R. Independência' },
    { x1: 0, z1: -340, x2: 0, z2: 180, w: 10, nome: 'R. Primeiro de Março' },
    { x1: 60, z1: -300, x2: 60, z2: 180, w: 10, nome: 'R. José Bonifácio' },
    { x1: -200, z1: -340, x2: -200, z2: 180, w: 10, nome: 'R. Saldanha da Gama' },
    { x1: -290, z1: -340, x2: -290, z2: 180, w: 10, nome: 'Av. Theodomiro Porto' },
    { x1: 240, z1: -340, x2: 240, z2: 340, w: 10, nome: 'R. Julio de Castilhos' },
    { x1: -340, z1: -280, x2: 200, z2: -280, w: 10, nome: 'R. Bento Gonçalves' },
    { x1: -340, z1: -200, x2: 320, z2: -200, w: 10, nome: 'R. Conceição' },
    { x1: -340, z1: -120, x2: 320, z2: -120, w: 10, nome: 'R. Lindolfo Collor' },
    { x1: -340, z1: -50, x2: 60, z2: -50, w: 10, nome: 'R. São Caetano' },
    { x1: -360, z1: 60, x2: 100, z2: 20, w: 14, nome: 'Av. João Corrêa' },
    { x1: 100, z1: 20, x2: 360, z2: -60, w: 14, nome: 'Av. João Corrêa' },
    { x1: -340, z1: 120, x2: 220, z2: 120, w: 10, nome: 'R. Dr. Wolffenbuttel' },
    { x1: -340, z1: 180, x2: 240, z2: 180, w: 10, nome: 'Av. Beira-Rio' },
    { x1: -60, z1: 330, x2: 340, z2: 330, w: 12, nome: 'Av. Unisinos' },
    { x1: 130, z1: -340, x2: 96, z2: 40, w: 10, nome: 'Av. Mauá' },
  ] as Rua[],
  rio: {
    nome: 'Rio dos Sinos',
    zCentro: 252,
    onda1: { amp: 20, freq: 95, fase: 0 },
    onda2: { amp: 11, freq: 43, fase: 2 },
    meia: 28,
    meiaOnda: { amp: 5, freq: 61, fase: 1 },
  },
  pontes: [
    { x: -60, w: 18 },
    { x: 240, w: 14 },
  ],
  trilho: { x1: 142, z1: -360, x2: 78, z2: 360, w: 8, nome: 'Trensurb' },
  estacaoTrem: { x: 104, z: 8 },
  pracas: [
    { x1: 8, z1: -44, x2: 52, z2: -4 },
    { x1: -114, z1: -114, x2: -70, z2: -58 },
  ],
  marcos: [
    { nome: 'Rua Grande', x: -60, z: -160, emoji: '🛍️' },
    { nome: 'Prefeitura', x: -92, z: -30, emoji: '🏛️', predio: { w: 22, d: 14, h: 12, cor: '#caa84a' } },
    { nome: 'Praça do Imigrante', x: 30, z: -24, emoji: '🌳' },
    { nome: 'Shopping São Léo', x: -28, z: -160, emoji: '🏬', predio: { w: 38, d: 30, h: 16, cor: '#5a3f8f' } },
    { nome: 'Estação Trensurb', x: 118, z: 14, emoji: '🚈', predio: { w: 10, d: 26, h: 8, cor: '#3f6fb0' } },
    { nome: 'Museu do Trem', x: 112, z: -70, emoji: '🚂', predio: { w: 12, d: 20, h: 9, cor: '#8a4a2f' } },
    { nome: 'Ginásio Municipal', x: 180, z: -260, emoji: '🏀', predio: { w: 30, d: 22, h: 10, cor: '#2f8a5a' } },
    { nome: 'Ponte 25 de Julho', x: -60, z: 252, emoji: '🌉' },
    { nome: 'Rio dos Sinos', x: -250, z: 250, emoji: '🐟' },
    { nome: 'Unisinos', x: 120, z: 348, emoji: '🎓', predio: { w: 60, d: 22, h: 14, cor: '#2f7fd0' } },
    { nome: 'Estádio do Aimoré', x: -300, z: -300, emoji: '⚽', predio: { w: 44, d: 30, h: 9, cor: '#b03030' } },
    { nome: 'Casa do Imigrante', x: -160, z: 146, emoji: '🏠', predio: { w: 14, d: 10, h: 7, cor: '#d8d4c0' } },
  ] as Marco[],
  centro: { x1: -240, z1: -300, x2: 100, z2: 60 },
  spawn: { x: -60, z: -40, heading: Math.PI },
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
    casas: ['#2a2622', '#2e2824', '#262a2c', '#2c2230', '#322a24'],
    telhado: '#3a2a24',
    janelaCasa: '#ffca6a',
    arvoreCopa: '#0e2213',
    arvoreTronco: '#2c2318',
    trem: '#e8e8ee',
    tremFrente: '#ffd23f',
  },
  somLigadoInicial: true,
};
