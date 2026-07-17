import type { config, especies, mapas, tiles } from '../../data/wildmon';

export type Cfg = typeof config;
export type Dir = 0 | 1 | 2 | 3;
export type Fase = 'intro' | 'jogando' | 'dialogo';

export interface Jogador {
  x: number;
  y: number;
  px: number;
  py: number;
  dir: Dir;
  andando: boolean;
  progresso: number;
  trilha: Array<{ x: number; y: number; dir: Dir }>;
}

export interface Estado {
  fase: Fase;
  nome: string;
  starter: 'dog' | 'cat';
  mapa: string;
  mudo: boolean;
  online: number;
}

export interface Input {
  dx: number;
  dy: number;
  a: boolean;
}

export interface Overworld {
  passo(dt: number): void;
  desenhar(ts: number): void;
  interagir(): void;
  solido(x: number, y: number): boolean;
  trocarMapa(id: string, x: number, y: number): void;
}

export interface Rede {
  entrar(nome: string, skin: string): Promise<string | null>;
  remotos(): JogadorRemoto[];
  flushSair(): void;
  ligado(): boolean;
}

export interface JogadorRemoto {
  nome: string;
  skin: string;
  mapa: string;
  x: number;
  y: number;
  ax: number;
  ay: number;
  dir: Dir;
  andando: boolean;
}

export interface UI {
  els: Record<string, HTMLElement>;
  abrirDialogo(falas: string[]): void;
  avancarDialogo(): boolean;
  dialogoAberto(): boolean;
  passoDialogo(ts: number): void;
  anunciar(msg: string): void;
  mostrarToast(html: string, ms?: number): void;
  atualizarOnline(n: number): void;
}

export interface Audio {
  retomar(): void;
  bindMute(btn: HTMLElement, icone: HTMLElement): void;
  somPasso(): void;
  somBlip(): void;
  somConfirma(): void;
  jingleEscolha(): void;
}

export interface Salvar {
  carregar(): { nome: string; starter: 'dog' | 'cat'; mapa: string; x: number; y: number } | null;
  gravar(): void;
  nomeGuardado(): string;
}

export interface Contexto {
  cfg: Cfg;
  especies: typeof especies;
  mapas: typeof mapas;
  tiles: typeof tiles;
  motionReduzido: boolean;
  canvas: HTMLCanvasElement;
  g: CanvasRenderingContext2D;
  estado: Estado;
  jogador: Jogador;
  input: Input;
  sprites: Record<string, HTMLCanvasElement | HTMLCanvasElement[]>;
  ui: UI;
  audio: Audio;
  overworld: Overworld;
  rede: Rede;
  salvar: Salvar;
}
