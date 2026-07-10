// ============================================================
//  Jogo "Letras Espaciais" — aperte a tecla da letra e a nave atira!
//  Público: crianças ~6-7 anos (1º ano), reconhecendo letra bastão
//  e encontrando as teclas no teclado.
//
//  São 30 níveis. Os primeiros 6 apresentam as letras (vogais →
//  alfabeto completo); do 7 em diante o desafio cresce pelas REGRAS
//  logo abaixo — edite os números delas pra calibrar a dificuldade.
// ============================================================

export type Nivel = {
  id: string;
  nome: string;
  // letras que aparecem nos inimigos deste nível (MAIÚSCULAS, sem repetição)
  letras: string[];
  // velocidade de descida: fração da altura da tela por segundo
  velocidade: number;
  // intervalo entre uma leva de inimigos e outra, em milissegundos
  intervaloSpawn: number;
  // quantos inimigos derrubar pra completar o nível
  abates: number;
  // quantos inimigos podem estar na tela ao mesmo tempo
  maxInimigos: number;
  // chance (0 a 1) de nascer uma nave com DUAS letras
  chanceDupla: number;
  // chance (0 a 1) de nascer uma nave com TRÊS letras
  // (se chanceDupla + chanceTripla = 1, não nasce mais nave de 1 letra)
  chanceTripla: number;
  // true = vogais sozinhas descem mais rápido (ver fatorVogal)
  vogaisRapidas: boolean;
  // quantos inimigos nascem por vez em cada leva
  spawnsPorVez: number;
};

export const config = {
  // pontos ganhos por LETRA acertada (nave de 3 letras vale 3x)
  pontosPorAcerto: 10,
  // modo com vidas: corações no começo e teto de corações
  vidasIniciais: 3,
  vidasMaximas: 3,
  // chance (0 a 1) de um abate soltar um coração — só quando falta vida
  chanceCoracao: 0.18,
  // modo tranquilo: com este tanto de inimigos esperando, param de chegar novos
  maxInimigosEsperando: 5,
  // tempo que o tiro leva da nave até o inimigo, em milissegundos
  duracaoTiroMs: 260,
  // nave de 2 letras: fração da velocidade normal (0.7 = 30% mais lenta)
  fatorDupla: 0.7,
  // nave de 3 letras: ainda mais lenta
  fatorTripla: 0.6,
  // vogais em níveis com vogaisRapidas: multiplicador (1.3 = 30% mais rápida)
  fatorVogal: 1.3,
  // altura da linha onde o inimigo para (tranquilo) ou foge (vidas):
  // fração da tela, 0 = topo, 1 = fundo
  linhaEspera: 0.8,
  somLigadoInicial: true,
  // ----- superaquecimento da arma (anti-apertar-tudo) -----
  // tecla errada esquenta a arma; barra cheia = arma trava um tempinho.
  // Calibrado pra punir só quem aperta tudo: erro isolado esfria sozinho
  // antes do próximo.
  calorPorErro: 0.28,             // 4 erros rápidos enchem a barra (mesmo com o decaimento)
  resfriarPorAcerto: 0.15,        // acertar esfria a arma
  calorDecaimentoPorSegundo: 0.1, // barra cheia esvazia sozinha em ~10s
  travaMs: 3000,                  // arma travada: barra drena de 100% a 0 neste tempo
  // ----- troca de nível (sem modal) -----
  respiroEntreNiveisMs: 2200,     // sem spawn enquanto o banner de nível está na tela
  bannerNivelMs: 2200,            // duração do banner "NÍVEL X" na tela
  // ----- ranking (localStorage, só modo com vidas) -----
  rankingMax: 10,
  nomeMin: 2,
  nomeMax: 6,
} as const;

// ============================================================
//  REGRAS DE DIFICULDADE — "a partir do nível X acontece Y".
//  Edite os números à vontade.
// ============================================================
const REGRAS = {
  // a partir deste nível, TODOS os inimigos ficam 30% mais rápidos
  nivelTurbo1: 6,
  turbo1: 1.3,
  // a partir deste nível começam as naves de TRÊS letras
  nivelTripla: 8,
  // a partir deste nível, mais 30% de velocidade pra todos
  nivelTurbo2: 10,
  turbo2: 1.3,
  // a partir deste nível NÃO nasce mais nave de 1 letra só
  nivelSemSolo: 12,
  // a partir deste nível nascem 2 inimigos por vez
  nivelLevaDupla: 14,
  // a partir deste nível a velocidade sobe 2% a cada nível
  nivelAceleracao: 16,
  aceleracaoPorNivel: 1.02,
} as const;

