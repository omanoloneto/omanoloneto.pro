// Tocador de "MIDI": toca dados.sons.melodia com timbre de computador
// antigo. Sem arquivo de som — Web Audio puro.
// ATENÇÃO: este módulo é importado no BUILD (Node) pelos arquivos de dados
// (pra usar o HTML_ padrão) — nada de document/window no top-level.
import type { AppInstancia, Contexto } from '../tipos';


// HTML do widget do tocador (SÓ o widget; o texto educativo fica nos dados)
// Estrutura PADRÃO da janela (compartilhada entre os sims — feature nova
// aqui aparece em todos). Rótulos NEUTROS de era; um sim pode sobrescrever
// o html inteiro nos dados se quiser outra estrutura.
export const HTML_TOCADOR = `
      <div class="tocador">
        <div class="tocador__visor bisel-campo">
          <span class="tocador__nota" aria-hidden="true">♪</span>
          <span data-midi-status>Parado</span>
        </div>
        <div class="tocador__botoes">
          <button type="button" class="bisel-alto" data-midi-tocar>▶ Tocar</button>
          <button type="button" class="bisel-alto" data-midi-parar>⏹ Parar</button>
        </div>
      </div>`;

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
