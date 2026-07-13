// ============================================================
//  Jogo "Caça-Bandeiras" — a bandeira aparece, ache o país no mapa!
//  Público: crianças ~6-10 anos. 80 países curados por dificuldade
//  (sem micro-países difíceis de clicar).
//
//  IMPORTANTE: cada país fica em UMA linha — os scripts
//  scripts/gerar-mapa.mjs e scripts/baixar-bandeiras.mjs leem este
//  arquivo por regex pra saber os isos/continentes curados.
//
//  Curiosidade pedagógica: no mapa (Natural Earth 110m) a França
//  inclui a Guiana Francesa — vizinha do Brasil! Clicar lá conta
//  como França, o que é geograficamente correto.
// ============================================================

export type Continente = 'americaNorte' | 'americaSul' | 'europa' | 'africa' | 'asia' | 'oceania';

export type Pais = {
  iso: string;              // ISO 3166-1 alpha-2 minúsculo (casa com flagcdn e data-iso do mapa)
  nome: string;             // nome PT-BR (fonte de verdade — ignora i18n)
  artigo: 'o' | 'a' | 'os' | 'as' | ''; // pra frases naturais: "Era o Japão!" / "Era Portugal!"
  continente: Continente;
  dificuldade: 1 | 2 | 3 | 4 | 5;
};

