import * as THREE from 'three';

export type CharacterMaterials = {
  bodyBlue: THREE.MeshLambertMaterial;
  bodyRed: THREE.MeshLambertMaterial;
  faceBlue: THREE.MeshLambertMaterial;
  faceRed: THREE.MeshLambertMaterial;
  candyBlue: THREE.MeshLambertMaterial;
  candyRed: THREE.MeshLambertMaterial;
  gunBody: THREE.MeshLambertMaterial;
  gunTank: THREE.MeshLambertMaterial;
  gunNozzle: THREE.MeshLambertMaterial;
  gunHandle: THREE.MeshLambertMaterial;
  skin: THREE.MeshLambertMaterial;
};

export type CharacterRig = {
  group: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  setTeam(team: 0 | 1): void;
};

const TEAM_TINT = [0x6aaef5, 0xf57d92] as const;
const TEAM_ACCENT = ['#3878c0', '#d04838'] as const;

function sugarGrains(g: CanvasRenderingContext2D, size: number, count: number) {
  for (let i = 0; i < count; i++) {
    const x = (i * 13) % size;
    const y = (i * 7 + ((i / 3) | 0)) % size;
    g.fillStyle = i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? '#e8e4d8' : '#dcd8cc';
    g.fillRect(x, y, 1, 1);
  }
}

function makeTexture(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  return t;
}

export function sugarSkinTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 32;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f8f6f0';
  g.fillRect(0, 0, 32, 32);
  sugarGrains(g, 32, 60);
  return makeTexture(c);
}

