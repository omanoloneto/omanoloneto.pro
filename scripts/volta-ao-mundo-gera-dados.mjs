// Gera src/data/volta-ao-mundo.ts a partir do world-atlas (Natural Earth, domínio público).
// Uso: node scripts/volta-ao-mundo-gera-dados.mjs (requer devDependencies instaladas)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { feature } from 'topojson-client';
import { geoNaturalEarth1, geoPath, geoBounds } from 'd3-geo';

const REPO = new URL('..', import.meta.url).pathname;
const topo = JSON.parse(readFileSync(`${REPO}/node_modules/world-atlas/countries-110m.json`, 'utf8'));
const geo = feature(topo, topo.objects.countries);

const W = 1000, H = 520;
const projection = geoNaturalEarth1().fitSize([W, H], { type: 'Sphere' });
const path = geoPath(projection);

// ===== Países curados: id numérico (ISO 3166-1) → dados PT-BR =====
// nome: com artigo embutido pra frase "Onde fica …?"
const CURADOS = {
  // —— América do Sul ——
  '076': { cc: 'br', nome: 'o Brasil', cont: 'america-sul' },
  '032': { cc: 'ar', nome: 'a Argentina', cont: 'america-sul' },
  '152': { cc: 'cl', nome: 'o Chile', cont: 'america-sul' },
  '604': { cc: 'pe', nome: 'o Peru', cont: 'america-sul' },
  '170': { cc: 'co', nome: 'a Colômbia', cont: 'america-sul' },
  '862': { cc: 've', nome: 'a Venezuela', cont: 'america-sul' },
  '068': { cc: 'bo', nome: 'a Bolívia', cont: 'america-sul' },
  '600': { cc: 'py', nome: 'o Paraguai', cont: 'america-sul' },
  '858': { cc: 'uy', nome: 'o Uruguai', cont: 'america-sul' },
  '218': { cc: 'ec', nome: 'o Equador', cont: 'america-sul' },
  '328': { cc: 'gy', nome: 'a Guiana', cont: 'america-sul' },
  '740': { cc: 'sr', nome: 'o Suriname', cont: 'america-sul' },
  // —— Américas (Norte e Central) ——
  '840': { cc: 'us', nome: 'os Estados Unidos', cont: 'americas' },
  '124': { cc: 'ca', nome: 'o Canadá', cont: 'americas' },
  '484': { cc: 'mx', nome: 'o México', cont: 'americas' },
  '192': { cc: 'cu', nome: 'Cuba', cont: 'americas' },
  '320': { cc: 'gt', nome: 'a Guatemala', cont: 'americas' },
  '340': { cc: 'hn', nome: 'Honduras', cont: 'americas' },
  '558': { cc: 'ni', nome: 'a Nicarágua', cont: 'americas' },
  '188': { cc: 'cr', nome: 'a Costa Rica', cont: 'americas' },
  '591': { cc: 'pa', nome: 'o Panamá', cont: 'americas' },
  // —— Europa ——
  '620': { cc: 'pt', nome: 'Portugal', cont: 'europa' },
  '724': { cc: 'es', nome: 'a Espanha', cont: 'europa' },
  '250': { cc: 'fr', nome: 'a França', cont: 'europa' },
  '380': { cc: 'it', nome: 'a Itália', cont: 'europa' },
  '276': { cc: 'de', nome: 'a Alemanha', cont: 'europa' },
  '826': { cc: 'gb', nome: 'o Reino Unido', cont: 'europa' },
  '372': { cc: 'ie', nome: 'a Irlanda', cont: 'europa' },
  '352': { cc: 'is', nome: 'a Islândia', cont: 'europa' },
  '578': { cc: 'no', nome: 'a Noruega', cont: 'europa' },
  '752': { cc: 'se', nome: 'a Suécia', cont: 'europa' },
  '246': { cc: 'fi', nome: 'a Finlândia', cont: 'europa' },
  '616': { cc: 'pl', nome: 'a Polônia', cont: 'europa' },
  '804': { cc: 'ua', nome: 'a Ucrânia', cont: 'europa' },
  '642': { cc: 'ro', nome: 'a Romênia', cont: 'europa' },
  '300': { cc: 'gr', nome: 'a Grécia', cont: 'europa' },
  '792': { cc: 'tr', nome: 'a Turquia', cont: 'europa' },
  // —— África ——
  '818': { cc: 'eg', nome: 'o Egito', cont: 'africa' },
  '504': { cc: 'ma', nome: 'o Marrocos', cont: 'africa' },
  '012': { cc: 'dz', nome: 'a Argélia', cont: 'africa' },
  '434': { cc: 'ly', nome: 'a Líbia', cont: 'africa' },
  '566': { cc: 'ng', nome: 'a Nigéria', cont: 'africa' },
  '231': { cc: 'et', nome: 'a Etiópia', cont: 'africa' },
  '404': { cc: 'ke', nome: 'o Quênia', cont: 'africa' },
  '834': { cc: 'tz', nome: 'a Tanzânia', cont: 'africa' },
  '024': { cc: 'ao', nome: 'Angola', cont: 'africa' },
  '508': { cc: 'mz', nome: 'Moçambique', cont: 'africa' },
  '710': { cc: 'za', nome: 'a África do Sul', cont: 'africa' },
  '450': { cc: 'mg', nome: 'Madagascar', cont: 'africa' },
  '180': { cc: 'cd', nome: 'a República Democrática do Congo', cont: 'africa' },
  '729': { cc: 'sd', nome: 'o Sudão', cont: 'africa' },
  // —— Ásia & Oceania ——
  '643': { cc: 'ru', nome: 'a Rússia', cont: 'asia-oceania' },
  '156': { cc: 'cn', nome: 'a China', cont: 'asia-oceania' },
  '356': { cc: 'in', nome: 'a Índia', cont: 'asia-oceania' },
  '392': { cc: 'jp', nome: 'o Japão', cont: 'asia-oceania' },
  '410': { cc: 'kr', nome: 'a Coreia do Sul', cont: 'asia-oceania' },
  '764': { cc: 'th', nome: 'a Tailândia', cont: 'asia-oceania' },
  '704': { cc: 'vn', nome: 'o Vietnã', cont: 'asia-oceania' },
  '360': { cc: 'id', nome: 'a Indonésia', cont: 'asia-oceania' },
  '608': { cc: 'ph', nome: 'as Filipinas', cont: 'asia-oceania' },
  '682': { cc: 'sa', nome: 'a Arábia Saudita', cont: 'asia-oceania' },
  '364': { cc: 'ir', nome: 'o Irã', cont: 'asia-oceania' },
  '368': { cc: 'iq', nome: 'o Iraque', cont: 'asia-oceania' },
  '586': { cc: 'pk', nome: 'o Paquistão', cont: 'asia-oceania' },
  '004': { cc: 'af', nome: 'o Afeganistão', cont: 'asia-oceania' },
  '398': { cc: 'kz', nome: 'o Cazaquistão', cont: 'asia-oceania' },
  '496': { cc: 'mn', nome: 'a Mongólia', cont: 'asia-oceania' },
  '036': { cc: 'au', nome: 'a Austrália', cont: 'asia-oceania' },
  '554': { cc: 'nz', nome: 'a Nova Zelândia', cont: 'asia-oceania' },
};

