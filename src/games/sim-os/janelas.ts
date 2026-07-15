// Window manager + factory: TODA janela nasce aqui, em runtime, lazy na
// primeira abertura, a partir de dados.janelas. Um único caminho de código
// pro chrome (barra, botões, arraste, taskbar) — apps só cuidam do corpo.
import type { Contexto, JanelaDef, Janelas } from './tipos';
import { preencher } from './ui';

export function criarJanelas(ctx: Contexto): Janelas {
  const defs = new Map(ctx.dados.janelas.map((j) => [j.id, j]));
  const abertas: Record<string, { min: boolean; abridor: HTMLElement | null }> = {};
  const guardas: Record<string, () => boolean> = {};
  let zTopo = 10;
  let aberturas = 0; // contador monotônico da cascata (não a contagem viva)

  const area = () => ctx.ui.els.area;
  const tarefas = () => ctx.ui.els.tarefas;

  function el(id: string): HTMLElement | null {
    return area().querySelector('[data-janela="' + id + '"]');
  }

  function tituloDe(sec: HTMLElement): string {
    return sec.querySelector('.janela__titulo')!.textContent || '';
  }

  function botaoAcao(rotulo: string, texto: string, gancho: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bisel-alto';
    btn.setAttribute('aria-label', rotulo);
    btn.setAttribute('data-' + gancho, '');
    btn.textContent = texto;
    return btn;
  }

  function construir(def: JanelaDef): HTMLElement {
    const sec = document.createElement('section');
    sec.className = 'janela' + (def.classe ? ' ' + def.classe : '');
    sec.dataset.janela = def.id;
    sec.setAttribute('role', 'dialog');
    sec.setAttribute('aria-labelledby', 'jt-' + def.id);
    sec.tabIndex = -1;
    sec.hidden = true;

    const barra = document.createElement('header');
    barra.className = 'janela__barra';
    barra.dataset.arrasta = '';
    const titulo = document.createElement('span');
    titulo.className = 'janela__titulo';
    titulo.id = 'jt-' + def.id;
    titulo.textContent = def.titulo;
    const acoes = document.createElement('span');
    acoes.className = 'janela__acoes';
    const btnMin = botaoAcao('Minimizar', '▁', 'min');
    const btnMax = botaoAcao('Maximizar', '▢', 'max');
    const btnFecha = botaoAcao('Fechar', '✕', 'fecha');
    acoes.append(btnMin, btnMax, btnFecha);
    barra.append(ctx.ui.icone(def.icone, 'janela__icone'), titulo, acoes);

    const corpo = document.createElement('div');
    corpo.className = def.cru ? 'janela__cru' : 'janela__corpo bisel-campo';
    corpo.innerHTML = def.html || ''; // conteúdo autoral dos dados — nunca input de aluno

    sec.append(barra, corpo);
    area().appendChild(sec);

    // listeners 1× na construção (nunca no reopen — duplicaria)
    ligarArraste(sec, barra);
    ligarRedimensionar(sec);
    sec.addEventListener('pointerdown', () => focar(def.id));
    btnMin.addEventListener('click', () => { ctx.audio.somClique(); minimizar(def.id); });
    btnMax.addEventListener('click', () => { ctx.audio.somClique(); alternarMax(def.id); });
    btnFecha.addEventListener('click', () => { ctx.audio.somClique(); fechar(def.id); });

    if (def.app && ctx.apps[def.app]) ctx.apps[def.app].montar(sec);
    return sec;
  }

  function abrir(id: string, abridor?: HTMLElement | null) {
    let sec = el(id);
    if (!sec) {
      const def = defs.get(id);
      if (!def) return;
      sec = construir(def);
    }
    ctx.audio.somClique();
    const def = defs.get(id);
    const app = def?.app ? ctx.apps[def.app] : null;
    if (abertas[id]) {
      if (abertas[id].min) restaurar(id);
      focar(id);
      sec.focus({ preventScroll: true });
      if (app?.aoAbrir) app.aoAbrir(sec);
      return;
    }
    abertas[id] = { min: false, abridor: abridor || null };
    sec.hidden = false;
    posicionarCascata(sec);
    criarBotaoTarefa(id, sec, def);
    focar(id);
    sec.focus({ preventScroll: true });
    ctx.ui.anunciar(preencher(ctx.dados.textos.janelaAberta, { titulo: tituloDe(sec) }));
    if (app?.aoAbrir) app.aoAbrir(sec);
  }

  function fechar(id: string) {
    const sec = el(id);
    const info = abertas[id];
    if (!sec || !info) return;
    if (guardas[id] && !guardas[id]()) return; // veto (ex.: nota não salva)
    sec.hidden = true;
    sec.classList.remove('janela--max', 'ativa');
    const btn = tarefas().querySelector('[data-tarefa="' + id + '"]');
    if (btn) btn.remove();
    delete abertas[id];
    elegerTopoVisivel();
    // devolve o foco pro abridor; se ele estiver oculto (item do menu), pro Iniciar
    const abridor = info.abridor;
    if (abridor && abridor.isConnected && abridor.offsetParent !== null) {
      abridor.focus({ preventScroll: true });
    } else if (abridor) {
      ctx.ui.els.iniciar.focus({ preventScroll: true });
    }
    ctx.ui.anunciar(ctx.dados.textos.janelaFechada);
  }

  function fecharTodas() {
    Object.keys(abertas).forEach((id) => {
      const sec = el(id);
      if (sec) {
        sec.hidden = true;
        sec.classList.remove('janela--max', 'ativa');
      }
      delete abertas[id];
    });
    tarefas().replaceChildren();
    zTopo = 10;
  }

  function minimizar(id: string) {
    const sec = el(id);
    const info = abertas[id];
    if (!sec || !info) return;
    sec.hidden = true;
    sec.classList.remove('ativa'); // 'ativa' presa na escondida quebraria o Esc
    info.min = true;
    elegerTopoVisivel();
    atualizarTarefas();
    const btn = tarefas().querySelector<HTMLElement>('[data-tarefa="' + id + '"]');
    if (btn) btn.focus();
  }

  // viewport mudou (rotação do conversível, janela do navegador): re-clampa
  // posição e tamanho inline — senão o ✕ fica clipado fora da área pra sempre
  window.addEventListener('resize', () => {
    const aw = area().clientWidth;
    const ah = area().clientHeight;
    if (!aw || !ah) return;
    area().querySelectorAll<HTMLElement>('.janela').forEach((sec) => {
      if (sec.style.left) sec.style.left = Math.max(0, Math.min(parseFloat(sec.style.left), aw - 60)) + 'px';
      if (sec.style.top) sec.style.top = Math.max(0, Math.min(parseFloat(sec.style.top), ah - 24)) + 'px';
      if (sec.style.width) {
        sec.style.width = Math.max(MIN_LARG, Math.min(parseFloat(sec.style.width), aw - Math.max(0, sec.offsetLeft))) + 'px';
      }
      if (sec.style.height) {
        sec.style.height = Math.max(MIN_ALT, Math.min(parseFloat(sec.style.height), ah - Math.max(0, sec.offsetTop))) + 'px';
      }
    });
  });

  // a janela visível de maior z vira a ativa (Esc continua funcionando em cadeia)
  function elegerTopoVisivel() {
    const restantes = Object.keys(abertas)
      .map(el)
      .filter((s): s is HTMLElement => !!s && !s.hidden);
    if (restantes.length) {
      const topo = restantes.reduce((a, b) => ((+a.style.zIndex || 0) > (+b.style.zIndex || 0) ? a : b));
      focar(topo.dataset.janela!);
    }
  }

  function restaurar(id: string) {
    const sec = el(id);
    const info = abertas[id];
    if (!sec || !info) return;
    sec.hidden = false;
    info.min = false;
  }

  function alternarMax(id: string) {
    const sec = el(id);
    if (!sec) return;
    sec.classList.toggle('janela--max');
    focar(id);
  }

  function focar(id: string) {
    const sec = el(id);
    if (!sec) return;
    if (zTopo > 4000) renormalizarZ(); // menu vive em 5000 — nunca deixar alcançar
    sec.style.zIndex = String(++zTopo);
    area().querySelectorAll('.janela').forEach((j) => j.classList.toggle('ativa', j === sec));
    atualizarTarefas();
  }

  function renormalizarZ() {
    const secs = [...area().querySelectorAll<HTMLElement>('.janela')]
      .sort((a, b) => (+a.style.zIndex || 0) - (+b.style.zIndex || 0));
    zTopo = 10;
    secs.forEach((s) => { if (s.style.zIndex) s.style.zIndex = String(++zTopo); });
  }

  function ativa(): string | null {
    const sec = area().querySelector<HTMLElement>('.janela.ativa:not([hidden])');
    return sec ? sec.dataset.janela || null : null;
  }

  function atualizarTarefas() {
    tarefas().querySelectorAll<HTMLElement>('.tarefa').forEach((b) => {
      const sec = el(b.dataset.tarefa!);
      b.classList.toggle('tarefa--ativa', !!sec && sec.classList.contains('ativa') && !sec.hidden);
    });
  }

  function posicionarCascata(sec: HTMLElement) {
    // cascata por contador monotônico: fechar uma janela e abrir outra NÃO
    // reusa a mesma posição (sobreporia exatamente a que ficou); zera quando
    // esta é a única aberta
    if (Object.keys(abertas).length === 1) aberturas = 0;
    const n = aberturas++ % 7;
    const estreito = window.innerWidth < 640;
    let left = estreito ? 4 : 90 + n * 26;
    let top = estreito ? 8 + n * 18 : 40 + n * 26;
    left = Math.max(0, Math.min(left, area().clientWidth - 120));
    top = Math.max(0, Math.min(top, area().clientHeight - 60));
    sec.style.left = left + 'px';
    sec.style.top = top + 'px';
  }

  function criarBotaoTarefa(id: string, sec: HTMLElement, def?: JanelaDef) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tarefa bisel-alto';
    btn.dataset.tarefa = id;
    const rotulo = document.createElement('span');
    rotulo.textContent = tituloDe(sec); // textContent SEMPRE — título pode conter nome digitado
    btn.append(ctx.ui.icone(def ? def.icone : 'bloco'), rotulo);
    btn.addEventListener('click', () => {
      const info = abertas[id];
      if (!info) return;
      ctx.audio.somClique();
      if (info.min) {
        restaurar(id);
        focar(id);
      } else if (sec.classList.contains('ativa')) {
        minimizar(id);
      } else {
        focar(id);
      }
    });
    tarefas().appendChild(btn);
  }

  function definirTitulo(id: string, titulo: string) {
    const alvo = document.getElementById('jt-' + id);
    if (alvo) alvo.textContent = titulo;
    const span = tarefas().querySelector('[data-tarefa="' + id + '"] span:last-child');
    if (span) span.textContent = titulo;
  }

  // ===== Arraste (pointer capture + backstop, regras da casa) =====
  function ligarArraste(sec: HTMLElement, barra: HTMLElement) {
    let drag: { id: number; dx: number; dy: number } | null = null;

    function finalizar(e: PointerEvent) {
      if (!drag || e.pointerId !== drag.id) return;
      try { barra.releasePointerCapture(drag.id); } catch { /* já solto */ }
      drag = null;
    }

    barra.addEventListener('pointerdown', (e) => {
      focar(sec.dataset.janela!);
      if ((e.target as Element).closest('[data-min],[data-max],[data-fecha]')) return;
      if (sec.classList.contains('janela--max')) return;
      drag = { id: e.pointerId, dx: e.clientX - sec.offsetLeft, dy: e.clientY - sec.offsetTop };
      try { barra.setPointerCapture(e.pointerId); } catch { /* segue sem captura */ }
    });
    barra.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const areaW = area().clientWidth;
      const areaH = area().clientHeight;
      const larg = sec.offsetWidth;
      const x = Math.max(-larg + 60, Math.min(e.clientX - drag.dx, areaW - 60));
      const y = Math.max(0, Math.min(e.clientY - drag.dy, areaH - 24));
      sec.style.left = x + 'px';
      sec.style.top = y + 'px';
    });
    barra.addEventListener('pointerup', finalizar);
    barra.addEventListener('pointercancel', finalizar);
    barra.addEventListener('lostpointercapture', finalizar);
  }

  // ===== Redimensionar: alças na borda direita, de baixo e no canto =====
  const MIN_LARG = 220;
  const MIN_ALT = 140;
  function ligarRedimensionar(sec: HTMLElement) {
    (['leste', 'sul', 'canto'] as const).forEach((tipo) => {
      const alca = document.createElement('div');
      alca.className = 'janela__alca janela__alca--' + tipo;
      alca.dataset.alca = tipo;
      sec.appendChild(alca);

      let drag: { id: number; x0: number; y0: number; w0: number; h0: number } | null = null;

      function finalizar(e: PointerEvent) {
        if (!drag || e.pointerId !== drag.id) return;
        try { alca.releasePointerCapture(drag.id); } catch { /* já solto */ }
        drag = null;
      }

      alca.addEventListener('pointerdown', (e) => {
        if (sec.classList.contains('janela--max')) return;
        focar(sec.dataset.janela!);
        drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, w0: sec.offsetWidth, h0: sec.offsetHeight };
        // congela AMBAS as dimensões antes da classe: um tap sem arrasto (ou
        // arrasto só-leste) não pode deixar a janela em flex com altura auto —
        // textarea colapsaria e corpo de texto estouraria a área
        sec.style.width = drag.w0 + 'px';
        sec.style.height = drag.h0 + 'px';
        sec.classList.add('janela--dimensionada');
        try { alca.setPointerCapture(e.pointerId); } catch { /* segue sem captura */ }
        e.preventDefault();
      });
      alca.addEventListener('pointermove', (e) => {
        if (!drag || e.pointerId !== drag.id) return;
        const maxW = area().clientWidth - Math.max(0, sec.offsetLeft);
        const maxH = area().clientHeight - Math.max(0, sec.offsetTop);
        if (tipo !== 'sul') {
          sec.style.width = Math.max(MIN_LARG, Math.min(drag.w0 + e.clientX - drag.x0, maxW)) + 'px';
        }
        if (tipo !== 'leste') {
          sec.style.height = Math.max(MIN_ALT, Math.min(drag.h0 + e.clientY - drag.y0, maxH)) + 'px';
        }
      });
      alca.addEventListener('pointerup', finalizar);
      alca.addEventListener('pointercancel', finalizar);
      alca.addEventListener('lostpointercapture', finalizar);
    });
  }

  return {
    abrir,
    fechar,
    fecharTodas,
    minimizar,
    restaurar,
    alternarMax,
    focar,
    ativa,
    el,
    aberta: (id) => !!abertas[id],
    definirTitulo,
    antesDeFechar(id, podeFechar) { guardas[id] = podeFechar; },
  };
}
