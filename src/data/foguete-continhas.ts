// ============================================================
//  Jogo "Foguete das Continhas" — digite o resultado e a nave atira!
//  Público: crianças ~6-7 anos (1º ano), soma e subtração até 20
//  (BNCC EF01MA06/EF01MA08). Irmão matemático do Letras Espaciais.
//
//  São 20 níveis. As FAIXAS dizem que continhas aparecem em cada
//  bloco de níveis (soma curta → soma até 20 → subtração → misto);
//  o ritmo cresce junto. Edite os números pra calibrar.
// ============================================================

export type Operacao = '+' | '-';

export type Continha = {
  a: number;
  b: number;
  op: Operacao;
  // resultado pré-calculado (sempre 0..20 — cabe em 2 dígitos)
  resultado: number;
};

export type Nivel = {
  id: string;
  nome: string;
  // todas as continhas possíveis do nível (o client sorteia daqui,
  // sem deixar dois resultados "conflitantes" vivos ao mesmo tempo)
  pool: Continha[];
  // resumo da faixa — usado nos avisos entre níveis
  op: Operacao | 'misto';
  teto: number;
  // velocidade de descida: fração da altura da tela por segundo
  velocidade: number;
  // intervalo entre levas de inimigos, em milissegundos
  intervaloSpawn: number;
  // quantas continhas resolver pra completar o nível
  abates: number;
  // quantos inimigos podem estar na tela ao mesmo tempo
  maxInimigos: number;
  // quantos inimigos nascem por leva
  spawnsPorVez: number;
};

export const config = {
  // pontos por continha resolvida
  pontosPorAcerto: 10,
  // modo com vidas: corações no começo e teto de corações
  vidasIniciais: 3,
  vidasMaximas: 3,
  // chance (0 a 1) de um abate soltar um coração — só quando falta vida
  chanceCoracao: 0.18,
  // modo tranquilo: com este tanto de inimigos esperando, param de chegar novos
  maxInimigosEsperando: 4,
  // tempo que o tiro leva da nave até o inimigo, em milissegundos
  duracaoTiroMs: 260,
  // altura da linha onde o inimigo para (tranquilo) ou foge (vidas)
  linhaEspera: 0.8,
  // maior resultado possível → tamanho máximo do que se digita
  maxDigitos: 2,
  somLigadoInicial: true,
} as const;

type Regra = { op: Operacao; resMin: number; resMax: number; bMax: number };

// Enumera todas as continhas válidas da regra (determinístico em build).
// b >= 1, resultado nunca negativo nem acima do teto.
function gerarPool(r: Regra): Continha[] {
  const pool: Continha[] = [];
  for (let a = 1; a <= 20; a++) {
    for (let b = 1; b <= r.bMax; b++) {
      const resultado = r.op === '+' ? a + b : a - b;
      if (resultado < Math.max(0, r.resMin) || resultado > r.resMax) continue;
      if (r.op === '-' && a > r.resMax) continue;
      pool.push({ a, b, op: r.op, resultado });
    }
  }
  return pool;
}

// ============================================================
//  FAIXAS — "até o nível X caem continhas assim".
//  op 'misto' = soma e subtração juntas.
// ============================================================
const FAIXAS: Array<{ ate: number; op: Operacao | 'misto'; resMin: number; resMax: number; bMax: number }> = [
  { ate: 2, op: '+', resMin: 2, resMax: 5, bMax: 3 },
  { ate: 4, op: '+', resMin: 2, resMax: 9, bMax: 5 },
  { ate: 6, op: '+', resMin: 3, resMax: 10, bMax: 6 },
  { ate: 8, op: '+', resMin: 5, resMax: 20, bMax: 9 },
  { ate: 10, op: '-', resMin: 0, resMax: 5, bMax: 4 },
  { ate: 12, op: '-', resMin: 0, resMax: 10, bMax: 6 },
  { ate: 14, op: '-', resMin: 0, resMax: 20, bMax: 9 },
  { ate: 16, op: 'misto', resMin: 0, resMax: 10, bMax: 6 },
  { ate: 20, op: 'misto', resMin: 0, resMax: 20, bMax: 9 },
];

// A partir deste nível a velocidade sobe 4% por nível
const NIVEL_ACELERACAO = 16;
const ACELERACAO_POR_NIVEL = 1.04;
// A partir deste nível nascem 2 inimigos por leva
const NIVEL_LEVA_DUPLA = 18;

// Um nome por nível (20)
const NOMES = [
  'Decolagem das Somas',
  'Primeiros Meteoros',
  'Chuva de Números',
  'Órbita do Nove',
  'Rumo ao Dez',
  'Estação Dez',
  'Além do Dez',
  'Cinturão do Vinte',
  'Chegou a Subtração',
  'Pulos pra Trás',
  'Nebulosa do Menos',
  'Cometa Minguante',
  'Zona da Diferença',
  'Tempestade do Menos',
  'Galáxia Misturada',
  'Sinais Trocados',
  'Aceleração Total',
  'Invasão em Dupla',
  'Última Fronteira',
  'Campeão do Universo',
];

function faixaDoNivel(n: number) {
  return FAIXAS.find((f) => n <= f.ate) || FAIXAS[FAIXAS.length - 1];
}

function gerarNiveis(total: number): Nivel[] {
  const niveis: Nivel[] = [];
  for (let n = 1; n <= total; n++) {
    const f = faixaDoNivel(n);
    const pool =
      f.op === 'misto'
        ? [
            ...gerarPool({ op: '+', resMin: Math.max(2, f.resMin), resMax: f.resMax, bMax: f.bMax }),
            ...gerarPool({ op: '-', resMin: f.resMin, resMax: f.resMax, bMax: f.bMax }),
          ]
        : gerarPool({ op: f.op, resMin: f.resMin, resMax: f.resMax, bMax: f.bMax });
    // Ritmo: mais devagar que o Letras Espaciais — a criança precisa
    // CALCULAR, não só reconhecer. Cresce ~7% por nível.
    let velocidade = 0.034 * Math.pow(1.07, n - 1);
    if (n >= NIVEL_ACELERACAO) {
      velocidade *= Math.pow(ACELERACAO_POR_NIVEL, n - NIVEL_ACELERACAO + 1);
    }
    niveis.push({
      id: 'nivel-' + n,
      nome: NOMES[n - 1] || 'Missão ' + n,
      pool,
      op: f.op,
      teto: f.resMax,
      velocidade: Math.round(velocidade * 10000) / 10000,
      intervaloSpawn: Math.max(2600, 4600 - n * 100),
      abates: n <= 2 ? 6 : n <= 8 ? 8 : 10,
      maxInimigos: n <= 4 ? 3 : n <= 12 ? 4 : 5,
      spawnsPorVez: n >= NIVEL_LEVA_DUPLA ? 2 : 1,
    });
  }
  return niveis;
}

export const niveis: Nivel[] = gerarNiveis(20);
