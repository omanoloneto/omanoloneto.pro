// Metadata por posição: o mundo (Uint8Array) só guarda o ID do bloco.
// Baús (dono + itens que guardam) e placas (autor + mensagem) precisam
// de dados extras amarrados à célula — é isso que este mapa faz.
// A chave é a MESMA de edicao.ts (x + z*SX + y*SX*SZ).
// O gancho aoMudar leva a metadata pro multiplayer (sync.ts instala só
// com sala ativa; a flag aplicandoRemoto evita eco ao aplicar remotas).
import type { Ctx, Meta, MetaStore } from './types';

export function criarMetas(ctx: Ctx): MetaStore {
  const { SX, SZ, CHUNK } = ctx.cfg.mundo;
  const mapa = new Map<number, Meta>();

  const chave = (x: number, y: number, z: number) => x + z * SX + y * SX * SZ;

  function remeshFurniture(x: number, z: number, meta?: Meta, antiga?: Meta) {
    if (meta?.tipo !== 'movel' && antiga?.tipo !== 'movel') return;
    ctx.world.dirty.add(Math.floor(x / CHUNK) + Math.floor(z / CHUNK) * (SX / CHUNK));
  }

  const api: MetaStore = {
    onChange: undefined,

    keyOf: chave,

    get(x, y, z) {
      return mapa.get(chave(x, y, z));
    },

    set(x, y, z, meta) {
      const k = chave(x, y, z);
      const antiga = mapa.get(k);
      mapa.set(k, normalizada(meta));
      remeshFurniture(x, z, meta, antiga);
      api.onChange?.(k, mapa.get(k)!);
    },

    remove(x, y, z) {
      const k = chave(x, y, z);
      const antiga = mapa.get(k);
      if (mapa.delete(k)) {
        remeshFurniture(x, z, undefined, antiga);
        api.onChange?.(k, null);
      }
    },

    // aplica uma metadata vinda da REDE por chave (sem re-emitir)
    apply(k, meta) {
      const antiga = mapa.get(k);
      if (meta === null) mapa.delete(k);
      else mapa.set(k, normalizada(meta));
      remeshFurniture(k % SX, Math.floor(k / SX) % SZ, meta ?? undefined, antiga);
    },

    // a UI/entrega mutou o objeto no lugar (itens do baú) → normaliza e
    // re-emite pro sync
    touch(k) {
      const m = mapa.get(k);
      if (!m) return;
      mapa.set(k, normalizada(m));
      api.onChange?.(k, mapa.get(k)!);
    },

    // procura o primeiro baú que satisfaz o filtro (dono, etc.)
    findChest(filtro) {
      for (const [k, m] of mapa) {
        if (m.tipo === 'bau' && filtro(m, k)) return { chave: k, bau: m };
      }
      return null;
    },

    serialize() {
      const obj: Record<string, Meta> = {};
      for (const [k, m] of mapa) obj[k] = m;
      return obj;
    },

    load(obj) {
      mapa.clear();
      if (obj && typeof obj === 'object') {
        for (const k of Object.keys(obj as Record<string, unknown>)) {
          const m = (obj as Record<string, unknown>)[k];
          if (metaValida(m)) mapa.set(+k, normalizada(m));
        }
      }
    },

    clear() {
      mapa.clear();
    },

    all() {
      return mapa;
    },
  };
  return api;
}

// itens do baú SEMPRE denso (sem buracos): `itens[7] = 1` num array
// vazio vira [null×7, 1] no JSON — e null é rejeitado pelo servidor.
// Array.from converte buraco/undefined/null em 0.
function normalizada(m: Meta): Meta {
  if (m.tipo !== 'bau') return m;
  const itens = Array.from(m.itens, (n) => (typeof n === 'number' && n > 0 ? Math.min(999, n | 0) : 0));
  if (itens.length > 7) itens[7] = 0;
  return {
    tipo: 'bau',
    dono: m.dono,
    itens,
    publico: m.publico === true,
  };
}

// valida uma metadata (vinda de save antigo/rede): descarta o que não bate
export function metaValida(m: any): m is Meta {
  if (!m || typeof m !== 'object') return false;
  if (m.tipo === 'bau') {
    return typeof m.dono === 'string' && Array.isArray(m.itens);
  }
  if (m.tipo === 'placa') {
    return typeof m.autor === 'string' && typeof m.texto === 'string';
  }
  if (m.tipo === 'movel') {
    return typeof m.rot === 'number' && m.rot >= 0 && m.rot <= 3;
  }
  if (m.tipo === 'caixa') {
    if (typeof m.dono !== 'string') return false;
    return m.cols === undefined
      || (Array.isArray(m.cols) && m.cols.length <= 2048 && m.cols.every((c: unknown) => typeof c === 'number'));
  }
  if (m.tipo === 'drop') {
    return typeof m.item === 'number' && typeof m.n === 'number';
  }
  return false;
}
