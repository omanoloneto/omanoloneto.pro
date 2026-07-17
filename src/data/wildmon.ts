export type TipoBicho = 'farm' | 'forest' | 'water' | 'sky';

export type Especie = {
  id: string;
  nome: string;
  traducao: string;
  tipo: TipoBicho;
  sprite: boolean;
};

export const especies: Especie[] = [
  { id: 'dog', nome: 'Dog', traducao: 'cachorro', tipo: 'farm', sprite: true },
  { id: 'cat', nome: 'Cat', traducao: 'gato', tipo: 'farm', sprite: true },
  { id: 'pig', nome: 'Pig', traducao: 'porco', tipo: 'farm', sprite: false },
  { id: 'cow', nome: 'Cow', traducao: 'vaca', tipo: 'farm', sprite: false },
  { id: 'fox', nome: 'Fox', traducao: 'raposa', tipo: 'forest', sprite: true },
  { id: 'bear', nome: 'Bear', traducao: 'urso', tipo: 'forest', sprite: false },
  { id: 'owl', nome: 'Owl', traducao: 'coruja', tipo: 'forest', sprite: true },
  { id: 'snake', nome: 'Snake', traducao: 'cobra', tipo: 'forest', sprite: false },
  { id: 'fish', nome: 'Fish', traducao: 'peixe', tipo: 'water', sprite: false },
  { id: 'frog', nome: 'Frog', traducao: 'sapo', tipo: 'water', sprite: false },
  { id: 'duck', nome: 'Duck', traducao: 'pato', tipo: 'water', sprite: false },
  { id: 'turtle', nome: 'Turtle', traducao: 'tartaruga', tipo: 'water', sprite: false },
  { id: 'bird', nome: 'Bird', traducao: 'pássaro', tipo: 'sky', sprite: true },
  { id: 'bee', nome: 'Bee', traducao: 'abelha', tipo: 'sky', sprite: false },
  { id: 'bat', nome: 'Bat', traducao: 'morcego', tipo: 'sky', sprite: false },
  { id: 'butterfly', nome: 'Butterfly', traducao: 'borboleta', tipo: 'sky', sprite: true },
];

export const mapaVila: string[] = [
  '###############..#################',
  '#,,,,,,,,##,,,,.,,,,,##,,,,,,,,,##',
  '#,,,,,,,,##,,,,,,,,,,##,,,,,,,,,##',
  '#..f......................f.....##',
  '#..llll...rrrr........rrrr.......#',
  '#..llll...rrrr........rrrr..f....#',
  '#..wwww...wdww........wdww.......#',
  '#..wdww...:..:........:..:...f...#',
  '#..:......:..:........:..:.......#',
  '#..:......:..::::::::::..:.......#',
  '#f.::::::::::::::::::::::::::::..#',
  '#..:..hh..f...:......:...f.hh.:..#',
  '#..:..........:..FF..:........:..#',
  '#..:...f......:..FF..:....f...:..#',
  '#..:..........:......:........:..#',
  '#..::::::::::::::::::::::::::::..#',
  '#..:..hh.f........:..hh.f.....:..#',
  '#..rrrr...pppp....:...~~~~~...:..#',
  '#..rrrr...pppp....:..~~~~~~~..:..#',
  '#..wdww...wdww....:..~~~~~~~..#..#',
  '#..:......:.......:...~~~~~...#..#',
  '#..:......:.......:...........#..#',
  '#f.::::::::::::::::......f....#..#',
  '#.........f..........f........#..#',
  '#..............................f.#',
  '##################################',
];

export const tiles: Record<string, { sprite: string; solido: boolean }> = {
  '#': { sprite: 'arvore', solido: true },
  '.': { sprite: 'grama', solido: false },
  ',': { sprite: 'matinho', solido: false },
  ':': { sprite: 'caminho', solido: false },
  '~': { sprite: 'agua', solido: true },
  'f': { sprite: 'flor', solido: false },
  'F': { sprite: 'fonte', solido: true },
  'h': { sprite: 'arbusto', solido: true },
  'r': { sprite: 'telhado', solido: true },
  'l': { sprite: 'telhadoLab', solido: true },
  'p': { sprite: 'telhadoPosto', solido: true },
  'w': { sprite: 'parede', solido: true },
  'd': { sprite: 'porta', solido: true },
};

export type Npc = {
  id: string;
  x: number;
  y: number;
  sprite: 'professora' | 'morador' | 'crianca' | 'placa';
  falas: string[];
};

