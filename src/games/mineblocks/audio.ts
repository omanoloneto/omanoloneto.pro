// Áudio: Web Audio sintetizado (sem arquivos) pros SFX + duas faixas de
// música (dia/noite) em HTMLAudioElement com crossfade pelo ciclo do céu.
import type { Audio, Contexto } from './tipos';
import { DIA_S } from './ceu';

const MUS_VOL = 0.3;
const FADE_S = 3;

export function criarAudio(ctx: Contexto): Audio {
  let actx: AudioContext | null = null;
  let ruidoBuf: AudioBuffer | null = null;

  let musDia: HTMLAudioElement | null = null;
  let musNoite: HTMLAudioElement | null = null;
  let nivelNoite = 0;
  let tocando = false;

  function eNoite() {
    return !!ctx.ceu && ctx.ceu.tempo() >= DIA_S;
  }
  function aplicarVol() {
    if (!musDia || !musNoite) return;
    musDia.volume = MUS_VOL * (1 - nivelNoite);
    musNoite.volume = MUS_VOL * nivelNoite;
  }
  function iniciarMusica() {
    if (!musDia) {
      musDia = new window.Audio('/class/audio/mineblocks/dia.mp3');
      musDia.loop = true;
      musDia.preload = 'auto';
      musNoite = new window.Audio('/class/audio/mineblocks/noite.mp3');
      musNoite.loop = true;
      musNoite.preload = 'auto';
      nivelNoite = eNoite() ? 1 : 0;
    }
    aplicarVol();
    if (!ctx.estado.mudo) {
      const p1 = musDia.play();
      if (p1 && typeof p1.catch === 'function') p1.catch(() => {});
      const p2 = musNoite!.play();
      if (p2 && typeof p2.catch === 'function') p2.catch(() => {});
      tocando = true;
    }
  }
  function pausarMusica() {
    if (musDia) musDia.pause();
    if (musNoite) musNoite.pause();
    tocando = false;
  }

  function init() {
    if (actx) return;
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    actx = new AC();
    // buffer de ruído branco curto pros "crocs" de quebrar
    ruidoBuf = actx.createBuffer(1, actx.sampleRate * 0.18, actx.sampleRate);
    const d = ruidoBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
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
    g.gain.linearRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  // "croc" filtrado — grave pra pedra, agudo pra folha/areia
  function croc(freqCentro: number, vol: number, dur = 0.12) {
    if (!actx || !ruidoBuf) return;
    const src = actx.createBufferSource();
    src.buffer = ruidoBuf;
    const filtro = actx.createBiquadFilter();
    filtro.type = 'bandpass';
    filtro.frequency.value = freqCentro;
    filtro.Q.value = 1.2;
    const g = actx.createGain();
    src.connect(filtro);
    filtro.connect(g);
    g.connect(actx.destination);
    const t = actx.currentTime;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  function howl(f0: number, f1: number, dur: number, vol: number) {
    if (!actx) return;
    const o = actx.createOscillator();
    const g = actx.createGain();
    const lfo = actx.createOscillator();
    const lfoGain = actx.createGain();
    o.type = 'sine';
    lfo.type = 'sine';
    lfo.frequency.value = 5.5;
    lfoGain.gain.value = f0 * 0.06;
    lfo.connect(lfoGain);
    lfoGain.connect(o.frequency);
    o.connect(g);
    g.connect(actx.destination);
    const t = actx.currentTime;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + dur * 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t);
    lfo.start(t);
    o.stop(t + dur + 0.05);
    lfo.stop(t + dur + 0.05);
  }

  const mudo = () => ctx.estado.mudo;

  return {
    init,
    retomar() {
      init();
      if (actx && actx.state === 'suspended') actx.resume();
      iniciarMusica();
    },
    suspender() {
      if (actx) actx.suspend();
    },
    passoMusica(dt) {
      if (!tocando || !musDia) return;
      const alvo = eNoite() ? 1 : 0;
      if (nivelNoite !== alvo) {
        const passo = Math.min(dt / FADE_S, Math.abs(alvo - nivelNoite));
        nivelNoite += Math.sign(alvo - nivelNoite) * passo;
        aplicarVol();
      }
    },
    musInfo() {
      return {
        tocando,
        nivelNoite,
        volDia: musDia ? musDia.volume : 0,
        volNoite: musNoite ? musNoite.volume : 0,
      };
    },
    bindMute(btn, icone) {
      const aplicar = () => {
        btn.setAttribute('aria-pressed', String(ctx.estado.mudo));
        icone.textContent = ctx.estado.mudo ? '🔈' : '🔊';
      };
      const salvo = localStorage.getItem('mineblocks:mudo');
      ctx.estado.mudo = salvo === null ? !ctx.cfg.somLigadoInicial : salvo === '1';
      aplicar();
      btn.addEventListener('click', () => {
        ctx.estado.mudo = !ctx.estado.mudo;
        localStorage.setItem('mineblocks:mudo', ctx.estado.mudo ? '1' : '0');
        aplicar();
        if (ctx.estado.mudo) pausarMusica();
        else iniciarMusica();
      });
    },
    somQuebrar(id) {
      if (mudo()) return;
      // timbre por material: pedra grave, terra média, folha/areia aguda
      const grave = id === 3 || id === 9 || id === 10;
      const agudo = id === 7 || id === 4 || id === 11 || id === 12;
      croc(grave ? 300 : agudo ? 1400 : 700, 0.22);
    },
    somColocar() { if (mudo()) return; croc(900, 0.14, 0.07); tom(220, 0, 0.06, 'square', 0.06); },
    somPulo() { if (mudo()) return; tom(300, 0, 0.07, 'sine', 0.05); },
    somSplash() { if (mudo()) return; croc(600, 0.2, 0.25); },
    somUI() { if (mudo()) return; tom(660, 0, 0.06, 'triangle', 0.1); },
    somSalvo() { if (mudo()) return; tom(523, 0, 0.1, 'triangle', 0.12); tom(784, 0.09, 0.14, 'triangle', 0.12); },
    somErro() { if (mudo()) return; tom(220, 0, 0.15, 'square', 0.08); },
    somFantasma() { if (mudo()) return; howl(180, 118, 1.1, 0.09); },
    somSusto() { if (mudo()) return; howl(300, 150, 0.35, 0.14); croc(250, 0.2, 0.18); },
  };
}
