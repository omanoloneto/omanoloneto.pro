export interface Bubble {
  letterId: string;
  lower: boolean;
  row: number;
  col: number;
  popT: number;
  shakeT: number;
  falling: boolean;
  fx: number;
  fy: number;
  vy: number;
}

export type Fase = 'intro' | 'jogando' | 'teclado' | 'nivelFeito' | 'vitoria' | 'derrota';

export interface Estado {
  fase: Fase;
  modo: 'arcade' | 'teclado';
  nivelIdx: number;
  pontos: number;
  combo: number;
  matches: number;
  shots: number;
  rodadaTeclado: number;
}

export interface FloatText {
  texto: string;
  x: number;
  y: number;
  t: number;
  cor: string;
}
