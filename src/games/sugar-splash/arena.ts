import * as THREE from 'three';
import { mulberry32 } from '../../lib/rng';
import type { Arena, Contexto, MapDef } from './tipos';
import type { Piscina, Rect } from '../../data/sugar-splash';

function texAzulejo(base: string, rejunte: string, faixa?: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, 64, 64);
  g.strokeStyle = rejunte;
  g.lineWidth = 2;
  for (let i = 0; i <= 64; i += 16) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i, 64);
    g.stroke();
    g.beginPath();
    g.moveTo(0, i);
    g.lineTo(64, i);
    g.stroke();
  }
  if (faixa) {
    g.fillStyle = faixa;
    g.fillRect(0, 24, 64, 16);
    g.strokeStyle = rejunte;
    g.strokeRect(0, 24, 64, 16);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter;
  return t;
}

function waterTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#50b8e8';
  g.fillRect(0, 0, 64, 64);
  g.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const y0 = 8 + i * 16;
    g.strokeStyle = i % 2 === 0 ? 'rgba(220,245,255,0.5)' : 'rgba(150,215,245,0.6)';
    g.beginPath();
    g.moveTo(0, y0);
    g.bezierCurveTo(16, y0 - 6, 32, y0 + 6, 48, y0 - 4);
    g.bezierCurveTo(56, y0 - 5, 60, y0, 64, y0);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter;
  return t;
}

function lockerTexture(accent: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#b8bcc0';
  g.fillRect(0, 0, 32, 64);
  g.strokeStyle = '#70767c';
  g.lineWidth = 2;
  g.strokeRect(1, 1, 30, 62);
  g.fillStyle = accent;
  g.fillRect(4, 4, 24, 56);
  g.strokeStyle = '#3a3e44';
  g.lineWidth = 1;
  g.strokeRect(4.5, 4.5, 23, 55);
  g.fillStyle = '#3a3e44';
  for (let i = 0; i < 3; i++) g.fillRect(8, 10 + i * 5, 16, 2);
  g.fillRect(22, 32, 3, 6);
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.fillRect(4, 54, 24, 6);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter;
  return t;
}

// uma "rua" inteira por parede: sequência de prédios de 3-5 unidades, cada
// um com madeira, janelas, porta e letreiro próprios — nada de fachada
// repetida colada na vizinha
type StreetPlot = { start: number; width: number; doorU: number | null; roofStyle: number };

function texRuaFaroeste(
  unidades: number,
  rng: () => number,
  memoria: { ultimos: string[] }
): { canvas: HTMLCanvasElement; plots: StreetPlot[] } {
  const PX = 32;
  const H = 160;
  const c = document.createElement('canvas');
  c.width = Math.max(PX * 2, unidades * PX);
  c.height = H;
  const g = c.getContext('2d')!;
  const tons: Array<[string, string]> = [
    ['#b58455', '#8f6238'],
    ['#a87b4b', '#7f5a30'],
    ['#c19267', '#987048'],
    ['#9b7040', '#744f26'],
    ['#8d7b60', '#6b5a42'],
    ['#a55f3a', '#7d4526'],
  ];
  const nomes = ['SALOON', 'HOTEL', 'BANCO', 'ARMAZEM', 'XERIFE', 'CORREIO', 'DOCERIA', 'BARBEARIA'];

  const predio = (ox: number, w: number): number => {
    const [base, escuro] = tons[Math.floor(rng() * tons.length)];
    g.fillStyle = base;
    g.fillRect(ox, 0, w, H);
    g.strokeStyle = 'rgba(70,44,20,0.5)';
    g.lineWidth = 2;
    const passo = 10 + Math.floor(rng() * 5);
    for (let x = ox + passo; x < ox + w; x += passo) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, H);
      g.stroke();
    }
    g.strokeStyle = 'rgba(255,235,200,0.15)';
    for (let y = 40; y < H; y += 38) {
      g.beginPath();
      g.moveTo(ox, y);
      g.lineTo(ox + w, y);
      g.stroke();
    }
    g.fillStyle = '#5e3c1e';
    g.fillRect(ox, H - 8, w, 8);
    g.fillStyle = escuro;
    g.fillRect(ox, 0, w, 22);
    g.fillStyle = '#4a2f16';
    g.fillRect(ox, 20, w, 3);

    if (w >= 90 && rng() < 0.72) {
      let idx = Math.floor(rng() * nomes.length);
      for (let t2 = 0; t2 < 4 && memoria.ultimos.includes(nomes[idx]); t2++) idx = (idx + 1) % nomes.length;
      const nome = nomes[idx];
      memoria.ultimos.push(nome);
      if (memoria.ultimos.length > 4) memoria.ultimos.shift();
      g.fillStyle = '#42280f';
      g.fillRect(ox + 8, 2, w - 16, 17);
      g.strokeStyle = '#28170a';
      g.lineWidth = 1;
      g.strokeRect(ox + 8.5, 2.5, w - 17, 16);
      g.fillStyle = '#f5e8c8';
      g.font = 'bold 13px Georgia, serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(nome, ox + w / 2, 11, w - 26);
    }

    if (w >= 64 && rng() < 0.2) {
      g.fillStyle = '#f0e6d2';
      g.beginPath();
      g.arc(ox + w / 2, 33, 8, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#54687e';
      g.beginPath();
      g.arc(ox + w / 2, 33, 5.5, 0, Math.PI * 2);
      g.fill();
    }

    const temPorta = rng() < 0.62;
    const portaLado = rng();
    const portaX = temPorta
      ? ox + (portaLado < 0.34 ? w * 0.22 : portaLado < 0.67 ? w * 0.5 : w * 0.78)
      : -999;
    const estiloPorta = Math.floor(rng() * 3);

    const nJan = w >= 120 ? 2 : rng() < 0.4 ? 2 : 1;
    const vagas = [ox + w * 0.25, ox + w * 0.75, ox + w * 0.5];
    let postas = 0;
    for (const jx of vagas) {
      if (postas >= nJan) break;
      if (temPorta && Math.abs(jx - portaX) < 26) continue;
      postas++;
      const jy = 46 + Math.floor(rng() * 12);
      const estilo = Math.floor(rng() * 3);
      if (estilo === 0) {
        g.fillStyle = '#f0e6d2';
        g.fillRect(jx - 12, jy, 24, 32);
        g.fillStyle = '#54687e';
        g.fillRect(jx - 9, jy + 3, 18, 26);
        g.strokeStyle = '#f0e6d2';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(jx, jy + 3);
        g.lineTo(jx, jy + 29);
        g.moveTo(jx - 9, jy + 16);
        g.lineTo(jx + 9, jy + 16);
        g.stroke();
      } else if (estilo === 1) {
        g.fillStyle = '#f0e6d2';
        g.fillRect(jx - 9, jy - 4, 18, 42);
        g.fillStyle = '#46586c';
        g.fillRect(jx - 6, jy - 1, 12, 36);
        g.strokeStyle = '#f0e6d2';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(jx - 6, jy + 17);
        g.lineTo(jx + 6, jy + 17);
        g.stroke();
      } else {
        g.fillStyle = escuro;
        g.fillRect(jx - 17, jy, 10, 30);
        g.fillRect(jx + 7, jy, 10, 30);
        g.fillStyle = '#f0e6d2';
        g.fillRect(jx - 8, jy, 16, 30);
        g.fillStyle = '#54687e';
        g.fillRect(jx - 5, jy + 3, 10, 24);
      }
    }

    if (temPorta) {
      if (estiloPorta === 0) {
        g.fillStyle = '#f0e6d2';
        g.fillRect(portaX - 14, 96, 28, 56);
        g.fillStyle = '#4f3018';
        g.fillRect(portaX - 11, 99, 22, 53);
        g.fillStyle = '#c9a227';
        g.fillRect(portaX + 5, 124, 3, 4);
      } else if (estiloPorta === 1) {
        g.fillStyle = '#3a2410';
        g.fillRect(portaX - 15, 96, 30, 56);
        g.fillStyle = '#8f6238';
        g.fillRect(portaX - 13, 112, 12, 26);
        g.fillRect(portaX + 1, 112, 12, 26);
        g.strokeStyle = '#5e3c1e';
        g.lineWidth = 2;
        g.strokeRect(portaX - 13, 112, 12, 26);
        g.strokeRect(portaX + 1, 112, 12, 26);
      } else {
        g.fillStyle = '#f0e6d2';
        g.fillRect(portaX - 14, 88, 28, 64);
        g.fillStyle = '#54687e';
        g.fillRect(portaX - 10, 92, 20, 12);
        g.fillStyle = '#4f3018';
        g.fillRect(portaX - 10, 107, 20, 45);
        g.fillStyle = '#c9a227';
        g.fillRect(portaX + 4, 128, 3, 4);
      }
    }

    g.fillStyle = 'rgba(40,23,10,0.85)';
    g.fillRect(ox, 0, 2, H);
    g.fillRect(ox + w - 2, 0, 2, H);
    return temPorta ? portaX : -1;
  };

  const plots: StreetPlot[] = [];
  let u = 0;
  while (u < unidades) {
    let seg = Math.min(unidades - u, 3 + Math.floor(rng() * 3));
    if (unidades - u - seg > 0 && unidades - u - seg < 3) seg = unidades - u;
    const portaPx = predio(u * PX, seg * PX);
    plots.push({ start: u, width: seg, doorU: portaPx >= 0 ? portaPx / PX : null, roofStyle: Math.floor(rng() * 4) });
    u += seg;
  }
  return { canvas: c, plots };
}