export const paises: Pais[] = [
  // ----- D1: Brasil + gigantes icônicos (12) -----
  { iso: 'br', nome: 'Brasil', artigo: 'o', continente: 'americaSul', dificuldade: 1 },
  { iso: 'ar', nome: 'Argentina', artigo: 'a', continente: 'americaSul', dificuldade: 1 },
  { iso: 'us', nome: 'Estados Unidos', artigo: 'os', continente: 'americaNorte', dificuldade: 1 },
  { iso: 'cn', nome: 'China', artigo: 'a', continente: 'asia', dificuldade: 1 },
  { iso: 'ru', nome: 'Rússia', artigo: 'a', continente: 'asia', dificuldade: 1 },
  { iso: 'ca', nome: 'Canadá', artigo: 'o', continente: 'americaNorte', dificuldade: 1 },
  { iso: 'au', nome: 'Austrália', artigo: 'a', continente: 'oceania', dificuldade: 1 },
  { iso: 'jp', nome: 'Japão', artigo: 'o', continente: 'asia', dificuldade: 1 },
  { iso: 'mx', nome: 'México', artigo: 'o', continente: 'americaNorte', dificuldade: 1 },
  { iso: 'it', nome: 'Itália', artigo: 'a', continente: 'europa', dificuldade: 1 },
  { iso: 'fr', nome: 'França', artigo: 'a', continente: 'europa', dificuldade: 1 },
  { iso: 'pt', nome: 'Portugal', artigo: '', continente: 'europa', dificuldade: 1 },
  // ----- D2: vizinhos da América do Sul + famosos (16) -----
  { iso: 'uy', nome: 'Uruguai', artigo: 'o', continente: 'americaSul', dificuldade: 2 },
  { iso: 'py', nome: 'Paraguai', artigo: 'o', continente: 'americaSul', dificuldade: 2 },
  { iso: 'cl', nome: 'Chile', artigo: 'o', continente: 'americaSul', dificuldade: 2 },
  { iso: 'bo', nome: 'Bolívia', artigo: 'a', continente: 'americaSul', dificuldade: 2 },
  { iso: 'pe', nome: 'Peru', artigo: 'o', continente: 'americaSul', dificuldade: 2 },
  { iso: 'co', nome: 'Colômbia', artigo: 'a', continente: 'americaSul', dificuldade: 2 },
  { iso: 've', nome: 'Venezuela', artigo: 'a', continente: 'americaSul', dificuldade: 2 },
  { iso: 'ec', nome: 'Equador', artigo: 'o', continente: 'americaSul', dificuldade: 2 },
  { iso: 'es', nome: 'Espanha', artigo: 'a', continente: 'europa', dificuldade: 2 },
  { iso: 'de', nome: 'Alemanha', artigo: 'a', continente: 'europa', dificuldade: 2 },
  { iso: 'gb', nome: 'Reino Unido', artigo: 'o', continente: 'europa', dificuldade: 2 },
  { iso: 'in', nome: 'Índia', artigo: 'a', continente: 'asia', dificuldade: 2 },
  { iso: 'eg', nome: 'Egito', artigo: 'o', continente: 'africa', dificuldade: 2 },
  { iso: 'za', nome: 'África do Sul', artigo: 'a', continente: 'africa', dificuldade: 2 },
  { iso: 'kr', nome: 'Coreia do Sul', artigo: 'a', continente: 'asia', dificuldade: 2 },
  { iso: 'gr', nome: 'Grécia', artigo: 'a', continente: 'europa', dificuldade: 2 },
  // ----- D3: reconhecíveis de segundo escalão (18) -----
  { iso: 'gy', nome: 'Guiana', artigo: 'a', continente: 'americaSul', dificuldade: 3 },
  { iso: 'sr', nome: 'Suriname', artigo: 'o', continente: 'americaSul', dificuldade: 3 },
  { iso: 'cu', nome: 'Cuba', artigo: '', continente: 'americaNorte', dificuldade: 3 },
  { iso: 'jm', nome: 'Jamaica', artigo: 'a', continente: 'americaNorte', dificuldade: 3 },
  { iso: 'pa', nome: 'Panamá', artigo: 'o', continente: 'americaNorte', dificuldade: 3 },
  { iso: 'cr', nome: 'Costa Rica', artigo: 'a', continente: 'americaNorte', dificuldade: 3 },
  { iso: 'ma', nome: 'Marrocos', artigo: 'o', continente: 'africa', dificuldade: 3 },
  { iso: 'ng', nome: 'Nigéria', artigo: 'a', continente: 'africa', dificuldade: 3 },
  { iso: 'ke', nome: 'Quênia', artigo: 'o', continente: 'africa', dificuldade: 3 },
  { iso: 'tr', nome: 'Turquia', artigo: 'a', continente: 'asia', dificuldade: 3 },
  { iso: 'sa', nome: 'Arábia Saudita', artigo: 'a', continente: 'asia', dificuldade: 3 },
  { iso: 'il', nome: 'Israel', artigo: '', continente: 'asia', dificuldade: 3 },
  { iso: 'th', nome: 'Tailândia', artigo: 'a', continente: 'asia', dificuldade: 3 },
  { iso: 'vn', nome: 'Vietnã', artigo: 'o', continente: 'asia', dificuldade: 3 },
  { iso: 'id', nome: 'Indonésia', artigo: 'a', continente: 'asia', dificuldade: 3 },
  { iso: 'ph', nome: 'Filipinas', artigo: 'as', continente: 'asia', dificuldade: 3 },
  { iso: 'nz', nome: 'Nova Zelândia', artigo: 'a', continente: 'oceania', dificuldade: 3 },
  { iso: 'ch', nome: 'Suíça', artigo: 'a', continente: 'europa', dificuldade: 3 },
  // ----- D4: Europa de bandeiras parecidas + Ásia (18) -----
  { iso: 'se', nome: 'Suécia', artigo: 'a', continente: 'europa', dificuldade: 4 },
  { iso: 'no', nome: 'Noruega', artigo: 'a', continente: 'europa', dificuldade: 4 },
  { iso: 'dk', nome: 'Dinamarca', artigo: 'a', continente: 'europa', dificuldade: 4 },
  { iso: 'fi', nome: 'Finlândia', artigo: 'a', continente: 'europa', dificuldade: 4 },
  { iso: 'is', nome: 'Islândia', artigo: 'a', continente: 'europa', dificuldade: 4 },
  { iso: 'nl', nome: 'Países Baixos', artigo: 'os', continente: 'europa', dificuldade: 4 },
  { iso: 'be', nome: 'Bélgica', artigo: 'a', continente: 'europa', dificuldade: 4 },
  { iso: 'at', nome: 'Áustria', artigo: 'a', continente: 'europa', dificuldade: 4 },
  { iso: 'pl', nome: 'Polônia', artigo: 'a', continente: 'europa', dificuldade: 4 },
  { iso: 'ua', nome: 'Ucrânia', artigo: 'a', continente: 'europa', dificuldade: 4 },
  { iso: 'cz', nome: 'Tchéquia', artigo: 'a', continente: 'europa', dificuldade: 4 },
  { iso: 'hu', nome: 'Hungria', artigo: 'a', continente: 'europa', dificuldade: 4 },
  { iso: 'hr', nome: 'Croácia', artigo: 'a', continente: 'europa', dificuldade: 4 },
  { iso: 'ro', nome: 'Romênia', artigo: 'a', continente: 'europa', dificuldade: 4 },
  { iso: 'pk', nome: 'Paquistão', artigo: 'o', continente: 'asia', dificuldade: 4 },
  { iso: 'bd', nome: 'Bangladesh', artigo: '', continente: 'asia', dificuldade: 4 },
  { iso: 'ir', nome: 'Irã', artigo: 'o', continente: 'asia', dificuldade: 4 },
  { iso: 'iq', nome: 'Iraque', artigo: 'o', continente: 'asia', dificuldade: 4 },
  // ----- D5: pegadinhas — bandeiras quase gêmeas (16) -----
  { iso: 'ie', nome: 'Irlanda', artigo: 'a', continente: 'europa', dificuldade: 5 },
  { iso: 'ci', nome: 'Costa do Marfim', artigo: 'a', continente: 'africa', dificuldade: 5 },
  { iso: 'td', nome: 'Chade', artigo: 'o', continente: 'africa', dificuldade: 5 },
  { iso: 'ml', nome: 'Mali', artigo: 'o', continente: 'africa', dificuldade: 5 },
  { iso: 'sn', nome: 'Senegal', artigo: 'o', continente: 'africa', dificuldade: 5 },
  { iso: 'gn', nome: 'Guiné', artigo: 'a', continente: 'africa', dificuldade: 5 },
  { iso: 'et', nome: 'Etiópia', artigo: 'a', continente: 'africa', dificuldade: 5 },
  { iso: 'gh', nome: 'Gana', artigo: '', continente: 'africa', dificuldade: 5 },
  { iso: 'cm', nome: 'Camarões', artigo: 'os', continente: 'africa', dificuldade: 5 },
  { iso: 'hn', nome: 'Honduras', artigo: '', continente: 'americaNorte', dificuldade: 5 },
  { iso: 'ni', nome: 'Nicarágua', artigo: 'a', continente: 'americaNorte', dificuldade: 5 },
  { iso: 'mn', nome: 'Mongólia', artigo: 'a', continente: 'asia', dificuldade: 5 },
  { iso: 'kz', nome: 'Cazaquistão', artigo: 'o', continente: 'asia', dificuldade: 5 },
  { iso: 'dz', nome: 'Argélia', artigo: 'a', continente: 'africa', dificuldade: 5 },
  { iso: 'tn', nome: 'Tunísia', artigo: 'a', continente: 'africa', dificuldade: 5 },
  { iso: 'mm', nome: 'Mianmar', artigo: '', continente: 'asia', dificuldade: 5 },
];

