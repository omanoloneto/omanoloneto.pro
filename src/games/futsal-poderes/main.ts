import * as THREE from 'three';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';
import { createStage3D } from '../../lib/stage3d';
import { mulberry32 } from '../../lib/rng';
import { criarMundo } from './mundo';
import { criarCameraPES } from './camera';
import { criarMotor } from './motor';
import { criarUI } from './ui';
import { criarAudio } from './audio';
import { criarRanking } from './ranking';
import { bindInput } from './input';
import type { Ctx, Estado, Input } from './tipos';

export function iniciarJogo() {
  const data = JSON.parse(document.querySelector('[data-dados]')!.textContent!);
  const cfg = data.config;
  const dados = data.times;

  let mudo = cfg.somLigadoInicial ? false : true;
  try { mudo = localStorage.getItem(cfg.ranking.jogo + ':mudo') === '1'; } catch { }

  const estado: Estado = {
    fase: 'inicio', mudo, placar: [0, 0], tempoS: cfg.partida.duracaoS,
    ativo: null, ladoJogador: 0, golDe: -1, golAte: 0, seed: 20260101,
  };
  const input: Input = { cima: false, baixo: false, esq: false, dir: false, eixoX: 0, eixoZ: 0, chutar: false, chutarSeg: 0, correr: false, poder: false };
  const cena = document.querySelector('[data-cena]') as HTMLElement;

  const ctx = { cfg, dados, input, estado, cena, rng: mulberry32(estado.seed) } as unknown as Ctx;

  let outline: OutlineEffect | undefined;
  const stage = createStage3D(cena, {
    fov: 46,
    far: 400,
    onFrame(dt) {
      if (estado.fase === 'jogando') ctx.motor.passo(dt);
      else { ctx.cameraPES.passo(dt); ctx.mundo.passoAnim(dt); ctx.mundo.passoTrail(dt); }
    },
    renderFn: () => (outline ? outline.render(stage.scene, stage.camera) : stage.renderer.render(stage.scene, stage.camera)),
  });
  outline = new OutlineEffect(stage.renderer, { defaultThickness: 0.006, defaultColor: [0, 0, 0], defaultAlpha: 0.85 });
  ctx.stage = stage;
  ctx.scene = stage.scene;
  ctx.camera = stage.camera;
  stage.scene.background = new THREE.Color(cfg.cores.ceu);
  stage.scene.fog = new THREE.Fog(new THREE.Color(cfg.cores.neblina), 120, 260);

  ctx.ui = criarUI(ctx);
  ctx.audio = criarAudio(ctx);
  ctx.mundo = criarMundo(ctx);
  ctx.cameraPES = criarCameraPES(ctx);
  ctx.motor = criarMotor(ctx);
  ctx.ranking = criarRanking(ctx);

  ctx.motor.posicionar(0);
  ctx.cameraPES.reset();
  ctx.ui.setPlacar(0, 0);
  ctx.ui.setTempo(estado.tempoS);
  ctx.audio.bindMute(ctx.ui.els.muteBtn, ctx.ui.els.muteIcon);

  const touch = window.matchMedia('(pointer: coarse)').matches;

  const fluxo = {
    comecar() {
      estado.fase = 'jogando';
      estado.placar = [0, 0];
      estado.tempoS = cfg.partida.duracaoS;
      estado.golDe = -1;
      estado.golAte = 0;
      for (const j of ctx.mundo.jogadores) j.energia = cfg.poder.energiaMax * 0.4;
      ctx.motor.posicionar(0);
      ctx.cameraPES.reset();
      ctx.ui.setPlacar(0, 0);
      ctx.ui.els.introModal.hidden = true;
      ctx.ui.els.fimModal.hidden = true;
      ctx.ui.els.recordesModal.hidden = true;
      ctx.ui.els.pauseBtn.hidden = false;
      ctx.ui.els.controles.hidden = !touch;
      ctx.audio.retomar();
      ctx.audio.apito();
      ctx.ui.anunciar('Começou! Faça gols contra os ' + dados[1].nome + '.');
      if (!stage.running()) stage.startLoop();
    },
    pausar() {
      if (estado.fase !== 'jogando') return;
      estado.fase = 'pausado';
      ctx.ui.els.pausaModal.hidden = false;
      ctx.audio.suspender();
    },
    continuar() {
      if (estado.fase !== 'pausado') return;
      estado.fase = 'jogando';
      ctx.ui.els.pausaModal.hidden = true;
      ctx.audio.retomar();
    },
    reiniciar() {
      ctx.ui.els.pausaModal.hidden = true;
      ctx.ui.els.fimModal.hidden = true;
      ctx.ui.els.recordesModal.hidden = true;
      fluxo.comecar();
    },
    fim() {
      estado.fase = 'fim';
      ctx.audio.apito(true);
      const [a, b] = estado.placar;
      const res = a > b ? 'Vitória! 🏆' : a === b ? 'Empate 🤝' : 'Derrota 😢';
      ctx.ui.els.fimTitulo.textContent = res;
      ctx.ui.els.fimPlacar.textContent = `${dados[0].nome} ${a} × ${b} ${dados[1].nome}`;
      ctx.ui.els.pauseBtn.hidden = true;
      ctx.ui.els.controles.hidden = true;
      ctx.ui.els.fimModal.hidden = false;
      ctx.ui.anunciar(res + ' Placar ' + a + ' a ' + b + '.');
    },
  };
  ctx.fluxo = fluxo;

  bindInput(ctx, () => (estado.fase === 'jogando' ? fluxo.pausar() : estado.fase === 'pausado' ? fluxo.continuar() : undefined));

  const clic = (sel: string, fn: () => void) => document.querySelector(sel)?.addEventListener('click', fn);
  clic('[data-comecar]', () => { ctx.audio.init(); fluxo.comecar(); });
  clic('[data-continuar]', () => fluxo.continuar());
  clic('[data-recomecar]', () => fluxo.reiniciar());
  clic('[data-de-novo]', () => fluxo.reiniciar());
  clic('[data-pause]', () => fluxo.pausar());
  clic('[data-salvar]', () => ctx.ranking.abrirEntrada());
  clic('[data-recordes-btn]', () => ctx.ranking.abrirRecordes(false));
  clic('[data-ver-recordes]', () => ctx.ranking.abrirRecordes(true));
  clic('[data-recordes-fechar]', () => { ctx.ui.els.recordesModal.hidden = true; if (estado.fase === 'recordes') { estado.fase = 'inicio'; ctx.ui.els.introModal.hidden = false; } });
  clic('[data-voltar-intro]', () => { ctx.ui.els.recordesModal.hidden = true; estado.fase = 'inicio'; ctx.ui.els.introModal.hidden = false; });
  clic('[data-nome-apagar]', () => ctx.ranking.apagarLetra());
  clic('[data-nome-ok]', () => ctx.ranking.confirmarEntrada());
  document.querySelectorAll('[data-tecla-nome]').forEach((b) => b.addEventListener('click', () => ctx.ranking.digitarLetra((b as HTMLElement).dataset.teclaNome!)));

  window.addEventListener('keydown', (e) => {
    if (estado.fase !== 'entrada') return;
    if (/^[a-zA-Z]$/.test(e.key)) ctx.ranking.digitarLetra(e.key.toUpperCase());
    else if (e.key === 'Backspace') ctx.ranking.apagarLetra();
    else if (e.key === 'Enter') ctx.ranking.confirmarEntrada();
  });

  document.querySelectorAll('[data-sair]').forEach((el) => el.addEventListener('click', () => (window.location.href = '/class/games/')));
  document.addEventListener('visibilitychange', () => { if (document.hidden && estado.fase === 'jogando') fluxo.pausar(); });

  document.body.classList.add('is-game');
  stage.measure();
  stage.startLoop();

  (window as unknown as { __ft: unknown }).__ft = {
    estado, input, cfg,
    jogadores: () => ctx.mundo.jogadores,
    bola: () => ctx.mundo.bola,
    comecar: () => fluxo.comecar(),
    ativarPoderAtivo: () => { const a = estado.ativo; if (a) a.energia = cfg.poder.energiaMax; },
  };
}
