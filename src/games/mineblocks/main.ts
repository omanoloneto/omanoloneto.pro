import * as THREE from 'three';
import { cleanPlayerName } from '../../lib/player-name';
import type { Ctx, State, Input, Player } from './types';
import { createUI } from './ui';
import { criarAudio } from './audio';
import { criarTextura } from './textura';
import { criarMundo } from './mundo';
import { criarMetas } from './meta';
import { gerarMundo } from './geracao';
import { criarMalha } from './malha';
import { criarCeu, DIA_S } from './ceu';
import { criarKotsooh } from './kotsooh';
import { criarMob } from './mob';
import { criarFisica } from './fisica';
import { criarCamera } from './camera';
import { criarMira } from './mira';
import { createEditing } from './edicao';
import { criarSalvar } from './salvar';
import { criarSync } from './sync';
import { criarBonecos } from './boneco';
import { bindInput } from './input';

export function startGame() {
  const data = JSON.parse(document.querySelector('[data-dados]')!.textContent!);

  const state: State = {
    phase: 'intro',
    muted: false,
    seed: 0,
    sel: 0,
    firstInput: false,
    inventory: new Array(data.blocos.length).fill(0),
    hotbarSlots: new Array(data.config.hotbarTamanho).fill(0),
  };
  const player: Player = {
    x: data.config.mundo.SX / 2 + 0.5,
    y: data.config.mundo.SY,
    z: data.config.mundo.SZ / 2 + 0.5,
    vx: 0, vy: 0, vz: 0,
    yaw: 0, pitch: 0,
    onGround: false, inWater: false, coyoteMs: 0,
  };
  const input: Input = {
    forward: false, back: false, left: false, right: false, jump: false,
    strike: false,
    joyX: 0, joyY: 0,
  };

  const sceneEl = document.querySelector('[data-cena]') as HTMLElement;
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  let lowTier = false;
  try {
    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const gpu = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '';
    if (/swiftshader|llvmpipe|software/i.test(String(gpu))) lowTier = true;
  } catch (_) { }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowTier ? 1 : 1.5));
  sceneEl.insertBefore(renderer.domElement, sceneEl.firstChild);
  const camera = new THREE.PerspectiveCamera(data.config.camera.fov, 1, 0.1, 260);

  const ctx = {
    blocks: data.blocos,
    items: data.itens,
    materials: data.materiais,
    recipes: data.receitas,
    cfg: data.config,
    byId: (id: number) => data.blocos[id],
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    scene,
    camera,
    renderer,
    sceneEl,
    lowTier,
    state,
    player,
    input,
  } as Ctx;

  ctx.ui = createUI(ctx);
  ctx.audio = criarAudio(ctx);
  ctx.audio.bindMute(ctx.ui.els.muteBtn, ctx.ui.els.muteIcon);
  ctx.texture = criarTextura(ctx);
  ctx.world = criarMundo(ctx);
  ctx.metas = criarMetas(ctx);
  ctx.meshes = criarMalha(ctx);
  ctx.sky = criarCeu(ctx);
  ctx.mob = criarMob(ctx);
  ctx.physics = criarFisica(ctx);
  ctx.kotsooh = criarKotsooh(ctx);
  ctx.camera3 = criarCamera(ctx);
  ctx.aim = criarMira(ctx);
  ctx.editing = createEditing(ctx);
  ctx.save = criarSalvar(ctx);
  ctx.avatars = criarBonecos(ctx);
  ctx.sync = criarSync(ctx);

  const { ui, save, sync } = ctx;
  ui.buildCraft();
  ui.buildInventory();
  ui.buildHotbar();

  function craftRecipe(btn: HTMLElement) {
    const rec = data.receitas[+btn.dataset.receita!];
    if (!rec) return;
    const inv = state.inventory;
    const from = ctx.byId(rec.de);
    const to = ctx.byId(rec.para);
    if ((inv[rec.de] || 0) < rec.qtd) {
      ui.showToast('🎒 Falta material! Precisa de ' + rec.qtd + '× ' + from.nome + '.', 'info', 2000);
      ctx.audio.soundError();
      return;
    }
    if (rec.de2 && (inv[rec.de2] || 0) < (rec.qtd2 || 1)) {
      ui.showToast('🎒 Falta material! Precisa de ' + (rec.qtd2 || 1) + '× ' + ctx.byId(rec.de2).nome + ' também.', 'info', 2000);
      ctx.audio.soundError();
      return;
    }
    inv[rec.de] -= rec.qtd;
    if (rec.de2) inv[rec.de2] -= rec.qtd2 || 1;
    inv[rec.para] = Math.min(999, (inv[rec.para] || 0) + rec.ganha);
    ctx.editing.addItemToHotbar(rec.para);
    ui.updateCounts();
    ctx.audio.soundSaved();
    ui.announce('Fabricou ' + rec.ganha + ' ' + to.nome + '!');
    save.schedule();
  }
  const onRecipeClick = (e: Event) => {
    const btn = (e.target as HTMLElement).closest('.receita') as HTMLElement | null;
    if (btn) craftRecipe(btn);
  };
  ui.els.craftPanel.addEventListener('click', onRecipeClick);
  ui.els.furnaceList.addEventListener('click', onRecipeClick);
  ui.els.craftBtn.addEventListener('click', () => inputRefs.toggleInventory());
  (document.querySelector('[data-inv-fechar]') as HTMLElement).addEventListener('click', () => inputRefs.toggleInventory());

  function measure() {
    const w = sceneEl.clientWidth || 1;
    const h = sceneEl.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (!rafId) renderer.render(scene, camera);
  }
  window.addEventListener('resize', measure);
  renderer.domElement.addEventListener('webglcontextrestored', () => measure());
  renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    if (state.phase === 'playing') flow.pause();
  });

  let rafId = 0;
  let lastTs = 0;
  let avgDt = 16;
  let degrade = 0;

  function resumeLoop() {
    if (!rafId) {
      lastTs = 0;
      rafId = requestAnimationFrame(loop);
    }
  }
  function stopLoop() {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }

  function loop(ts: number) {
    rafId = requestAnimationFrame(loop);
    if (!lastTs) { lastTs = ts; return; }
    const dtMs = ts - lastTs;
    lastTs = ts;
    const dt = Math.min(dtMs / 1000, 0.05);
    if (state.phase !== 'playing') return;

    avgDt = avgDt * 0.95 + dtMs * 0.05;
    if (avgDt > 45 && degrade < 2) {
      degrade++;
      avgDt = 16;
      const target = lowTier ? (degrade === 1 ? 0.75 : 0.55) : degrade === 1 ? 0.85 : 0.7;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, target));
      measure();
    }

    ctx.physics.step(dt);
    const dtReal = Math.min(dtMs / 1000, 0.25);
    ctx.editing.step(dtReal, !sync.inRoom() || sync.isHost());
    if (input.strike) ctx.editing.strike(dtReal);
    else if (ctx.editing.striking()) ctx.editing.releaseStrike();
    ctx.avatars.step(dt);
    ctx.camera3.step();
    ctx.aim.step();
    ctx.sky.step(dt);
    ctx.audio.musicStep(dt);
    ctx.mob.step(dt, !sync.inRoom() || sync.isHost());
    ctx.kotsooh.step(dt);
    ctx.meshes.rebuildDirty();
    renderer.render(scene, camera);
  }

  function requestGameFullscreen() {
    if (!inputRefs.isTouchMode() || document.fullscreenElement) return;
    const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
    try {
      const pr = el.requestFullscreen
        ? el.requestFullscreen({ navigationUI: 'hide' } as FullscreenOptions)
        : (el.webkitRequestFullscreen && el.webkitRequestFullscreen(), undefined);
      if (pr && typeof pr.catch === 'function') pr.catch(() => {});
    } catch { }
  }

  const flow = {
    enterWorld() {
      state.phase = 'playing';
      ui.els.introModal.hidden = true;
      ui.els.generatingOverlay.hidden = true;
      ui.els.pauseModal.hidden = true;
      ui.els.hotbar.hidden = false;
      ui.els.reticle.hidden = false;
      ui.els.pauseBtn.hidden = false;
      ui.els.muteBtn.hidden = false;
      ui.els.craftBtn.hidden = false;
      ui.els.ghostHint.hidden = false;
      ui.els.touchControls.hidden = !inputRefs.isTouchMode();
      requestGameFullscreen();
      ui.els.worldNameHud.textContent = save.hasWorld()
        ? '🌍 ' + save.worldCode()
        : sync.isVisiting() ? '🌍 ' + sync.roomCode() : '🎲 mundo de brincadeira';
      if (!save.hasWorld() && !sync.isVisiting()) {
        ui.showToast('🎲 Mundo de brincadeira (sem internet) — ele some quando você sai!', 'info', 3400);
      }
      ui.updateCounts();
      ui.selectSlot(state.sel, false);
      ctx.audio.resume();
      measure();
      resumeLoop();
      ui.announce('Bem-vindo ao seu mundo! Ande com as setas ou W A S D, pule com espaço, clique pra quebrar blocos.');
    },
    pause() {
      if (state.phase !== 'playing') return;
      state.phase = 'paused';
      ui.els.pauseBtn.hidden = true;
      ui.toggleCraftPanel(false);
      flow.releaseInputs();
      inputRefs.releaseLock();
      stopLoop();
      renderer.render(scene, camera);
      const visiting = sync.isVisiting();
      const guest = !save.hasWorld();
      ui.els.saveNowBtn.hidden = guest || visiting;
      ui.els.exitBtn.textContent = visiting ? '🚪 Sair do mundo' : guest ? '🚪 Sair sem salvar' : '🚪 Salvar e sair';
      ui.els.pauseNotice.textContent = visiting
        ? 'Vocês estão construindo juntos — o mundo se salva sozinho!'
        : guest
          ? 'Esse mundo de brincadeira some quando você sai (sem internet, sem código).'
          : 'Relaxa: o mundo se salva sozinho de tempos em tempos. 😉';
      updatePauseRoom();
      ui.els.pauseModal.hidden = false;
      save.saveNow('auto');
      setTimeout(() => (document.querySelector('[data-continuar]') as HTMLElement).focus(), 60);
      ui.announce('Jogo pausado.');
    },
    resume() {
      if (state.phase !== 'paused') return;
      ui.els.pauseModal.hidden = true;
      ui.els.introModal.hidden = true;
      ui.els.pauseBtn.hidden = false;
      state.phase = 'playing';
      requestGameFullscreen();
      measure();
      resumeLoop();
      ctx.lock.request();
    },
    async exitWorld() {
      const savedOk = await save.saveNow('manual');
      if (!savedOk && save.dirty()) {
        const leaveAnyway = window.confirm(
          'Não consegui salvar agora (sem internet?).\n\nOK = sair mesmo assim (perde o que fez desde o último save)\nCancelar = continuar jogando e tentar de novo'
        );
        if (!leaveAnyway) return;
      }
      sync.leaveRoom();
      window.location.href = '/class/games/';
    },
    measure,
    releaseInputs() {
      input.forward = input.back = input.left = input.right = input.jump = false;
      input.strike = false;
      input.joyX = input.joyY = 0;
      ctx.editing.releaseStrike();
      inputRefs.releaseTouch();
    },
    onFirstInput() {
      if (state.firstInput) return;
      state.firstInput = true;
      ui.els.ghostHint.hidden = true;
    },
  };
  ctx.flow = flow as Ctx['flow'];
  const inputRefs = bindInput(ctx);

  const NAME_KEY = 'mineblocks:nome';
  function storedName(): string {
    try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; }
  }
  function storeName(n: string) {
    try { localStorage.setItem(NAME_KEY, n); } catch { }
  }

  function cleanName(raw: string): string {
    return cleanPlayerName(raw, ctx.cfg.sala.nomeMax);
  }
  function cleanCode(raw: string): string {
    const re = new RegExp('[^' + ctx.cfg.codigo.charset + ']', 'g');
    return raw.toUpperCase().replace(re, '').slice(0, ctx.cfg.codigo.tam);
  }
  function filterOnType(el: HTMLInputElement, fn: (s: string) => string) {
    el.addEventListener('input', () => {
      const clean = fn(el.value);
      if (el.value !== clean) el.value = clean;
    });
  }
  function bindSanitizers() {
    filterOnType(document.querySelector('[data-campo-apelido]') as HTMLInputElement, cleanName);
    filterOnType(document.querySelector('[data-campo-codigo]') as HTMLInputElement, cleanCode);
  }

  function updatePauseRoom() {
    const code = save.hasWorld() ? save.worldCode() : sync.roomCode();
    ui.els.roomInfo.hidden = !code;
    if (code) ui.els.roomCode.textContent = code;
  }

  function enterVisit() {
    state.phase = 'generating';
    ui.els.introModal.hidden = true;
    ui.els.generatingOverlay.hidden = false;
    requestAnimationFrame(() => setTimeout(() => {
      if (!sync.applyInitialSnapshot()) {
        state.phase = 'intro';
        ui.els.generatingOverlay.hidden = true;
        ui.els.introModal.hidden = false;
        showIntroError('O mundo do amigo veio quebrado — tenta entrar de novo?');
        return;
      }
      state.inventory.fill(0);
      state.hotbarSlots.fill(0);
      state.sel = 0;
      player.x = ctx.cfg.mundo.SX / 2 + 0.5;
      player.z = ctx.cfg.mundo.SZ / 2 + 0.5;
      player.yaw = Math.PI * 0.75;
      player.pitch = 0;
      ctx.meshes.buildAll();
      ctx.mob.spawn(state.seed);
      ctx.kotsooh.spawn();
      ctx.physics.settle();
      flow.enterWorld();
      sync.startPoll();
    }, 30));
  }

  function generateAndEnter(seed: number, loaded: boolean, onReady?: () => void) {
    state.phase = 'generating';
    ui.els.introModal.hidden = true;
    ui.els.generatingOverlay.hidden = false;
    requestAnimationFrame(() => setTimeout(() => {
      state.seed = seed;
      if (!loaded) {
        state.inventory.fill(0);
        state.hotbarSlots.fill(0);
        ctx.metas.clear();
        gerarMundo(ctx, seed);
        player.x = ctx.cfg.mundo.SX / 2 + 0.5;
        player.z = ctx.cfg.mundo.SZ / 2 + 0.5;
        player.yaw = Math.PI * 0.75;
        player.pitch = 0;
        ctx.sky.setTime(Math.round(DIA_S * 0.13));
      }
      ctx.meshes.buildAll();
      ctx.editing.startSaplings();
      ctx.mob.spawn(seed);
      ctx.kotsooh.spawn();
      if (!loaded) ctx.physics.settle();
      flow.enterWorld();
      if (!loaded) save.saveNow('auto');
      if (onReady) onReady();
    }, 30));
  }

  function showIntroError(msg: string) {
    ui.els.introError.textContent = msg;
    ui.els.introError.hidden = false;
    ctx.audio.soundError();
  }
  function lockForms(lock: boolean) {
    document.querySelectorAll('[data-form-jogar] button, [data-form-entrar] button').forEach((b) => {
      (b as HTMLButtonElement).disabled = lock;
    });
  }
  function readName(): string | null {
    const name = cleanName((document.querySelector('[data-campo-apelido]') as HTMLInputElement).value);
    if (name.length < ctx.cfg.sala.nomeMin) {
      showIntroError('Escreve teu nome primeiro (só letras e números, sem espaço)!');
      return null;
    }
    storeName(name);
    return name;
  }
  async function openWorldRoom(name: string) {
    if (!save.hasWorld()) return;
    await sync.createRoom(name, save.worldCode());
    updatePauseRoom();
  }

  ui.els.playForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    ui.els.introError.hidden = true;
    const name = readName();
    if (!name) return;
    ctx.audio.resume();
    lockForms(true);
    const err = await save.createWorld();
    lockForms(false);
    generateAndEnter((Math.random() * 4294967296) >>> 0, false, () => {
      if (err) return;
      ui.showToast('🌍 Seu mundo é <b>' + save.worldCode() + '</b> — anote pra voltar!', 'ok', 6000);
      ui.announce('Seu mundo tem o código ' + save.worldCode().split('').join(' ') + '. Anote pra voltar!');
      openWorldRoom(name);
    });
  });

  ui.els.joinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    ui.els.introError.hidden = true;
    const code = cleanCode((document.querySelector('[data-campo-codigo]') as HTMLInputElement).value);
    if (code.length !== ctx.cfg.codigo.tam) {
      return showIntroError('O código do mundo tem ' + ctx.cfg.codigo.tam + ' letrinhas — pede pro teu amigo conferir!');
    }
    const name = readName();
    if (!name) return;
    ctx.audio.resume();
    lockForms(true);
    const roomErr = await sync.joinRoom(code, name);
    if (!roomErr) {
      lockForms(false);
      enterVisit();
      return;
    }
    const worldErr = await save.loadWorld(code);
    lockForms(false);
    if (worldErr === '__NOVO__') {
      return generateAndEnter((Math.random() * 4294967296) >>> 0, false, () => openWorldRoom(name));
    }
    if (worldErr) return showIntroError(worldErr);
    generateAndEnter(state.seed, true, () => openWorldRoom(name));
  });

  ui.els.pauseBtn.addEventListener('click', () => flow.pause());
  (document.querySelector('[data-continuar]') as HTMLElement).addEventListener('click', () => flow.resume());
  (document.querySelector('[data-salvar-agora]') as HTMLElement).addEventListener('click', () => save.saveNow('manual'));
  (document.querySelector('[data-sair]') as HTMLElement).addEventListener('click', () => {
    if (sync.isVisiting()) {
      const go = window.confirm('Sair da visita? O mundo continua com o seu amigo — você pode voltar com o mesmo código.');
      if (!go) return;
      sync.leaveRoom();
      window.location.href = '/class/games/';
      return;
    }
    if (!save.hasWorld()) {
      const go = window.confirm('Esse mundo de brincadeira NÃO está salvo — saindo, ele some pra sempre.\n\nOK = sair mesmo assim\nCancelar = voltar');
      if (!go) return;
      sync.leaveRoom();
      window.location.href = '/class/games/';
      return;
    }
    flow.exitWorld();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (state.phase === 'playing') flow.pause();
      if (save.hasWorld() && save.dirty()) save.saveNow('flush');
    }
  });
  window.addEventListener('pagehide', () => {
    if (save.hasWorld() && save.dirty()) save.saveNow('flush');
    sync.flushLeave();
  });
  window.addEventListener('beforeunload', (e) => {
    if (!save.hasWorld() && !sync.isVisiting() && state.phase !== 'intro' && state.firstInput) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  bindSanitizers();
  document.body.classList.add('is-game');
  measure();
  renderer.render(scene, camera);
  const nameField = document.querySelector('[data-campo-apelido]') as HTMLInputElement;
  nameField.value = storedName();
  setTimeout(() => nameField.focus(), 60);

  (window as any).__mc = {
    player, state, input,
    recipes: data.receitas,
    craft: (i: number) => (document.querySelector('.receita[data-receita="' + i + '"]') as HTMLElement)?.click(),
    growSaplings: () => ctx.editing.growSaplingsNow(),
    startSaplings: () => ctx.editing.startSaplings(),
    decayNow: () => ctx.editing.decayNow(),
    setSlot: (i: number, id: number) => { state.hotbarSlots[i] = id; ctx.ui.updateCounts(); },
    get: ctx.world.get,
    set: ctx.world.set,
    breakBlock: () => ctx.editing.breakBlock(),
    place: () => ctx.editing.place(),
    target: () => ctx.aim.target(),
    select: (i: number) => ctx.ui.selectSlot(i, false),
    saveNow: () => save.saveNow('manual'),
    save,
    sync,
    avatars: ctx.avatars,
    metas: ctx.metas,
    sky: ctx.sky,
    audio: ctx.audio,
    mob: ctx.mob,
    kotsooh: ctx.kotsooh,
    ui: ctx.ui,
    editing: ctx.editing,
    lock: () => ctx.lock.locked(),
    useAt: (x: number, y: number, z: number) =>
      ctx.editing.interact({ x, y, z, nx: 0, ny: 1, nz: 0, id: ctx.world.get(x, y, z) }),
    breakAt: (x: number, y: number, z: number) =>
      ctx.editing.breakBlock({ x, y, z, nx: 0, ny: 1, nz: 0, id: ctx.world.get(x, y, z) }),
    placeAt: (x: number, y: number, z: number, nx: number, ny: number, nz: number) =>
      ctx.editing.place({ x, y, z, nx, ny, nz, id: ctx.world.get(x, y, z) }),
    renderer, camera, scene,
    render: () => renderer.render(scene, camera),
  };
}
