
export type RenderBloco = 'cubo' | 'cruz' | 'agua' | 'recorte' | 'porta';

export interface Bloco {
  id: number;
  nome: string;
  tiles: [number, number, number];
  solido: boolean;
  render: RenderBloco;
  drop?: number;
  dropSorte?: { id: number; chance: number };
  dureza?: number;
  durezaPicareta?: number;
  durezaFerro?: number;
  precisaPicareta?: boolean;
  ferramenta?: boolean;
  madeira?: boolean;
  icone?: string;
}

export const blocos: Bloco[] = [
  { id: 0, nome: 'ar', tiles: [0, 0, 0], solido: false, render: 'cubo' },
  { id: 1, nome: 'grama', tiles: [0, 1, 2], solido: true, render: 'cubo', drop: 2, dureza: 550 },
  { id: 2, nome: 'terra', tiles: [2, 2, 2], solido: true, render: 'cubo', dureza: 500 },
  { id: 3, nome: 'pedra', tiles: [3, 3, 3], solido: true, render: 'cubo', drop: 10, dureza: 1300, durezaPicareta: 400, durezaFerro: 150 },
  { id: 4, nome: 'areia', tiles: [4, 4, 4], solido: true, render: 'cubo', dureza: 450 },
  { id: 5, nome: 'tronco', tiles: [6, 5, 6], solido: true, render: 'cubo', dureza: 800, madeira: true },
  { id: 6, nome: 'tábuas', tiles: [7, 7, 7], solido: true, render: 'cubo', dureza: 800, icone: 'tabuas', madeira: true },
  { id: 7, nome: 'folhas', tiles: [8, 8, 8], solido: true, render: 'cubo', dropSorte: { id: 15, chance: 0.3 }, dureza: 300, madeira: true },
  { id: 8, nome: 'vidro', tiles: [9, 9, 9], solido: true, render: 'recorte', dureza: 350, icone: 'vidro' },
  { id: 9, nome: 'tijolos', tiles: [10, 10, 10], solido: true, render: 'cubo', dureza: 1400, durezaPicareta: 450, durezaFerro: 200 },
  { id: 10, nome: 'pedregulho', tiles: [11, 11, 11], solido: true, render: 'cubo', dureza: 1100, durezaPicareta: 350, durezaFerro: 150 },
  { id: 11, nome: 'flor amarela', tiles: [12, 12, 12], solido: false, render: 'cruz', dureza: 350 },
  { id: 12, nome: 'flor vermelha', tiles: [13, 13, 13], solido: false, render: 'cruz', dureza: 350 },
  { id: 13, nome: 'água', tiles: [14, 14, 14], solido: false, render: 'agua' },
  { id: 14, nome: 'rocha-mãe', tiles: [15, 15, 15], solido: true, render: 'cubo' },
  { id: 15, nome: 'muda de árvore', tiles: [16, 16, 16], solido: false, render: 'cruz', dureza: 350 },
  { id: 16, nome: 'folhas', tiles: [8, 8, 8], solido: true, render: 'cubo', drop: 7, dureza: 300, madeira: true },
  { id: 17, nome: 'baú', tiles: [20, 21, 21], solido: true, render: 'cubo', dureza: 800 },
  { id: 18, nome: 'porta', tiles: [22, 22, 22], solido: true, render: 'porta', dureza: 700 },
  { id: 19, nome: 'porta aberta', tiles: [23, 23, 23], solido: false, render: 'porta', drop: 18, dureza: 700 },
  { id: 20, nome: 'placa', tiles: [24, 24, 24], solido: false, render: 'cruz', dureza: 300 },
  { id: 21, nome: 'algodão-doce', tiles: [25, 25, 25], solido: false, render: 'cruz', drop: 21, dureza: 200, icone: 'algodao-doce' },
  { id: 22, nome: 'carvão', tiles: [26, 26, 26], solido: true, render: 'cubo', drop: 23, dureza: 600, durezaFerro: 250, precisaPicareta: true },
  { id: 23, nome: 'carvão', tiles: [27, 27, 27], solido: false, render: 'cruz' },
  { id: 24, nome: 'picareta de madeira', tiles: [28, 28, 28], solido: false, render: 'cruz', ferramenta: true, icone: 'picareta-madeira' },
  { id: 25, nome: 'minério de ferro', tiles: [29, 29, 29], solido: true, render: 'cubo', dureza: 900, durezaFerro: 350, precisaPicareta: true },
  { id: 26, nome: 'barra de ferro', tiles: [30, 30, 30], solido: false, render: 'cruz' },
  { id: 27, nome: 'fornalha', tiles: [3, 31, 3], solido: true, render: 'cubo', dureza: 1400, durezaPicareta: 450, durezaFerro: 200 },
  { id: 28, nome: 'picareta de ferro', tiles: [32, 32, 32], solido: false, render: 'cruz', ferramenta: true, icone: 'picareta-ferro' },
  { id: 29, nome: 'tijolos de pedra', tiles: [33, 33, 33], solido: true, render: 'cubo', dureza: 1400, durezaPicareta: 450, durezaFerro: 200 },
  { id: 30, nome: 'espada de madeira', tiles: [28, 28, 28], solido: false, render: 'cruz', ferramenta: true, icone: 'espada-madeira' },
  { id: 31, nome: 'espada de ferro', tiles: [32, 32, 32], solido: false, render: 'cruz', ferramenta: true, icone: 'espada-ferro' },
  { id: 32, nome: 'machado de madeira', tiles: [28, 28, 28], solido: false, render: 'cruz', ferramenta: true, icone: 'machado-madeira' },
  { id: 33, nome: 'machado de ferro', tiles: [32, 32, 32], solido: false, render: 'cruz', ferramenta: true, icone: 'machado-ferro' },
  { id: 34, nome: 'caixa de correio', tiles: [34, 34, 34], solido: false, render: 'cruz', dureza: 400 },
  { id: 35, nome: 'pacote', tiles: [35, 35, 35], solido: false, render: 'cruz' },
  { id: 36, nome: 'escada', tiles: [36, 36, 36], solido: false, render: 'recorte', dureza: 350, madeira: true },
];
export const itens = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 17, 18, 20, 24, 27, 28, 29, 30, 31, 32, 33, 34, 36];
export const materiais = [21, 23, 25, 26];
export interface Receita {
  de: number;
  qtd: number;
  para: number;
  ganha: number;
  de2?: number;
  qtd2?: number;
  fornalha?: boolean;
}
export const receitas: Receita[] = [
  { de: 5, qtd: 1, para: 6, ganha: 4 },
  { de: 10, qtd: 2, para: 9, ganha: 1 },
  { de: 10, qtd: 2, para: 29, ganha: 1 },
  { de: 2, qtd: 1, para: 1, ganha: 1 },
  { de: 6, qtd: 2, para: 17, ganha: 1 },
  { de: 6, qtd: 2, para: 18, ganha: 1 },
  { de: 6, qtd: 1, para: 20, ganha: 1 },
  { de: 6, qtd: 3, para: 24, ganha: 1 },
  { de: 10, qtd: 8, para: 27, ganha: 1 },
  { de: 4, qtd: 1, para: 8, ganha: 1, fornalha: true },
  { de: 10, qtd: 1, para: 3, ganha: 1, fornalha: true },
  { de: 25, qtd: 1, de2: 23, qtd2: 1, para: 26, ganha: 1, fornalha: true },
  { de: 26, qtd: 3, de2: 6, qtd2: 2, para: 28, ganha: 1, fornalha: true },
  { de: 6, qtd: 2, para: 30, ganha: 1 },
  { de: 6, qtd: 3, para: 32, ganha: 1 },
  { de: 6, qtd: 4, para: 34, ganha: 1 },
  { de: 6, qtd: 2, para: 36, ganha: 3 },
  { de: 26, qtd: 2, de2: 6, qtd2: 1, para: 31, ganha: 1, fornalha: true },
  { de: 26, qtd: 3, de2: 6, qtd2: 2, para: 33, ganha: 1, fornalha: true },
];

