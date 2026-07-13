// ============================================================
//  Gera src/data/mapa-mundi.svg + src/data/mapa-mundi-meta.json
//  a partir do Natural Earth 110m (domínio público, via world-atlas).
//
//  Roda UMA vez (outputs commitados — não faz parte do build):
//    node scripts/gerar-mapa.mjs
//
//  - 1 <path> por país com data-iso (alpha-2 minúsculo) e data-nome (PT)
//  - Antártida excluída
//  - territórios sem ISO (Kosovo etc.) viram .terra-neutra (não clicáveis)
//  - viewBoxes por continente calculados dos países CURADOS
//    (lidos por regex de src/data/caca-bandeiras.ts)
// ============================================================
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as topojson from 'topojson-client';
import { geoPath } from 'd3-geo';
import { geoMiller } from 'd3-geo-projection';
import countries from 'i18n-iso-countries';
import ptLocale from 'i18n-iso-countries/langs/pt.json' with { type: 'json' };

countries.registerLocale(ptLocale);

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const topo = JSON.parse(readFileSync(join(raiz, 'node_modules/world-atlas/countries-110m.json'), 'utf8'));

// países curados: {iso -> continente} e {iso -> nome PT-BR manual}
const tsFonte = readFileSync(join(raiz, 'src/data/caca-bandeiras.ts'), 'utf8');
const curados = new Map();
const nomesManuais = new Map();
for (const m of tsFonte.matchAll(/iso: '([a-z]{2})', nome: '([^']+)', artigo: '[^']*', continente: '(\w+)'/g)) {
  curados.set(m[1], m[3]);
  nomesManuais.set(m[1], m[2]);
}
if (curados.size < 70) throw new Error('regex leu só ' + curados.size + ' países do .ts — formato mudou?');

const feats = topojson.feature(topo, topo.objects.countries).features
  .filter((f) => f.id !== '010'); // sem Antártida

// Miller: projeção de atlas escolar — retângulo reto, sem curvar a Ásia
const proj = geoMiller().fitWidth(1000, { type: 'Sphere' });
const caminho = geoPath(proj).digits(1);

// bbox do maior polígono (evita Guiana Francesa esticar a França,
// e ilhas distantes estragarem os enquadramentos)
function boundsMaiorPoligono(f) {
  if (f.geometry.type === 'Polygon') return caminho.bounds(f);
  let melhor = null;
  let maiorArea = -1;
  for (const coords of f.geometry.coordinates) {
    const poli = { type: 'Feature', geometry: { type: 'Polygon', coordinates: coords } };
    const area = caminho.area(poli);
    if (area > maiorArea) { maiorArea = area; melhor = poli; }
  }
  return caminho.bounds(melhor);
}

let paths = '';
const encontrados = new Set();
const bboxPorContinente = {}; // continente -> [x0,y0,x1,y1]
let bboxMundo = null;

function acumular(alvo, b) {
  if (!alvo) return [b[0][0], b[0][1], b[1][0], b[1][1]];
  return [
    Math.min(alvo[0], b[0][0]), Math.min(alvo[1], b[0][1]),
    Math.max(alvo[2], b[1][0]), Math.max(alvo[3], b[1][1]),
  ];
}

for (const f of feats) {
  const d = caminho(f);
  if (!d) continue;
  const alpha2 = countries.numericToAlpha2(f.id);
  bboxMundo = acumular(bboxMundo, caminho.bounds(f));
  if (!alpha2) {
    paths += `<path class="terra-neutra" d="${d}"/>\n`;
    continue;
  }
  const iso = alpha2.toLowerCase();
  encontrados.add(iso);
  const nome = nomesManuais.get(iso) || countries.getName(alpha2, 'pt') || f.properties.name;
  paths += `<path data-iso="${iso}" data-nome="${nome}" d="${d}"/>\n`;
  const cont = curados.get(iso);
  // Rússia fora do bbox da Ásia: o maior polígono cruza o antimeridiano
  // e faria o zoom da Ásia virar o mundo inteiro
  if (cont && iso !== 'ru') {
    bboxPorContinente[cont] = acumular(bboxPorContinente[cont], boundsMaiorPoligono(f));
  }
}

// valida: todo país curado existe no 110m
const faltando = [...curados.keys()].filter((iso) => !encontrados.has(iso));
if (faltando.length) throw new Error('países curados ausentes no mapa 110m: ' + faltando.join(', '));

function viewBoxDe(bb, pad) {
  const w = bb[2] - bb[0];
  const h = bb[3] - bb[1];
  const px = w * pad;
  const py = h * pad;
  const arr = [bb[0] - px, bb[1] - py, w + 2 * px, h + 2 * py];
  return arr.map((n) => Math.round(n * 10) / 10).join(' ');
}

const vbMundo = viewBoxDe(bboxMundo, 0.01);
const meta = { viewBoxes: { mundo: vbMundo } };
for (const [cont, bb] of Object.entries(bboxPorContinente)) {
  meta.viewBoxes[cont] = viewBoxDe(bb, 0.08);
}

const svg =
  `<svg class="mapa" viewBox="${vbMundo}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mapa-múndi">\n` +
  `<!-- Gerado por scripts/gerar-mapa.mjs — Natural Earth 110m (domínio público) -->\n` +
  paths +
  `</svg>\n`;

writeFileSync(join(raiz, 'src/data/mapa-mundi.svg'), svg);
writeFileSync(join(raiz, 'src/data/mapa-mundi-meta.json'), JSON.stringify(meta, null, 2) + '\n');

console.log('✓ mapa-mundi.svg:', (svg.length / 1024).toFixed(0) + 'KB,', encontrados.size, 'países com iso');
console.log('✓ viewBoxes:', Object.keys(meta.viewBoxes).join(', '));
