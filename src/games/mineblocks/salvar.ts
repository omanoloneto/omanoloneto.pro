// Persistência NO SERVIDOR (mundos.php): nada fica salvo no Chromebook.
// O mundo vive num arquivo do host, protegido por senha — a criança
// carrega de qualquer máquina com nome + senha.
// RLE (run Uint16 + id Uint8) → base64; auto-save com debounce.
//
// Escrita protegida contra "amigo apagou meu castelo": todo save leva o
// salvoEm que o cliente conhece (base); se o servidor tem um save MAIS
// NOVO (outra aba/outro colega), devolve conflito — o auto-save para e
// só o save manual, com confirmação da criança, passa por cima.
import { encodeRLE, decodeRLE } from '../../lib/rle';
import { gerarMundo } from './geracao';
import type { Contexto, Salvar } from './tipos';

// gerações antigas de mundo, da mais recente pra mais antiga (o load tenta
// decodificar em ordem); o recorte antigo sobe SY - sy (a superfície velha
// cai na altura da nova e o vão embaixo vira subsolo minerável)
const LEGADOS = [
  { sx: 192, sz: 192, sy: 40 },
  { sx: 96, sz: 96, sy: 40 },
];
type Legado = (typeof LEGADOS)[number];

export function criarSalvar(ctx: Contexto): Salvar {
  const S = ctx.cfg.salvar;
  let codigo = '';
  let baseSalvoEm = 0; // versão do servidor que este cliente conhece
  let conflito = false; // outro save mais novo existe: auto-save pausado
  let forcarProximo = false;
  let sujoDesdeUltimoSave = false;
  let salvandoAgora = false;
  let debounce = 0;
  let ultimoSaveMs = -Infinity; // nunca salvou: o 1º auto-save passa na hora

  function offsetsLegado(L: Legado) {
    const { SX, SZ, SY } = ctx.cfg.mundo;
    return { offX: (SX - L.sx) / 2, offZ: (SZ - L.sz) / 2, offY: SY - L.sy };
  }

  function expandLegacyWorld(legacy: Uint8Array, seed: number, L: Legado): Uint8Array {
    const { SX, SZ } = ctx.cfg.mundo;
    const { offX, offZ, offY } = offsetsLegado(L);
    gerarMundo(ctx, seed);
    const out = new Uint8Array(ctx.mundo.dados);
    for (let y = 0; y < L.sy; y++) {
      for (let z = 0; z < L.sz; z++) {
        const src = z * L.sx + y * L.sx * L.sz;
        const dst = offX + (z + offZ) * SX + (y + offY) * SX * SZ;
        out.set(legacy.subarray(src, src + L.sx), dst);
        if (y === 0) {
          // rocha-mãe antiga agora fica no meio do mundo: vira pedra pra
          // liberar a escavação do subsolo novo embaixo dela
          for (let x = 0; x < L.sx; x++) if (out[dst + x] === 14) out[dst + x] = 3;
        }
      }
    }
    return out;
  }

  function remapLegacyMetas(metas: unknown, L: Legado): unknown {
    if (!metas || typeof metas !== 'object') return metas;
    const { SX, SZ } = ctx.cfg.mundo;
    const { offX, offZ, offY } = offsetsLegado(L);
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(metas as Record<string, unknown>)) {
      const n = +k;
      if (!Number.isInteger(n) || n < 0 || n >= L.sx * L.sz * L.sy) continue;
      const x = n % L.sx;
      const z = Math.floor(n / L.sx) % L.sz;
      const y = Math.floor(n / (L.sx * L.sz));
      out[(x + offX) + (z + offZ) * SX + (y + offY) * SX * SZ] = (metas as Record<string, unknown>)[k];
    }
    return out;
  }

  function payloadAtual(): string {
    const p = ctx.jogador;
    return JSON.stringify({
      v: 7, // v7 = mundo 384×384×80 (saves 192/96 migram no load); v6 = 192×192; v5 = hora do dia; v4 = metadata; v3-v1 ainda carregam
      seed: ctx.estado.seed,
      tempoDia: Math.round(ctx.ceu.tempo()),
      jogador: { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), yaw: +p.yaw.toFixed(3), pitch: +p.pitch.toFixed(3) },
      sel: ctx.estado.sel,
      inv: ctx.estado.inventario,
      slots: ctx.estado.hotbarSlots,
      metas: ctx.metas.serializar(),
      blocos: encodeRLE(ctx.mundo.dados),
    });
  }

  async function api(corpo: Record<string, unknown>): Promise<{ ok: boolean; status: number; json: any }> {
    try {
      const r = await fetch(S.api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      });
      const json = await r.json().catch(() => ({}));
      return { ok: r.ok, status: r.status, json };
    } catch {
      return { ok: false, status: 0, json: {} };
    }
  }

  async function enviarSave(payload: string, force: boolean) {
    return api({ acao: 'salvar', codigo, payload, base: baseSalvoEm, force: force || forcarProximo });
  }

  async function salvarAgora(motivo: 'auto' | 'manual' | 'flush' = 'manual'): Promise<boolean> {
    if (!codigo || salvandoAgora) return false;
    const agora = performance.now();
    if (motivo === 'auto' && agora - ultimoSaveMs < S.minEntreSavesMs) {
      agendar(); // cedo demais: tenta de novo depois
      return false;
    }
    // conflito pendente: só o save MANUAL (com confirmação) resolve
    if (conflito && motivo !== 'manual') return false;
    const payload = payloadAtual();
    if (payload.length > S.maxPayload) {
      ctx.ui.mostrarToast('😅 O mundo ficou grande demais pra salvar!', 'err', 3000);
      return false;
    }
    clearTimeout(debounce);
    // flush no fechar da aba: melhor esforço, NUNCA passa por cima de
    // save alheio (sem force) e só marca limpo se o beacon foi aceito
    if (motivo === 'flush') {
      const corpo = JSON.stringify({ acao: 'salvar', codigo, payload, base: baseSalvoEm, force: false });
      if (navigator.sendBeacon && corpo.length < 60000) {
        if (navigator.sendBeacon(S.api, new Blob([corpo], { type: 'application/json' }))) {
          sujoDesdeUltimoSave = false;
        }
      } else {
        // >64KB o keepalive rejeita (limite da spec) — tenta mesmo assim,
        // mas NÃO marca limpo: se a página sobreviver, o retry continua
        fetch(S.api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: corpo, keepalive: true }).catch(() => {});
      }
      return true;
    }
    salvandoAgora = true;
    ctx.ui.mostrarSalvando('salvando');
    let r = await enviarSave(payload, false);
    // outro save mais novo no servidor (amigo/outra aba)
    if (r.status === 409 && r.json.erro === 'conflito') {
      if (motivo === 'manual') {
        const porCima = window.confirm(
          'Opa! Outra pessoa salvou este mundo agorinha (vocês estão jogando juntos?).\n\n' +
          'OK = salvar o MEU jogo por cima do dela\nCancelar = deixar o save dela quieto'
        );
        if (porCima) {
          r = await enviarSave(payload, true);
        } else {
          conflito = true;
          salvandoAgora = false;
          ctx.ui.mostrarSalvando('nada');
          return false;
        }
      } else {
        conflito = true;
        salvandoAgora = false;
        ctx.ui.mostrarSalvando('nada');
        ctx.ui.mostrarToast('⚠️ Outra pessoa está salvando este mundo também! Salve pelo menu de pausa pra escolher o que fazer.', 'err', 4000);
        return false;
      }
    }
    salvandoAgora = false;
    if (r.ok) {
      conflito = false;
      forcarProximo = false;
      baseSalvoEm = r.json.salvoEm || baseSalvoEm;
      ultimoSaveMs = performance.now();
      sujoDesdeUltimoSave = false;
      ctx.ui.mostrarSalvando('salvo');
      if (motivo === 'manual') {
        ctx.audio.somSalvo();
        ctx.ui.anunciar('Mundo salvo!');
      }
      return true;
    }
    ctx.ui.mostrarSalvando('erro');
    if (r.status !== 429) {
      ctx.ui.mostrarToast('📡 Não consegui salvar agora — vou tentar de novo!', 'err', 2600);
    }
    agendar(); // re-tenta no próximo ciclo
    return false;
  }

  function agendar() {
    sujoDesdeUltimoSave = true;
    clearTimeout(debounce);
    debounce = window.setTimeout(() => salvarAgora('auto'), S.debounceMs);
  }

  return {
    async criarMundo() {
      const r = await api({ acao: 'criar' });
      if (!r.ok || typeof r.json.codigo !== 'string') return r.json.erro || 'Não deu pra falar com o servidor. Tenta de novo?';
      codigo = r.json.codigo;
      baseSalvoEm = 0;
      conflito = false;
      forcarProximo = false;
      sujoDesdeUltimoSave = true;
      return null;
    },
    async carregarMundo(cod) {
      const r = await api({ acao: 'carregar', codigo: cod });
      if (!r.ok) return r.json.erro || 'Não deu pra falar com o servidor. Tenta de novo?';
      const p = r.json.payload;
      if (!p || typeof p.blocos !== 'string') {
        codigo = cod;
        baseSalvoEm = r.json.salvoEm || 0;
        conflito = false;
        forcarProximo = false;
        sujoDesdeUltimoSave = true;
        return '__NOVO__';
      }
      let migrado: Legado | null = null;
      let genMetas: Record<string, unknown> = {};
      let blocos = decodeRLE(p.blocos, ctx.mundo.dados.length, ctx.blocos.length - 1);
      if (!blocos) {
        for (const L of LEGADOS) {
          const legado = decodeRLE(p.blocos, L.sx * L.sz * L.sy, ctx.blocos.length - 1);
          if (legado) {
            blocos = expandLegacyWorld(legado, p.seed >>> 0, L);
            genMetas = ctx.metas.serializar() as Record<string, unknown>;
            migrado = L;
            break;
          }
        }
      }
      if (!blocos) return 'Esse mundo está vazio ou quebrado. 😢';
      codigo = cod;
      baseSalvoEm = r.json.salvoEm || 0;
      conflito = false;
      forcarProximo = false;
      ctx.mundo.dados.set(blocos);
      ctx.estado.seed = p.seed >>> 0;
      if (typeof p.tempoDia === 'number') ctx.ceu.definirTempo(p.tempoDia); // v<5 → fica de manhã
      ctx.metas.carregar(migrado ? Object.assign(genMetas, remapLegacyMetas(p.metas, migrado)) : p.metas); // v<4 (sem metas) → mapa vazio
      const NSLOTS = ctx.cfg.hotbarTamanho;
      ctx.estado.sel = Math.max(0, Math.min(NSLOTS - 1, p.sel | 0));
      // inventário: v2+ traz salvo; v1 (criativo antigo) migra vazio —
      // a criança re-minera os próprios blocos, nada quebra
      const inv = new Array(ctx.blocos.length).fill(0);
      if (Array.isArray(p.inv)) {
        for (let i = 0; i < inv.length; i++) {
          const n = p.inv[i];
          if (typeof n === 'number' && n > 0) inv[i] = Math.min(999, Math.floor(n));
        }
      }
      ctx.estado.inventario = inv;
      // hotbar: v3 traz os slots; v2 migra (primeiros tipos que a criança
      // tem viram atalhos); v1 fica vazia
      const slots = new Array(NSLOTS).fill(0);
      if (Array.isArray(p.slots)) {
        for (let i = 0; i < NSLOTS; i++) {
          const id = p.slots[i] | 0;
          if (id > 0 && id < ctx.blocos.length && ctx.itens.includes(id)) slots[i] = id;
        }
      } else {
        let s = 0;
        for (const id of ctx.itens) {
          if (s >= NSLOTS) break;
          if (inv[id] > 0) slots[s++] = id;
        }
      }
      ctx.estado.hotbarSlots = slots;
      const j = p.jogador || {};
      const off = migrado ? offsetsLegado(migrado) : { offX: 0, offZ: 0, offY: 0 };
      ctx.jogador.x = typeof j.x === 'number' ? j.x + off.offX : ctx.cfg.mundo.SX / 2;
      ctx.jogador.y = typeof j.y === 'number' ? j.y + off.offY : ctx.cfg.mundo.SY;
      ctx.jogador.z = typeof j.z === 'number' ? j.z + off.offZ : ctx.cfg.mundo.SZ / 2;
      ctx.jogador.yaw = typeof j.yaw === 'number' ? j.yaw : 0;
      ctx.jogador.pitch = typeof j.pitch === 'number' ? j.pitch : 0;
      sujoDesdeUltimoSave = migrado !== null;
      if (migrado) {
        agendar();
        ctx.ui.mostrarToast('🗺️ Seu mundo cresceu! Tem terras novas (e uma dungeon…) além das bordas antigas.', 'ok', 4200);
      }
      return null;
    },
    adotarMundo(cod) {
      if (codigo === cod) return;
      codigo = cod;
      baseSalvoEm = 0;
      conflito = false;
      forcarProximo = true;
      sujoDesdeUltimoSave = true;
    },
    salvarAgora,
    agendar,
    temMundo: () => codigo !== '',
    codigoMundo: () => codigo,
    sujo: () => sujoDesdeUltimoSave,
  };
}
