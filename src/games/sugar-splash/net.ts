import type { Contexto, Net, RoomEvent, SyncPayload } from './tipos';

export function createNet(ctx: Contexto): Net {
  const S = ctx.cfg.sala;
  let token = '';
  let roomCode = '';
  let myName = '';
  let isActive = false;
  let syncing = false;
  let pollTimer = 0;
  let failures = 0;
  let generation = 0;
  let lastSeq = 0;
  let lastFase = 'lobby';
  let eventQueue: RoomEvent[] = [];
  let handlers: { onSync: (r: SyncPayload) => void; onDrop: () => void } = { onSync: () => {}, onDrop: () => {} };

  async function api(body: Record<string, unknown>) {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 6000);
    try {
      const r = await fetch(S.api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: abort.signal,
      });
      const json = await r.json().catch(() => ({}));
      return { ok: r.ok, status: r.status, json };
    } catch {
      return { ok: false, status: 0, json: {} };
    } finally {
      clearTimeout(timer);
    }
  }

  function schedule(soonMs?: number) {
    if (!isActive) return;
    clearTimeout(pollTimer);
    const base = soonMs ?? (lastFase === 'lobby' || lastFase === 'fim' ? S.pollLobbyMs : S.pollMs);
    pollTimer = window.setTimeout(sync, base + (Math.random() * 2 - 1) * S.jitterMs);
  }

  function dropConnection() {
    isActive = false;
    clearTimeout(pollTimer);
    eventQueue = [];
    handlers.onDrop();
  }

  async function sync() {
    if (!isActive || syncing) return;
    syncing = true;
    const g = generation;
    const outgoing = eventQueue;
    eventQueue = [];
    try {
      const j = ctx.jogador;
      const r = await api({
        acao: 'sync',
        codigo: roomCode,
        token,
        desde: lastSeq,
        pos: { x: +j.x.toFixed(2), y: +j.y.toFixed(2), z: +j.z.toFixed(2), yaw: +j.yaw.toFixed(3), atirando: ctx.input.atirando },
        eventos: outgoing,
      });
      if (!isActive || g !== generation) return;
      if (!r.ok) {
        eventQueue = outgoing.concat(eventQueue);
        if (r.status === 403 || r.status === 404 || r.status === 410) {
          const back = await api({ acao: 'entrar', codigo: roomCode, nome: myName });
          if (!isActive || g !== generation) return;
          if (back.ok) {
            token = back.json.token;
            myName = back.json.nome || myName;
            schedule(200);
          } else {
            ctx.ui.mostrarToast('📡 A sala fechou.', 'info', 2600);
            dropConnection();
          }
          return;
        }
        failures++;
        if (failures === 3) ctx.ui.mostrarToast('📡 Reconectando…', 'info', 2000);
        schedule();
        return;
      }
      failures = 0;
      const payload = r.json as SyncPayload;
      for (const ev of payload.eventos || []) {
        if (typeof ev[0] === 'number' && ev[0] > lastSeq) lastSeq = ev[0];
      }
      lastFase = payload.fase;
      handlers.onSync(payload);
      schedule();
    } finally {
      syncing = false;
    }
  }

  function beginSession(codigo: string, tk: string, nome: string) {
    generation++;
    roomCode = codigo;
    token = tk;
    myName = nome;
    lastSeq = 0;
    lastFase = 'lobby';
    eventQueue = [];
    failures = 0;
    isActive = true;
    schedule(150);
  }

  return {
    async createRoom(nome) {
      const r = await api({ acao: 'criar', nome });
      if (!r.ok) return { erro: r.json.erro || 'sem conexão com o servidor' };
      beginSession(r.json.codigo, r.json.token, r.json.nome || nome);
      return { codigo: r.json.codigo, nome: myName, team: r.json.team === 1 ? 1 : 0 };
    },
    async joinRoom(codigo, nome) {
      const r = await api({ acao: 'entrar', codigo, nome });
      if (!r.ok) return { erro: r.json.erro || 'sem conexão com o servidor' };
      beginSession(r.json.codigo || codigo, r.json.token, r.json.nome || nome);
      return { codigo: r.json.codigo || codigo, nome: myName, team: r.json.team === 1 ? 1 : 0 };
    },
    startMatch() {
      if (!isActive) return;
      api({ acao: 'comecar', codigo: roomCode, token }).then(() => schedule(150));
    },
    reopenMatch() {
      if (!isActive) return;
      api({ acao: 'reabrir', codigo: roomCode, token }).then(() => schedule(150));
    },
    queueEvent(ev) {
      if (isActive) eventQueue.push(ev);
    },
    leave() {
      if (!token) return;
      isActive = false;
      generation++;
      clearTimeout(pollTimer);
      eventQueue = [];
      const body = JSON.stringify({ acao: 'sair', codigo: roomCode, token });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(S.api, new Blob([body], { type: 'application/json' }));
      } else {
        fetch(S.api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
      }
      token = '';
    },
    bind(h) {
      handlers = h;
    },
    active: () => isActive,
    code: () => roomCode,
  };
}
