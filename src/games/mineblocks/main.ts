// MineBlocks — orquestrador: monta o Contexto, liga os módulos, roda o
// loop rAF e rege o fluxo (inicio → gerando → jogando ⇄ pausado).
import * as THREE from 'three';
import type { Contexto, Estado, Input, Jogador } from './tipos';
import { criarUI } from './ui';
import { criarAudio } from './audio';
import { criarTextura } from './textura';
import { criarMundo } from './mundo';
import { criarMetas } from './meta';
import { gerarMundo } from './geracao';
import { criarMalha } from './malha';
import { criarCeu } from './ceu';
import { criarMob } from './mob';
import { criarFisica } from './fisica';
import { criarCamera } from './camera';
import { criarMira } from './mira';
import { criarEdicao } from './edicao';
import { criarSalvar } from './salvar';
import { criarSync } from './sync';
import { criarBonecos } from './boneco';
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
    // hotbar Minecraft: 9 espaços vazios que enchem coletando
    hotbarSlots: new Array(dados.config.hotbarTamanho).fill(0),
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
    golpe: false,
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
    itens: dados.itens,
    materiais: dados.materiais,
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
  ctx.metas = criarMetas(ctx);
  ctx.malha = criarMalha(ctx);
  ctx.ceu = criarCeu(ctx);
  ctx.mob = criarMob(ctx);
  ctx.fisica = criarFisica(ctx);
  ctx.camera3 = criarCamera(ctx);
  ctx.mira = criarMira(ctx);
  ctx.edicao = criarEdicao(ctx);
  ctx.salvar = criarSalvar(ctx);
  ctx.bonecos = criarBonecos(ctx);
  ctx.sync = criarSync(ctx);

  const { ui, salvar, sync } = ctx;
  ui.montarCraft();
  ui.montarInventario();
  ui.montarHotbar();

  // craft simples: tocou na receita, transformou
  function nearFurnace(): boolean {
    const px = Math.floor(jogador.x);
    const py = Math.floor(jogador.y);
    const pz = Math.floor(jogador.z);
    for (let dy = -3; dy <= 3; dy++) {
      for (let dz = -4; dz <= 4; dz++) {
        for (let dx = -4; dx <= 4; dx++) {
          if (ctx.mundo.obter(px + dx, py + dy, pz + dz) === 27) return true;
        }
      }
    }
    return false;
  }

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
    if (rec.de2 && (inv[rec.de2] || 0) < (rec.qtd2 || 1)) {
      ui.mostrarToast('🎒 Falta material! Precisa de ' + (rec.qtd2 || 1) + '× ' + ctx.porId(rec.de2).nome + ' também.', 'info', 2000);
      ctx.audio.somErro();
      return;
    }
    if (rec.fornalha && !nearFurnace()) {
      ui.mostrarToast('🔥 Essa receita precisa de fogo! Fique perto de uma fornalha (8 pedregulhos no craft).', 'info', 2600);
      ctx.audio.somErro();
      return;
    }
    inv[rec.de] -= rec.qtd;
    if (rec.de2) inv[rec.de2] -= rec.qtd2 || 1;
    inv[rec.para] = Math.min(999, (inv[rec.para] || 0) + rec.ganha);
    ctx.edicao.registrarItemNaHotbar(rec.para); // fabricou algo novo → hotbar
    ui.atualizarContagens();
    ctx.audio.somSalvo();
    ui.anunciar('Fabricou ' + rec.ganha + ' ' + para.nome + '!');
    salvar.agendar();
  });
  ui.els.craftBtn.addEventListener('click', () => inputRefs.alternarInventario());
  (document.querySelector('[data-inv-fechar]') as HTMLElement).addEventListener('click', () => inputRefs.alternarInventario());

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
    // golpe/mudas/decay usam relógio QUASE-real (clamp frouxo): a física
    // precisa do clamp apertado, mas quebrar 2× mais devagar num
    // Chromebook de 10fps seria injusto justo com a máquina mais fraca
    const dtReal = Math.min(dtMs / 1000, 0.25);
    // em sala, SÓ o anfitrião simula mudas/decay — Math.random em duas
    // máquinas divergiria o mundo; o resultado chega como edição remota
    // (o relógio anda pra todo mundo: o toc-toc do golpe depende dele)
    ctx.edicao.passo(dtReal, !sync.emSala() || sync.souAnfitriao());
    if (input.golpe) ctx.edicao.golpear(dtReal);
    else if (ctx.edicao.golpeando()) ctx.edicao.soltarGolpe();
    ctx.bonecos.passo(dt); // colegas da sala perseguem o alvo do poll
    ctx.camera3.passo();
    ctx.mira.passo();
    ctx.ceu.passo(dt);
    ctx.mob.passo(dt, !sync.emSala() || sync.souAnfitriao());
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
      ui.els.nomeMundoHud.textContent = salvar.temMundo()
        ? '🌍 ' + salvar.codigoMundo()
        : sync.emVisita() ? '🌍 ' + sync.codigoSala() : '🎲 mundo de brincadeira';
      if (!salvar.temMundo() && !sync.emVisita()) {
        ui.mostrarToast('🎲 Mundo de brincadeira (sem internet) — ele some quando você sai!', 'info', 3400);
      }
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
      const visita = sync.emVisita();
      const guest = !salvar.temMundo();
      ui.els.salvarAgoraBtn.hidden = guest || visita;
      ui.els.sairBtn.textContent = visita ? '🚪 Sair do mundo' : guest ? '🚪 Sair sem salvar' : '🚪 Salvar e sair';
      ui.els.pausaAviso.textContent = visita
        ? 'Vocês estão construindo juntos — o mundo se salva sozinho!'
        : guest
          ? 'Esse mundo de brincadeira some quando você sai (sem internet, sem código).'
          : 'Relaxa: o mundo se salva sozinho de tempos em tempos. 😉';
      atualizarSalaPausa();
      ui.els.pausaModal.hidden = false;
      salvar.salvarAgora('auto');
      setTimeout(() => (document.querySelector('[data-continuar]') as HTMLElement).focus(), 60);
      ui.anunciar('Jogo pausado.');
    },
    continuarJogo() {
      if (estado.fase !== 'pausado') return;
      ui.els.pausaModal.hidden = true;
      ui.els.inicioModal.hidden = true;
      estado.fase = 'jogando';
      medir();
      retomarLoop();
      // no desktop, o clique em Continuar é gesto válido pra re-travar o
      // mouse (pode rejeitar no cooldown pós-ESC do Chrome — aí a criança
      // clica na tela e trava de novo)
      if (!inputRefs.emModoTouch()) inputRefs.pedirLock();
    },
    async sairDoMundo() {
      const okSave = await salvar.salvarAgora('manual');
      // "Salvar e sair" não pode sair SEM salvar em silêncio (wifi caiu)
      if (!okSave && salvar.sujo()) {
        const sairAssim = window.confirm(
          'Não consegui salvar agora (sem internet?).\n\nOK = sair mesmo assim (perde o que fez desde o último save)\nCancelar = continuar jogando e tentar de novo'
        );
        if (!sairAssim) return; // ficou — e continua na sala também
      }
      sync.sairDaSala(); // só sai da sala quando a saída é pra valer
      window.location.href = '/class/games/';
    },
    medir,
    soltarInputs() {
      input.frente = input.tras = input.esq = input.dir = input.pulo = false;
      input.golpe = false;
      input.joyX = input.joyY = 0;
      ctx.edicao.soltarGolpe();
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

  const NOME_KEY = 'mineblocks:nome';
  function nomeGuardado(): string {
    try { return localStorage.getItem(NOME_KEY) || ''; } catch { return ''; }
  }
  function guardarNome(n: string) {
    try { localStorage.setItem(NOME_KEY, n); } catch { }
  }

  function nomeJogadorLimpo(bruto: string): string {
    return bruto
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, ctx.cfg.sala.nomeMax);
  }
  function codigoLimpo(bruto: string): string {
    const re = new RegExp('[^' + ctx.cfg.codigo.charset + ']', 'g');
    return bruto.toUpperCase().replace(re, '').slice(0, ctx.cfg.codigo.tam);
  }
  function filtrarAoDigitar(el: HTMLInputElement, fn: (s: string) => string) {
    el.addEventListener('input', () => {
      const limpo = fn(el.value);
      if (el.value !== limpo) el.value = limpo;
    });
  }
  function ligarSanitizacao() {
    filtrarAoDigitar(document.querySelector('[data-campo-apelido]') as HTMLInputElement, nomeJogadorLimpo);
    filtrarAoDigitar(document.querySelector('[data-campo-codigo]') as HTMLInputElement, codigoLimpo);
  }

  function atualizarSalaPausa() {
    const codigo = salvar.temMundo() ? salvar.codigoMundo() : sync.codigoSala();
    ui.els.salaInfo.hidden = !codigo;
    if (codigo) ui.els.salaCodigo.textContent = codigo;
  }

  // visita: mundo do amigo chega como foto (snapshot) + edições por poll
  function entrarVisita() {
    estado.fase = 'gerando';
    ui.els.inicioModal.hidden = true;
    ui.els.overlayGerando.hidden = false;
    requestAnimationFrame(() => setTimeout(() => {
      if (!sync.aplicarFotoInicial()) {
        estado.fase = 'inicio';
        ui.els.overlayGerando.hidden = true;
        ui.els.inicioModal.hidden = false;
        mostrarErroInicio('O mundo do amigo veio quebrado — tenta entrar de novo?');
        return;
      }
      // visita começa de mãos vazias (o inventário é de cada um)
      estado.inventario.fill(0);
      estado.hotbarSlots.fill(0);
      estado.sel = 0;
      jogador.x = ctx.cfg.mundo.SX / 2 + 0.5;
      jogador.z = ctx.cfg.mundo.SZ / 2 + 0.5;
      jogador.yaw = Math.PI * 0.75;
      jogador.pitch = 0;
      ctx.malha.construirTudo();
      ctx.mob.nascer(estado.seed); // Winpups locais; posições vêm da rede (d.bichos)
      ctx.fisica.assentar();
      fluxo.entrarNoMundo();
      sync.ligarPoll();
    }, 30));
  }

  function gerarEntrar(seed: number, carregado: boolean, aoPronto?: () => void) {
    estado.fase = 'gerando';
    ui.els.inicioModal.hidden = true;
    ui.els.overlayGerando.hidden = false;
    // deixa o overlay pintar antes do trabalho pesado síncrono
    requestAnimationFrame(() => setTimeout(() => {
      estado.seed = seed;
      if (!carregado) {
        estado.inventario.fill(0);
        estado.hotbarSlots.fill(0);
        ctx.metas.limpar(); // mundo novo não herda baús/placas do anterior
        gerarMundo(ctx, seed);
        jogador.x = ctx.cfg.mundo.SX / 2 + 0.5;
        jogador.z = ctx.cfg.mundo.SZ / 2 + 0.5;
        jogador.yaw = Math.PI * 0.75;
        jogador.pitch = 0;
        ctx.ceu.definirTempo(120); // mundo novo começa de manhã
      }
      ctx.malha.construirTudo();
      ctx.edicao.iniciarMudas(); // mudas do save voltam pro relógio
      ctx.mob.nascer(seed); // Winpups nascem da seed (transiente, não salva)
      if (!carregado) ctx.fisica.assentar();
      fluxo.entrarNoMundo();
      if (!carregado) salvar.salvarAgora('auto'); // mundo novo já nasce salvo
      if (aoPronto) aoPronto();
    }, 30));
  }

  function mostrarErroInicio(msg: string) {
    ui.els.erroInicio.textContent = msg;
    ui.els.erroInicio.hidden = false;
    ctx.audio.somErro();
  }
  function travarForms(travar: boolean) {
    document.querySelectorAll('[data-form-jogar] button, [data-form-entrar] button').forEach((b) => {
      (b as HTMLButtonElement).disabled = travar;
    });
  }
  function lerNome(): string | null {
    const nome = nomeJogadorLimpo((document.querySelector('[data-campo-apelido]') as HTMLInputElement).value);
    if (nome.length < ctx.cfg.sala.nomeMin) {
      mostrarErroInicio('Escreve teu nome primeiro (só letras e números, sem espaço)!');
      return null;
    }
    guardarNome(nome);
    return nome;
  }
  async function abrirSalaDoMundo(nome: string) {
    if (!salvar.temMundo()) return;
    await sync.criarSala(nome, salvar.codigoMundo());
    atualizarSalaPausa();
  }

  ui.els.formJogar.addEventListener('submit', async (e) => {
    e.preventDefault();
    ui.els.erroInicio.hidden = true;
    const nome = lerNome();
    if (!nome) return;
    ctx.audio.retomar();
    travarForms(true);
    const erro = await salvar.criarMundo();
    travarForms(false);
    gerarEntrar((Math.random() * 4294967296) >>> 0, false, () => {
      if (erro) return;
      ui.mostrarToast('🌍 Seu mundo é <b>' + salvar.codigoMundo() + '</b> — anote pra voltar!', 'ok', 6000);
      ui.anunciar('Seu mundo tem o código ' + salvar.codigoMundo().split('').join(' ') + '. Anote pra voltar!');
      abrirSalaDoMundo(nome);
    });
  });

  ui.els.formEntrar.addEventListener('submit', async (e) => {
    e.preventDefault();
    ui.els.erroInicio.hidden = true;
    const codigo = codigoLimpo((document.querySelector('[data-campo-codigo]') as HTMLInputElement).value);
    if (codigo.length !== ctx.cfg.codigo.tam) {
      return mostrarErroInicio('O código do mundo tem ' + ctx.cfg.codigo.tam + ' letrinhas — pede pro teu amigo conferir!');
    }
    const nome = lerNome();
    if (!nome) return;
    ctx.audio.retomar();
    travarForms(true);
    const erroSala = await sync.entrarSala(codigo, nome);
    if (!erroSala) {
      travarForms(false);
      entrarVisita();
      return;
    }
    const erroMundo = await salvar.carregarMundo(codigo);
    travarForms(false);
    if (erroMundo === '__NOVO__') {
      return gerarEntrar((Math.random() * 4294967296) >>> 0, false, () => abrirSalaDoMundo(nome));
    }
    if (erroMundo) return mostrarErroInicio(erroMundo);
    gerarEntrar(estado.seed, true, () => abrirSalaDoMundo(nome));
  });

  // ----- bindings de fluxo -----
  ui.els.pauseBtn.addEventListener('click', () => fluxo.pausar());
  (document.querySelector('[data-continuar]') as HTMLElement).addEventListener('click', () => fluxo.continuarJogo());
  (document.querySelector('[data-salvar-agora]') as HTMLElement).addEventListener('click', () => salvar.salvarAgora('manual'));
  (document.querySelector('[data-sair]') as HTMLElement).addEventListener('click', () => {
    // visita: nada a salvar — o mundo fica com o dono
    if (sync.emVisita()) {
      const vai = window.confirm('Sair da visita? O mundo continua com o seu amigo — você pode voltar com o mesmo código.');
      if (!vai) return;
      sync.sairDaSala();
      window.location.href = '/class/games/';
      return;
    }
    // mundo aleatório: saída é perda — pergunta antes
    if (!salvar.temMundo()) {
      const vai = window.confirm('Esse mundo de brincadeira NÃO está salvo — saindo, ele some pra sempre.\n\nOK = sair mesmo assim\nCancelar = voltar');
      if (!vai) return;
      sync.sairDaSala();
      window.location.href = '/class/games/';
      return;
    }
    fluxo.sairDoMundo(); // ele decide se sai mesmo — e só então deixa a sala
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (estado.fase === 'jogando') fluxo.pausar();
      if (salvar.temMundo() && salvar.sujo()) salvar.salvarAgora('flush');
    }
  });
  window.addEventListener('pagehide', () => {
    if (salvar.temMundo() && salvar.sujo()) salvar.salvarAgora('flush');
    sync.flushSair(); // avisa a sala que saiu (senão o boneco fica 2min parado)
  });
  // mundo aleatório em jogo: F5/fechar aba pergunta antes de jogar tudo fora
  // (visita não: o mundo fica guardado com o amigo, fechar não perde nada)
  window.addEventListener('beforeunload', (e) => {
    if (!salvar.temMundo() && !sync.emVisita() && estado.fase !== 'inicio' && estado.primeiroInput) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // ----- boot -----
  ligarSanitizacao();
  document.body.classList.add('is-game');
  medir();
  renderer.render(scene, camera);
  const campoApelido = document.querySelector('[data-campo-apelido]') as HTMLInputElement;
  campoApelido.value = nomeGuardado();
  setTimeout(() => campoApelido.focus(), 60);

  // handle de teste/depuração (Playwright dirige por aqui)
  (window as any).__mc = {
    jogador, estado, input,
    receitas: dados.receitas,
    fabricar: (i: number) => (ui.els.craftPainel.querySelectorAll('.receita')[i] as HTMLElement)?.click(),
    crescerMudas: () => ctx.edicao.crescerMudasAgora(),
    iniciarMudas: () => ctx.edicao.iniciarMudas(),
    decairAgora: () => ctx.edicao.decairAgora(),
    porNoSlot: (i: number, id: number) => { estado.hotbarSlots[i] = id; ctx.ui.atualizarContagens(); },
    obter: ctx.mundo.obter,
    definir: ctx.mundo.definir,
    quebrar: () => ctx.edicao.quebrar(),
    colocar: () => ctx.edicao.colocar(),
    alvo: () => ctx.mira.alvo(),
    selecionar: (i: number) => ctx.ui.selecionarSlot(i, false),
    salvarAgora: () => salvar.salvarAgora('manual'),
    salvar,
    sync,
    bonecos: ctx.bonecos,
    metas: ctx.metas,
    ceu: ctx.ceu,
    mob: ctx.mob,
    ui: ctx.ui,
    // teste: interage/quebra numa célula exata sem depender da mira
    // (retorna o boolean do interagir: true = colocou bloco)
    usar: (x: number, y: number, z: number) =>
      ctx.edicao.interagir({ x, y, z, nx: 0, ny: 1, nz: 0, id: ctx.mundo.obter(x, y, z) }),
    quebrarEm: (x: number, y: number, z: number) =>
      ctx.edicao.quebrar({ x, y, z, nx: 0, ny: 1, nz: 0, id: ctx.mundo.obter(x, y, z) }),
    // coloca mirando a célula (x,y,z) com normal (nx,ny,nz): a colocação
    // cai em (x+nx, y+ny, z+nz) pra bloco sólido, ou no lugar se cruz
    colocarEm: (x: number, y: number, z: number, nx: number, ny: number, nz: number) =>
      ctx.edicao.colocar({ x, y, z, nx, ny, nz, id: ctx.mundo.obter(x, y, z) }),
    renderer, camera, scene,
    render: () => renderer.render(scene, camera),
  };
}
