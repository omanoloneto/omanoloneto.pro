import type { Ctx } from './types';

const KEYS: Record<string, 'accel' | 'brake' | 'left' | 'right'> = {
  ArrowUp: 'accel', w: 'accel', W: 'accel',
  ArrowDown: 'brake', s: 'brake', S: 'brake',
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
};

export function bindInput(ctx: Ctx) {
  const { input, state } = ctx;

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.key === 'Escape') {
      if (ctx.minimap.mapOpen()) { e.preventDefault(); ctx.minimap.toggleMap(); return; }
      if (state.phase === 'playing') { e.preventDefault(); ctx.flow.pause(); }
      else if (state.phase === 'paused') { e.preventDefault(); ctx.flow.resume(); }
      return;
    }
    if (state.phase !== 'playing' || e.repeat) return;
    if (/^[mM]$/.test(e.key)) {
      e.preventDefault();
      ctx.minimap.toggleMap();
      return;
    }
    if (e.key === ' ') {
      e.preventDefault();
      input.handbrake = true;
      ctx.flow.onFirstInput();
      return;
    }
    const action = KEYS[e.key];
    if (action) {
      e.preventDefault();
      input[action] = true;
      ctx.flow.onFirstInput();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.key === ' ') input.handbrake = false;
    const action = KEYS[e.key];
    if (action) input[action] = false;
  });

  document.querySelectorAll<HTMLElement>('.ctl').forEach((btn) => {
    const action = btn.dataset.ctl as 'accel' | 'brake' | 'left' | 'right' | 'handbrake';
    const press = (e: PointerEvent) => {
      e.preventDefault();
      btn.setPointerCapture && btn.setPointerCapture(e.pointerId);
      input[action] = true;
      btn.classList.add('on');
      ctx.flow.onFirstInput();
    };
    const release = () => {
      input[action] = false;
      btn.classList.remove('on');
    };
    btn.addEventListener('pointerdown', press);
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('lostpointercapture', release);
  });

  window.addEventListener('blur', () => ctx.flow.releaseInputs());
}
