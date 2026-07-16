// Gameplay das entregas: pedidos, coleta com ímã de zona, entrega,
// bônus/prazo/corações, níveis e skins. O prazo corre em decorridoMs
// (tempo de simulação, somado no loop do main).
import type { Contexto, Pedidos, Zona } from './tipos';

export function criarPedidos(ctx: Contexto): Pedidos {
  let ultimoDestino: string | null = null;
  let fimTimer = 0;
  let respiroTimer = 0;

  function zonaDe(sim: string): Zona {
    return ctx.mundo.zonas.get(sim)!;
  }

  function caixasDoNivel() {
    const { cfg, estado } = ctx;
    if (estado.nivel >= cfg.caixas3APartirDoNivel) return 3;
    if (estado.nivel >= cfg.caixas2APartirDoNivel) return 2;
    return 1;
  }

  function alvoAtual(): Zona | null {
    const p = ctx.estado.pedido;
    if (!p) return null;
    if (!p.coletado) return zonaDe('D');
    let melhor: Zona | null = null;
    let dist = Infinity;
    p.caixas.forEach((sim) => {
      const z = zonaDe(sim);
      const d = Math.abs(z.x - ctx.truck.x) + Math.abs(z.z - ctx.truck.z);
      if (d < dist) { dist = d; melhor = z; }
    });
    return melhor;
  }

  function prazoRestanteMs() {
    const p = ctx.estado.pedido;
    if (!p) return 0;
    return Math.max(0, p.prazoMs - p.decorridoMs);
  }

  function novoPedido() {
    const { cfg, estado, truck, destinos, porSimbolo, ui, audio, guia } = ctx;
    const n = caixasDoNivel();
    const disponiveis = destinos.map((d) => d.simbolo).filter((s) => s !== ultimoDestino);
    const caixas: string[] = [];
    for (let i = 0; i < n; i++) {
      caixas.push(disponiveis.splice(Math.floor(Math.random() * disponiveis.length), 1)[0]);
    }
    ultimoDestino = caixas[caixas.length - 1];
    // prazo estimado pela distância manhattan da rota inteira
    const dep = zonaDe('D');
    let dist = Math.abs(dep.x - truck.x) + Math.abs(dep.z - truck.z);
    let px = dep.x;
    let pz = dep.z;
    caixas.forEach((sim) => {
      const z = zonaDe(sim);
      dist += Math.abs(z.x - px) + Math.abs(z.z - pz);
      px = z.x;
      pz = z.z;
    });
    const fator = Math.max(cfg.prazoFatorMin, cfg.prazoFatorBase - cfg.prazoQuedaPorNivel * (estado.nivel - 1));
    const prazoS = Math.max(cfg.prazoMinS, (dist / cfg.prazoVelRef) * fator);
    estado.pedido = {
      caixas,
      total: n,
      coletado: false,
      bateu: false,
      prazoMs: prazoS * 1000,
      decorridoMs: 0,
    };
    const nomes = caixas.map((s) => porSimbolo.get(s)!.rotulo);
    const primeiro = porSimbolo.get(caixas[0])!;
    const txt = n === 1
      ? 'Pedido! ' + primeiro.emoji + ' ' + primeiro.rotulo + ' quer 1 caixa!'
      : 'Pedido! ' + n + ' caixas: ' + nomes.join(', ') + '!';
    ui.mostrarToast(txt, 'info', 3000);
    audio.somPedido();
    ui.anunciar(txt + ' Primeiro, pegue as caixas no depósito.');
    ui.els.destinoAtual.textContent = '📦 Pegue no depósito';
    guia.zonaColeta.visible = true;
    guia.zonaColeta.position.set(dep.x, 0, dep.z);
    guia.zonaEntrega.visible = false;
    ui.els.prazoWrap.hidden = estado.modo !== 'normal';
    estado.longeDesdeMs = 0;
  }

  function listaEntregas(caixas: string[]) {
    return '🏪 Entregue: ' + caixas.map((s) => {
      const d = ctx.porSimbolo.get(s)!;
      return d.emoji + ' ' + d.rotulo;
    }).join(' · ');
  }

  function coletar() {
    const { estado, ui, audio, guia, caminhao, porSimbolo } = ctx;
    const p = estado.pedido;
    if (!p || p.coletado) return;
    p.coletado = true;
    caminhao.atualizarCaixasVisiveis(p.caixas.length);
    guia.zonaColeta.visible = false;
    guia.zonaEntrega.visible = true;
    audio.somColeta();
    const nomeAlvo = p.caixas.length === 1 ? porSimbolo.get(p.caixas[0])!.nome : 'as lojas';
    ui.mostrarToast('📦 Caixa a bordo! Leve até ' + nomeAlvo + '!', 'ok', 2200);
    ui.anunciar('Caixa a bordo! Siga a seta verde.');
    ui.els.destinoAtual.textContent = listaEntregas(p.caixas);
  }

  function entregar(sim: string) {
    const { estado, cfg, ui, audio, guia, caminhao, porSimbolo, garagem } = ctx;
    const p = estado.pedido!;
    const idx = p.caixas.indexOf(sim);
    if (idx === -1) return;
    p.caixas.splice(idx, 1);
    caminhao.atualizarCaixasVisiveis(p.caixas.length);
    const destino = porSimbolo.get(sim)!;
    const zona = zonaDe(sim);
    garagem.ganharPontos(cfg.pontosPorCaixa); // placar da partida + cofre da garagem
    estado.entregasTotais++;
    audio.somEntrega();
    ui.confete();
    guia.mostrarMorador(zona.x + 2, zona.z - 3);
    ui.mostrarToast('🎉 ' + ui.elogio() + ' +' + cfg.pontosPorCaixa, 'ok', 2000);
    ui.anunciar('Entregue n' + destino.nome + '! Mais ' + cfg.pontosPorCaixa + ' pontos.');
    if (p.caixas.length === 0) {
      concluirPedido();
    } else {
      ui.els.destinoAtual.textContent = listaEntregas(p.caixas);
    }
  }

  function concluirPedido() {
    const { estado, cfg, ui, audio, guia, garagem } = ctx;
    const p = estado.pedido!;
    let extra = 0;
    const restMs = prazoRestanteMs();
    if (estado.modo === 'normal') {
      if (restMs > 0) {
        extra += Math.min(cfg.bonusTempoTeto, Math.round((restMs / 1000) * cfg.bonusTempoPorS));
      } else {
        // prazo estourado: a entrega VALE (pontos base já dados), perde só bônus e 1 coração
        estado.vidas = Math.max(0, estado.vidas - 1);
        ui.atualizarVidas(false);
        audio.somUfa();
        ui.mostrarToast('⏰ Ufa, chegou! Mas o relógio estourou…', 'info', 2200);
      }
    }
    if (!p.bateu) extra += cfg.bonusLimpa;
    extra += (p.total - 1) * cfg.bonusCaixaExtra;
    if (extra > 0) {
      garagem.ganharPontos(extra);
      ui.mostrarToast('⭐ Bônus +' + extra + '!', 'ok', 1600);
    }
    estado.pedido = null;
    estado.pedidosCompletos++;
    guia.zonaEntrega.visible = false;
    ui.els.prazoWrap.hidden = true;
    ui.els.destinoAtual.textContent = '';
    if (estado.modo === 'normal' && estado.vidas <= 0) {
      // timer guardado + guarda de fase: não atravessa recomeço/partida nova
      clearTimeout(respiroTimer); // nenhum "Pedido!" nasce na janela do fim
      clearTimeout(fimTimer);
      fimTimer = window.setTimeout(() => {
        if (estado.fase !== 'jogando' && estado.fase !== 'pausado') return;
        ui.els.pausaModal.hidden = true;
        ctx.fluxo.fimDeTurno();
      }, 900);
      return;
    }
    if (estado.pedidosCompletos % cfg.pedidosPorNivel === 0 && estado.nivel < cfg.nivelMax) {
      estado.nivel++;
      ui.popHud('[data-nivel]', estado.nivel);
      audio.somNivel();
      // subtítulo só quando o nível REALMENTE muda alguma coisa (a skin não
      // troca mais por nível — quem manda é a Garagem)
      const sub = estado.nivel === cfg.caixas2APartirDoNivel ? 'Agora são 2 caixas por pedido! 📦'
        : estado.nivel === cfg.caixas3APartirDoNivel ? 'Agora são 3 caixas por pedido! 📦'
        : '';
      ui.mostrarBanner('Nível ' + estado.nivel + '! 🎉', sub);
      ui.anunciar('Nível ' + estado.nivel + '!');
    }
    agendarRespiro(cfg.respiroEntrePedidosMs);
  }

  function agendarRespiro(ms: number) {
    clearTimeout(respiroTimer);
    respiroTimer = window.setTimeout(() => {
      // no Normal, vidas zeradas = fim já agendado: nenhum pedido novo nasce
      const vivo = ctx.estado.modo !== 'normal' || ctx.estado.vidas > 0;
      if (ctx.estado.fase === 'jogando' && !ctx.estado.pedido && vivo) novoPedido();
    }, ms);
  }

  function tentarZona(dt: number) {
    const { estado, cfg, truck } = ctx;
    const p = estado.pedido;
    if (!p) return;
    const imaRaio = estado.modo === 'facil' ? cfg.imaRaioFacil : cfg.imaRaio;
    const checar = (zona: Zona, aoEntrar: () => void) => {
      const dx = truck.x - zona.x;
      const dz = truck.z - zona.z;
      const d = Math.hypot(dx, dz);
      if (d < cfg.raioZona && Math.abs(truck.v) < cfg.vMaxColeta) {
        // ímã: puxa suavemente pro centro quando devagar e perto
        if (d > 0.3) {
          const k = Math.min(1, 3 * dt);
          truck.x -= dx * k * (d < imaRaio ? 1 : 0.4);
          truck.z -= dz * k * (d < imaRaio ? 1 : 0.4);
        }
        aoEntrar();
      }
    };
    if (!p.coletado) {
      checar(zonaDe('D'), coletar);
    } else {
      for (const sim of p.caixas.slice()) {
        checar(zonaDe(sim), () => entregar(sim));
      }
    }
  }

  function bateuEmCarro() {
    const { estado, ui, audio } = ctx;
    // vidas <= 0: fim já agendado, nada de dano extra na janela pós-morte
    if (estado.modo !== 'normal' || estado.fase !== 'jogando' || estado.vidas <= 0) return;
    if (estado.pedido) estado.pedido.bateu = true;
    audio.somBatida();
    estado.vidas--;
    ui.atualizarVidas(false);
    ui.mostrarToast('💥 Bateu no carro! Cuidado no trânsito!', 'info', 2200);
    ui.anunciar('Você bateu num carro e perdeu um coração! Vidas: ' + estado.vidas + '.');
    if (estado.vidas <= 0) {
      clearTimeout(respiroTimer);
      clearTimeout(fimTimer);
      fimTimer = window.setTimeout(() => {
        if (ctx.estado.fase !== 'jogando' && ctx.estado.fase !== 'pausado') return;
        ui.els.pausaModal.hidden = true;
        ctx.fluxo.fimDeTurno();
      }, 900);
    }
  }

  return {
    novoPedido,
    tentarZona,
    alvoAtual,
    prazoRestanteMs,
    agendarRespiro,
    bateuEmCarro,
    limparTimers() {
      clearTimeout(fimTimer);
      clearTimeout(respiroTimer);
    },
  };
}
