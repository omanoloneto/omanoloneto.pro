// Tipos compartilhados do MineBlocks.
// O Contexto é o único "fio" entre os módulos: main.ts monta e todos leem.
import type * as THREE from 'three';
import type { blocos, hotbar, config, receitas, Bloco } from '../../data/mineblocks';

export type Cfg = typeof config;

export type Fase = 'inicio' | 'gerando' | 'jogando' | 'pausado';

export interface Estado {
  fase: Fase;
  mudo: boolean;
  seed: number;
  sel: number; // índice selecionado na hotbar (0..11)
  modoColocar: boolean; // touch: ⛏️ quebrar × 🧱 colocar
  primeiroInput: boolean;
  // sobrevivência: contagem de itens por id de bloco — colocar consome,
  // quebrar devolve (o drop do bloco)
  inventario: number[];
}

export interface Jogador {
  x: number;
  y: number; // pé
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  pitch: number;
  noChao: boolean;
  naAgua: boolean;
  coyoteMs: number;
}

export interface Input {
  frente: boolean;
  tras: boolean;
  esq: boolean;
  dir: boolean;
  pulo: boolean;
  // joystick touch analógico (-1..1); teclado escreve 0/±1 nos digitais acima
  joyX: number;
  joyY: number;
}

export interface Alvo {
  x: number;
  y: number;
  z: number;
  nx: number;
  ny: number;
  nz: number;
  id: number;
}

export interface Audio {
  init(): void;
  retomar(): void;
  suspender(): void;
  bindMute(btn: HTMLElement, icone: HTMLElement): void;
  somQuebrar(id: number): void;
  somColocar(): void;
  somPulo(): void;
  somSplash(): void;
  somUI(): void;
  somSalvo(): void;
  somErro(): void;
}

export interface Textura {
  atlas: THREE.CanvasTexture;
  // [u0, v0, u1, v1] do tile no atlas (com inset anti-bleeding)
  uv(tile: number): [number, number, number, number];
  dataURL: string; // pro CSS da hotbar
}

export interface Mundo {
  dados: Uint8Array;
  obter(x: number, y: number, z: number): number;
  definir(x: number, y: number, z: number, id: number): void;
  sujos: Set<number>; // índices de chunk (cx + cz*NCX)
  chaoMaisAlto(x: number, z: number): number; // y do bloco sólido mais alto
  limpar(): void;
}

export interface Malha {
  construirTudo(): void;
  reconstruirSujos(): void;
}

export interface Fisica {
  passo(dt: number): void;
  assentar(): void; // põe o jogador em pé no chão do spawn
}

export interface Camera3 {
  passo(): void;
}

export interface Mira {
  alvo(): Alvo | null;
  passo(): void; // reposiciona o wireframe de highlight
}

export interface Edicao {
  quebrar(): boolean;
  colocar(): boolean;
  executarModo(): void; // touch: quebra ou coloca conforme o modo
}

export interface Salvar {
  criarMundo(nome: string, senha: string): Promise<string | null>; // null=ok, string=erro
  carregarMundo(nome: string, senha: string): Promise<string | null>;
  salvarAgora(motivo?: 'auto' | 'manual' | 'flush'): Promise<boolean>;
  agendar(): void;
  temMundo(): boolean;
  nomeMundo(): string;
  sujo(): boolean;
}

export interface UI {
  els: Record<string, HTMLElement>;
  anunciar(msg: string): void;
  mostrarToast(html: string, tipo: 'ok' | 'info' | 'err', ms?: number): void;
  montarHotbar(): void;
  selecionarSlot(i: number, anunciar: boolean): void;
  atualizarContagens(): void;
  montarCraft(): void;
  alternarCraft(abrir?: boolean): void;
  atualizarModo(): void;
  mostrarSalvando(estado: 'salvando' | 'salvo' | 'erro' | 'nada'): void;
}

export interface Fluxo {
  entrarNoMundo(): void;
  pausar(): void;
  continuarJogo(): void;
  sairDoMundo(): Promise<void>;
  medir(): void;
  soltarInputs(): void;
  aoPrimeiroInput(): void;
}

export interface Contexto {
  blocos: typeof blocos;
  hotbar: typeof hotbar;
  receitas: typeof receitas;
  cfg: Cfg;
  porId: (id: number) => Bloco;
  motionReduzido: boolean;
  // núcleo three
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  cenaEl: HTMLElement;
  tierBaixo: boolean;
  // estado vivo
  estado: Estado;
  jogador: Jogador;
  input: Input;
  // subsistemas (preenchidos pelo main na ordem de criação)
  ui: UI;
  audio: Audio;
  textura: Textura;
  mundo: Mundo;
  malha: Malha;
  fisica: Fisica;
  camera3: Camera3;
  mira: Mira;
  edicao: Edicao;
  salvar: Salvar;
  fluxo: Fluxo;
}
