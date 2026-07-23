import type { Contexto, Salvar } from './tipos';

const CHAVE = 'wildmon:save';
const NOME_KEY = 'wildmon:nome';

export function criarSalvar(ctx: Contexto): Salvar {
  const validas = new Set(ctx.especies.map((e) => e.id));

  function limparIds(bruto: unknown, starter: string, cap: number): string[] {
    const saida: string[] = [starter];
    if (Array.isArray(bruto)) {
      for (const id of bruto) {
        if (typeof id === 'string' && validas.has(id) && !saida.includes(id)) saida.push(id);
        if (saida.length >= cap) break;
      }
    }
    return saida;
  }

  return {
    carregar() {
      let cru: unknown;
      try {
        const txt = localStorage.getItem(CHAVE);
        if (!txt) return null;
        cru = JSON.parse(txt);
      } catch {
        return null;
      }
      if (typeof cru !== 'object' || cru === null || Array.isArray(cru)) return null;
      const o = cru as Record<string, unknown>;
      if (o.v !== 1 && o.v !== 2) return null;
      const nome = typeof o.nome === 'string' ? o.nome.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, ctx.cfg.nomeMax) : '';
      if (nome.length < ctx.cfg.nomeMin) return null;
      const starter = o.starter === 'cat' ? 'cat' : o.starter === 'dog' ? 'dog' : null;
      if (!starter) return null;
      const mapa = typeof o.mapa === 'string' && ctx.mapas[o.mapa] ? o.mapa : 'vila';
      const grade = ctx.mapas[mapa].mapa;
      const larg = grade[0].length;
      const alt = grade.length;
      const x = typeof o.x === 'number' && Number.isFinite(o.x) ? Math.max(0, Math.min(larg - 1, Math.floor(o.x))) : ctx.cfg.spawn.x;
      const y = typeof o.y === 'number' && Number.isFinite(o.y) ? Math.max(0, Math.min(alt - 1, Math.floor(o.y))) : ctx.cfg.spawn.y;
      const time = o.v === 2 ? limparIds(o.time, starter, ctx.cfg.timeMax) : [starter];
      const colecaoBase = o.v === 2 ? limparIds(o.colecao, starter, validas.size) : [starter];
      const colecao: string[] = [];
      for (const id of colecaoBase.concat(time)) if (!colecao.includes(id)) colecao.push(id);
      return { nome, starter, mapa, x, y, colecao, time };
    },
    gravar() {
      try {
        localStorage.setItem(CHAVE, JSON.stringify({
          v: 2,
          nome: ctx.estado.nome,
          starter: ctx.estado.starter,
          mapa: ctx.estado.mapa,
          x: ctx.jogador.x,
          y: ctx.jogador.y,
          colecao: ctx.estado.colecao,
          time: ctx.estado.time.map((c) => c.especieId),
        }));
        localStorage.setItem(NOME_KEY, ctx.estado.nome);
      } catch { }
    },
    nomeGuardado() {
      try { return localStorage.getItem(NOME_KEY) || ''; } catch { return ''; }
    },
  };
}
