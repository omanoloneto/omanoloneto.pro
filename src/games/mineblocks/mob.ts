import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32 } from '../../lib/rng';
import { DIA_S } from './ceu';
import { SHED_SIGN_AUTHOR, BENCH_FROM_SIGN, PATROL_FROM_SIGN } from './galpao';
import type { RemoteMob, Ctx, Mob } from './types';

const CANDY = 21;
const PACKAGE = 35;
const WATER = 13;
const FISH_WIRE_BASE = 8;

interface Winpup {
  group: THREE.Group;
  x: number; y: number; z: number;
  yaw: number;
  ox: number; oz: number;
  targetX: number; targetZ: number;
  retargetMs: number;
  dropMs: number;
  fleeMs: number;
  phase: number;
  rx: number; ry: number; rz: number; ryaw: number;
}

interface Bubbish {
  group: THREE.Group;
  x: number; y: number; z: number;
  yaw: number;
  targetX: number; targetY: number; targetZ: number;
  retargetMs: number;
  dieMs: number;
  phase: number;
  rx: number; ry: number; rz: number; ryaw: number;
}

interface Plover {
  group: THREE.Group;
  homeX: number; homeY: number; homeZ: number;
  x: number; y: number; z: number;
  yaw: number;
  flying: boolean;
  angle: number;
  calmMs: number;
  screamMs: number;
  targetX: number; targetZ: number;
  retargetMs: number;
  phase: number;
}

function part(w: number, h: number, d: number, x: number, y: number, z: number, color: THREE.Color): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  const n = g.attributes.position.count;
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { colors[i * 3] = color.r; colors[i * 3 + 1] = color.g; colors[i * 3 + 2] = color.b; }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
}

function winpupGeometry(): THREE.BufferGeometry {
  const cream = new THREE.Color('#e9e1c6');
  const creamDark = new THREE.Color('#d8cca6');
  const gold = new THREE.Color('#c9a227');
  const goldLight = new THREE.Color('#e6c65a');
  const eye = new THREE.Color('#d8463a');
  const pupil = new THREE.Color('#2a1410');

  const p: THREE.BufferGeometry[] = [
    part(0.72, 0.6, 0.72, 0, 0, 0, cream),
    part(0.8, 0.34, 0.78, 0, 0.28, 0, gold),
    part(0.8, 0.08, 0.8, 0, 0.11, 0, goldLight),
    part(0.16, 0.16, 0.16, -0.16, 0.16, 0.38, creamDark),
    part(0.16, 0.16, 0.16, 0.16, 0.16, 0.38, creamDark),
    part(0.16, 0.16, 0.16, 0, 0.26, 0.4, creamDark),
    part(0.14, 0.14, 0.14, -0.28, 0.02, 0.32, creamDark),
    part(0.14, 0.14, 0.14, 0.28, 0.02, 0.32, creamDark),
    part(0.13, 0.13, 0.13, 0, -0.02, 0.42, creamDark),
    part(0.13, 0.15, 0.05, -0.16, -0.04, -0.37, eye),
    part(0.13, 0.15, 0.05, 0.16, -0.04, -0.37, eye),
    part(0.05, 0.06, 0.04, -0.16, -0.04, -0.39, pupil),
    part(0.05, 0.06, 0.04, 0.16, -0.04, -0.39, pupil),
    part(0.12, 0.1, 0.12, -0.16, -0.34, -0.02, creamDark),
    part(0.12, 0.1, 0.12, 0.16, -0.34, -0.02, creamDark),
  ];
  const geo = mergeGeometries(p)!;
  p.forEach((g) => g.dispose());
  return geo;
}

interface FaceTones {
  top: THREE.Color;
  side: THREE.Color;
  bottom: THREE.Color;
  front?: THREE.Color;
  sideLow?: THREE.Color;
}

function shadedPart(w: number, h: number, d: number, x: number, y: number, z: number, tones: FaceTones): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  const n = g.attributes.position.count;
  const normals = g.attributes.normal;
  const positions = g.attributes.position;
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const ny = normals.getY(i);
    const nz = normals.getZ(i);
    let c: THREE.Color;
    if (ny > 0.5) c = tones.top;
    else if (ny < -0.5) c = tones.bottom;
    else if (nz < -0.5 && tones.front) c = tones.front;
    else c = tones.sideLow && positions.getY(i) < 0 ? tones.sideLow : tones.side;
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.translate(x, y, z);
  return g;
}

function outlinePart(w: number, h: number, d: number, x: number, y: number, z: number): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w + 0.06, h + 0.06, d + 0.06);
  g.translate(x, y, z);
  return g;
}

interface BubPart {
  w: number; h: number; d: number;
  x: number; y: number; z: number;
  tones: FaceTones;
}

const BUB = {
  bodyLight: new THREE.Color('#7fb9f7'),
  bodyMid: new THREE.Color('#5ca0e0'),
  bodyShadow: new THREE.Color('#3e7ec2'),
  finLight: new THREE.Color('#cfefff'),
  finShadow: new THREE.Color('#a9dde8'),
  beakLight: new THREE.Color('#f3d37a'),
  beakShadow: new THREE.Color('#d4b25f'),
  mouth: new THREE.Color('#7b3e38'),
  eye: new THREE.Color('#33241e'),
  white: new THREE.Color('#ffffff'),
};

const BODY_TONES: FaceTones = { top: BUB.bodyLight, side: BUB.bodyMid, sideLow: BUB.bodyShadow, bottom: BUB.bodyShadow };
const FIN_TONES: FaceTones = { top: BUB.finLight, side: BUB.finLight, bottom: BUB.finShadow };

