// UI DOM: refs dos elementos, HUD, toasts, banner, vidas, confete e elogios.
import type { Contexto, UI } from './tipos';

const ELOGIOS = ['Boa entrega!', 'Mandou bem!', 'Uhul!', 'Que rápido!', 'Valeu!', 'Show!', 'Chegou certinho!', 'É isso aí!', 'Obrigado, caminhoneiro!', 'Demais!'];

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
    vidasWrap: $('[data-vidas-wrap]'),
    vidas: $('[data-vidas]'),
    prazoWrap: $('[data-prazo-wrap]'),
    relogio: $('[data-relogio]'),
    setaBorda: $('[data-seta-borda]'),
    controles: $('[data-controles]'),
    fantasma: $('[data-fantasma]'),
    fantasmaTxt: $('[data-fantasma-txt]'),
    banner: $('[data-banner-nivel]'),
    resgate: $('[data-resgate]'),
    destinoAtual: $('[data-destino-atual]'),
    pauseBtn: $('[data-pause]'),
    muteBtn: $('[data-mute]'),
    muteIcon: $('[data-mute-icon]'),
  };

  let toastTimer = 0;
  let bannerTimer = 0;
  let elogiosRestantes: string[] = [];

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
    popHud(sel, valor) {
      const el = $(sel);
      el.textContent = String(valor);
      el.classList.add('pop');
      setTimeout(() => el.classList.remove('pop'), 200);
    },
    atualizarVidas(pop) {
      let html = '';
      for (let i = 0; i < ctx.cfg.coracoes; i++) {
        const cheio = i < ctx.estado.vidas;
        html += '<span class="vida' + (cheio ? '' : ' vida--vazia') + (pop && i === ctx.estado.vidas - 1 ? ' vida--pop' : '') + '">❤️</span>';
      }
      els.vidas.innerHTML = html;
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
    confete() {
      if (ctx.motionReduzido) return;
      const cores = ['#22e0ff', '#2ee08a', '#ffd23f', '#ff5c8a'];
      for (let i = 0; i < 14; i++) {
        const p = document.createElement('span');
        p.style.cssText =
          'position:absolute;z-index:44;width:9px;height:9px;border-radius:2px;pointer-events:none;' +
          'left:' + (38 + Math.random() * 24) + '%;top:26%;background:' + cores[i % 4] + ';' +
          'transition:transform 0.9s ease-out, opacity 0.9s ease-out;';
        els.cena.appendChild(p);
        requestAnimationFrame(() => {
          p.style.transform = 'translate(' + (Math.random() * 240 - 120) + 'px,' + (140 + Math.random() * 160) + 'px) rotate(' + (Math.random() * 520 - 260) + 'deg)';
          p.style.opacity = '0';
        });
        setTimeout(() => p.remove(), 950);
      }
    },
    elogio() {
      if (!elogiosRestantes.length) elogiosRestantes = ELOGIOS.slice();
      return elogiosRestantes.splice(Math.floor(Math.random() * elogiosRestantes.length), 1)[0];
    },
  };
}
