import type * as THREE from 'three';
import type { config, times, Crianca } from '../../data/futsal-poderes';
import type { Stage3D } from '../../lib/stage3d';

export type Cfg = typeof config;
export type Fase = 'inicio' | 'jogando' | 'pausado' | 'gol' | 'fim' | 'entrada' | 'recordes';

export interface Input {
  cima: boolean;
  baixo: boolean;
  esq: boolean;
  dir: boolean;
  eixoX: number;
  eixoZ: number;
  chutar: boolean;
  chutarSeg: number;
  correr: boolean;
  poder: boolean;
}

export interface Jogador {
  crianca: Crianca;
  time: number;
  goleiro: boolean;
  x: number;
  z: number;
  vx: number;
  vz: number;
  olhar: number;
  passo: number;
  energia: number;
  dribleAte: number;
  baseX: number;
  baseZ: number;
  grupo: THREE.Group;
  pernaE: THREE.Object3D;
  pernaD: THREE.Object3D;
  aura: THREE.Mesh;
}

export interface Bola {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  dono: Jogador | null;
  ultimoDono: Jogador | null;
  especial: number;
  corEspecial: THREE.Color;
  mesh: THREE.Mesh;
  sombra: THREE.Mesh;
}

export interface Estado {
  fase: Fase;
  mudo: boolean;
  placar: [number, number];
  tempoS: number;
  ativo: Jogador | null;
  ladoJogador: number;
  golDe: number;
  golAte: number;
  seed: number;
}

export interface Mundo {
  jogadores: Jogador[];
  bola: Bola;
  golLinhaX: number;
  passoAnim(dt: number): void;
  soltarTrail(x: number, z: number, cor: THREE.Color): void;
  passoTrail(dt: number): void;
}

export interface UI {
  els: Record<string, HTMLElement>;
  setPlacar(a: number, b: number): void;
  setTempo(s: number): void;
  setPoder(pct: number, nome: string, cor: string): void;
  toast(msg: string): void;
  anunciar(msg: string): void;
}

export interface Audio {
  init(): void;
  retomar(): void;
  suspender(): void;
  bindMute(btn: HTMLElement, icon: HTMLElement): void;
  apito(longo?: boolean): void;
  chute(forte?: boolean): void;
  gol(): void;
  poder(): void;
  quique(): void;
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
  continuar(): void;
  reiniciar(): void;
  fim(): void;
}

export interface CameraPES {
  passo(dt: number): void;
  reset(): void;
}

export interface Motor {
  passo(dt: number): void;
  posicionar(sacaTime: number): void;
}

export interface Ctx {
  cfg: Cfg;
  dados: typeof times;
  stage: Stage3D;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  cena: HTMLElement;
  input: Input;
  estado: Estado;
  mundo: Mundo;
  cameraPES: CameraPES;
  motor: Motor;
  ui: UI;
  audio: Audio;
  ranking: Ranking;
  fluxo: Fluxo;
  rng: () => number;
}
