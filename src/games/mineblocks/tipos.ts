// Tipos compartilhados do MineBlocks.
// O Contexto é o único "fio" entre os módulos: main.ts monta e todos leem.
import type * as THREE from 'three';
import type { blocos, itens, config, receitas, Bloco } from '../../data/mineblocks';

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
  // hotbar estilo Minecraft: 9 atalhos que enchem conforme coleta (0 = vazio)
  hotbarSlots: number[];
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
  golpe: boolean; // segurando o botão/dedo pra quebrar

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
  // gancho do multiplayer: TODA escrita via definir passa aqui (quebrar,
  // colocar, flor caindo, decay, árvore crescendo). O sync instala só
  // com sala ativa; a geração escreve dados[] cru e não emite.
  aoMudar?: (x: number, y: number, z: number, id: number) => void;
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
  quebrar(): boolean; // INSTANTÂNEO — backdoor de teste/depuração
  colocar(): boolean;
  golpear(dt: number): void; // segurando: acumula progresso até quebrar
  soltarGolpe(): void; // soltou o botão/dedo: progresso zera
  golpeando(): boolean;
  passo(dt: number, simular?: boolean): void; // relógio das mudas + decay (simular=false: só o tempo anda)
  iniciarMudas(): void; // re-arma o relógio após carregar um save
  crescerMudasAgora(): void; // teste: adianta tudo
  decairAgora(): void; // teste: processa todo o decay pendente já
  registrarItemNaHotbar(item: number): boolean; // item novo entra no 1º slot vazio (false = cheia)
  // multiplayer: SÓ o anfitrião chama, pra edição vinda da rede — os
  // sistemas automáticos precisam saber o que os visitantes fizeram
  // (muda plantada entra no relógio; ar aberto re-checa folhas órfãs)
  aoEdicaoRemota(x: number, y: number, z: number, id: number): void;
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
  montarInventario(): void;
  alternarCraft(abrir?: boolean): void; // abre/fecha o painel do inventário
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

// jogador remoto como veio do servidor (posição do último poll)
export interface JogadorRemoto {
  nome: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
}

export interface Sync {
  emSala(): boolean;
  emVisita(): boolean;
  souAnfitriao(): boolean;
  codigoSala(): string;
  criarSala(nomeJogador: string): Promise<string | null>; // null=ok, string=erro
  entrarSala(codigo: string, nomeJogador: string): Promise<string | null>;
  aplicarFotoInicial(): boolean; // visita: escreve o mundo recebido (sem malha)
  ligarPoll(): void; // visita: começa a sincronizar (depois do mundo montado)
  sairDaSala(): Promise<void>; // avisa o servidor + limpa tudo local
  flushSair(): void; // pagehide: sendBeacon de 'sair'
  pollAgora(): void; // teste/depuração: sync já
}

export interface Bonecos {
  atualizarLista(jogadores: JogadorRemoto[]): void;
  passo(dt: number): void; // interpolação + nametag
  limpar(): void;
  quantos(): number;
  nomes(): string[];
}

export interface Contexto {
  blocos: typeof blocos;
  itens: typeof itens;
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
  sync: Sync;
  bonecos: Bonecos;
  fluxo: Fluxo;
}