const BUB_STRUCT: BubPart[] = [
  { w: 0.56, h: 0.5, d: 0.58, x: 0, y: 0, z: 0, tones: BODY_TONES },
  { w: 0.13, h: 0.12, d: 0.13, x: 0, y: 0.29, z: -0.02, tones: BODY_TONES },
  { w: 0.09, h: 0.11, d: 0.09, x: 0, y: 0.37, z: -0.02, tones: BODY_TONES },
  { w: 0.05, h: 0.09, d: 0.05, x: 0, y: 0.43, z: -0.02, tones: BODY_TONES },
  { w: 0.04, h: 0.1, d: 0.1, x: -0.3, y: -0.02, z: 0.02, tones: FIN_TONES },
  { w: 0.04, h: 0.1, d: 0.1, x: 0.3, y: -0.02, z: 0.02, tones: FIN_TONES },
  { w: 0.05, h: 0.26, d: 0.1, x: 0, y: 0, z: 0.33, tones: { top: BUB.finLight, side: BUB.finLight, sideLow: BUB.finShadow, bottom: BUB.finShadow } },
  { w: 0.05, h: 0.08, d: 0.14, x: 0, y: 0.15, z: 0.4, tones: FIN_TONES },
  { w: 0.05, h: 0.08, d: 0.14, x: 0, y: -0.15, z: 0.4, tones: { top: BUB.finShadow, side: BUB.finShadow, bottom: BUB.finShadow } },
  { w: 0.18, h: 0.07, d: 0.14, x: 0, y: -0.07, z: -0.34, tones: { top: BUB.beakLight, side: BUB.beakLight, front: BUB.beakLight, bottom: BUB.beakShadow } },
  { w: 0.14, h: 0.05, d: 0.1, x: 0, y: -0.12, z: -0.32, tones: { top: BUB.beakShadow, side: BUB.beakShadow, front: BUB.beakShadow, bottom: BUB.beakShadow } },
];

interface Yujack {
  group: THREE.Group;
  x: number; y: number; z: number;
  yaw: number;
  sitting: boolean;
  sitUntilMs: number;
  patrolIdx: number;
  restUntilMs: number;
  benchX: number; benchY: number; benchZ: number;
  patrol: Array<{ x: number; z: number }>;
  phase: number;
}

const YU = {
  furLight: new THREE.Color('#b49a7a'),
  furDark: new THREE.Color('#8c7456'),
  vestLight: new THREE.Color('#4fbfa5'),
  vestDark: new THREE.Color('#2e8c7b'),
  scarf: new THREE.Color('#2ecc71'),
  scarfDark: new THREE.Color('#1e8e5e'),
  hat: new THREE.Color('#4ea6bb'),
  belt: new THREE.Color('#38616f'),
  gold: new THREE.Color('#e0c35a'),
  axeMetal: new THREE.Color('#a7d5d4'),
  axeHandle: new THREE.Color('#7e8c4a'),
  white: new THREE.Color('#d7d7d7'),
  eye: new THREE.Color('#2ecc71'),
  pupil: new THREE.Color('#1a1e24'),
  nose: new THREE.Color('#d98a5f'),
};

const YU_FUR: FaceTones = { top: YU.furLight, side: YU.furLight, sideLow: YU.furDark, bottom: YU.furDark };
const YU_VEST: FaceTones = { top: YU.vestLight, side: YU.vestDark, bottom: YU.belt };

const YU_STRUCT: BubPart[] = [
  { w: 0.22, h: 0.34, d: 0.26, x: -0.15, y: 0.17, z: 0.02, tones: YU_FUR },
  { w: 0.22, h: 0.34, d: 0.26, x: 0.15, y: 0.17, z: 0.02, tones: YU_FUR },
  { w: 0.62, h: 0.52, d: 0.42, x: 0, y: 0.62, z: 0, tones: YU_VEST },
  { w: 0.64, h: 0.09, d: 0.44, x: 0, y: 0.4, z: 0, tones: { top: YU.belt, side: YU.belt, bottom: YU.belt } },
  { w: 0.16, h: 0.44, d: 0.2, x: -0.4, y: 0.66, z: 0.02, tones: YU_FUR },
  { w: 0.16, h: 0.44, d: 0.2, x: 0.4, y: 0.66, z: 0.02, tones: YU_FUR },
  { w: 0.16, h: 0.3, d: 0.18, x: 0.4, y: 1.0, z: -0.08, tones: YU_FUR },
  { w: 0.56, h: 0.14, d: 0.48, x: 0, y: 0.94, z: 0, tones: { top: YU.scarf, side: YU.scarf, sideLow: YU.scarfDark, bottom: YU.scarfDark } },
  { w: 0.26, h: 0.09, d: 0.3, x: -0.34, y: 0.9, z: 0.3, tones: { top: YU.scarf, side: YU.scarfDark, bottom: YU.scarfDark } },
  { w: 0.2, h: 0.08, d: 0.24, x: -0.44, y: 0.78, z: 0.44, tones: { top: YU.scarfDark, side: YU.scarfDark, bottom: YU.scarfDark } },
  { w: 0.5, h: 0.42, d: 0.44, x: 0, y: 1.24, z: 0, tones: YU_FUR },
  { w: 0.26, h: 0.18, d: 0.12, x: 0, y: 1.16, z: -0.26, tones: YU_FUR },
  { w: 0.1, h: 0.1, d: 0.08, x: -0.2, y: 1.48, z: 0.04, tones: YU_FUR },
  { w: 0.1, h: 0.1, d: 0.08, x: 0.2, y: 1.48, z: 0.04, tones: YU_FUR },
  { w: 0.48, h: 0.09, d: 0.42, x: 0, y: 1.5, z: -0.02, tones: { top: YU.hat, side: YU.hat, bottom: YU.hat } },
  { w: 0.3, h: 0.07, d: 0.26, x: 0, y: 1.57, z: -0.02, tones: { top: YU.hat, side: YU.hat, bottom: YU.hat } },
  { w: 0.36, h: 0.09, d: 0.52, x: 0, y: 0.08, z: 0.5, tones: { top: YU.furDark, side: YU.furDark, bottom: YU.furDark } },
  { w: 0.07, h: 0.62, d: 0.07, x: 0.42, y: 1.28, z: -0.06, tones: { top: YU.axeHandle, side: YU.axeHandle, bottom: YU.axeHandle } },
  { w: 0.2, h: 0.28, d: 0.09, x: 0.42, y: 1.66, z: -0.06, tones: { top: YU.axeMetal, side: YU.axeMetal, bottom: YU.axeMetal } },
];

