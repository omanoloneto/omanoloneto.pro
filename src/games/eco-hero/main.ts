import type { Contexto, Estado, Heroi, Input } from './tipos';
import { criarSprites } from './sprites';
import { criarNivel } from './nivel';
import { criarMotor } from './motor';
import { criarUI } from './ui';
import { criarAudio } from './audio';
import { criarRanking } from './ranking';

export function iniciarJogo() {
  const dados = JSON.parse(document.querySelector('[data-dados]')!.textContent!);

  const estado: Estado = {
    fase: 'inicio', pontos: 0, vidas: 0, coletados: 0, totalLixos: 0,
    tempoMs: 0, checkpoint: false, mudo: false, lixeiraAberta: false,
  };
  const heroi: Heroi = { x: 0, y: 0, vx: 0, vy: 0, noChao: false, olhando: 1, ultimoChaoMs: 0, puloPedidoMs: 0, invencivelAte: 0, morrendo: false };
  const input: Input = { esq: false, dir: false, pulo: false, puloSegurado: false };

  const canvas = document.querySelector('[data-canvas]') as HTMLCanvasElement;
  canvas.width = dados.config.viewW;
  canvas.height = dados.config.viewH;
  const g = canvas.getContext('2d')!;
  g.imageSmoothingEnabled = false;

  const ctx = {
    cfg: dados.config,
    fase1: dados.fase1,
    tiposLixo: dados.tiposLixo,
    motionReduzido: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    canvas, g, estado, heroi, input,
    sprites: criarSprites(),
  } as Contexto;

  ctx.ui = criarUI(ctx);
  ctx.audio = criarAudio(ctx);
  ctx.audio.bindMute(ctx.ui.els.muteBtn, ctx.ui.els.muteIcon);
  ctx.nivel = criarNivel(ctx);
  const motor = criarMotor(ctx);
  const { ui, audio, cfg } = ctx;

  const telaTouch = window.matchMedia('(pointer: coarse)').matches;
  function pedirFullscreen() {
    if (!telaTouch || document.fullscreenElement) return;
    const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
    try {
      const pr = el.requestFullscreen
        ? el.requestFullscreen({ navigationUI: 'hide' } as FullscreenOptions)
        : (el.webkitRequestFullscreen && el.webkitRequestFullscreen(), undefined);
      if (pr && typeof pr.then === 'function') {
        pr.then(() => {
          const o = screen.orientation as ScreenOrientation & { lock?: (m: string) => Promise<void> };
          if (o && typeof o.lock === 'function') o.lock('landscape').catch(() => {});
        }).catch(() => {});
      }
    } catch { }
  }

  let rafId = 0;
  let ultimoTs = 0;

  function loop(ts: number) {
    rafId = requestAnimationFrame(loop);
    if (!ultimoTs) { ultimoTs = ts; return; }
    const dt = Math.min((ts - ultimoTs) / 1000, 0.04);
    ultimoTs = ts;
    if (estado.fase !== 'jogando') return;
    motor.passo(dt, ts);
    motor.desenhar();
  }
  function retomarLoop() {
    if (!rafId) {
      ultimoTs = 0;
      rafId = requestAnimationFrame(loop);
    }
  }
  function pararLoop() {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }

  function nascer(noCheckpoint: boolean) {
    heroi.x = noCheckpoint ? ctx.nivel.checkpointX : ctx.nivel.spawn.x;
    heroi.y = ctx.nivel.spawn.y;
    heroi.vx = 0;
    heroi.vy = 0;
    heroi.olhando = 1;
    heroi.invencivelAte = performance.now() + 1200;
    heroi.morrendo = false;
    motor.resetCamera();
  }

  const fluxo = {
    comecar() {
      audio.retomar();
      pedirFullscreen();
      estado.fase = 'jogando';
      estado.pontos = 0;
      estado.vidas = cfg.jogador.vidas;
      estado.coletados = 0;
      estado.tempoMs = 0;
      estado.checkpoint = false;
      estado.lixeiraAberta = false;
      for (const l of ctx.nivel.lixos) l.coletado = false;
      for (let i = 0; i < ctx.nivel.caranguejos.length; i++) {
        const c = ctx.nivel.caranguejos[i];
        c.escondido = false;
        c.x = ctx.fase1.caranguejos[i] * cfg.tile;
        c.vx = cfg.caranguejo.vel;
      }
      estado.totalLixos = ctx.nivel.lixos.length;
      nascer(false);
      ui.els.introModal.hidden = true;
      ui.els.controles.hidden = false;
      ui.els.pauseBtn.hidden = false;
      ui.atualizarHud();
      retomarLoop();
      ui.anunciar('Valendo! Colete todo o lixo da praia. Setas andam, seta pra cima ou espaço pula.');
    },
    pausar() {
      if (estado.fase !== 'jogando') return;
      estado.fase = 'pausado';
      input.esq = input.dir = input.pulo = input.puloSegurado = false;
      pararLoop();
      motor.desenhar();
      ui.els.pausaModal.hidden = false;
      setTimeout(() => (document.querySelector('[data-continuar]') as HTMLElement).focus(), 60);
      ui.anunciar('Jogo pausado.');
    },
    continuarJogo() {
      if (estado.fase !== 'pausado') return;
      ui.els.pausaModal.hidden = true;
      estado.fase = 'jogando';
      retomarLoop();
    },
    vitoria() {
      if (estado.fase !== 'jogando') return;
      estado.fase = 'vitoria';
      pararLoop();
      audio.somVitoria();
      audio.suspender();
      const seg = Math.round(estado.tempoMs / 1000);
      const bonus = Math.max(0, cfg.pontos.bonusTempoBase - seg * cfg.pontos.bonusTempoPorS);
      estado.pontos += bonus;
      const v = ui.els.vitoriaModal;
      (v.querySelector('[data-vit-msg]') as HTMLElement).textContent =
        'Você limpou a praia inteira em ' + Math.floor(seg / 60) + 'min ' + (seg % 60) + 's! O Brasil agradece! 🇧🇷';
      (v.querySelector('[data-vit-bonus]') as HTMLElement).textContent = '+' + bonus + ' de bônus de tempo';
      (v.querySelector('[data-vit-score]') as HTMLElement).textContent = String(estado.pontos);
      v.hidden = false;
      setTimeout(() => (document.querySelector('[data-gravar-nome]') as HTMLElement).focus(), 60);
      ui.anunciar('Fase limpa! Você fez ' + estado.pontos + ' pontos.');
    },
    fimDeJogo() {
      estado.fase = 'fim';
      pararLoop();
      audio.somMorte();
      audio.suspender();
      const fim = ui.els.fimModal;
      (fim.querySelector('[data-fim-msg]') as HTMLElement).textContent =
        'Você coletou ' + estado.coletados + ' de ' + estado.totalLixos + ' lixos. A praia ainda precisa de você!';
      fim.hidden = false;
      setTimeout(() => (document.querySelector('[data-replay]') as HTMLElement).focus(), 60);
      ui.anunciar('Fim de jogo!');
    },
    reiniciar() {
      estado.fase = 'inicio';
      pararLoop();
      audio.suspender();
      [ui.els.pausaModal, ui.els.vitoriaModal, ui.els.fimModal, ui.els.entradaModal, ui.els.recordesModal].forEach((m) => { m.hidden = true; });
      ui.els.controles.hidden = true;
      ui.els.pauseBtn.hidden = true;
      ui.els.introModal.hidden = false;
      setTimeout(() => (document.querySelector('[data-comecar]') as HTMLElement).focus(), 60);
    },
    perderVida() {
      if (heroi.morrendo) return;
      heroi.morrendo = true;
      estado.vidas--;
      ui.flashDano();
      audio.somMorte();
      ui.atualizarHud();
      if (estado.vidas <= 0) {
        setTimeout(() => fluxo.fimDeJogo(), 600);
        return;
      }
      ui.mostrarToast('💫 Voltando pro ' + (estado.checkpoint ? 'checkpoint' : 'começo') + '…', 1800);
      setTimeout(() => {
        if (estado.fase === 'jogando') nascer(estado.checkpoint);
      }, 700);
    },
  };
  ctx.fluxo = fluxo;
  ctx.ranking = criarRanking(ctx);

  const TECLAS: Record<string, 'esq' | 'dir'> = {
    ArrowLeft: 'esq', a: 'esq', A: 'esq',
    ArrowRight: 'dir', d: 'dir', D: 'dir',
  };
  window.addEventListener('keydown', (e) => {
    if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
    if (estado.fase === 'entrada') {
      const l = e.key.length === 1 ? e.key.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '') : '';
      if (/^[A-Z]$/.test(l)) { e.preventDefault(); ctx.ranking.digitarLetra(l); }
      else if (e.key === 'Backspace') { e.preventDefault(); ctx.ranking.apagarLetra(); }
      else if (e.key === 'Enter') { e.preventDefault(); ctx.ranking.confirmarEntrada(); }
      return;
    }
    if (e.key === 'Escape') {
      if (estado.fase === 'jogando') fluxo.pausar();
      else if (estado.fase === 'pausado') fluxo.continuarJogo();
      return;
    }
    if (estado.fase !== 'jogando') return;
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      input.pulo = true;
      input.puloSegurado = true;
      return;
    }
    const acao = TECLAS[e.key];
    if (acao) {
      e.preventDefault();
      input[acao] = true;
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') input.puloSegurado = false;
    const acao = TECLAS[e.key];
    if (acao) input[acao] = false;
  });
  window.addEventListener('blur', () => {
    input.esq = input.dir = input.pulo = input.puloSegurado = false;
  });

  document.querySelectorAll<HTMLElement>('[data-ctl]').forEach((btn) => {
    const acao = btn.dataset.ctl!;
    const liga = (e: PointerEvent) => {
      e.preventDefault();
      pedirFullscreen();
      btn.setPointerCapture && btn.setPointerCapture(e.pointerId);
      if (acao === 'pulo') {
        input.pulo = true;
        input.puloSegurado = true;
      } else {
        input[acao as 'esq' | 'dir'] = true;
      }
      btn.classList.add('on');
    };
    const desliga = () => {
      if (acao === 'pulo') input.puloSegurado = false;
      else input[acao as 'esq' | 'dir'] = false;
      btn.classList.remove('on');
    };
    btn.addEventListener('pointerdown', liga);
    btn.addEventListener('pointerup', desliga);
    btn.addEventListener('pointercancel', desliga);
    btn.addEventListener('lostpointercapture', desliga);
  });

  (document.querySelector('[data-comecar]') as HTMLElement).addEventListener('click', () => fluxo.comecar());
  document.querySelectorAll<HTMLElement>('[data-replay]').forEach((b) => b.addEventListener('click', () => fluxo.reiniciar()));
  (document.querySelector('[data-continuar]') as HTMLElement).addEventListener('click', () => fluxo.continuarJogo());
  (document.querySelector('[data-recomecar]') as HTMLElement).addEventListener('click', () => {
    ui.els.pausaModal.hidden = true;
    fluxo.reiniciar();
  });
  ui.els.pauseBtn.addEventListener('click', () => fluxo.pausar());
  (document.querySelector('[data-ver-recordes]') as HTMLElement).addEventListener('click', () => ctx.ranking.abrirRecordes(true));
  (document.querySelector('[data-gravar-nome]') as HTMLElement).addEventListener('click', () => ctx.ranking.abrirEntrada());
  (document.querySelector('[data-recordes-replay]') as HTMLElement).addEventListener('click', () => fluxo.reiniciar());
  (document.querySelector('[data-voltar-intro]') as HTMLElement).addEventListener('click', () => fluxo.reiniciar());
  (document.querySelector('[data-entrada-voltar]') as HTMLElement).addEventListener('click', () => {
    ui.els.entradaModal.hidden = true;
    ui.els.vitoriaModal.hidden = false;
    estado.fase = 'vitoria';
  });
  document.querySelectorAll<HTMLElement>('[data-tecla-nome]').forEach((b) => {
    b.addEventListener('click', () => ctx.ranking.digitarLetra(b.dataset.teclaNome!));
  });
  (document.querySelector('[data-nome-apagar]') as HTMLElement).addEventListener('click', () => ctx.ranking.apagarLetra());
  (document.querySelector('[data-nome-ok]') as HTMLElement).addEventListener('click', () => ctx.ranking.confirmarEntrada());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && estado.fase === 'jogando') fluxo.pausar();
  });

  document.body.classList.add('is-game');
  motor.desenhar();
  setTimeout(() => (document.querySelector('[data-comecar]') as HTMLElement).focus(), 60);

  (window as any).__eh = {
    estado, heroi, input, cfg,
    nivel: ctx.nivel,
    fluxo,
    motor,
    render: () => motor.desenhar(),
  };
}
