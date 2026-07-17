import type { Contexto } from './tipos';
import { createCharacterMaterials, createViewmodel } from './models';

export function criarJogador(ctx: Contexto) {
  const { cfg, jogador: j, input, estado } = ctx;
  let ultimoTiroMs = 0;
  let travado = false;
  let recoil = 0;
  let bobPhase = 0;
  let fovKick = 0;
  let estavaNaPiscina = false;
  const viewmodelMats = createCharacterMaterials();
  const viewmodel = createViewmodel(viewmodelMats);
  viewmodel.position.set(0.3, -0.32, -0.5);
  viewmodel.rotation.y = -0.08;
  ctx.camera.add(viewmodel);

  function definirTime(team: 0 | 1) {
    viewmodelMats.gunBody.color.set(team === 0 ? 0x3878c0 : 0xd04838);
  }
  const telaTouch = window.matchMedia('(pointer: coarse)').matches;
  let modoTouch = telaTouch;

  function pedirFullscreen() {
    if (!telaTouch || document.fullscreenElement) return;
    const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
    try {
      const pr = el.requestFullscreen
        ? el.requestFullscreen({ navigationUI: 'hide' } as FullscreenOptions)
        : (el.webkitRequestFullscreen && el.webkitRequestFullscreen(), undefined);
      if (pr && typeof pr.catch === 'function') pr.catch(() => {});
    } catch { }
  }

  function passo(dt: number, ts: number) {
    const J = cfg.jogador;
    j.naPiscina = ctx.arena.dentroPiscina(j.x, j.z) && j.y < -0.2;
    if (j.naPiscina !== estavaNaPiscina) {
      estavaNaPiscina = j.naPiscina;
      ctx.ui.els.aguaTint.classList.toggle('show', j.naPiscina);
      if (j.naPiscina) {
        ctx.audio.somSplash();
        ctx.agua.splash(j.x, -0.05, j.z, true);
      }
    }
    const vel = j.naPiscina ? J.velAgua : J.vel;

    let mx = input.joyX;
    let mz = input.joyY;
    if (input.frente) mz -= 1;
    if (input.tras) mz += 1;
    if (input.esq) mx -= 1;
    if (input.dir) mx += 1;
    const mag = Math.hypot(mx, mz);
    if (mag > 0.1) {
      mx /= Math.max(1, mag);
      mz /= Math.max(1, mag);
      const sin = Math.sin(j.yaw);
      const cos = Math.cos(j.yaw);
      const dx = (mx * cos + mz * sin) * vel * dt;
      const dz = (mz * cos - mx * sin) * vel * dt;
      let nx = j.x + dx;
      let nz = j.z + dz;
      for (const b of ctx.arena.aabbs) {
        if (j.y >= b.alt - 0.2) continue;
        const px = Math.max(b.minX, Math.min(nx, b.maxX));
        const pz = Math.max(b.minZ, Math.min(nz, b.maxZ));
        const ddx = nx - px;
        const ddz = nz - pz;
        const d2 = ddx * ddx + ddz * ddz;
        if (d2 < J.raio * J.raio) {
          const d = Math.sqrt(d2) || 0.001;
          nx += (ddx / d) * (J.raio - d);
          nz += (ddz / d) * (J.raio - d);
        }
      }
      const lim = { x: cfg.arena.larg / 2 - 1, z: cfg.arena.prof / 2 - 1 };
      j.x = Math.max(-lim.x, Math.min(lim.x, nx));
      j.z = Math.max(-lim.z, Math.min(lim.z, nz));
    }

    const chao = ctx.arena.chaoEm(j.x, j.z);
    j.vy -= J.gravidade * dt;
    if (input.pulo && j.noChao) {
      j.vy = J.pulo;
      j.noChao = false;
    }
    j.y += j.vy * dt;
    if (j.y <= chao) {
      j.y = chao;
      j.vy = 0;
      j.noChao = true;
    } else {
      j.noChao = false;
    }

    const R = cfg.bisnaga;
    if (j.naPiscina || (ctx.arena.dentroPiscina(j.x, j.z) && j.y < 0)) {
      const antes = estado.tanque;
      estado.tanque = Math.min(R.tanqueMax, estado.tanque + R.recargaPiscinaPorS * dt);
      if (antes < R.tanqueMax && estado.tanque >= R.tanqueMax) ctx.audio.somRecarga();
    } else {
      estado.tanque = Math.min(R.tanqueMax, estado.tanque + R.recargaPorS * dt);
    }

    if (input.atirando && estado.fase === 'jogando' && !estado.derretendo && ts - ultimoTiroMs >= R.cadenciaMs && estado.tanque >= 1) {
      ultimoTiroMs = ts;
      estado.tanque -= 1;
      const cp = Math.cos(j.pitch);
      const dx = Math.sin(j.yaw) * -cp;
      const dz = Math.cos(j.yaw) * -cp;
      const dy = Math.sin(j.pitch);
      const alt = j.naPiscina ? cfg.jogador.alturaAgua : cfg.jogador.altura;
      ctx.agua.atirar(j.x + dx * 0.5, j.y + alt - 0.25, j.z + dz * 0.5, dx, dy, dz, true);
      ctx.audio.somJato();
      recoil = 1;
      fovKick = 1;
    }

    if (!ctx.motionReduzido) {
      const fovAlvo = 70 + fovKick * 2.2;
      if (Math.abs(ctx.camera.fov - fovAlvo) > 0.01) {
        ctx.camera.fov = fovAlvo;
        ctx.camera.updateProjectionMatrix();
      }
    }
    fovKick = Math.max(0, fovKick - dt * 7);

    recoil = Math.max(0, recoil - dt * 6);
    viewmodel.position.x = Math.min(0.3, 0.12 + ctx.camera.aspect * 0.11);
    viewmodel.position.z = -0.5 + recoil * 0.06;
    viewmodel.rotation.x = recoil * 0.12;
    if (!ctx.motionReduzido) {
      bobPhase += dt * (mag > 0.1 ? 9 : 2);
      viewmodel.position.y = -0.32 + Math.sin(bobPhase) * 0.012;
    }

    if (estado.solidez < cfg.jogador.solidezMax && performance.now() - estado.ultimoDanoMs > cfg.jogador.regenAposS * 1000) {
      estado.solidez = Math.min(cfg.jogador.solidezMax, estado.solidez + cfg.jogador.regenPorS * dt);
    }

    const alt = j.naPiscina ? cfg.jogador.alturaAgua : cfg.jogador.altura;
    ctx.camera.position.set(j.x, j.y + alt, j.z);
    if (!ctx.motionReduzido && j.shake > 0) {
      ctx.camera.position.x += (Math.random() - 0.5) * 0.09 * j.shake;
      ctx.camera.position.y += (Math.random() - 0.5) * 0.09 * j.shake;
    }
    j.shake = Math.max(0, j.shake - dt * 5);
    ctx.camera.rotation.order = 'YXZ';
    ctx.camera.rotation.y = j.yaw;
    ctx.camera.rotation.x = j.pitch;
    ctx.ui.atualizarHud();
  }

  function ligarInput() {
    const cenaEl = ctx.cenaEl;

    const TECLAS: Record<string, keyof typeof input> = {
      w: 'frente', W: 'frente', ArrowUp: 'frente',
      s: 'tras', S: 'tras', ArrowDown: 'tras',
      a: 'esq', A: 'esq', ArrowLeft: 'esq',
      d: 'dir', D: 'dir', ArrowRight: 'dir',
      ' ': 'pulo',
    };
    window.addEventListener('keydown', (e) => {
      if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key === 'Escape' && estado.fase === 'jogando') {
        ctx.fluxo.pausar();
        return;
      }
      const acao = TECLAS[e.key];
      if (acao && estado.fase === 'jogando') {
        e.preventDefault();
        (input as any)[acao] = true;
      }
    });
    window.addEventListener('keyup', (e) => {
      const acao = TECLAS[e.key];
      if (acao) (input as any)[acao] = false;
    });
    window.addEventListener('blur', () => ctx.fluxo.soltarInputs());

    cenaEl.addEventListener('mousedown', (e) => {
      if (estado.fase !== 'jogando' || modoTouch) return;
      if (!travado) {
        try {
          const pr = cenaEl.requestPointerLock() as unknown as Promise<void> | undefined;
          if (pr && typeof pr.catch === 'function') pr.catch(() => {});
        } catch { }
        return;
      }
      if (e.button === 0) input.atirando = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) input.atirando = false;
    });
    document.addEventListener('pointerlockchange', () => {
      travado = document.pointerLockElement === cenaEl;
      if (!travado && estado.fase === 'jogando' && !modoTouch && !telaTouch) ctx.fluxo.pausar();
    });
    window.addEventListener('mousemove', (e) => {
      if (!travado || estado.fase !== 'jogando') return;
      j.yaw -= e.movementX * 0.0024;
      j.pitch = Math.max(-1.4, Math.min(1.4, j.pitch - e.movementY * 0.0024));
    });

    const joy = document.querySelector('[data-joy]') as HTMLElement;
    const joyPino = document.querySelector('[data-joy-pino]') as HTMLElement;
    let joyId = -1;
    function aplicarJoy(e: PointerEvent) {
      const r = joy.getBoundingClientRect();
      const dx = (e.clientX - r.left - r.width / 2) / (r.width / 2);
      const dy = (e.clientY - r.top - r.height / 2) / (r.height / 2);
      const mag = Math.hypot(dx, dy);
      const k = mag > 1 ? 1 / mag : 1;
      input.joyX = dx * k;
      input.joyY = dy * k;
      joyPino.style.transform = 'translate(' + dx * k * 26 + 'px,' + dy * k * 26 + 'px)';
    }
    joy.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      modoTouch = true;
      joyId = e.pointerId;
      try { joy.setPointerCapture(e.pointerId); } catch { }
      aplicarJoy(e);
    });
    joy.addEventListener('pointermove', (e) => {
      if (e.pointerId !== joyId) return;
      e.preventDefault();
      aplicarJoy(e);
    });
    const soltaJoy = (e: PointerEvent) => {
      if (e.pointerId !== joyId) return;
      joyId = -1;
      input.joyX = 0;
      input.joyY = 0;
      joyPino.style.transform = '';
    };
    joy.addEventListener('pointerup', soltaJoy);
    joy.addEventListener('pointercancel', soltaJoy);
    joy.addEventListener('lostpointercapture', soltaJoy);

    let olharId = -1;
    let olharX = 0;
    let olharY = 0;
    cenaEl.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch') return;
      e.preventDefault();
      modoTouch = true;
      if (olharId !== -1) return;
      olharId = e.pointerId;
      olharX = e.clientX;
      olharY = e.clientY;
      cenaEl.setPointerCapture && cenaEl.setPointerCapture(e.pointerId);
    });
    cenaEl.addEventListener('pointermove', (e) => {
      if (e.pointerId !== olharId || estado.fase !== 'jogando') return;
      e.preventDefault();
      j.yaw -= (e.clientX - olharX) * 0.005;
      j.pitch = Math.max(-1.4, Math.min(1.4, j.pitch - (e.clientY - olharY) * 0.005));
      olharX = e.clientX;
      olharY = e.clientY;
    });
    const soltaOlhar = (e: PointerEvent) => {
      if (e.pointerId === olharId) olharId = -1;
    };
    cenaEl.addEventListener('pointerup', soltaOlhar);
    cenaEl.addEventListener('pointercancel', soltaOlhar);
    cenaEl.addEventListener('lostpointercapture', soltaOlhar);

    const btnAtira = document.querySelector('[data-atirar]') as HTMLElement;
    btnAtira.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      modoTouch = true;
      try { btnAtira.setPointerCapture(e.pointerId); } catch { }
      input.atirando = true;
      btnAtira.classList.add('on');
    });
    const soltaAtira = () => {
      input.atirando = false;
      btnAtira.classList.remove('on');
    };
    btnAtira.addEventListener('pointerup', soltaAtira);
    btnAtira.addEventListener('pointercancel', soltaAtira);
    btnAtira.addEventListener('lostpointercapture', soltaAtira);

    const btnPulo = document.querySelector('[data-pular]') as HTMLElement;
    btnPulo.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      modoTouch = true;
      input.pulo = true;
    });
    const soltaPulo = () => {
      input.pulo = false;
    };
    btnPulo.addEventListener('pointerup', soltaPulo);
    btnPulo.addEventListener('pointercancel', soltaPulo);
  }

  function pedirLock() {
    if (modoTouch || document.pointerLockElement === ctx.cenaEl) return;
    try {
      const pr = ctx.cenaEl.requestPointerLock() as unknown as Promise<void> | undefined;
      if (pr && typeof pr.catch === 'function') pr.catch(() => {});
    } catch { }
  }
  function soltarLock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }
  function emModoTouch() {
    return modoTouch;
  }

  return { passo, ligarInput, pedirLock, soltarLock, emModoTouch, pedirFullscreen, definirTime };
}
