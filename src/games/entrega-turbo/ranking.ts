// Ranking online (padrão do site: PHP no próprio host + cache/fallback
// localStorage) e a entrada arcade de nome (grade A-Z).
import type { Contexto, Ranking } from './tipos';

const API_RANKING = '/class/api/ranking.php';
const JOGO_ID = 'entrega-turbo';
const RANKING_KEY = 'entrega-turbo:ranking';

type Entrada = { nome: string; pontos: number; nivel: number; data: string };

export function criarRanking(ctx: Contexto): Ranking {
  const $ = (s: string) => document.querySelector(s) as HTMLElement;
  let valor = '';

  function lerRanking(): Entrada[] {
    try { return JSON.parse(localStorage.getItem(RANKING_KEY) || '[]'); }
    catch (_) { return []; }
  }
  function salvarRanking(lista: Entrada[]) {
    try { localStorage.setItem(RANKING_KEY, JSON.stringify(lista)); } catch (_) {}
  }
  function fetchRanking(opts: RequestInit | null): Promise<Entrada[] | null> {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 4000);
    const url = opts ? API_RANKING : API_RANKING + '?jogo=' + JOGO_ID;
    return fetch(url, Object.assign({ signal: ctl.signal }, opts || {}))
      .then((r) => (r.ok ? r.json() : null))
      .then((lista) => (Array.isArray(lista) ? lista : null))
      .catch(() => null)
      .finally(() => clearTimeout(timer));
  }
  function enviarOnline(entrada: Entrada) {
    return fetchRanking({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jogo: JOGO_ID, nome: entrada.nome, pontos: entrada.pontos, nivel: entrada.nivel }),
    });
  }
  function indiceDe(lista: Entrada[], entrada: Entrada) {
    return lista.findIndex((r) => r.nome === entrada.nome && r.pontos === entrada.pontos && r.data === entrada.data);
  }

  function renderRecordes(lista: Entrada[], destaque: number, consulta: boolean, fonte: 'buscando' | 'online' | 'offline') {
    const tabela = $('[data-tabela]');
    tabela.innerHTML = '';
    $('[data-recordes-vazio]').hidden = lista.length > 0;
    lista.forEach((r, i) => {
      const li = document.createElement('li');
      if (i === destaque) li.className = 'novo';
      li.innerHTML =
        '<span class="pos">' + (i + 1) + 'º</span>' +
        '<span class="nome">' + r.nome + '</span>' +
        '<span class="det">nível ' + r.nivel + '</span>' +
        '<span class="pts">' + r.pontos + '</span>';
      tabela.appendChild(li);
    });
    const fonteEl = $('[data-recordes-fonte]');
    if (fonte === 'online') fonteEl.textContent = '🌐 Ranking online — vale pra turma toda!';
    else if (fonte === 'offline') fonteEl.textContent = '📴 Sem internet agora: mostrando o ranking deste aparelho.';
    else fonteEl.textContent = 'Buscando o ranking online…';
    $('[data-voltar-intro]').hidden = !consulta;
    $('[data-recordes-replay]').hidden = consulta;
  }

  function abrirRecordesCom(consulta: boolean, entrada: Entrada | null) {
    const { estado, ui } = ctx;
    estado.fase = 'recordes';
    const local = lerRanking();
    const idxLocal = entrada ? indiceDe(local, entrada) : -1;
    renderRecordes(local, idxLocal, consulta, 'buscando');
    ui.els.recordesModal.hidden = false;
    setTimeout(() => (consulta ? $('[data-voltar-intro]') : $('[data-recordes-replay]')).focus(), 60);
    const pedido = entrada ? enviarOnline(entrada) : fetchRanking(null);
    pedido.then((listaOnline) => {
      if (estado.fase !== 'recordes') return;
      if (listaOnline) {
        salvarRanking(listaOnline);
        renderRecordes(listaOnline, entrada ? indiceDe(listaOnline, entrada) : -1, consulta, 'online');
      } else {
        renderRecordes(local, idxLocal, consulta, 'offline');
      }
    });
  }

  function atualizarSlots() {
    const slots: string[] = [];
    for (let i = 0; i < ctx.cfg.nomeMax; i++) slots.push(valor[i] || '_');
    $('[data-entrada-slots]').textContent = slots.join(' ');
  }

  const ranking: Ranking = {
    abrirEntrada() {
      valor = '';
      ctx.estado.fase = 'entrada';
      ctx.ui.els.fimModal.hidden = true;
      atualizarSlots();
      ctx.ui.els.entradaModal.hidden = false;
      setTimeout(() => $('[data-tecla-nome="A"]').focus(), 60);
      ctx.ui.anunciar('Digite seu nome usando as letras da tela.');
    },
    abrirRecordes(consulta) {
      abrirRecordesCom(consulta, null);
    },
    digitarLetra(l) {
      if (ctx.estado.fase !== 'entrada' || valor.length >= ctx.cfg.nomeMax) return;
      valor += l;
      ctx.audio.somColeta();
      atualizarSlots();
    },
    apagarLetra() {
      if (ctx.estado.fase !== 'entrada' || !valor) return;
      valor = valor.slice(0, -1);
      atualizarSlots();
    },
    confirmarEntrada() {
      if (ctx.estado.fase !== 'entrada') return;
      if (valor.length < ctx.cfg.nomeMin) {
        ctx.ui.mostrarToast('Escreva pelo menos ' + ctx.cfg.nomeMin + ' letras!', 'info', 1800);
        return;
      }
      ctx.ui.els.entradaModal.hidden = true;
      const entrada: Entrada = {
        nome: valor.toUpperCase(),
        pontos: ctx.estado.pontos,
        nivel: ctx.estado.nivel,
        data: new Date().toISOString().slice(0, 10),
      };
      const local = lerRanking();
      local.push(entrada);
      local.sort((a, b) => b.pontos - a.pontos);
      salvarRanking(local.slice(0, ctx.cfg.rankingMax));
      ctx.audio.somNivel();
      abrirRecordesCom(false, entrada);
    },
  };

  // ----- bindings dos botões do fluxo de ranking -----
  document.querySelectorAll<HTMLElement>('[data-tecla-nome]').forEach((btn) => {
    btn.addEventListener('click', () => ranking.digitarLetra(btn.dataset.teclaNome!));
  });
  $('[data-nome-apagar]').addEventListener('click', () => ranking.apagarLetra());
  $('[data-nome-ok]').addEventListener('click', () => ranking.confirmarEntrada());
  $('[data-entrada-voltar]').addEventListener('click', () => {
    ctx.ui.els.entradaModal.hidden = true;
    ctx.estado.fase = 'fim';
    ctx.ui.els.fimModal.hidden = false;
  });
  ctx.ui.els.fimModal.querySelector('[data-gravar-nome]')!.addEventListener('click', () => ranking.abrirEntrada());
  $('[data-ver-recordes]').addEventListener('click', () => {
    ctx.ui.els.introModal.hidden = true;
    ranking.abrirRecordes(true);
  });
  $('[data-voltar-intro]').addEventListener('click', () => {
    ctx.ui.els.recordesModal.hidden = true;
    ctx.estado.fase = 'inicio';
    ctx.ui.els.introModal.hidden = false;
    setTimeout(() => $('[data-modo="facil"]').focus(), 60);
  });
  $('[data-recordes-replay]').addEventListener('click', () => {
    ctx.ui.els.recordesModal.hidden = true;
    ctx.fluxo.reiniciar();
  });

  return ranking;
}
