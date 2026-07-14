// Entrada do MineBlocks.
// Desktop: pointer lock (clique no canvas trava o mouse; ESC do browser
// solta → detectamos e pausamos), WASD/setas, espaço pula, clique
// esquerdo quebra / direito coloca (com repetição segurando), 1-9 e
// scroll na hotbar.
// Touch: joystick flutuante no terço esquerdo, arrastar olha, tap curto
// executa o modo (⛏️/🧱), botões grandes de pulo e modo.
import type { Contexto } from './tipos';

const TECLAS: Record<string, 'frente' | 'tras' | 'esq' | 'dir'> = {
  ArrowUp: 'frente', w: 'frente', W: 'frente',
  ArrowDown: 'tras', s: 'tras', S: 'tras',
  ArrowLeft: 'esq', a: 'esq', A: 'esq',
  ArrowRight: 'dir', d: 'dir', D: 'dir',
};

export function ligarInput(ctx: Contexto) {
  const { input, jogador, estado, cfg } = ctx;
  const canvas = ctx.renderer.domElement;
  const PITCH_MAX = 1.55;

  // ----- teclado -----
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.key === 'Escape') {
      // com pointer lock o browser já solta o lock no ESC e o
      // pointerlockchange pausa; este caminho cobre o touch/sem-lock
      if (estado.fase === 'pausado') { e.preventDefault(); ctx.fluxo.continuarJogo(); }
      return;
    }
    if (estado.fase !== 'jogando' || e.repeat) return;
    if (e.key === ' ') {
      e.preventDefault();
      input.pulo = true;
      ctx.fluxo.aoPrimeiroInput();
      return;
    }
    const acao = TECLAS[e.key];
    if (acao) {
      e.preventDefault();
      input[acao] = true;
      ctx.fluxo.aoPrimeiroInput();
      return;
    }
    if (/^[1-9]$/.test(e.key)) ctx.ui.selecionarSlot(+e.key - 1, true);
    if (e.key === 'c' || e.key === 'C') ctx.ui.alternarCraft();
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === ' ') input.pulo = false;
    const acao = TECLAS[e.key];
    if (acao) input[acao] = false;
  });
  window.addEventListener('blur', () => ctx.fluxo.soltarInputs());

  // ----- hotbar: scroll cicla, clique seleciona -----
  window.addEventListener('wheel', (e) => {
    if (estado.fase !== 'jogando') return;
    ctx.ui.selecionarSlot(estado.sel + (e.deltaY > 0 ? 1 : -1), false);
  }, { passive: true });
  ctx.ui.els.hotbar.addEventListener('pointerdown', (e) => {
    const slot = (e.target as HTMLElement).closest('.slot') as HTMLElement | null;
    if (slot) { e.preventDefault(); ctx.ui.selecionarSlot(+slot.dataset.slot!, true); }
  });

  // ----- pointer lock (desktop) -----
  let travado = false;
  canvas.addEventListener('click', () => {
    // clique de mouse re-trava; toque não pede lock. Chrome tem cooldown
    // de ~1,25s depois do ESC: o pedido pode rejeitar — engole e a
    // criança clica de novo
    if (estado.fase === 'jogando' && !travado && !modoTouch) {
      pedirLock();
    }
  });
  function pedirLock() {
    try {
      (canvas.requestPointerLock() as unknown as Promise<void> | undefined)?.catch?.(() => {});
    } catch { /* browser antigo sem promise */ }
  }
  document.addEventListener('pointerlockchange', () => {
    travado = document.pointerLockElement === canvas;
    if (!travado) {
      pararRepetir();
      // ESC nativo saiu do lock no meio do jogo → pausa amigável
      if (estado.fase === 'jogando' && !modoTouch) ctx.fluxo.pausar();
    }
  });
  document.addEventListener('mousemove', (e) => {
    if (!travado || estado.fase !== 'jogando') return;
    ctx.fluxo.aoPrimeiroInput();
    jogador.yaw -= e.movementX * cfg.camera.sensibilidade;
    jogador.pitch = Math.max(-PITCH_MAX, Math.min(PITCH_MAX, jogador.pitch - e.movementY * cfg.camera.sensibilidade));
  });

  // clique segura = repete (quebrar em sequência estilo criativo)
  let repetirTimer = 0;
  function pararRepetir() {
    clearInterval(repetirTimer);
    repetirTimer = 0;
  }
  canvas.addEventListener('mousedown', (e) => {
    if (!travado || estado.fase !== 'jogando') return;
    e.preventDefault();
    const acao = e.button === 2 ? () => ctx.edicao.colocar() : () => ctx.edicao.quebrar();
    acao();
    pararRepetir();
    repetirTimer = window.setInterval(acao, 240);
  });
  window.addEventListener('mouseup', pararRepetir);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // ----- touch -----
  let modoTouch = false;
  let joyId = -1;
  let joyBaseX = 0;
  let joyBaseY = 0;
  let olharId = -1;
  let olharX = 0;
  let olharY = 0;
  let tapT0 = 0;
  let tapX0 = 0; // origem do toque: tap é medido daqui, não do evento anterior
  let tapY0 = 0; // (flick rápido coalescido a 5px/evento NÃO pode contar como tap)
  let tapMoveu = false;

  function ativarModoTouch() {
    if (modoTouch) return;
    modoTouch = true;
    ctx.ui.els.controles.hidden = false;
  }

  function largarJoystick() {
    joyId = -1;
    input.joyX = 0;
    input.joyY = 0;
    ctx.ui.els.joystick.hidden = true;
  }

  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch' || estado.fase !== 'jogando') return;
    ativarModoTouch();
    ctx.fluxo.aoPrimeiroInput();
    e.preventDefault();
    const w = ctx.cenaEl.clientWidth;
    if (e.clientX < w * 0.38 && joyId === -1) {
      // joystick flutuante nasce onde o dedo pousou
      joyId = e.pointerId;
      joyBaseX = e.clientX;
      joyBaseY = e.clientY;
      const js = ctx.ui.els.joystick;
      js.hidden = false;
      js.style.left = e.clientX + 'px';
      js.style.top = e.clientY + 'px';
      ctx.ui.els.joystickPino.style.transform = 'translate(-50%,-50%)';
    } else if (olharId === -1) {
      olharId = e.pointerId;
      olharX = e.clientX;
      olharY = e.clientY;
      tapT0 = performance.now();
      tapX0 = e.clientX;
      tapY0 = e.clientY;
      tapMoveu = false;
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'touch') return;
    if (e.pointerId === joyId) {
      const R = 44;
      let dx = e.clientX - joyBaseX;
      let dy = e.clientY - joyBaseY;
      const d = Math.hypot(dx, dy);
      if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
      input.joyX = dx / R;
      input.joyY = -dy / R; // dedo pra cima = frente
      ctx.ui.els.joystickPino.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px))';
    } else if (e.pointerId === olharId) {
      const dx = e.clientX - olharX;
      const dy = e.clientY - olharY;
      if (Math.abs(e.clientX - tapX0) + Math.abs(e.clientY - tapY0) > 12) tapMoveu = true;
      olharX = e.clientX;
      olharY = e.clientY;
      jogador.yaw -= dx * cfg.camera.sensTouch;
      jogador.pitch = Math.max(-PITCH_MAX, Math.min(PITCH_MAX, jogador.pitch - dy * cfg.camera.sensTouch));
    }
  });
  const soltarToque = (e: PointerEvent) => {
    if (e.pointerId === joyId) largarJoystick();
    if (e.pointerId === olharId) {
      olharId = -1;
      // tap curto e parado = ação do modo atual (⛏️ quebra / 🧱 coloca)
      if (!tapMoveu && performance.now() - tapT0 < 220 && estado.fase === 'jogando') {
        ctx.edicao.executarModo();
      }
    }
  };
  canvas.addEventListener('pointerup', soltarToque);
  canvas.addEventListener('pointercancel', soltarToque);

  // botões touch: pulo (segurar) e modo (toggle)
  const btnPulo = ctx.ui.els.btnPulo;
  btnPulo.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    btnPulo.setPointerCapture?.(e.pointerId);
    input.pulo = true;
    btnPulo.classList.add('on');
  });
  const soltarPulo = () => {
    input.pulo = false;
    btnPulo.classList.remove('on');
  };
  btnPulo.addEventListener('pointerup', soltarPulo);
  btnPulo.addEventListener('pointercancel', soltarPulo);
  btnPulo.addEventListener('lostpointercapture', soltarPulo);

  ctx.ui.els.btnModo.addEventListener('click', () => {
    estado.modoColocar = !estado.modoColocar;
    ctx.ui.atualizarModo();
    ctx.audio.somUI();
    ctx.ui.anunciar(estado.modoColocar ? 'Modo colocar bloco' : 'Modo quebrar bloco');
  });

  return {
    soltarTouch() {
      largarJoystick();
      olharId = -1;
      soltarPulo();
      pararRepetir();
    },
    estaTravado: () => travado,
    soltarLock() {
      if (travado) document.exitPointerLock();
    },
    pedirLock,
    emModoTouch: () => modoTouch,
  };
}
