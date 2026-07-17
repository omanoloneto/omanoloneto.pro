import type { Contexto, Nivel } from './tipos';

export function criarNivel(ctx: Contexto): Nivel {
  const { fase1, tiposLixo, cfg } = ctx;
  const mapa = fase1.mapa as readonly string[];
  const T = cfg.tile;
  const largura = mapa[0].length;

  const lixos: Nivel['lixos'] = [];
  const decoracoes: Nivel['decoracoes'] = [];
  let lixeira = { x: 0, y: 0 };

  for (let ty = 0; ty < mapa.length; ty++) {
    for (let tx = 0; tx < largura; tx++) {
      const ch = mapa[ty][tx];
      if (tiposLixo[ch]) {
        lixos.push({ x: tx * T + T / 2, y: ty * T + T / 2, tipo: tiposLixo[ch].sprite, coletado: false });
      } else if (ch === 'E') {
        lixeira = { x: tx * T, y: ty * T + T - 32 };
      } else if (ch === 'T') {
        decoracoes.push({ tipo: 'coqueiro', x: tx * T - 8, y: (ty + 2) * T - 48 });
      } else if (ch === 'U') {
        decoracoes.push({ tipo: 'guardaSol', x: tx * T - 4, y: (ty + 2) * T - 32 });
      }
    }
  }

  function charEm(tx: number, ty: number): string {
    if (tx < 0 || tx >= largura) return '#';
    if (ty < 0) return '.';
    if (ty >= mapa.length) return '#';
    return mapa[ty][tx];
  }

  const solidoEm = (tx: number, ty: number) => {
    const ch = charEm(tx, ty);
    return ch === '#' || ch === '=';
  };
  const lodoEm = (tx: number, ty: number) => charEm(tx, ty) === 'L';
  const aguaEm = (tx: number, ty: number) => charEm(tx, ty) === '~';

  const caranguejos = fase1.caranguejos.map((col) => ({
    x: col * T,
    y: 10 * T - 12,
    vx: ctx.cfg.caranguejo.vel,
    escondido: false,
  }));

  return {
    largura,
    solidoEm,
    lodoEm,
    aguaEm,
    lixos,
    caranguejos,
    lixeira,
    checkpointX: fase1.checkpointCol * T,
    spawn: { x: 2 * T, y: 10 * T - cfg.jogador.h },
    decoracoes,
  };
}
