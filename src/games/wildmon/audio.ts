import type { Audio, Contexto } from './tipos';

export function criarAudio(ctx: Contexto): Audio {
  let actx: AudioContext | null = null;

  function init() {
    if (actx) return;
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (AC) actx = new AC();
  }

  function tom(freq: number, inicio: number, dur: number, tipo: OscillatorType, vol: number) {
    if (!actx || ctx.estado.mudo) return;
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = tipo;
    o.frequency.value = freq;
    o.connect(g);
    g.connect(actx.destination);
    const t = actx.currentTime + inicio;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  let ultimoPasso = 0;

  return {
    retomar() {
      init();
      if (actx && actx.state === 'suspended') actx.resume();
    },
    bindMute(btn, icone) {
      const aplicar = () => {
        btn.setAttribute('aria-pressed', String(ctx.estado.mudo));
        icone.textContent = ctx.estado.mudo ? '🔈' : '🔊';
      };
      const salvo = localStorage.getItem('wildmon:mudo');
      ctx.estado.mudo = salvo === '1';
      aplicar();
      btn.addEventListener('click', () => {
        ctx.estado.mudo = !ctx.estado.mudo;
        localStorage.setItem('wildmon:mudo', ctx.estado.mudo ? '1' : '0');
        aplicar();
      });
    },
    somPasso() {
      const agora = performance.now();
      if (agora - ultimoPasso < 180) return;
      ultimoPasso = agora;
      tom(90, 0, 0.05, 'triangle', 0.05);
    },
    somBlip() { tom(660, 0, 0.04, 'square', 0.05); },
    somConfirma() { tom(523, 0, 0.08, 'triangle', 0.12); tom(784, 0.07, 0.1, 'triangle', 0.12); },
    jingleEscolha() { [523, 659, 784, 1046].forEach((f, i) => tom(f, i * 0.1, 0.18, 'triangle', 0.16)); },
  };
}
