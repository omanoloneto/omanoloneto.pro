// ============================================================
//  Jogo "Sapo Saltador — Lago das Esmeraldas" (v2)
//  Matemática 1º ano: soma e subtração na reta numérica 0–20
//  (BNCC EF01MA06/EF01MA08), agora com mapa de vitórias-régias:
//  cada continha resolvida = 1 salto rumo à lótus. Pads têm
//  efeitos (moeda, flor, impulso, planta carnívora) e no fim da
//  run a criança grava o nome no ranking arcade.
//
//  O data file define os POOLS de continhas (exaustivos,
//  determinísticos em build) e a RECEITA do mapa de cada fase;
//  o client sorteia continhas e monta o mapa em runtime.
// ============================================================

export type Operacao = '+' | '-';

export type Continha = {
  a: number;         // primeiro número — pedra onde o sapo começa na reta
  b: number;         // segundo número — quantos pulos
  op: Operacao;      // '+' = pra frente; '-' = pra trás
  resultado: number; // pré-calculado (sempre 0..20)
};

// Receita do mapa da fase: quantos saltos até a lótus e a
// distribuição de efeitos nos pads intermediários.
// Slots de efeito = (saltos - 1) + bifurcacoes.
export type Fase = {
  id: string;
  nome: string;
  descricao: string;    // aviso no modal entre fases
  pool: Continha[];
  saltos: number;       // continhas até a lótus (última fileira = lótus)
  bifurcacoes: number;  // fileiras com 2 pads (escolha de rota)
  moedas: number;       // pads com 🟡
  flores: number;       // pads com 🌸 (sempre 3 = estrelas da fase)
  impulsos: number;     // pads com ⚡
  perigos: number;      // pads com 💀 (só em bifurcação)
};

export const config = {
  // ----- reta numérica (micro-loop) -----
  retaMin: 0,
  retaMax: 20,
  errosParaDica: 2,
  duracaoPuloMs: 320,   // pulo de 1 casa na reta
  duracaoSaltoMs: 650,  // salto direto na reta E salto no mapa
  // ----- pontuação (arcade, por run) -----
  pontosPorContinha: 10,
  bonusPrimeira: 5,     // acertou sem nenhum erro
  pontosPorMoeda: 1,    // cada moeda vira 1 ponto no placar final
  pontosPorFlor: 25,
  pontosPorFase: 50,
  pontosPorCoracao: 20, // corações restantes no fim (modo vidas)
  // ----- moedas -----
  moedasPorPad: 5,
  moedasPlanta: 10,     // recompensa do desafio da planta
  // ----- corações (modo vidas) -----
  coracoesIniciais: 3,
  coracoesMaximos: 3,
  // ----- ranking -----
  rankingMax: 10,
  nomeMin: 2,
  nomeMax: 6,
  somLigadoInicial: true,
} as const;

type Regra = { op: Operacao; resultadoMin: number; resultadoMax: number; bMax: number };

// Enumera todas as continhas válidas da regra. b >= 1, resultado
// nunca negativo nem acima do teto; na subtração o ponto de
// partida também respeita o teto.
function gerarPool(r: Regra): Continha[] {
  const pool: Continha[] = [];
  for (let a = 1; a <= config.retaMax; a++) {
    for (let b = 1; b <= r.bMax; b++) {
      const resultado = r.op === '+' ? a + b : a - b;
      if (resultado < Math.max(0, r.resultadoMin) || resultado > r.resultadoMax) continue;
      if (r.op === '-' && a > r.resultadoMax) continue;
      pool.push({ a, b, op: r.op, resultado });
    }
  }
  return pool;
}

const somaAte10 = gerarPool({ op: '+', resultadoMin: 2, resultadoMax: 10, bMax: 4 });
const somaAte20 = gerarPool({ op: '+', resultadoMin: 11, resultadoMax: 20, bMax: 9 });
const subAte10 = gerarPool({ op: '-', resultadoMin: 0, resultadoMax: 10, bMax: 4 });
const subAte20 = gerarPool({ op: '-', resultadoMin: 0, resultadoMax: 20, bMax: 9 });
const misto = [
  ...gerarPool({ op: '+', resultadoMin: 2, resultadoMax: 20, bMax: 9 }),
  ...gerarPool({ op: '-', resultadoMin: 0, resultadoMax: 20, bMax: 9 }),
];

// Rampa: soma curta → soma cruzando o 10 → subtração → misto.
// O mapa cresce junto (mais saltos, mais bifurcações, mais perigo).
export const fases: Fase[] = [
  {
    id: 'fase-1', nome: 'Margem Tranquila',
    descricao: 'Somas até 10 — pule pra frente e colete as flores!',
    pool: somaAte10, saltos: 5, bifurcacoes: 1,
    moedas: 2, flores: 3, impulsos: 0, perigos: 0,
  },
  {
    id: 'fase-2', nome: 'Juncos Baixos',
    descricao: 'Apareceu o ⚡ impulso: acerte de primeira e dê um salto duplo!',
    pool: somaAte10, saltos: 5, bifurcacoes: 1,
    moedas: 1, flores: 3, impulsos: 1, perigos: 0,
  },
  {
    id: 'fase-3', nome: 'Curva das Libélulas',
    descricao: 'Somas maiores, até 20 — e cuidado: uma 💀 planta carnívora mora aqui!',
    pool: somaAte20, saltos: 6, bifurcacoes: 2,
    moedas: 2, flores: 3, impulsos: 1, perigos: 1,
  },
  {
    id: 'fase-4', nome: 'Pedras Musgosas',
    descricao: 'Mais somas até 20. A planta paga 10 moedas pra quem acerta de primeira…',
    pool: somaAte20, saltos: 6, bifurcacoes: 2,
    moedas: 2, flores: 3, impulsos: 1, perigos: 1,
  },
  {
    id: 'fase-5', nome: 'Corredeira Mansa',
    descricao: 'Chegou a SUBTRAÇÃO: agora o sapo pula pra trás!',
    pool: subAte10, saltos: 6, bifurcacoes: 2,
    moedas: 2, flores: 3, impulsos: 1, perigos: 1,
  },
  {
    id: 'fase-6', nome: 'Ilha dos Nenúfares',
    descricao: 'Mais pulos pra trás, até 10.',
    pool: subAte10, saltos: 6, bifurcacoes: 2,
    moedas: 2, flores: 3, impulsos: 1, perigos: 1,
  },
  {
    id: 'fase-7', nome: 'Sombra dos Salgueiros',
    descricao: 'Subtrações até 20 — e agora são DUAS plantas carnívoras!',
    pool: subAte20, saltos: 7, bifurcacoes: 3,
    moedas: 3, flores: 3, impulsos: 1, perigos: 2,
  },
  {
    id: 'fase-8', nome: 'Neblina da Manhã',
    descricao: 'Mais subtrações até 20 na neblina.',
    pool: subAte20, saltos: 7, bifurcacoes: 3,
    moedas: 3, flores: 3, impulsos: 1, perigos: 2,
  },
  {
    id: 'fase-9', nome: 'Coração do Lago',
    descricao: 'Tudo misturado: olhe bem o sinal antes de pular! + ou −?',
    pool: misto, saltos: 7, bifurcacoes: 3,
    moedas: 3, flores: 3, impulsos: 1, perigos: 2,
  },
  {
    id: 'fase-10', nome: 'Trono da Lótus',
    descricao: 'A última travessia — misto, longo e com plantas famintas. Boa sorte, Sapo Mestre!',
    pool: misto, saltos: 8, bifurcacoes: 3,
    moedas: 3, flores: 3, impulsos: 1, perigos: 2,
  },
];
