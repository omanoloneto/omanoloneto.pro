import * as THREE from 'three';

export type CharacterMaterials = {
  body: THREE.MeshLambertMaterial;
  face: THREE.MeshLambertMaterial;
  trunksBlue: THREE.MeshLambertMaterial;
  trunksRed: THREE.MeshLambertMaterial;
  gunBody: THREE.MeshLambertMaterial;
  gunTank: THREE.MeshLambertMaterial;
  skin: THREE.MeshLambertMaterial;
};

export type CharacterRig = {
  group: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  teamMeshes: THREE.Mesh[];
};

function sugarGrains(g: CanvasRenderingContext2D, count: number) {
  for (let i = 0; i < count; i++) {
    const x = (i * 13) % 32;
    const y = (i * 7 + ((i / 3) | 0)) % 32;
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
  sugarGrains(g, 60);
  return makeTexture(c);
}

export function sugarFaceTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 32;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f8f6f0';
  g.fillRect(0, 0, 32, 32);
  sugarGrains(g, 40);
  g.fillStyle = '#303030';
  g.fillRect(8, 11, 4, 6);
  g.fillRect(20, 11, 4, 6);
  g.fillStyle = '#ffffff';
  g.fillRect(9, 12, 2, 2);
  g.fillRect(21, 12, 2, 2);
  g.fillStyle = '#f0b4c0';
  g.fillRect(5, 19, 3, 2);
  g.fillRect(24, 19, 3, 2);
  g.fillStyle = '#8a4a42';
  g.fillRect(12, 22, 8, 2);
  g.fillRect(11, 21, 1, 2);
  g.fillRect(20, 21, 1, 2);
  return makeTexture(c);
}

export function createCharacterMaterials(): CharacterMaterials {
  return {
    body: new THREE.MeshLambertMaterial({ map: sugarSkinTexture() }),
    face: new THREE.MeshLambertMaterial({ map: sugarFaceTexture() }),
    trunksBlue: new THREE.MeshLambertMaterial({ color: 0x3878c0 }),
    trunksRed: new THREE.MeshLambertMaterial({ color: 0xd04838 }),
    gunBody: new THREE.MeshLambertMaterial({ color: 0xf07838 }),
    gunTank: new THREE.MeshLambertMaterial({ color: 0x58c8f0, transparent: true, opacity: 0.75 }),
    skin: new THREE.MeshLambertMaterial({ map: sugarSkinTexture() }),
  };
}

const GEO = {
  trunks: new THREE.BoxGeometry(0.8, 0.25, 0.5),
  torso: new THREE.BoxGeometry(0.8, 0.7, 0.5),
  head: new THREE.BoxGeometry(0.6, 0.6, 0.55),
  cap: new THREE.BoxGeometry(0.64, 0.14, 0.59),
  leg: new THREE.BoxGeometry(0.28, 0.5, 0.3),
  arm: new THREE.BoxGeometry(0.2, 0.7, 0.25),
  gunBody: new THREE.BoxGeometry(0.13, 0.16, 0.42),
  gunTank: new THREE.CylinderGeometry(0.07, 0.07, 0.24, 8),
  gunNozzle: new THREE.BoxGeometry(0.05, 0.05, 0.2),
  gunHandle: new THREE.BoxGeometry(0.06, 0.16, 0.09),
  forearm: new THREE.BoxGeometry(0.08, 0.08, 0.3),
};

export function buildWaterGun(mats: CharacterMaterials): THREE.Group {
  const gun = new THREE.Group();
  const body = new THREE.Mesh(GEO.gunBody, mats.gunBody);
  const tank = new THREE.Mesh(GEO.gunTank, mats.gunTank);
  tank.rotation.x = Math.PI / 2;
  tank.position.set(0, 0.14, -0.06);
  const nozzle = new THREE.Mesh(GEO.gunNozzle, mats.gunBody);
  nozzle.position.set(0, 0.02, 0.29);
  const handle = new THREE.Mesh(GEO.gunHandle, mats.gunBody);
  handle.position.set(0, -0.15, -0.1);
  gun.add(body, tank, nozzle, handle);
  return gun;
}

function limbPivot(x: number, y: number, geo: THREE.BoxGeometry, offsetY: number, mat: THREE.Material): THREE.Group {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, 0);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = offsetY;
  pivot.add(mesh);
  return pivot;
}

export function buildCharacter(mats: CharacterMaterials): CharacterRig {
  const group = new THREE.Group();
  const trunks = new THREE.Mesh(GEO.trunks, mats.trunksBlue);
  trunks.position.y = 0.5;
  const torso = new THREE.Mesh(GEO.torso, mats.body);
  torso.position.y = 0.97;
  const head = new THREE.Mesh(GEO.head, [mats.body, mats.body, mats.body, mats.body, mats.face, mats.body]);
  head.position.y = 1.62;
  const cap = new THREE.Mesh(GEO.cap, mats.trunksBlue);
  cap.position.y = 1.95;
  const legL = limbPivot(-0.2, 0.62, GEO.leg, -0.25, mats.body);
  const legR = limbPivot(0.2, 0.62, GEO.leg, -0.25, mats.body);
  const armL = limbPivot(-0.55, 1.28, GEO.arm, -0.33, mats.body);
  const armR = limbPivot(0.55, 1.28, GEO.arm, -0.33, mats.body);
  const gun = buildWaterGun(mats);
  gun.position.set(0.05, -0.62, 0.12);
  gun.rotation.x = 1.25;
  armR.add(gun);
  group.add(trunks, torso, head, cap, legL, legR, armL, armR);
  return { group, armL, armR, legL, legR, teamMeshes: [trunks, cap] };
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
