// Multiplayer por polling (mb-salas.php): o mundo canônico vive no
// servidor como SNAPSHOT (foto) + DIÁRIO de edições numeradas. A cada
// ~1,2s o cliente manda as edições locais + posição e recebe as dos
// colegas — sem websocket, funciona de qualquer casa pela internet.
//
// O gancho mundo.aoMudar captura TODA escrita local (quebrar, colocar,
// flor caindo, decay, árvore crescendo) enquanto a sala está ativa; a
// flag aplicandoRemoto evita eco. Aplicar edição remota = definir puro
// (sem inventário/som); o eco da própria edição é no-op (obter === id).
//
// Só o ANFITRIÃO (dono ativo, ou o mais antigo se o dono sumir) roda os
// relógios de mudas/decay — Math.random em duas máquinas divergiria o
// mundo. O anfitrião também compacta: manda uma foto nova quando o
// diário engorda, e o servidor poda as edições antigas.
import { apiJson, beaconOrKeepalive, createGenerationGuard, createPoller } from '../../lib/net';
import { encodeRLE, decodeRLE } from '../../lib/rle';
import { CICLO_S } from './ceu';
import type { Contexto, JogadorRemoto, Meta, Sync } from './tipos';

interface FotoSala {
  seed: number;
  blocos: string;
  metas?: Record<string, Meta>;
}

