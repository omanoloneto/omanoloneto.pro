// Áudio: tudo sintetizado com Web Audio (sem arquivos). Primitivas genéricas;
// os apps compõem (ex.: navegador monta a discagem com dtmf + tom + ruído).
import type { Audio, Contexto, Trecho } from './tipos';

export function criarAudio(ctx: Contexto): Audio {
  let actx: AudioContext | null = null;
  // osciladores do último trecho agendado (melodia/acorde) — canceláveis
  let agendados: OscillatorNode[] = [];

  function init() {
    if (actx) return;
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (AC) actx = new AC();
  }

  function pronto() {
    return !!actx && actx.state === 'running';
  }

  function tom(freq: number, inicio: number, dur: number, tipo: OscillatorType, vol: number) {
    if (!pronto()) return;
    const o = actx!.createOscillator();
    const g = actx!.createGain();
    o.type = tipo;
    o.frequency.value = freq;
    o.connect(g);
    g.connect(actx!.destination);
    const t = actx!.currentTime + inicio;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function tocarTrecho(trecho: Trecho): number {
    if (ctx.estado.mudo || !pronto()) return 0;
    pararTrecho();
    const t0 = actx!.currentTime + 0.05;
    let t = t0;
    let fim = 0;
    trecho.notas.forEach(([freq, dur], n) => {
      const inicio = trecho.passo != null ? t0 + n * trecho.passo : t;
      const o = actx!.createOscillator();
      const g = actx!.createGain();
      o.type = trecho.tipo;
      o.frequency.value = freq;
      o.connect(g);
      g.connect(actx!.destination);
      g.gain.setValueAtTime(0.0001, inicio);
      g.gain.linearRampToValueAtTime(trecho.vol, inicio + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, inicio + dur);
      o.start(inicio);
      o.stop(inicio + dur + 0.03);
      agendados.push(o);
      fim = Math.max(fim, inicio + dur - t0);
      t += dur;
    });
    return Math.round(fim * 1000);
  }

  function pararTrecho() {
    agendados.forEach((o) => { try { o.stop(); } catch { /* já parou */ } });
    agendados = [];
  }

  function dtmf(digitos: [number, number][], passo: number, vol: number) {
    if (!pronto()) return;
    const t0 = actx!.currentTime;
    digitos.forEach((par, i) => par.forEach((f) => {
      const o = actx!.createOscillator();
      const g = actx!.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      o.connect(g);
      g.connect(actx!.destination);
      const t = t0 + i * passo;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.01);
      g.gain.setValueAtTime(vol, t + 0.08);
      g.gain.linearRampToValueAtTime(0.0001, t + 0.09);
      o.start(t);
      o.stop(t + 0.1);
    }));
  }

  function ruidoFiltrado(inicio: number, dur: number, freqCentral: number, vol: number) {
    if (!pronto()) return;
    const buf = actx!.createBuffer(1, Math.ceil(actx!.sampleRate * dur), actx!.sampleRate);
    const dados = buf.getChannelData(0);
    for (let i = 0; i < dados.length; i++) dados[i] = Math.random() * 2 - 1;
    const src = actx!.createBufferSource();
    src.buffer = buf;
    const filtro = actx!.createBiquadFilter();
    filtro.type = 'bandpass';
    filtro.frequency.value = freqCentral;
    filtro.Q.value = 0.7;
    const g = actx!.createGain();
    src.connect(filtro);
    filtro.connect(g);
    g.connect(actx!.destination);
    const t = actx!.currentTime + inicio;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.06);
    g.gain.setValueAtTime(vol, t + dur * 0.7);
    g.gain.linearRampToValueAtTime(0.0001, t + dur * 0.9);
    src.start(t);
    src.stop(t + dur);
  }

  function somClique() {
    if (ctx.estado.mudo) return;
    tom(880, 0, 0.04, 'square', 0.05);
  }

  function bindMute() {
    const chave = ctx.dados.chave + ':mudo';
    const { mute, muteUse } = ctx.ui.els;
    function aplicar() {
      mute.setAttribute('aria-pressed', String(ctx.estado.mudo));
      muteUse.setAttribute('href', ctx.estado.mudo ? '#i-som-mudo' : '#i-som');
      mute.setAttribute('aria-label', ctx.estado.mudo ? 'Ligar o som' : 'Desligar o som');
    }
    ctx.estado.mudo = localStorage.getItem(chave) === '1';
    aplicar();
    mute.addEventListener('click', () => {
      ctx.estado.mudo = !ctx.estado.mudo;
      localStorage.setItem(chave, ctx.estado.mudo ? '1' : '0');
      aplicar();
    });
  }

  // Primeiro gesto em qualquer lugar libera o áudio
  document.addEventListener('pointerdown', () => {
    init();
    if (actx && actx.state === 'suspended') actx.resume();
  }, { once: true, capture: true });

  return { init, pronto, tom, tocarTrecho, pararTrecho, dtmf, ruidoFiltrado, somClique, bindMute };
}
