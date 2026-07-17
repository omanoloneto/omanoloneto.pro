import type { config, fase1, tiposLixo } from '../../data/eco-hero';

export type Cfg = typeof config;
export type Fase = 'inicio' | 'jogando' | 'pausado' | 'vitoria' | 'fim' | 'entrada' | 'recordes';

export interface Estado {
  fase: Fase;
  pontos: number;
  vidas: number;
  coletados: number;
  totalLixos: number;
  tempoMs: number;
  checkpoint: boolean;
  mudo: boolean;
  lixeiraAberta: boolean;
}

export interface Heroi {
  x: number;
  y: number;
  vx: number;
  vy: number;
  noChao: boolean;
  olhando: 1 | -1;
  ultimoChaoMs: number;
  puloPedidoMs: number;
  invencivelAte: number;
  morrendo: boolean;
}

export interface Input {
  esq: boolean;
  dir: boolean;
  pulo: boolean;
  puloSegurado: boolean;
}

export interface Caranguejo {
  x: number;
  y: number;
  vx: number;
  escondido: boolean;
}

export interface Lixo {
  x: number;
  y: number;
  tipo: string;
  coletado: boolean;
}

export interface Nivel {
  largura: number;
  solidoEm(tx: number, ty: number): boolean;
  lodoEm(tx: number, ty: number): boolean;
  aguaEm(tx: number, ty: number): boolean;
  lixos: Lixo[];
  caranguejos: Caranguejo[];
  lixeira: { x: number; y: number };
  checkpointX: number;
  spawn: { x: number; y: number };
  decoracoes: Array<{ tipo: string; x: number; y: number }>;
}

export interface UI {
  els: Record<string, HTMLElement>;
  anunciar(msg: string): void;
  mostrarToast(html: string, ms?: number): void;
  atualizarHud(): void;
  flashDano(): void;
}

export interface Audio {
  retomar(): void;
  suspender(): void;
  bindMute(btn: HTMLElement, icone: HTMLElement): void;
  somPulo(): void;
  somColeta(): void;
  somStomp(): void;
  somDano(): void;
  somMorte(): void;
  somCheckpoint(): void;
  somLixeira(): void;
  somVitoria(): void;
}

export interface Ranking {
  abrirEntrada(): void;
  abrirRecordes(consulta: boolean): void;
  digitarLetra(l: string): void;
  apagarLetra(): void;
  confirmarEntrada(): void;
}

export interface Fluxo {
  comecar(): void;
  pausar(): void;
  continuarJogo(): void;
  vitoria(): void;
  fimDeJogo(): void;
  reiniciar(): void;
  perderVida(): void;
}

export interface Contexto {
  cfg: Cfg;
  fase1: typeof fase1;
  tiposLixo: typeof tiposLixo;
  motionReduzido: boolean;
  canvas: HTMLCanvasElement;
  g: CanvasRenderingContext2D;
  estado: Estado;
  heroi: Heroi;
  input: Input;
  nivel: Nivel;
  sprites: Record<string, HTMLCanvasElement | HTMLCanvasElement[]>;
  ui: UI;
  audio: Audio;
  ranking: Ranking;
  fluxo: Fluxo;
}
