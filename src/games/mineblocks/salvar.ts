import { encodeRLE, decodeRLE } from '../../lib/rle';
import { gerarMundo } from './geracao';
import type { Ctx, Save } from './types';

const LEGACY_SIZES = [
  { sx: 192, sz: 192, sy: 40 },
  { sx: 96, sz: 96, sy: 40 },
];
type LegacySize = (typeof LEGACY_SIZES)[number];

export function criarSalvar(ctx: Ctx): Save {
  const S = ctx.cfg.salvar;
  let code = '';
  let baseSavedAt = 0;
  let conflict = false;
  let forceNext = false;
  let dirtySinceLastSave = false;
  let savingNow = false;
  let debounce = 0;
  let lastSaveMs = -Infinity;

  function legacyOffsets(L: LegacySize) {
    const { SX, SZ, SY } = ctx.cfg.mundo;
    return { offX: (SX - L.sx) / 2, offZ: (SZ - L.sz) / 2, offY: SY - L.sy };
  }

  function expandLegacyWorld(legacy: Uint8Array, seed: number, L: LegacySize): Uint8Array {
    const { SX, SZ } = ctx.cfg.mundo;
    const { offX, offZ, offY } = legacyOffsets(L);
    gerarMundo(ctx, seed);
    const out = new Uint8Array(ctx.world.data);
    for (let y = 0; y < L.sy; y++) {
      for (let z = 0; z < L.sz; z++) {
        const src = z * L.sx + y * L.sx * L.sz;
        const dst = offX + (z + offZ) * SX + (y + offY) * SX * SZ;
        out.set(legacy.subarray(src, src + L.sx), dst);
        if (y === 0) {
          for (let x = 0; x < L.sx; x++) if (out[dst + x] === 14) out[dst + x] = 3;
        }
      }
    }
    return out;
  }

  function remapLegacyMetas(metas: unknown, L: LegacySize): unknown {
    if (!metas || typeof metas !== 'object') return metas;
    const { SX, SZ } = ctx.cfg.mundo;
    const { offX, offZ, offY } = legacyOffsets(L);
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

  function currentPayload(): string {
    const p = ctx.player;
    return JSON.stringify({
      v: 7,
      seed: ctx.state.seed,
      tempoDia: Math.round(ctx.sky.time()),
      jogador: { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), yaw: +p.yaw.toFixed(3), pitch: +p.pitch.toFixed(3) },
      sel: ctx.state.sel,
      inv: ctx.state.inventory,
      slots: ctx.state.hotbarSlots,
      fome: ctx.state.fome,
      metas: ctx.metas.serialize(),
      blocos: encodeRLE(ctx.world.data),
    });
  }

  async function api(body: Record<string, unknown>): Promise<{ ok: boolean; status: number; json: any }> {
    try {
      const r = await fetch(S.api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await r.json().catch(() => ({}));
      return { ok: r.ok, status: r.status, json };
    } catch {
      return { ok: false, status: 0, json: {} };
    }
  }

  async function sendSave(payload: string, force: boolean) {
    return api({ acao: 'salvar', codigo: code, payload, base: baseSavedAt, force: force || forceNext });
  }

  async function saveNow(reason: 'auto' | 'manual' | 'flush' = 'manual'): Promise<boolean> {
    if (!code || savingNow) return false;
    const now = performance.now();
    if (reason === 'auto' && now - lastSaveMs < S.minEntreSavesMs) {
      schedule();
      return false;
    }
    if (conflict && reason !== 'manual') return false;
    const payload = currentPayload();
    if (payload.length > S.maxPayload) {
      ctx.ui.showToast('😅 O mundo ficou grande demais pra salvar!', 'err', 3000);
      return false;
    }
    clearTimeout(debounce);
    if (reason === 'flush') {
      const body = JSON.stringify({ acao: 'salvar', codigo: code, payload, base: baseSavedAt, force: false });
      if (navigator.sendBeacon && body.length < 60000) {
        if (navigator.sendBeacon(S.api, new Blob([body], { type: 'application/json' }))) {
          dirtySinceLastSave = false;
        }
      } else {
        fetch(S.api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
      }
      return true;
    }
    savingNow = true;
    ctx.ui.showSaving('salvando');
    let r = await sendSave(payload, false);
    if (r.status === 409 && r.json.erro === 'conflito') {
      if (reason === 'manual') {
        const overwrite = window.confirm(
          'Opa! Outra pessoa salvou este mundo agorinha (vocês estão jogando juntos?).\n\n' +
          'OK = salvar o MEU jogo por cima do dela\nCancelar = deixar o save dela quieto'
        );
        if (overwrite) {
          r = await sendSave(payload, true);
        } else {
          conflict = true;
          savingNow = false;
          ctx.ui.showSaving('nada');
          return false;
        }
      } else {
        conflict = true;
        savingNow = false;
        ctx.ui.showSaving('nada');
        ctx.ui.showToast('⚠️ Outra pessoa está salvando este mundo também! Salve pelo menu de pausa pra escolher o que fazer.', 'err', 4000);
        return false;
      }
    }
    savingNow = false;
    if (r.ok) {
      conflict = false;
      forceNext = false;
      baseSavedAt = r.json.salvoEm || baseSavedAt;
      lastSaveMs = performance.now();
      dirtySinceLastSave = false;
      ctx.ui.showSaving('salvo');
      if (reason === 'manual') {
        ctx.audio.soundSaved();
        ctx.ui.announce('World salvo!');
      }
      return true;
    }
    ctx.ui.showSaving('erro');
    if (r.status !== 429) {
      ctx.ui.showToast('📡 Não consegui salvar agora — vou tentar de novo!', 'err', 2600);
    }
    schedule();
    return false;
  }

  function schedule() {
    dirtySinceLastSave = true;
    clearTimeout(debounce);
    debounce = window.setTimeout(() => saveNow('auto'), S.debounceMs);
  }

  return {
    async createWorld() {
      const r = await api({ acao: 'criar' });
      if (!r.ok || typeof r.json.codigo !== 'string') return r.json.erro || 'Não deu pra falar com o servidor. Tenta de novo?';
      code = r.json.codigo;
      baseSavedAt = 0;
      conflict = false;
      forceNext = false;
      dirtySinceLastSave = true;
      return null;
    },
    async loadWorld(cod: string) {
      const r = await api({ acao: 'carregar', codigo: cod });
      if (!r.ok) return r.json.erro || 'Não deu pra falar com o servidor. Tenta de novo?';
      const p = r.json.payload;
      if (!p || typeof p.blocos !== 'string') {
        code = cod;
        baseSavedAt = r.json.salvoEm || 0;
        conflict = false;
        forceNext = false;
        dirtySinceLastSave = true;
        return '__NOVO__';
      }
      let migrated: LegacySize | null = null;
      let genMetas: Record<string, unknown> = {};
      let blocks = decodeRLE(p.blocos, ctx.world.data.length, ctx.blocks.length - 1);
      if (!blocks) {
        for (const L of LEGACY_SIZES) {
          const legacy = decodeRLE(p.blocos, L.sx * L.sz * L.sy, ctx.blocks.length - 1);
          if (legacy) {
            blocks = expandLegacyWorld(legacy, p.seed >>> 0, L);
            genMetas = ctx.metas.serialize() as Record<string, unknown>;
            migrated = L;
            break;
          }
        }
      }
      if (!blocks) return 'Esse mundo está vazio ou quebrado. 😢';
      code = cod;
      baseSavedAt = r.json.salvoEm || 0;
      conflict = false;
      forceNext = false;
      ctx.world.data.set(blocks);
      ctx.state.seed = p.seed >>> 0;
      if (typeof p.tempoDia === 'number') ctx.sky.setTime(p.tempoDia);
      ctx.metas.load(migrated ? Object.assign(genMetas, remapLegacyMetas(p.metas, migrated)) : p.metas);
      const NSLOTS = ctx.cfg.hotbarTamanho;
      ctx.state.sel = Math.max(0, Math.min(NSLOTS - 1, p.sel | 0));
      const inv = new Array(ctx.blocks.length).fill(0);
      if (Array.isArray(p.inv)) {
        for (let i = 0; i < inv.length; i++) {
          const n = p.inv[i];
          if (typeof n === 'number' && n > 0) inv[i] = Math.min(999, Math.floor(n));
        }
      }
      ctx.state.inventory = inv;
      const slots = new Array(NSLOTS).fill(0);
      if (Array.isArray(p.slots)) {
        for (let i = 0; i < NSLOTS; i++) {
          const id = p.slots[i] | 0;
          if (id > 0 && id < ctx.blocks.length && ctx.items.includes(id)) slots[i] = id;
        }
      } else {
        let s = 0;
        for (const id of ctx.items) {
          if (s >= NSLOTS) break;
          if (inv[id] > 0) slots[s++] = id;
        }
      }
      ctx.state.hotbarSlots = slots;
      const maxFome = ctx.cfg.fome.max;
      ctx.state.fome = typeof p.fome === 'number' ? Math.max(0, Math.min(maxFome, Math.floor(p.fome))) : maxFome;
      ctx.hunger.reset();
      const j = p.jogador || {};
      const off = migrated ? legacyOffsets(migrated) : { offX: 0, offZ: 0, offY: 0 };
      ctx.player.x = typeof j.x === 'number' ? j.x + off.offX : ctx.cfg.mundo.SX / 2;
      ctx.player.y = typeof j.y === 'number' ? j.y + off.offY : ctx.cfg.mundo.SY;
      ctx.player.z = typeof j.z === 'number' ? j.z + off.offZ : ctx.cfg.mundo.SZ / 2;
      ctx.player.yaw = typeof j.yaw === 'number' ? j.yaw : 0;
      ctx.player.pitch = typeof j.pitch === 'number' ? j.pitch : 0;
      dirtySinceLastSave = migrated !== null;
      if (migrated) {
        schedule();
        ctx.ui.showToast('🗺️ Seu mundo cresceu! Tem terras novas (e uma dungeon…) além das bordas antigas.', 'ok', 4200);
      }
      return null;
    },
    adoptWorld(cod) {
      if (code === cod) return;
      code = cod;
      baseSavedAt = 0;
      conflict = false;
      forceNext = true;
      dirtySinceLastSave = true;
    },
    saveNow,
    schedule,
    hasWorld: () => code !== '',
    worldCode: () => code,
    dirty: () => dirtySinceLastSave,
  };
}
