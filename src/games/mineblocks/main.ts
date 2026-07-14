// MineBlocks — orquestrador: monta o Contexto, liga os módulos, roda o
// loop rAF e rege o fluxo (inicio → gerando → jogando ⇄ pausado).
import * as THREE from 'three';
import type { Contexto, Estado, Input, Jogador } from './tipos';
import { criarUI } from './ui';
import { criarAudio } from './audio';
import { criarTextura } from './textura';
import { criarMundo } from './mundo';
import { gerarMundo } from './geracao';
import { criarMalha } from './malha';
import { criarCeu } from './ceu';
import { criarFisica } from './fisica';
import { criarCamera } from './camera';
import { criarMira } from './mira';
import { criarEdicao } from './edicao';
import { criarSalvar } from './salvar';
import { ligarInput } from './input';

export function iniciarJogo() {
  const dados = JSON.parse(document.querySelector('[data-dados]')!.textContent!);

  const estado: Estado = {
    fase: 'inicio',
    mudo: false,
    seed: 0,
    sel: 0,
    modoColocar: false,
    primeiroInput: false,
    // sobrevivência: começa de mãos vazias — quebrou, ganhou
    inventario: new Array(dados.blocos.length).fill(0),
  };
  const jogador: Jogador = {
    x: dados.config.mundo.SX / 2 + 0.5,
    y: dados.config.mundo.SY,
    z: dados.config.mundo.SZ / 2 + 0.5,
    vx: 0, vy: 0, vz: 0,
    yaw: 0, pitch: 0,
    noChao: false, naAgua: false, coyoteMs: 0,
  };
  const input: Input = {
    frente: false, tras: false, esq: false, dir: false, pulo: false,
    joyX: 0, joyY: 0,
  };

  // ----- núcleo three -----
  const cenaEl = document.querySelector('[data-cena]') as HTMLElement;
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  let tierBaixo = false;
  try {
    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const gpu = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '';
    if (/swiftshader|llvmpipe|software/i.test(String(gpu))) tierBaixo = true;
  } catch (_) { /* extensão pode não existir */ }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, tierBaixo ? 1 : 1.5));
  cenaEl.insertBefore(renderer.domElement, cenaEl.firstChild);
  const camera = new THREE.PerspectiveCamera(dados.config.camera.fov, 1, 0.1, 260);

  const ctx = {
    blocos: dados.blocos,
    hotbar: dados.hotbar,
    receitas: dados.receitas,
    cfg: dados.config,
    porId: (id: number) => dados.blocos[id],
    motionReduzido: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    scene,
    camera,
    renderer,
    cenaEl,
    tierBaixo,
    estado,
    jogador,
    input,
  } as Contexto;

  ctx.ui = criarUI(ctx);
  ctx.audio = criarAudio(ctx);
  ctx.audio.bindMute(ctx.ui.els.muteBtn, ctx.ui.els.muteIcon);
  ctx.textura = criarTextura(ctx);
  ctx.mundo = criarMundo(ctx);
  ctx.malha = criarMalha(ctx);
  const ceu = criarCeu(ctx);
  ctx.fisica = criarFisica(ctx);
  ctx.camera3 = criarCamera(ctx);
  ctx.mira = criarMira(ctx);
  ctx.edicao = criarEdicao(ctx);
  ctx.salvar = criarSalvar(ctx);

  const { ui, salvar } = ctx;
  ui.montarCraft();
  ui.montarHotbar();

  // craft simples: tocou na receita, transformou
  ui.els.craftPainel.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.receita') as HTMLElement | null;
    if (!btn) return;
    const rec = dados.receitas[+btn.dataset.receita!];
    const inv = estado.inventario;
    const de = ctx.porId(rec.de);
    const para = ctx.porId(rec.para);
    if ((inv[rec.de] || 0) < rec.qtd) {
      ui.mostrarToast('🎒 Falta material! Precisa de ' + rec.qtd + '× ' + de.nome + '.', 'info', 2000);
      ctx.audio.somErro();
      return;
    }
    inv[rec.de] -= rec.qtd;
    inv[rec.para] = Math.min(999, (inv[rec.para] || 0) + rec.ganha);
    ui.atualizarContagens();
    ctx.audio.somSalvo();
    ui.anunciar('Fabricou ' + rec.ganha + ' ' + para.nome + '!');
    salvar.agendar();
  });
  ui.els.craftBtn.addEventListener('click', () => {
    ui.alternarCraft();
    ctx.audio.somUI();
  });

  // ----- medir/resize -----
  function medir() {
    const w = cenaEl.clientWidth || 1;
    const h = cenaEl.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (!rafId) renderer.render(scene, camera);
  }
  window.addEventListener('resize', medir);
  renderer.domElement.addEventListener('webglcontextrestored', () => medir());
  renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    if (estado.fase === 'jogando') fluxo.pausar();
  });

  // ----- loop -----
  let rafId = 0;
  let ultimoTs = 0;
  let dtMedio = 16;
  let degrade = 0;

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

  function loop(ts: number) {
    rafId = requestAnimationFrame(loop);
    if (!ultimoTs) { ultimoTs = ts; return; }
    const dtMs = ts - ultimoTs;
    ultimoTs = ts;
    const dt = Math.min(dtMs / 1000, 0.05);
    if (estado.fase !== 'jogando') return;

    // auto-degrade: SwiftShader é fill-rate — resolução é a alavanca
    dtMedio = dtMedio * 0.95 + dtMs * 0.05;
    if (dtMedio > 45 && degrade < 2) {
      degrade++;
      dtMedio = 16;
      const alvo = tierBaixo ? (degrade === 1 ? 0.75 : 0.55) : degrade === 1 ? 0.85 : 0.7;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, alvo));
      medir();
    }

    ctx.fisica.passo(dt);
    ctx.camera3.passo();
    ctx.mira.passo();
    ceu.passo(dt);
    ctx.malha.reconstruirSujos();
    renderer.render(scene, camera);
  }

  // ----- fluxo -----
  const fluxo = {
    entrarNoMundo() {
      estado.fase = 'jogando';
      ui.els.inicioModal.hidden = true;
      ui.els.overlayGerando.hidden = true;
      ui.els.pausaModal.hidden = true;
      ui.els.hotbar.hidden = false;
      ui.els.reticula.hidden = false;
      ui.els.pauseBtn.hidden = false;
      ui.els.craftBtn.hidden = false;
      ui.els.fantasma.hidden = false;
      ui.els.nomeMundoHud.textContent = '🌍 ' + salvar.nomeMundo();
      ui.atualizarContagens();
      ui.selecionarSlot(estado.sel, false);
      estado.modoColocar = false;
      ui.atualizarModo();
      ctx.audio.retomar();
      medir();
      retomarLoop();
      ui.anunciar('Bem-vindo ao seu mundo! Ande com as setas ou W A S D, pule com espaço, clique pra quebrar blocos.');
    },
    pausar() {
      if (estado.fase !== 'jogando') return;
      estado.fase = 'pausado';
      ui.alternarCraft(false);
      fluxo.soltarInputs();
      inputRefs.soltarLock();
      pararLoop();
      renderer.render(scene, camera);
      ui.els.pausaModal.hidden = false;
      salvar.salvarAgora('auto');
      setTimeout(() => (document.querySelector('[data-continuar]') as HTMLElement).focus(), 60);
      ui.anunciar('Jogo pausado.');
    },
    continuarJogo() {
      if (estado.fase !== 'pausado') return;
      ui.els.pausaModal.hidden = true;
      estado.fase = 'jogando';
      medir();
      retomarLoop();
      // no desktop, o clique em Continuar é gesto válido pra re-travar o
      // mouse (pode rejeitar no cooldown pós-ESC do Chrome — aí a criança
      // clica na tela e trava de novo)
      if (!inputRefs.emModoTouch()) inputRefs.pedirLock();
    },
    async sairDoMundo() {
      await salvar.salvarAgora('manual');
      window.location.href = '/class/games/';
    },
    medir,
    soltarInputs() {
      input.frente = input.tras = input.esq = input.dir = input.pulo = false;
      input.joyX = input.joyY = 0;
      inputRefs.soltarTouch();
    },
    aoPrimeiroInput() {
      if (estado.primeiroInput) return;
      estado.primeiroInput = true;
      ui.els.fantasma.hidden = true;
    },
  };
  ctx.fluxo = fluxo as Contexto['fluxo'];
  const inputRefs = ligarInput(ctx);

  // ----- gerar/carregar mundo -----
  function gerarEntrar(seed: number, carregado: boolean) {
    estado.fase = 'gerando';
    ui.els.inicioModal.hidden = true;
    ui.els.overlayGerando.hidden = false;
    // deixa o overlay pintar antes do trabalho pesado síncrono
    requestAnimationFrame(() => setTimeout(() => {
      estado.seed = seed;
      if (!carregado) {
        gerarMundo(ctx, seed);
        jogador.x = ctx.cfg.mundo.SX / 2 + 0.5;
        jogador.z = ctx.cfg.mundo.SZ / 2 + 0.5;
        jogador.yaw = Math.PI * 0.75;
        jogador.pitch = 0;
      }
      ctx.malha.construirTudo();
      if (!carregado) ctx.fisica.assentar();
      fluxo.entrarNoMundo();
      if (!carregado) salvar.salvarAgora('auto'); // mundo novo já nasce salvo
    }, 30));
  }

  // ----- forms do modal inicial -----
  function lerForm(form: HTMLElement): { nome: string; senha: string } | null {
    const nome = (form.querySelector('[data-campo-nome]') as HTMLInputElement).value
      .toLowerCase().trim().replace(/\s+/g, '-');
    const senha = (form.querySelector('[data-campo-senha]') as HTMLInputElement).value.trim();
    if (!/^[a-z0-9-]{3,16}$/.test(nome)) {
      mostrarErroInicio('O nome do mundo precisa ter de 3 a 16 letras ou números (sem acento).');
      return null;
    }
    if (senha.length < 4 || senha.length > 20) {
      mostrarErroInicio('A senha precisa ter pelo menos 4 letrinhas ou números.');
      return null;
    }
    return { nome, senha };
  }
  function mostrarErroInicio(msg: string) {
    ui.els.erroInicio.textContent = msg;
    ui.els.erroInicio.hidden = false;
    ctx.audio.somErro();
  }
  function travarForms(travar: boolean) {
    document.querySelectorAll('[data-form-novo] button, [data-form-carregar] button').forEach((b) => {
      (b as HTMLButtonElement).disabled = travar;
    });
  }

  ui.els.formNovo.addEventListener('submit', async (e) => {
    e.preventDefault();
    ui.els.erroInicio.hidden = true;
    const cred = lerForm(ui.els.formNovo);
    if (!cred) return;
    ctx.audio.retomar();
    travarForms(true);
    const erro = await salvar.criarMundo(cred.nome, cred.senha);
    travarForms(false);
    if (erro) return mostrarErroInicio(erro);
    gerarEntrar((Math.random() * 4294967296) >>> 0, false);
  });

  ui.els.formCarregar.addEventListener('submit', async (e) => {
    e.preventDefault();
    ui.els.erroInicio.hidden = true;
    const cred = lerForm(ui.els.formCarregar);
    if (!cred) return;
    ctx.audio.retomar();
    travarForms(true);
    const erro = await salvar.carregarMundo(cred.nome, cred.senha);
    travarForms(false);
    // mundo criado mas nunca salvo (fechou a aba cedo demais): a mesma
    // credencial ganha um mundo novinho em vez de virar nome morto
    if (erro === '__NOVO__') return gerarEntrar((Math.random() * 4294967296) >>> 0, false);
    if (erro) return mostrarErroInicio(erro);
    gerarEntrar(estado.seed, true);
  });

  // abas do modal inicial (novo × carregar)
  document.querySelectorAll<HTMLElement>('[data-aba]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const alvo = btn.dataset.aba!;
      document.querySelectorAll<HTMLElement>('[data-aba]').forEach((b) => b.classList.toggle('ativa', b === btn));
      ui.els.formNovo.hidden = alvo !== 'novo';
      ui.els.formCarregar.hidden = alvo !== 'carregar';
      ui.els.erroInicio.hidden = true;
    });
  });

  // ----- bindings de fluxo -----
  ui.els.pauseBtn.addEventListener('click', () => fluxo.pausar());
  (document.querySelector('[data-continuar]') as HTMLElement).addEventListener('click', () => fluxo.continuarJogo());
  (document.querySelector('[data-salvar-agora]') as HTMLElement).addEventListener('click', () => salvar.salvarAgora('manual'));
  (document.querySelector('[data-sair]') as HTMLElement).addEventListener('click', () => fluxo.sairDoMundo());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (estado.fase === 'jogando') fluxo.pausar();
      if (salvar.temMundo() && salvar.sujo()) salvar.salvarAgora('flush');
    }
  });
  window.addEventListener('pagehide', () => {
    if (salvar.temMundo() && salvar.sujo()) salvar.salvarAgora('flush');
  });

  // ----- boot -----
  document.body.classList.add('is-game');
  medir();
  renderer.render(scene, camera);
  setTimeout(() => (document.querySelector('[data-campo-nome]') as HTMLElement)?.focus(), 60);

  // handle de teste/depuração (Playwright dirige por aqui)
  (window as any).__mc = {
    jogador, estado, input,
    receitas: dados.receitas,
    fabricar: (i: number) => (ui.els.craftPainel.querySelectorAll('.receita')[i] as HTMLElement)?.click(),
    obter: ctx.mundo.obter,
    definir: ctx.mundo.definir,
    quebrar: () => ctx.edicao.quebrar(),
    colocar: () => ctx.edicao.colocar(),
    alvo: () => ctx.mira.alvo(),
    selecionar: (i: number) => ctx.ui.selecionarSlot(i, false),
    salvarAgora: () => salvar.salvarAgora('manual'),
    renderer, camera, scene,
    render: () => renderer.render(scene, camera),
  };
}
