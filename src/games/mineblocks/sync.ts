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
import { codificarRLE, decodificarRLE } from './salvar';
import type { Contexto, JogadorRemoto, Sync } from './tipos';

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
  let pollTimer = 0;
  let pollAtivo = false;
  let sincronizando = false;
  let aplicandoRemoto = false;
  let falhas = 0;
  let geracao = 0; // muda a cada sala: resposta em voo da sala velha morre
  let fotoEmVoo = false;
  let ultimaFotoMs = 0;
  let fotoPendente: { seed: number; blocos: string } | null = null;
  let nomesVistos = new Set<string>();

  // ----- gancho de broadcast -----
  function aoMudar(x: number, y: number, z: number, id: number) {
    if (aplicandoRemoto) return;
    fila.push([x, y, z, id]);
    if (fila.length === 1) pollLogo(S.nudgeMs); // 1ª edição apressa o sync
  }

  function instalarGancho() {
    ctx.mundo.aoMudar = aoMudar;
  }
  function removerGancho() {
    ctx.mundo.aoMudar = undefined;
  }

  // ----- rede -----
  async function api(corpo: Record<string, unknown>): Promise<{ ok: boolean; status: number; json: any }> {
    const aborto = new AbortController();
    const timer = setTimeout(() => aborto.abort(), 6000);
    try {
      const r = await fetch(S.api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
        signal: aborto.signal,
      });
      const json = await r.json().catch(() => ({}));
      return { ok: r.ok, status: r.status, json };
    } catch {
      return { ok: false, status: 0, json: {} };
    } finally {
      clearTimeout(timer);
    }
  }

  function fotoAtual(): { seed: number; blocos: string } {
    return { seed: ctx.estado.seed >>> 0, blocos: codificarRLE(ctx.mundo.dados) };
  }

  // ----- aplicar o que veio do servidor -----
  function aplicarFoto(foto: { seed: number; blocos: string }): boolean {
    const blocos = decodificarRLE(foto.blocos, ctx.mundo.dados.length, ctx.blocos.length - 1);
    if (!blocos) return false;
    ctx.mundo.dados.set(blocos);
    ctx.estado.seed = foto.seed >>> 0;
    return true;
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
      // (envenenaria o save do dono — decodificarRLE recusa no load)
      if (!Number.isInteger(b) || b < 0 || b >= ctx.blocos.length) continue;
      // eco da própria edição (ou no-op): nada a fazer, nem remesh
      if (ctx.mundo.obter(x, y, z) === b) continue;
      ctx.mundo.definir(x, y, z, b);
      mudouAlgo = true;
      if (anfitriao) ctx.edicao.aoEdicaoRemota(x, y, z, b);
    }
    aplicandoRemoto = false;
    // o dono salva o mundo NOMEADO com as construções dos amigos dentro
    if (mudouAlgo && modo === 'dono' && ctx.salvar.temMundo()) ctx.salvar.agendar();
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
  }

  function atualizarChip(total: number) {
    const chip = ctx.ui.els.salaChip;
    if (!chip) return;
    chip.hidden = !pollAtivo;
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
    if (!pollAtivo) return;
    clearTimeout(pollTimer);
    const jitter = (Math.random() * 2 - 1) * S.jitterMs;
    pollTimer = window.setTimeout(sincronizar, S.pollMs + jitter);
  }
  function pollLogo(ms: number) {
    if (!pollAtivo) return;
    clearTimeout(pollTimer);
    pollTimer = window.setTimeout(sincronizar, ms);
  }

  async function sincronizar() {
    if (!pollAtivo || sincronizando) return;
    // sincronizando fica de pé até o FIM (inclusive na re-entrada pós-403)
    // — um segundo sync no meio usaria token velho e derrubaria a criança
    sincronizando = true;
    const g = geracao;
    try {
      if (!loteAtual) loteAtual = fila.splice(0, S.maxEdicoesPorSync);
      const p = ctx.jogador;
      // yaw normalizado pra [-π, π]: ele acumula sem wrap no cliente e o
      // servidor satura — sem isso o boneco congela depois de umas voltas
      const yawN = Math.atan2(Math.sin(p.yaw), Math.cos(p.yaw));
      const r = await api({
        acao: 'sync',
        codigo,
        token,
        desde: seqVisto,
        lote: loteN,
        edicoes: loteAtual,
        pos: { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), yaw: +yawN.toFixed(3), pitch: +p.pitch.toFixed(3) },
      });
      if (!pollAtivo || g !== geracao) return;

      if (!r.ok) {
        if (r.status === 404) {
          sairLocal('📡 A sala fechou — você continua no mundo, mas sozinho.');
          return;
        }
        if (r.status === 403) {
          // sumiu tempo demais (aba dormiu) e o servidor limpou a vaga —
          // tenta voltar UMA vez com o mesmo nome, sem incomodar a criança
          const volta = await api({ acao: 'entrar', codigo, nome: meuNome });
          if (!pollAtivo || g !== geracao) return;
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
        falhas++;
        if (falhas === 3) ctx.ui.mostrarToast('📡 Reconectando…', 'info', 2000);
        agendarPoll();
        return;
      }

      falhas = 0;
      const d = r.json;
      // diário lotado: o lote NÃO entrou — segura pro re-envio
      const aceitou = d.cheio !== true;
      if (aceitou) {
        loteAtual = null;
        loteN++;
      }

      if (d.reset === true && d.foto) {
        // ficamos pra trás da compactação: reconstrói do snapshot
        if (aplicarFoto(d.foto)) {
          seqVisto = typeof d.seq === 'number' ? d.seq : seqVisto;
          // edições locais ainda não confirmadas voltam por cima (elas
          // vão pro diário no próximo sync de qualquer jeito)
          aplicandoRemoto = true;
          for (const [x, y, z, b] of (loteAtual || []).concat(fila)) ctx.mundo.definir(x, y, z, b);
          aplicandoRemoto = false;
          ctx.mundo.sujos.clear();
          ctx.malha.construirTudo();
        }
      } else {
        aplicarEdicoes(d.edicoes || []);
        if (typeof d.seq === 'number' && d.seq > seqVisto) seqVisto = d.seq;
      }

      // promoção SÓ depois de aplicar foto/edições: o re-scan das mudas e
      // folhas precisa ver o mundo NOVO (e vale pro dono re-promovido também)
      const eraAnfitriao = anfitriao;
      anfitriao = d.anfitriao === true;
      if (anfitriao && !eraAnfitriao) {
        ctx.edicao.iniciarMudas();
        ultimaFotoMs = performance.now();
      }

      tratarJogadores(Array.isArray(d.jogadores) ? d.jogadores : []);

      // compactação: anfitrião manda foto quando o diário engorda —
      // e NA HORA se o diário lotou (destrava a sala inteira)
      if (anfitriao && typeof d.diario === 'number' && !fotoEmVoo) {
        const agora = performance.now();
        if (d.cheio === true || d.diario >= S.fotoACadaEdicoes || (d.diario >= S.fotoJournalMin && agora - ultimaFotoMs > S.fotoACadaMs)) {
          ultimaFotoMs = agora;
          fotoEmVoo = true;
          api({ acao: 'foto', codigo, token, foto: fotoAtual(), ateSeq: seqVisto }).finally(() => { fotoEmVoo = false; });
        }
      }

      agendarPoll();
    } finally {
      sincronizando = false;
    }
  }

  // ----- entrar/sair -----
  function sairLocal(aviso?: string) {
    pollAtivo = false;
    geracao++; // resposta em voo da sala velha morre no ar
    clearTimeout(pollTimer);
    removerGancho();
    fila = [];
    loteAtual = null;
    loteN = 0;
    fotoPendente = null;
    nomesVistos = new Set();
    modo = '';
    anfitriao = false;
    seqVisto = 0;
    ctx.bonecos.limpar();
    if (ctx.ui.els.salaChip) ctx.ui.els.salaChip.hidden = true;
    if (aviso) ctx.ui.mostrarToast(aviso, 'info', 3200);
  }

  const api2: Sync = {
    emSala: () => pollAtivo,
    emVisita: () => pollAtivo && modo === 'visita',
    souAnfitriao: () => anfitriao,
    codigoSala: () => codigo,

    async criarSala(nomeJogador) {
      if (pollAtivo) return null;
      const foto = fotoAtual();
      if (foto.blocos.length > ctx.cfg.salvar.maxPayload) return '😅 O mundo ficou grande demais pra abrir sala!';
      const r = await api({ acao: 'criar', nome: nomeJogador, foto });
      if (!r.ok) return r.json.erro || 'Não deu pra falar com o servidor. Tenta de novo?';
      codigo = r.json.codigo;
      token = r.json.token;
      meuNome = nomeJogador;
      modo = 'dono';
      anfitriao = true;
      seqVisto = 0;
      fila = [];
      loteAtual = null;
      loteN = 0;
      nomesVistos = new Set();
      ultimaFotoMs = performance.now();
      instalarGancho();
      pollAtivo = true;
      atualizarChip(1);
      atualizarListaPausa([]);
      agendarPoll();
      return null;
    },

    async entrarSala(cod, nomeJogador) {
      if (pollAtivo) return null;
      const r = await api({ acao: 'entrar', codigo: cod, nome: nomeJogador });
      if (!r.ok) return r.json.erro || 'Não deu pra falar com o servidor. Tenta de novo?';
      if (!r.json.foto || typeof r.json.foto.blocos !== 'string') return 'A sala veio vazia — tenta de novo?';
      codigo = cod;
      token = r.json.token;
      meuNome = r.json.nome || nomeJogador;
      modo = 'visita';
      anfitriao = false;
      seqVisto = typeof r.json.seq === 'number' ? r.json.seq : 0;
      fila = [];
      loteAtual = null;
      loteN = 0;
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
      if (pollAtivo || modo === '') return;
      ultimaFotoMs = performance.now();
      instalarGancho();
      pollAtivo = true;
      atualizarChip(nomesVistos.size + 1);
      pollLogo(80); // 1º sync já — presença + edições que chegaram no meio
    },

    async sairDaSala() {
      if (!pollAtivo) return;
      // beacon e não fetch: o "sair" costuma vir colado numa navegação,
      // que abortaria o fetch — e o boneco ficaria 2min parado na sala
      const corpo = JSON.stringify({ acao: 'sair', codigo, token });
      sairLocal();
      if (navigator.sendBeacon) {
        navigator.sendBeacon(S.api, new Blob([corpo], { type: 'application/json' }));
      } else {
        await fetch(S.api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: corpo, keepalive: true }).catch(() => {});
      }
    },

    flushSair() {
      if (!pollAtivo) return;
      const corpo = JSON.stringify({ acao: 'sair', codigo, token });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(S.api, new Blob([corpo], { type: 'application/json' }));
      } else {
        fetch(S.api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: corpo, keepalive: true }).catch(() => {});
      }
    },

    pollAgora: () => pollLogo(0),
  };
  return api2;
}
