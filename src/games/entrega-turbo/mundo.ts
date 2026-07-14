// Mundo: cidadezinha procedural derivada da grade de strings do data file.
// Chão = 1 plano com CanvasTexture (asfalto/calçadas/grama + sombras assadas);
// prédios = BoxGeometry com vertex colors mescladas em 1 draw call;
// árvores = 2 InstancedMesh. Zonas e AABBs de colisão saem da mesma grade.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Contexto, Mundo, Zona } from './tipos';

const PALETA = [0xe8b04b, 0xd97757, 0x7ba3c9, 0xa3c47e, 0xc9917b, 0xb9a3d9, 0x8fbfae, 0xd9c47e];

export function criarMundo(ctx: Contexto): Mundo {
  const { mapa, cfg, scene, porSimbolo } = ctx;
  const N = mapa.length;
  const CEL = cfg.celulaM;
  const MEIO = (N * CEL + 8) / 2; // 74 — mundo de -74 a 74
  const loteCentro = (i: number) => -MEIO + 8 + cfg.loteM / 2 + i * CEL;
  const ruaCentro = (i: number) => -MEIO + 4 + i * CEL;

  const aabbs: Mundo['aabbs'] = [];
  const zonas = new Map<string, Zona>();
  const sombras: Array<[number, number, number, number]> = [];
  const arvores: Array<[number, number]> = [];
  const geosPredios: THREE.BufferGeometry[] = [];
  const geosJanelas: THREE.BufferGeometry[] = [];

  function caixaColorida(w: number, h: number, d: number, x: number, z: number, corHex: number, comTopo: boolean) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const cor = new THREE.Color(corHex);
    const teto = cor.clone().multiplyScalar(0.75);
    const cores: number[] = [];
    const pos = geo.getAttribute('position');
    const normal = geo.getAttribute('normal');
    for (let i = 0; i < pos.count; i++) {
      const usar = normal.getY(i) > 0.5 && comTopo ? teto : cor;
      cores.push(usar.r, usar.g, usar.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cores, 3));
    geo.translate(x, h / 2, z);
    return geo;
  }

  // ----- varre a grade -----
  for (let r = 0; r < N; r++) {
    for (let q = 0; q < N; q++) {
      const sim = mapa[r][q];
      const cx = loteCentro(q);
      const cz = loteCentro(r);
      if (sim === '.') continue; // pracinha
      if (sim === 'T') {
        const nArv = 4 + ((r * 5 + q) % 3);
        for (let a = 0; a < nArv; a++) {
          arvores.push([cx + ((a * 37 + r * 13) % 14) - 7, cz + ((a * 53 + q * 17) % 14) - 7]);
        }
        continue;
      }
      if (sim === 'D') {
        geosPredios.push(caixaColorida(16, 7, 14, cx, cz - 2, 0xc9b458, true));
        geosPredios.push(caixaColorida(17, 1.2, 15, cx, cz - 2, 0x8a8578, true));
        aabbs.push({ minX: cx - 8.5, maxX: cx + 8.5, minZ: cz - 9.5, maxZ: cz + 5.5 });
        sombras.push([cx - 8.5, cz - 9.5, 17, 15]);
        zonas.set('D', { x: cx, z: cz + 14, destino: null });
        continue;
      }
      const destino = porSimbolo.get(sim);
      if (destino) {
        geosPredios.push(caixaColorida(11, 6, 10, cx, cz - 3, destino.cor, true));
        geosPredios.push(caixaColorida(12, 1, 2.4, cx, cz + 2.2, 0xffffff, false)); // toldo
        aabbs.push({ minX: cx - 6, maxX: cx + 6, minZ: cz - 8, maxZ: cz + 3.4 });
        sombras.push([cx - 6, cz - 8, 12, 11]);
        zonas.set(sim, { x: cx, z: cz + 14, destino });
        continue;
      }
      // prédio comum (determinístico pelo índice)
      const seed = r * 31 + q * 7;
      const h1 = 7 + (seed % 8);
      geosPredios.push(caixaColorida(13, h1, 13, cx - 2, cz - 2, PALETA[seed % PALETA.length], true));
      aabbs.push({ minX: cx - 8.5, maxX: cx + 4.5, minZ: cz - 8.5, maxZ: cz + 4.5 });
      sombras.push([cx - 8.5, cz - 8.5, 13, 13]);
      if (seed % 3 === 0) {
        const h2 = 5 + (seed % 4);
        geosPredios.push(caixaColorida(6, h2, 6, cx + 5.5, cz + 4, PALETA[(seed + 3) % PALETA.length], true));
        aabbs.push({ minX: cx + 2.5, maxX: cx + 8.5, minZ: cz + 1, maxZ: cz + 7 });
        sombras.push([cx + 2.5, cz + 1, 6, 6]);
      }
      // janelas na face voltada pra rua
      const nJan = 2 + (seed % 3);
      for (let j = 0; j < nJan; j++) {
        const jg = new THREE.PlaneGeometry(1.6, 2);
        const cores: number[] = [];
        for (let i = 0; i < jg.getAttribute('position').count; i++) cores.push(0.12, 0.2, 0.32);
        jg.setAttribute('color', new THREE.Float32BufferAttribute(cores, 3));
        jg.translate(cx - 2 - 4 + j * 4, 3.4, cz - 2 + 6.51);
        geosJanelas.push(jg);
      }
    }
  }

  // ----- chão (textura canvas 1024²) -----
  const chaoCanvas = document.createElement('canvas');
  chaoCanvas.width = 1024;
  chaoCanvas.height = 1024;
  {
    const g = chaoCanvas.getContext('2d')!;
    const esc = 1024 / 160; // mundo -80..80 → 0..1024
    const px = (m: number) => (m + 80) * esc;
    g.fillStyle = '#8fbf5a'; // grama
    g.fillRect(0, 0, 1024, 1024);
    g.fillStyle = '#cfc7b8'; // calçadas
    for (let r = 0; r < N; r++) {
      for (let q = 0; q < N; q++) {
        const lado = (cfg.loteM + 4) * esc;
        g.fillRect(px(loteCentro(q)) - lado / 2, px(loteCentro(r)) - lado / 2, lado, lado);
      }
    }
    g.fillStyle = '#4a4d55'; // ruas
    for (let i = 0; i <= N; i++) {
      const c1 = px(ruaCentro(i) - 4);
      g.fillRect(c1, px(-MEIO), 8 * esc, 2 * MEIO * esc);
      g.fillRect(px(-MEIO), c1, 2 * MEIO * esc, 8 * esc);
    }
    g.strokeStyle = '#e8c84a'; // faixas tracejadas
    g.lineWidth = 2;
    g.setLineDash([10, 12]);
    for (let i = 0; i <= N; i++) {
      const cc = px(ruaCentro(i));
      g.beginPath(); g.moveTo(cc, px(-MEIO)); g.lineTo(cc, px(MEIO)); g.stroke();
      g.beginPath(); g.moveTo(px(-MEIO), cc); g.lineTo(px(MEIO), cc); g.stroke();
    }
    g.setLineDash([]);
    // sombras dos prédios assadas na textura (sol a nordeste)
    g.fillStyle = 'rgba(30, 40, 30, 0.25)';
    sombras.forEach(([x, z, w, d]) => {
      g.fillRect(px(x) - 8, px(z) + 8, w * esc, d * esc);
    });
  }
  const chaoTex = new THREE.CanvasTexture(chaoCanvas);
  chaoTex.colorSpace = THREE.SRGBColorSpace;
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshLambertMaterial({ map: chaoTex }));
  chao.rotation.x = -Math.PI / 2;
  scene.add(chao);

  // ----- meshes mesclados -----
  if (geosPredios.length) {
    scene.add(new THREE.Mesh(mergeGeometries(geosPredios), new THREE.MeshLambertMaterial({ vertexColors: true })));
  }
  if (geosJanelas.length) {
    scene.add(new THREE.Mesh(mergeGeometries(geosJanelas), new THREE.MeshBasicMaterial({ vertexColors: true })));
  }

  // ----- árvores instanciadas -----
  if (arvores.length) {
    const tronco = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.3, 0.4, 1.6, 6),
      new THREE.MeshLambertMaterial({ color: 0x8a6242 }),
      arvores.length
    );
    const copa = new THREE.InstancedMesh(
      new THREE.ConeGeometry(1.7, 3.2, 7),
      new THREE.MeshLambertMaterial({ color: 0x4f9e46 }),
      arvores.length
    );
    const m = new THREE.Matrix4();
    arvores.forEach(([x, z], i) => {
      m.makeTranslation(x, 0.8, z);
      tronco.setMatrixAt(i, m);
      m.makeTranslation(x, 3.1, z);
      copa.setMatrixAt(i, m);
      aabbs.push({ minX: x - 0.7, maxX: x + 0.7, minZ: z - 0.7, maxZ: z + 0.7 });
    });
    scene.add(tronco, copa);
  }

  // ----- placas flutuantes (sprite canvas: emoji + rótulo) -----
  function fazerPlaca(texto: string, emoji: string) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 96;
    const g = c.getContext('2d')!;
    g.fillStyle = 'rgba(10, 22, 44, 0.85)';
    g.beginPath();
    g.roundRect(4, 4, 248, 88, 18);
    g.fill();
    g.strokeStyle = 'rgba(34, 224, 255, 0.8)';
    g.lineWidth = 4;
    g.stroke();
    g.font = '44px sans-serif';
    g.textAlign = 'center';
    g.fillText(emoji, 46, 64);
    g.fillStyle = '#eaf6ff';
    g.font = '800 30px Verdana, sans-serif';
    g.fillText(texto, 152, 62);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    sp.scale.set(9, 3.4, 1);
    return sp;
  }
  zonas.forEach((z, sim) => {
    const sp = sim === 'D' ? fazerPlaca('Depósito', '📦') : fazerPlaca(z.destino!.rotulo, z.destino!.emoji);
    sp.position.set(z.x, sim === 'D' ? 9.5 : 8, z.z - (sim === 'D' ? 16 : 14));
    scene.add(sp);
  });

  function noMaisProximo(x: number, z: number): [number, number] {
    let melhor: [number, number] = [0, 0];
    let dist = Infinity;
    for (let i = 0; i <= N; i++) {
      for (let j = 0; j <= N; j++) {
        const d = Math.abs(ruaCentro(i) - x) + Math.abs(ruaCentro(j) - z);
        if (d < dist) { dist = d; melhor = [i, j]; }
      }
    }
    return melhor;
  }

  function dentroDePredio(x: number, z: number) {
    for (const b of aabbs) {
      if (x > b.minX - 0.6 && x < b.maxX + 0.6 && z > b.minZ - 0.6 && z < b.maxZ + 0.6) return true;
    }
    return false;
  }

  return { zonas, aabbs, N, MEIO, loteCentro, ruaCentro, noMaisProximo, dentroDePredio };
}
