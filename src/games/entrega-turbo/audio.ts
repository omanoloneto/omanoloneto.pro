// Áudio: Web Audio sintetizado (sem arquivos) + motor contínuo + mute.
import type { Audio, Contexto } from './tipos';

export function criarAudio(ctx: Contexto): Audio {
  let actx: AudioContext | null = null;
  let motorOsc: OscillatorNode | null = null;
  let motorGain: GainNode | null = null;

  function init() {
    if (actx) return;
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    actx = new AC();
    motorOsc = actx.createOscillator();
    motorGain = actx.createGain();
    motorOsc.type = 'sawtooth';
    motorOsc.frequency.value = 70;
    motorGain.gain.value = 0;
    motorOsc.connect(motorGain);
    motorGain.connect(actx.destination);
    motorOsc.start();
  }

  function tom(freq: number, inicio: number, dur: number, tipo: OscillatorType, vol: number) {
    if (!actx) return;
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

  const mudo = () => ctx.estado.mudo;

  return {
    init,
    retomar() {
      init();
      if (actx && actx.state === 'suspended') actx.resume();
    },
    // fora do jogo o grafo de áudio para de processar (bateria dos Chromebooks)
    suspender() {
      if (actx) actx.suspend();
    },
    bindMute(btn, icone) {
      const aplicar = () => {
        btn.setAttribute('aria-pressed', String(ctx.estado.mudo));
        icone.textContent = ctx.estado.mudo ? '🔈' : '🔊';
      };
      const salvo = localStorage.getItem('entrega-turbo:mudo');
      ctx.estado.mudo = salvo === null ? !ctx.cfg.somLigadoInicial : salvo === '1';
      aplicar();
      btn.addEventListener('click', () => {
        ctx.estado.mudo = !ctx.estado.mudo;
        localStorage.setItem('entrega-turbo:mudo', ctx.estado.mudo ? '1' : '0');
        aplicar();
      });
    },
    atualizarMotor() {
      if (!motorGain || !actx || !motorOsc) return;
      const alvoGain = ctx.estado.mudo || ctx.estado.fase !== 'jogando' ? 0 : 0.028;
      motorGain.gain.setTargetAtTime(alvoGain, actx.currentTime, 0.08);
      motorOsc.frequency.setTargetAtTime(70 + Math.abs(ctx.truck.v) * 16, actx.currentTime, 0.05);
    },
    silenciarMotor() {
      if (motorGain && actx) motorGain.gain.setTargetAtTime(0, actx.currentTime, 0.05);
    },
    somColeta() { if (mudo()) return; tom(523, 0, 0.1, 'triangle', 0.16); tom(659, 0.09, 0.14, 'triangle', 0.16); },
    somEntrega() { if (mudo()) return; [523, 659, 784, 1046].forEach((f, i) => tom(f, i * 0.09, 0.18, 'triangle', 0.18)); },
    somBatida() { if (mudo()) return; tom(120, 0, 0.18, 'square', 0.14); },
    somBuzina() { if (mudo()) return; tom(392, 0, 0.18, 'square', 0.14); tom(494, 0.02, 0.22, 'square', 0.12); },
    somPedido() { if (mudo()) return; tom(660, 0, 0.09, 'triangle', 0.14); tom(880, 0.1, 0.12, 'triangle', 0.14); },
    somNivel() { if (mudo()) return; [523, 659, 784, 1046].forEach((f, i) => tom(f, i * 0.12, 0.22, 'triangle', 0.2)); },
    somFim() { if (mudo()) return; tom(392, 0, 0.5, 'triangle', 0.14); tom(494, 0.14, 0.5, 'triangle', 0.14); tom(587, 0.28, 0.6, 'triangle', 0.14); },
    somUfa() { if (mudo()) return; tom(300, 0, 0.25, 'sine', 0.12); tom(392, 0.2, 0.3, 'sine', 0.12); },
  };
}