export function sugarFaceTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f8f6f0';
  g.fillRect(0, 0, 64, 64);
  sugarGrains(g, 64, 140);
  g.fillStyle = '#4a2e28';
  g.fillRect(13, 13, 12, 3);
  g.fillRect(39, 13, 12, 3);
  g.fillRect(12, 12, 3, 2);
  g.fillRect(49, 12, 3, 2);
  g.fillStyle = '#1c1c1e';
  g.beginPath();
  g.ellipse(20, 28, 6.5, 8.5, 0, 0, Math.PI * 2);
  g.ellipse(44, 28, 6.5, 8.5, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(17.5, 24.5, 2.8, 0, Math.PI * 2);
  g.arc(41.5, 24.5, 2.8, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.arc(22.5, 31.5, 1.5, 0, Math.PI * 2);
  g.arc(46.5, 31.5, 1.5, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#f07ba0';
  g.fillRect(4, 37, 8, 6);
  g.fillRect(52, 37, 8, 6);
  g.fillStyle = '#7c2f2a';
  g.beginPath();
  g.ellipse(32, 47, 10, 7, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#f8f6f0';
  g.fillRect(20, 38, 24, 4);
  g.fillStyle = '#f08a9c';
  g.beginPath();
  g.ellipse(32, 51, 5.5, 3, 0, 0, Math.PI * 2);
  g.fill();
  return makeTexture(c);
}

function swirlTexture(accent: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fdfbf6';
  g.fillRect(0, 0, 64, 64);
  g.strokeStyle = accent;
  g.lineWidth = 7;
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    g.arc(32, 32, 7 + i * 8, i * 1.3, i * 1.3 + 2.4);
    g.stroke();
  }
  const t = makeTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function createCharacterMaterials(): CharacterMaterials {
  const sugar = sugarSkinTexture();
  const face = sugarFaceTexture();
  return {
    bodyBlue: new THREE.MeshLambertMaterial({ map: sugar, color: TEAM_TINT[0] }),
    bodyRed: new THREE.MeshLambertMaterial({ map: sugar, color: TEAM_TINT[1] }),
    faceBlue: new THREE.MeshLambertMaterial({ map: face, color: TEAM_TINT[0] }),
    faceRed: new THREE.MeshLambertMaterial({ map: face, color: TEAM_TINT[1] }),
    candyBlue: new THREE.MeshLambertMaterial({ map: swirlTexture(TEAM_ACCENT[0]) }),
    candyRed: new THREE.MeshLambertMaterial({ map: swirlTexture(TEAM_ACCENT[1]) }),
    gunBody: new THREE.MeshLambertMaterial({ color: 0x59c94a }),
    gunTank: new THREE.MeshLambertMaterial({ color: 0x58c8f0, transparent: true, opacity: 0.75 }),
    gunNozzle: new THREE.MeshLambertMaterial({ color: 0xf7941d }),
    gunHandle: new THREE.MeshLambertMaterial({ color: 0xf05a9b }),
    skin: new THREE.MeshLambertMaterial({ map: sugarSkinTexture() }),
  };
}

const GEO = {
  torso: new THREE.BoxGeometry(0.7, 0.55, 0.45),
  head: new THREE.BoxGeometry(0.95, 0.85, 0.9),
  candy: new THREE.SphereGeometry(0.22, 10, 8),
  leg: new THREE.BoxGeometry(0.26, 0.45, 0.3),
  arm: new THREE.BoxGeometry(0.22, 0.55, 0.26),
  gunBody: new THREE.BoxGeometry(0.16, 0.2, 0.5),
  gunTank: new THREE.CylinderGeometry(0.1, 0.1, 0.3, 8),
  gunNozzle: new THREE.BoxGeometry(0.07, 0.07, 0.24),
  gunHandle: new THREE.BoxGeometry(0.07, 0.18, 0.1),
  forearm: new THREE.BoxGeometry(0.08, 0.08, 0.3),
};

export function buildWaterGun(mats: CharacterMaterials): THREE.Group {
  const gun = new THREE.Group();
  const body = new THREE.Mesh(GEO.gunBody, mats.gunBody);
  const tank = new THREE.Mesh(GEO.gunTank, mats.gunTank);
  tank.rotation.x = Math.PI / 2;
  tank.position.set(0, 0.17, -0.06);
  const nozzle = new THREE.Mesh(GEO.gunNozzle, mats.gunNozzle);
  nozzle.position.set(0, 0.03, 0.34);
  const handle = new THREE.Mesh(GEO.gunHandle, mats.gunHandle);
  handle.position.set(0, -0.17, -0.12);
  gun.add(body, tank, nozzle, handle);
  return gun;
}

function limbPivot(x: number, y: number, geo: THREE.BoxGeometry, offsetY: number, mat: THREE.Material): { pivot: THREE.Group; mesh: THREE.Mesh } {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, 0);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = offsetY;
  pivot.add(mesh);
  return { pivot, mesh };
}

export function buildCharacter(mats: CharacterMaterials): CharacterRig {
  const group = new THREE.Group();
  const torso = new THREE.Mesh(GEO.torso, mats.bodyBlue);
  torso.position.y = 0.85;
  const head = new THREE.Mesh(GEO.head, [mats.bodyBlue, mats.bodyBlue, mats.bodyBlue, mats.bodyBlue, mats.faceBlue, mats.bodyBlue]);
  head.position.y = 1.5;
  const candy = new THREE.Mesh(GEO.candy, mats.candyBlue);
  candy.position.set(0.08, 2.02, 0);
  candy.scale.set(1, 0.8, 1);
  candy.rotation.z = -0.15;
  const legL = limbPivot(-0.18, 0.55, GEO.leg, -0.22, mats.bodyBlue);
  const legR = limbPivot(0.18, 0.55, GEO.leg, -0.22, mats.bodyBlue);
  const armL = limbPivot(-0.5, 1.05, GEO.arm, -0.26, mats.bodyBlue);
  const armR = limbPivot(0.5, 1.05, GEO.arm, -0.26, mats.bodyBlue);
  const gun = buildWaterGun(mats);
  gun.position.set(0.05, -0.5, 0.14);
  gun.rotation.x = 1.25;
  armR.pivot.add(gun);
  group.add(torso, head, candy, legL.pivot, legR.pivot, armL.pivot, armR.pivot);

  function setTeam(team: 0 | 1) {
    const body = team === 0 ? mats.bodyBlue : mats.bodyRed;
    const faceMat = team === 0 ? mats.faceBlue : mats.faceRed;
    torso.material = body;
    head.material = [body, body, body, body, faceMat, body];
    candy.material = team === 0 ? mats.candyBlue : mats.candyRed;
    legL.mesh.material = body;
    legR.mesh.material = body;
    armL.mesh.material = body;
    armR.mesh.material = body;
  }

  return { group, armL: armL.pivot, armR: armR.pivot, legL: legL.pivot, legR: legR.pivot, setTeam };
}

export function createViewmodel(mats: CharacterMaterials): THREE.Group {
  const group = new THREE.Group();
  const inner = new THREE.Group();
  const forearm = new THREE.Mesh(GEO.forearm, mats.skin);
  forearm.position.set(-0.01, -0.14, -0.28);
  forearm.rotation.x = -0.5;
  const gun = buildWaterGun(mats);
  inner.add(forearm, gun);
  inner.rotation.y = Math.PI;
  group.add(inner);
  group.scale.setScalar(0.62);
  return group;
}
