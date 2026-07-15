// ============================================================
//  sim-os — motor genérico de "simulador de desktop antigo".
//
//  Um simulador novo (Windows XP, Mac clássico…) nasce com:
//    1. um arquivo de dados (src/data/<sim>.ts) exportando `DadosSim`;
//    2. uma página .astro com o SHELL (contrato abaixo), o sprite SVG,
//       os tokens de tema --sim-* e o CSS do conteúdo autoral;
//    3. o wiring: iniciarSim({ apps: {...} }) escolhendo os apps.
//  Zero linhas do motor mudam.
//
//  CONTRATO DO SHELL — a página fornece um elemento raiz `[data-sim]`
//  contendo os ganchos (o motor nunca assume layout, só os ganchos):
//    [data-tela="boot"|"desktop"|"desligado"]  telas alternadas por `hidden`
//    [data-area]        área de trabalho (janelas nascem aqui)
//    [data-icones]      container dos ícones do desktop (motor preenche)
//    [data-menu]        menu iniciar (nasce hidden)
//    [data-menu-itens]  <ul> dos itens do menu (motor preenche)
//    [data-iniciar]     botão Iniciar (aria-expanded gerenciado pelo motor)
//    [data-tarefas]     faixa de botões da taskbar (motor preenche)
//    [data-mute]        botão do alto-falante   [data-mute-use] <use> do ícone
//    [data-relogio]     relógio da bandeja
//    [data-anuncio]     live region sr-only
//    [data-aguarde] [data-msg-final] [data-religar]  tela de desligamento
//  + sprite SVG inline com um <symbol id="i-<nome>"> pra cada ícone
//    citado nos dados (e opcionalmente #i-lixeira-cheia).
//
//  Skin: CSS estrutural em src/styles/sim-os.css consumindo tokens
//  --sim-* que a página define. Identidade visual = tokens + sprite;
//  conteúdo autoral (html das janelas/sites) leva o próprio CSS na página.
// ============================================================

// ===== Dados (o arquivo em src/data/ importa DAQUI — o motor é dono
// do formato; nunca importe nada de src/data/ dentro do motor) =====

export interface JanelaDef {
  id: string;
  titulo: string;
  icone: string;
  classe?: string;
  /** true = corpo sem padding/estilo padrão (o html cuida do layout) */
  cru?: boolean;
  /** corpo autoral (vira innerHTML — conteúdo NOSSO; nunca input de aluno) */
  html?: string;
  /** liga um comportamento: chave do registro de apps passado a iniciarSim */
  app?: string;
}

export interface Site {
  url: string;
  titulo: string;
  html: string;
}

export interface ArquivoSeed {
  id: string;
  nome: string;
  icone: string;
  /** id da janela-visualizadora que este arquivo abre… */
  janela?: string;
  /** …OU app que abre o arquivo (ex.: 'bloco-de-notas') com este texto */
  abrirCom?: string;
  texto?: string;
  /** mídia real servida do site (seeds de música do player) */
  url?: string;
}

/** faixa da playlist do player — gerada no BUILD (a página escaneia public/) */
export interface Faixa {
  nome: string;
  url: string;
}

export interface ItemMenu {
  /** id da janela que o item abre (ausente quando é um grupo com submenu) */
  id?: string;
  icone: string;
  rotulo: string;
  /** cascata: itens do submenu (1 nível) */
  submenu?: ItemMenu[];
}

export interface IconeDesktop {
  /** id da janela que o ícone abre… */
  id?: string;
  /** …OU id de arquivo do VFS (abre pelo visualizador/app do arquivo) */
  abreArquivo?: string;
  icone: string;
  rotulo: string;
}

/** trecho musical sintetizado: [freq Hz, duração s][] */
export interface Trecho {
  notas: [number, number][];
  /** com passo, as notas começam i*passo (acorde arpejado); sem, tocam em sequência */
  passo?: number;
  tipo: OscillatorType;
  vol: number;
}

export interface DadosSim {
  /** prefixo do localStorage (ex.: 'win98' → 'win98:mudo') */
  chave: string;
  /** pasta de PNGs opcionais que cobrem os símbolos SVG */
  pastaIcones: string;
  janelas: JanelaDef[];
  iconesDesktop: IconeDesktop[];
  menu: ItemMenu[];
  desligar: { icone: string; rotulo: string };
  arquivosSeed: ArquivoSeed[];
  sites: Site[];
  navegador: { home: string };
  /** playlist do player de música — a PÁGINA injeta no build (fs.readdir) */
  playlist?: Faixa[];
  sons: { ligar: Trecho; melodia: Trecho };
  tempos: {
    boot: number;
    bootReduzido: number;
    desligar: number;
    desligarReduzido: number;
    navegacao: number;
  };
  /** strings de UI/anúncios; placeholders {assim} via preencher() */
  textos: Record<string, string>;
}

// ===== Sistema de arquivos virtual (memória — nada persiste) =====

