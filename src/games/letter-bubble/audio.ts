const MUTE_KEY = 'bolhas-de-letras:mudo';
const SPEAK_KEY = 'bolhas-de-letras:falar';
const MUSICA_URL = '/class/audio/bolhas-de-letras/bubble-letter-skies.ogg';
const MUSICA_VOL = 0.35;

export function criarAudio() {
  let actx: AudioContext | null = null;
  let mudo = localStorage.getItem(MUTE_KEY) === '1';
  let falar = localStorage.getItem(SPEAK_KEY) === '1';
  let musica: HTMLAudioElement | null = null;

  function iniciarMusica() {
    if (!musica) {
      musica = new Audio(MUSICA_URL);
      musica.loop = true;
      musica.volume = MUSICA_VOL;
      musica.preload = 'auto';
    }
    if (!mudo) {
      const pr = musica.play();
      if (pr && typeof pr.catch === 'function') pr.catch(() => {});
    }
  }

  function ctx(): AudioContext | null {
    if (mudo) return null;
    if (!actx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      actx = new AC();
    }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }

  function beep(freq: number, dur: number, tipo: OscillatorType, vol: number, freqFim?: number, delay = 0) {
    const ac = ctx();
    if (!ac) return;
    const t0 = ac.currentTime + delay;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(freq, t0);
    if (freqFim) o.frequency.exponentialRampToValueAtTime(freqFim, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(ac.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  return {
    somLancar: () => beep(280, 0.12, 'triangle', 0.12, 420),
    somPop: () => beep(620, 0.09, 'sine', 0.14, 880),
    somMatch: () => {
      beep(523, 0.1, 'triangle', 0.14);
      beep(659, 0.1, 'triangle', 0.14, undefined, 0.09);
      beep(784, 0.16, 'triangle', 0.14, undefined, 0.18);
    },
    somErro: () => beep(240, 0.16, 'sine', 0.07, 200),
    somVitoria: () => {
      [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.16, 'triangle', 0.13, undefined, i * 0.13));
    },
    somClique: () => beep(760, 0.05, 'square', 0.05),
    iniciarMusica,
    get musicaTocando() { return !!musica && !musica.paused; },
    get musicaInfo() { return musica ? { loop: musica.loop, volume: musica.volume } : null; },
    falarLetra(id: string) {
      if (!falar || mudo || !('speechSynthesis' in window)) return;
      const u = new SpeechSynthesisUtterance(id);
      u.lang = 'pt-BR';
      u.rate = 0.85;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    },
    get mudo() { return mudo; },
    setMudo(v: boolean) {
      mudo = v;
      localStorage.setItem(MUTE_KEY, v ? '1' : '0');
      if (musica) {
        if (v) musica.pause();
        else {
          const pr = musica.play();
          if (pr && typeof pr.catch === 'function') pr.catch(() => {});
        }
      }
    },
    get falar() { return falar; },
    setFalar(v: boolean) {
      falar = v;
      localStorage.setItem(SPEAK_KEY, v ? '1' : '0');
    },
  };
}
