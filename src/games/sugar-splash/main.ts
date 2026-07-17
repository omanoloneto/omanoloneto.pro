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
    fase: 'inicio', nome: '', team: 0, pontos: 0, kills: 0, mortes: 0,
    tempoRestanteS: 0, respawnRestanteS: 0,
    solidez: dados.config.jogador.solidezMax,
    tanque: dados.config.bisnaga.tanqueMax,
    mudo: false, ultimoDanoMs: 0, derretendo: false,
  };
  const jogador: Jogador = { x: 0, y: 0, z: 10, vy: 0, yaw: 0, pitch: 0, noChao: true, naPiscina: false, shake: 0 };
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
    spawnsTime: dados.spawnsTime,
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

  function respawnJogador() {
    const sp = ctx.spawnsTime[estado.team];
    jogador.x = sp.x;
    jogador.z = sp.z;
    jogador.y = 0;
    jogador.vy = 0;
    jogador.yaw = sp.yaw;
    jogador.pitch = 0;
    estado.solidez = cfg.jogador.solidezMax;
    estado.tanque = cfg.bisnaga.tanqueMax;
    estado.derretendo = false;
    estado.respawnRestanteS = 0;
    ui.esconderRespawn();
    ui.atualizarHud();
  }

  function derreterJogador() {
    if (estado.derretendo) return;
    estado.derretendo = true;
    estado.mortes++;
    estado.respawnRestanteS = cfg.partida.respawnS;
    ui.atualizarHud();
    audio.somDerreter();
    ui.mostrarRespawn(cfg.partida.respawnS);
    ui.anunciar('Você derreteu! Voltando pro vestiário em ' + cfg.partida.respawnS + ' segundos.');
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
    ctx.arena.passo(ts);

    if (estado.solidez <= 0 && !estado.derretendo) derreterJogador();

    if (estado.derretendo) {
      camera.position.y = Math.max(0.3, camera.position.y - dt * 1.2);
      estado.respawnRestanteS -= dt;
      ui.mostrarRespawn(Math.max(1, Math.ceil(estado.respawnRestanteS)));
      if (estado.respawnRestanteS <= 0) respawnJogador();
    }

    estado.tempoRestanteS -= dt;
    ui.atualizarHud();
    if (estado.tempoRestanteS <= 0) {
      estado.tempoRestanteS = 0;
      renderer.render(scene, camera);
      fluxo.fimDeJogo();
      return;
    }

    renderer.render(scene, camera);
  }

  const fluxo = {
    comecar() {
      const nome = nomeLimpo(campoNome.value);
      if (nome.length < cfg.ranking.nomeMin) {
        ui.els.erroIntro.textContent = 'Escreve teu nome primeiro (só letras e números)!';
        ui.els.erroIntro.hidden = false;
        campoNome.focus();
        return;
      }
      ui.els.erroIntro.hidden = true;
      estado.nome = nome;
      try { localStorage.setItem('sugar-splash:nome', nome); } catch { }
      audio.retomar();
      jog.pedirFullscreen();
      fluxo.soltarInputs();
      estado.fase = 'jogando';
      estado.pontos = 0;
      estado.kills = 0;
      estado.mortes = 0;
      estado.team = Math.random() < 0.5 ? 0 : 1;
      estado.tempoRestanteS = cfg.partida.duracaoS;
      estado.respawnRestanteS = 0;
      estado.solidez = cfg.jogador.solidezMax;
      estado.tanque = cfg.bisnaga.tanqueMax;
      estado.derretendo = false;
      jog.definirTime(estado.team);
      const sp = ctx.spawnsTime[estado.team];
      jogador.x = sp.x;
      jogador.z = sp.z;
      jogador.y = 0;
      jogador.vy = 0;
      jogador.yaw = sp.yaw;
      jogador.pitch = 0;
      jogador.shake = 0;
      ctx.bots.spawnInicial();
      ctx.agua.limpar();
      ui.els.introModal.hidden = true;
      ui.els.controles.hidden = false;
      ui.els.pauseBtn.hidden = false;
      ui.esconderRespawn();
      medir();
      ui.atualizarHud();
      audio.somOnda();
      const meuTime = estado.team === 0 ? 'AZUL! 🔵' : 'VERMELHO! 🔴';
      ui.mostrarBanner('Você caiu no time ' + meuTime, 'Derreta o time ' + (estado.team === 0 ? 'vermelho' : 'azul') + '!');
      retomarLoop();
      if (!jog.emModoTouch()) jog.pedirLock();
      ui.anunciar('Valendo! Partida de 5 minutos. Você é do time ' + (estado.team === 0 ? 'azul' : 'vermelho') + '. Saia do vestiário e derreta o outro time!');
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
      ui.esconderRespawn();
      audio.somFim();
      audio.suspender();
      const meuTime = estado.team === 0 ? 'AZUL 🔵' : 'VERMELHO 🔴';
      const timeInimigo = estado.team === 0 ? 'VERMELHO 🔴' : 'AZUL 🔵';
      let msg: string;
      if (estado.kills > estado.mortes) {
        estado.pontos += cfg.partida.bonusVitoria;
        msg = 'Time ' + meuTime + ' venceu por ' + estado.kills + ' × ' + estado.mortes + '! 🏆';
      } else if (estado.kills === estado.mortes) {
        msg = 'Empate suado: ' + estado.kills + ' × ' + estado.mortes + '! 🤝';
      } else {
        msg = 'Time ' + timeInimigo + ' venceu por ' + estado.mortes + ' × ' + estado.kills + '. Na próxima! 💪';
      }
      const fim = ui.els.fimModal;
      (fim.querySelector('[data-fim-msg]') as HTMLElement).textContent = msg;
      (fim.querySelector('[data-fim-score]') as HTMLElement).textContent = String(estado.pontos);
      const gravar = fim.querySelector('[data-gravar-nome]') as HTMLElement;
      gravar.hidden = estado.pontos <= 0;
      fim.hidden = false;
      setTimeout(() => (gravar.hidden ? (document.querySelector('[data-replay]') as HTMLElement) : gravar).focus(), 60);
      ui.anunciar('Fim de jogo! ' + msg + ' Você fez ' + estado.pontos + ' pontos.');
    },
    reiniciar() {
      estado.fase = 'inicio';
      fluxo.soltarInputs();
      jog.soltarLock();
      pararLoop();
      audio.suspender();
      ui.esconderRespawn();
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

  function nomeLimpo(bruto: string): string {
    return bruto.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, cfg.ranking.nomeMax);
  }
  const campoNome = document.querySelector('[data-campo-nome]') as HTMLInputElement;
  try { campoNome.value = localStorage.getItem('sugar-splash:nome') || ''; } catch { }
  campoNome.addEventListener('input', () => {
    const limpo = nomeLimpo(campoNome.value);
    if (campoNome.value !== limpo) campoNome.value = limpo;
  });
  campoNome.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      fluxo.comecar();
    }
  });

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
  setTimeout(() => (campoNome.value ? (document.querySelector('[data-comecar]') as HTMLElement) : campoNome).focus(), 60);

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
