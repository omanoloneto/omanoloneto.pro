import type { Audio, Contexto } from './tipos';

export function criarAudio(ctx: Contexto): Audio {
  let actx: AudioContext | null = null;

  function init() {
    if (actx) return;
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (AC) actx = new AC();
  }

  function tom(freq: number, inicio: number, dur: number, tipo: OscillatorType, vol: number, freqFim?: number) {
    if (!actx || ctx.estado.mudo) return;
    const o = actx.createOscillator();
    const gn = actx.createGain();
    o.type = tipo;
    o.frequency.value = freq;
    const t = actx.currentTime + inicio;
    if (freqFim) o.frequency.exponentialRampToValueAtTime(freqFim, t + dur);
    o.connect(gn);
    gn.connect(actx.destination);
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.linearRampToValueAtTime(vol, t + 0.02);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  return {
    retomar() {
      init();
      if (actx && actx.state === 'suspended') actx.resume();
    },
    suspender() {
      if (actx) actx.suspend();
    },
    bindMute(btn, icone) {
      const aplicar = () => {
        btn.setAttribute('aria-pressed', String(ctx.estado.mudo));
        icone.textContent = ctx.estado.mudo ? '🔈' : '🔊';
      };
      const salvo = localStorage.getItem('eco-hero:mudo');
      ctx.estado.mudo = salvo === null ? !ctx.cfg.somLigadoInicial : salvo === '1';
      aplicar();
      btn.addEventListener('click', () => {
        ctx.estado.mudo = !ctx.estado.mudo;
        localStorage.setItem('eco-hero:mudo', ctx.estado.mudo ? '1' : '0');
        aplicar();
      });
    },
    somPulo() { tom(300, 0, 0.15, 'square', 0.08, 520); },
    somColeta() { tom(660, 0, 0.08, 'triangle', 0.14); tom(880, 0.07, 0.12, 'triangle', 0.14); },
    somStomp() { tom(200, 0, 0.12, 'square', 0.12, 90); },
    somDano() { tom(180, 0, 0.2, 'sawtooth', 0.1, 90); },
    somMorte() { tom(392, 0, 0.2, 'square', 0.1, 260); tom(260, 0.2, 0.35, 'square', 0.1, 130); },
    somCheckpoint() { [523, 659, 784].forEach((f, i) => tom(f, i * 0.09, 0.16, 'triangle', 0.14)); },
    somLixeira() { [392, 523, 659, 784, 1046].forEach((f, i) => tom(f, i * 0.09, 0.2, 'triangle', 0.16)); },
    somVitoria() { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tom(f, i * 0.14, 0.25, 'triangle', 0.16)); },
  };
}