// ===== Mapa de fundo: todos os países =====
const mapa = [];
const porId = {};
for (const f of geo.features) {
  const d = path(f);
  if (!d) continue;
  const id = String(f.id).padStart(3, '0');
  if (id === '010') continue; // Antártida fora: esticada na projeção e sem uso no jogo
  mapa.push({ id, d: d.replace(/(\d)\.(\d)\d+/g, '$1.$2') }); // 1 casa decimal
  porId[id] = f;
}

// ===== Países curados com centroide =====
const paises = [];
for (const [id, info] of Object.entries(CURADOS)) {
  const f = porId[id];
  if (!f) { console.error('NÃO ACHOU no atlas:', id, info.nome); continue; }
  const [cx, cy] = path.centroid(f);
  paises.push({ id, cc: info.cc, nome: info.nome, cont: info.cont, cx: +cx.toFixed(1), cy: +cy.toFixed(1) });
}

// ===== Níveis com viewBox pelo bbox dos países do nível =====
function bboxDe(ids, extraIds = []) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const id of [...ids, ...extraIds]) {
    const f = porId[id];
    if (!f) continue;
    // Rússia/EUA/França cruzam o antimeridiano ou têm territórios longe:
    // usa o bounds projetado do path inteiro mesmo (Natural Earth é contínuo).
    const [[bx0, by0], [bx1, by1]] = path.bounds(f);
    x0 = Math.min(x0, bx0); y0 = Math.min(y0, by0);
    x1 = Math.max(x1, bx1); y1 = Math.max(y1, by1);
  }
  return [x0, y0, x1, y1];
}
function viewBoxDe(ids, folga = 24) {
  let [x0, y0, x1, y1] = bboxDe(ids);
  x0 -= folga; y0 -= folga; x1 += folga; y1 += folga;
  x0 = Math.max(0, x0); y0 = Math.max(0, y0);
  x1 = Math.min(W, x1); y1 = Math.min(H, y1);
  return `${x0.toFixed(0)} ${y0.toFixed(0)} ${(x1 - x0).toFixed(0)} ${(y1 - y0).toFixed(0)}`;
}
const idsDe = (cont) => paises.filter((p) => p.cont === cont).map((p) => p.id);