export function criarSync(ctx: Contexto): Sync {
  const S = ctx.cfg.sala;
  let codigo = '';
  let token = '';
  let meuNome = '';
  let modo: '' | 'dono' | 'visita' = '';
  let anfitriao = false;
  let seqVisto = 0;
  let fila: Array<[number, number, number, number]> = [];
  // lote em envio: congelado fora da fila com um número próprio — se a
  // RESPOSTA se perder (timeout) o re-envio leva o MESMO número e o
  // servidor não duplica as edições no diário
  let loteAtual: Array<[number, number, number, number]> | null = null;
  let loteN = 0;
  // metadata (baú/placa): stream próprio. Idempotente (objeto inteiro),
  // dedup por chave — sem número de lote
  let metaSeqVisto = 0;
  let filaMeta = new Map<number, Meta | null>();
  let loteMeta: Array<[number, Meta | null]> | null = null;
  let donoNome = '';
  let ackPendentes: number[] = []; // ids de entregas de logout já resolvidas
  let aplicandoRemoto = false;
  let falhas = 0;
  let fotoEmVoo = false;
  let ultimaFotoMs = 0;
  let fotoPendente: FotoSala | null = null;
  let nomesVistos = new Set<string>();

  // ----- gancho de broadcast -----
  function aoMudar(x: number, y: number, z: number, id: number) {
    if (aplicandoRemoto) return;
    fila.push([x, y, z, id]);
    if (fila.length === 1) pollLogo(S.nudgeMs); // 1ª edição apressa o sync
  }
  function aoMudarMeta(chave: number, meta: Meta | null) {
    if (aplicandoRemoto) return;
    filaMeta.set(chave, meta);
    pollLogo(S.nudgeMs);
  }

  function instalarGancho() {
    ctx.mundo.aoMudar = aoMudar;
    ctx.metas.aoMudar = aoMudarMeta;
  }
  function removerGancho() {
    ctx.mundo.aoMudar = undefined;
    ctx.metas.aoMudar = undefined;
  }

  // ----- rede -----
  const gen = createGenerationGuard();
  const poller = createPoller({
    run: sincronizar,
    cadenceMs: () => S.pollMs,
    jitterMs: S.jitterMs,
  });
  const api = (corpo: Record<string, unknown>) => apiJson(S.api, corpo);

  function fotoAtual(): FotoSala {
    return { seed: ctx.estado.seed >>> 0, blocos: encodeRLE(ctx.mundo.dados), metas: ctx.metas.serializar() };
  }

  // ----- aplicar o que veio do servidor -----
  function aplicarFoto(foto: FotoSala): boolean {
    const blocos = decodeRLE(foto.blocos, ctx.mundo.dados.length, ctx.blocos.length - 1);
    if (!blocos) return false;
    ctx.mundo.dados.set(blocos);
    ctx.estado.seed = foto.seed >>> 0;
    ctx.metas.carregar(foto.metas || {});
    return true;
  }

  // aplica metadata vinda da rede em ordem de mseq. PULA chaves com
  // escrita local mais nova pendente (filaMeta): o servidor ecoa de volta
  // o próprio lote que eu mandei, e se eu já cliquei de novo no baú desde
  // então, aplicar o eco antigo regride o depósito/saque (perde/duplica
  // item). O metaSeqVisto avança mesmo assim pra não re-receber.
  function aplicarMetas(metasNovas: Array<[number, number, Meta | null]>) {
    let mudou = false;
    for (const m of metasNovas) {
      if (!Array.isArray(m) || m.length !== 3) continue;
      const [mseq, chave, meta] = m;
      if (mseq <= metaSeqVisto) continue;
      metaSeqVisto = mseq;
      if (filaMeta.has(chave)) continue; // tenho escrita local mais nova pra essa célula
      ctx.metas.aplicar(chave, meta);
      mudou = true;
    }
    if (mudou) {
      ctx.ui.atualizarBau(); // um baú aberto pode ter mudado
      if (ctx.salvar.temMundo()) ctx.salvar.agendar();
    }
  }

  // entrega de logout: deposita os itens do visitante que saiu no baú
  // dele → baú do dono → inventário do dono. SÓ o anfitrião resolve.
  function depositarNoBau(chave: number, bau: Meta & { tipo: 'bau' }, itens: number[]) {
    for (let id = 0; id < itens.length; id++) {
      const n = itens[id] | 0;
      if (n > 0) bau.itens[id] = Math.min(999, (bau.itens[id] || 0) + n);
    }
    ctx.metas.tocar(chave); // broadcast do baú atualizado
    ctx.ui.atualizarBau();
  }
  function resolverEntrega(nome: string, itens: number[]): boolean {
    const meu = ctx.metas.acharBau((b) => b.dono === nome);
    if (meu) { depositarNoBau(meu.chave, meu.bau, itens); return true; }
    const doDono = ctx.metas.acharBau((b) => b.dono === '' || b.dono === donoNome);
    if (doDono) { depositarNoBau(doDono.chave, doDono.bau, itens); return true; }
    // sem baú: só o próprio dono coloca no próprio inventário
    if (modo === 'dono') {
      for (let id = 0; id < itens.length; id++) ctx.edicao.ganharItemPublico(id, itens[id] | 0);
      return true;
    }
    return false; // anfitrião promovido sem dono presente: espera o dono voltar
  }
  function resolverPendentes(pendentes: any[]) {
    if (!anfitriao || !Array.isArray(pendentes)) return;
    for (const p of pendentes) {
      if (!p || typeof p.id !== 'number' || !Array.isArray(p.itens)) continue;
      if (ackPendentes.includes(p.id)) continue; // já resolvido, aguardando ack
      if (resolverEntrega(String(p.nome || ''), p.itens)) ackPendentes.push(p.id);
      else break; // não deu (sem dono): mantém a ordem, tenta de novo depois
    }
  }

  function aplicarEdicoes(edicoes: Array<[number, number, number, number, number]>) {
    aplicandoRemoto = true;
    let mudouAlgo = false;
    for (const e of edicoes) {
      if (!Array.isArray(e) || e.length !== 5) continue;
      const [s, x, y, z, b] = e;
      if (s <= seqVisto) continue;
      seqVisto = s;
      // cinto e suspensório: id fora da tabela não entra no mundo
      // (envenenaria o save do dono — decodeRLE recusa no load)
      if (!Number.isInteger(b) || b < 0 || b >= ctx.blocos.length) continue;
      // eco da própria edição (ou no-op): nada a fazer, nem remesh
      if (ctx.mundo.obter(x, y, z) === b) continue;
      ctx.mundo.definir(x, y, z, b);
      mudouAlgo = true;
      if (anfitriao) ctx.edicao.aoEdicaoRemota(x, y, z, b);
    }
    aplicandoRemoto = false;
    if (mudouAlgo && ctx.salvar.temMundo()) ctx.salvar.agendar();
  }

  function tratarJogadores(lista: JogadorRemoto[]) {
    ctx.bonecos.atualizarLista(lista);
    const agora = new Set(lista.map((j) => j.nome));
    for (const n of agora) {
      if (!nomesVistos.has(n)) ctx.ui.mostrarToast('🙋 <b>' + n + '</b> entrou!', 'ok', 2200);
    }
    for (const n of nomesVistos) {
      if (!agora.has(n)) ctx.ui.mostrarToast('👋 <b>' + n + '</b> saiu.', 'info', 2200);
    }
    nomesVistos = agora;
    atualizarChip(lista.length + 1);
    atualizarListaPausa(lista);
    ctx.ui.atualizarTabJogadores(meuNome, donoNome, lista);
  }

  function atualizarChip(total: number) {
    const chip = ctx.ui.els.salaChip;
    if (!chip) return;
    chip.hidden = !poller.running();
    chip.textContent = '👥 ' + total + ' · ' + codigo;
  }

  function atualizarListaPausa(lista: JogadorRemoto[]) {
    const el = ctx.ui.els.salaLista;
    if (!el) return;
    const nomes = [meuNome + ' (você)'].concat(lista.map((j) => j.nome));
    el.textContent = '👥 Na sala: ' + nomes.join(', ');
  }

  // ----- ciclo de polling -----
  function agendarPoll() {
    poller.schedule();
  }
  function pollLogo(ms: number) {
    poller.schedule(ms);
  }

  // o inflight do poller fica de pé até o FIM (inclusive na re-entrada
  // pós-403) — um segundo sync no meio usaria token velho e derrubaria
  // a criança
  async function sincronizar() {
    const g = gen.capture();
    {
      if (!loteAtual) loteAtual = fila.splice(0, S.maxEdicoesPorSync);
      if (!loteMeta) {
        // respeita o teto do servidor (MAX_METAS_POR_SYNC) — mandar mais
        // dá 400 e trava a sala; o resto fica na fila pro próximo sync
        loteMeta = [...filaMeta.entries()].slice(0, S.maxMetasPorSync);
        for (const [k] of loteMeta) filaMeta.delete(k);
      }
      const p = ctx.jogador;
      // yaw normalizado pra [-π, π]: ele acumula sem wrap no cliente e o
      // servidor satura — sem isso o boneco congela depois de umas voltas
      const yawN = Math.atan2(Math.sin(p.yaw), Math.cos(p.yaw));
      const r = await api({
        acao: 'sync',
        codigo,
        token,
        desde: seqVisto,
        desdeM: metaSeqVisto,
        lote: loteN,
        edicoes: loteAtual,
        metas: loteMeta,
        pendentesAck: ackPendentes,
        // blackboard dos Winpups: só o anfitrião publica (o servidor ignora dos outros)
        bichos: anfitriao ? ctx.mob.estadoRede() : undefined,
        pos: { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), yaw: +yawN.toFixed(3), pitch: +p.pitch.toFixed(3) },
      });
      if (!poller.running() || gen.stale(g)) return;

      if (!r.ok) {
        if (r.status === 404) {
          sairLocal('📡 A sala fechou — você continua no mundo, mas sozinho.');
          return;
        }
        if (r.status === 403) {
          // sumiu tempo demais (aba dormiu) e o servidor limpou a vaga —
          // tenta voltar UMA vez com o mesmo nome, sem incomodar a criança
          const volta = await api({ acao: 'entrar', codigo, nome: meuNome });
          if (!poller.running() || gen.stale(g)) return;
          if (volta.ok) {
            token = volta.json.token;
            meuNome = volta.json.nome || meuNome;
            // se perdemos uma compactação nesse meio tempo, o próximo
            // sync devolve reset e o mundo se realinha sozinho
            agendarPoll();
            return;
          }
          sairLocal('📡 A sala fechou — você continua no mundo, mas sozinho.');
          return;
        }
        if (r.status === 400) {
          // o servidor recusou o corpo: re-enviar o MESMO lote falharia
          // pra sempre e travaria a sala — descarta e segue (o mundo
          // local fica na frente; a próxima foto realinha todo mundo)
          loteAtual = null;
          loteN++;
          loteMeta = null;
        }
        falhas++;
        if (falhas === 3) ctx.ui.mostrarToast('📡 Reconectando…', 'info', 2000);
        agendarPoll();
        return;
      }

      falhas = 0;
      const d = r.json;
      if (typeof d.donoNome === 'string') donoNome = d.donoNome;
      // diário lotado: o lote NÃO entrou — segura pro re-envio
      const aceitou = d.cheio !== true;
      if (aceitou) {
        loteAtual = null;
        loteN++;
      }
      // metadata: aceita (idempotente) → libera o lote; mas se o diário de
      // metadata lotou (metaCheio), o lote NÃO entrou — devolve pra fila
      // pra re-enviar depois que o anfitrião compactar
      const metaEnviada = loteMeta || [];
      if (d.metaCheio === true) {
        // re-agenda só as chaves sem escrita local mais nova pendente
        for (const [k, m] of metaEnviada) if (!filaMeta.has(k)) filaMeta.set(k, m);
      }
      loteMeta = null;

      if (d.reset === true && d.foto) {
        // ficamos pra trás da compactação: reconstrói do snapshot (blocos+metas)
        if (aplicarFoto(d.foto)) {
          seqVisto = typeof d.seq === 'number' ? d.seq : seqVisto;
          metaSeqVisto = typeof d.metaSeq === 'number' ? d.metaSeq : metaSeqVisto;
          // edições/metadata locais ainda não confirmadas voltam por cima
          aplicandoRemoto = true;
          for (const [x, y, z, b] of (loteAtual || []).concat(fila)) ctx.mundo.definir(x, y, z, b);
          for (const [k, m] of metaEnviada) ctx.metas.aplicar(k, m);
          for (const [k, m] of filaMeta) ctx.metas.aplicar(k, m);
          aplicandoRemoto = false;
          ctx.mundo.sujos.clear();
          ctx.malha.construirTudo();
          ctx.ui.atualizarBau();
        }
      } else {
        aplicarEdicoes(d.edicoes || []);
        if (typeof d.seq === 'number' && d.seq > seqVisto) seqVisto = d.seq;
        aplicarMetas(d.metasNovas || []);
        if (typeof d.metaSeq === 'number' && d.metaSeq > metaSeqVisto) metaSeqVisto = d.metaSeq;
      }

      // promoção SÓ depois de aplicar foto/edições: o re-scan das mudas e
      // folhas precisa ver o mundo NOVO (e vale pro dono re-promovido também)
      const eraAnfitriao = anfitriao;
      anfitriao = d.anfitriao === true;
      if (anfitriao && !eraAnfitriao) {
        ctx.edicao.iniciarMudas();
        ultimaFotoMs = performance.now();
        if (!ctx.salvar.temMundo()) {
          ctx.salvar.adotarMundo(codigo);
          ctx.salvar.agendar();
          ctx.ui.mostrarToast('👑 Agora o mundo está com você — e continua salvando!', 'ok', 3000);
        }
      }
      // NÃO limpo ackPendentes ao perder o posto: se eu resolvi uma
      // entrega e virei não-anfitrião antes de ackar, preciso seguir
      // mandando o ack (o servidor aceita de quem reservou) — senão o
      // novo anfitrião deposita a mesma entrega de novo
      if (anfitriao) resolverPendentes(d.pendentes || []);

      tratarJogadores(Array.isArray(d.jogadores) ? d.jogadores : []);
      // Winpups: quem NÃO é anfitrião segue as posições do blackboard
      if (!anfitriao && Array.isArray(d.bichos)) ctx.mob.atualizarRede(d.bichos);
      // ciclo dia/noite compartilhado: a fase vem do relógio do servidor,
      // então a sala inteira vê o mesmo horário (o rel local só suaviza entre polls)
      if (typeof d.agora === 'number' && typeof d.cicloInicioMs === 'number') {
        ctx.ceu.definirTempo((((d.agora - d.cicloInicioMs) / 1000) % CICLO_S + CICLO_S) % CICLO_S);
      }

      // compactação: anfitrião manda foto quando QUALQUER diário engorda —
      // e NA HORA se lotou (destrava a sala; o de metadata não some sozinho)
      if (anfitriao && !fotoEmVoo) {
        const agora = performance.now();
        const diario = typeof d.diario === 'number' ? d.diario : 0;
        const metaDiario = typeof d.metaDiario === 'number' ? d.metaDiario : 0;
        const urgente = d.cheio === true || d.metaCheio === true || diario >= S.fotoACadaEdicoes || metaDiario >= S.fotoMetaMin;
        const porTempo = (diario >= S.fotoJournalMin || metaDiario >= S.fotoMetaMin) && agora - ultimaFotoMs > S.fotoACadaMs;
        if (urgente || porTempo) {
          ultimaFotoMs = agora;
          fotoEmVoo = true;
          api({ acao: 'foto', codigo, token, foto: fotoAtual(), ateSeq: seqVisto, ateMetaSeq: metaSeqVisto }).finally(() => { fotoEmVoo = false; });
        }
      }

      agendarPoll();
    }
  }

  // ----- entrar/sair -----
  function sairLocal(aviso?: string) {
    poller.stop();
    gen.bump();
    removerGancho();
    fila = [];
    loteAtual = null;
    loteN = 0;
    filaMeta = new Map();
    loteMeta = null;
    metaSeqVisto = 0;
    donoNome = '';
    ackPendentes = [];
    fotoPendente = null;
    nomesVistos = new Set();
    modo = '';
    anfitriao = false;
    seqVisto = 0;
    ctx.bonecos.limpar();
    if (ctx.ui.els.salaChip) ctx.ui.els.salaChip.hidden = true;
    if (aviso) ctx.ui.mostrarToast(aviso, 'info', 3200);
  }

  // inventário do visitante pra "entregar" ao sair (baú dele → baú do
  // dono → inventário do dono). Só faz sentido pra visita com itens.
  function invParaEntrega(): number[] | null {
    if (modo !== 'visita') return null;
    const inv = ctx.estado.inventario;
    if (!inv.some((n) => n > 0)) return null;
    return inv.map((n) => Math.max(0, Math.min(999, n | 0)));
  }

  const api2: Sync = {
    emSala: () => poller.running(),
    emVisita: () => poller.running() && modo === 'visita',
    souAnfitriao: () => anfitriao,
    codigoSala: () => codigo,
    meuNomeNaSala: () => (poller.running() ? meuNome : ''),

    async criarSala(nomeJogador, cod) {
      if (poller.running()) return null;
      const foto = fotoAtual();
      if (foto.blocos.length > ctx.cfg.salvar.maxPayload) return '😅 O mundo ficou grande demais pra abrir sala!';
      // manda o horário atual do céu: a sala ancora o ciclo nele (mundo novo
      // começa de manhã; save reaberto mantém a hora)
      const r = await api({ acao: 'criar', codigo: cod, nome: nomeJogador, foto, tempo: Math.round(ctx.ceu.tempo()) });
      if (!r.ok) return r.json.erro || 'Não deu pra falar com o servidor. Tenta de novo?';
      codigo = cod;
      token = r.json.token;
      meuNome = nomeJogador;
      donoNome = nomeJogador; // eu sou o dono
      modo = 'dono';
      anfitriao = true;
      seqVisto = 0;
      metaSeqVisto = 0;
      fila = [];
      loteAtual = null;
      loteN = 0;
      filaMeta = new Map();
      loteMeta = null;
      ackPendentes = [];
      nomesVistos = new Set();
      ultimaFotoMs = performance.now();
      instalarGancho();
      poller.start();
      atualizarChip(1);
      atualizarListaPausa([]);
      agendarPoll();
      return null;
    },

    async entrarSala(cod, nomeJogador) {
      if (poller.running()) return null;
      const r = await api({ acao: 'entrar', codigo: cod, nome: nomeJogador });
      if (!r.ok) return r.json.erro || 'Não deu pra falar com o servidor. Tenta de novo?';
      if (!r.json.foto || typeof r.json.foto.blocos !== 'string') return 'A sala veio vazia — tenta de novo?';
      codigo = cod;
      token = r.json.token;
      meuNome = r.json.nome || nomeJogador;
      donoNome = typeof r.json.donoNome === 'string' ? r.json.donoNome : '';
      // já entra no horário da sala (sem esperar o 1º poll pra alinhar o céu)
      if (typeof r.json.agora === 'number' && typeof r.json.cicloInicioMs === 'number') {
        ctx.ceu.definirTempo((((r.json.agora - r.json.cicloInicioMs) / 1000) % CICLO_S + CICLO_S) % CICLO_S);
      }
      modo = 'visita';
      anfitriao = false;
      seqVisto = typeof r.json.seq === 'number' ? r.json.seq : 0;
      metaSeqVisto = typeof r.json.metaSeq === 'number' ? r.json.metaSeq : 0;
      fila = [];
      loteAtual = null;
      loteN = 0;
      filaMeta = new Map();
      loteMeta = null;
      ackPendentes = [];
      fotoPendente = r.json.foto;
      // quem já estava não ganha toast de "entrou"
      nomesVistos = new Set((r.json.jogadores || []).map((j: JogadorRemoto) => j.nome));
      return null;
    },

    aplicarFotoInicial() {
      if (!fotoPendente) return false;
      const ok = aplicarFoto(fotoPendente);
      fotoPendente = null;
      return ok;
    },

    ligarPoll() {
      if (poller.running() || modo === '') return;
      ultimaFotoMs = performance.now();
      instalarGancho();
      poller.start();
      atualizarChip(nomesVistos.size + 1);
      pollLogo(80); // 1º sync já — presença + edições que chegaram no meio
    },

    async sairDaSala() {
      if (!poller.running()) return;
      // beacon e não fetch: o "sair" costuma vir colado numa navegação,
      // que abortaria o fetch — e o boneco ficaria 2min parado na sala.
      // O visitante manda o inventário: o dono resolve a entrega.
      const corpo = JSON.stringify({ acao: 'sair', codigo, token, inventario: invParaEntrega() });
      sairLocal();
      await beaconOrKeepalive(S.api, corpo);
    },

    flushSair() {
      if (!poller.running()) return;
      beaconOrKeepalive(S.api, JSON.stringify({ acao: 'sair', codigo, token, inventario: invParaEntrega() }));
    },

    pollAgora: () => pollLogo(0),
  };
  return api2;
}
