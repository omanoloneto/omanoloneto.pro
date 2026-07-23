import type { Audio, Ctx } from './tipos';

export function criarAudio(ctx: Ctx): Audio {
  const chave = ctx.cfg.ranking.jogo + ':mudo';
  let ac: AudioContext | null = null;
  let mestre: GainNode | null = null;

  function garantir() {
    if (ac) return;
    const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    ac = new AC();
    mestre = ac.createGain();
    mestre.gain.value = ctx.estado.mudo ? 0 : 0.7;
    mestre.connect(ac.destination);
  }

  function tom(freq: number, ini: number, dur: number, tipo: OscillatorType, vol: number, freqFim?: number) {
    if (!ac || !mestre) return;
    const t0 = ac.currentTime + ini;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(freq, t0);
    if (freqFim) o.frequency.exponentialRampToValueAtTime(Math.max(1, freqFim), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(mestre);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  function ruido(dur: number, vol: number, freq: number) {
    if (!ac || !mestre) return;
    const t0 = ac.currentTime;
    const n = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, n, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource();
    src.buffer = buf;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = 1.2;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(bp).connect(g).connect(mestre);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  return {
    init: garantir,
    retomar() { garantir(); ac?.resume(); },
    suspender() { ac?.suspend(); },
    bindMute(btn, icon) {
      const aplicar = () => {
        icon.textContent = ctx.estado.mudo ? '🔈' : '🔊';
        btn.setAttribute('aria-pressed', String(ctx.estado.mudo));
        if (mestre) mestre.gain.value = ctx.estado.mudo ? 0 : 0.7;
      };
      aplicar();
      btn.addEventListener('click', () => {
        ctx.estado.mudo = !ctx.estado.mudo;
        try { localStorage.setItem(chave, ctx.estado.mudo ? '1' : '0'); } catch { }
        aplicar();
      });
    },
    apito(longo = false) { garantir(); tom(2100, 0, longo ? 0.5 : 0.22, 'triangle', 0.12); ruido(longo ? 0.5 : 0.2, 0.06, 2300); },
    chute(forte = false) { garantir(); tom(forte ? 340 : 240, 0, 0.09, 'square', 0.16, forte ? 120 : 150); if (forte) tom(90, 0, 0.18, 'sawtooth', 0.12, 50); },
    gol() { garantir(); [523, 659, 784, 1046].forEach((f, i) => tom(f, i * 0.09, 0.22, 'triangle', 0.16)); ruido(0.5, 0.08, 1200); },
    poder() { garantir(); tom(440, 0, 0.1, 'triangle', 0.14); tom(880, 0.08, 0.16, 'triangle', 0.14, 1400); ruido(0.2, 0.06, 900); },
    quique() { garantir(); tom(180, 0, 0.06, 'square', 0.08, 110); },
  };
}
