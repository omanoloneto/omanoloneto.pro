// Mira: raycast voxel DDA (Amanatides & Woo) do olho na direção da
// câmera + wireframe de highlight no bloco mirado.
import * as THREE from 'three';
import type { Alvo, Contexto, Mira } from './tipos';

// função pura e testável: percorre células até bater num id ≠ 0
export function lancarRaio(
  obter: (x: number, y: number, z: number) => number,
  ox: number, oy: number, oz: number,
  dx: number, dy: number, dz: number,
  maxDist: number
): Alvo | null {
  let x = Math.floor(ox);
  let y = Math.floor(oy);
  let z = Math.floor(oz);
  const celulaInicial = { x, y, z };
  const stepX = dx > 0 ? 1 : -1;
  const stepY = dy > 0 ? 1 : -1;
  const stepZ = dz > 0 ? 1 : -1;
  const tDeltaX = dx !== 0 ? Math.abs(1 / dx) : Infinity;
  const tDeltaY = dy !== 0 ? Math.abs(1 / dy) : Infinity;
  const tDeltaZ = dz !== 0 ? Math.abs(1 / dz) : Infinity;
  let tMaxX = dx !== 0 ? ((dx > 0 ? x + 1 - ox : ox - x) * tDeltaX) : Infinity;
  let tMaxY = dy !== 0 ? ((dy > 0 ? y + 1 - oy : oy - y) * tDeltaY) : Infinity;
  let tMaxZ = dz !== 0 ? ((dz > 0 ? z + 1 - oz : oz - z) * tDeltaZ) : Infinity;
  let nx = 0, ny = 0, nz = 0;
  let t = 0;

  while (t <= maxDist) {
    // pula a célula onde o olho está (nadando dentro d'água, p.ex.)
    if (!(x === celulaInicial.x && y === celulaInicial.y && z === celulaInicial.z)) {
      const id = obter(x, y, z);
      if (id !== 0) return { x, y, z, nx, ny, nz, id };
    }
    if (tMaxX < tMaxY && tMaxX < tMaxZ) {
      x += stepX; t = tMaxX; tMaxX += tDeltaX; nx = -stepX; ny = 0; nz = 0;
    } else if (tMaxY < tMaxZ) {
      y += stepY; t = tMaxY; tMaxY += tDeltaY; nx = 0; ny = -stepY; nz = 0;
    } else {
      z += stepZ; t = tMaxZ; tMaxZ += tDeltaZ; nx = 0; ny = 0; nz = -stepZ;
    }
  }
  return null;
}

export function criarMira(ctx: Contexto): Mira {
  const { scene, camera, jogador, mundo } = ctx;

  // wireframe do cubo mirado (12 arestas)
  const geo = new THREE.BufferGeometry();
  const a = -0.002;
  const b = 1.002;
  // prettier-ignore
  const pts = [
    a,a,a, b,a,a,  b,a,a, b,a,b,  b,a,b, a,a,b,  a,a,b, a,a,a, // base
    a,b,a, b,b,a,  b,b,a, b,b,b,  b,b,b, a,b,b,  a,b,b, a,b,a, // topo
    a,a,a, a,b,a,  b,a,a, b,b,a,  b,a,b, b,b,b,  a,a,b, a,b,b, // colunas
  ];
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
  const highlight = new THREE.LineSegments(
    geo,
    new THREE.LineBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.7 })
  );
  highlight.frustumCulled = false;
  highlight.visible = false;
  scene.add(highlight);

  const dir = new THREE.Vector3();

  // água é invisível pra mira (igual Minecraft): o raio atravessa e
  // acerta o fundo — dá pra construir no leito do lago sem "quebrar" água.
  // Fora do mundo idem: a "parede fantasma" que o obter devolve pro
  // culling não pode virar alvo (highlight flutuando no céu da borda)
  const { SX, SZ } = ctx.cfg.mundo;
  const obterSemAgua = (x: number, y: number, z: number) => {
    if (x < 0 || x >= SX || z < 0 || z >= SZ) return 0;
    const id = mundo.obter(x, y, z);
    return ctx.porId(id).render === 'agua' ? 0 : id;
  };

  function alvo(): Alvo | null {
    camera.getWorldDirection(dir);
    return lancarRaio(
      obterSemAgua,
      jogador.x, jogador.y + ctx.cfg.jogador.olho, jogador.z,
      dir.x, dir.y, dir.z,
      ctx.cfg.jogador.alcance
    );
  }

  return {
    alvo,
    passo() {
      const a = ctx.estado.fase === 'jogando' ? alvo() : null;
      highlight.visible = !!a;
      if (a) highlight.position.set(a.x, a.y, a.z);
    },
  };
}
