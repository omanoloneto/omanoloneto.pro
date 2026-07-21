// Entrada do MineBlocks.
// Desktop: pointer lock (clique no canvas trava o mouse; ESC do browser
// solta → detectamos e pausamos), WASD/setas, espaço pula, clique
// esquerdo quebra / direito coloca (com repetição segurando), 1-9 e
// scroll na hotbar.
// Touch: joystick fixo no canto, arrastar olha, tap curto coloca ou
// interage, botões grandes de quebrar (segurar) e pular.
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
    // digitando num campo (nome do baú, placa…): não sequestra as teclas
    // pro jogo (o próprio campo trata Enter/Esc)
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    if (e.key === 'Escape') {
      // com pointer lock o browser já solta o lock no ESC e o
      // pointerlockchange pausa; este caminho cobre o touch/sem-lock
      if (estado.fase === 'pausado') { e.preventDefault(); ctx.fluxo.continuarJogo(); }
      else if (estado.fase === 'jogando' && ctx.ui.bauAberto() >= 0) {
        e.preventDefault();
        ctx.ui.fecharBau();
      }
      else if (estado.fase === 'jogando' && ctx.ui.fornalhaAberta()) {
        e.preventDefault();
        ctx.ui.fecharFornalha();
      }
      else if (estado.fase === 'jogando' && !ctx.ui.els.invPainel.hidden) {
        e.preventDefault();
        // sem relock: o keyup deste ESC soltaria o lock recém-pedido e o
        // pointerlockchange abriria o pause — ESC aqui SÓ fecha o painel
        alternarInventario(false);
      }
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault(); // não sai do jogo pra focar botão nenhum
      if (estado.fase === 'jogando') ctx.ui.mostrarJogadores(true);
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
    // E = inventário (igual Minecraft); C também, de "craft"
    if (/^[eEcC]$/.test(e.key)) { e.preventDefault(); alternarInventario(); }
    // Q = larga o item selecionado no chão (vira pacote que qualquer um pega)
    if (/^[qQ]$/.test(e.key)) { e.preventDefault(); ctx.edicao.soltarItemSelecionado(); }
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === 'Tab') { e.preventDefault(); ctx.ui.mostrarJogadores(false); return; }
    if (e.key === ' ') input.pulo = false;
    const acao = TECLAS[e.key];
    if (acao) input[acao] = false;
  });
  window.addEventListener('blur', () => ctx.fluxo.soltarInputs());

  // ----- hotbar: scroll cicla, clique seleciona -----
  window.addEventListener('wheel', (e) => {
    if (estado.fase !== 'jogando') return;
    // rolando um painel aberto (touchpad = wheel) não gira a hotbar
    if (ctx.ui.painelModalAberto()) return;
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
      // (menos com um painel aberto: soltar o mouse ali é de propósito)
      if (estado.fase === 'jogando' && !modoTouch && !ctx.ui.painelModalAberto()) ctx.fluxo.pausar();
    }
  });

  // inventário (tecla E / botão 🎒): abre soltando o mouse, fecha re-travando
  function alternarInventario(relock = true) {
    if (estado.fase !== 'jogando') return;
    const abrindo = ctx.ui.els.invPainel.hidden;
    ctx.ui.alternarCraft(abrindo);
    if (abrindo) {
      // solta TUDO: minerar/andar às cegas atrás do painel não
      ctx.fluxo.soltarInputs();
      if (travado) document.exitPointerLock();
    } else if (!modoTouch && relock) {
      pedirLock();
    }
    ctx.audio.somUI();
    ctx.ui.anunciar(abrindo ? 'Inventário aberto.' : 'Inventário fechado.');
  }
  document.addEventListener('mousemove', (e) => {
    if (!travado || estado.fase !== 'jogando') return;
    ctx.fluxo.aoPrimeiroInput();
    jogador.yaw -= e.movementX * cfg.camera.sensibilidade;
    jogador.pitch = Math.max(-PITCH_MAX, Math.min(PITCH_MAX, jogador.pitch - e.movementY * cfg.camera.sensibilidade));
  });

  // esquerdo SEGURADO golpeia (quebra com tempo, estilo Minecraft);
  // direito coloca (segurar repete). Botões independentes: um toque no
  // direito NÃO cancela a mineração do esquerdo.
  let colocarTimer = 0;
  function pararColocar() {
    clearInterval(colocarTimer);
    colocarTimer = 0;
  }
  function pararRepetir() {
    pararColocar();
    input.golpe = false;
  }
  canvas.addEventListener('mousedown', (e) => {
    if (!travado || estado.fase !== 'jogando') return;
    e.preventDefault();
    if (e.button === 2) {
      // 1º clique interage (abre baú, alterna porta, lê placa) OU coloca;
      // segurando repete a COLOCAÇÃO — mas SÓ se o 1º clique colocou de
      // fato (senão segurar o direito numa placa/porta ficaria colocando
      // bloco por cima dela a cada 240ms)
      pararColocar();
      if (ctx.edicao.interagir()) {
        colocarTimer = window.setInterval(() => ctx.edicao.colocar(), 240);
      }
    } else if (e.button === 0) {
      input.golpe = true;
      ctx.fluxo.aoPrimeiroInput();
    }
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 2) pararColocar();
    else if (e.button === 0) input.golpe = false;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // ----- touch -----
  let modoTouch = window.matchMedia('(pointer: coarse)').matches;
  let joyId = -1;
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

  const joyEl = ctx.ui.els.joystick;
  const joyPino = ctx.ui.els.joystickPino;

  function aplicarJoy(e: PointerEvent) {
    const r = joyEl.getBoundingClientRect();
    const dx = (e.clientX - r.left - r.width / 2) / (r.width / 2);
    const dy = (e.clientY - r.top - r.height / 2) / (r.height / 2);
    const mag = Math.hypot(dx, dy);
    const k = mag > 1 ? 1 / mag : 1;
    input.joyX = dx * k;
    input.joyY = -dy * k;
    joyPino.style.transform = 'translate(' + dx * k * 26 + 'px,' + dy * k * 26 + 'px)';
  }

  function largarJoystick() {
    joyId = -1;
    input.joyX = 0;
    input.joyY = 0;
    joyPino.style.transform = '';
  }

  joyEl.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    ativarModoTouch();
    ctx.fluxo.aoPrimeiroInput();
    joyId = e.pointerId;
    try { joyEl.setPointerCapture(e.pointerId); } catch { }
    aplicarJoy(e);
  });
  joyEl.addEventListener('pointermove', (e) => {
    if (e.pointerId !== joyId) return;
    e.preventDefault();
    aplicarJoy(e);
  });
  const soltaJoy = (e: PointerEvent) => {
    if (e.pointerId === joyId) largarJoystick();
  };
  joyEl.addEventListener('pointerup', soltaJoy);
  joyEl.addEventListener('pointercancel', soltaJoy);
  joyEl.addEventListener('lostpointercapture', soltaJoy);

  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch' || estado.fase !== 'jogando') return;
    ativarModoTouch();
    ctx.fluxo.aoPrimeiroInput();
    e.preventDefault();
    if (olharId === -1) {
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
    if (e.pointerId === olharId) {
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
    if (e.pointerId === olharId) {
      olharId = -1;
      // tap curto e parado: coloca o bloco selecionado ou interage
      // (porta/baú/placa); quebrar é SEGURAR o botão ⛏️
      if (!tapMoveu && performance.now() - tapT0 < 220 && estado.fase === 'jogando') {
        ctx.edicao.interagir();
      }
    }
  };
  canvas.addEventListener('pointerup', soltarToque);
  canvas.addEventListener('pointercancel', soltarToque);

  // botões touch: quebrar (segurar) e pulo (segurar)
  const btnQuebrar = ctx.ui.els.btnQuebrar;
  btnQuebrar.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    ativarModoTouch();
    ctx.fluxo.aoPrimeiroInput();
    try { btnQuebrar.setPointerCapture(e.pointerId); } catch { }
    input.golpe = true;
    btnQuebrar.classList.add('on');
  });
  const soltarQuebrar = () => {
    input.golpe = false;
    btnQuebrar.classList.remove('on');
  };
  btnQuebrar.addEventListener('pointerup', soltarQuebrar);
  btnQuebrar.addEventListener('pointercancel', soltarQuebrar);
  btnQuebrar.addEventListener('lostpointercapture', soltarQuebrar);

  const btnPulo = ctx.ui.els.btnPulo;
  btnPulo.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try { btnPulo.setPointerCapture(e.pointerId); } catch { }
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

  return {
    soltarTouch() {
      largarJoystick();
      olharId = -1;
      soltarQuebrar();
      soltarPulo();
      pararRepetir();
    },
    estaTravado: () => travado,
    soltarLock() {
      if (travado) document.exitPointerLock();
    },
    pedirLock,
    alternarInventario,
    emModoTouch: () => modoTouch,
  };
}
