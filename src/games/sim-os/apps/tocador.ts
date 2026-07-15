// Tocador de "MIDI": toca dados.sons.melodia com timbre de computador
// antigo. Sem arquivo de som — Web Audio puro.
import type { AppInstancia, Contexto } from '../tipos';

export function criarTocador(ctx: Contexto): AppInstancia {
  const { textos } = ctx.dados;
  let statusEl: HTMLElement | null = null;
  let fimTimer = 0;

  function parar(silencioso: boolean) {
    ctx.audio.pararTrecho();
    clearTimeout(fimTimer);
    if (!silencioso && statusEl) statusEl.textContent = textos.parado;
  }

  function tocar() {
    if (!statusEl) return;
    ctx.audio.init();
    if (ctx.estado.mudo) {
      statusEl.textContent = textos.somDesligado;
      return;
    }
    const ms = ctx.audio.tocarTrecho(ctx.dados.sons.melodia);
    if (!ms) return;
    statusEl.textContent = textos.tocando;
    clearTimeout(fimTimer);
    fimTimer = window.setTimeout(() => {
      if (statusEl) statusEl.textContent = textos.parado;
    }, ms + 250);
  }

  return {
    montar(sec) {
      statusEl = sec.querySelector('[data-midi-status]');
      sec.querySelector('[data-midi-tocar]')?.addEventListener('click', tocar);
      sec.querySelector('[data-midi-parar]')?.addEventListener('click', () => parar(false));
    },
    aoReligar() {
      parar(true);
      if (statusEl) statusEl.textContent = textos.parado;
    },
  };
}
