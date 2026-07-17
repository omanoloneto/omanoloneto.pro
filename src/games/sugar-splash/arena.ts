import * as THREE from 'three';
import type { Arena, Contexto } from './tipos';

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
  const { scene, cfg, caixotes } = ctx;
  const A = cfg.arena;
  const P = A.piscina;
  const meiaL = A.larg / 2;
  const meiaP = A.prof / 2;

  const aabbs: Arena['aabbs'] = [];

  const tDeck = texAzulejo('#e8e4da', '#b8b4aa');
  tDeck.repeat.set(A.larg / 2, A.prof / 2);
  const chao = new THREE.Mesh(
    new THREE.PlaneGeometry(A.larg, A.prof),
    new THREE.MeshLambertMaterial({ map: tDeck })
  );
  chao.rotation.x = -Math.PI / 2;
  scene.add(chao);

  const tParede = texAzulejo('#dce8ec', '#a8b8c0', '#3878c0');
  tParede.repeat.set(10, 1.6);
  const paredeMat = new THREE.MeshLambertMaterial({ map: tParede });
  const paredes: Array<[number, number, number, number, number]> = [
    [0, -meiaP, A.larg, 0.6, 0],
    [0, meiaP, A.larg, 0.6, 0],
    [-meiaL, 0, 0.6, A.prof, 1],
    [meiaL, 0, 0.6, A.prof, 1],
  ];
  for (const [x, z, w, d] of paredes) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(w, A.alturaParede, d), paredeMat);
    p.position.set(x, A.alturaParede / 2, z);
    scene.add(p);
    aabbs.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, alt: A.alturaParede });
  }

  const tPiscina = texAzulejo('#bfe6f0', '#7ab8d0');
  const pw = P.x1 - P.x0;
  const pd = P.z1 - P.z0;
  tPiscina.repeat.set(pw / 2, pd / 2);
  const fundoPiscina = new THREE.Mesh(
    new THREE.PlaneGeometry(pw, pd),
    new THREE.MeshLambertMaterial({ map: tPiscina })
  );
  fundoPiscina.rotation.x = -Math.PI / 2;
  fundoPiscina.position.set((P.x0 + P.x1) / 2, P.fundo, (P.z0 + P.z1) / 2);
  scene.add(fundoPiscina);

  const tLateral = texAzulejo('#bfe6f0', '#7ab8d0');
  tLateral.repeat.set(6, 1);
  const latMat = new THREE.MeshLambertMaterial({ map: tLateral });
  const prof = -P.fundo;
  const lados: Array<[number, number, number]> = [
    [(P.x0 + P.x1) / 2, P.z0, 0],
    [(P.x0 + P.x1) / 2, P.z1, 0],
    [P.x0, (P.z0 + P.z1) / 2, 1],
    [P.x1, (P.z0 + P.z1) / 2, 1],
  ];
  for (const [x, z, eixo] of lados) {
    const lat = new THREE.Mesh(new THREE.PlaneGeometry(eixo ? pd : pw, prof), latMat);
    lat.position.set(x, P.fundo / 2, z);
    lat.rotation.y = eixo ? (x < 0 ? Math.PI / 2 : -Math.PI / 2) : z < 0 ? 0 : Math.PI;
    scene.add(lat);
  }

  const agua = new THREE.Mesh(
    new THREE.PlaneGeometry(pw, pd),
    new THREE.MeshLambertMaterial({ color: 0x50b8e8, transparent: true, opacity: 0.55 })
  );
  agua.rotation.x = -Math.PI / 2;
  agua.position.set((P.x0 + P.x1) / 2, -0.35, (P.z0 + P.z1) / 2);
  scene.add(agua);

  const tCaixote = texCaixote();
  const caixoteMat = new THREE.MeshLambertMaterial({ map: tCaixote });
  for (const cx of caixotes) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(cx.w, 1.6, cx.d), caixoteMat);
    const yBase = cx.h - 1.6;
    m.position.set(cx.x, yBase + 0.8, cx.z);
    scene.add(m);
    aabbs.push({ minX: cx.x - cx.w / 2, maxX: cx.x + cx.w / 2, minZ: cx.z - cx.d / 2, maxZ: cx.z + cx.d / 2, alt: cx.h });
  }

  const LR = A.lockerRoom;
  const benchMat = new THREE.MeshLambertMaterial({ color: 0xb98a56 });
  function buildLockerRoom(side: number, theme: { tile: [string, string, string]; floor: [string, string]; accent: string }) {
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

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(6.4, A.prof), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(side * 24.5, 0.01, 0);
    scene.add(floor);

    const backTex = texAzulejo(theme.tile[0], theme.tile[1], theme.tile[2]);
    backTex.repeat.set(16, 1.9);
    const backMat = new THREE.MeshLambertMaterial({ map: backTex });
    const backLiner = new THREE.Mesh(new THREE.PlaneGeometry(A.prof, LR.wallH), backMat);
    backLiner.position.set(side * (meiaL - 0.31), LR.wallH / 2, 0);
    backLiner.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    scene.add(backLiner);

    const capTex = texAzulejo(theme.tile[0], theme.tile[1], theme.tile[2]);
    capTex.repeat.set(3.2, 1.9);
    const capMat = new THREE.MeshLambertMaterial({ map: capTex });
    for (const sz of [-1, 1]) {
      const capLiner = new THREE.Mesh(new THREE.PlaneGeometry(6.4, LR.wallH), capMat);
      capLiner.position.set(side * 24.5, LR.wallH / 2, sz * (meiaP - 0.31));
      capLiner.rotation.y = sz < 0 ? 0 : Math.PI;
      scene.add(capLiner);
    }

    const segments = [
      { z: -11.75, len: 8.5 },
      { z: 0, len: 9 },
      { z: 11.75, len: 8.5 },
    ];
    for (const s of segments) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.6, LR.wallH, s.len), wallMat);
      wall.position.set(side * LR.innerX, LR.wallH / 2, s.z);
      scene.add(wall);
      aabbs.push({ minX: side * LR.innerX - 0.3, maxX: side * LR.innerX + 0.3, minZ: s.z - s.len / 2, maxZ: s.z + s.len / 2, alt: LR.wallH });
    }

    for (const pz of [-8, -6.4, -4.8, -3.2, -1.6, 0]) {
      const partition = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.2, 0.12), stallMat);
      partition.position.set(side * 26.95, 1.1, pz);
      scene.add(partition);
      aabbs.push({ minX: side * 26.95 - 0.75, maxX: side * 26.95 + 0.75, minZ: pz - 0.06, maxZ: pz + 0.06, alt: 2.2 });
    }

    for (const dz of [-6.9, -5.3, -2.1, -0.5]) {
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.8, 1.0), stallMat);
      door.position.set(side * 26.2, 1.2, dz);
      scene.add(door);
      aabbs.push({ minX: side * 26.2 - 0.06, maxX: side * 26.2 + 0.06, minZ: dz - 0.5, maxZ: dz + 0.5, alt: 2.1 });
    }
    const openDoor = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.8, 0.12), stallMat);
    openDoor.position.set(side * 25.64, 1.2, -4.74);
    scene.add(openDoor);
    aabbs.push({ minX: side * 25.64 - 0.5, maxX: side * 25.64 + 0.5, minZ: -4.8, maxZ: -4.68, alt: 2.1 });

    const lockers = new THREE.Mesh(new THREE.BoxGeometry(0.55, 2.1, 6.0), lockerMat);
    lockers.position.set(side * 27.42, 1.05, 5.0);
    scene.add(lockers);
    aabbs.push({ minX: side * 27.42 - 0.275, maxX: side * 27.42 + 0.275, minZ: 2, maxZ: 8, alt: 2.1 });

    const bench = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 4.0), benchMat);
    bench.position.set(side * 24.5, 0.45, -4);
    scene.add(bench);
    aabbs.push({ minX: side * 24.5 - 0.25, maxX: side * 24.5 + 0.25, minZ: -6, maxZ: -2, alt: 0.9 });
  }

  buildLockerRoom(-1, { tile: ['#d8e6f4', '#a0b8cc', '#3878c0'], floor: ['#cfe0f0', '#9ab4c8'], accent: '#3878c0' });
  buildLockerRoom(1, { tile: ['#f4dcd8', '#cca0a0', '#d04838'], floor: ['#f0d4d0', '#c89a96'], accent: '#d04838' });

  const brancoMat = new THREE.MeshLambertMaterial({ color: 0xf5f2ea });
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 0.5), brancoMat);
  base.position.set(0, 0.7, P.z1 + 1.2);
  scene.add(base);
  const tabua = new THREE.Mesh(new THREE.BoxGeometry(1, 0.12, 3.4), new THREE.MeshLambertMaterial({ color: 0x58c8e8 }));
  tabua.position.set(0, 1.4, P.z1 - 0.6);
  scene.add(tabua);
  aabbs.push({ minX: -0.25, maxX: 0.25, minZ: P.z1 + 0.95, maxZ: P.z1 + 1.45, alt: 1.4 });

  const escadaMat = new THREE.MeshLambertMaterial({ color: 0xc0c8d0 });
  for (const ex of [P.x0 + 0.4, P.x1 - 0.4]) {
    const e1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.6, 0.08), escadaMat);
    e1.position.set(ex, -0.6, P.z0 + 0.5);
    const e2 = e1.clone();
    e2.position.z = P.z0 + 1.1;
    scene.add(e1, e2);
  }

  scene.add(new THREE.HemisphereLight(0xeaf6ff, 0x9a9585, 1.1));
  const sol = new THREE.DirectionalLight(0xfff2d5, 1.1);
  sol.position.set(20, 30, 12);
  scene.add(sol);

  function dentroPiscina(x: number, z: number): boolean {
    return x > P.x0 && x < P.x1 && z > P.z0 && z < P.z1;
  }

  function chaoEm(x: number, z: number): number {
    let alt = dentroPiscina(x, z) ? P.fundo : 0;
    for (const b of aabbs) {
      if (b.alt <= 3.5 && x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ) {
        alt = Math.max(alt, b.alt);
      }
    }
    return alt;
  }

  return { aabbs, chaoEm, dentroPiscina };
}
