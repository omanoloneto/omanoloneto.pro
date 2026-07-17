import * as THREE from 'three';
import type { Contexto, Estado, Input, Jogador } from './tipos';
import { criarArena } from './arena';
import { criarAgua } from './agua';
import { criarBots } from './bots';
import { criarJogador } from './jogador';
import { criarUI } from './ui';
import { criarAudio } from './audio';
import { criarRanking } from './ranking';

export function iniciarJogo() {
  const dados = JSON.parse(document.querySelector('[data-dados]')!.textContent!);

  const estado: Estado = {
    fase: 'inicio', pontos: 0, onda: 0, vidas: 0,
    solidez: dados.config.jogador.solidezMax,
    tanque: dados.config.bisnaga.tanqueMax,
    mudo: false, ultimoDanoMs: 0, derretendo: false,
  };
  const jogador: Jogador = { x: dados.spawnJogador.x, y: 0, z: dados.spawnJogador.z, vy: 0, yaw: dados.spawnJogador.yaw, pitch: 0, noChao: true, naPiscina: false };
  const input: Input = { frente: false, tras: false, esq: false, dir: false, pulo: false, atirando: false, joyX: 0, joyY: 0 };

  const cenaEl = document.querySelector('[data-cena]') as HTMLElement;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8fd4f0);
  scene.fog = new THREE.Fog(0x8fd4f0, 40, 90);
  const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 120);
  scene.add(camera);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  cenaEl.insertBefore(renderer.domElement, cenaEl.firstChild);

  const ctx = {
    cfg: dados.config,
    caixotes: dados.caixotes,
    spawnsBots: dados.spawnsBots,
    spawnJogador: dados.spawnJogador,
    motionReduzido: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    scene, camera, renderer, cenaEl,
    estado, jogador, input,
  } as Contexto;

  ctx.ui = criarUI(ctx);
  ctx.audio = criarAudio(ctx);
  ctx.audio.bindMute(ctx.ui.els.muteBtn, ctx.ui.els.muteIcon);
  ctx.arena = criarArena(ctx);
  ctx.agua = criarAgua(ctx);
  ctx.bots = criarBots(ctx);
  const jog = criarJogador(ctx);
  const { ui, audio, cfg } = ctx;

  function medir() {
    const w = cenaEl.clientWidth || 1;
    const h = cenaEl.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (!rafId) renderer.render(scene, camera);
  }
  window.addEventListener('resize', medir);

  let rafId = 0;
  let ultimoTs = 0;
  let respiroTimer = 0;
  let fimTimer = 0;

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

  function proximaOnda() {
    estado.onda++;
    ctx.bots.spawnOnda(estado.onda);
    audio.somOnda();
    ui.mostrarBanner('Onda ' + estado.onda + '! 🌊', estado.onda === 1 ? 'Derreta os bonecos de açúcar!' : '');
    ui.anunciar('Onda ' + estado.onda + '!');
    ui.atualizarHud();
  }

  function derreterJogador() {
    if (estado.derretendo) return;
    estado.derretendo = true;
    estado.vidas--;
    ui.atualizarHud();
    audio.somDerreter();
    ui.mostrarToast('💧 Você derreteu! ' + (estado.vidas > 0 ? 'Se reconstituindo…' : ''), 'info', 2200);
    ui.anunciar(estado.vidas > 0 ? 'Você derreteu! Voltando pra base.' : 'Você derreteu de vez!');
    if (estado.vidas <= 0) {
      clearTimeout(fimTimer);
      fimTimer = window.setTimeout(() => fluxo.fimDeJogo(), 1200);
      return;
    }
    setTimeout(() => {
      jogador.x = ctx.spawnJogador.x;
      jogador.z = ctx.spawnJogador.z;
      jogador.y = 0;
      jogador.yaw = ctx.spawnJogador.yaw;
      estado.solidez = cfg.jogador.solidezMax;
      estado.tanque = cfg.bisnaga.tanqueMax;
      estado.derretendo = false;
      ui.atualizarHud();
    }, 1400);
  }

  function loop(ts: number) {
    rafId = requestAnimationFrame(loop);
    if (!ultimoTs) { ultimoTs = ts; return; }
    const dt = Math.min((ts - ultimoTs) / 1000, 0.05);
    ultimoTs = ts;
    if (estado.fase !== 'jogando') return;

    if (!estado.derretendo) jog.passo(dt, ts);
    ctx.bots.passo(dt, ts);
    ctx.agua.passo(dt);

    if (estado.solidez <= 0 && !estado.derretendo) derreterJogador();

    if (estado.derretendo) {
      camera.position.y = Math.max(0.3, camera.position.y - dt * 1.2);
    }

    if (ctx.bots.vivos() === 0 && !respiroTimer && estado.vidas > 0) {
      estado.pontos += cfg.bots.bonusOndaLimpa;
      ui.atualizarHud();
      if (estado.onda > 0) ui.mostrarToast('🎉 Onda limpa! +' + cfg.bots.bonusOndaLimpa, 'ok', 2000);
      respiroTimer = window.setTimeout(() => {
        respiroTimer = 0;
        if (estado.fase === 'jogando') proximaOnda();
      }, cfg.ondas.respiroMs);
    }

    renderer.render(scene, camera);
  }

  const fluxo = {
    comecar() {
      audio.retomar();
      jog.pedirFullscreen();
      clearTimeout(respiroTimer);
      respiroTimer = 0;
      clearTimeout(fimTimer);
      fluxo.soltarInputs();
      estado.fase = 'jogando';
      estado.pontos = 0;
      estado.onda = 0;
      estado.vidas = cfg.jogador.vidas;
      estado.solidez = cfg.jogador.solidezMax;
      estado.tanque = cfg.bisnaga.tanqueMax;
      estado.derretendo = false;
      jogador.x = ctx.spawnJogador.x;
      jogador.z = ctx.spawnJogador.z;
      jogador.y = 0;
      jogador.vy = 0;
      jogador.yaw = ctx.spawnJogador.yaw;
      jogador.pitch = 0;
      ctx.bots.limpar();
      ctx.agua.limpar();
      ui.els.introModal.hidden = true;
      ui.els.controles.hidden = false;
      ui.els.pauseBtn.hidden = false;
      medir();
      ui.atualizarHud();
      proximaOnda();
      retomarLoop();
      if (!jog.emModoTouch()) jog.pedirLock();
      ui.anunciar('Valendo! Ande com W A S D, mire com o mouse e segure o clique pra atirar água. Mergulhe na piscina pra recarregar!');
    },
    pausar() {
      if (estado.fase !== 'jogando') return;
      estado.fase = 'pausado';
      fluxo.soltarInputs();
      jog.soltarLock();
      pararLoop();
      renderer.render(scene, camera);
      ui.els.pausaModal.hidden = false;
      setTimeout(() => (document.querySelector('[data-continuar]') as HTMLElement).focus(), 60);
      ui.anunciar('Jogo pausado.');
    },
    continuarJogo() {
      if (estado.fase !== 'pausado') return;
      jog.pedirFullscreen();
      ui.els.pausaModal.hidden = true;
      estado.fase = 'jogando';
      medir();
      retomarLoop();
      if (!jog.emModoTouch()) jog.pedirLock();
    },
    fimDeJogo() {
      estado.fase = 'fim';
      fluxo.soltarInputs();
      jog.soltarLock();
      pararLoop();
      audio.somFim();
      audio.suspender();
      const fim = ui.els.fimModal;
      (fim.querySelector('[data-fim-msg]') as HTMLElement).textContent =
        'Você derreteu na onda ' + estado.onda + '! A piscina agradece a doçura. 🍬';
      (fim.querySelector('[data-fim-score]') as HTMLElement).textContent = String(estado.pontos);
      const gravar = fim.querySelector('[data-gravar-nome]') as HTMLElement;
      gravar.hidden = estado.pontos <= 0;
      fim.hidden = false;
      setTimeout(() => (gravar.hidden ? (document.querySelector('[data-replay]') as HTMLElement) : gravar).focus(), 60);
      ui.anunciar('Fim de jogo! Você fez ' + estado.pontos + ' pontos e chegou na onda ' + estado.onda + '.');
    },
    reiniciar() {
      estado.fase = 'inicio';
      clearTimeout(respiroTimer);
      respiroTimer = 0;
      clearTimeout(fimTimer);
      fluxo.soltarInputs();
      jog.soltarLock();
      pararLoop();
      audio.suspender();
      ctx.bots.limpar();
      ctx.agua.limpar();
      [ui.els.pausaModal, ui.els.fimModal, ui.els.entradaModal, ui.els.recordesModal].forEach((m) => { m.hidden = true; });
      ui.els.controles.hidden = true;
      ui.els.pauseBtn.hidden = true;
      ui.els.introModal.hidden = false;
      renderer.render(scene, camera);
      setTimeout(() => (document.querySelector('[data-comecar]') as HTMLElement).focus(), 60);
    },
    medir,
    soltarInputs() {
      input.frente = input.tras = input.esq = input.dir = input.pulo = input.atirando = false;
      input.joyX = input.joyY = 0;
    },
  };
  ctx.fluxo = fluxo;
  ctx.ranking = criarRanking(ctx);
  jog.ligarInput();

  (document.querySelector('[data-comecar]') as HTMLElement).addEventListener('click', () => fluxo.comecar());
  (document.querySelector('[data-replay]') as HTMLElement).addEventListener('click', () => fluxo.reiniciar());
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
  (document.querySelector('[data-entrada-voltar]') as HTMLElement).addEventListener('click', () => fluxo.fimDeJogo());
  document.querySelectorAll<HTMLElement>('[data-tecla-nome]').forEach((b) => {
    b.addEventListener('click', () => ctx.ranking.digitarLetra(b.dataset.teclaNome!));
  });
  (document.querySelector('[data-nome-apagar]') as HTMLElement).addEventListener('click', () => ctx.ranking.apagarLetra());
  (document.querySelector('[data-nome-ok]') as HTMLElement).addEventListener('click', () => ctx.ranking.confirmarEntrada());
  window.addEventListener('keydown', (e) => {
    if (estado.fase !== 'entrada') return;
    const l = e.key.length === 1 ? e.key.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '') : '';
    if (/^[A-Z]$/.test(l)) { e.preventDefault(); ctx.ranking.digitarLetra(l); }
    else if (e.key === 'Backspace') { e.preventDefault(); ctx.ranking.apagarLetra(); }
    else if (e.key === 'Enter') { e.preventDefault(); ctx.ranking.confirmarEntrada(); }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && estado.fase === 'jogando') fluxo.pausar();
  });

  document.body.classList.add('is-game');
  medir();
  renderer.render(scene, camera);
  setTimeout(() => (document.querySelector('[data-comecar]') as HTMLElement).focus(), 60);

  (window as any).__ss = {
    estado, jogador, input, cfg,
    bots: ctx.bots,
    agua: ctx.agua,
    arena: ctx.arena,
    fluxo,
    camera, renderer, scene,
    render: () => renderer.render(scene, camera),
  };
}
