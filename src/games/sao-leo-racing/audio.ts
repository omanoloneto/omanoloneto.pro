import type { Audio, Ctx } from './types';

export function createAudio(ctx: Ctx): Audio {
  let actx: AudioContext | null = null;
  let engineOsc: OscillatorNode | null = null;
  let engineOsc2: OscillatorNode | null = null;
  let engineGain: GainNode | null = null;
  let skidGain: GainNode | null = null;

  function init() {
    if (actx) return;
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    actx = new AC();
    const filter = actx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    engineGain = actx.createGain();
    engineGain.gain.value = 0;
    engineOsc = actx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    engineOsc2 = actx.createOscillator();
    engineOsc2.type = 'square';
    engineOsc2.frequency.value = 28;
    const g2 = actx.createGain();
    g2.gain.value = 0.4;
    engineOsc.connect(filter);
    engineOsc2.connect(g2);
    g2.connect(filter);
    filter.connect(engineGain);
    engineGain.connect(actx.destination);
    engineOsc.start();
    engineOsc2.start();

    const len = actx.sampleRate;
    const buf = actx.createBuffer(1, len, actx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const noise = actx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const band = actx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 1700;
    band.Q.value = 0.9;
    skidGain = actx.createGain();
    skidGain.gain.value = 0;
    noise.connect(band);
    band.connect(skidGain);
    skidGain.connect(actx.destination);
    noise.start();
  }

  function tone(freq: number, start: number, dur: number, type: OscillatorType, vol: number) {
    if (!actx) return;
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = type;
    o.frequency.value = freq;
    o.connect(g);
    g.connect(actx.destination);
    const t = actx.currentTime + start;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  const muted = () => ctx.state.muted;

  return {
    init,
    resume() {
      init();
      if (actx && actx.state === 'suspended') actx.resume();
    },
    suspend() {
      if (actx) actx.suspend();
    },
    bindMute(btn, icon) {
      const apply = () => {
        btn.setAttribute('aria-pressed', String(ctx.state.muted));
        icon.textContent = ctx.state.muted ? '🔈' : '🔊';
      };
      const saved = localStorage.getItem('sao-leo-racing:mudo');
      ctx.state.muted = saved === null ? !ctx.cfg.somLigadoInicial : saved === '1';
      apply();
      btn.addEventListener('click', () => {
        ctx.state.muted = !ctx.state.muted;
        localStorage.setItem('sao-leo-racing:mudo', ctx.state.muted ? '1' : '0');
        apply();
      });
    },
    engine(speed, throttle, drifting) {
      if (!actx || !engineOsc || !engineOsc2 || !engineGain || !skidGain) return;
      const off = ctx.state.muted || ctx.state.phase !== 'playing';
      const k = Math.abs(speed);
      engineGain.gain.setTargetAtTime(off ? 0 : throttle ? 0.05 : 0.028, actx.currentTime, 0.08);
      engineOsc.frequency.setTargetAtTime(55 + k * 3.4, actx.currentTime, 0.05);
      engineOsc2.frequency.setTargetAtTime(28 + k * 1.7, actx.currentTime, 0.05);
      skidGain.gain.setTargetAtTime(off || !drifting || k < 6 ? 0 : 0.05, actx.currentTime, 0.05);
    },
    crash() {
      if (muted()) return;
      tone(90, 0, 0.2, 'square', 0.16);
      tone(50, 0.02, 0.26, 'sawtooth', 0.12);
    },
    ui() {
      if (muted()) return;
      tone(520, 0, 0.08, 'triangle', 0.12);
    },
  };
}
