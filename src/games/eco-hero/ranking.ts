import type { Contexto, Ranking } from './tipos';

type Entrada = { nome: string; pontos: number; nivel: number; data: string };

export function criarRanking(ctx: Contexto): Ranking {
  const $ = (s: string) => document.querySelector(s) as HTMLElement;
  const R = ctx.cfg.ranking;
  const CHAVE = 'eco-hero:ranking';
  let nome = '';

  function lerLocal(): Entrada[] {
    try { return JSON.parse(localStorage.getItem(CHAVE) || '[]'); } catch { return []; }
  }
  function salvarLocal(lista: Entrada[]) {
    try { localStorage.setItem(CHAVE, JSON.stringify(lista)); } catch { }
  }

  async function fetchRanking(corpo?: Record<string, unknown>): Promise<Entrada[] | null> {
    const aborto = new AbortController();
    const timer = setTimeout(() => aborto.abort(), 4000);
    try {
      const r = corpo
        ? await fetch(R.api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jogo: R.jogo, ...corpo }), signal: aborto.signal })
        : await fetch(R.api + '?jogo=' + R.jogo, { signal: aborto.signal });
      if (!r.ok) return null;
      const j = await r.json();
      return Array.isArray(j) ? j : null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  function render(lista: Entrada[], destaque?: Entrada) {
    const tabela = $('[data-tabela]');
    tabela.innerHTML = '';
    $('[data-recordes-vazio]').hidden = lista.length > 0;
    lista.forEach((e, i) => {
      const li = document.createElement('li');
      if (destaque && e.nome === destaque.nome && e.pontos === destaque.pontos) li.className = 'novo';
      li.innerHTML = '<span class="pos">' + (i + 1) + 'º</span><span class="nome">' + e.nome + '</span>' +
        '<span class="det">🗑️ ' + e.nivel + '</span><span class="pts">' + e.pontos + '</span>';
      tabela.appendChild(li);
    });
  }

  function atualizarSlots() {
    $('[data-entrada-slots]').textContent = (nome + '___'.slice(0, Math.max(0, 3 - nome.length))).split('').join(' ');
  }

  return {
    abrirEntrada() {
      ctx.estado.fase = 'entrada';
      nome = '';
      atualizarSlots();
      ctx.ui.els.fimModal.hidden = true;
      ctx.ui.els.vitoriaModal.hidden = true;
      ctx.ui.els.entradaModal.hidden = false;
      setTimeout(() => ($('[data-tecla-nome="A"]') as HTMLElement).focus(), 60);
    },
    async abrirRecordes(consulta) {
      ctx.estado.fase = 'recordes';
      ctx.ui.els.introModal.hidden = true;
      ctx.ui.els.fimModal.hidden = true;
      ctx.ui.els.vitoriaModal.hidden = true;
      ctx.ui.els.entradaModal.hidden = true;
      ctx.ui.els.recordesModal.hidden = false;
      ($('[data-voltar-intro]') as HTMLElement).hidden = !consulta;
      const fonte = $('[data-recordes-fonte]');
      render(lerLocal());
      fonte.textContent = 'atualizando…';
      const online = await fetchRanking();
      if (ctx.estado.fase !== 'recordes') return;
      if (online) {
        salvarLocal(online);
        render(online);
        fonte.textContent = '';
      } else {
        fonte.textContent = '📡 sem internet — mostrando os recordes deste computador';
      }
    },
    digitarLetra(l) {
      if (nome.length >= R.nomeMax) return;
      nome += l;
      atualizarSlots();
    },
    apagarLetra() {
      nome = nome.slice(0, -1);
      atualizarSlots();
    },
    async confirmarEntrada() {
      if (nome.length < R.nomeMin) return;
      const entrada: Entrada = { nome, pontos: ctx.estado.pontos, nivel: ctx.estado.coletados, data: new Date().toISOString().slice(0, 10) };
      const online = await fetchRanking({ nome: entrada.nome, pontos: entrada.pontos, nivel: entrada.nivel });
      let lista: Entrada[];
      if (online) {
        lista = online;
      } else {
        lista = lerLocal();
        lista.push(entrada);
        lista.sort((a, b) => b.pontos - a.pontos);
        lista = lista.slice(0, R.max);
      }
      salvarLocal(lista);
      ctx.ui.els.entradaModal.hidden = true;
      this.abrirRecordes(false);
      render(lista, entrada);
    },
  };
}