function yujackGeometry(): THREE.BufferGeometry {
  const p: THREE.BufferGeometry[] = YU_STRUCT.map((b) => shadedPart(b.w, b.h, b.d, b.x, b.y, b.z, b.tones));
  p.push(
    part(0.12, 0.14, 0.04, -0.13, 1.32, -0.235, YU.white),
    part(0.12, 0.14, 0.04, 0.13, 1.32, -0.235, YU.white),
    part(0.08, 0.1, 0.03, -0.13, 1.31, -0.245, YU.eye),
    part(0.08, 0.1, 0.03, 0.13, 1.31, -0.245, YU.eye),
    part(0.04, 0.05, 0.02, -0.12, 1.3, -0.255, YU.pupil),
    part(0.04, 0.05, 0.02, 0.14, 1.3, -0.255, YU.pupil),
    part(0.14, 0.04, 0.04, -0.13, 1.41, -0.24, YU.furDark),
    part(0.14, 0.04, 0.04, 0.13, 1.41, -0.24, YU.furDark),
    part(0.12, 0.06, 0.04, 0, 1.23, -0.31, YU.nose),
    part(0.1, 0.12, 0.03, 0, 1.06, -0.315, YU.white),
    part(0.16, 0.14, 0.03, 0, 0.52, -0.215, YU.gold),
    part(0.05, 0.05, 0.02, -0.15, 0.72, -0.212, YU.gold),
    part(0.05, 0.05, 0.02, -0.15, 0.6, -0.212, YU.gold),
  );
  const geo = mergeGeometries(p)!;
  p.forEach((g) => g.dispose());
  return geo;
}

function yujackOutlineGeometry(): THREE.BufferGeometry {
  const p = YU_STRUCT.map((b) => outlinePart(b.w, b.h, b.d, b.x, b.y, b.z));
  const geo = mergeGeometries(p)!;
  p.forEach((g) => g.dispose());
  return geo;
}

const PLOVER = {
  back: new THREE.Color('#9aa5a0'),
  backLow: new THREE.Color('#7c8781'),
  belly: new THREE.Color('#f2f2ee'),
  black: new THREE.Color('#1e1e22'),
  beak: new THREE.Color('#d98a8a'),
  leg: new THREE.Color('#c07878'),
};

const PLOVER_TONES: FaceTones = { top: PLOVER.back, side: PLOVER.back, sideLow: PLOVER.backLow, bottom: PLOVER.belly };

const PLOVER_STRUCT: BubPart[] = [
  { w: 0.34, h: 0.24, d: 0.44, x: 0, y: 0.28, z: 0.02, tones: PLOVER_TONES },
  { w: 0.2, h: 0.18, d: 0.18, x: 0, y: 0.46, z: -0.18, tones: PLOVER_TONES },
  { w: 0.05, h: 0.05, d: 0.1, x: 0, y: 0.48, z: -0.3, tones: { top: PLOVER.beak, side: PLOVER.beak, bottom: PLOVER.beak } },
  { w: 0.38, h: 0.05, d: 0.3, x: 0, y: 0.41, z: 0.04, tones: { top: PLOVER.backLow, side: PLOVER.backLow, bottom: PLOVER.backLow } },
  { w: 0.05, h: 0.16, d: 0.2, x: 0, y: 0.34, z: 0.28, tones: { top: PLOVER.back, side: PLOVER.back, bottom: PLOVER.black } },
];

function ploverGeometry(): THREE.BufferGeometry {
  const p: THREE.BufferGeometry[] = PLOVER_STRUCT.map((b) => shadedPart(b.w, b.h, b.d, b.x, b.y, b.z, b.tones));
  p.push(
    part(0.22, 0.09, 0.05, 0, 0.33, -0.245, PLOVER.black),
    part(0.16, 0.1, 0.16, 0, 0.19, 0.02, PLOVER.belly),
    part(0.1, 0.05, 0.05, 0, 0.52, -0.06, PLOVER.black),
    part(0.05, 0.05, 0.03, -0.055, 0.47, -0.275, PLOVER.black),
    part(0.05, 0.05, 0.03, 0.055, 0.47, -0.275, PLOVER.black),
    part(0.03, 0.16, 0.03, -0.08, 0.08, 0.04, PLOVER.leg),
    part(0.03, 0.16, 0.03, 0.08, 0.08, 0.04, PLOVER.leg),
  );
  const geo = mergeGeometries(p)!;
  p.forEach((g) => g.dispose());
  return geo;
}