export interface Arquivo {
  id: string;
  nome: string;
  icone: string;
  origem: 'fabrica' | 'aluno';
  /** seeds: janela-visualizadora pré-definida */
  janela?: string;
  /** notas do aluno: app que abre o arquivo (ex.: 'bloco-de-notas') */
  abrirCom?: string;
  texto?: string;
  /** mídia real servida do site (música) */
  url?: string;
  naLixeira: boolean;
}

export type EventoArquivos = {
  tipo: 'criado' | 'alterado' | 'excluido' | 'restaurado' | 'esvaziada';
  arquivo?: Arquivo;
};

export interface Arquivos {
  /** arquivos na pasta (fora da lixeira), seeds primeiro */
  listar(): Arquivo[];
  naLixeira(): Arquivo[];
  obter(id: string): Arquivo | null;
  criarNota(nome: string, texto: string): Arquivo;
  /** false se não existe, está na lixeira ou não é do aluno */
  salvarNota(id: string, texto: string): boolean;
  /** false pra arquivo de fábrica (protegido) */
  excluir(id: string): boolean;
  restaurar(id: string): boolean;
  esvaziar(): void;
  /** 'nota.txt' já existe → 'nota (2).txt' */
  nomeLivre(nome: string): string;
  /** retorna a função de cancelar a assinatura */
  assinar(fn: (ev: EventoArquivos) => void): () => void;
}

// ===== Subsistemas =====

export interface ElsShell {
  area: HTMLElement;
  icones: HTMLElement;
  menu: HTMLElement;
  menuItens: HTMLElement;
  iniciar: HTMLElement;
  tarefas: HTMLElement;
  anuncio: HTMLElement;
  relogio: HTMLElement;
  mute: HTMLElement;
  muteUse: Element;
  aguarde: HTMLElement;
  msgFinal: HTMLElement;
  religar: HTMLElement;
}

export interface UI {
  els: ElsShell;
  anunciar(msg: string): void;
  trocarTela(nome: 'boot' | 'desktop' | 'desligado'): void;
  /** padrão triplo: PNG opcional cobrindo o <use> do sprite */
  icone(nome: string, classe?: string): HTMLSpanElement;
  iniciarRelogio(): void;
}

export interface Audio {
  init(): void;
  pronto(): boolean;
  tom(freq: number, inicio: number, dur: number, tipo: OscillatorType, vol: number): void;
  /** agenda um Trecho cancelável; retorna a duração total em ms (0 se não tocou) */
  tocarTrecho(trecho: Trecho): number;
  pararTrecho(): void;
  /** bipes de discagem: pares de frequências DTMF */
  dtmf(digitos: [number, number][], passo: number, vol: number): void;
  ruidoFiltrado(inicio: number, dur: number, freqCentral: number, vol: number): void;
  somClique(): void;
  /** lê/grava `${chave}:mudo` e liga o botão da bandeja */
  bindMute(): void;
  /** assina mudanças do mute global; retorna a função de cancelar */
  aoMudarMudo(fn: (mudo: boolean) => void): () => void;
}

export interface Janelas {
  /** constrói lazy na 1ª vez; reabrir/foca se já aberta */
  abrir(id: string, abridor?: HTMLElement | null): void;
  /** consulta o veto de antesDeFechar antes de fechar */
  fechar(id: string): void;
  fecharTodas(): void;
  minimizar(id: string): void;
  restaurar(id: string): void;
  alternarMax(id: string): void;
  focar(id: string): void;
  ativa(): string | null;
  el(id: string): HTMLElement | null;
  aberta(id: string): boolean;
  /** atualiza barra de título E botão da taskbar (sempre textContent) */
  definirTitulo(id: string, titulo: string): void;
  /** veto de fechamento: retorna false pra impedir (ex.: nota não salva) */
  antesDeFechar(id: string, podeFechar: () => boolean): void;
}

export interface AppInstancia {
  /** 1× quando o factory constrói a janela (sec = <section class="janela">) */
  montar(sec: HTMLElement): void;
  /** toda abertura da janela */
  aoAbrir?(sec: HTMLElement): void;
  /** religar o computador (reset de sessão do app) */
  aoReligar?(): void;
  /** contrato explorador → app (via arquivo.abrirCom) */
  abrirArquivo?(id: string, abridor?: HTMLElement | null): void;
}

export type CriadorDeApp = (ctx: Contexto) => AppInstancia;

export interface Estado {
  tela: 'boot' | 'desktop' | 'desligado';
  mudo: boolean;
  menuAberto: boolean;
  semMov: boolean;
  bootTimer: number;
  desligarTimer: number;
}

export interface Contexto {
  dados: DadosSim;
  raiz: HTMLElement;
  estado: Estado;
  ui: UI;
  audio: Audio;
  janelas: Janelas;
  arquivos: Arquivos;
  apps: Record<string, AppInstancia>;
}
