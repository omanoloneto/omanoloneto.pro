// ============================================================
//  Jogo "Entrega Turbo" — caminhão 3D de entregas em TERRA DE AREIA!
//  A cidadezinha é inspirada no mapa real (Google Maps): a BR-101
//  cruzando na diagonal, o CENTRO com prédios a leste e o bairro
//  BELA VISTA de casinhas a oeste — com os comércios de verdade.
//  Público: crianças 6-10 anos, Chromebooks fracos com touch.
//
//  O MAPA é autorável: grade de lotes (célula = 28m: lote de 20m +
//  rua de 8m em volta de todos). Símbolos:
//    P = prédio   H = casa com telhado   T = arvoredo   . = vazio/avenida
//    D = depósito (coleta)
//    letras minúsculas = destinos de entrega (ver DESTINOS)
//  Dela derivam geometria, colisões e pontos de entrega.
// ============================================================

export const mapa: string[] = [
  'HHTP.p',
  'HHPP.P',
  'cDT.Pz',
  'Ha.PsP',
  'HH.PPe',
  'iH.PTP',
];

// BR-101: avenida diagonal cruzando a cidade (como na foto do Maps).
// Lotes atravessados pela faixa não constroem nada — ela é dirigível.
export const avenida = {
  de: [50, -88] as [number, number],
  para: [-30, 88] as [number, number],
  largura: 11,
};

export type Destino = {
  simbolo: string;
  nome: string;      // "a padaria" (com artigo, pra frases naturais)
  rotulo: string;    // "Padaria" (HUD/placas)
  emoji: string;
  cor: number;       // cor do prédio do destino (hex three.js)
};

// Os comércios de verdade de Terra de Areia (do Google Maps) + clássicos
export const destinos: Destino[] = [
  { simbolo: 'p', nome: 'a Padaria Sabor do Céu', rotulo: 'Sabor do Céu', emoji: '🥖', cor: 0xf2c14e },
  { simbolo: 's', nome: 'o Super da Praia', rotulo: 'Super da Praia', emoji: '🛒', cor: 0x4ea5d9 },
  { simbolo: 'z', nome: 'a Pizzaria Skentta', rotulo: 'Skentta', emoji: '🍕', cor: 0xe4572e },
  { simbolo: 'c', nome: 'o Sempre Certo', rotulo: 'Sempre Certo', emoji: '🏪', cor: 0x7bc950 },
  { simbolo: 'e', nome: 'a escola', rotulo: 'Escola', emoji: '🏫', cor: 0xd97757 },
  { simbolo: 'a', nome: 'a casa azul', rotulo: 'Casa Azul', emoji: '🏠', cor: 0x3d7dd8 },
  { simbolo: 'i', nome: 'a sorveteria', rotulo: 'Sorveteria', emoji: '🍦', cor: 0xf7a1c4 },
];

export const config = {
  // ----- mundo -----
  celulaM: 28,           // passo da grade (lote 20 + rua 8)
  loteM: 20,
  // ----- física arcade -----
  vmaxFacil: 10.5,       // m/s (Fácil auto-acelera)
  vmaxNormal: 15,
  vmaxRe: 4,
  aceleracao: 12,        // m/s² — 12 mantém a arrancada em ~1,25s mesmo com vmax 15
  freio: 20,             // de 15 m/s a parada dá 5,6m (com 14 daria 8m e passava da vaga)
  arrasto: 2.0,          // v -= v*arrasto*dt sem input
  esterco: 2.4,          // rad/s base (escala com velocidade)
  // amortece o esterço em alta: rad/s *= 1/(1 + estercoAmortece*|v|).
  // Raio de curva = v/rad/s, e as ruas têm 8m — a 15 m/s com 0.06 dava
  // 12,9m e o caminhão não fazia a curva. 0.035 traz pra 9,5m.
  estercoAmortece: 0.035,
  raioColisao: 1.2,      // círculo do caminhão
  batidaFreio: 0.6,      // v *= isso ao bater
  batidaCooldownMs: 300,
  // ----- coleta/entrega -----
  raioZona: 4,           // m
  vMaxColeta: 3.0,       // precisa estar devagar pra coletar/entregar
  imaRaio: 2,            // ímã de zona (Fácil usa imaRaioFacil)
  imaRaioFacil: 2.5,
  respiroEntrePedidosMs: 1500,
  // ----- progressão -----
  pedidosPorNivel: 3,
  nivelMax: 20,          // teto do ranking
  caixas2APartirDoNivel: 3,
  caixas3APartirDoNivel: 6,
  // ----- prazo (só Normal) -----
  prazoVelRef: 8,        // prazo = dist/8 * fator (subiu junto com a vmax)
  prazoFatorBase: 2.0,   // fator = max(1.4, 2.0 - 0.06*(nivel-1))
  prazoFatorMin: 1.4,
  prazoQuedaPorNivel: 0.06,
  prazoMinS: 8,
  // ----- pontos -----
  pontosPorCaixa: 100,
  bonusTempoPorS: 10,
  bonusTempoTeto: 150,
  bonusLimpa: 50,        // pedido inteiro sem batida
  bonusCaixaExtra: 25,   // por caixa além da 1ª do pedido
  // ----- vidas (só Normal) -----
  coracoes: 3,
  // ----- ranking -----
  rankingMax: 10,
  nomeMin: 2,
  nomeMax: 6,
  somLigadoInicial: true,
  // ----- tráfego -----
  trafego: {
    carrosBR: 5,        // decorativos, em cima da rodovia
    velBRMin: 8,
    velBRMax: 12,
    carrosCidade: 4,    // só no modo Normal — bater neles custa 1 coração
    velCidade: 4.5,
    raioCarro: 1.1,
    invencivelMs: 2000, // sem dano duplo logo após uma batida
  },
} as const;

