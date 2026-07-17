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
    const g = actx.createGain();
    o.type = tipo;
    o.frequency.value = freq;
    const t = actx.currentTime + inicio;
    if (freqFim) o.frequency.exponentialRampToValueAtTime(freqFim, t + dur);
    o.connect(g);
    g.connect(actx.destination);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  function ruido(dur: number, vol: number, freq: number) {
    if (!actx || ctx.estado.mudo) return;
    const n = Math.floor(actx.sampleRate * dur);
    const buf = actx.createBuffer(1, n, actx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = actx.createBufferSource();
    src.buffer = buf;
    const filtro = actx.createBiquadFilter();
    filtro.type = 'bandpass';
    filtro.frequency.value = freq;
    filtro.Q.value = 1.2;
    const g = actx.createGain();
    g.gain.value = vol;
    src.connect(filtro);
    filtro.connect(g);
    g.connect(actx.destination);
    src.start();
  }

  let ultimoJato = 0;

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
      const salvo = localStorage.getItem('sugar-splash:mudo');
      ctx.estado.mudo = salvo === null ? !ctx.cfg.somLigadoInicial : salvo === '1';
      aplicar();
      btn.addEventListener('click', () => {
        ctx.estado.mudo = !ctx.estado.mudo;
        localStorage.setItem('sugar-splash:mudo', ctx.estado.mudo ? '1' : '0');
        aplicar();
      });
    },
    somJato() {
      const agora = performance.now();
      if (agora - ultimoJato < 90) return;
      ultimoJato = agora;
      ruido(0.09, 0.1, 2400);
    },
    somSplash() { ruido(0.18, 0.16, 900); },
    somDerreter() {
      tom(520, 0, 0.5, 'sine', 0.16, 120);
      ruido(0.4, 0.12, 600);
    },
    somDano() { tom(220, 0, 0.12, 'square', 0.1); },
    somOnda() { [392, 523, 659, 784].forEach((f, i) => tom(f, i * 0.1, 0.2, 'triangle', 0.16)); },
    somFim() { tom(392, 0, 0.5, 'triangle', 0.14); tom(311, 0.2, 0.5, 'triangle', 0.14); tom(262, 0.4, 0.7, 'triangle', 0.14); },
    somRecarga() { tom(523, 0, 0.08, 'triangle', 0.12); tom(784, 0.08, 0.12, 'triangle', 0.12); },
  };
}
