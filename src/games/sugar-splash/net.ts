import { apiJson, beaconOrKeepalive, createGenerationGuard, createPoller } from '../../lib/net';
import type { Contexto, Net, RoomEvent, SyncPayload } from './tipos';

export function createNet(ctx: Contexto): Net {
  const S = ctx.cfg.sala;
  let token = '';
  let roomCode = '';
  let myName = '';
  let failures = 0;
  let lastSeq = 0;
  let lastFase = 'lobby';
  let eventQueue: RoomEvent[] = [];
  let handlers: { onSync: (r: SyncPayload) => void; onDrop: () => void } = { onSync: () => {}, onDrop: () => {} };

  const gen = createGenerationGuard();
  const poller = createPoller({
    run: sync,
    cadenceMs: () => (lastFase === 'lobby' || lastFase === 'fim' ? S.pollLobbyMs : S.pollMs),
    jitterMs: S.jitterMs,
  });

  const api = (body: Record<string, unknown>) => apiJson(S.api, body);

  function dropConnection() {
    poller.stop();
    eventQueue = [];
    handlers.onDrop();
  }

  async function sync() {
    const g = gen.capture();
    const outgoing = eventQueue;
    eventQueue = [];
    const j = ctx.jogador;
    const r = await api({
      acao: 'sync',
      codigo: roomCode,
      token,
      desde: lastSeq,
      pos: { x: +j.x.toFixed(2), y: +j.y.toFixed(2), z: +j.z.toFixed(2), yaw: +j.yaw.toFixed(3), atirando: ctx.input.atirando },
      eventos: outgoing,
    });
    if (!poller.running() || gen.stale(g)) return;
    if (!r.ok) {
      eventQueue = outgoing.concat(eventQueue);
      if (r.status === 403 || r.status === 404 || r.status === 410) {
        const back = await api({ acao: 'entrar', codigo: roomCode, nome: myName });
        if (!poller.running() || gen.stale(g)) return;
        if (back.ok) {
          token = back.json.token;
          myName = back.json.nome || myName;
          poller.schedule(200, true);
        } else {
          ctx.ui.mostrarToast('📡 A sala fechou.', 'info', 2600);
          dropConnection();
        }
        return;
      }
      failures++;
      if (failures === 3) ctx.ui.mostrarToast('📡 Reconectando…', 'info', 2000);
      poller.schedule();
      return;
    }
    failures = 0;
    const payload = r.json as SyncPayload;
    for (const ev of payload.eventos || []) {
      if (typeof ev[0] === 'number' && ev[0] > lastSeq) lastSeq = ev[0];
    }
    lastFase = payload.fase;
    handlers.onSync(payload);
    poller.schedule();
  }

  function beginSession(codigo: string, tk: string, nome: string) {
    gen.bump();
    roomCode = codigo;
    token = tk;
    myName = nome;
    lastSeq = 0;
    lastFase = 'lobby';
    eventQueue = [];
    failures = 0;
    poller.start();
    poller.schedule(150, true);
  }

  return {
    async createRoom(nome, mapa) {
      const r = await api({ acao: 'criar', nome, mapa });
      if (!r.ok) return { erro: r.json.erro || 'sem conexão com o servidor' };
      beginSession(r.json.codigo, r.json.token, r.json.nome || nome);
      return { codigo: r.json.codigo, nome: myName, team: r.json.team === 1 ? 1 : 0, mapa: r.json.mapa || 'piscina' };
    },
    async joinRoom(codigo, nome) {
      const r = await api({ acao: 'entrar', codigo, nome });
      if (!r.ok) return { erro: r.json.erro || 'sem conexão com o servidor' };
      beginSession(r.json.codigo || codigo, r.json.token, r.json.nome || nome);
      return { codigo: r.json.codigo || codigo, nome: myName, team: r.json.team === 1 ? 1 : 0, mapa: r.json.mapa || 'piscina' };
    },
    startMatch() {
      if (!poller.running()) return;
      api({ acao: 'comecar', codigo: roomCode, token }).then(() => poller.schedule(150, true));
    },
    reopenMatch() {
      if (!poller.running()) return;
      api({ acao: 'reabrir', codigo: roomCode, token }).then(() => poller.schedule(150, true));
    },
    vote(v) {
      if (!poller.running()) return;
      api({ acao: 'votar', codigo: roomCode, token, voto: v }).then(() => poller.schedule(150, true));
    },
    queueEvent(ev) {
      if (poller.running()) eventQueue.push(ev);
    },
    leave() {
      if (!token) return;
      poller.stop();
      gen.bump();
      eventQueue = [];
      beaconOrKeepalive(S.api, JSON.stringify({ acao: 'sair', codigo: roomCode, token }));
      token = '';
    },
    bind(h) {
      handlers = h;
    },
    active: () => poller.running(),
    code: () => roomCode,
  };
}
