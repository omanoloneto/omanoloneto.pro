import * as THREE from 'three';
import { createStage3D } from '../../lib/stage3d';
import { createUI } from './ui';
import { createAudio } from './audio';
import { createCity } from './city';
import { createCar } from './car';
import { createDayNight } from './daynight';
import { createDriving } from './driving';
import { createChaseCam } from './camera';
import { createMinimap } from './minimap';
import { bindInput } from './input';
import type { Ctx, State } from './types';

export function startGame() {
  const data = JSON.parse(document.querySelector('[data-dados]')!.textContent!);

  const state: State = { phase: 'intro', muted: false, firstInput: false };
  const input = { accel: false, brake: false, left: false, right: false, handbrake: false };
  const sceneEl = document.querySelector('[data-cena]') as HTMLElement;

  const ctx = {
    cfg: data.config,
    map: data.mapa,
    carData: data.carros[0],
    parts: data.pecas,
    state,
    input,
    sceneEl,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    textures: {},
    surfaces: data.config.superficies,
  } as Ctx;

  const stage = createStage3D(sceneEl, {
    fov: data.config.camera.fov,
    far: 600,
    onFrame(dt) {
      if (state.phase !== 'playing') return;
      ctx.driving.step(dt);
      ctx.chase.step(dt);
      ctx.dayNight.step(dt);
      ctx.minimap.step(dt * 1000);
      const tel = ctx.driving.telemetry();
      ctx.audio.engine(tel.speedFwd, input.accel, tel.drifting);
    },
  });
  ctx.stage = stage;
  ctx.scene = stage.scene;
  ctx.camera = stage.camera;
  stage.renderer.toneMapping = THREE.LinearToneMapping;

  const K = data.config.cores;
  stage.scene.background = new THREE.Color(K.ceu);
  stage.scene.fog = new THREE.Fog(new THREE.Color(K.neblina), K.neblinaPerto, K.neblinaLonge);

  ctx.ui = createUI(ctx);
  ctx.audio = createAudio(ctx);
  ctx.audio.bindMute(ctx.ui.els.muteBtn, ctx.ui.els.muteIcon);
  ctx.city = createCity(ctx);
  ctx.car = createCar(ctx);
  ctx.driving = createDriving(ctx);
  ctx.chase = createChaseCam(ctx);
  ctx.dayNight = createDayNight(ctx);
  ctx.minimap = createMinimap(ctx);

  const touchMode = window.matchMedia('(pointer: coarse)').matches;

  const flow = {
    start() {
      state.phase = 'playing';
      ctx.ui.els.intro.hidden = true;
      ctx.ui.els.pauseModal.hidden = true;
      ctx.ui.els.pauseBtn.hidden = false;
      ctx.ui.els.controls.hidden = !touchMode;
      ctx.ui.els.hint.hidden = false;
      ctx.ui.els.minimap.hidden = false;
      ctx.audio.resume();
      stage.measure();
      ctx.chase.snap();
      stage.startLoop();
      ctx.ui.announce('Acelere pelas ruas de São Leopoldo! Setas ou W A S D dirigem, espaço derrapa.');
    },
    pause() {
      if (state.phase !== 'playing') return;
      state.phase = 'paused';
      flow.releaseInputs();
      stage.stopLoop();
      stage.render();
      ctx.audio.engine(0, false, false);
      ctx.audio.suspend();
      ctx.ui.els.pauseBtn.hidden = true;
      ctx.ui.els.pauseModal.hidden = false;
      setTimeout(() => (ctx.ui.els.resumeBtn as HTMLElement).focus(), 60);
      ctx.ui.announce('Jogo pausado.');
    },
    resume() {
      if (state.phase !== 'paused') return;
      state.phase = 'playing';
      ctx.ui.els.pauseModal.hidden = true;
      ctx.ui.els.pauseBtn.hidden = false;
      ctx.audio.resume();
      stage.startLoop();
    },
    releaseInputs() {
      input.accel = input.brake = input.left = input.right = input.handbrake = false;
      document.querySelectorAll('.ctl.on').forEach((b) => b.classList.remove('on'));
    },
    onFirstInput() {
      if (state.firstInput) return;
      state.firstInput = true;
      ctx.ui.els.hint.hidden = true;
    },
  };
  ctx.flow = flow;

  bindInput(ctx);
  ctx.ui.els.startBtn.addEventListener('click', () => { ctx.audio.ui(); flow.start(); });
  ctx.ui.els.resumeBtn.addEventListener('click', () => { ctx.audio.ui(); flow.resume(); });
  ctx.ui.els.pauseBtn.addEventListener('click', () => flow.pause());
  ctx.ui.els.exitBtn.addEventListener('click', () => { window.location.href = '/class/games/'; });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.phase === 'playing') flow.pause();
  });

  document.body.classList.add('is-game');
  stage.measure();
  ctx.chase.snap();
  stage.render();

  (window as any).__od = {
    state,
    input,
    stage,
    car: ctx.car.state,
    telemetry: () => ctx.driving.telemetry(),
    surfaceAt: (x: number, z: number) => ctx.city.surfaceAt(x, z),
    solidAt: (x: number, z: number) => ctx.city.solidAt(x, z),
    minimap: ctx.minimap,
    ciclo: {
      info: () => ctx.dayNight.info(),
      set(t: number) {
        ctx.dayNight.set(t);
        if (state.phase !== 'playing') stage.render();
      },
    },
    texturas: () =>
      Object.fromEntries(
        Object.entries(ctx.textures).map(([nome, tex]) => [nome, (tex.image as HTMLCanvasElement).toDataURL('image/png')]),
      ),
    parts: {
      list: () => ({
        aro: ctx.parts.aro.map((p) => p.id),
        aerofolio: [null, ...ctx.parts.aerofolio.map((p) => p.id)],
      }),
      current: () => ({ ...ctx.car.loadout }),
      set(slot: 'aro' | 'aerofolio', id: string | null) {
        const ok = ctx.car.setPart(slot, id);
        if (ok && state.phase !== 'playing') stage.render();
        return ok;
      },
    },
    teleport(x: number, z: number, heading: number) {
      const c = ctx.car.state;
      c.x = x;
      c.z = z;
      c.heading = heading;
      c.vx = 0;
      c.vz = 0;
      ctx.chase.snap();
    },
    start: () => flow.start(),
  };
}
