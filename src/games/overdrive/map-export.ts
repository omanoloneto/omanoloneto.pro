interface ExpVia { tipo: string; nome?: string; pontos: [number, number][] }
interface ExpMarco { tipo: string; x: number; z: number; rot?: number }
interface ExpPredio { tipo?: string; x: number; z: number; w: number; d: number; h: number; cor: string; rot?: number }
interface ExpRotatoria { x: number; z: number; raioInterno: number; raioExterno: number }
interface ExpMorro { x: number; z: number; raio: number; altura: number }
export interface ExpMapa {
  vias: ExpVia[];
  predios: ExpPredio[];
  marcos: ExpMarco[];
  rotatorias: ExpRotatoria[];
  morros: ExpMorro[];
  spawn: { x: number; z: number; heading: number };
}

const ri = (v: number) => Math.round(v);
const rot = (v?: number) => (v ? `, rot: ${Math.round(v * 1e4) / 1e4}` : '');

export function buildMapaExport(mapa: ExpMapa): string {
  const via = (v: ExpVia) => `    { tipo: '${v.tipo}',${v.nome ? ` nome: '${v.nome.replace(/'/g, "\\'")}',` : ''} pontos: [${v.pontos.map((p) => `[${ri(p[0])}, ${ri(p[1])}]`).join(', ')}] },`;
  const marco = (m: ExpMarco) => `    { tipo: '${m.tipo}', x: ${ri(m.x)}, z: ${ri(m.z)}${rot(m.rot)} },`;
  const rota = (r: ExpRotatoria) => `    { x: ${ri(r.x)}, z: ${ri(r.z)}, raioInterno: ${ri(r.raioInterno)}, raioExterno: ${ri(r.raioExterno)} },`;
  const predio = (b: ExpPredio) => `    { tipo: '${b.tipo ?? 'box'}', x: ${ri(b.x)}, z: ${ri(b.z)}, w: ${ri(b.w)}, d: ${ri(b.d)}, h: ${ri(b.h)}, cor: '${b.cor}'${rot(b.rot)} },`;
  const morro = (h: ExpMorro) => `    { x: ${ri(h.x)}, z: ${ri(h.z)}, raio: ${ri(h.raio)}, altura: ${Math.round(h.altura * 10) / 10} },`;
  return [
    '  vias: [',
    mapa.vias.map(via).join('\n'),
    '  ] as Via[],',
    mapa.predios.length ? `  predios: [\n${mapa.predios.map(predio).join('\n')}\n  ] as Predio[],` : '  predios: [] as Predio[],',
    '  marcos: [',
    mapa.marcos.map(marco).join('\n'),
    '  ] as Marco[],',
    '  rotatorias: [',
    mapa.rotatorias.map(rota).join('\n'),
    '  ] as Rotatoria[],',
    mapa.morros.length ? `  morros: [\n${mapa.morros.map(morro).join('\n')}\n  ] as Morro[],` : '  morros: [] as Morro[],',
    `  spawn: { x: ${Math.round(mapa.spawn.x * 100) / 100}, z: ${Math.round(mapa.spawn.z * 100) / 100}, heading: ${Math.round(mapa.spawn.heading * 1e6) / 1e6} },`,
  ].join('\n');
}