// ============================================================
//  Skins do caminhão — compradas na Garagem com os pontos ganhos.
//  O nível NÃO troca mais de skin: quem manda é a escolha da criança.
//  `id` é o que vai pro localStorage — nunca renomeie um id existente
//  (quem já comprou perderia a skin). Preço 0 = já vem na garagem.
//  `tema` liga uma textura procedural (canvas, sem asset novo).
// ============================================================
export type Tema = 'bombeiro' | 'policia' | 'arcoiris' | 'oncinha' | 'bobesponja' | 'patrick';

export type Skin = {
  id: string;
  nome: string;
  emoji: string;
  preco: number;
  cabine: number;   // hex three.js
  bau: number;      // plataforma + guardas da carroceria
  calota: number;   // a calota faz parte da skin
  tema?: Tema;
};

// Escada de preço: ~100 pts/caixa + bônus ⇒ ~250/pedido, ~800/nível.
// A 1ª compra cai já na 1ª partida; a coleção toda leva várias.
export const skins: Skin[] = [
  { id: 'amarelo',  nome: 'Amarelinho', emoji: '🟡', preco: 0,    cabine: 0xf7cf3d, bau: 0xf0efe8, calota: 0xc7cdd6 }, // o da foto!
  { id: 'azul',     nome: 'Azulão',     emoji: '🔵', preco: 300,  cabine: 0x3d7dd8, bau: 0xf0efe8, calota: 0xc7cdd6 },
  { id: 'vermelho', nome: 'Vermelhão',  emoji: '🔴', preco: 300,  cabine: 0xd94f3d, bau: 0xf2e8d5, calota: 0xc7cdd6 },
  { id: 'verde',    nome: 'Verdinho',   emoji: '🟢', preco: 600,  cabine: 0x7bc950, bau: 0xf2e8d5, calota: 0xc7cdd6 },
  { id: 'roxo',     nome: 'Uva',        emoji: '🟣', preco: 600,  cabine: 0x9b6dd6, bau: 0xffd1ec, calota: 0xe6d5f5 },
  { id: 'bombeiro', nome: 'Bombeiro',   emoji: '🚒', preco: 1200, cabine: 0xd42a1e, bau: 0xf5f5f5, calota: 0xe8e8e8, tema: 'bombeiro' },
  { id: 'policia',  nome: 'Polícia',    emoji: '🚓', preco: 1200, cabine: 0x1e2a4a, bau: 0xf5f5f5, calota: 0x9aa3b0, tema: 'policia' },
  { id: 'arcoiris', nome: 'Arco-Íris',  emoji: '🌈', preco: 2000, cabine: 0xffffff, bau: 0xfff4d6, calota: 0xffd23f, tema: 'arcoiris' },
  { id: 'oncinha',  nome: 'Oncinha',    emoji: '🐆', preco: 2500, cabine: 0xe8a33d, bau: 0xf5deb3, calota: 0x6b4a22, tema: 'oncinha' },
  // os dois têm rosto no para-brisa (ver criarTexturaRosto). Emoji 🍍/🌟 são
  // de 2010: 🧽 é de 2018 (quadradinho em Chromebook velho) e ⭐ já é o
  // ícone dos pontos no HUD.
  { id: 'bobesponja', nome: 'Bob Esponja', emoji: '🍍', preco: 3000, cabine: 0xf5e94e, bau: 0x8b6d3f, calota: 0xf5f5f5, tema: 'bobesponja' },
  { id: 'patrick',    nome: 'Patrick',     emoji: '🌟', preco: 3000, cabine: 0xf2a3c7, bau: 0x6fbf5e, calota: 0x7cc36a, tema: 'patrick' },
];

export const skinGratis = skins[0].id;