export const config = {
  mundo: {
    SX: 384,
    SZ: 384,
    SY: 80,
    CHUNK: 16,
    nivelAgua: 50,
    tetoConstrucao: 77,
  },
  geracao: {
    alturaBase: 52,
    amplitude: 6.5,
    escalaRuido: 0.035,
    ilhaInicioR: 0.68,
    ilhaQueda: 11,
    arvores: 880,
    flores: 2400,
    dungeon: { n: 3, salas: 7, carvaoPorSala: 10, ferroPorSala: 5 },
    veins: {
      coal: { n: 1400, sizeMin: 3, sizeMax: 6, yMin: 2 },
      iron: { n: 700, sizeMin: 2, sizeMax: 5, yMin: 2, yMax: 34 },
    },
  },
  fisica: {
    gravidade: 25,
    pulo: 8.2,
    andar: 4.3,
    coyoteMs: 100,
    aguaFator: 0.55,
    aguaGravidade: 8,
    aguaAfundaMax: 3,
    aguaNado: 3.6,
    aguaPuloBorda: 5.6,
    quedaTerminal: 20,
    subpassoMax: 0.45,
    escadaSobe: 4.2,
    escadaDesce: 1.6,
  },
  jogador: { largura: 0.6, altura: 1.8, olho: 1.62, alcance: 6 },
  crescimento: { minMs: 20000, maxMs: 40000 },
  fome: {
    max: 10,
    msPorPonto: 60000,
    msAteMorrer: 60000,
    fatorLento: 0.55,
    danoIntervaloMs: 2600,
    avisoPontos: 3,
    comida: 21,
    comeEm: 4,
    recupera: 3,
  },
  hotbarTamanho: 9,
  bichos: {
    quantos: 8,
    altura: 1.4,
    bobAmp: 0.18,
    bobHz: 0.5,
    passeio: 1.1,
    trocaAlvoMin: 3000,
    trocaAlvoMax: 7000,
    raioPasseio: 10,
    larguraDropMin: 22000,
    larguraDropMax: 38000,
    maxLaPerto: 5,
    woolDespawnMs: 60000,
  },
  kotsooh: {
    quantos: 3,
    velPasseio: 1.3,
    velCaca: 3.6,
    alturaVoo: 1.6,
    alcanceBatida: 1.2,
    empurrao: 7,
    pulinho: 4.5,
    cooldownBatidaMs: 2600,
    abrigoS: 1.5,
    desisteDist: 55,
    olharDistMax: 40,
    olharConeJogador: 0.978,
    olharConeFantasma: 0.42,
    encararS: 0.35,
    recuoS: 8,
    trocaAlvoMinMs: 4000,
    trocaAlvoMaxMs: 9000,
    passeioMin: 8,
    passeioMax: 20,
    uivoMinMs: 9000,
    uivoMaxMs: 16000,
  },
  decay: { atrasoMinMs: 400, atrasoMaxMs: 2900, chanceMuda: 0.15, alcanceTronco: 6 },
  salvar: {
    api: '/class/api/mundos.php',
    debounceMs: 12000,
    minEntreSavesMs: 5000,
    maxPayload: 4000000,
  },
  sala: {
    api: '/class/api/mb-salas.php',
    pollMs: 1200,
    jitterMs: 200,
    nudgeMs: 250,
    maxEdicoesPorSync: 200,
    maxMetasPorSync: 64,
    fotoACadaEdicoes: 400,
    fotoJournalMin: 200,
    fotoMetaMin: 300,
    fotoACadaMs: 90000,
    nomeMin: 2,
    nomeMax: 10,
  },
  codigo: { tam: 5, charset: 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' },
  camera: { fov: 75, sensibilidade: 0.0024, sensTouch: 0.0044 },
  somLigadoInicial: true,
};
