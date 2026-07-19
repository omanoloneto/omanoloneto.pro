export type LetterGroup = 'easy' | 'hard';
export type DifficultyId = 'easy' | 'medium' | 'hard';
export type ObjectiveKind = 'clear' | 'matches';

export interface LetterDef {
  id: string;
  group: LetterGroup;
  easyColor?: string;
}

export interface DifficultyDef {
  id: DifficultyId;
  nome: string;
  emoji: string;
  useColors: boolean;
  radius: number;
  cols: number;
  speed: number;
  guideBounces: number;
  descentEveryShots: number;
}

export interface LevelDef {
  difficulty: DifficultyId;
  letters: string[];
  rows: number;
  objective: ObjectiveKind;
  target?: number;
  clusterAdjacent?: boolean;
}

export const letters: LetterDef[] = [
  { id: 'C', group: 'easy', easyColor: '#F6C945' },
  { id: 'O', group: 'easy', easyColor: '#F26B5B' },
  { id: 'S', group: 'easy', easyColor: '#65C466' },
  { id: 'U', group: 'easy', easyColor: '#9B72CF' },
  { id: 'V', group: 'easy', easyColor: '#F39A3D' },
  { id: 'W', group: 'easy', easyColor: '#52C7D9' },
  { id: 'X', group: 'easy', easyColor: '#4D7FE8' },
  { id: 'Z', group: 'easy', easyColor: '#E879B7' },
  { id: 'A', group: 'hard' },
  { id: 'B', group: 'hard' },
  { id: 'D', group: 'hard' },
  { id: 'E', group: 'hard' },
  { id: 'F', group: 'hard' },
  { id: 'G', group: 'hard' },
  { id: 'H', group: 'hard' },
  { id: 'I', group: 'hard' },
  { id: 'J', group: 'hard' },
  { id: 'K', group: 'hard' },
  { id: 'L', group: 'hard' },
  { id: 'M', group: 'hard' },
  { id: 'N', group: 'hard' },
  { id: 'P', group: 'hard' },
  { id: 'Q', group: 'hard' },
  { id: 'R', group: 'hard' },
  { id: 'T', group: 'hard' },
  { id: 'Y', group: 'hard' },
];

export const difficulties: DifficultyDef[] = [
  { id: 'easy', nome: 'Fácil', emoji: '🎨', useColors: true, radius: 26, cols: 8, speed: 12, guideBounces: 2, descentEveryShots: 0 },
  { id: 'medium', nome: 'Médio', emoji: '⚪', useColors: false, radius: 22, cols: 10, speed: 14, guideBounces: 1, descentEveryShots: 8 },
  { id: 'hard', nome: 'Difícil', emoji: '🔤', useColors: false, radius: 19, cols: 11, speed: 16, guideBounces: 0, descentEveryShots: 6 },
];

export const levels: LevelDef[] = [
  { difficulty: 'easy', letters: ['C', 'O'], rows: 3, objective: 'clear' },
  { difficulty: 'easy', letters: ['C', 'O', 'X'], rows: 3, objective: 'clear' },
  { difficulty: 'easy', letters: ['C', 'O', 'X', 'S'], rows: 4, objective: 'clear' },
  { difficulty: 'easy', letters: ['U', 'V', 'W'], rows: 4, objective: 'clear' },
  { difficulty: 'easy', letters: ['C', 'O', 'S', 'U', 'V', 'W', 'X', 'Z'], rows: 4, objective: 'clear' },
  { difficulty: 'medium', letters: ['C', 'O', 'X', 'Z'], rows: 4, objective: 'clear' },
  { difficulty: 'medium', letters: ['S', 'U', 'V', 'W'], rows: 4, objective: 'clear' },
  { difficulty: 'medium', letters: ['C', 'O', 'S', 'U', 'V', 'W', 'X', 'Z'], rows: 5, objective: 'matches', target: 10 },
  { difficulty: 'medium', letters: ['C', 'O', 'S', 'U', 'V', 'W', 'X', 'Z'], rows: 5, objective: 'clear', clusterAdjacent: true },
  { difficulty: 'medium', letters: ['C', 'O', 'S', 'U', 'V', 'W', 'X', 'Z'], rows: 6, objective: 'clear', clusterAdjacent: true },
  { difficulty: 'hard', letters: ['A', 'E', 'G', 'R'], rows: 4, objective: 'clear' },
  { difficulty: 'hard', letters: ['B', 'D', 'H', 'L', 'T'], rows: 5, objective: 'clear' },
  { difficulty: 'hard', letters: ['B', 'D', 'P', 'Q'], rows: 5, objective: 'clear', clusterAdjacent: true },
  { difficulty: 'hard', letters: ['I', 'J', 'L', 'F', 'T'], rows: 5, objective: 'matches', target: 12 },
  { difficulty: 'hard', letters: ['A', 'B', 'D', 'E', 'G', 'I', 'L', 'M', 'N', 'P', 'Q', 'R'], rows: 6, objective: 'clear', clusterAdjacent: true },
];

export const keyboardRounds: Array<{ letters: string[]; rows: number }> = [
  { letters: ['C', 'O', 'S', 'U', 'V', 'W', 'X', 'Z'], rows: 3 },
  { letters: ['A', 'B', 'D', 'E', 'G', 'M', 'N', 'R'], rows: 4 },
  { letters: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'], rows: 5 },
];

export const scoring = {
  match: 100,
  comboStep: 25,
  comboMax: 200,
  bankShot: 25,
  cluster: 50,
} as const;

export const config = {
  canvasW: 480,
  canvasH: 640,
  launcherY: 596,
  dangerY: 520,
  neutralFill: '#f8f6f0',
  neutralBorder: '#2b3a55',
  letterInk: '#1d2b45',
  popMs: 320,
  shakeMs: 420,
  settleMs: 300,
  feedbackMs: 1300,
} as const;

export const temasBg = ['candy', 'ocean', 'wind', 'aurora', 'galaxy'] as const;
export type TemaBg = (typeof temasBg)[number];

export const juice = {
  popShards: 12,
  clusterExtra: 8,
  traumaMatch: 0.32,
  traumaCluster: 0.55,
  traumaMax: 1,
  traumaDecay: 2.6,
  shakeAmpl: 9,
  trailEveryMs: 16,
  confete: 46,
  festivePalette: ['#F6C945', '#F26B5B', '#65C466', '#9B72CF', '#52C7D9', '#4D7FE8', '#E879B7', '#F39A3D'],
} as const;

export const textos = {
  dicaErro: (id: string, lower: boolean) =>
    lower ? `Ache o ${id.toLowerCase()} minúsculo!` : `Ache o ${id} maiúsculo!`,
  feedbackMatch: (id: string) => `${id} = ${id.toLowerCase()}`,
  derrota: (pares: number) =>
    pares === 1 ? 'Vamos tentar de novo! Você combinou 1 par.' : `Vamos tentar de novo! Você combinou ${pares} pares.`,
  objetivoClear: 'Limpe todas as bolhas!',
  objetivoMatches: (n: number) => `Combine ${n} pares!`,
  objetivoTeclado: 'Aperte a tecla da letra que pisca!',
  resumoBom: 'Reconhece bem',
  resumoPraticar: 'Precisa praticar mais',
} as const;
