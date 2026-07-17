import type { Contexto, UI } from './tipos';

export function criarUI(ctx: Contexto): UI {
  const $ = (s: string) => document.querySelector(s) as HTMLElement;
  const els = {
    introModal: $('[data-intro]'),
    formIntro: $('[data-form-intro]'),
    campoNome: $('[data-campo-nome]'),
    erroIntro: $('[data-erro-intro]'),
    dialogo: $('[data-dialogo]'),
    dialogoTexto: $('[data-dialogo-texto]'),
    dialogoSeta: $('[data-dialogo-seta]'),
    toast: $('[data-toast]'),
    anuncio: $('[data-anuncio]'),
    online: $('[data-online]'),
    controles: $('[data-controles]'),
    muteBtn: $('[data-mute]'),
    muteIcon: $('[data-mute-icon]'),
  };

  let falas: string[] = [];
  let falaIdx = 0;
  let charsMostrados = 0;
  let ultimoCharMs = 0;
  let toastTimer = 0;

  return {
    els,
    abrirDialogo(novasFalas) {
      falas = novasFalas;
      falaIdx = 0;
      charsMostrados = 0;
      ultimoCharMs = 0;
      ctx.estado.fase = 'dialogo';
      els.dialogo.hidden = false;
      els.dialogoTexto.textContent = '';
      els.dialogoSeta.hidden = true;
      this.anunciar(falas.join(' '));
    },
    avancarDialogo() {
      const fala = falas[falaIdx] || '';
      if (charsMostrados < fala.length) {
        charsMostrados = fala.length;
        els.dialogoTexto.textContent = fala;
        els.dialogoSeta.hidden = false;
        return true;
      }
      falaIdx++;
      if (falaIdx >= falas.length) {
        els.dialogo.hidden = true;
        ctx.estado.fase = 'jogando';
        return false;
      }
      charsMostrados = 0;
      els.dialogoTexto.textContent = '';
      els.dialogoSeta.hidden = true;
      return true;
    },
    dialogoAberto: () => !els.dialogo.hidden,
    passoDialogo(ts) {
      if (els.dialogo.hidden) return;
      const fala = falas[falaIdx] || '';
      if (charsMostrados >= fala.length) return;
      if (ctx.motionReduzido) {
        charsMostrados = fala.length;
        els.dialogoTexto.textContent = fala;
        els.dialogoSeta.hidden = false;
        return;
      }
      if (ts - ultimoCharMs > ctx.cfg.dialogoMsPorLetra) {
        ultimoCharMs = ts;
        charsMostrados++;
        els.dialogoTexto.textContent = fala.slice(0, charsMostrados);
        if (charsMostrados % 3 === 0) ctx.audio.somBlip();
        if (charsMostrados >= fala.length) els.dialogoSeta.hidden = false;
      }
    },
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
    atualizarOnline(n) {
      els.online.textContent = '👥 ' + n;
    },
  };
}
