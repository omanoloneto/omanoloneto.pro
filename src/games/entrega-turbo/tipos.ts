// Tipos compartilhados do Entrega Turbo.
// O Contexto é o único "fio" entre os módulos: main.ts monta e todos leem.
import type * as THREE from 'three';
import type { config, destinos, skins, mapa, avenida } from '../../data/entrega-turbo';
import type { Destino, Skin } from '../../data/entrega-turbo';

export type Cfg = typeof config;

export type Fase = 'inicio' | 'jogando' | 'pausado' | 'fim' | 'entrada' | 'recordes' | 'garagem';
export type Modo = 'facil' | 'normal';

export interface Estado {
  fase: Fase;
  modo: Modo | null;
  pontos: number;
  nivel: number;
  vidas: number;
  pedidosCompletos: number;
  entregasTotais: number;
  pedido: Pedido | null;
  mudo: boolean;
  primeiroInput: boolean;
  longeDesdeMs: number;
}

export interface Pedido {
  caixas: string[]; // símbolos dos destinos pendentes
  total: number;
  coletado: boolean;
  bateu: boolean;
  prazoMs: number;
  // relógio em TEMPO DE SIMULAÇÃO (dt clampado somado no loop):
  // FPS baixo desacelera física E prazo juntos; pausa congela de graça
  decorridoMs: number;
}

export interface Truck {
  x: number;
  z: number;
  heading: number;
  v: number;
  ultimaBatidaMs: number;
  squashAte: number;
}

export interface Input {
  esq: boolean;
  dir: boolean;
  acel: boolean;
  re: boolean;
}

export interface Zona {
  x: number;
  z: number;
  destino: Destino | null; // null = depósito
}

export interface Audio {
  init(): void;
  retomar(): void;
  suspender(): void;
  bindMute(btn: HTMLElement, icone: HTMLElement): void;
  atualizarMotor(): void;
  silenciarMotor(): void;
  somColeta(): void;
  somEntrega(): void;
  somBatida(): void;
  somBuzina(): void;
  somPedido(): void;
  somNivel(): void;
  somFim(): void;
  somUfa(): void;
}

export interface Mundo {
  zonas: Map<string, Zona>;
  aabbs: Array<{ minX: number; maxX: number; minZ: number; maxZ: number }>;
  N: number;
  MEIO: number;
  loteCentro(i: number): number;
  ruaCentro(i: number): number;
  noMaisProximo(x: number, z: number): [number, number];
  dentroDePredio(x: number, z: number): boolean;
  colisaoAvenida(x: number, z: number, raio: number): { nx: number; nz: number; pen: number } | null;
  dentroDeAterro(x: number, z: number, y: number): boolean;
  sobViaduto(x: number, z: number): boolean;
  avenidaInfo: {
    altura: number;
    comprimento: number;
    dir: [number, number];
    perp: [number, number];
    ponto(t: number): [number, number];
  };
}

export interface Caminhao {
  grupo: THREE.Group;
  atualizarCaixasVisiveis(n: number): void;
  aplicarSkin(id: string): void;
  atualizarVisual(dt: number, steer: number): void;
}

export interface Garagem {
  /** único ponto de crédito: soma no placar da partida E no cofre */
  ganharPontos(n: number): void;
  escolhida(): string;
  abrir(voltarPara: 'inicio' | 'fim'): void;
  fechar(): void;
}

export interface Guia {
  zonaColeta: THREE.Group;
  zonaEntrega: THREE.Group;
  apontarSeta(alvo: Zona | null, corHex: number, ts: number): void;
  pulsarAneis(ts: number): void;
  atualizarRota(alvo: Zona | null): void;
  limparRota(): void;
  temRota(): boolean;
  esconderTudo(): void;
  mostrarMorador(x: number, z: number): void;
  passoMorador(ts: number): void;
}

export interface Pedidos {
  novoPedido(): void;
  tentarZona(dt: number): void;
  alvoAtual(): Zona | null;
  prazoRestanteMs(): number;
  limparTimers(): void;
  agendarRespiro(ms: number): void;
  bateuEmCarro(): void;
}

export interface Trafego {
  passo(dt: number): void;
  reset(comCidade: boolean): void;
  carros: unknown[];
}

export interface UI {
  els: Record<string, HTMLElement>;
  anunciar(msg: string): void;
  mostrarToast(html: string, tipo: 'ok' | 'info', ms?: number): void;
  popHud(sel: string, valor: number | string): void;
  atualizarVidas(pop: boolean): void;
  mostrarBanner(titulo: string, sub?: string): void;
  confete(): void;
  elogio(): string;
}

export interface Ranking {
  abrirEntrada(): void;
  abrirRecordes(consulta: boolean): void;
  digitarLetra(l: string): void;
  apagarLetra(): void;
  confirmarEntrada(): void;
}

export interface Fluxo {
  comecar(modo: Modo): void;
  pausar(): void;
  continuarJogo(): void;
  fimDeTurno(): void;
  reiniciar(): void;
  medir(): void;
  soltarInputs(): void;
  aoPrimeiroInput(): void;
  loopRodando(): boolean;
}

export interface Contexto {
  // dados (serializados no data-dados da página)
  mapa: typeof mapa;
  destinos: typeof destinos;
  cfg: Cfg;
  skins: typeof skins;
  porSkinId: Map<string, Skin>;
  avenida: typeof avenida;
  porSimbolo: Map<string, Destino>;
  motionReduzido: boolean;
  // núcleo three
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  cenaEl: HTMLElement;
  // estado vivo
  estado: Estado;
  truck: Truck;
  input: Input;
  // subsistemas (preenchidos pelo main na ordem de criação)
  audio: Audio;
  ui: UI;
  mundo: Mundo;
  caminhao: Caminhao;
  garagem: Garagem;
  guia: Guia;
  pedidos: Pedidos;
  trafego: Trafego;
  ranking: Ranking;
  fluxo: Fluxo;
  camera3: { passo(dt: number): void; iniciarFlyover(): void };
  fisica: { passo(dt: number): void };
}
