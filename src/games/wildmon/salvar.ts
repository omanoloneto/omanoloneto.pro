import type { Contexto, Salvar } from './tipos';

const CHAVE = 'wildmon:save';
const NOME_KEY = 'wildmon:nome';

export function criarSalvar(ctx: Contexto): Salvar {
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
      if (o.v !== 1) return null;
      const nome = typeof o.nome === 'string' ? o.nome.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, ctx.cfg.nomeMax) : '';
      if (nome.length < ctx.cfg.nomeMin) return null;
      const starter = o.starter === 'cat' ? 'cat' : o.starter === 'dog' ? 'dog' : null;
      if (!starter) return null;
      const larg = ctx.mapa[0].length;
      const alt = ctx.mapa.length;
      const x = typeof o.x === 'number' && Number.isFinite(o.x) ? Math.max(0, Math.min(larg - 1, Math.floor(o.x))) : ctx.cfg.spawn.x;
      const y = typeof o.y === 'number' && Number.isFinite(o.y) ? Math.max(0, Math.min(alt - 1, Math.floor(o.y))) : ctx.cfg.spawn.y;
      return { nome, starter, x, y };
    },
    gravar() {
      try {
        localStorage.setItem(CHAVE, JSON.stringify({
          v: 1,
          nome: ctx.estado.nome,
          starter: ctx.estado.starter,
          x: ctx.jogador.x,
          y: ctx.jogador.y,
        }));
        localStorage.setItem(NOME_KEY, ctx.estado.nome);
      } catch { }
    },
    nomeGuardado() {
      try { return localStorage.getItem(NOME_KEY) || ''; } catch { return ''; }
    },
  };
}