function texToldo(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 32;
  const g = c.getContext('2d')!;
  for (let x = 0; x < 64; x += 16) {
    g.fillStyle = '#c94f4f';
    g.fillRect(x, 0, 8, 32);
    g.fillStyle = '#f2e6d0';
    g.fillRect(x + 8, 0, 8, 32);
  }
  return c;
}

function texTowerBand(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 32;
  const g = c.getContext('2d')!;
  g.fillStyle = '#42280f';
  g.fillRect(0, 0, 512, 32);
  g.fillStyle = '#f5e8c8';
  g.font = 'bold 20px Georgia, serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('DOCE CITY', 128, 17);
  g.fillText('DOCE CITY', 384, 17);
  return c;
}

function texCaixote(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#c9995c';
  g.fillRect(0, 0, 64, 64);
  g.strokeStyle = '#8a6234';
  g.lineWidth = 3;
  g.strokeRect(2, 2, 60, 60);
  g.beginPath();
  g.moveTo(2, 2);
  g.lineTo(62, 62);
  g.moveTo(62, 2);
  g.lineTo(2, 62);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  return t;
}

export function criarArena(ctx: Contexto): Arena {
  const { scene, cfg, mapas } = ctx;
  const A = cfg.arena;

  const aabbs: Arena['aabbs'] = [];
  const group = new THREE.Group();
  scene.add(group);
  let mapaAtual: MapDef = mapas[0];
  let aguaTexs: THREE.CanvasTexture[] = [];
  let aguaMeshes: THREE.Mesh[] = [];
  let nuvens: THREE.Group[] = [];
  let nuvemAlcance = 0;

  function disposeAll() {
    const mats = new Set<THREE.Material>();
    group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => mats.add(x));
      else if (mat) mats.add(mat);
    });
    for (const mat of mats) {
      (mat as THREE.MeshLambertMaterial).map?.dispose();
      mat.dispose();
    }
    group.clear();
  }

  function chaoPlano(x0: number, z0: number, x1: number, z1: number, y: number, mat: THREE.Material) {
    const w = x1 - x0;
    const d = z1 - z0;
    if (w <= 0 || d <= 0) return;
    const plano = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    plano.rotation.x = -Math.PI / 2;
    plano.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
    group.add(plano);
  }

  function renderPiscina(P: Piscina) {
    const pw = P.x1 - P.x0;
    const pd = P.z1 - P.z0;
    const tPiscina = texAzulejo('#bfe6f0', '#7ab8d0');
    tPiscina.repeat.set(pw / 2, pd / 2);
    chaoPlano(P.x0, P.z0, P.x1, P.z1, P.fundo, new THREE.MeshLambertMaterial({ map: tPiscina }));

    const tLateral = texAzulejo('#bfe6f0', '#7ab8d0');
    tLateral.repeat.set(6, 1);
    const latMat = new THREE.MeshLambertMaterial({ map: tLateral });
    const profP = -P.fundo;
    const lados: Array<[number, number, number]> = [
      [(P.x0 + P.x1) / 2, P.z0, 0],
      [(P.x0 + P.x1) / 2, P.z1, 0],
      [P.x0, (P.z0 + P.z1) / 2, 1],
      [P.x1, (P.z0 + P.z1) / 2, 1],
    ];
    for (const [x, z, eixo] of lados) {
      const lat = new THREE.Mesh(new THREE.PlaneGeometry(eixo ? pd : pw, profP), latMat);
      lat.position.set(x, P.fundo / 2, z);
      lat.rotation.y = eixo ? (x < 0 ? Math.PI / 2 : -Math.PI / 2) : z < 0 ? 0 : Math.PI;
      group.add(lat);
    }

    const aguaTex = waterTexture();
    aguaTex.repeat.set(Math.max(2, pw / 3), Math.max(2, pd / 3));
    const agua = new THREE.Mesh(
      new THREE.PlaneGeometry(pw, pd),
      new THREE.MeshLambertMaterial({ map: aguaTex, transparent: true, opacity: 0.7 })
    );
    agua.rotation.x = -Math.PI / 2;
    agua.position.set((P.x0 + P.x1) / 2, -0.12, (P.z0 + P.z1) / 2);
    group.add(agua);
    aguaTexs.push(aguaTex);
    aguaMeshes.push(agua);

    const copingMat = new THREE.MeshLambertMaterial({ color: 0xf5f2ea });
    const cx = (P.x0 + P.x1) / 2;
    const cz = (P.z0 + P.z1) / 2;
    for (const [bx, bz, bw, bd] of [
      [cx, P.z0 - 0.2, pw + 0.8, 0.4],
      [cx, P.z1 + 0.2, pw + 0.8, 0.4],
      [P.x0 - 0.2, cz, 0.4, pd],
      [P.x1 + 0.2, cz, 0.4, pd],
    ] as Array<[number, number, number, number]>) {
      const coping = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.08, bd), copingMat);
      coping.position.set(bx, 0.04, bz);
      group.add(coping);
    }
  }

  function chaoComPiscinas(r: Rect, y: number, mat: THREE.Material, piscinas: Piscina[]) {
    const dentro = piscinas.filter((p) => p.x0 >= r.x0 && p.x1 <= r.x1 && p.z0 >= r.z0 && p.z1 <= r.z1);
    if (!dentro.length) {
      chaoPlano(r.x0, r.z0, r.x1, r.z1, y, mat);
      return;
    }
    const p = dentro[0];
    chaoPlano(r.x0, r.z0, r.x1, p.z0, y, mat);
    chaoPlano(r.x0, p.z1, r.x1, r.z1, y, mat);
    chaoPlano(r.x0, p.z0, p.x0, p.z1, y, mat);
    chaoPlano(p.x1, p.z0, r.x1, p.z1, y, mat);
  }

  // paredes do blueprint viram fachadas de velho oeste: cada retângulo de
  // muro ganha uma frente de loja (tábuas, janelas, porta, letreiro) e as
  // maiores levam platibanda de fachada falsa, como nas cidades de filme
  function buildBlueprint(M: MapDef) {
    const bp = M.blueprint!;
    const T = M.tema;

    const tPraca = texAzulejo(T.deck[0], T.deck[1]);
    tPraca.repeat.set(0.5, 0.5);
    const pracaMat = new THREE.MeshLambertMaterial({ map: tPraca });

    for (const r of bp.pracas) chaoComPiscinas(r, 0, pracaMat, M.piscinas);
    for (const r of bp.corredores) chaoPlano(r.x0, r.z0, r.x1, r.z1, 0.02, pracaMat);

    const OFF = 200;
    const key = (ix: number, iz: number) => (ix + OFF) * 1000 + (iz + OFF);
    const andavel = new Set<number>();
    for (const r of [...bp.pracas, ...bp.corredores]) {
      for (let ix = r.x0; ix < r.x1; ix++) {
        for (let iz = r.z0; iz < r.z1; iz++) andavel.add(key(ix, iz));
      }
    }
    const muros = new Set<number>();
    for (const k of andavel) {
      const ix = Math.floor(k / 1000) - OFF;
      const iz = (k % 1000) - OFF;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          if (!dx && !dz) continue;
          const nk = key(ix + dx, iz + dz);
          if (!andavel.has(nk)) muros.add(nk);
        }
      }
    }
    const porLinha = new Map<number, number[]>();
    for (const k of muros) {
      const ix = Math.floor(k / 1000) - OFF;
      const iz = (k % 1000) - OFF;
      if (!porLinha.has(iz)) porLinha.set(iz, []);
      porLinha.get(iz)!.push(ix);
    }
    type MuroRect = { x0: number; x1: number; z0: number; z1: number };
    const retos: MuroRect[] = [];
    let abertos = new Map<string, MuroRect>();
    for (const iz of [...porLinha.keys()].sort((a, b) => a - b)) {
      const xs = porLinha.get(iz)!.sort((a, b) => a - b);
      const runs: Array<[number, number]> = [];
      let ini = xs[0];
      let fim = xs[0];
      for (let i = 1; i < xs.length; i++) {
        if (xs[i] === fim + 1) { fim = xs[i]; continue; }
        runs.push([ini, fim]);
        ini = xs[i];
        fim = xs[i];
      }
      runs.push([ini, fim]);
      const atual = new Map<string, MuroRect>();
      for (const [a, b] of runs) {
        const chave = a + ':' + b;
        const prev = abertos.get(chave);
        if (prev && prev.z1 === iz) {
          prev.z1 = iz + 1;
          atual.set(chave, prev);
        } else {
          const r = { x0: a, x1: b + 1, z0: iz, z1: iz + 1 };
          retos.push(r);
          atual.set(chave, r);
        }
      }
      abertos = atual;
    }

    const toldoTex = new THREE.CanvasTexture(texToldo());
    toldoTex.colorSpace = THREE.SRGBColorSpace;
    toldoTex.wrapS = THREE.RepeatWrapping;
    toldoTex.magFilter = THREE.NearestFilter;
    toldoTex.repeat.set(2, 1);
    const toldoMat = new THREE.MeshLambertMaterial({ map: toldoTex, side: THREE.DoubleSide });
    const madeiraMat = new THREE.MeshLambertMaterial({ color: 0x6e4b28 });
    const cornijaMat = new THREE.MeshLambertMaterial({ color: 0x53381e });
    const posteMat = new THREE.MeshLambertMaterial({ color: 0x64431f });
    const livre = (ix: number, iz: number) => andavel.has(key(ix, iz));
    const memoriaLetreiro = { ultimos: [] as string[] };
    let vi = 0;
    for (const r of retos) {
      const w = r.x1 - r.x0;
      const d = r.z1 - r.z0;
      const len = Math.max(w, d);
      const alongX = w >= d;
      const ini = alongX ? r.x0 : r.z0;
      const rng = mulberry32((0xfa0e57e ^ (vi * 2654435761)) >>> 0);
      const hPredio = [5, 4.3, 5.6, 4.7][vi % 4];
      const rua = texRuaFaroeste(len, rng, memoriaLetreiro);
      const t = new THREE.CanvasTexture(rua.canvas);
      t.colorSpace = THREE.SRGBColorSpace;
      t.magFilter = THREE.NearestFilter;
      const fachadaMat = new THREE.MeshLambertMaterial({ map: t });
      const mats = alongX
        ? [madeiraMat, madeiraMat, madeiraMat, madeiraMat, fachadaMat, fachadaMat]
        : [fachadaMat, fachadaMat, madeiraMat, madeiraMat, madeiraMat, madeiraMat];
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, hPredio, d), mats);
      const cx = (r.x0 + r.x1) / 2;
      const cz = (r.z0 + r.z1) / 2;
      m.position.set(cx, hPredio / 2, cz);
      group.add(m);
      aabbs.push({ minX: r.x0, maxX: r.x1, minZ: r.z0, maxZ: r.z1, alt: hPredio });

      const topo = hPredio + 0.18;
      if (len >= 5) {
        const cornija = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.18, d + 0.3), cornijaMat);
        cornija.position.set(cx, hPredio + 0.09, cz);
        group.add(cornija);
        for (const p of rua.plots) {
          const centro = ini + p.start + p.width / 2;
          const px = alongX ? centro : cx;
          const pz = alongX ? cz : centro;
          const caixaTopo = (bw: number, bh: number) =>
            new THREE.Mesh(alongX ? new THREE.BoxGeometry(bw, bh, d) : new THREE.BoxGeometry(w, bh, bw), madeiraMat);
          if (p.roofStyle === 0) {
            const hh = 0.75 + rng() * 0.5;
            const plati = caixaTopo(p.width, hh);
            plati.position.set(px, topo + hh / 2, pz);
            group.add(plati);
          } else if (p.roofStyle === 1) {
            const base = caixaTopo(p.width, 0.45);
            base.position.set(px, topo + 0.225, pz);
            const degrau = caixaTopo(Math.max(1.2, p.width * 0.55), 0.55);
            degrau.position.set(px, topo + 0.72, pz);
            group.add(base, degrau);
          } else if (p.roofStyle === 2) {
            const rr = (Math.min(w, d) + 0.5) / 1.73;
            const geo = new THREE.CylinderGeometry(rr, rr, Math.max(1, p.width - 0.2), 3, 1, false, alongX ? Math.PI / 2 : Math.PI);
            const telhado = new THREE.Mesh(geo, cornijaMat);
            if (alongX) telhado.rotation.z = Math.PI / 2;
            else telhado.rotation.x = Math.PI / 2;
            telhado.position.set(px, topo + rr / 2, pz);
            group.add(telhado);
          }
          if (p.width >= 3 && rng() < 0.25) {
            const chamine = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.3, 0.35), cornijaMat);
            const desloc = (rng() < 0.5 ? -1 : 1) * (p.width / 2 - 0.6);
            chamine.position.set(alongX ? centro + desloc : px, topo + 0.65, alongX ? pz : centro + desloc);
            group.add(chamine);
          }
        }
      }

      const montarVaranda = (centro: number, dir: 1 | -1, comp: number) => {
        const prof = 1.5;
        const off = prof / 2 + 0.02;
        const deck = new THREE.Mesh(
          alongX ? new THREE.BoxGeometry(comp, 0.18, prof) : new THREE.BoxGeometry(prof, 0.18, comp),
          madeiraMat
        );
        deck.position.set(
          alongX ? centro : dir > 0 ? r.x1 + off : r.x0 - off,
          0.09,
          alongX ? (dir > 0 ? r.z1 + off : r.z0 - off) : centro
        );
        group.add(deck);
        aabbs.push(
          alongX
            ? { minX: centro - comp / 2, maxX: centro + comp / 2, minZ: dir > 0 ? r.z1 : r.z0 - prof, maxZ: dir > 0 ? r.z1 + prof : r.z0, alt: 0.18 }
            : { minX: dir > 0 ? r.x1 : r.x0 - prof, maxX: dir > 0 ? r.x1 + prof : r.x0, minZ: centro - comp / 2, maxZ: centro + comp / 2, alt: 0.18 }
        );
        const telha = new THREE.Mesh(
          alongX ? new THREE.BoxGeometry(comp, 0.08, prof + 0.4) : new THREE.BoxGeometry(prof + 0.4, 0.08, comp),
          cornijaMat
        );
        telha.position.set(
          alongX ? centro : dir > 0 ? r.x1 + off + 0.12 : r.x0 - off - 0.12,
          2.78,
          alongX ? (dir > 0 ? r.z1 + off + 0.12 : r.z0 - off - 0.12) : centro
        );
        if (alongX) telha.rotation.x = 0.16 * dir;
        else telha.rotation.z = -0.16 * dir;
        group.add(telha);
        const nPostes = comp > 3 ? 3 : 2;
        for (let i = 0; i < nPostes; i++) {
          const frac = nPostes === 2 ? (i ? 1 : -1) : i - 1;
          const pAlong = centro + frac * (comp / 2 - 0.18);
          const poste = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.6, 0.1), posteMat);
          if (alongX) poste.position.set(pAlong, 1.48, dir > 0 ? r.z1 + prof - 0.12 : r.z0 - prof + 0.12);
          else poste.position.set(dir > 0 ? r.x1 + prof - 0.12 : r.x0 - prof + 0.12, 1.48, pAlong);
          group.add(poste);
        }
      };
      const montarToldo = (centro: number, dir: 1 | -1, comp: number) => {
        const toldo = new THREE.Mesh(
          alongX ? new THREE.BoxGeometry(comp, 0.06, 1.4) : new THREE.BoxGeometry(1.4, 0.06, comp),
          toldoMat
        );
        if (alongX) {
          toldo.position.set(centro, 2.8, dir > 0 ? r.z1 + 0.62 : r.z0 - 0.62);
          toldo.rotation.x = 0.3 * dir;
        } else {
          toldo.position.set(dir > 0 ? r.x1 + 0.62 : r.x0 - 0.62, 2.8, centro);
          toldo.rotation.z = -0.3 * dir;
        }
        group.add(toldo);
        for (const ponta of [-1, 1]) {
          const poste = new THREE.Mesh(new THREE.BoxGeometry(0.09, 2.55, 0.09), posteMat);
          if (alongX) poste.position.set(centro + ponta * (comp / 2 - 0.25), 1.275, dir > 0 ? r.z1 + 1.12 : r.z0 - 1.12);
          else poste.position.set(dir > 0 ? r.x1 + 1.12 : r.x0 - 1.12, 1.275, centro + ponta * (comp / 2 - 0.25));
          group.add(poste);
        }
      };

      // a mesma textura cobre as duas faces longas e o BoxGeometry inverte o
      // eixo U na face oposta, então a porta aparece em posições espelhadas —
      // frente/fundos abaixo refazem essa conta antes de checar a rua livre
      for (const p of rua.plots) {
        if (p.doorU === null || p.width < 3) continue;
        let dir: 1 | -1 | 0 = 0;
        let dw = 0;
        if (alongX) {
          const frente = r.x0 + p.doorU;
          const fundos = r.x1 - p.doorU;
          if (livre(Math.floor(frente), r.z1)) { dir = 1; dw = frente; }
          else if (livre(Math.floor(fundos), r.z0 - 1)) { dir = -1; dw = fundos; }
        } else {
          const frente = r.z1 - p.doorU;
          const fundos = r.z0 + p.doorU;
          if (livre(r.x1, Math.floor(frente))) { dir = 1; dw = frente; }
          else if (livre(r.x0 - 1, Math.floor(fundos))) { dir = -1; dw = fundos; }
        }
        if (!dir) continue;
        const comp = Math.min(4.2, p.width - 0.6);
        const centro = Math.min(Math.max(dw, ini + p.start + comp / 2 + 0.2), ini + p.start + p.width - comp / 2 - 0.2);
        if (rng() < 0.6) montarVaranda(centro, dir, comp);
        else montarToldo(centro, dir, comp);
      }
      vi++;
    }
  }

  function buildDesertProps() {
    const rng = mulberry32(0xdec0de);
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x6e4b28 });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x53381e });
    const candyMat = new THREE.MeshLambertMaterial({ color: 0xe85898 });

    const stickMat = new THREE.MeshLambertMaterial({ color: 0xf5f2ea });
    const swirlMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    for (const [lx, lz] of [[22, 24], [-13, 4]] as Array<[number, number]>) {
      const haste = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.4, 8), stickMat);
      haste.position.set(lx, 1.7, lz);
      const doce = new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 12), candyMat);
      doce.scale.z = 0.35;
      doce.position.set(lx, 3.8, lz);
      const anel = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.14, 8, 20), swirlMat);
      anel.position.set(lx, 3.8, lz + 0.28);
      group.add(haste, doce, anel);
    }

    const barrilMat = new THREE.MeshLambertMaterial({ color: 0x8a5f34 });
    const aroMat = new THREE.MeshLambertMaterial({ color: 0x3e3e42 });
    for (const [bx, bz] of [[5.5, -4.2], [8.8, -1.5], [-14.2, 3.4], [23.2, 7.3], [-19.9, 21.4], [13.5, 24.5], [-31, 12]] as Array<[number, number]>) {
      const corpo = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.36, 0.82, 10), barrilMat);
      corpo.position.set(bx, 0.41, bz);
      group.add(corpo);
      for (const ay of [0.2, 0.62]) {
        const aro = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 10), aroMat);
        aro.position.set(bx, ay, bz);
        group.add(aro);
      }
    }

    const cactoMat = new THREE.MeshLambertMaterial({ color: 0x3f9d4e });
    for (const [gx, gz] of [[1.8, 23.2], [8.2, 24.8], [30.6, -1.2], [13.8, -15.2], [0.5, 4.5], [14.8, -25.2]] as Array<[number, number]>) {
      const s = 0.8 + rng() * 0.6;
      const corpo = new THREE.Mesh(new THREE.CylinderGeometry(0.26 * s, 0.3 * s, 1.6 * s, 8), cactoMat);
      corpo.position.set(gx, 0.8 * s, gz);
      group.add(corpo);
      const ladoBraco = [-1, 1, 0];
      const nBracos = 1 + Math.floor(rng() * 3);
      for (let i = 0; i < nBracos; i++) {
        const braco = new THREE.Mesh(new THREE.CylinderGeometry(0.13 * s, 0.13 * s, (0.6 + rng() * 0.4) * s, 8), cactoMat);
        braco.position.set(gx + ladoBraco[i] * 0.44 * s, (0.7 + rng() * 0.5) * s, gz + (i === 2 ? 0.4 * s : 0));
        group.add(braco);
      }
      if (rng() < 0.7) {
        const flor = new THREE.Mesh(new THREE.SphereGeometry(0.16 * s, 8, 6), candyMat);
        flor.position.set(gx, 1.72 * s, gz);
        group.add(flor);
      }
    }

    const tx = 16;
    const tz = 23;
    for (const [ox, oz] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]] as Array<[number, number]>) {
      const perna = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.4, 0.22), darkMat);
      perna.position.set(tx + ox, 1.7, tz + oz);
      group.add(perna);
      aabbs.push({ minX: tx + ox - 0.11, maxX: tx + ox + 0.11, minZ: tz + oz - 0.11, maxZ: tz + oz + 0.11, alt: 5 });
    }
    for (const [bw, bd, ox, oz] of [[2.1, 0.12, 0, -0.9], [2.1, 0.12, 0, 0.9], [0.12, 2.1, -0.9, 0], [0.12, 2.1, 0.9, 0]] as Array<[number, number, number, number]>) {
      const trava = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.12, bd), darkMat);
      trava.position.set(tx + ox, 1.15, tz + oz);
      group.add(trava);
    }
    const tanque = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, 1.9, 14), woodMat);
    tanque.position.set(tx, 4.35, tz);
    const tampa = new THREE.Mesh(new THREE.ConeGeometry(1.75, 0.85, 14), darkMat);
    tampa.position.set(tx, 5.7, tz);
    const faixaTex = new THREE.CanvasTexture(texTowerBand());
    faixaTex.colorSpace = THREE.SRGBColorSpace;
    faixaTex.magFilter = THREE.NearestFilter;
    const faixa = new THREE.Mesh(
      new THREE.CylinderGeometry(1.58, 1.58, 0.62, 14, 1, true),
      new THREE.MeshLambertMaterial({ map: faixaTex, side: THREE.DoubleSide })
    );
    faixa.position.set(tx, 4.45, tz);
    group.add(tanque, tampa, faixa);

    const wagon = new THREE.Group();
    const cacamba = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.45, 1.3), woodMat);
    cacamba.position.y = 0.85;
    wagon.add(cacamba);
    for (const lado of [-1, 1]) {
      const borda = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.4, 0.1), darkMat);
      borda.position.set(0, 1.22, lado * 0.62);
      wagon.add(borda);
    }
    for (const [wx, wz] of [[-0.85, -0.72], [0.85, -0.72], [-0.85, 0.72], [0.85, 0.72]] as Array<[number, number]>) {
      const roda = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.1, 12), darkMat);
      roda.rotation.x = Math.PI / 2;
      roda.position.set(wx, 0.52, wz);
      wagon.add(roda);
    }
    for (const lado of [-1, 1]) {
      const varal = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.08), woodMat);
      varal.rotation.z = 0.35;
      varal.position.set(-1.95, 0.62, lado * 0.4);
      wagon.add(varal);
    }
    wagon.rotation.y = 0.35;
    wagon.position.set(-6, 0, 8);
    group.add(wagon);
    aabbs.push({ minX: -7.6, maxX: -4.4, minZ: 6.7, maxZ: 9.3, alt: 1.15 });

    const caldaMat = new THREE.MeshLambertMaterial({ color: 0xf082b0 });
    const montarCocho = (x: number, z: number, deitadoX: boolean) => {
      const corpo = new THREE.Mesh(deitadoX ? new THREE.BoxGeometry(1.8, 0.55, 0.7) : new THREE.BoxGeometry(0.7, 0.55, 1.8), woodMat);
      corpo.position.set(x, 0.32, z);
      const calda = new THREE.Mesh(deitadoX ? new THREE.BoxGeometry(1.6, 0.06, 0.5) : new THREE.BoxGeometry(0.5, 0.06, 1.6), caldaMat);
      calda.position.set(x, 0.56, z);
      group.add(corpo, calda);
      aabbs.push(deitadoX
        ? { minX: x - 0.9, maxX: x + 0.9, minZ: z - 0.35, maxZ: z + 0.35, alt: 0.7 }
        : { minX: x - 0.35, maxX: x + 0.35, minZ: z - 0.9, maxZ: z + 0.9, alt: 0.7 });
    };
    montarCocho(-14.2, 10, false);
    montarCocho(18, 7, true);

    const montarHitch = (x: number, z: number, deitadoX: boolean) => {
      for (const ponta of [-1, 1]) {
        const poste = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, 0.1), darkMat);
        poste.position.set(deitadoX ? x + ponta * 0.8 : x, 0.5, deitadoX ? z : z + ponta * 0.8);
        group.add(poste);
      }
      const trave = new THREE.Mesh(deitadoX ? new THREE.BoxGeometry(1.9, 0.09, 0.09) : new THREE.BoxGeometry(0.09, 0.09, 1.9), woodMat);
      trave.position.set(x, 0.88, z);
      group.add(trave);
    };
    montarHitch(-1.5, 2.9, true);
    montarHitch(15, 6.9, true);
    montarHitch(15.1, -19, false);

    const cristalRosaMat = new THREE.MeshLambertMaterial({ color: 0xf5a8cc });
    const cristalBrancoMat = new THREE.MeshLambertMaterial({ color: 0xfdf4fa });
    const montarCristal = (x: number, z: number, s: number, solido: boolean) => {
      const grande = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45 * s), cristalRosaMat);
      grande.position.set(x, 0.28 * s, z);
      grande.rotation.set(0.4, rng() * 3, 0.2);
      const menor = new THREE.Mesh(new THREE.DodecahedronGeometry(0.26 * s), cristalBrancoMat);
      menor.position.set(x + 0.5 * s, 0.16 * s, z + 0.2 * s);
      menor.rotation.set(0.1, rng() * 3, 0.5);
      group.add(grande, menor);
      if (solido) aabbs.push({ minX: x - 0.5 * s, maxX: x + 0.5 * s, minZ: z - 0.45 * s, maxZ: z + 0.45 * s, alt: 0.6 });
    };
    montarCristal(-11, 22, 1.3, true);
    montarCristal(7.9, 19, 1.2, true);
    montarCristal(22.5, 9.5, 0.9, false);
    montarCristal(4.8, -15.2, 0.8, false);
    montarCristal(-22.5, 12.2, 0.85, false);

    const sacoMat = new THREE.MeshLambertMaterial({ color: 0xe8d8b8 });
    const montarSacos = (x: number, z: number) => {
      for (const [ox, oy, oz] of [[-0.35, 0.26, 0], [0.35, 0.26, 0.1], [0, 0.72, 0.05]] as Array<[number, number, number]>) {
        const saco = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), sacoMat);
        saco.scale.y = 0.62;
        saco.position.set(x + ox, oy, z + oz);
        group.add(saco);
      }
      aabbs.push({ minX: x - 0.8, maxX: x + 0.8, minZ: z - 0.5, maxZ: z + 0.5, alt: 0.9 });
    };
    montarSacos(4, -25);
    montarSacos(-30.5, 24);

    const montarCerca = (x0: number, z0: number, x1: number, z1: number) => {
      const compX = x1 - x0;
      const compZ = z1 - z0;
      const comp = Math.max(compX, compZ);
      const n = Math.max(2, Math.round(comp / 1.4) + 1);
      for (let i = 0; i < n; i++) {
        const f = i / (n - 1);
        const poste = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 0.12), darkMat);
        poste.position.set(x0 + compX * f, 0.5, z0 + compZ * f);
        group.add(poste);
      }
      for (const ty of [0.45, 0.8]) {
        const trava = new THREE.Mesh(
          compX >= compZ ? new THREE.BoxGeometry(comp + 0.2, 0.09, 0.07) : new THREE.BoxGeometry(0.07, 0.09, comp + 0.2),
          woodMat
        );
        trava.position.set((x0 + x1) / 2, ty, (z0 + z1) / 2);
        group.add(trava);
      }
      aabbs.push({ minX: x0 - 0.1, maxX: x1 + 0.1, minZ: z0 - 0.1, maxZ: z1 + 0.1, alt: 0.9 });
    };
    montarCerca(8.5, -16.8, 11.5, -16.8);
    montarCerca(19, 24.8, 22, 24.8);
  }

  function build(id: string) {
    const M = mapas.find((m) => m.id === id) || mapas[0];
    mapaAtual = M;
    disposeAll();
    aabbs.length = 0;
    aguaTexs = [];
    aguaMeshes = [];
    nuvens = [];

    const T = M.tema;
    scene.background = new THREE.Color(T.ceu);
    scene.fog = new THREE.Fog(T.ceu, T.nevoa[0], T.nevoa[1]);

    const meiaL = M.larg / 2;
    const meiaP = M.prof / 2;

    if (M.blueprint) {
      buildBlueprint(M);
    } else {
      const tParede = texAzulejo(T.perimetro[0], T.perimetro[1], T.perimetro[2]);
      tParede.repeat.set(10, 1.6);
      const paredeMat = new THREE.MeshLambertMaterial({ map: tParede });
      const P = M.piscinas[0];
      for (const [x0, z0, x1, z1] of [
        [-meiaL, -meiaP, meiaL, P.z0],
        [-meiaL, P.z1, meiaL, meiaP],
        [-meiaL, P.z0, P.x0, P.z1],
        [P.x1, P.z0, meiaL, P.z1],
      ] as Array<[number, number, number, number]>) {
        const tex = texAzulejo(T.deck[0], T.deck[1]);
        tex.repeat.set((x1 - x0) / 2, (z1 - z0) / 2);
        chaoPlano(x0, z0, x1, z1, 0, new THREE.MeshLambertMaterial({ map: tex }));
      }
      const bordas: Array<[number, number, number, number]> = [
        [0, -meiaP, M.larg, 0.6],
        [0, meiaP, M.larg, 0.6],
        [-meiaL, 0, 0.6, M.prof],
        [meiaL, 0, 0.6, M.prof],
      ];
      for (const [x, z, w, d] of bordas) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(w, A.alturaParede, d), paredeMat);
        p.position.set(x, A.alturaParede / 2, z);
        group.add(p);
        aabbs.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, alt: A.alturaParede });
      }
    }

    for (const p of M.piscinas) renderPiscina(p);

    const tCaixote = texCaixote();
    const caixoteMat = new THREE.MeshLambertMaterial({ map: tCaixote });
    for (const cx of M.caixotes) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(cx.w, 1.6, cx.d), caixoteMat);
      const yBase = cx.h - 1.6;
      m.position.set(cx.x, yBase + 0.8, cx.z);
      group.add(m);
      aabbs.push({ minX: cx.x - cx.w / 2, maxX: cx.x + cx.w / 2, minZ: cx.z - cx.d / 2, maxZ: cx.z + cx.d / 2, alt: cx.h });
    }

    if (M.vestiarios) {
      const P = M.piscinas[0];
      const LR = A.lockerRoom;
      const benchMat = new THREE.MeshLambertMaterial({ color: 0xb98a56 });
      const porcelainMat = new THREE.MeshLambertMaterial({ color: 0xf8f8f2 });
      const knobMat = new THREE.MeshLambertMaterial({ color: 0x8a9098 });
      const buildLockerRoom = (side: number, theme: { tile: [string, string, string]; floor: [string, string]; accent: string }) => {
        const wallTex = texAzulejo(theme.tile[0], theme.tile[1], theme.tile[2]);
        wallTex.repeat.set(5, 1.4);
        const wallMat = new THREE.MeshLambertMaterial({ map: wallTex });
        const floorTex = texAzulejo(theme.floor[0], theme.floor[1]);
        floorTex.repeat.set(3.2, 16);
        const floorMat = new THREE.MeshLambertMaterial({ map: floorTex });
        const lockerTex = lockerTexture(theme.accent);
        lockerTex.repeat.set(10, 1);
        const lockerMat = new THREE.MeshLambertMaterial({ map: lockerTex });
        const stallTex = texAzulejo(theme.tile[0], theme.tile[1]);
        stallTex.repeat.set(2, 3);
        const stallMat = new THREE.MeshLambertMaterial({ map: stallTex });

        const floor = new THREE.Mesh(new THREE.PlaneGeometry(6.4, M.prof), floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(side * 24.5, 0.01, 0);
        group.add(floor);

        const backTex = texAzulejo(theme.tile[0], theme.tile[1], theme.tile[2]);
        backTex.repeat.set(16, 1.9);
        const backMat = new THREE.MeshLambertMaterial({ map: backTex });
        const backLiner = new THREE.Mesh(new THREE.PlaneGeometry(M.prof, LR.wallH), backMat);
        backLiner.position.set(side * (meiaL - 0.31), LR.wallH / 2, 0);
        backLiner.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
        group.add(backLiner);

        const capTex = texAzulejo(theme.tile[0], theme.tile[1], theme.tile[2]);
        capTex.repeat.set(3.2, 1.9);
        const capMat = new THREE.MeshLambertMaterial({ map: capTex });
        for (const sz of [-1, 1]) {
          const capLiner = new THREE.Mesh(new THREE.PlaneGeometry(6.4, LR.wallH), capMat);
          capLiner.position.set(side * 24.5, LR.wallH / 2, sz * (meiaP - 0.31));
          capLiner.rotation.y = sz < 0 ? 0 : Math.PI;
          group.add(capLiner);
        }

        const segments = [
          { z: -11.75, len: 8.5 },
          { z: 0, len: 9 },
          { z: 11.75, len: 8.5 },
        ];
        for (const s of segments) {
          const wall = new THREE.Mesh(new THREE.BoxGeometry(0.6, LR.wallH, s.len), wallMat);
          wall.position.set(side * LR.innerX, LR.wallH / 2, s.z);
          group.add(wall);
          aabbs.push({ minX: side * LR.innerX - 0.3, maxX: side * LR.innerX + 0.3, minZ: s.z - s.len / 2, maxZ: s.z + s.len / 2, alt: LR.wallH });
        }

        for (const pz of [-9.5, -7.5, -5.5, -3.5, -1.5, 0.5]) {
          const partition = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.8, 0.1), stallMat);
          partition.position.set(side * 26.85, 1.15, pz);
          group.add(partition);
          for (const fx of [-0.75, 0.75]) {
            const foot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.08), knobMat);
            foot.position.set(side * 26.85 + fx, 0.125, pz);
            group.add(foot);
          }
          aabbs.push({ minX: side * 26.85 - 0.85, maxX: side * 26.85 + 0.85, minZ: pz - 0.05, maxZ: pz + 0.05, alt: 2.05 });
        }

        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.15, 10.4), stallMat);
        rail.position.set(side * 26.0, 2.0, -4.5);
        group.add(rail);

        const doorAngles = [1.15, 0.85, 1.35, 0.95, 1.2];
        for (let i = 0; i < 5; i++) {
          const hz = -9.45 + i * 2;
          const ang = doorAngles[i];
          const door = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.6, 1.0), stallMat);
          door.position.set(side * (26.0 - Math.sin(ang) * 0.5), 1.05, hz + Math.cos(ang) * 0.5);
          door.rotation.y = -side * ang;
          const knob = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), knobMat);
          knob.position.set(0.08, 0, 0.4);
          door.add(knob);
          group.add(door);
        }

        for (let i = 0; i < 5; i++) {
          const zc = -8.5 + i * 2;
          const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.13, 0.3, 8), porcelainMat);
          bowl.position.set(side * 27.25, 0.15, zc);
          const seat = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.05, 0.42), porcelainMat);
          seat.position.set(side * 27.25, 0.33, zc);
          const tank = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.45, 0.4), porcelainMat);
          tank.position.set(side * 27.6, 0.55, zc);
          group.add(bowl, seat, tank);
        }

        const lockers = new THREE.Mesh(new THREE.BoxGeometry(0.55, 2.1, 6.0), lockerMat);
        lockers.position.set(side * 27.42, 1.05, 5.0);
        group.add(lockers);
        aabbs.push({ minX: side * 27.42 - 0.275, maxX: side * 27.42 + 0.275, minZ: 2, maxZ: 8, alt: 2.1 });

        const plank = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 4), benchMat);
        plank.position.set(side * 25.6, 0.48, 5);
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.06, 3.6), benchMat);
        shelf.position.set(side * 25.6, 0.16, 5);
        group.add(plank, shelf);
        for (const lz of [3.4, 6.6]) {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.46, 0.12), benchMat);
          leg.position.set(side * 25.6, 0.23, lz);
          group.add(leg);
        }
        aabbs.push({ minX: side * 25.6 - 0.25, maxX: side * 25.6 + 0.25, minZ: 3, maxZ: 7, alt: 0.52 });

        const roofMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(theme.accent) });
        const roof = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.25, M.prof), roofMat);
        roof.position.set(side * 24.55, LR.wallH + 0.12, 0);
        group.add(roof);
      };

      buildLockerRoom(-1, { tile: ['#d8e6f4', '#a0b8cc', '#3878c0'], floor: ['#cfe0f0', '#9ab4c8'], accent: '#3878c0' });
      buildLockerRoom(1, { tile: ['#f4dcd8', '#cca0a0', '#d04838'], floor: ['#f0d4d0', '#c89a96'], accent: '#d04838' });

      const brancoMat = new THREE.MeshLambertMaterial({ color: 0xf5f2ea });
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 0.5), brancoMat);
      base.position.set(0, 0.7, P.z1 + 1.2);
      group.add(base);
      const tabua = new THREE.Mesh(new THREE.BoxGeometry(1, 0.12, 3.4), new THREE.MeshLambertMaterial({ color: 0x58c8e8 }));
      tabua.position.set(0, 1.4, P.z1 - 0.6);
      group.add(tabua);
      aabbs.push({ minX: -0.25, maxX: 0.25, minZ: P.z1 + 0.95, maxZ: P.z1 + 1.45, alt: 1.4 });

      const escadaMat = new THREE.MeshLambertMaterial({ color: 0xc0c8d0 });
      for (const ex of [P.x0 + 0.4, P.x1 - 0.4]) {
        const e1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.6, 0.08), escadaMat);
        e1.position.set(ex, -0.6, P.z0 + 0.5);
        const e2 = e1.clone();
        e2.position.z = P.z0 + 1.1;
        group.add(e1, e2);
      }
    }

    if (M.id === 'deserto') buildDesertProps();

    group.add(new THREE.HemisphereLight(0xeaf6ff, 0x9a9585, 1.1));
    const sol = new THREE.DirectionalLight(T.sol, 1.1);
    sol.position.set(20, 30, 12);
    group.add(sol);

    const solDisco = new THREE.Mesh(
      new THREE.SphereGeometry(5.2, 14, 10),
      new THREE.MeshBasicMaterial({ color: 0xffc93c, fog: false })
    );
    solDisco.position.set(46, 64, 28);
    const solHalo = new THREE.Mesh(
      new THREE.SphereGeometry(7.2, 14, 10),
      new THREE.MeshBasicMaterial({ color: 0xffefb0, transparent: true, opacity: 0.5, fog: false })
    );
    solHalo.position.copy(solDisco.position);
    group.add(solDisco, solHalo);

    nuvemAlcance = Math.max(M.larg, M.prof) / 2 + 25;
    const nuvemMat = new THREE.MeshBasicMaterial({ color: 0xfffdf8, transparent: true, opacity: 0.95 });
    const rngNuvens = mulberry32(0x50fa1a);
    for (let i = 0; i < 9; i++) {
      const nuvem = new THREE.Group();
      const partes = 3 + Math.floor(rngNuvens() * 3);
      for (let p = 0; p < partes; p++) {
        const raio = 1.5 + rngNuvens() * 1.7;
        const bola = new THREE.Mesh(new THREE.SphereGeometry(raio, 10, 8), nuvemMat);
        bola.scale.y = 0.5;
        bola.position.set((p - (partes - 1) / 2) * raio * 1.15, rngNuvens() * 0.7, (rngNuvens() - 0.5) * 2.2);
        nuvem.add(bola);
      }
      nuvem.position.set(-nuvemAlcance + rngNuvens() * 2 * nuvemAlcance, 26 + rngNuvens() * 11, -nuvemAlcance + rngNuvens() * 2 * nuvemAlcance);
      nuvem.userData.baseX = nuvem.position.x + nuvemAlcance;
      nuvem.userData.vel = 0.5 + rngNuvens() * 0.9;
      group.add(nuvem);
      nuvens.push(nuvem);
    }
  }

  function dentroPiscina(x: number, z: number): boolean {
    for (const P of mapaAtual.piscinas) {
      if (x > P.x0 && x < P.x1 && z > P.z0 && z < P.z1) return true;
    }
    return false;
  }

  function chaoEm(x: number, z: number): number {
    let alt = 0;
    for (const P of mapaAtual.piscinas) {
      if (x > P.x0 && x < P.x1 && z > P.z0 && z < P.z1) alt = P.fundo;
    }
    for (const b of aabbs) {
      if (b.alt <= 3.5 && x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ) {
        alt = Math.max(alt, b.alt);
      }
    }
    return alt;
  }

  function passo(ts: number) {
    for (const t of aguaTexs) {
      t.offset.x = (ts / 14000) % 1;
      t.offset.y = (ts / 23000) % 1;
    }
    if (!ctx.motionReduzido) {
      for (const m of aguaMeshes) m.position.y = -0.12 + Math.sin(ts / 700) * 0.02;
      const faixa = nuvemAlcance * 2;
      for (const n of nuvens) {
        n.position.x = ((n.userData.baseX + (ts / 1000) * n.userData.vel) % faixa) - nuvemAlcance;
      }
    }
  }

  build(mapaAtual.id);

  return { aabbs, chaoEm, dentroPiscina, passo, build, mapa: () => mapaAtual };
}
