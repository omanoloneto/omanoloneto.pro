import * as THREE from 'three';
import { coloredBox, mergeParts } from './mesh';
import type { CarTelemetry } from '../../lib/arcade-car';
import type { CarRig, Ctx } from './types';

export function createCar(ctx: Ctx): CarRig {
  const data = ctx.carData;
  const body = new THREE.Color(data.cor);
  const bodyDark = new THREE.Color(data.cor).multiplyScalar(0.55);
  const cab = new THREE.Color(data.corCabine);
  const neon = new THREE.Color(data.neon);
  const light = new THREE.Color('#fff6c8');
  const tail = new THREE.Color('#ff2a3c');
  const tire = new THREE.Color('#101014');

  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ vertexColors: true });

  const bodyGeo = mergeParts([
    coloredBox(2.1, 0.55, 4.4, 0, 0.62, 0, body),
    coloredBox(2.14, 0.2, 4.44, 0, 0.36, 0, bodyDark),
    coloredBox(1.7, 0.5, 2.2, 0, 1.1, 0.15, cab),
    coloredBox(1.72, 0.1, 2.24, 0, 1.36, 0.15, body),
    coloredBox(2.0, 0.14, 0.7, 0, 0.95, 2.0, bodyDark),
    coloredBox(0.42, 0.18, 0.1, -0.7, 0.62, -2.22, light),
    coloredBox(0.42, 0.18, 0.1, 0.7, 0.62, -2.22, light),
    coloredBox(0.5, 0.16, 0.1, -0.7, 0.66, 2.22, tail),
    coloredBox(0.5, 0.16, 0.1, 0.7, 0.66, 2.22, tail),
  ])!;
  group.add(new THREE.Mesh(bodyGeo, material));

  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 5.6),
    new THREE.MeshBasicMaterial({ color: neon, transparent: true, opacity: 0.34, depthWrite: false }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.06;
  group.add(glow);

  const wheelGeo = new THREE.BoxGeometry(0.34, 0.72, 0.72);
  const wheelMat = new THREE.MeshBasicMaterial({ color: tire });
  const wheels: THREE.Mesh[] = [];
  const wheelPos: Array<[number, number, boolean]> = [
    [-1.05, -1.45, true],
    [1.05, -1.45, true],
    [-1.05, 1.5, false],
    [1.05, 1.5, false],
  ];
  const steerPivots: THREE.Group[] = [];
  for (const [wx, wz, steerable] of wheelPos) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    const pivot = new THREE.Group();
    pivot.position.set(wx, 0.36, wz);
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
      const spin = (tel.speedFwd * dt) / 0.36;
      for (const w of wheels) w.rotation.x += spin;
      const steerAngle = tel.steer * 0.42;
      for (const p of steerPivots) p.rotation.y += (steerAngle - p.rotation.y) * (1 - Math.exp(-10 * dt));
      const squash = performance.now() < squashUntil && !ctx.reducedMotion ? 0.88 : 1;
      group.scale.set(2 - squash, squash, squash);
      glow.material.opacity = tel.drifting ? 0.55 : 0.34;
    },
  };
}