export const npcs: Npc[] = [
  {
    id: 'professora', x: 4, y: 8, sprite: 'professora',
    falas: [
      'Oi! Eu sou a professora do laboratório.',
      'Seu bichinho tem nome em inglês — DOG é cachorro e CAT é gato!',
      'Em breve a mata ao norte vai estar cheia de bichos novos pra você conhecer…',
    ],
  },
  {
    id: 'morador', x: 17, y: 11, sprite: 'morador',
    falas: [
      'Bem-vindo à vila do Wildmon!',
      'Viu a fonte da praça? Dizem que ela dá sorte.',
    ],
  },
  {
    id: 'crianca', x: 24, y: 21, sprite: 'crianca',
    falas: [
      'Eu queria um FISH de estimação… fish é peixe em inglês!',
      'Não pode nadar no lago, tá?',
    ],
  },
  {
    id: 'placa-posto', x: 12, y: 20, sprite: 'placa',
    falas: ['🏥 Posto Wildmon — EM BREVE!'],
  },
];

export const config = {
  tile: 16,
  viewW: 240,
  viewH: 160,
  escala: 3,
  passoMs: 220,
  spawn: { x: 16, y: 13 },
  dialogoMsPorLetra: 28,
  nomeMin: 2,
  nomeMax: 10,
  rede: {
    api: '/class/api/wm-mundo.php',
    pollMs: 1200,
    jitterMs: 200,
  },
} as const;

export const mapaRota1: string[] = [
  '##################################',
  '#######,,,,,#########,,,,,,#######',
  '######,,,,,,,#######,,,,,,,,######',
  '######,,:::,,,,###,,,,:::,,,######',
  '#######,:f:,,,,,,,,,,,:f:,,#######',
  '#######,::::::::::::::::,,########',
  '########,,,,,,,::,,,,,,,,#########',
  '#########,,f,,,::,,,f,,###########',
  '########,,,,,,,::,,,,,,,##########',
  '######,,,,###,,::,,###,,,,########',
  '#####,,,,#####,::,#####,,,,#######',
  '#####,,f,#####,::,#####,,f,#######',
  '#####,,,,,###,,::,,###,,,,,#######',
  '######,,,,,,,,,::,,,,,,,,,########',
  '#######,,,,,,,::,,,,,,,,,#########',
  '########f,,,,,::,,,,,f,,##########',
  '########,,,,,::,,,,,,,,###########',
  '#######,,,,,,::,,,,,,,,,##########',
  '######,,,::::::,,,,,,,,,,#########',
  '######,,,:,,,,,,,,,,f,,,,#########',
  '######,,,:,,,,,,,,,,,,,,##########',
  '#######,,::::,,,,,,,,,############',
  '########,,,,:,,,,f,,,,############',
  '#########,,,::,,,,,,##############',
  '##########,,,:,,,,################',
  '##########,,,:,,,,################',
  '#########,,,,:,,,,,###############',
  '#########,,,,:,,,,,###############',
  '##########,,,:,,,#################',
  '#############..###################',
];

export const npcsRota1: Npc[] = [
  {
    id: 'placa-rota2', x: 16, y: 1, sprite: 'placa',
    falas: ['🌲 Rota 2 — EM BREVE! A mata continua…'],
  },
  {
    id: 'guarda', x: 12, y: 4, sprite: 'morador',
    falas: [
      'Bem-vindo à Rota 1! Os bichos daqui são mansos.',
      'Chega devagarinho perto deles pra ver o nome em inglês!',
    ],
  },
];

export type Selvagem = { especie: string; x: number; y: number; raio: number };

export const mapas: Record<string, { mapa: string[]; npcs: Npc[]; selvagens: Selvagem[]; saidas: Array<{ x: number; y: number; para: string; px: number; py: number }> }> = {
  vila: {
    mapa: mapaVila,
    npcs,
    selvagens: [],
    saidas: [
      { x: 15, y: 0, para: 'rota1', px: 13, py: 28 },
      { x: 16, y: 0, para: 'rota1', px: 14, py: 28 },
    ],
  },
  rota1: {
    mapa: mapaRota1,
    npcs: npcsRota1,
    selvagens: [
      { especie: 'fox', x: 8, y: 10, raio: 2 },
      { especie: 'fox', x: 21, y: 19, raio: 3 },
      { especie: 'owl', x: 24, y: 11, raio: 2 },
      { especie: 'bird', x: 10, y: 3, raio: 3 },
      { especie: 'bird', x: 17, y: 15, raio: 3 },
      { especie: 'butterfly', x: 23, y: 3, raio: 3 },
      { especie: 'butterfly', x: 15, y: 22, raio: 3 },
    ],
    saidas: [
      { x: 13, y: 29, para: 'vila', px: 15, py: 1 },
      { x: 14, y: 29, para: 'vila', px: 16, py: 1 },
    ],
  },
};
