import * as THREE from 'three';
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

function texFaroeste(letreiro: string | null, janelas: number, porta: boolean): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 96;
  c.height = 120;
  const g = c.getContext('2d')!;
  g.fillStyle = '#b58455';
  g.fillRect(0, 0, 96, 120);
  g.strokeStyle = 'rgba(90,58,30,0.55)';
  g.lineWidth = 2;
  for (let x = 0; x <= 96; x += 12) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, 120);
    g.stroke();
  }
  g.strokeStyle = 'rgba(255,235,200,0.18)';
  for (let y = 30; y < 120; y += 30) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(96, y);
    g.stroke();
  }
  g.fillStyle = '#7c5430';
  g.fillRect(0, 112, 96, 8);
  g.fillStyle = '#8f6238';
  g.fillRect(0, 0, 96, 16);
  g.fillStyle = '#5e3e20';
  g.fillRect(0, 14, 96, 3);
  if (letreiro) {
    g.fillStyle = '#4a3018';
    g.fillRect(6, 1, 84, 13);
    g.strokeStyle = '#2e1c0c';
    g.lineWidth = 1;
    g.strokeRect(6.5, 1.5, 83, 12);
    g.fillStyle = '#f5e8c8';
    g.font = 'bold 10px Georgia, serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(letreiro, 48, 8);
  }
  const jx = janelas === 1 ? [48] : porta ? [20, 76] : [28, 68];
  for (const x of jx) {
    g.fillStyle = '#f0e6d2';
    g.fillRect(x - 11, 40, 22, 30);
    g.fillStyle = '#54687e';
    g.fillRect(x - 8, 43, 16, 24);
    g.strokeStyle = '#f0e6d2';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(x, 43);
    g.lineTo(x, 67);
    g.stroke();
    g.beginPath();
    g.moveTo(x - 8, 55);
    g.lineTo(x + 8, 55);
    g.stroke();
  }
  if (porta) {
    g.fillStyle = '#f0e6d2';
    g.fillRect(35, 70, 26, 48);
    g.fillStyle = '#5a3a20';
    g.fillRect(38, 73, 20, 45);
    g.fillStyle = '#c9a227';
    g.fillRect(54, 94, 3, 3);
  }
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
    const tCorredor = texAzulejo(T.interna[0], T.interna[1]);
    tCorredor.repeat.set(0.5, 0.5);
    const corredorMat = new THREE.MeshLambertMaterial({ map: tCorredor });
    const tetoMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(T.interna[1]) });

    for (const r of bp.pracas) chaoComPiscinas(r, 0, pracaMat, M.piscinas);
    for (const r of bp.corredores) {
      chaoPlano(r.x0, r.z0, r.x1, r.z1, 0.02, corredorMat);
      const teto = new THREE.Mesh(new THREE.BoxGeometry(r.x1 - r.x0, 0.3, r.z1 - r.z0), tetoMat);
      teto.position.set((r.x0 + r.x1) / 2, 3.55, (r.z0 + r.z1) / 2);
      group.add(teto);
    }

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

    const fachadas = [
      texFaroeste('SALOON', 2, true),
      texFaroeste(null, 2, false),
      texFaroeste('HOTEL', 2, true),
      texFaroeste(null, 1, true),
      texFaroeste('BANCO', 2, false),
      texFaroeste('ARMAZEM', 1, true),
    ];
    const madeiraMat = new THREE.MeshLambertMaterial({ color: 0x8f6238 });
    const cornijaMat = new THREE.MeshLambertMaterial({ color: 0x6e4a28 });
    let vi = 0;
    for (const r of retos) {
      const w = r.x1 - r.x0;
      const d = r.z1 - r.z0;
      const len = Math.max(w, d);
      const rep = Math.max(1, Math.round(len / 4));
      const t = new THREE.CanvasTexture(fachadas[vi % fachadas.length]);
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.magFilter = THREE.NearestFilter;
      t.repeat.set(rep, 1);
      const fachadaMat = new THREE.MeshLambertMaterial({ map: t });
      const mats = w >= d
        ? [madeiraMat, madeiraMat, madeiraMat, madeiraMat, fachadaMat, fachadaMat]
        : [fachadaMat, fachadaMat, madeiraMat, madeiraMat, madeiraMat, madeiraMat];
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, A.alturaParede, d), mats);
      m.position.set((r.x0 + r.x1) / 2, A.alturaParede / 2, (r.z0 + r.z1) / 2);
      group.add(m);
      aabbs.push({ minX: r.x0, maxX: r.x1, minZ: r.z0, maxZ: r.z1, alt: A.alturaParede });
      if (len >= 5) {
        const cornija = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.18, d + 0.3), cornijaMat);
        cornija.position.set((r.x0 + r.x1) / 2, A.alturaParede + 0.09, (r.z0 + r.z1) / 2);
        const hP = [0.6, 1.1, 0.8][vi % 3];
        const platibanda = new THREE.Mesh(new THREE.BoxGeometry(w, hP, d), madeiraMat);
        platibanda.position.set((r.x0 + r.x1) / 2, A.alturaParede + 0.18 + hP / 2, (r.z0 + r.z1) / 2);
        group.add(cornija, platibanda);
      }
      vi++;
    }
  }

  function build(id: string) {
    const M = mapas.find((m) => m.id === id) || mapas[0];
    mapaAtual = M;
    disposeAll();
    aabbs.length = 0;
    aguaTexs = [];
    aguaMeshes = [];

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

    if (M.id === 'deserto') {
      const cabo = new THREE.MeshLambertMaterial({ color: 0xf5f2ea });
      const bala = new THREE.MeshLambertMaterial({ color: 0xe85898 });
      const espiral = new THREE.MeshLambertMaterial({ color: 0xffffff });
      for (const [lx, lz] of [[22, 24], [-13, 4]] as Array<[number, number]>) {
        const haste = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.4, 8), cabo);
        haste.position.set(lx, 1.7, lz);
        const doce = new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 12), bala);
        doce.scale.z = 0.35;
        doce.position.set(lx, 3.8, lz);
        const anel = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.14, 8, 20), espiral);
        anel.position.set(lx, 3.8, lz + 0.28);
        group.add(haste, doce, anel);
      }
    }

    group.add(new THREE.HemisphereLight(0xeaf6ff, 0x9a9585, 1.1));
    const sol = new THREE.DirectionalLight(T.sol, 1.1);
    sol.position.set(20, 30, 12);
    group.add(sol);
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
    }
  }

  build(mapaAtual.id);

  return { aabbs, chaoEm, dentroPiscina, passo, build, mapa: () => mapaAtual };
}
