import type { Ctx, UI } from './types';

export function createUI(_ctx: Ctx): UI {
  const $ = (s: string) => document.querySelector(s) as HTMLElement;
  const els = {
    scene: $('[data-cena]'),
    speed: $('[data-vel]'),
    place: $('[data-lugar]'),
    intro: $('[data-inicio]'),
    pauseModal: $('[data-pausa]'),
    startBtn: $('[data-acelerar]'),
    resumeBtn: $('[data-continuar]'),
    exitBtn: $('[data-sair]'),
    pauseBtn: $('[data-pause]'),
    muteBtn: $('[data-mute]'),
    muteIcon: $('[data-mute-icon]'),
    controls: $('[data-controles]'),
    hint: $('[data-fantasma]'),
    minimap: $('[data-minimapa]'),
    mapPanel: $('[data-mapa]'),
    mapCanvas: $('[data-mapa-canvas]'),
    mapClose: $('[data-mapa-fechar]'),
    announcer: $('[data-anuncio]'),
  };

  let lastSpeed = -1;
  let speedMs = 0;
  let announceAt = 0;
  let place = '';

  return {
    els,
    setSpeed(kmh) {
      const v = Math.round(kmh);
      const now = performance.now();
      if (v === lastSpeed || now - speedMs < 80) return;
      lastSpeed = v;
      speedMs = now;
      els.speed.textContent = String(v);
    },
    setPlace(nome, emoji) {
      const next = nome ? (emoji ? emoji + ' ' : '') + nome : '';
      if (next === place) return;
      place = next;
      els.place.textContent = next;
      els.place.hidden = !next;
    },
    announce(msg) {
      const now = performance.now();
      if (now - announceAt < 1000) return;
      announceAt = now;
      els.announcer.textContent = '';
      requestAnimationFrame(() => { els.announcer.textContent = msg; });
    },
  };
}
