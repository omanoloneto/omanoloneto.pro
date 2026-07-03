// ============================================================
//  Jogo "Letras Espaciais" — aperte a tecla da letra e a nave atira!
//  Público: crianças ~6-7 anos (1º ano), reconhecendo letra bastão
//  e encontrando as teclas no teclado. Os níveis começam nas vogais
//  e vão somando consoantes até o alfabeto completo. EDITE livremente.
// ============================================================

export type Nivel = {
  id: string;
  nome: string;
  // letras que aparecem nos inimigos deste nível (MAIÚSCULAS, sem repetição)
  letras: string[];
  // velocidade de descida: fração da altura da tela por segundo
  // (0.055 = o inimigo leva ~18 segundos pra descer tudo)
  velocidade: number;
  // intervalo entre um inimigo e outro, em milissegundos
  intervaloSpawn: number;
  // quantos inimigos derrubar pra completar o nível
  abates: number;
  // quantos inimigos podem estar na tela ao mesmo tempo
  maxInimigos: number;
};

export const config = {
  // pontos ganhos por inimigo derrubado
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
  // altura da linha onde o inimigo para (tranquilo) ou foge (vidas):
  // fração da tela, 0 = topo, 1 = fundo
  linhaEspera: 0.8,
  somLigadoInicial: true,
} as const;

// Rampa: letras acumulam (vogais primeiro, como no 1º ano) e o ritmo
// sobe devagar. As letras de cada nível estão POR EXTENSO — é só editar.
export const niveis: Nivel[] = [
  {
    id: 'nivel-1',
    nome: 'Patrulha das Vogais',
    letras: ['A', 'E', 'I', 'O', 'U'],
    velocidade: 0.055,
    intervaloSpawn: 4200,
    abates: 8,
    maxInimigos: 3,
  },
  {
    id: 'nivel-2',
    nome: 'Chegam as Consoantes',
    letras: ['A', 'E', 'I', 'O', 'U', 'B', 'C', 'D', 'F'],
    velocidade: 0.065,
    intervaloSpawn: 3800,
    abates: 10,
    maxInimigos: 3,
  },
  {
    id: 'nivel-3',
    nome: 'Meio do Alfabeto',
    letras: ['A', 'E', 'I', 'O', 'U', 'B', 'C', 'D', 'F', 'G', 'J', 'L', 'M'],
    velocidade: 0.075,
    intervaloSpawn: 3400,
    abates: 10,
    maxInimigos: 4,
  },
  {
    id: 'nivel-4',
    nome: 'Esquadrão Crescendo',
    letras: ['A', 'E', 'I', 'O', 'U', 'B', 'C', 'D', 'F', 'G', 'J', 'L', 'M', 'N', 'P', 'R', 'S'],
    velocidade: 0.085,
    intervaloSpawn: 3000,
    abates: 12,
    maxInimigos: 4,
  },
  {
    id: 'nivel-5',
    nome: 'Letras Espertas',
    letras: ['A', 'E', 'I', 'O', 'U', 'B', 'C', 'D', 'F', 'G', 'J', 'L', 'M', 'N', 'P', 'R', 'S', 'T', 'V', 'X', 'Z'],
    velocidade: 0.095,
    intervaloSpawn: 2700,
    abates: 12,
    maxInimigos: 5,
  },
  {
    id: 'nivel-6',
    nome: 'Alfabeto Completo',
    letras: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
    velocidade: 0.105,
    intervaloSpawn: 2500,
    abates: 14,
    maxInimigos: 5,
  },
];
