import type { Contexto, Dir, JogadorRemoto, Rede } from './tipos';

export function criarRede(ctx: Contexto): Rede {
  const R = ctx.cfg.rede;
  let token = '';
  let meuNome = '';
  let minhaSkin = '';
  let ativo = false;
  let sincronizando = false;
  let pollTimer = 0;
  let falhas = 0;
  const vistos = new Map<string, JogadorRemoto>();

  async function api(corpo: Record<string, unknown>) {
    const aborto = new AbortController();
    const timer = setTimeout(() => aborto.abort(), 6000);
    try {
      const r = await fetch(R.api, {
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

  function agendar() {
    if (!ativo) return;
    clearTimeout(pollTimer);
    pollTimer = window.setTimeout(sincronizar, R.pollMs + (Math.random() * 2 - 1) * R.jitterMs);
  }

  function tratar(lista: unknown) {
    if (!Array.isArray(lista)) return;
    const agora = new Set<string>();
    for (const j of lista) {
      if (!j || typeof j.nome !== 'string') continue;
      agora.add(j.nome);
      const antigo = vistos.get(j.nome);
      const alvo: JogadorRemoto = {
        nome: j.nome,
        skin: j.skin === 'cat' ? 'cat' : 'dog',
        mapa: typeof j.mapa === 'string' ? j.mapa : 'vila',
        x: antigo ? antigo.x : +j.x,
        y: antigo ? antigo.y : +j.y,
        ax: +j.x,
        ay: +j.y,
        dir: ([0, 1, 2, 3].includes(j.dir) ? j.dir : 0) as Dir,
        andando: j.andando === true,
      };
      if (!antigo) ctx.ui.mostrarToast('🙋 <b>' + j.nome + '</b> chegou na vila!', 2200);
      vistos.set(j.nome, alvo);
    }
    for (const nome of [...vistos.keys()]) {
      if (!agora.has(nome)) {
        vistos.delete(nome);
        ctx.ui.mostrarToast('👋 <b>' + nome + '</b> foi embora.', 2200);
      }
    }
    ctx.estado.online = agora.size + 1;
    ctx.ui.atualizarOnline(ctx.estado.online);
  }

  async function sincronizar() {
    if (!ativo || sincronizando) return;
    sincronizando = true;
    try {
      const j = ctx.jogador;
      const r = await api({
        acao: 'sync',
        token,
        pos: { x: +j.px.toFixed(2), y: +j.py.toFixed(2), dir: j.dir, andando: j.andando, mapa: ctx.estado.mapa },
      });
      if (!ativo) return;
      if (!r.ok) {
        if (r.status === 403) {
          const volta = await api({ acao: 'entrar', nome: meuNome, skin: minhaSkin });
          if (volta.ok) {
            token = volta.json.token;
            meuNome = volta.json.nome || meuNome;
          }
          agendar();
          return;
        }
        falhas++;
        if (falhas === 4) ctx.ui.mostrarToast('📡 Reconectando…', 2000);
        agendar();
        return;
      }
      falhas = 0;
      tratar(r.json.jogadores);
      agendar();
    } finally {
      sincronizando = false;
    }
  }

  return {
    async entrar(nome, skin) {
      const r = await api({ acao: 'entrar', nome, skin });
      if (!r.ok) return r.json.erro || 'sem-servidor';
      token = r.json.token;
      meuNome = r.json.nome || nome;
      minhaSkin = skin;
      ctx.estado.nome = meuNome;
      ativo = true;
      agendar();
      return null;
    },
    remotos() {
      const lista = [...vistos.values()].filter((r) => r.mapa === ctx.estado.mapa);
      for (const r of lista) {
        const k = 0.18;
        r.x += (r.ax - r.x) * k;
        r.y += (r.ay - r.y) * k;
      }
      return lista;
    },
    flushSair() {
      if (!ativo) return;
      ativo = false;
      clearTimeout(pollTimer);
      const corpo = JSON.stringify({ acao: 'sair', token });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(R.api, new Blob([corpo], { type: 'application/json' }));
      } else {
        fetch(R.api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: corpo, keepalive: true }).catch(() => {});
      }
    },
    ligado: () => ativo,
  };
}
