import type { Contexto, Estado, Input, Jogador } from './tipos';
import { criarSprites } from './sprites';
import { criarOverworld } from './overworld';
import { criarRede } from './rede';
import { criarUI } from './ui';
import { criarAudio } from './audio';
import { criarSalvar } from './salvar';
import { cleanPlayerName } from '../../lib/player-name';

export function iniciarJogo() {
  const dados = JSON.parse(document.querySelector('[data-dados]')!.textContent!);

  const estado: Estado = { fase: 'intro', nome: '', starter: 'dog', mapa: 'vila', mudo: false, online: 1 };
  const jogador: Jogador = { x: dados.config.spawn.x, y: dados.config.spawn.y, px: dados.config.spawn.x, py: dados.config.spawn.y, dir: 0, andando: false, progresso: 0, trilha: [] };
  const input: Input = { dx: 0, dy: 0, a: false };

  const canvas = document.querySelector('[data-canvas]') as HTMLCanvasElement;
  canvas.width = dados.config.viewW;
  canvas.height = dados.config.viewH;
  const g = canvas.getContext('2d')!;
  g.imageSmoothingEnabled = false;

  const ctx = {
    cfg: dados.config,
    especies: dados.especies,
    mapas: dados.mapas,
    tiles: dados.tiles,
    motionReduzido: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    canvas,
    g,
    estado,
    jogador,
    input,
    sprites: criarSprites(),
  } as Contexto;

  ctx.ui = criarUI(ctx);
  ctx.audio = criarAudio(ctx);
  ctx.audio.bindMute(ctx.ui.els.muteBtn, ctx.ui.els.muteIcon);
  ctx.salvar = criarSalvar(ctx);
  ctx.overworld = criarOverworld(ctx);
  ctx.rede = criarRede(ctx);
  const { ui, audio, salvar, overworld, rede } = ctx;

  let ultimoTs = 0;
  let salvarTimer = 0;

  function loop(ts: number) {
    requestAnimationFrame(loop);
    if (!ultimoTs) { ultimoTs = ts; return; }
    const dt = Math.min((ts - ultimoTs) / 1000, 0.05);
    ultimoTs = ts;
    if (estado.fase === 'intro') return;
    if (estado.fase === 'jogando') overworld.passo(dt);
    ui.passoDialogo(ts);
    overworld.desenhar(ts);
    if (ts - salvarTimer > 5000) {
      salvarTimer = ts;
      salvar.gravar();
    }
  }

  function nomeLimpo(bruto: string): string {
    return cleanPlayerName(bruto, ctx.cfg.nomeMax);
  }

  async function comecar(nome: string, starter: 'dog' | 'cat', mapa: string, x: number, y: number) {
    estado.nome = nome;
    estado.starter = starter;
    estado.mapa = ctx.mapas[mapa] ? mapa : 'vila';
    jogador.x = x;
    jogador.y = y;
    jogador.px = x;
    jogador.py = y;
    if (overworld.solido(x, y)) {
      jogador.x = ctx.cfg.spawn.x;
      jogador.y = ctx.cfg.spawn.y;
      jogador.px = jogador.x;
      jogador.py = jogador.y;
    }
    estado.fase = 'jogando';
    ui.els.introModal.hidden = true;
    ui.els.controles.hidden = false;
    salvar.gravar();
    ui.atualizarOnline(1);
    const erro = await rede.entrar(nome, starter);
    if (erro) ui.mostrarToast('📡 Sem internet — você está explorando sozinho.', 3200);
    ui.anunciar('Bem-vindo à vila! Ande com as setas e fale com as pessoas com Z.');
  }

  const campoNome = ui.els.campoNome as HTMLInputElement;
  campoNome.value = salvar.nomeGuardado();
  campoNome.addEventListener('input', () => {
    const limpo = nomeLimpo(campoNome.value);
    if (campoNome.value !== limpo) campoNome.value = limpo;
  });

  let starterEscolhido: 'dog' | 'cat' | null = null;
  document.querySelectorAll<HTMLElement>('[data-starter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      starterEscolhido = btn.dataset.starter as 'dog' | 'cat';
      document.querySelectorAll('[data-starter]').forEach((b) => b.classList.toggle('sel', b === btn));
      audio.retomar();
      audio.somConfirma();
    });
  });
  document.querySelectorAll<HTMLElement>('[data-retrato]').forEach((el) => {
    const sp = ctx.sprites['retrato' + el.dataset.retrato!] as HTMLCanvasElement;
    el.appendChild(sp);
  });

  ui.els.formIntro.addEventListener('submit', (e) => {
    e.preventDefault();
    ui.els.erroIntro.hidden = true;
    const nome = nomeLimpo(campoNome.value);
    if (nome.length < ctx.cfg.nomeMin) {
      ui.els.erroIntro.textContent = 'Escreve teu nome primeiro (só letras e números)!';
      ui.els.erroIntro.hidden = false;
      audio.somBlip();
      return;
    }
    if (!starterEscolhido) {
      ui.els.erroIntro.textContent = 'Escolhe teu bichinho: DOG ou CAT!';
      ui.els.erroIntro.hidden = false;
      audio.somBlip();
      return;
    }
    audio.retomar();
    audio.jingleEscolha();
    comecar(nome, starterEscolhido, 'vila', ctx.cfg.spawn.x, ctx.cfg.spawn.y);
  });

  function apertouA() {
    if (estado.fase === 'dialogo') {
      audio.somBlip();
      ui.avancarDialogo();
    } else if (estado.fase === 'jogando') {
      overworld.interagir();
    }
  }

  const TECLAS: Record<string, [number, number]> = {
    ArrowUp: [0, -1], w: [0, -1], W: [0, -1],
    ArrowDown: [0, 1], s: [0, 1], S: [0, 1],
    ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0],
    ArrowRight: [1, 0], d: [1, 0], D: [1, 0],
  };
  const teclasAtivas = new Set<string>();

  function recalcularInput() {
    input.dx = 0;
    input.dy = 0;
    for (const t of teclasAtivas) {
      const v = TECLAS[t];
      if (v) { input.dx = v[0]; input.dy = v[1]; }
    }
  }

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (estado.fase === 'intro') return;
    if (e.key === 'z' || e.key === 'Z' || e.key === 'Enter') {
      e.preventDefault();
      apertouA();
      return;
    }
    if (TECLAS[e.key]) {
      e.preventDefault();
      teclasAtivas.add(e.key);
      recalcularInput();
    }
  });
  window.addEventListener('keyup', (e: KeyboardEvent) => {
    teclasAtivas.delete(e.key);
    recalcularInput();
  });
  window.addEventListener('blur', () => {
    teclasAtivas.clear();
    recalcularInput();
  });

  document.querySelectorAll<HTMLElement>('[data-dpad]').forEach((btn) => {
    const [dx, dy] = btn.dataset.dpad!.split(',').map(Number);
    const liga = (e: PointerEvent) => {
      e.preventDefault();
      btn.setPointerCapture && btn.setPointerCapture(e.pointerId);
      input.dx = dx;
      input.dy = dy;
      btn.classList.add('on');
    };
    const desliga = () => {
      if (input.dx === dx && input.dy === dy) { input.dx = 0; input.dy = 0; }
      btn.classList.remove('on');
    };
    btn.addEventListener('pointerdown', liga);
    btn.addEventListener('pointerup', desliga);
    btn.addEventListener('pointercancel', desliga);
    btn.addEventListener('lostpointercapture', desliga);
  });
  (document.querySelector('[data-botao-a]') as HTMLElement).addEventListener('pointerdown', (e) => {
    e.preventDefault();
    apertouA();
  });

  window.addEventListener('pagehide', () => {
    salvar.gravar();
    rede.flushSair();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) salvar.gravar();
  });

  document.body.classList.add('is-game');
  requestAnimationFrame(loop);

  const salvo = salvar.carregar();
  if (salvo) {
    comecar(salvo.nome, salvo.starter, salvo.mapa, salvo.x, salvo.y);
  } else {
    setTimeout(() => campoNome.focus(), 60);
  }

  (window as any).__wm = {
    estado, jogador, input,
    rede,
    overworld,
    salvar,
    interagir: () => overworld.interagir(),
    avancar: () => ui.avancarDialogo(),
    dialogoAberto: () => ui.dialogoAberto(),
  };
}
