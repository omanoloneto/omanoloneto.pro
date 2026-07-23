import type { Ctx, UI } from './tipos';

export function criarUI(ctx: Ctx): UI {
  const $ = (s: string) => document.querySelector(s) as HTMLElement;
  const els = {
    cena: $('[data-cena]'),
    placarA: $('[data-placar-a]'),
    placarB: $('[data-placar-b]'),
    tempo: $('[data-tempo]'),
    poderBarra: $('[data-poder-barra]'),
    poderNome: $('[data-poder-nome]'),
    toast: $('[data-toast]'),
    anuncio: $('[data-anuncio]'),
    introModal: $('[data-intro]'),
    pausaModal: $('[data-pausa]'),
    fimModal: $('[data-fim]'),
    entradaModal: $('[data-entrada]'),
    recordesModal: $('[data-recordes]'),
    fimTitulo: $('[data-fim-titulo]'),
    fimPlacar: $('[data-fim-placar]'),
    pauseBtn: $('[data-pause]'),
    muteBtn: $('[data-mute]'),
    muteIcon: $('[data-mute-icon]'),
    controles: $('[data-controles]'),
  };
  let ultTempo = -1;
  let toastAte = 0;

  return {
    els,
    setPlacar(a, b) {
      els.placarA.textContent = String(a);
      els.placarB.textContent = String(b);
    },
    setTempo(s) {
      const v = Math.ceil(s);
      if (v === ultTempo) return;
      ultTempo = v;
      const mm = Math.floor(v / 60);
      const ss = v % 60;
      els.tempo.textContent = `${mm}:${ss.toString().padStart(2, '0')}`;
      els.tempo.classList.toggle('aviso', v <= ctx.cfg.partida.avisoS);
    },
    setPoder(pct, nome, cor) {
      els.poderBarra.style.width = Math.round(pct) + '%';
      els.poderBarra.style.background = cor;
      const cheio = pct >= ctx.cfg.poder.custo;
      els.poderNome.textContent = (cheio ? '⚡ ' : '') + nome;
      els.poderNome.classList.toggle('pronto', cheio);
    },
    toast(msg) {
      const now = performance.now();
      if (now < toastAte) return;
      toastAte = now + 900;
      els.toast.textContent = msg;
      els.toast.classList.add('show');
      setTimeout(() => els.toast.classList.remove('show'), 1400);
    },
    anunciar(msg) {
      els.anuncio.textContent = '';
      requestAnimationFrame(() => (els.anuncio.textContent = msg));
    },
  };
}
