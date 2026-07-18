import type * as THREE from 'three';
import type { config, MapDef, MapId } from '../../data/sugar-splash';

export type Cfg = typeof config;
export type { MapDef, MapId };
export type Fase = 'inicio' | 'jogando' | 'pausado' | 'fim' | 'entrada' | 'recordes';

export interface Estado {
  fase: Fase;
  modo: 'solo' | 'multi';
  nome: string;
  team: 0 | 1;
  pontos: number;
  kills: number;
  mortes: number;
  tempoRestanteS: number;
  respawnRestanteS: number;
  emContagem: boolean;
  placarAzul: number;
  placarVermelho: number;
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
  shake: number;
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
  passo(ts: number): void;
  build(id: string): void;
  mapa(): MapDef;
}

export interface Bots {
  vivos(): number;
  spawnInicial(): void;
  passo(dt: number, ts: number): void;
  atingir(idx: number, dano: number): void;
  colideJato(px: number, py: number, pz: number): number;
  limpar(): void;
  posicoes(): Array<{ x: number; y: number; z: number; hp: number }>;
}

export interface Agua {
  atirar(x: number, y: number, z: number, dx: number, dy: number, dz: number, doJogador: boolean): void;
  atirarCosmetico(x: number, y: number, z: number, dx: number, dy: number, dz: number): void;
  passo(dt: number): void;
  splash(x: number, y: number, z: number, grande: boolean): void;
  limpar(): void;
}

export type RoomEvent = Array<string | number>;

export interface RoomPlayer {
  nome: string;
  team: 0 | 1;
  x: number;
  y: number;
  z: number;
  yaw: number;
  atirando: boolean;
  derretido: boolean;
  kills: number;
  mortes: number;
}

export interface SyncPayload {
  fase: 'lobby' | 'contagem' | 'jogando' | 'fim';
  restanteMs: number;
  souHost: boolean;
  jogadores: RoomPlayer[];
  eventos: Array<Array<string | number>>;
  placar: { azul: number; vermelho: number };
  mapa?: string;
  votos?: { trocar: number; ficar: number };
}

export type RoomEntry = { codigo: string; nome: string; team: 0 | 1; mapa: string };

export interface Net {
  createRoom(nome: string, mapa: string): Promise<RoomEntry | { erro: string }>;
  joinRoom(codigo: string, nome: string): Promise<RoomEntry | { erro: string }>;
  startMatch(): void;
  reopenMatch(): void;
  vote(v: 'trocar' | 'ficar'): void;
  queueEvent(ev: RoomEvent): void;
  leave(): void;
  bind(handlers: { onSync: (r: SyncPayload) => void; onDrop: () => void }): void;
  active(): boolean;
  code(): string;
}

export interface RemotePlayers {
  update(lista: RoomPlayer[]): void;
  passo(dt: number, ts: number): void;
  hitTest(x: number, y: number, z: number): string | null;
  positionOf(nome: string): { x: number; y: number; z: number } | null;
  clear(): void;
}

export interface UI {
  els: Record<string, HTMLElement>;
  anunciar(msg: string): void;
  mostrarToast(html: string, tipo: 'ok' | 'info', ms?: number): void;
  atualizarHud(): void;
  mostrarBanner(titulo: string, sub?: string): void;
  flashDano(): void;
  mostrarPontos(texto: string, pos: { x: number; y: number; z: number }): void;
  mostrarRespawn(seg: number): void;
  esconderRespawn(): void;
}

export interface Audio {
  retomar(): void;
  suspender(): void;
  bindMute(btn: HTMLElement, icone: HTMLElement): void;
  somJato(): void;
  somSplash(): void;
  somHit(): void;
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
  setScoreboard(on: boolean): void;
}

export interface Contexto {
  cfg: Cfg;
  mapas: MapDef[];
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
  net: Net;
  remotos: RemotePlayers;
  ui: UI;
  audio: Audio;
  ranking: Ranking;
  fluxo: Fluxo;
}
