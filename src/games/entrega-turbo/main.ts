// Entrega Turbo — orquestrador: monta o Contexto, liga os módulos,
// roda o loop rAF e cuida do fluxo (começar/pausar/fim/reiniciar).
// Cada sistema vive no seu módulo; este arquivo só rege a banda.
import * as THREE from 'three';
import type { Contexto, Estado, Input, Modo, Truck } from './tipos';
import { criarAudio } from './audio';
import { criarUI } from './ui';
import { criarMundo } from './mundo';
import { criarCaminhao } from './caminhao';
import { criarFisica } from './fisica';
import { criarCamera } from './camera';
import { criarGuia } from './guia';
import { criarPedidos } from './pedidos';
import { criarRanking } from './ranking';
import { ligarInput } from './input';

export function iniciarJogo() {
  // ----- dados serializados pela página -----
  const dados = JSON.parse(document.querySelector('[data-dados]')!.textContent!);

  const estado: Estado = {
    fase: 'inicio',
    modo: null,
    pontos: 0,
    nivel: 1,
    vidas: 0,
    pedidosCompletos: 0,
    entregasTotais: 0,
    pedido: null,
    mudo: false,
    primeiroInput: false,
    longeDesdeMs: 0,
  };
  const truck: Truck = { x: 0, z: 14, heading: 0, v: 0, ultimaBatidaMs: 0, squashAte: 0 };
  const input: Input = { esq: false, dir: false, acel: false, re: false };

  // ----- núcleo three -----
  const cenaEl = document.querySelector('[data-cena]') as HTMLElement;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x79c4e8);
  scene.fog = new THREE.Fog(0x79c4e8, 60, 120);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 130);
  camera.position.set(0, 30, 40);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  let tierBaixo = false;
  try {
    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const gpu = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '';
    if (/swiftshader|llvmpipe|software/i.test(String(gpu))) tierBaixo = true;
  } catch (_) { /* extensão pode não existir */ }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, tierBaixo ? 1 : 1.5));
  cenaEl.insertBefore(renderer.domElement, cenaEl.firstChild);

  scene.add(new THREE.HemisphereLight(0xdfefff, 0x8a9a6a, 1.05));
  const sol = new THREE.DirectionalLight(0xfff2d5, 1.2);
  sol.position.set(40, 60, 25);
  scene.add(sol);

  // ----- contexto: preenchido na ordem de dependência -----
  const ctx = {
    mapa: dados.mapa,
    destinos: dados.destinos,
    cfg: dados.config,
    skins: dados.skins,
    porSimbolo: new Map(dados.destinos.map((d: { simbolo: string }) => [d.simbolo, d])),
    motionReduzido: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    scene,
    camera,
    renderer,
    cenaEl,
    estado,
    truck,
    input,
  } as Contexto;

  ctx.ui = criarUI(ctx);
  ctx.audio = criarAudio(ctx);
  ctx.audio.bindMute(ctx.ui.els.muteBtn, ctx.ui.els.muteIcon);
  ctx.mundo = criarMundo(ctx);
  ctx.caminhao = criarCaminhao(ctx);
  ctx.fisica = criarFisica(ctx);
  ctx.camera3 = criarCamera(ctx);
  ctx.guia = criarGuia(ctx);
  ctx.pedidos = criarPedidos(ctx);

  const { ui, audio, mundo, caminhao, guia, pedidos, cfg } = ctx;

  // ----- medir/resize (com re-render se o loop está parado) -----
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

  // ----- loop principal -----
  let rafId = 0;
  let ultimoTs = 0;
  let dtMedio = 16; // média móvel do frame time (auto-degrade)
  let degrade = 0;
  let rotaTimer = 0;
  let rotaAlvoKey = '';

  function retomarLoop() {
    if (!rafId) {
      ultimoTs = 0;
      rafId = requestAnimationFrame(loop);
    }
  }
  function pararLoop() {
    cancelAnimationFrame(rafId);
    rafId = 0;
    audio.silenciarMotor();
  }

  function loop(ts: number) {
    rafId = requestAnimationFrame(loop);
    if (!ultimoTs) { ultimoTs = ts; return; }
    const dtMs = ts - ultimoTs;
    ultimoTs = ts;
    const dt = Math.min(dtMs / 1000, 0.05);
    if (estado.fase !== 'jogando') return;

    // auto-degrade por média móvel: jank intermitente também conta
    dtMedio = dtMedio * 0.95 + dtMs * 0.05;
    if (dtMedio > 45 && degrade < 2) {
      degrade++;
      dtMedio = 16;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, degrade === 1 ? 0.85 : 0.7));
      medir();
    }

    ctx.fisica.passo(dt);
    pedidos.tentarZona(dt);
    ctx.camera3.passo(dt);
    audio.atualizarMotor();

    const p = estado.pedido;
    // relógio do pedido em TEMPO DE SIMULAÇÃO (justo em FPS baixo)
    if (p) p.decorridoMs += dt * 1000;

    const alvo = pedidos.alvoAtual();
    guia.apontarSeta(alvo, p && p.coletado ? 0x2ee08a : 0xffd23f, ts);
    if (p && p.coletado && alvo) guia.zonaEntrega.position.set(alvo.x, 0, alvo.z);
    guia.pulsarAneis(ts);

    // rota pontilhada: Fácil sempre; 1º pedido da partida; resgate no Normal
    rotaTimer -= dtMs;
    const mostrarRota = alvo && (estado.modo === 'facil' || estado.pedidosCompletos === 0 || estado.longeDesdeMs > 20000);
    if (mostrarRota) {
      const chave = alvo.x + ',' + alvo.z;
      if (chave !== rotaAlvoKey) rotaTimer = 0; // alvo mudou: rota na hora
      if (rotaTimer <= 0) {
        guia.atualizarRota(alvo);
        rotaAlvoKey = chave;
        rotaTimer = 900;
      }
    } else if (guia.temRota()) {
      guia.limparRota();
      rotaAlvoKey = '';
    }

    // botão de resgate quando fica longe e perdido
    if (alvo) {
      const d = Math.hypot(alvo.x - truck.x, alvo.z - truck.z);
      if (d > 55) {
        estado.longeDesdeMs += dtMs;
        if (estado.longeDesdeMs > 9000) ui.els.resgate.hidden = false;
      } else {
        estado.longeDesdeMs = 0;
        ui.els.resgate.hidden = true;
      }
    }

    // barra de prazo (Normal)
    if (estado.modo === 'normal' && p) {
      const rest = pedidos.prazoRestanteMs();
      const frac = Math.max(0, Math.min(1, rest / p.prazoMs));
      ui.els.prazoFill.style.transform = 'scaleX(' + frac + ')';
      ui.els.prazoFill.className = 'prazo__fill' + (frac < 0.25 ? ' urgente' : frac < 0.55 ? ' ambar' : '');
    }

    guia.passoMorador(ts);
    renderer.render(scene, camera);
  }

  // ----- fluxo -----
  const fluxo = {
    comecar(modo: Modo) {
      audio.retomar();
      pedidos.limparTimers();
      fluxo.soltarInputs();
      estado.modo = modo;
      estado.fase = 'jogando';
      estado.pontos = 0;
      estado.nivel = 1;
      estado.pedidosCompletos = 0;
      estado.entregasTotais = 0;
      estado.pedido = null;
      estado.primeiroInput = false;
      estado.vidas = modo === 'normal' ? cfg.coracoes : 0;
      ui.els.vidasWrap.hidden = modo !== 'normal';
      if (modo === 'normal') ui.atualizarVidas(false);
      ui.popHud('[data-pontos]', 0);
      ui.popHud('[data-nivel]', 1);
      caminhao.atualizarCaixasVisiveis(0);
      caminhao.aplicarSkin(1);
      // nasce uma rua ao sul do depósito, já olhando pra ele
      truck.x = 0; truck.z = 42; truck.heading = Math.PI; truck.v = 0;
      ui.els.introModal.hidden = true;
      ui.els.pauseBtn.hidden = false;
      ui.els.controles.hidden = false;
      ui.els.fantasma.hidden = false;
      ui.els.fantasmaTxt.textContent = '▲ acelera · ◀ ▶ vira';
      medir();
      ctx.camera3.iniciarFlyover();
      pedidos.novoPedido();
      retomarLoop();
      ui.anunciar(modo === 'facil'
        ? 'Modo fácil: sem tempo e sem pressa — acelere com a seta pra cima e entregue no seu ritmo!'
        : 'Modo normal: acelere com a seta pra cima e corra contra o tempo!');
    },
    pausar() {
      if (estado.fase !== 'jogando') return;
      estado.fase = 'pausado';
      fluxo.soltarInputs(); // keyup perdido no alt-tab não pode deixar tecla presa
      pararLoop();
      renderer.render(scene, camera); // 1 frame estático atrás do modal
      ui.els.pausaModal.hidden = false;
      setTimeout(() => (document.querySelector('[data-continuar]') as HTMLElement).focus(), 60);
      ui.anunciar('Jogo pausado.');
    },
    continuarJogo() {
      if (estado.fase !== 'pausado') return;
      ui.els.pausaModal.hidden = true;
      estado.fase = 'jogando';
      medir();
      retomarLoop();
      // pausou bem no respiro entre pedidos? agenda o próximo de novo
      if (!estado.pedido) pedidos.agendarRespiro(600);
      ui.anunciar('Voltando pra estrada!');
    },
    fimDeTurno() {
      estado.fase = 'fim';
      pedidos.limparTimers();
      fluxo.soltarInputs();
      pararLoop();
      audio.somFim();
      audio.suspender(); // motor/áudio param de processar (bateria!)
      const fim = ui.els.fimModal;
      (fim.querySelector('[data-fim-msg]') as HTMLElement).textContent =
        'Você entregou ' + estado.entregasTotais + (estado.entregasTotais === 1 ? ' caixa' : ' caixas') +
        ' e chegou ao nível ' + estado.nivel + '! A cidade agradece! 🏙️';
      (fim.querySelector('[data-fim-score]') as HTMLElement).textContent = String(estado.pontos);
      (fim.querySelector('[data-fim-detalhe]') as HTMLElement).textContent = estado.modo === 'normal'
        ? 'Grave seu nome no ranking dos caminhoneiros!'
        : 'No modo Normal você corre contra o tempo e vale ranking!';
      const gravar = fim.querySelector('[data-gravar-nome]') as HTMLElement;
      gravar.hidden = estado.modo !== 'normal' || estado.pontos <= 0;
      fim.hidden = false;
      setTimeout(() => (gravar.hidden ? (document.querySelector('[data-replay]') as HTMLElement) : gravar).focus(), 60);
      ui.anunciar('Fim do turno! Você fez ' + estado.pontos + ' pontos.');
    },
    reiniciar() {
      estado.fase = 'inicio';
      estado.modo = null;
      estado.pedido = null;
      pedidos.limparTimers();
      fluxo.soltarInputs();
      pararLoop();
      audio.suspender();
      [ui.els.pausaModal, ui.els.fimModal, ui.els.entradaModal, ui.els.recordesModal].forEach((m) => { m.hidden = true; });
      ui.els.controles.hidden = true;
      ui.els.fantasma.hidden = true;
      ui.els.pauseBtn.hidden = true;
      ui.els.prazoWrap.hidden = true;
      ui.els.vidasWrap.hidden = true;
      ui.els.resgate.hidden = true;
      guia.esconderTudo();
      rotaAlvoKey = '';
      ui.els.destinoAtual.textContent = '';
      ui.els.introModal.hidden = false;
      renderer.render(scene, camera);
      setTimeout(() => (document.querySelector('[data-modo="facil"]') as HTMLElement).focus(), 60);
    },
    medir,
    soltarInputs() {
      input.esq = input.dir = input.acel = input.re = false;
      document.querySelectorAll('.ctl.on').forEach((b) => b.classList.remove('on'));
    },
    aoPrimeiroInput() {
      if (estado.primeiroInput) return;
      estado.primeiroInput = true;
      ui.els.fantasma.hidden = true;
    },
    loopRodando() {
      return rafId !== 0;
    },
  };
  ctx.fluxo = fluxo;
  ctx.ranking = criarRanking(ctx);
  ligarInput(ctx);

  // ----- bindings de fluxo -----
  document.querySelectorAll<HTMLElement>('[data-modo]').forEach((btn) => {
    btn.addEventListener('click', () => fluxo.comecar(btn.dataset.modo as Modo));
  });
  (document.querySelector('[data-replay]') as HTMLElement).addEventListener('click', () => fluxo.reiniciar());
  ui.els.pauseBtn.addEventListener('click', () => fluxo.pausar());
  (document.querySelector('[data-continuar]') as HTMLElement).addEventListener('click', () => fluxo.continuarJogo());
  (document.querySelector('[data-encerrar]') as HTMLElement).addEventListener('click', () => {
    ui.els.pausaModal.hidden = true;
    fluxo.fimDeTurno();
  });
  (document.querySelector('[data-recomecar]') as HTMLElement).addEventListener('click', () => {
    ui.els.pausaModal.hidden = true;
    fluxo.reiniciar();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && estado.fase === 'jogando') fluxo.pausar();
  });

  // resgate: teleporta pra rua mais próxima olhando pro alvo
  ui.els.resgate.addEventListener('click', () => {
    const no = mundo.noMaisProximo(truck.x, truck.z);
    truck.x = mundo.ruaCentro(no[0]);
    truck.z = mundo.ruaCentro(no[1]);
    truck.v = 0;
    const alvo = pedidos.alvoAtual();
    if (alvo) truck.heading = Math.atan2(alvo.x - truck.x, alvo.z - truck.z);
    ui.els.resgate.hidden = true;
    estado.longeDesdeMs = 0;
    ui.anunciar('De volta pra pista!');
  });

  // ----- boot -----
  document.body.classList.add('is-game');
  medir();
  renderer.render(scene, camera);
  setTimeout(() => (document.querySelector('[data-modo="facil"]') as HTMLElement).focus(), 60);

  // handle de depuração/testes (posição, estado e zonas — sem dados sensíveis)
  (window as any).__et = { truck, estado, input, zonas: mundo.zonas, renderer };
}
