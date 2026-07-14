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
  'Has.PP',
  'HH.PPe',
  'Hi.PTP',
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
  vmaxFacil: 7,          // m/s (Fácil auto-acelera)
  vmaxNormal: 10,
  vmaxRe: 4,
  aceleracao: 8,         // m/s²
  freio: 14,
  arrasto: 2.0,          // v -= v*arrasto*dt sem input
  esterco: 2.2,          // rad/s base (escala com velocidade)
  raioColisao: 1.2,      // círculo do caminhão
  batidaFreio: 0.6,      // v *= isso ao bater
  batidaCooldownMs: 300,
  // ----- coleta/entrega -----
  raioZona: 4,           // m
  vMaxColeta: 2.5,       // precisa estar devagar pra coletar/entregar
  imaRaio: 2,            // ímã de zona (Fácil usa imaRaioFacil)
  imaRaioFacil: 2.5,
  respiroEntrePedidosMs: 1500,
  // ----- progressão -----
  pedidosPorNivel: 3,
  nivelMax: 20,          // teto do ranking
  caixas2APartirDoNivel: 3,
  caixas3APartirDoNivel: 6,
  // ----- prazo (só Normal) -----
  prazoVelRef: 6,        // prazo = dist/6 * fator
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
} as const;

// Skins do caminhão (cabine, baú) — troca a cada 2 níveis
export const skins: Array<[number, number]> = [
  [0xf7cf3d, 0xf0efe8], // amarelo com baú branco (o da foto!)
  [0x3d7dd8, 0xf0efe8], // azul
  [0xd94f3d, 0xf2e8d5], // vermelho clássico
  [0x7bc950, 0xf2e8d5], // verde
  [0x9b6dd6, 0xffd1ec], // roxo/rosa
];
