import type { Contexto, UI } from './tipos';

export function criarUI(ctx: Contexto): UI {
  const $ = (s: string) => document.querySelector(s) as HTMLElement;
  const els = {
    cena: $('[data-cena]'),
    toast: $('[data-toast]'),
    anuncio: $('[data-anuncio]'),
    introModal: $('[data-intro]'),
    pausaModal: $('[data-pausa]'),
    fimModal: $('[data-fim]'),
    entradaModal: $('[data-entrada]'),
    recordesModal: $('[data-recordes]'),
    banner: $('[data-banner]'),
    danoFlash: $('[data-dano-flash]'),
    hudPontos: $('[data-pontos]'),
    hudOnda: $('[data-onda]'),
    hudVidas: $('[data-vidas]'),
    solidezFill: $('[data-solidez-fill]'),
    tanqueFill: $('[data-tanque-fill]'),
    controles: $('[data-controles]'),
    pauseBtn: $('[data-pause]'),
    muteBtn: $('[data-mute]'),
    muteIcon: $('[data-mute-icon]'),
  };

  let toastTimer = 0;
  let bannerTimer = 0;
  let pontosAntes = -1;
  let ondaAntes = -1;
  let vidasAntes = -1;

  return {
    els,
    anunciar(msg) {
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
    atualizarHud() {
      const e = ctx.estado;
      if (e.pontos !== pontosAntes) {
        pontosAntes = e.pontos;
        els.hudPontos.textContent = String(e.pontos);
      }
      if (e.onda !== ondaAntes) {
        ondaAntes = e.onda;
        els.hudOnda.textContent = String(e.onda);
      }
      if (e.vidas !== vidasAntes) {
        vidasAntes = e.vidas;
        let html = '';
        for (let i = 0; i < ctx.cfg.jogador.vidas; i++) html += i < e.vidas ? '🧊' : '💧';
        els.hudVidas.innerHTML = html;
      }
      const sol = Math.max(0, e.solidez) / ctx.cfg.jogador.solidezMax;
      els.solidezFill.style.width = sol * 100 + '%';
      els.solidezFill.style.background = sol > 0.5 ? '#f5f2ea' : sol > 0.25 ? '#ffd23f' : '#ff5c39';
      els.tanqueFill.style.width = (e.tanque / ctx.cfg.bisnaga.tanqueMax) * 100 + '%';
    },
    mostrarBanner(titulo, sub) {
      ($('[data-banner-titulo]')).textContent = titulo;
      ($('[data-banner-sub]')).textContent = sub || '';
      els.banner.hidden = false;
      els.banner.classList.remove('show');
      void els.banner.offsetWidth;
      els.banner.classList.add('show');
      clearTimeout(bannerTimer);
      bannerTimer = window.setTimeout(() => { els.banner.hidden = true; }, 2200);
    },
    flashDano() {
      els.danoFlash.classList.remove('show');
      void els.danoFlash.offsetWidth;
      els.danoFlash.classList.add('show');
    },
  };
}