const amSul = idsDe('america-sul');
const amNorte = idsDe('americas');
const europa = idsDe('europa');
const africa = idsDe('africa');
const asia = idsDe('asia-oceania');

// Mundo: mistura representativa (não todos, pra fase final não ser infinita)
const mundo = ['076', '840', '124', '484', '032', '620', '250', '380', '276', '818', '566', '710', '450', '643', '156', '356', '392', '360', '036', '682'];

const niveis = [
  { nome: 'América do Sul', emoji: '🦜', paises: amSul, viewBox: viewBoxDe(amSul) },
  { nome: 'Américas', emoji: '🌎', paises: amNorte, viewBox: viewBoxDe([...amNorte, ...amSul]) },
  { nome: 'Europa', emoji: '🏰', paises: europa, viewBox: viewBoxDe(europa) },
  { nome: 'África', emoji: '🦁', paises: africa, viewBox: viewBoxDe(africa) },
  // A Rússia cruza o antimeridiano (aparece nas duas bordas do mapa), então o
  // enquadramento é calculado sem ela — ela é gigante e continua bem visível.
  { nome: 'Ásia e Oceania', emoji: '🐼', paises: asia, viewBox: viewBoxDe(asia.filter((id) => id !== '643'), 30) },
  // Mundo: corta a faixa vazia onde ficava a Antártida (bbox de todos os países).
  { nome: 'O mundo todo!', emoji: '🌍', paises: mundo, viewBox: viewBoxDe(Object.keys(porId).filter((id) => id !== '010'), 10) },
];

const ts = `// ============================================================
//  Dados do jogo Volta ao Mundo — GERADO por script, não edite à mão.
//  Mapa: Natural Earth (domínio público) via world-atlas, projeção
//  Natural Earth I, viewBox ${W}×${H}. Pra regenerar/curar países,
//  veja o script referenciado no README.
// ============================================================

export type PaisMapa = { id: string; d: string };
export type Pais = { id: string; cc: string; nome: string; cont: string; cx: number; cy: number };
export type Nivel = { nome: string; emoji: string; paises: string[]; viewBox: string };

export const config = {
  largura: ${W},
  altura: ${H},
  // Pontos por acerto; bônus se acertar sem errar nenhuma vez.
  pontosAcerto: 10,
  bonusPrimeira: 5,
  vidasIniciais: 3,
  // A cada N acertos de primeira, recupera 1 vida (no modo com vidas).
  acertosPraVida: 3,
} as const;

export const mapa: PaisMapa[] = ${JSON.stringify(mapa)};

export const paises: Pais[] = ${JSON.stringify(paises, null, 2)};

export const niveis: Nivel[] = ${JSON.stringify(niveis, null, 2)};
`;
writeFileSync(`${REPO}/src/data/volta-ao-mundo.ts`, ts);
console.log('países:', paises.length, '| paths do mapa:', mapa.length);
console.log('níveis:', niveis.map((n) => `${n.nome}(${n.paises.length}) vb=${n.viewBox}`).join('\n  '));

// ===== Bandeiras =====
mkdirSync(`${REPO}/public/class/games/volta-ao-mundo/flags`, { recursive: true });
for (const p of paises) {
  const url = `https://raw.githubusercontent.com/lipis/flag-icons/main/flags/4x3/${p.cc}.svg`;
  const res = await fetch(url);
  if (!res.ok) { console.error('FALHOU bandeira', p.cc, res.status); continue; }
  writeFileSync(`${REPO}/public/class/games/volta-ao-mundo/flags/${p.cc}.svg`, await res.text());
}
console.log('bandeiras baixadas.');