function ploverOutlineGeometry(): THREE.BufferGeometry {
  const p = PLOVER_STRUCT.map((b) => outlinePart(b.w, b.h, b.d, b.x, b.y, b.z));
  const geo = mergeGeometries(p)!;
  p.forEach((g) => g.dispose());
  return geo;
}

function bubbishGeometry(): THREE.BufferGeometry {
  const p: THREE.BufferGeometry[] = BUB_STRUCT.map((b) => shadedPart(b.w, b.h, b.d, b.x, b.y, b.z, b.tones));
  p.push(
    part(0.16, 0.2, 0.07, -0.14, 0.07, -0.315, BUB.eye),
    part(0.16, 0.2, 0.07, 0.14, 0.07, -0.315, BUB.eye),
    part(0.06, 0.06, 0.03, -0.1, 0.13, -0.36, BUB.white),
    part(0.06, 0.06, 0.03, 0.18, 0.13, -0.36, BUB.white),
    part(0.1, 0.03, 0.07, 0, -0.21, -0.315, BUB.mouth),
  );
  const geo = mergeGeometries(p)!;
  p.forEach((g) => g.dispose());
  return geo;
}

function bubbishOutlineGeometry(): THREE.BufferGeometry {
  const p = BUB_STRUCT.map((b) => outlinePart(b.w, b.h, b.d, b.x, b.y, b.z));
  const geo = mergeGeometries(p)!;
  p.forEach((g) => g.dispose());
  return geo;
}