// Progressão de letras dos 6 primeiros níveis (do 6 em diante: alfabeto completo)
const LETRAS_POR_NIVEL: string[][] = [
  ['A', 'E', 'I', 'O', 'U'],
  ['A', 'E', 'I', 'O', 'U', 'B', 'C', 'D', 'F'],
  ['A', 'E', 'I', 'O', 'U', 'B', 'C', 'D', 'F', 'G', 'J', 'L', 'M'],
  ['A', 'E', 'I', 'O', 'U', 'B', 'C', 'D', 'F', 'G', 'J', 'L', 'M', 'N', 'P', 'R', 'S'],
  ['A', 'E', 'I', 'O', 'U', 'B', 'C', 'D', 'F', 'G', 'J', 'L', 'M', 'N', 'P', 'R', 'S', 'T', 'V', 'X', 'Z'],
  ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
];

// Ritmo-base dos 6 primeiros níveis (antes dos turbos das REGRAS)
const BASE_INICIAL = [
  { velocidade: 0.055, intervaloSpawn: 4200, abates: 8, maxInimigos: 3 },
  { velocidade: 0.065, intervaloSpawn: 3800, abates: 10, maxInimigos: 3 },
  { velocidade: 0.075, intervaloSpawn: 3400, abates: 10, maxInimigos: 4 },
  { velocidade: 0.085, intervaloSpawn: 3000, abates: 12, maxInimigos: 4 },
  { velocidade: 0.095, intervaloSpawn: 2700, abates: 12, maxInimigos: 5 },
  { velocidade: 0.105, intervaloSpawn: 2500, abates: 14, maxInimigos: 5 },
];

// Um nome por nível (30)
const NOMES = [
  'Patrulha das Vogais',
  'Chegam as Consoantes',
  'Meio do Alfabeto',
  'Esquadrão Crescendo',
  'Letras Espertas',
  'Alfabeto Completo',
  'Chuva de Meteoros',
  'Naves Triplas',
  'Cinturão de Asteroides',
  'Turbo Máximo',
  'Nebulosa Perdida',
  'Esquadrão Blindado',
  'Cometa Veloz',
  'Invasão em Dupla',
  'Tempestade Solar',
  'Aceleração Total',
  'Buraco Negro',
  'Galáxia Distante',
  'Anéis de Saturno',
  'Supernova',
  'Chuva de Estrelas',
  'Planeta Gelado',
  'Zona de Perigo',
  'Frota Fantasma',
  'Velocidade da Luz',
  'Império das Letras',
  'Última Fronteira',
  'Coração da Galáxia',
  'Missão Quase Impossível',
  'Campeão do Universo',
];

// Chance de nave dupla/tripla por nível
function chances(n: number): { dupla: number; tripla: number } {
  if (n < 3) return { dupla: 0, tripla: 0 };
  if (n < REGRAS.nivelTripla) {
    // rampa da dupla: 0.25 no nível 3 subindo até 0.4
    return { dupla: Math.min(0.25 + (n - 3) * 0.05, 0.4), tripla: 0 };
  }
  if (n < REGRAS.nivelSemSolo) {
    // tripla estreia em 0.15 e sobe 0.05 por nível; dupla segura em 0.35
    return { dupla: 0.35, tripla: Math.min(0.15 + (n - REGRAS.nivelTripla) * 0.05, 0.3) };
  }
  // sem solo: dupla + tripla = 1 (nave de 1 letra não nasce mais)
  return { dupla: 0.6, tripla: 0.4 };
}

function gerarNiveis(total: number): Nivel[] {
  const niveis: Nivel[] = [];
  for (let n = 1; n <= total; n++) {
    const base = BASE_INICIAL[Math.min(n, 6) - 1];
    let velocidade = base.velocidade;
    if (n >= REGRAS.nivelTurbo1) velocidade *= REGRAS.turbo1;
    if (n >= REGRAS.nivelTurbo2) velocidade *= REGRAS.turbo2;
    if (n >= REGRAS.nivelAceleracao) {
      velocidade *= Math.pow(REGRAS.aceleracaoPorNivel, n - REGRAS.nivelAceleracao + 1);
    }
    const { dupla, tripla } = chances(n);
    niveis.push({
      id: 'nivel-' + n,
      nome: NOMES[n - 1] || 'Missão ' + n,
      letras: LETRAS_POR_NIVEL[Math.min(n, 6) - 1],
      velocidade: Math.round(velocidade * 10000) / 10000,
      intervaloSpawn: base.intervaloSpawn,
      abates: n <= 6 ? base.abates : 15,
      maxInimigos: n >= REGRAS.nivelLevaDupla ? 6 : base.maxInimigos,
      chanceDupla: dupla,
      chanceTripla: tripla,
      vogaisRapidas: n >= 5,
      spawnsPorVez: n >= REGRAS.nivelLevaDupla ? 2 : 1,
    });
  }
  return niveis;
}

export const niveis: Nivel[] = gerarNiveis(30);
