// UI DOM: refs, hotbar (ícones recortados do atlas via CSS), toasts,
// indicador de save, anunciar() sr-only com rate-limit.
import type { Contexto, UI } from './tipos';

export function criarUI(ctx: Contexto): UI {
  const $ = (s: string) => document.querySelector(s) as HTMLElement;
  const els = {
    cena: $('[data-cena]'),
    toast: $('[data-toast]'),
    anuncio: $('[data-anuncio]'),
    inicioModal: $('[data-inicio]'),
    pausaModal: $('[data-pausa]'),
    overlayGerando: $('[data-gerando]'),
    hotbar: $('[data-hotbar]'),
    balao: $('[data-balao]'),
    reticula: $('[data-reticula]'),
    aguaOverlay: $('[data-agua]'),
    salvando: $('[data-salvando]'),
    nomeMundoHud: $('[data-nome-mundo]'),
    controles: $('[data-controles]'),
    btnModo: $('[data-btn-modo]'),
    btnPulo: $('[data-btn-pulo]'),
    joystick: $('[data-joystick]'),
    joystickPino: $('[data-joystick-pino]'),
    fantasma: $('[data-fantasma]'),
    pauseBtn: $('[data-pause]'),
    muteBtn: $('[data-mute]'),
    muteIcon: $('[data-mute-icon]'),
    formNovo: $('[data-form-novo]'),
    formCarregar: $('[data-form-carregar]'),
    erroInicio: $('[data-erro-inicio]'),
  };

  let toastTimer = 0;
  let balaoTimer = 0;
  let anuncioMs = 0;
  let salvandoTimer = 0;

  function montarHotbar() {
    // ícones = recorte do próprio atlas via background-position (pixelado)
    const GRADE = 4;
    els.hotbar.innerHTML = '';
    ctx.hotbar.forEach((id, i) => {
      const b = ctx.porId(id);
      const tile = b.render === 'cruz' ? b.tiles[0] : b.tiles[1];
      const tx = tile % GRADE;
      const ty = Math.floor(tile / GRADE);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'slot';
      btn.dataset.slot = String(i);
      btn.setAttribute('aria-label', 'Bloco ' + (i + 1) + ': ' + b.nome);
      btn.innerHTML =
        '<span class="slot__img" style="background-image:url(' + ctx.textura.dataURL + ');' +
        'background-position:' + (-tx * 100) + '% ' + (-ty * 100) + '%"></span>' +
        '<span class="slot__num">' + (i < 9 ? i + 1 : '') + '</span>';
      els.hotbar.appendChild(btn);
    });
  }

  function selecionarSlot(i: number, anunciarSel: boolean) {
    ctx.estado.sel = ((i % ctx.hotbar.length) + ctx.hotbar.length) % ctx.hotbar.length;
    els.hotbar.querySelectorAll('.slot').forEach((s, j) => {
      s.classList.toggle('sel', j === ctx.estado.sel);
    });
    const nome = ctx.porId(ctx.hotbar[ctx.estado.sel]).nome;
    els.balao.textContent = nome;
    els.balao.classList.add('show');
    clearTimeout(balaoTimer);
    balaoTimer = window.setTimeout(() => els.balao.classList.remove('show'), 1100);
    if (anunciarSel) api.anunciar('Bloco: ' + nome);
    // pegou um bloco = quer colocar (touch)
    if (!ctx.estado.modoColocar) {
      ctx.estado.modoColocar = true;
      api.atualizarModo();
    }
  }

  const api: UI = {
    els,
    anunciar(msg) {
      // rate-limit: leitor de tela não pode virar metralhadora
      const agora = performance.now();
      if (agora - anuncioMs < 1000) return;
      anuncioMs = agora;
      els.anuncio.textContent = '';
      requestAnimationFrame(() => { els.anuncio.textContent = msg; });
    },
    mostrarToast(html, tipo, ms) {
      els.toast.innerHTML = html;
      els.toast.className = 'toast ' + tipo;
      els.toast.hidden = false;
      requestAnimationFrame(() => els.toast.classList.add('show'));
      clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => {
        els.toast.classList.remove('show');
        setTimeout(() => { els.toast.hidden = true; }, 250);
      }, ms || 2400);
    },
    montarHotbar,
    selecionarSlot,
    atualizarModo() {
      const colocar = ctx.estado.modoColocar;
      els.btnModo.innerHTML = colocar ? '🧱' : '⛏️';
      els.btnModo.setAttribute('aria-label', colocar ? 'Modo: colocar bloco (toque pra trocar)' : 'Modo: quebrar bloco (toque pra trocar)');
      els.btnModo.classList.toggle('colocar', colocar);
    },
    mostrarSalvando(estado) {
      clearTimeout(salvandoTimer);
      const el = els.salvando;
      if (estado === 'nada') { el.hidden = true; return; }
      el.textContent = estado === 'salvando' ? '💾 salvando…' : estado === 'salvo' ? '✅ salvo!' : '📡 sem conexão';
      el.hidden = false;
      if (estado !== 'salvando') {
        salvandoTimer = window.setTimeout(() => { el.hidden = true; }, 1800);
      }
    },
  };
  return api;
}
