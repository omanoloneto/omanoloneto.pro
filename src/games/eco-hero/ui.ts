import type { Contexto, UI } from './tipos';

export function criarUI(ctx: Contexto): UI {
  const $ = (s: string) => document.querySelector(s) as HTMLElement;
  const els = {
    toast: $('[data-toast]'),
    anuncio: $('[data-anuncio]'),
    introModal: $('[data-intro]'),
    pausaModal: $('[data-pausa]'),
    vitoriaModal: $('[data-vitoria]'),
    fimModal: $('[data-fim]'),
    entradaModal: $('[data-entrada]'),
    recordesModal: $('[data-recordes]'),
    danoFlash: $('[data-dano-flash]'),
    hudLixo: $('[data-lixo]'),
    hudPontos: $('[data-pontos]'),
    hudVidas: $('[data-vidas]'),
    controles: $('[data-controles]'),
    pauseBtn: $('[data-pause]'),
    muteBtn: $('[data-mute]'),
    muteIcon: $('[data-mute-icon]'),
  };

  let toastTimer = 0;

  return {
    els,
    anunciar(msg) {
      els.anuncio.textContent = '';
      requestAnimationFrame(() => { els.anuncio.textContent = msg; });
    },
    mostrarToast(html, ms) {
      els.toast.innerHTML = html;
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
      els.hudLixo.textContent = e.coletados + '/' + e.totalLixos;
      els.hudPontos.textContent = String(e.pontos);
      let html = '';
      for (let i = 0; i < ctx.cfg.jogador.vidas; i++) html += i < e.vidas ? '❤️' : '🖤';
      els.hudVidas.innerHTML = html;
    },
    flashDano() {
      els.danoFlash.classList.remove('show');
      void els.danoFlash.offsetWidth;
      els.danoFlash.classList.add('show');
    },
  };
}
