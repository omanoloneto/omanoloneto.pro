import { ranking as R, difSlug } from '../../data/bolhas-de-letras';
import type { DifficultyId } from '../../data/bolhas-de-letras';

export type Entrada = { nome: string; pontos: number; nivel: number; data: string };
export type Resultado = { lista: Entrada[]; online: boolean; entrada?: Entrada };

const gameKey = (diff: DifficultyId) => R.jogoBase + '-' + difSlug[diff];
const cacheKey = (diff: DifficultyId) => 'bolhas-de-letras:ranking:' + difSlug[diff];

export function sanitizeNome(bruto: string): string {
  return (bruto || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, R.nomeMax);
}

export function nomeValido(nome: string): boolean {
  const n = sanitizeNome(nome);
  return n.length >= R.nomeMin && n.length <= R.nomeMax;
}

function lerLocal(diff: DifficultyId): Entrada[] {
  try {
    const v = JSON.parse(localStorage.getItem(cacheKey(diff)) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function salvarLocal(diff: DifficultyId, lista: Entrada[]) {
  try {
    localStorage.setItem(cacheKey(diff), JSON.stringify(lista));
  } catch { }
}

async function fetchRanking(diff: DifficultyId, corpo?: Record<string, unknown>): Promise<Entrada[] | null> {
  const aborto = new AbortController();
  const timer = setTimeout(() => aborto.abort(), 4000);
  try {
    const r = corpo
      ? await fetch(R.api, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jogo: gameKey(diff), ...corpo }),
          signal: aborto.signal,
        })
      : await fetch(R.api + '?jogo=' + gameKey(diff), { signal: aborto.signal });
    if (!r.ok) return null;
    const j = await r.json();
    return Array.isArray(j) ? j : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function criarRanking() {
  return {
    async buscar(diff: DifficultyId): Promise<Resultado> {
      const local = lerLocal(diff);
      const online = await fetchRanking(diff);
      if (online) {
        salvarLocal(diff, online);
        return { lista: online, online: true };
      }
      return { lista: local, online: false };
    },
    async enviar(diff: DifficultyId, nomeBruto: string, pontos: number, nivel: number): Promise<Resultado> {
      const nome = sanitizeNome(nomeBruto);
      const p = Math.max(0, Math.round(pontos));
      const nv = Math.max(1, Math.round(nivel));
      const entrada: Entrada = { nome, pontos: p, nivel: nv, data: new Date().toISOString().slice(0, 10) };
      const online = await fetchRanking(diff, { nome, pontos: p, nivel: nv });
      if (online) {
        salvarLocal(diff, online);
        return { lista: online, online: true, entrada };
      }
      let lista = lerLocal(diff);
      lista.push(entrada);
      lista.sort((a, b) => b.pontos - a.pontos);
      lista = lista.slice(0, R.max);
      salvarLocal(diff, lista);
      return { lista, online: false, entrada };
    },
  };
}
