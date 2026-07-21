// Meshing dos chunks: só faces expostas (culled), com "sol" cozido no
// vertex color — sombreado por direção da face × AO fake por vértice.
// Sem luz na cena, sem shadow map: MeshBasicMaterial puro (SwiftShader).
// 3 camadas por chunk: opaca / recorte (alphaTest: vidro+flores) / água.
import * as THREE from 'three';
import type { Ctx, Meshes } from './types';

// sombreado por direção (o "sol" vem de cima)
const SOMBRA_FACE = [0.66, 0.66, 1.0, 0.5, 0.8, 0.8]; // +x -x +y -y +z -z
const BRILHO_AO = [0.55, 0.7, 0.85, 1.0];

// [verts 4×3, tangentes do AO] por face — winding CCW visto de fora,
// v0 embaixo-esquerda pros lados (textura em pé)
const FACES: Array<{
  n: [number, number, number];
  v: number[][]; // 4 cantos
  uvTopo: boolean; // topo/base usam uv girado
}> = [
  { n: [1, 0, 0], v: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], uvTopo: false },
  { n: [-1, 0, 0], v: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]], uvTopo: false },
  { n: [0, 1, 0], v: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], uvTopo: true },
  { n: [0, -1, 0], v: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], uvTopo: true },
  { n: [0, 0, 1], v: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]], uvTopo: false },
  { n: [0, 0, -1], v: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]], uvTopo: false },
];

interface Camada {
  pos: number[];
  uv: number[];
  cor: number[];
  idx: number[];
}

