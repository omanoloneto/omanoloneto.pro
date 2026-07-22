import * as THREE from 'three';
import { mergeParts, shadedPrism, shadeGeometry } from './mesh';
import type { CarTelemetry } from '../../lib/arcade-car';
import type { CarRig, Ctx } from './types';

export function createCar(ctx: Ctx): CarRig {
  const data = ctx.carData;
  const paint = new THREE.Color(data.cor);
  const paintLow = new THREE.Color(data.cor).multiplyScalar(0.78);
  const glass = new THREE.Color(data.corCabine);
  const trim = new THREE.Color('#131318');
  const chrome = new THREE.Color('#d9dade');
  const headlight = new THREE.Color('#efe9d4');
  const blinker = new THREE.Color('#e8842a');
  const tail = new THREE.Color('#c22430');
  const badge = new THREE.Color('#d22a20');
  const plate = new THREE.Color('#c8c9ce');
  const tire = new THREE.Color('#111116');
  const hubcap = new THREE.Color('#c2c6ce');
  const neon = new THREE.Color(data.neon);

  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ vertexColors: true });

  const P = shadedPrism;
  const parts: THREE.BufferGeometry[] = [
    P(1.88, 0.16, 4.28, 0, 0.3, 0, trim),
    P(2.02, 0.52, 4.46, 0, 0.64, 0, paintLow, { sx: 1.0 }),
    P(2.04, 0.08, 3.4, 0, 0.5, -0.05, trim),
    P(2.0, 0.24, 4.46, 0, 1.02, 0, paint, { sx: 0.97 }),
    P(1.94, 0.22, 1.72, 0, 1.05, -1.39, paint, { yFront: -0.12, sx: 0.93 }),
    P(1.8, 0.38, 0.56, 0, 1.33, -0.46, glass, { oz: 0.34, sx: 0.88 }),
    P(1.64, 0.09, 0.8, 0, 1.565, 0.2, paint, { sx: 0.97 }),
    P(1.82, 0.36, 0.97, 0, 1.32, 0.33, glass, { sx: 0.88 }),
    P(1.9, 0.62, 1.58, 0, 1.21, 1.37, paint, { yFront: 0.08, yBack: -0.5, sx: 0.92 }),
    P(1.58, 0.17, 0.82, 0, 1.39, 1.01, glass, { yBack: -0.26, sx: 0.9 }),
    P(1.96, 0.47, 0.3, 0, 0.78, 2.23, paint, { sx: 0.97, yBack: -0.06 }),
    P(0.09, 0.46, 1.14, -1.03, 0.6, -1.42, trim, { sz: 0.68 }),
    P(0.09, 0.46, 1.14, 1.03, 0.6, -1.42, trim, { sz: 0.68 }),
    P(0.09, 0.46, 1.14, -1.03, 0.6, 1.5, trim, { sz: 0.68 }),
    P(0.09, 0.46, 1.14, 1.03, 0.6, 1.5, trim, { sz: 0.68 }),
    P(2.06, 0.09, 3.44, 0, 0.68, -0.05, trim),
    P(2.1, 0.22, 0.32, 0, 0.42, -2.28, trim, { yFront: -0.05 }),
    P(2.02, 0.06, 0.1, 0, 0.32, -2.38, chrome),
    P(2.1, 0.22, 0.3, 0, 0.42, 2.28, trim, { yBack: -0.05 }),
    P(1.46, 0.26, 0.08, 0, 0.9, -2.26, trim),
    P(0.32, 0.15, 0.07, -0.82, 0.9, -2.28, headlight, { flat: true }),
    P(0.32, 0.15, 0.07, -0.46, 0.9, -2.28, headlight, { flat: true }),
    P(0.32, 0.15, 0.07, 0.46, 0.9, -2.28, headlight, { flat: true }),
    P(0.32, 0.15, 0.07, 0.82, 0.9, -2.28, headlight, { flat: true }),
    P(0.13, 0.13, 0.06, 0, 0.9, -2.3, chrome),
    P(0.11, 0.06, 0.05, -0.6, 0.81, -2.29, badge, { flat: true }),
    P(0.13, 0.11, 0.24, -1.0, 0.66, -2.2, blinker, { flat: true }),
    P(0.13, 0.11, 0.24, 1.0, 0.66, -2.2, blinker, { flat: true }),
    P(1.88, 0.2, 0.07, 0, 0.97, 2.4, trim),
    P(0.62, 0.15, 0.06, -0.58, 0.97, 2.43, tail, { flat: true }),
    P(0.62, 0.15, 0.06, 0.58, 0.97, 2.43, tail, { flat: true }),
    P(0.44, 0.16, 0.05, 0, 0.72, 2.4, plate, { flat: true }),
    P(0.02, 0.42, 0.03, -1.02, 0.92, -0.42, trim),
    P(0.02, 0.42, 0.03, 1.02, 0.92, -0.42, trim),
    P(0.02, 0.42, 0.03, -1.01, 0.92, 0.68, trim),
    P(0.02, 0.42, 0.03, 1.01, 0.92, 0.68, trim),
    P(0.1, 0.07, 0.2, -1.0, 1.28, -0.5, trim),
    P(0.1, 0.07, 0.2, 1.0, 1.28, -0.5, trim),
    P(0.4, 0.02, 0.05, -0.42, 1.16, -0.72, trim),
    P(0.4, 0.02, 0.05, 0.2, 1.16, -0.72, trim),
    P(0.02, 0.34, 0.02, -0.88, 1.28, 1.9, trim),
    P(0.16, 0.09, 0.22, 0.62, 0.3, 2.3, trim),
  ];
  const bodyGeo = mergeParts(parts)!;
  group.add(new THREE.Mesh(bodyGeo, material));

  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 5.6),
    new THREE.MeshBasicMaterial({ color: neon, transparent: true, opacity: 0.34, depthWrite: false }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.06;
  group.add(glow);

  function cyl(r: number, len: number, segs: number, color: THREE.Color): THREE.BufferGeometry {
    const g = new THREE.CylinderGeometry(r, r, len, segs);
    g.rotateZ(Math.PI / 2);
    return shadeGeometry(g.toNonIndexed(), color);
  }
  const wheelGeo = mergeParts([
    cyl(0.37, 0.3, 14, tire),
    cyl(0.21, 0.32, 10, hubcap),
    cyl(0.07, 0.34, 8, trim),
  ])!;
  const wheels: THREE.Mesh[] = [];
  const wheelPos: Array<[number, number, boolean]> = [
    [-0.92, -1.42, true],
    [0.92, -1.42, true],
    [-0.92, 1.5, false],
    [0.92, 1.5, false],
  ];
  const steerPivots: THREE.Group[] = [];
  for (const [wx, wz, steerable] of wheelPos) {
    const wheel = new THREE.Mesh(wheelGeo, material);
    const pivot = new THREE.Group();
    pivot.position.set(wx, 0.37, wz);
    pivot.add(wheel);
    group.add(pivot);
    wheels.push(wheel);
    if (steerable) steerPivots.push(pivot);
  }

  ctx.scene.add(group);

  const state = { x: ctx.map.spawn.x, z: ctx.map.spawn.z, heading: ctx.map.spawn.heading, vx: 0, vz: 0 };
  let squashUntil = 0;
  let roll = 0;

  return {
    state,
    group,
    hit() {
      squashUntil = performance.now() + 110;
    },
    update(dt: number, tel: CarTelemetry) {
      group.position.set(state.x, 0, state.z);
      group.rotation.y = state.heading + Math.PI;
      const targetRoll = Math.max(-0.16, Math.min(0.16, -tel.lateral * 0.014));
      roll += (targetRoll - roll) * (1 - Math.exp(-8 * dt));
      group.rotation.z = roll;
      const spin = (tel.speedFwd * dt) / 0.37;
      for (const w of wheels) w.rotation.x += spin;
      const steerAngle = tel.steer * 0.42;
      for (const p of steerPivots) p.rotation.y += (steerAngle - p.rotation.y) * (1 - Math.exp(-10 * dt));
      const squash = performance.now() < squashUntil && !ctx.reducedMotion ? 0.88 : 1;
      group.scale.set(2 - squash, squash, squash);
      glow.material.opacity = tel.drifting ? 0.55 : 0.34;
    },
  };
}
