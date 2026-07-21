// O mundo voxel: um Uint8Array único de ids de bloco (y-major) com
// get/set e o controle de chunks sujos pro re-meshing incremental.
import type { Ctx, World } from './types';

export function criarMundo(ctx: Ctx): World {
  const { SX, SZ, SY, CHUNK } = ctx.cfg.mundo;
  const NCX = SX / CHUNK; // chunks por lado
  const dados = new Uint8Array(SX * SZ * SY);
  const sujos = new Set<number>();

  function obter(x: number, y: number, z: number): number {
    if (y < 0) return 14; // embaixo do mundo: rocha (culla base e segura a física)
    if (y >= SY) return 0;
    if (x < 0 || x >= SX || z < 0 || z >= SZ) return 3; // parede: culla as faces da borda
    return dados[x + z * SX + y * SX * SZ];
  }

  function marcarSujo(x: number, z: number) {
    if (x < 0 || x >= SX || z < 0 || z >= SZ) return;
    sujos.add(Math.floor(x / CHUNK) + Math.floor(z / CHUNK) * NCX);
  }

  function definir(x: number, y: number, z: number, id: number) {
    if (x < 0 || x >= SX || z < 0 || z >= SZ || y < 0 || y >= SY) return;
    dados[x + z * SX + y * SX * SZ] = id;
    api.onChange?.(x, y, z, id); // multiplayer escuta TODA escrita daqui
    // AO alcança a diagonal: um edit na borda muda vértices do chunk vizinho
    marcarSujo(x, z);
    marcarSujo(x - 1, z); marcarSujo(x + 1, z);
    marcarSujo(x, z - 1); marcarSujo(x, z + 1);
    marcarSujo(x - 1, z - 1); marcarSujo(x + 1, z - 1);
    marcarSujo(x - 1, z + 1); marcarSujo(x + 1, z + 1);
  }

  function chaoMaisAlto(x: number, z: number): number {
    for (let y = SY - 1; y >= 0; y--) {
      const id = obter(x, y, z);
      if (id !== 0 && ctx.byId(id).solido) return y;
    }
    return 0;
  }

  const api: World = {
    data: dados,
    get: obter,
    set: definir,
    dirty: sujos,
    highestGround: chaoMaisAlto,
    clear() {
      dados.fill(0);
      sujos.clear();
    },
  };
  return api;
}
