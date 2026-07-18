// Tipos compartilhados do MineBlocks.
// O Contexto é o único "fio" entre os módulos: main.ts monta e todos leem.
import type * as THREE from 'three';
import type { blocos, itens, materiais, config, receitas, Bloco } from '../../data/mineblocks';

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
  somFantasma(): void;
  somSusto(): void;
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
  tingir(cor: THREE.Color): void; // tint dia/noite: multiplica os materiais do mundo
}

// ciclo dia/noite: céu com gradiente + sol/lua cruzando + tint do mundo
export interface Ceu {
  passo(dt: number): void;
  tempo(): number; // segundos dentro do ciclo (0..CICLO)
  definirTempo(s: number): void;
}

// estado de rede de um Winpup (blackboard do anfitrião → visitantes)
export interface BichoRede {
  i: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
}

// bichos (Winpup): 1º animal. Flutua, vagueia e solta lã de dia.
export interface Mob {
  nascer(seed: number): void; // (re)popula os Winpups do mundo
  // simular=true (solo/anfitrião): move + solta lã; false (visita): segue a rede.
  // A coleta de lã (passar por cima) roda pra todo cliente.
  passo(dt: number, simular: boolean): void;
  atualizarRede(bichos: BichoRede[]): void; // visita: posições do anfitrião
  estadoRede(): BichoRede[]; // anfitrião: manda pro blackboard
  limpar(): void;
  quantos(): number;
}

// metadata por posição (não cabe no Uint8Array do mundo)
export type Meta =
  | { tipo: 'bau'; dono: string; itens: number[] }
  | { tipo: 'placa'; autor: string; texto: string };

export interface Metas {
  aoMudar?: (chave: number, meta: Meta | null) => void;
  chaveDe(x: number, y: number, z: number): number;
  obter(x: number, y: number, z: number): Meta | undefined;
  definir(x: number, y: number, z: number, meta: Meta): void;
  remover(x: number, y: number, z: number): void;
  aplicar(chave: number, meta: Meta | null): void; // da rede, sem eco
  tocar(chave: number): void; // re-emite após mutação no lugar (itens do baú)
  acharBau(filtro: (bau: Meta & { tipo: 'bau' }, chave: number) => boolean): { chave: number; bau: Meta & { tipo: 'bau' } } | null;
  serializar(): Record<string, Meta>;
  carregar(obj: unknown): void;
  limpar(): void;
  todos(): Map<number, Meta>;
}

export interface Fisica {
  passo(dt: number): void;
  empurrar(dx: number, dz: number): void;
  assentar(): void; // põe o jogador em pé no chão do spawn
}

export interface Kotsooh {
  nascer(): void;
  passo(dt: number): void;
  aparecer(): boolean;
  ativo(): boolean;
  posicao(): { x: number; y: number; z: number } | null;
  limpar(): void;
}

export interface Camera3 {
  passo(): void;
}

export interface Mira {
  alvo(): Alvo | null;
  passo(): void; // reposiciona o wireframe de highlight
}

export interface Edicao {
  quebrar(alvoForcado?: Alvo): boolean; // INSTANTÂNEO — backdoor de teste/depuração
  colocar(alvoForcado?: Alvo): boolean;
  golpear(dt: number): void; // segurando: acumula progresso até quebrar
  soltarGolpe(): void; // soltou o botão/dedo: progresso zera
  golpeando(): boolean;
  passo(dt: number, simular?: boolean): void; // relógio das mudas + decay (simular=false: só o tempo anda)
  iniciarMudas(): void; // re-arma o relógio após carregar um save
  crescerMudasAgora(): void; // teste: adianta tudo
  decairAgora(): void; // teste: processa todo o decay pendente já
  registrarItemNaHotbar(item: number): boolean; // item novo entra no 1º slot vazio (false = cheia)
  ganharItemPublico(id: number, n?: number): void; // deposita item no inventário (transferência de logout)
  // multiplayer: SÓ o anfitrião chama, pra edição vinda da rede — os
  // sistemas automáticos precisam saber o que os visitantes fizeram
  // (muda plantada entra no relógio; ar aberto re-checa folhas órfãs)
  aoEdicaoRemota(x: number, y: number, z: number, id: number): void;
  // clique direito/tap: interage com o alvo (baú/porta/placa) OU coloca.
  // true só se colocou bloco (o input só repete segurando quando colocou)
  interagir(alvoForcado?: Alvo): boolean;
  podeUsar(dono: string): boolean; // dono do baú/autor da placa × quem sou eu
}

export interface Salvar {
  criarMundo(): Promise<string | null>;
  carregarMundo(codigo: string): Promise<string | null>;
  adotarMundo(codigo: string): void;
  salvarAgora(motivo?: 'auto' | 'manual' | 'flush'): Promise<boolean>;
  agendar(): void;
  temMundo(): boolean;
  codigoMundo(): string;
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
  flashSusto(): void;
  // baú: painel de troca de itens (conteúdo ↔ inventário)
  abrirBau(chave: number, titulo: string, editavel: boolean): void;
  fecharBau(): void;
  bauAberto(): number; // -1 = nenhum; senão a chave do baú aberto
  atualizarBau(): void; // re-renderiza o painel se o baú aberto mudou
  // placa: form de escrever (na colocação) e leitura
  pedirTextoPlaca(aoConfirmar: (texto: string | null) => void): void;
  mostrarPlaca(texto: string, autor: string): void;
  painelModalAberto(): boolean; // inventário/baú/placa aberto (não pausar no ESC do lock)
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
  meuNomeNaSala(): string; // '' quando solo; senão o nome do jogador na sala
  criarSala(nomeJogador: string, codigo: string): Promise<string | null>;
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
  materiais: typeof materiais;
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
  metas: Metas;
  malha: Malha;
  ceu: Ceu;
  mob: Mob;
  fisica: Fisica;
  kotsooh: Kotsooh;
  camera3: Camera3;
  mira: Mira;
  edicao: Edicao;
  salvar: Salvar;
  sync: Sync;
  bonecos: Bonecos;
  fluxo: Fluxo;
}