export const config = {
  // ----- pontuação do treino -----
  pontosAcerto: 100,
  bonusVelocidadeMax: 100,   // bônus extra se responder rápido...
  tempoBonusMs: 10000,       // ...dentro desta janela (decai linear)
  bonusNivel: 150,           // completar um nível
  // ----- vidas (modo com vidas) -----
  vidasIniciais: 3,
  vidasMaximas: 3,
  acertosPraRecuperarVida: 6, // acertos SEGUIDOS recuperam 1 coração
  // ----- ritmos -----
  revelacaoMs: 2600,          // tempo mostrando acerto/erro antes da próxima bandeira
  bannerNivelMs: 2200,
  respiroEntreNiveisMs: 800,
  // ----- ranking (contrato do ranking.php) -----
  rankingMax: 10,
  nomeMin: 2,
  nomeMax: 6,
  somLigadoInicial: true,
  // ----- modo sala (multiplayer) -----
  salaPollMs: 2000,
  salaPollLobbyMs: 2500,
  salaJitterMs: 300,
} as const;

// 10 níveis × 5 bandeiras = 50 acertos pra zerar (~10-15 min de aula)
export type Nivel = {
  id: string;
  nome: string;
  quantas: number;           // bandeiras pra acertar neste nível
  dificuldadeMax: 1 | 2 | 3 | 4 | 5; // pool = países com dificuldade <= max
  pesoNovato: number;        // chance de sortear da faixa recém-aberta
  zoomAjuda: boolean;        // mapa chega zoomado no continente da resposta
};

const NOMES_NIVEIS: Array<[string, 1 | 2 | 3 | 4 | 5]> = [
  ['Primeiros Voos', 1],
  ['Gigantes do Mundo', 1],
  ['Vizinhos da América', 2],
  ['Explorador das Américas', 2],
  ['Rumo à África e Ásia', 3],
  ['Volta ao Mundo', 3],
  ['Bandeiras da Europa', 4],
  ['Norte Gelado', 4],
  ['Bandeiras Gêmeas', 5],
  ['Mestre das Bandeiras', 5],
];

export const niveis: Nivel[] = NOMES_NIVEIS.map(([nome, dificuldadeMax], i) => ({
  id: 'nivel-' + (i + 1),
  nome,
  quantas: 5,
  dificuldadeMax,
  pesoNovato: 0.6,
  zoomAjuda: i < 4,
}));
