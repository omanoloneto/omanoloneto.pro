import type { Contexto, Ranking } from './tipos';

type Entrada = { nome: string; pontos: number; nivel: number; data: string };
type Tab = 'solo' | 'multi';

export function criarRanking(ctx: Contexto): Ranking {
  const $ = (s: string) => document.querySelector(s) as HTMLElement;
  const R = ctx.cfg.ranking;
  const CHAVE = 'sugar-splash:ranking';
  let nome = '';
  let tab: Tab = 'solo';
  let reqGen = 0;

  const suffix = () => (tab === 'multi' ? '-multi' : '');
  const gameKey = () => R.jogo + suffix();
  const cacheKey = () => CHAVE + suffix();

  function lerLocal(): Entrada[] {
    try { return JSON.parse(localStorage.getItem(cacheKey()) || '[]'); } catch { return []; }
  }
  function salvarLocal(lista: Entrada[]) {
    try { localStorage.setItem(cacheKey(), JSON.stringify(lista)); } catch { }
  }

  async function fetchRanking(corpo?: Record<string, unknown>): Promise<Entrada[] | null> {
    const aborto = new AbortController();
    const timer = setTimeout(() => aborto.abort(), 4000);
    try {
      const r = corpo
        ? await fetch(R.api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jogo: gameKey(), ...corpo }), signal: aborto.signal })
        : await fetch(R.api + '?jogo=' + gameKey(), { signal: aborto.signal });
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
        '<span class="det">' + e.nivel + ' derretidos</span><span class="pts">' + e.pontos + '</span>';
      tabela.appendChild(li);
    });
  }

  function marcarAbas() {
    document.querySelectorAll<HTMLElement>('[data-recordes-aba]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.recordesAba === tab));
    });
  }

  async function carregarLista(destaque?: Entrada) {
    const g = ++reqGen;
    marcarAbas();
    render(lerLocal(), destaque);
    const fonte = $('[data-recordes-fonte]');
    fonte.textContent = 'atualizando…';
    const online = await fetchRanking();
    if (g !== reqGen || ctx.estado.fase !== 'recordes') return;
    if (online) {
      salvarLocal(online);
      render(online, destaque);
      fonte.textContent = '';
    } else {
      fonte.textContent = '📡 sem internet — mostrando os recordes deste computador';
    }
  }

  function abrir(consulta: boolean, destaque?: Entrada) {
    ctx.estado.fase = 'recordes';
    ctx.ui.els.introModal.hidden = true;
    ctx.ui.els.fimModal.hidden = true;
    ctx.ui.els.entradaModal.hidden = true;
    ctx.ui.els.recordesModal.hidden = false;
    ($('[data-voltar-intro]') as HTMLElement).hidden = !consulta;
    carregarLista(destaque);
  }

  function atualizarSlots() {
    $('[data-entrada-slots]').textContent = (nome + '___'.slice(0, Math.max(0, 3 - nome.length))).split('').join(' ');
  }

  document.querySelectorAll<HTMLElement>('[data-recordes-aba]').forEach((b) => {
    b.addEventListener('click', () => {
      const alvo: Tab = b.dataset.recordesAba === 'multi' ? 'multi' : 'solo';
      if (alvo === tab) return;
      tab = alvo;
      carregarLista();
    });
  });

  return {
    abrirEntrada() {
      ctx.estado.fase = 'entrada';
      nome = (ctx.estado.nome || '').slice(0, R.nomeMax);
      atualizarSlots();
      ctx.ui.els.fimModal.hidden = true;
      ctx.ui.els.entradaModal.hidden = false;
      setTimeout(() => ($('[data-tecla-nome="A"]') as HTMLElement).focus(), 60);
    },
    abrirRecordes(consulta) {
      tab = ctx.estado.modo === 'multi' ? 'multi' : 'solo';
      abrir(consulta);
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
      tab = ctx.estado.modo === 'multi' ? 'multi' : 'solo';
      const entrada: Entrada = { nome, pontos: ctx.estado.pontos, nivel: ctx.estado.kills, data: new Date().toISOString().slice(0, 10) };
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
      abrir(false, entrada);
    },
  };
}
