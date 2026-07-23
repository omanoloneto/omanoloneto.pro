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

export interface PecaAro {
  id: string;
  nome: string;
  spokes: number;
  spokeWidth: number;
  dish: number;
  rimColor: string;
  spokeColor: string;
}

export interface PecaAerofolio {
  id: string;
  nome: string;
  style: 'ducktail' | 'asa';
  span: number;
  chord: number;
  height: number;
  usePaint: boolean;
}

export interface PecasCarro {
  aro: string;
  aerofolio: string | null;
}

export const pecas = {
  aro: [
    { id: 'ferro', nome: 'Aço Estampado', spokes: 0, spokeWidth: 0, dish: 0.03, rimColor: '#8a8d94', spokeColor: '#8a8d94' },
    { id: 'estrela', nome: 'Estrela Cinco', spokes: 5, spokeWidth: 0.08, dish: 0.08, rimColor: '#d9dade', spokeColor: '#c6cad2' },
    { id: 'turbina', nome: 'Turbina', spokes: 11, spokeWidth: 0.032, dish: 0.1, rimColor: '#d8c37a', spokeColor: '#d8c37a' },
  ] as PecaAro[],
  aerofolio: [
    { id: 'ducktail', nome: 'Rabo de Pato', style: 'ducktail', span: 1.7, chord: 0.34, height: 0.12, usePaint: true },
    { id: 'asa-gt', nome: 'Asa GT', style: 'asa', span: 1.86, chord: 0.4, height: 0.34, usePaint: false },
  ] as PecaAerofolio[],
};

export interface Carro {
  id: string;
  nome: string;
  cor: string;
  corCabine: string;
  neon: string;
  pecas: PecasCarro;
  fisica: FisicaCarro;
}

export const carros: Carro[] = [
  {
    id: 'gts-81',
    nome: 'GTS 81',
    cor: '#c9b78c',
    corCabine: '#131118',
    neon: '#00e5ff',
    pecas: { aro: 'ferro', aerofolio: null },
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

export type ViaTipo = 'avenida' | 'rua' | 'br';

export interface Via {
  tipo: ViaTipo;
  nome?: string;
  pontos: [number, number][];
}

export interface Predio {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  cor: string;
}

export const mapa = {
  nome: 'São Leopoldo',
  vias: [
    { tipo: 'br', nome: 'BR-116', pontos: [[-410, -500], [-415, -282], [-428, -120], [-445, 40], [-455, 160], [-462, 282], [-465, 500]] },
    { tipo: 'avenida', nome: 'Av. João Corrêa', pontos: [[-440, -177], [-190, -177]] },
    { tipo: 'avenida', nome: 'Av. Dom João Becker', pontos: [[-190, -500], [-190, 60], [-215, 200], [-230, 282], [-235, 500]] },
    { tipo: 'avenida', nome: 'Av. Theodomiro Porto', pontos: [[-440, 105], [-195, 105]] },
    { tipo: 'avenida', nome: 'Av. Feitoria', pontos: [[-190, -125], [-16, -153], [145, -177], [306, -197], [459, -218]] },
    { tipo: 'avenida', nome: 'Av. Henrique Bier', pontos: [[459, -218], [419, -40], [306, -32], [209, -64], [113, -40], [24, 4], [-49, 36], [-190, 60]] },
    { tipo: 'avenida', nome: 'Av. Unisinos', pontos: [[-190, 60], [-65, 70], [15, 115], [62, 180], [85, 282], [95, 500]] },
    { tipo: 'avenida', nome: 'Av. Mauá', pontos: [[-330, 105], [-338, 282], [-340, 500]] },
    { tipo: 'rua', nome: 'R. São Joaquim', pontos: [[-379, -177], [-379, 105]] },
    { tipo: 'rua', nome: 'R. Independência', pontos: [[-343, -300], [-343, 105]] },
    { tipo: 'rua', nome: 'R. Primeiro de Março', pontos: [[-286, -300], [-286, 105]] },
    { tipo: 'rua', nome: 'R. José Bonifácio', pontos: [[-234, -177], [-234, 105]] },
    { tipo: 'rua', nome: 'R. Bento Gonçalves', pontos: [[-450, -133], [-190, -133]] },
    { tipo: 'rua', nome: 'R. Conceição', pontos: [[-450, -97], [-190, -97]] },
    { tipo: 'rua', nome: 'R. Lindolfo Collor', pontos: [[-450, -60], [-190, -60]] },
    { tipo: 'rua', nome: 'R. São Caetano', pontos: [[-450, -16], [0, -16]] },
    { tipo: 'rua', nome: 'R. Dr. Wolffenbuttel', pontos: [[-450, 36], [-190, 36]] },
    { tipo: 'rua', nome: 'R. Julio de Castilhos', pontos: [[0, -154], [0, 14]] },
    { tipo: 'rua', nome: 'R. Amadeo Rossi', pontos: [[230, -188], [248, -110], [210, -64]] },
  ] as Via[],
  predios: [] as Predio[],
  spawn: { x: -400, z: -171.75, heading: Math.PI / 2 },
};

export const config = {
  mundo: { tamanho: 1000, celula: 2.5 },
  ciclo: { diaS: 60, noiteS: 60, transicaoS: 7, claridadeDia: 2.6 },
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
  },
  vias: {
    amostraPasso: 2,
    gapMargem: 2.5,
    avenida: {
      pista: 7.5,
      canteiro: 3,
      guia: 0.35,
      alturaCanteiro: 0.2,
      faixaLen: 3,
      faixaLarg: 0.35,
      faixaPasso: 9,
      postePasso: 24,
      posteAltura: 5.2,
    },
    rua: {
      largura: 9,
      faixaLen: 3,
      faixaLarg: 0.35,
      faixaPasso: 9,
      postePasso: 26,
      posteAltura: 4.6,
    },
    br: {
      largura: 20,
      deckTopo: 7.4,
      deckEspessura: 0.5,
      mureta: { larg: 0.5, alt: 0.9 },
      pilarPasso: 28,
      pilarLarg: 1.4,
      pilarOffset: 6.5,
      vigaAltura: 0.6,
      faixaOffsets: [3.3, 6.4],
      postePasso: 32,
      posteAltura: 4.4,
    },
  },
  cores: {
    ceu: '#05070f',
    neblina: '#070c1a',
    neblinaPerto: 70,
    neblinaLonge: 330,
    ceuDia: '#7db8ec',
    neblinaDia: '#a9cbea',
    neblinaPertoDia: 150,
    neblinaLongeDia: 520,
    asfalto: '#1c202a',
    faixa: '#d8d8e4',
    faixaAmarela: '#e8c33f',
    grama: '#101c13',
    canteiro: '#17301c',
    guia: '#8d93a0',
    deckBR: '#333a48',
    muretaBR: '#565e6e',
    pilarBR: '#3d434f',
    poste: '#3a3f4a',
    luzPoste: '#ffd9a0',
    poolLuz: '#2c3346',
  },
  somLigadoInicial: true,
};
