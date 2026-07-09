// ============================================================
//  Jogo "Sapo Saltador" — soma e subtração na reta numérica.
//  Público: crianças do 1º ano (~6-7 anos). BNCC EF01MA06/EF01MA08.
//  O data file enumera TODAS as continhas válidas de cada nível
//  (determinístico em build); o client sorteia `quantidade` delas
//  por partida. EDITE as regras dos níveis livremente.
// ============================================================

export type Operacao = '+' | '-';

export type Continha = {
  // primeiro número — pedra onde o sapo começa
  a: number;
  // segundo número — quantos pulos
  b: number;
  // '+' = pulos pra frente; '-' = pulos pra trás
  op: Operacao;
  // resultado pré-calculado (sempre 0..retaMax)
  resultado: number;
};

export type Nivel = {
  id: string;
  nome: string;
  // aviso mostrado no modal antes do nível começar
  descricao: string;
  // quantas continhas sortear do pool por partida
  quantidade: number;
  // todas as continhas válidas do nível (o client sorteia daqui)
  pool: Continha[];
};

export const config = {
  retaMin: 0,
  retaMax: 20,
  // moscas ganhas por acerto
  pontosPorAcerto: 10,
  // bônus se acertou sem nenhum erro na continha
  bonusPrimeira: 5,
  // a partir deste nº de erros, a pedra certa pisca
  errosParaDica: 2,
  // pulo de 1 casa (botões ±1 / setas)
  duracaoPuloMs: 320,
  // salto direto (toque na pedra)
  duracaoSaltoMs: 650,
  somLigadoInicial: true,
} as const;

type Regra = {
  op: Operacao;
  resultadoMin: number;
  resultadoMax: number;
  // maior valor de b (nº de pulos) — controla o tamanho da contagem
  bMax: number;
};

// Enumera todas as continhas válidas da regra. b >= 1 (b=0 = sapo
// parado), resultado nunca negativo nem acima do teto, e na
// subtração o ponto de partida `a` também respeita o teto.
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

// Rampa: soma curta → soma cruzando o 10 → subtração curta →
// subtração até 20 → misto. bMax pequeno nos níveis de entrada
// mantém a contagem de pulos curta enquanto a mecânica é nova.
export const niveis: Nivel[] = [
  {
    id: 'nivel-1',
    nome: 'Pulinhos até 10',
    descricao: 'Some pulando pra frente! Use os botões +1 pra contar os pulos.',
    quantidade: 5,
    pool: gerarPool({ op: '+', resultadoMin: 2, resultadoMax: 10, bMax: 4 }),
  },
  {
    id: 'nivel-2',
    nome: 'Saltos até 20',
    descricao: 'Agora as somas passam do 10 — a reta fica maior!',
    quantidade: 6,
    pool: gerarPool({ op: '+', resultadoMin: 11, resultadoMax: 20, bMax: 9 }),
  },
  {
    id: 'nivel-3',
    nome: 'Pulos pra trás',
    descricao: 'Chegou a subtração: agora o sapo pula pra trás! Use o −1.',
    quantidade: 5,
    pool: gerarPool({ op: '-', resultadoMin: 0, resultadoMax: 10, bMax: 4 }),
  },
  {
    id: 'nivel-4',
    nome: 'Pra trás até 20',
    descricao: 'Subtrações maiores — conte os pulos pra trás com calma.',
    quantidade: 6,
    pool: gerarPool({ op: '-', resultadoMin: 0, resultadoMax: 20, bMax: 9 }),
  },
  {
    id: 'nivel-5',
    nome: 'Sapo Mestre',
    descricao: 'Tudo misturado: olhe bem o sinal antes de pular! + ou −?',
    quantidade: 8,
    pool: [
      ...gerarPool({ op: '+', resultadoMin: 2, resultadoMax: 20, bMax: 9 }),
      ...gerarPool({ op: '-', resultadoMin: 0, resultadoMax: 20, bMax: 9 }),
    ],
  },
];
