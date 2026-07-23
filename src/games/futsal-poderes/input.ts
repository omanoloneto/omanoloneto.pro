import type { Ctx } from './tipos';

const TECLAS: Record<string, 'cima' | 'baixo' | 'esq' | 'dir'> = {
  ArrowUp: 'cima', KeyW: 'cima', ArrowDown: 'baixo', KeyS: 'baixo',
  ArrowLeft: 'esq', KeyA: 'esq', ArrowRight: 'dir', KeyD: 'dir',
};

export function bindInput(ctx: Ctx, onPause: () => void) {
  const inp = ctx.input;
  const eixo = () => {
    inp.eixoX = (inp.dir ? 1 : 0) - (inp.esq ? 1 : 0);
    inp.eixoZ = (inp.baixo ? 1 : 0) - (inp.cima ? 1 : 0);
  };

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.code === 'Escape') { onPause(); return; }
    const a = TECLAS[e.code];
    if (a) { inp[a] = true; eixo(); e.preventDefault(); return; }
    if (e.code === 'Space' || e.code === 'KeyK' || e.code === 'KeyL') { inp.chutar = true; e.preventDefault(); }
    else if (e.code === 'KeyJ' || e.code === 'KeyO') inp.poder = true;
    else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') inp.correr = true;
  });
  window.addEventListener('keyup', (e) => {
    const a = TECLAS[e.code];
    if (a) { inp[a] = false; eixo(); return; }
    if (e.code === 'Space' || e.code === 'KeyK' || e.code === 'KeyL') inp.chutar = false;
    else if (e.code === 'KeyJ' || e.code === 'KeyO') inp.poder = false;
    else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') inp.correr = false;
  });
  window.addEventListener('blur', () => {
    inp.cima = inp.baixo = inp.esq = inp.dir = inp.chutar = inp.poder = inp.correr = false;
    inp.eixoX = inp.eixoZ = 0;
  });

  const stick = document.querySelector('[data-stick]') as HTMLElement | null;
  const knob = document.querySelector('[data-knob]') as HTMLElement | null;
  if (stick && knob) {
    let raio = 46;
    let ativo = -1;
    const set = (dx: number, dz: number) => {
      const m = Math.hypot(dx, dz);
      const cl = m > raio ? raio / m : 1;
      inp.eixoX = (dx * cl) / raio;
      inp.eixoZ = (dz * cl) / raio;
      knob.style.transform = `translate(${dx * cl}px, ${dz * cl}px)`;
    };
    const zerar = () => { inp.eixoX = 0; inp.eixoZ = 0; knob.style.transform = 'translate(0,0)'; ativo = -1; };
    stick.addEventListener('pointerdown', (e) => {
      ativo = e.pointerId;
      raio = stick.clientWidth / 2 - 6;
      stick.setPointerCapture(e.pointerId);
      const r = stick.getBoundingClientRect();
      set(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
      e.preventDefault();
    });
    stick.addEventListener('pointermove', (e) => {
      if (e.pointerId !== ativo) return;
      const r = stick.getBoundingClientRect();
      set(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
    });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) stick.addEventListener(ev, zerar);
  }

  document.querySelectorAll('[data-ctl]').forEach((btn) => {
    const acao = (btn as HTMLElement).dataset.ctl as 'chutar' | 'poder' | 'correr';
    const on = (e: Event) => { inp[acao] = true; btn.classList.add('on'); (btn as HTMLElement).setPointerCapture?.((e as PointerEvent).pointerId); e.preventDefault(); };
    const off = () => { inp[acao] = false; btn.classList.remove('on'); };
    btn.addEventListener('pointerdown', on);
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) btn.addEventListener(ev, off);
  });
}