export function criarMob(ctx: Ctx): Mob {
  const { cfg, world } = ctx;
  const B = cfg.bichos;
  const { SX, SZ } = cfg.mundo;
  const material = new THREE.MeshBasicMaterial({ vertexColors: true });
  const geo = winpupGeometry();
  const fishGeo = bubbishGeometry();
  const fishOutlineGeo = bubbishOutlineGeometry();
  const ploverGeo = ploverGeometry();
  const ploverOutlineGeo = ploverOutlineGeometry();
  const yujackGeo = yujackGeometry();
  const yujackOutlineGeo = yujackOutlineGeometry();
  let yujack: Yujack | null = null;
  const outlineMaterial = new THREE.MeshBasicMaterial({ color: 0x1a1e24, side: THREE.BackSide });
  const alive: Winpup[] = [];
  const fish: (Bubbish | null)[] = new Array(FISH_WIRE_BASE).fill(null);
  const plovers: Plover[] = [];
  const F = cfg.peixes;
  let timeMs = 0;
  let collectMs = 0;
  let despawnMs = 0;
  let fishTryMs = 0;
  let nextFishTryMs = 3000;
  const dropped = new Map<number, number>();

  const candyKey = (x: number, y: number, z: number) => x + z * SX + y * SX * SZ;

  const groundAt = (x: number, z: number) =>
    world.highestGround(Math.floor(x), Math.floor(z));

  function hoverY(x: number, z: number): number {
    return groundAt(x, z) + 1 + B.altura;
  }

  function clear() {
    for (const w of alive) ctx.scene.remove(w.group);
    alive.length = 0;
    for (let s = 0; s < fish.length; s++) {
      const f = fish[s];
      if (f) ctx.scene.remove(f.group);
      fish[s] = null;
    }
    for (const p of plovers) ctx.scene.remove(p.group);
    plovers.length = 0;
    if (yujack) {
      ctx.scene.remove(yujack.group);
      yujack = null;
    }
  }

  function spawnYujack() {
    const { SX: sx, SZ: sz } = cfg.mundo;
    let sign: { x: number; y: number; z: number } | null = null;
    for (const [key, m] of ctx.metas.all()) {
      if (m.tipo === 'placa' && m.autor === SHED_SIGN_AUTHOR) {
        const x = key % sx;
        const z = Math.floor(key / sx) % sz;
        const y = Math.floor(key / (sx * sz));
        sign = { x, y, z };
        break;
      }
    }
    if (!sign) return;
    const benchX = sign.x + BENCH_FROM_SIGN.x + 0.5;
    const benchY = sign.y + BENCH_FROM_SIGN.y;
    const benchZ = sign.z + BENCH_FROM_SIGN.z + 0.5;
    const patrol = PATROL_FROM_SIGN.map((p) => ({ x: sign!.x + p.x + 0.5, z: sign!.z + p.z + 0.5 }));
    const group = new THREE.Group();
    group.add(new THREE.Mesh(yujackGeo, material));
    group.add(new THREE.Mesh(yujackOutlineGeo, outlineMaterial));
    ctx.scene.add(group);
    const start = patrol[0];
    const y = groundAt(start.x, start.z) + 1;
    group.position.set(start.x, y, start.z);
    yujack = {
      group, x: start.x, y, z: start.z, yaw: 0,
      sitting: false, sitUntilMs: 0,
      patrolIdx: 1, restUntilMs: 0,
      benchX, benchY, benchZ, patrol,
      phase: Math.random() * Math.PI * 2,
    };
  }

  function stepYujack(dt: number) {
    const b = yujack;
    if (!b) return;
    if (b.sitting) {
      if (timeMs >= b.sitUntilMs) {
        b.sitting = false;
        b.restUntilMs = 0;
        b.patrolIdx = 0;
      }
    } else if (timeMs >= b.restUntilMs) {
      const target = b.patrolIdx < 0
        ? { x: b.benchX, z: b.benchZ }
        : b.patrol[b.patrolIdx];
      const dx = target.x - b.x;
      const dz = target.z - b.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.08) {
        const step = Math.min(dist, 0.9 * dt);
        b.x += (dx / dist) * step;
        b.z += (dz / dist) * step;
        b.yaw = Math.atan2(-dx, -dz);
        b.y = groundAt(b.x, b.z) + 1;
      } else if (b.patrolIdx < 0) {
        b.sitting = true;
        b.sitUntilMs = timeMs + 8000 + Math.random() * 10000;
        b.x = b.benchX;
        b.z = b.benchZ;
        b.y = b.benchY + 0.45;
        b.yaw = 0;
      } else {
        b.restUntilMs = timeMs + 1200 + Math.random() * 2600;
        if (Math.random() < 0.35) {
          b.patrolIdx = -1;
        } else {
          b.patrolIdx = (b.patrolIdx + 1) % b.patrol.length;
        }
      }
    }
    const bob = b.sitting ? 0 : Math.sin(timeMs / 1000 * Math.PI * 2 * 0.9 + b.phase) * 0.025;
    b.group.position.set(b.x, b.y + bob, b.z);
    b.group.rotation.y = b.yaw;
  }

  function spawnPlovers(rng: () => number) {
    let tries = 0;
    while (plovers.length < 4 && tries < 500) {
      tries++;
      const x = Math.floor(rng() * SX) + 0.5;
      const z = Math.floor(rng() * SZ) + 0.5;
      const h = groundAt(x, z);
      if (world.get(Math.floor(x), h, Math.floor(z)) !== 47) continue;
      if (plovers.some((p) => Math.abs(p.homeX - x) < 14 && Math.abs(p.homeZ - z) < 14)) continue;
      const group = new THREE.Group();
      group.add(new THREE.Mesh(ploverGeo, material));
      group.add(new THREE.Mesh(ploverOutlineGeo, outlineMaterial));
      ctx.scene.add(group);
      const y = h + 1;
      group.position.set(x, y, z);
      plovers.push({
        group, homeX: x, homeY: y, homeZ: z,
        x, y, z, yaw: rng() * Math.PI * 2,
        flying: false, angle: rng() * Math.PI * 2,
        calmMs: 0, screamMs: 0,
        targetX: x, targetZ: z, retargetMs: 0,
        phase: rng() * Math.PI * 2,
      });
    }
  }

  function stepPlovers(dt: number) {
    const dtMs = dt * 1000;
    const p = ctx.player;
    for (const b of plovers) {
      const dist = Math.hypot(p.x - b.x, p.z - b.z);
      if (!b.flying && dist < 6) {
        b.flying = true;
        b.calmMs = 0;
      }
      if (b.flying) {
        b.angle += dt * 2.4;
        const r = 3.6;
        const tx = b.homeX + Math.cos(b.angle) * r;
        const tz = b.homeZ + Math.sin(b.angle) * r;
        const ty = b.homeY + 2.6 + Math.sin(timeMs / 1000 * 3 + b.phase) * 0.4;
        b.yaw = Math.atan2(-(tx - b.x), -(tz - b.z));
        b.x = tx;
        b.z = tz;
        b.y += (ty - b.y) * Math.min(1, dt * 4);
        b.screamMs -= dtMs;
        if (b.screamMs <= 0) {
          b.screamMs = 1200 + Math.random() * 900;
          if (dist < 16) ctx.audio.soundQueroQuero();
        }
        if (dist > 10) {
          b.calmMs += dtMs;
          if (b.calmMs > 2600) b.flying = false;
        } else {
          b.calmMs = 0;
        }
      } else {
        if (b.y > b.homeY + 0.05) {
          b.y += (b.homeY - b.y) * Math.min(1, dt * 3);
        } else {
          b.y = b.homeY;
          if (timeMs >= b.retargetMs) {
            b.retargetMs = timeMs + 2600 + Math.random() * 3200;
            const ang = Math.random() * Math.PI * 2;
            const r = Math.random() * 2.5;
            const tx = b.homeX + Math.cos(ang) * r;
            const tz = b.homeZ + Math.sin(ang) * r;
            if (world.get(Math.floor(tx), Math.floor(b.homeY) - 1, Math.floor(tz)) === 47) {
              b.targetX = tx;
              b.targetZ = tz;
            }
          }
          const dx = b.targetX - b.x;
          const dz = b.targetZ - b.z;
          const d = Math.hypot(dx, dz);
          if (d > 0.05) {
            const step = Math.min(d, 0.8 * dt);
            b.x += (dx / d) * step;
            b.z += (dz / d) * step;
            b.yaw = Math.atan2(-dx, -dz);
          }
        }
      }
      const bob = b.flying ? 0 : Math.sin(timeMs / 1000 * Math.PI * 2 * 0.7 + b.phase) * 0.02;
      b.group.position.set(b.x, b.y + bob, b.z);
      b.group.rotation.y = b.yaw;
      b.group.rotation.z = b.flying ? Math.sin(timeMs / 1000 * 7 + b.phase) * 0.2 : 0;
    }
  }

  function waterTopAt(x: number, z: number): number {
    const cx = Math.floor(x);
    const cz = Math.floor(z);
    for (let y = cfg.mundo.SY - 1; y >= 1; y--) {
      const id = world.get(cx, y, cz);
      if (id === 0) continue;
      return id === WATER ? y : -1;
    }
    return -1;
  }

  function waterDepthAt(x: number, z: number): number {
    const top = waterTopAt(x, z);
    if (top < 0) return 0;
    const cx = Math.floor(x);
    const cz = Math.floor(z);
    let d = 0;
    while (world.get(cx, top - d, cz) === WATER) d++;
    return d;
  }

  const inWater = (x: number, y: number, z: number) =>
    world.get(Math.floor(x), Math.floor(y), Math.floor(z)) === WATER;

  function createFish(x: number, y: number, z: number): Bubbish {
    const group = new THREE.Group();
    group.add(new THREE.Mesh(fishGeo, material));
    group.add(new THREE.Mesh(fishOutlineGeo, outlineMaterial));
    ctx.scene.add(group);
    group.position.set(x, y, z);
    return {
      group, x, y, z, yaw: Math.random() * Math.PI * 2,
      targetX: x, targetY: y, targetZ: z,
      retargetMs: 0,
      dieMs: timeMs + F.vidaMinMs + Math.random() * (F.vidaMaxMs - F.vidaMinMs),
      phase: Math.random() * Math.PI * 2,
      rx: x, ry: y, rz: z, ryaw: 0,
    };
  }

  function fishCount(): number {
    let n = 0;
    for (const f of fish) if (f) n++;
    return n;
  }

  function fishCap(): number {
    return Math.min(fish.length, F.porJogador * (1 + ctx.avatars.list().length));
  }

  function trySpawnFish(x: number, z: number): boolean {
    const slot = fish.indexOf(null);
    if (slot < 0) return false;
    const depth = waterDepthAt(x, z);
    if (depth < 2) return false;
    const top = waterTopAt(x, z);
    const y = top + 0.29 - Math.random() * Math.min(depth - 1, 2);
    fish[slot] = createFish(x, y, z);
    return true;
  }

  function randomFishSpawn() {
    let x: number;
    let z: number;
    if (Math.random() < F.chancePerto) {
      const players = [{ x: ctx.player.x, z: ctx.player.z }];
      for (const a of ctx.avatars.list()) players.push({ x: a.x, z: a.z });
      const p = players[Math.floor(Math.random() * players.length)];
      const ang = Math.random() * Math.PI * 2;
      const r = 6 + Math.random() * 22;
      x = p.x + Math.cos(ang) * r;
      z = p.z + Math.sin(ang) * r;
    } else {
      x = 4 + Math.random() * (SX - 8);
      z = 4 + Math.random() * (SZ - 8);
    }
    if (x < 2 || z < 2 || x > SX - 2 || z > SZ - 2) return;
    trySpawnFish(x, z);
  }

  function positionFish(f: Bubbish) {
    const bob = Math.sin(timeMs / 1000 * Math.PI * 2 * F.bobHz + f.phase) * F.bobAmp;
    f.group.position.set(f.x, f.y + bob, f.z);
    f.group.rotation.y = f.yaw;
    f.group.rotation.z = Math.sin(timeMs / 1000 * 5 + f.phase) * 0.06;
  }

  function simulateFish(dt: number) {
    for (let s = 0; s < fish.length; s++) {
      const f = fish[s];
      if (!f) continue;
      if (timeMs >= f.dieMs) {
        ctx.scene.remove(f.group);
        fish[s] = null;
        continue;
      }
      if (timeMs >= f.retargetMs) {
        f.retargetMs = timeMs + 2500 + Math.random() * 3500;
        for (let t = 0; t < 3; t++) {
          const ang = Math.random() * Math.PI * 2;
          const r = 1 + Math.random() * F.raioPasseio;
          const tx = Math.max(2, Math.min(SX - 2, f.x + Math.cos(ang) * r));
          const tz = Math.max(2, Math.min(SZ - 2, f.z + Math.sin(ang) * r));
          const top = waterTopAt(tx, tz);
          if (top < 0) continue;
          const depth = waterDepthAt(tx, tz);
          if (depth < 1) continue;
          const maxY = top + 0.29;
          const minY = top - depth + 1.3;
          if (maxY <= minY) continue;
          const ty = minY + Math.random() * (maxY - minY);
          if (!inWater(tx, ty, tz)) continue;
          f.targetX = tx;
          f.targetY = ty;
          f.targetZ = tz;
          break;
        }
      }
      const dx = f.targetX - f.x;
      const dy = f.targetY - f.y;
      const dz = f.targetZ - f.z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist > 0.05) {
        const step = Math.min(dist, F.nado * dt);
        const nx = f.x + (dx / dist) * step;
        const ny = f.y + (dy / dist) * step;
        const nz = f.z + (dz / dist) * step;
        if (inWater(nx, ny, nz)) {
          f.x = nx;
          f.y = ny;
          f.z = nz;
          f.yaw = Math.atan2(-dx, -dz);
        } else {
          f.retargetMs = 0;
        }
      }
      positionFish(f);
    }
  }

  function followNetFish(dt: number) {
    const k = 1 - Math.exp(-dt * 5);
    for (const f of fish) {
      if (!f) continue;
      const dx = f.rx - f.x;
      const dy = f.ry - f.y;
      const dz = f.rz - f.z;
      if (dx * dx + dy * dy + dz * dz > 64) {
        f.x = f.rx;
        f.y = f.ry;
        f.z = f.rz;
      } else {
        f.x += dx * k;
        f.y += dy * k;
        f.z += dz * k;
      }
      let dyaw = f.ryaw - f.yaw;
      dyaw = ((dyaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
      f.yaw += dyaw * k;
      positionFish(f);
    }
  }

  function newWinpup(x: number, z: number, rng: () => number): Winpup {
    const group = new THREE.Group();
    group.add(new THREE.Mesh(geo, material));
    ctx.scene.add(group);
    const y = hoverY(x, z);
    group.position.set(x, y, z);
    return {
      group, x, y, z, yaw: rng() * Math.PI * 2,
      ox: x, oz: z, targetX: x, targetZ: z,
      retargetMs: 0, dropMs: 1500 + rng() * 4000, fleeMs: 0,
      phase: rng() * Math.PI * 2,
      rx: x, ry: y, rz: z, ryaw: 0,
    };
  }

  function spawn(seed: number) {
    clear();
    timeMs = 0;
    dropped.clear();
    for (let y = 1; y < cfg.mundo.SY; y++)
      for (let z = 0; z < SZ; z++)
        for (let x = 0; x < SX; x++)
          if (world.get(x, y, z) === CANDY) dropped.set(candyKey(x, y, z), B.woolDespawnMs);
    const rng = mulberry32((seed ^ 0x7712bb) >>> 0);
    spawnPlovers(mulberry32((seed ^ 0x51e77) >>> 0));
    spawnYujack();
    let tries = 0;
    while (alive.length < B.quantos && tries < 400) {
      tries++;
      const x = 6 + Math.floor(rng() * (SX - 12)) + 0.5;
      const z = 6 + Math.floor(rng() * (SZ - 12)) + 0.5;
      const h = groundAt(x, z);
      if (world.get(Math.floor(x), h, Math.floor(z)) !== 1) continue;
      alive.push(newWinpup(x, z, rng));
    }
  }

  function candyNearby(cx: number, cz: number, surf: number): number {
    let n = 0;
    for (let dz = -5; dz <= 5; dz++) {
      for (let dx = -5; dx <= 5; dx++) {
        if (world.get(cx + dx, surf + 1, cz + dz) === CANDY) n++;
      }
    }
    return n;
  }

  function dropCandy(w: Winpup) {
    const cx = Math.floor(w.x);
    const cz = Math.floor(w.z);
    const surf = groundAt(cx, cz);
    if (surf < 1) return;
    if (world.get(cx, surf + 1, cz) !== 0) return;
    if (candyNearby(cx, cz, surf) >= B.maxLaPerto) return;
    world.set(cx, surf + 1, cz, CANDY);
    dropped.set(candyKey(cx, surf + 1, cz), timeMs + B.woolDespawnMs);
  }

  function despawnCandy() {
    for (const [key, expiresMs] of dropped) {
      if (timeMs < expiresMs) continue;
      const x = key % SX;
      const z = Math.floor(key / SX) % SZ;
      const y = Math.floor(key / (SX * SZ));
      if (world.get(x, y, z) === CANDY) world.set(x, y, z, 0);
      dropped.delete(key);
    }
  }

  function simulate(dt: number) {
    const dtMs = dt * 1000;
    const daytime = ctx.sky.time() < DIA_S;
    for (const w of alive) {
      if (timeMs >= w.retargetMs) {
        const ang = Math.random() * Math.PI * 2;
        const r = Math.random() * B.raioPasseio;
        w.targetX = Math.max(2, Math.min(SX - 2, w.ox + Math.cos(ang) * r));
        w.targetZ = Math.max(2, Math.min(SZ - 2, w.oz + Math.sin(ang) * r));
        w.retargetMs = timeMs + B.trocaAlvoMin + Math.random() * (B.trocaAlvoMax - B.trocaAlvoMin);
      }
      if (w.fleeMs > 0) w.fleeMs = Math.max(0, w.fleeMs - dtMs);
      const speed = w.fleeMs > 0 ? B.passeio * 3.2 : B.passeio;
      const dx = w.targetX - w.x;
      const dz = w.targetZ - w.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.05) {
        const step = Math.min(dist, speed * dt);
        w.x += (dx / dist) * step;
        w.z += (dz / dist) * step;
        w.yaw = Math.atan2(-dx, -dz);
      }
      w.y = hoverY(w.x, w.z);
      if (daytime && timeMs >= w.dropMs) {
        dropCandy(w);
        w.dropMs = timeMs + B.larguraDropMin + Math.random() * (B.larguraDropMax - B.larguraDropMin);
      } else if (!daytime) {
        w.dropMs = Math.max(w.dropMs, timeMs + 4000);
      }
      position(w, w.x, w.y, w.z, w.yaw);
    }
  }

  function position(w: Winpup, x: number, y: number, z: number, yaw: number) {
    const bob = Math.sin(timeMs / 1000 * Math.PI * 2 * B.bobHz + w.phase) * B.bobAmp;
    w.group.position.set(x, y + bob, z);
    w.group.rotation.y = yaw;
  }

  function followNet(dt: number) {
    const k = 1 - Math.exp(-dt * 5);
    for (const w of alive) {
      const dx = w.rx - w.x, dy = w.ry - w.y, dz = w.rz - w.z;
      if (dx * dx + dy * dy + dz * dz > 64) { w.x = w.rx; w.y = w.ry; w.z = w.rz; }
      else { w.x += dx * k; w.y += dy * k; w.z += dz * k; }
      let dyaw = w.ryaw - w.yaw;
      dyaw = ((dyaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
      w.yaw += dyaw * k;
      position(w, w.x, w.y, w.z, w.yaw);
    }
  }

  function collect() {
    const p = ctx.player;
    const halfW = 0.32;
    const x0 = Math.floor(p.x - halfW), x1 = Math.floor(p.x + halfW);
    const z0 = Math.floor(p.z - halfW), z1 = Math.floor(p.z + halfW);
    const y0 = Math.floor(p.y), y1 = Math.floor(p.y + 1);
    let n = 0;
    for (let y = y0; y <= y1; y++)
      for (let z = z0; z <= z1; z++)
        for (let x = x0; x <= x1; x++) {
          const id = world.get(x, y, z);
          if (id === CANDY) { world.set(x, y, z, 0); n++; }
          else if (id === PACKAGE) {
            const m = ctx.metas.get(x, y, z);
            world.set(x, y, z, 0);
            ctx.metas.remove(x, y, z);
            if (m && m.tipo === 'drop') {
              ctx.editing.gainItem(m.item, m.n);
              ctx.audio.soundSaved();
              ctx.ui.showToast('🎁 Pegou ' + m.n + '× ' + ctx.byId(m.item).nome + '!', 'ok', 1400);
            }
          }
        }
    if (n > 0) {
      ctx.editing.gainItem(CANDY, n);
      ctx.audio.soundSaved();
      ctx.ui.showToast(n > 1 ? '🍭 Peguei ' + n + ' algodões-doces!' : '🍭 Peguei um algodão-doce!', 'ok', 1400);
    }
  }

  return {
    spawn,
    step(dt, simulateMobs) {
      timeMs += dt * 1000;
      if (plovers.length) stepPlovers(dt);
      stepYujack(dt);
      if (simulateMobs) {
        despawnMs += dt * 1000;
        if (despawnMs >= 1000) { despawnMs = 0; despawnCandy(); }
        fishTryMs += dt * 1000;
        if (fishTryMs >= nextFishTryMs) {
          fishTryMs = 0;
          nextFishTryMs = F.tentativaMinMs + Math.random() * (F.tentativaMaxMs - F.tentativaMinMs);
          if (fishCount() < fishCap()) randomFishSpawn();
        }
        simulateFish(dt);
      } else {
        followNetFish(dt);
      }
      if (!alive.length) return;
      if (simulateMobs) simulate(dt);
      else followNet(dt);
      collectMs += dt * 1000;
      if (collectMs >= 120) { collectMs = 0; collect(); }
    },
    applyNet(mobs) {
      const seen = new Set<number>();
      for (const b of mobs) {
        if (b.i < FISH_WIRE_BASE) {
          const w = alive[b.i];
          if (!w) continue;
          w.rx = b.x; w.ry = b.y; w.rz = b.z; w.ryaw = b.yaw;
          continue;
        }
        const slot = b.i - FISH_WIRE_BASE;
        if (slot >= fish.length) continue;
        seen.add(slot);
        let f = fish[slot];
        if (!f) {
          f = createFish(b.x, b.y, b.z);
          fish[slot] = f;
        }
        f.rx = b.x; f.ry = b.y; f.rz = b.z; f.ryaw = b.yaw;
      }
      for (let s = 0; s < fish.length; s++) {
        const f = fish[s];
        if (f && !seen.has(s)) {
          ctx.scene.remove(f.group);
          fish[s] = null;
        }
      }
    },
    netState(): RemoteMob[] {
      const out: RemoteMob[] = alive.map((w, i) => ({
        i, x: +w.x.toFixed(2), y: +w.y.toFixed(2), z: +w.z.toFixed(2), yaw: +w.yaw.toFixed(2),
      }));
      fish.forEach((f, s) => {
        if (!f) return;
        out.push({
          i: FISH_WIRE_BASE + s,
          x: +f.x.toFixed(2), y: +f.y.toFixed(2), z: +f.z.toFixed(2), yaw: +f.yaw.toFixed(2),
        });
      });
      return out;
    },
    scare(ox, oy, oz, fx, fy, fz, range, cone) {
      let best: Winpup | null = null;
      let bestD = Infinity;
      for (const w of alive) {
        const dx = w.x - ox;
        const dy = w.y - oy;
        const dz = w.z - oz;
        const d = Math.hypot(dx, dy, dz);
        if (d > range || d < 0.001) continue;
        if ((fx * dx + fy * dy + fz * dz) / d < cone) continue;
        if (d < bestD) { bestD = d; best = w; }
      }
      if (!best) return false;
      const p = ctx.player;
      let ax = best.x - p.x;
      let az = best.z - p.z;
      const al = Math.hypot(ax, az) || 1;
      ax /= al;
      az /= al;
      best.ox = Math.max(2, Math.min(SX - 2, best.x + ax * 24));
      best.oz = Math.max(2, Math.min(SZ - 2, best.z + az * 24));
      best.targetX = best.ox;
      best.targetZ = best.oz;
      best.retargetMs = timeMs + 6000;
      best.fleeMs = 6000;
      return true;
    },
    clear,
    count: () => alive.length,
    fishCount,
    fishCap,
    spawnFishAt: (x, z) => trySpawnFish(x, z),
    ploverCount: () => plovers.length,
    ploverState: () => plovers.map((b) => ({ x: b.x, y: b.y, z: b.z, flying: b.flying })),
    yujackState: () => (yujack ? { x: yujack.x, y: yujack.y, z: yujack.z, sitting: yujack.sitting } : null),
  };
}
