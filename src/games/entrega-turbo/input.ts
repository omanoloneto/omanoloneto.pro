// Entrada: teclado (setas/WASD/espaço) e touch (Pointer Events multi-toque).
// Teclas presas em alt-tab/blur são soltas pelo fluxo (soltarInputs).
import type { Contexto } from './tipos';

const TECLAS: Record<string, keyof Contexto['input']> = {
  ArrowLeft: 'esq', a: 'esq', A: 'esq',
  ArrowRight: 'dir', d: 'dir', D: 'dir',
  ArrowUp: 'acel', w: 'acel', W: 'acel',
  ArrowDown: 're', s: 're', S: 're',
};

export function ligarInput(ctx: Contexto) {
  const { input } = ctx;

  window.addEventListener('keydown', (e) => {
    if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
    const { estado, fluxo, ranking, audio } = ctx;
    if (e.key === 'Escape') {
      if (estado.fase === 'jogando') { e.preventDefault(); fluxo.pausar(); }
      else if (estado.fase === 'pausado') { e.preventDefault(); fluxo.continuarJogo(); }
      // Esc na loja volta pra de onde ela foi aberta (pausa, intro ou fim)
      else if (estado.fase === 'garagem') { e.preventDefault(); ctx.garagem.fechar(); }
      return;
    }
    if (estado.fase === 'entrada') {
      const l = e.key.length === 1 ? e.key.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '') : '';
      if (/^[A-Z]$/.test(l)) { e.preventDefault(); ranking.digitarLetra(l); }
      else if (e.key === 'Backspace') { e.preventDefault(); ranking.apagarLetra(); }
      else if (e.key === 'Enter') {
        // foco em QUALQUER botão do modal (letra, ⌫, voltar): deixa o clique nativo agir
        if (document.activeElement && (document.activeElement as HTMLElement).closest('[data-entrada]')) return;
        e.preventDefault();
        ranking.confirmarEntrada();
      }
      return;
    }
    if (estado.fase !== 'jogando') return;
    if (e.key === ' ') { e.preventDefault(); audio.somBuzina(); return; }
    const acao = TECLAS[e.key];
    if (acao) {
      e.preventDefault();
      input[acao] = true;
      ctx.fluxo.aoPrimeiroInput();
    }
  });

  window.addEventListener('keyup', (e) => {
    const acao = TECLAS[e.key];
    if (acao) input[acao] = false;
  });

  // touch: um listener por botão, multi-toque via pointer capture
  document.querySelectorAll<HTMLElement>('.ctl').forEach((btn) => {
    const acao = btn.dataset.ctl as keyof Contexto['input'] | 'buzina';
    const liga = (e: PointerEvent) => {
      e.preventDefault();
      btn.setPointerCapture && btn.setPointerCapture(e.pointerId);
      if (acao === 'buzina') { ctx.audio.somBuzina(); return; }
      input[acao] = true;
      btn.classList.add('on');
      ctx.fluxo.aoPrimeiroInput();
    };
    const desliga = () => {
      if (acao !== 'buzina') input[acao] = false;
      btn.classList.remove('on');
    };
    btn.addEventListener('pointerdown', liga);
    btn.addEventListener('pointerup', desliga);
    btn.addEventListener('pointercancel', desliga);
    btn.addEventListener('lostpointercapture', desliga);
  });

  // janela perdeu o foco (popup, outra janela por cima): solta as teclas
  window.addEventListener('blur', () => ctx.fluxo.soltarInputs());
}
