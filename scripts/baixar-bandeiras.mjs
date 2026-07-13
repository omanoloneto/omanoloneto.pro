// ============================================================
//  Baixa as bandeiras SVG dos países curados (flagcdn.com,
//  domínio público) pra public/class/img/flags/<iso>.svg.
//  Roda UMA vez (outputs commitados):
//    node scripts/baixar-bandeiras.mjs
// ============================================================
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const tsFonte = readFileSync(join(raiz, 'src/data/caca-bandeiras.ts'), 'utf8');
const isos = [...tsFonte.matchAll(/iso: '([a-z]{2})'/g)].map((m) => m[1]);
if (isos.length < 70) throw new Error('regex leu só ' + isos.length + ' isos — formato mudou?');

const destino = join(raiz, 'public/class/img/flags');
mkdirSync(destino, { recursive: true });

let total = 0;
for (const iso of isos) {
  const r = await fetch(`https://flagcdn.com/${iso}.svg`);
  if (!r.ok) throw new Error(`flagcdn ${iso}: HTTP ${r.status}`);
  const svg = await r.text();
  writeFileSync(join(destino, iso + '.svg'), svg);
  total += svg.length;
}
console.log(`✓ ${isos.length} bandeiras, ${(total / 1024).toFixed(0)}KB no total`);
