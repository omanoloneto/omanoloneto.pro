import type * as THREE from 'three';
import type { config, caixotes, spawnsBots, spawnJogador } from '../../data/sugar-splash';

export type Cfg = typeof config;
export type Fase = 'inicio' | 'jogando' | 'pausado' | 'fim' | 'entrada' | 'recordes';

export interface Estado {
  fase: Fase;
  pontos: number;
  onda: number;
  vidas: number;
  solidez: number;
  tanque: number;
  mudo: boolean;
  ultimoDanoMs: number;
  derretendo: boolean;
}

export interface Jogador {
  x: number;
  y: number;
  z: number;
  vy: number;
  yaw: number;
  pitch: number;
  noChao: boolean;
  naPiscina: boolean;
}

export interface Input {
  frente: boolean;
  tras: boolean;
  esq: boolean;
  dir: boolean;
  pulo: boolean;
  atirando: boolean;
  joyX: number;
  joyY: number;
}

export interface Arena {
  aabbs: Array<{ minX: number; maxX: number; minZ: number; maxZ: number; alt: number }>;
  chaoEm(x: number, z: number): number;
  dentroPiscina(x: number, z: number): boolean;
}

export interface Bots {
  vivos(): number;
  spawnOnda(onda: number): void;
  passo(dt: number, ts: number): void;
  atingir(idx: number, dano: number): void;
  colideJato(px: number, py: number, pz: number): number;
  limpar(): void;
  posicoes(): Array<{ x: number; y: number; z: number; hp: number }>;
}

export interface Agua {
  atirar(x: number, y: number, z: number, dx: number, dy: number, dz: number, doJogador: boolean): void;
  passo(dt: number): void;
  splash(x: number, y: number, z: number, grande: boolean): void;
  limpar(): void;
}

export interface UI {
  els: Record<string, HTMLElement>;
  anunciar(msg: string): void;
  mostrarToast(html: string, tipo: 'ok' | 'info', ms?: number): void;
  atualizarHud(): void;
  mostrarBanner(titulo: string, sub?: string): void;
  flashDano(): void;
}

export interface Audio {
  retomar(): void;
  suspender(): void;
  bindMute(btn: HTMLElement, icone: HTMLElement): void;
  somJato(): void;
  somSplash(): void;
  somDerreter(): void;
  somDano(): void;
  somOnda(): void;
  somFim(): void;
  somRecarga(): void;
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
  fimDeJogo(): void;
  reiniciar(): void;
  medir(): void;
  soltarInputs(): void;
}

export interface Contexto {
  cfg: Cfg;
  caixotes: typeof caixotes;
  spawnsBots: typeof spawnsBots;
  spawnJogador: typeof spawnJogador;
  motionReduzido: boolean;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  cenaEl: HTMLElement;
  estado: Estado;
  jogador: Jogador;
  input: Input;
  arena: Arena;
  bots: Bots;
  agua: Agua;
  ui: UI;
  audio: Audio;
  ranking: Ranking;
  fluxo: Fluxo;
}