export function criarMalha(ctx: Ctx): Meshes {
  const { scene, world: mundo, texture: textura, byId: porId, cfg } = ctx;
  const { SX, SY, CHUNK } = cfg.mundo;
  const NCX = SX / CHUNK;

  const matOpaca = new THREE.MeshBasicMaterial({ map: textura.atlas, vertexColors: true });
  const matRecorte = new THREE.MeshBasicMaterial({
    map: textura.atlas, vertexColors: true, alphaTest: 0.5, side: THREE.DoubleSide,
  });
  const matAgua = new THREE.MeshBasicMaterial({
    map: textura.atlas, vertexColors: true, transparent: true, opacity: 0.65,
    depthWrite: false, side: THREE.DoubleSide,
  });

  // meshes[ci] = [opaca, recorte, agua] (null onde a camada é vazia)
  const meshes: Array<Array<THREE.Mesh | null>> = [];
  for (let i = 0; i < NCX * NCX; i++) meshes.push([null, null, null]);
  const materiais = [matOpaca, matRecorte, matAgua];

  // AO: bloco 'cubo' oclui; vidro/água/flor não. Fora do mundo NÃO oclui
  // (a parede fantasma do obter é só pro culling — sem ela a borda inteira
  // do mapa ganharia cantos escuros cozidos)
  const SZt = cfg.mundo.SZ;
  const obterAO = (x: number, y: number, z: number) =>
    x < 0 || x >= SX || z < 0 || z >= SZt ? 0 : mundo.get(x, y, z);
  const oclui = (id: number) => id !== 0 && porId(id).render === 'cubo';

  function empurrarFace(
    c: Camada, f: number, bx: number, by: number, bz: number,
    tile: number, comAO: boolean, afundarTopo: number, recuo: number
  ) {
    const face = FACES[f];
    const [u0, v0, u1, v1] = textura.uv(tile);
    const uvs = face.uvTopo
      ? [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]
      : [[u0, v0], [u0, v1], [u1, v1], [u1, v0]];
    const base = c.pos.length / 3;
    const sombra = SOMBRA_FACE[f];
    const ao: number[] = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
      const cv = face.v[i];
      let brilho = 1;
      if (comAO) {
        // vizinhos do canto no plano da face (deslocados pela normal)
        const [nx, ny, nz] = face.n;
        // tangentes apontando pro canto: coordenada 0 → -1, 1 → +1 (só nos eixos ⊥ à normal)
        const sx = nx !== 0 ? 0 : cv[0] * 2 - 1;
        const sy = ny !== 0 ? 0 : cv[1] * 2 - 1;
        const sz = nz !== 0 ? 0 : cv[2] * 2 - 1;
        // os dois lados = zerar uma tangente de cada vez
        let l1: boolean, l2: boolean;
        if (nx !== 0) {
          l1 = oclui(obterAO(bx + nx, by + sy, bz));
          l2 = oclui(obterAO(bx + nx, by, bz + sz));
        } else if (ny !== 0) {
          l1 = oclui(obterAO(bx + sx, by + ny, bz));
          l2 = oclui(obterAO(bx, by + ny, bz + sz));
        } else {
          l1 = oclui(obterAO(bx + sx, by, bz + nz));
          l2 = oclui(obterAO(bx, by + sy, bz + nz));
        }
        const canto = oclui(obterAO(bx + (nx || sx), by + (ny || sy), bz + (nz || sz)));
        ao[i] = l1 && l2 ? 0 : 3 - ((l1 ? 1 : 0) + (l2 ? 1 : 0) + (canto ? 1 : 0));
        brilho = BRILHO_AO[ao[i]];
      } else {
        ao[i] = 3;
      }
      let vy = by + cv[1];
      if (afundarTopo > 0 && cv[1] === 1) vy -= afundarTopo;
      const [rx, ry, rz] = face.n;
      c.pos.push(bx + cv[0] - rx * recuo, vy - ry * recuo, bz + cv[2] - rz * recuo);
      c.uv.push(uvs[i][0], uvs[i][1]);
      const luz = sombra * brilho;
      c.cor.push(luz, luz, luz);
    }
    // diagonal consistente com o AO (evita o "X" invertido nas quinas)
    if (ao[0] + ao[2] > ao[1] + ao[3]) {
      c.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    } else {
      c.idx.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
    }
  }

  function empurrarCruz(c: Camada, bx: number, by: number, bz: number, tile: number) {
    const [u0, v0, u1, v1] = textura.uv(tile);
    for (const [x0, z0, x1, z1] of [[0.14, 0.14, 0.86, 0.86], [0.86, 0.14, 0.14, 0.86]] as const) {
      const base = c.pos.length / 3;
      c.pos.push(bx + x0, by, bz + z0, bx + x1, by, bz + z1, bx + x1, by + 1, bz + z1, bx + x0, by + 1, bz + z0);
      c.uv.push(u0, v0, u1, v0, u1, v1, u0, v1);
      for (let i = 0; i < 4; i++) c.cor.push(0.95, 0.95, 0.95);
      c.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }

  // porta = painel chapado (não cubo): 1 quad fino de dois lados, 2 blocos
  // de altura. As metades compartilham o id (18 fechada / 19 aberta); qual
  // metade é (base/topo) e a orientação da folha saem dos vizinhos.
  function empurrarPorta(c: Camada, bx: number, by: number, bz: number, id: number) {
    const def = porId(id);
    const [u0, v0, u1, v1] = textura.uv(def.tiles[1]);
    const ehP = (v: number) => v === 18 || v === 19;
    const topo = ehP(mundo.get(bx, by - 1, bz)); // porta embaixo → sou o topo
    const base = ehP(mundo.get(bx, by + 1, bz)); // porta em cima → sou a base
    // UV vertical: base amostra a metade de baixo do tile, topo a de cima;
    // porta solta (1 bloco, save antigo) usa o tile inteiro
    const vm = (v0 + v1) / 2;
    const vLo = topo && !base ? vm : v0;
    const vHi = base && !topo ? vm : v1;
    // orientação: parede sólida nos lados define o eixo do batente
    const parede = (x: number, y: number, z: number) => {
      const w = mundo.get(x, y, z);
      return w !== 0 && porId(w).solido;
    };
    const eixoZ = parede(bx, by, bz - 1) && parede(bx, by, bz + 1);
    const aberta = id === 19;
    const e = 0.06; // recuo da folha aberta encostada na dobradiça
    let x0: number, z0: number, x1: number, z1: number;
    if (!eixoZ) {
      // batente ao longo de X: fechada = folha no meio (z=0.5); aberta = gira pra x=e
      if (!aberta) { x0 = 0; z0 = 0.5; x1 = 1; z1 = 0.5; }
      else { x0 = e; z0 = 0; x1 = e; z1 = 1; }
    } else {
      if (!aberta) { x0 = 0.5; z0 = 0; x1 = 0.5; z1 = 1; }
      else { x0 = 0; z0 = e; x1 = 1; z1 = e; }
    }
    const b = c.pos.length / 3;
    c.pos.push(bx + x0, by, bz + z0, bx + x1, by, bz + z1, bx + x1, by + 1, bz + z1, bx + x0, by + 1, bz + z0);
    c.uv.push(u0, vLo, u1, vLo, u1, vHi, u0, vHi);
    for (let i = 0; i < 4; i++) c.cor.push(0.9, 0.9, 0.9);
    c.idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }

  function faceVisivel(id: number, vizinho: number): boolean {
    if (vizinho === 0) return true;
    const meu = porId(id).render;
    const dele = porId(vizinho).render;
    if (dele === 'cubo') return false; // parede sólida cobre qualquer face
    // água desenha contra cruz E vidro (aquário!) — só não contra água
    if (meu === 'agua') return dele === 'cruz' || dele === 'recorte';
    return vizinho !== id; // vidro-vidro se culla, vidro-água/flor desenha
  }

  function reconstruirChunk(ci: number) {
    const cx = ci % NCX;
    const cz = Math.floor(ci / NCX);
    const camadas: Camada[] = [
      { pos: [], uv: [], cor: [], idx: [] },
      { pos: [], uv: [], cor: [], idx: [] },
      { pos: [], uv: [], cor: [], idx: [] },
    ];
    const x0 = cx * CHUNK;
    const z0 = cz * CHUNK;
    for (let y = 0; y < SY; y++) {
      for (let z = z0; z < z0 + CHUNK; z++) {
        for (let x = x0; x < x0 + CHUNK; x++) {
          const id = mundo.get(x, y, z);
          if (id === 0) continue;
          const def = porId(id);
          if (!def) continue; // id desconhecido (save de versão futura?): pula
          if (def.render === 'cruz') {
            empurrarCruz(camadas[1], x, y, z, def.tiles[0]);
            continue;
          }
          if (def.render === 'porta') {
            empurrarPorta(camadas[1], x, y, z, id);
            continue;
          }
          const camada = def.render === 'agua' ? camadas[2] : def.render === 'recorte' ? camadas[1] : camadas[0];
          const comAO = def.render === 'cubo';
          // topo da água rebaixado quando tem ar em cima (linha d'água)
          const superficie = def.render === 'agua' && mundo.get(x, y + 1, z) === 0 ? 0.12 : 0;
          for (let f = 0; f < 6; f++) {
            const n = FACES[f].n;
            const viz = mundo.get(x + n[0], y + n[1], z + n[2]);
            if (!faceVisivel(id, viz)) continue;
            const tile = f === 2 ? def.tiles[0] : f === 3 ? def.tiles[2] : def.tiles[1];
            const vizDef = viz === 0 ? null : porId(viz);
            const recuo = def.render === 'agua' && vizDef && vizDef.render === 'recorte' ? 0.0045 : 0;
            empurrarFace(camada, f, x, y, z, tile, comAO, superficie, recuo);
          }
        }
      }
    }

    for (let l = 0; l < 3; l++) {
      const velho = meshes[ci][l];
      if (velho) {
        velho.geometry.dispose();
        scene.remove(velho);
        meshes[ci][l] = null;
      }
      const c = camadas[l];
      if (!c.idx.length) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(c.pos), 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(c.uv), 2));
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(c.cor), 3));
      geo.setIndex(new THREE.BufferAttribute(new Uint32Array(c.idx), 1));
      geo.computeBoundingSphere(); // mesh ESTÁTICA: frustum culling ligado de graça
      const mesh = new THREE.Mesh(geo, materiais[l]);
      mesh.matrixAutoUpdate = false;
      if (l === 2) mesh.renderOrder = 2; // água por último (blend)
      scene.add(mesh);
      meshes[ci][l] = mesh;
    }
  }

  return {
    buildAll() {
      for (let ci = 0; ci < NCX * NCX; ci++) reconstruirChunk(ci);
      mundo.dirty.clear();
    },
    rebuildDirty() {
      if (!mundo.dirty.size) return;
      for (const ci of mundo.dirty) reconstruirChunk(ci);
      mundo.dirty.clear();
    },
    // tint dia/noite: MeshBasicMaterial.color multiplica map × vertexColor,
    // então uma cor por material escurece/tinge o mundo inteiro de graça
    tint(cor: THREE.Color) {
      matOpaca.color.copy(cor);
      matRecorte.color.copy(cor);
      matAgua.color.copy(cor);
    },
  };
}
