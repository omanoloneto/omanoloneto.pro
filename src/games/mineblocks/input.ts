import type { Ctx } from './types';

const MOVE_KEYS: Record<string, 'forward' | 'back' | 'left' | 'right'> = {
  ArrowUp: 'forward', w: 'forward', W: 'forward',
  ArrowDown: 'back', s: 'back', S: 'back',
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
};

export function bindInput(ctx: Ctx) {
  const { input, player, state, cfg } = ctx;
  const canvas = ctx.renderer.domElement;
  const PITCH_MAX = 1.55;

  let locked = false;
  let touchMode = window.matchMedia('(pointer: coarse)').matches;
  let panelClosedAt = -1e9;
  let autoLockAt = -1e9;

  function tryLock() {
    try {
      (canvas.requestPointerLock() as unknown as Promise<void> | undefined)?.catch?.(() => {});
    } catch { }
  }

  function canAutoLock() {
    return state.phase === 'playing' && !locked && !touchMode && !ctx.ui.isPanelOpen();
  }

  function requestLock() {
    if (touchMode || state.phase !== 'playing') return;
    panelClosedAt = performance.now();
    tryLock();
    window.setTimeout(() => { if (canAutoLock()) tryLock(); }, 80);
    window.setTimeout(() => { if (canAutoLock()) tryLock(); }, 500);
  }

  function releaseLock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  ctx.lock = { request: requestLock, release: releaseLock, locked: () => locked };

  canvas.addEventListener('click', () => {
    if (state.phase === 'playing' && !locked && !touchMode) tryLock();
  });
  canvas.addEventListener('mousemove', () => {
    if (!canAutoLock()) return;
    const now = performance.now();
    if (now - autoLockAt < 400) return;
    autoLockAt = now;
    tryLock();
  });
  document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === canvas;
    if (locked && (ctx.ui.isPanelOpen() || state.phase !== 'playing')) {
      document.exitPointerLock();
      return;
    }
    if (!locked) {
      stopRepeat();
      if (performance.now() - panelClosedAt < 400) return;
      if (state.phase === 'playing' && !touchMode && !ctx.ui.isPanelOpen()) ctx.flow.pause();
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.key === 'Escape') {
      if (state.phase === 'paused') {
        e.preventDefault();
        ctx.flow.resume();
        return;
      }
      if (state.phase !== 'playing') return;
      if (ctx.ui.closeTopPanel()) {
        e.preventDefault();
        return;
      }
      if (!locked) {
        e.preventDefault();
        ctx.flow.pause();
      }
      return;
    }
    if (canAutoLock()) tryLock();
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    if (e.key === 'Tab') {
      e.preventDefault();
      if (state.phase === 'playing') ctx.ui.showPlayers(true);
      return;
    }
    if (state.phase !== 'playing' || e.repeat) return;
    if (e.key === ' ') {
      e.preventDefault();
      input.jump = true;
      ctx.flow.onFirstInput();
      return;
    }
    const move = MOVE_KEYS[e.key];
    if (move) {
      e.preventDefault();
      input[move] = true;
      ctx.flow.onFirstInput();
      return;
    }
    if (/^[1-9]$/.test(e.key)) ctx.ui.selectSlot(+e.key - 1, true);
    if (/^[eEcC]$/.test(e.key)) { e.preventDefault(); toggleInventory(); }
    if (/^[qQ]$/.test(e.key)) { e.preventDefault(); ctx.editing.dropSelectedItem(); }
    if (/^[mM]$/.test(e.key)) { e.preventDefault(); ctx.minimap.toggleMap(); }
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === 'Tab') { e.preventDefault(); ctx.ui.showPlayers(false); return; }
    if (e.key === ' ') input.jump = false;
    const move = MOVE_KEYS[e.key];
    if (move) input[move] = false;
  });
  window.addEventListener('blur', () => ctx.flow.releaseInputs());

  window.addEventListener('wheel', (e) => {
    if (state.phase !== 'playing') return;
    if (ctx.ui.isPanelOpen()) return;
    ctx.ui.selectSlot(state.sel + (e.deltaY > 0 ? 1 : -1), false);
  }, { passive: true });
  ctx.ui.els.hotbar.addEventListener('pointerdown', (e) => {
    const slot = (e.target as HTMLElement).closest('.slot') as HTMLElement | null;
    if (slot) { e.preventDefault(); ctx.ui.selectSlot(+slot.dataset.slot!, true); }
  });

  function toggleInventory() {
    if (state.phase !== 'playing') return;
    const opening = ctx.ui.els.invPanel.hidden === true;
    ctx.ui.toggleCraftPanel(opening);
    if (opening) {
      ctx.flow.releaseInputs();
      releaseLock();
    } else {
      requestLock();
    }
    ctx.audio.soundUI();
    ctx.ui.announce(opening ? 'Inventário aberto.' : 'Inventário fechado.');
  }

  document.addEventListener('mousemove', (e) => {
    if (!locked || state.phase !== 'playing') return;
    ctx.flow.onFirstInput();
    player.yaw -= e.movementX * cfg.camera.sensibilidade;
    player.pitch = Math.max(-PITCH_MAX, Math.min(PITCH_MAX, player.pitch - e.movementY * cfg.camera.sensibilidade));
  });

  let placeTimer = 0;
  function stopPlacing() {
    clearInterval(placeTimer);
    placeTimer = 0;
  }
  function stopRepeat() {
    stopPlacing();
    input.strike = false;
  }
  canvas.addEventListener('mousedown', (e) => {
    if (!locked || state.phase !== 'playing') return;
    e.preventDefault();
    if (e.button === 2) {
      stopPlacing();
      if (ctx.editing.interact()) {
        placeTimer = window.setInterval(() => ctx.editing.place(), 240);
      }
    } else if (e.button === 0) {
      input.strike = true;
      ctx.flow.onFirstInput();
    }
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 2) stopPlacing();
    else if (e.button === 0) input.strike = false;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  let joyId = -1;
  let lookId = -1;
  let lookX = 0;
  let lookY = 0;
  let tapT0 = 0;
  let tapX0 = 0;
  let tapY0 = 0;
  let tapMoved = false;

  function enableTouchMode() {
    if (touchMode) return;
    touchMode = true;
    ctx.ui.els.touchControls.hidden = false;
  }

  const joyEl = ctx.ui.els.joystick;
  const joyPin = ctx.ui.els.joystickPin;

  function applyJoy(e: PointerEvent) {
    const r = joyEl.getBoundingClientRect();
    const dx = (e.clientX - r.left - r.width / 2) / (r.width / 2);
    const dy = (e.clientY - r.top - r.height / 2) / (r.height / 2);
    const mag = Math.hypot(dx, dy);
    const k = mag > 1 ? 1 / mag : 1;
    input.joyX = dx * k;
    input.joyY = -dy * k;
    joyPin.style.transform = 'translate(' + dx * k * 26 + 'px,' + dy * k * 26 + 'px)';
  }

  function dropJoystick() {
    joyId = -1;
    input.joyX = 0;
    input.joyY = 0;
    joyPin.style.transform = '';
  }

  joyEl.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    enableTouchMode();
    ctx.flow.onFirstInput();
    joyId = e.pointerId;
    try { joyEl.setPointerCapture(e.pointerId); } catch { }
    applyJoy(e);
  });
  joyEl.addEventListener('pointermove', (e) => {
    if (e.pointerId !== joyId) return;
    e.preventDefault();
    applyJoy(e);
  });
  const releaseJoy = (e: PointerEvent) => {
    if (e.pointerId === joyId) dropJoystick();
  };
  joyEl.addEventListener('pointerup', releaseJoy);
  joyEl.addEventListener('pointercancel', releaseJoy);
  joyEl.addEventListener('lostpointercapture', releaseJoy);

  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch' || state.phase !== 'playing') return;
    enableTouchMode();
    ctx.flow.onFirstInput();
    e.preventDefault();
    if (lookId === -1) {
      lookId = e.pointerId;
      lookX = e.clientX;
      lookY = e.clientY;
      tapT0 = performance.now();
      tapX0 = e.clientX;
      tapY0 = e.clientY;
      tapMoved = false;
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'touch') return;
    if (e.pointerId === lookId) {
      const dx = e.clientX - lookX;
      const dy = e.clientY - lookY;
      if (Math.abs(e.clientX - tapX0) + Math.abs(e.clientY - tapY0) > 12) tapMoved = true;
      lookX = e.clientX;
      lookY = e.clientY;
      player.yaw -= dx * cfg.camera.sensTouch;
      player.pitch = Math.max(-PITCH_MAX, Math.min(PITCH_MAX, player.pitch - dy * cfg.camera.sensTouch));
    }
  });
  const releaseTouchLook = (e: PointerEvent) => {
    if (e.pointerId === lookId) {
      lookId = -1;
      if (!tapMoved && performance.now() - tapT0 < 220 && state.phase === 'playing') {
        ctx.editing.interact();
      }
    }
  };
  canvas.addEventListener('pointerup', releaseTouchLook);
  canvas.addEventListener('pointercancel', releaseTouchLook);

  const breakBtn = ctx.ui.els.breakBtn;
  breakBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    enableTouchMode();
    ctx.flow.onFirstInput();
    try { breakBtn.setPointerCapture(e.pointerId); } catch { }
    input.strike = true;
    breakBtn.classList.add('on');
  });
  const releaseBreak = () => {
    input.strike = false;
    breakBtn.classList.remove('on');
  };
  breakBtn.addEventListener('pointerup', releaseBreak);
  breakBtn.addEventListener('pointercancel', releaseBreak);
  breakBtn.addEventListener('lostpointercapture', releaseBreak);

  const jumpBtn = ctx.ui.els.jumpBtn;
  jumpBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try { jumpBtn.setPointerCapture(e.pointerId); } catch { }
    input.jump = true;
    jumpBtn.classList.add('on');
  });
  const releaseJump = () => {
    input.jump = false;
    jumpBtn.classList.remove('on');
  };
  jumpBtn.addEventListener('pointerup', releaseJump);
  jumpBtn.addEventListener('pointercancel', releaseJump);
  jumpBtn.addEventListener('lostpointercapture', releaseJump);

  return {
    releaseTouch() {
      dropJoystick();
      lookId = -1;
      releaseBreak();
      releaseJump();
      stopRepeat();
    },
    isLocked: () => locked,
    releaseLock,
    requestLock,
    toggleInventory,
    isTouchMode: () => touchMode,
  };
}
