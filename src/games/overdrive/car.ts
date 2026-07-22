import * as THREE from 'three';
import { coloredBox, mergeParts } from './mesh';
import type { CarTelemetry } from '../../lib/arcade-car';
import type { CarRig, Ctx } from './types';

export function createCar(ctx: Ctx): CarRig {
  const data = ctx.carData;
  const paint = new THREE.Color(data.cor);
  const paintHood = new THREE.Color(data.cor).multiplyScalar(1.08);
  const paintLow = new THREE.Color(data.cor).multiplyScalar(0.7);
  const glass = new THREE.Color(data.corCabine);
  const trim = new THREE.Color('#131318');
  const chrome = new THREE.Color('#d9dade');
  const headlight = new THREE.Color('#efe9d4');
  const blinker = new THREE.Color('#e8842a');
  const tail = new THREE.Color('#c22430');
  const badge = new THREE.Color('#d22a20');
  const tire = new THREE.Color('#0e0e12');
  const hubcap = new THREE.Color('#b8bcc4');
  const neon = new THREE.Color(data.neon);

  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ vertexColors: true });

  const bodyGeo = mergeParts([
    coloredBox(2.0, 0.34, 4.42, 0, 0.5, 0, paintLow),
    coloredBox(2.02, 0.44, 4.46, 0, 0.86, 0, paint),
    coloredBox(2.06, 0.1, 3.4, 0, 0.62, -0.1, trim),
    coloredBox(1.92, 0.12, 1.7, 0, 1.12, -1.32, paintHood),
    coloredBox(1.78, 0.4, 0.56, 0, 1.28, -0.62, glass),
    coloredBox(1.84, 0.06, 0.6, 0, 1.5, -0.58, paint),
    coloredBox(1.72, 0.44, 2.5, 0, 1.26, 0.55, glass),
    coloredBox(1.8, 0.1, 1.14, 0, 1.52, 0.06, paintHood),
    coloredBox(1.82, 0.16, 0.62, 0, 1.4, 0.92, paint),
    coloredBox(1.86, 0.18, 0.6, 0, 1.26, 1.42, paint),
    coloredBox(1.9, 0.22, 0.56, 0, 1.1, 1.88, paint),
    coloredBox(1.94, 0.34, 0.34, 0, 0.94, 2.14, paint),
    coloredBox(1.56, 0.26, 0.7, 0, 1.3, 1.28, glass),
    coloredBox(2.1, 0.22, 0.34, 0, 0.44, -2.2, trim),
    coloredBox(2.06, 0.07, 0.16, 0, 0.31, -2.24, chrome),
    coloredBox(2.1, 0.22, 0.3, 0, 0.44, 2.22, trim),
    coloredBox(1.9, 0.3, 0.1, 0, 0.9, -2.24, trim),
    coloredBox(0.34, 0.17, 0.06, -0.83, 0.9, -2.3, headlight),
    coloredBox(0.34, 0.17, 0.06, -0.45, 0.9, -2.3, headlight),
    coloredBox(0.34, 0.17, 0.06, 0.45, 0.9, -2.3, headlight),
    coloredBox(0.34, 0.17, 0.06, 0.83, 0.9, -2.3, headlight),
    coloredBox(0.12, 0.12, 0.06, 0, 0.9, -2.31, chrome),
    coloredBox(0.14, 0.1, 0.2, -1.0, 0.68, -2.18, blinker),
    coloredBox(0.14, 0.1, 0.2, 1.0, 0.68, -2.18, blinker),
    coloredBox(0.12, 0.07, 0.05, -0.62, 0.82, -2.31, badge),
    coloredBox(0.56, 0.16, 0.06, -0.6, 0.98, 2.31, tail),
    coloredBox(0.56, 0.16, 0.06, 0.6, 0.98, 2.31, tail),
    coloredBox(0.1, 0.08, 0.18, -1.0, 1.32, -0.42, trim),
    coloredBox(0.1, 0.08, 0.18, 1.0, 1.32, -0.42, trim),
  ])!;
  group.add(new THREE.Mesh(bodyGeo, material));

  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 5.6),
    new THREE.MeshBasicMaterial({ color: neon, transparent: true, opacity: 0.34, depthWrite: false }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.06;
  group.add(glow);

  const wheelGeo = mergeParts([
    coloredBox(0.32, 0.74, 0.74, 0, 0, 0, tire),
    coloredBox(0.36, 0.4, 0.4, 0, 0, 0, hubcap),
  ])!;
  const wheels: THREE.Mesh[] = [];
  const wheelPos: Array<[number, number, boolean]> = [
    [-1.02, -1.42, true],
    [1.02, -1.42, true],
    [-1.02, 1.5, false],
    [1.02, 1.5, false],
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
