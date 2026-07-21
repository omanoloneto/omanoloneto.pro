// Metadata por posição: o mundo (Uint8Array) só guarda o ID do bloco.
// Baús (dono + itens que guardam) e placas (autor + mensagem) precisam
// de dados extras amarrados à célula — é isso que este mapa faz.
// A chave é a MESMA de edicao.ts (x + z*SX + y*SX*SZ).
// O gancho aoMudar leva a metadata pro multiplayer (sync.ts instala só
// com sala ativa; a flag aplicandoRemoto evita eco ao aplicar remotas).
import type { Contexto, Meta, Metas } from './tipos';

export function criarMetas(ctx: Contexto): Metas {
  const { SX, SZ } = ctx.cfg.mundo;
  const mapa = new Map<number, Meta>();

  const chave = (x: number, y: number, z: number) => x + z * SX + y * SX * SZ;

  const api: Metas = {
    aoMudar: undefined,

    chaveDe: chave,

    obter(x, y, z) {
      return mapa.get(chave(x, y, z));
    },

    definir(x, y, z, meta) {
      const k = chave(x, y, z);
      mapa.set(k, normalizada(meta));
      api.aoMudar?.(k, mapa.get(k)!);
    },

    remover(x, y, z) {
      const k = chave(x, y, z);
      if (mapa.delete(k)) api.aoMudar?.(k, null);
    },

    // aplica uma metadata vinda da REDE por chave (sem re-emitir)
    aplicar(k, meta) {
      if (meta === null) mapa.delete(k);
      else mapa.set(k, normalizada(meta));
    },

    // a UI/entrega mutou o objeto no lugar (itens do baú) → normaliza e
    // re-emite pro sync
    tocar(k) {
      const m = mapa.get(k);
      if (!m) return;
      mapa.set(k, normalizada(m));
      api.aoMudar?.(k, mapa.get(k)!);
    },

    // procura o primeiro baú que satisfaz o filtro (dono, etc.)
    acharBau(filtro) {
      for (const [k, m] of mapa) {
        if (m.tipo === 'bau' && filtro(m, k)) return { chave: k, bau: m };
      }
      return null;
    },

    serializar() {
      const obj: Record<string, Meta> = {};
      for (const [k, m] of mapa) obj[k] = m;
      return obj;
    },

    carregar(obj) {
      mapa.clear();
      if (obj && typeof obj === 'object') {
        for (const k of Object.keys(obj as Record<string, unknown>)) {
          const m = (obj as Record<string, unknown>)[k];
          if (metaValida(m)) mapa.set(+k, normalizada(m));
        }
      }
    },

    limpar() {
      mapa.clear();
    },

    todos() {
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
  return {
    tipo: 'bau',
    dono: m.dono,
    itens: Array.from(m.itens, (n) => (typeof n === 'number' && n > 0 ? Math.min(999, n | 0) : 0)),
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
