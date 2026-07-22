import * as THREE from 'three';
import { archFlare, loftHull, mergeParts, shadedPrism } from './mesh';
import type { LoftStation, UVRect } from './mesh';
import { createCarAtlas, subU, subV } from './car-texture';
import { buildRim, buildSpoiler } from './parts';
import type { CarAnchors, CarColors } from './parts';
import type { PecaAerofolio, PecaAro, PecasCarro } from '../../data/overdrive';
import type { CarTelemetry } from '../../lib/arcade-car';
import type { CarRig, Ctx, SlotId } from './types';

export function createCar(ctx: Ctx): CarRig {
  const data = ctx.carData;
  const paint = new THREE.Color(data.cor);
  const paintLow = new THREE.Color(data.cor).multiplyScalar(0.78);
  const trim = new THREE.Color('#131318');
  const chrome = new THREE.Color('#d9dade');
  const tire = new THREE.Color('#111116');
  const white = new THREE.Color('#ffffff');
  const neon = new THREE.Color(data.neon);

  const atlas = createCarAtlas(ctx.stage.lowTier, () => {
    if (!ctx.stage.running()) ctx.stage.render();
  });
  ctx.textures.carro = atlas.texture;
  const r = atlas.r;
  const material = new THREE.MeshBasicMaterial({ vertexColors: true, map: atlas.texture });
  const group = new THREE.Group();

  const S: LoftStation[] = [
    { z: -2.28, pts: [[0, 0.24], [0.62, 0.26], [0.78, 0.36], [0.84, 0.56], [0.86, 0.76], [0.84, 0.8], [0.6, 0.81], [0.3, 0.82], [0, 0.83]] },
    { z: -2.05, pts: [[0, 0.2], [0.72, 0.22], [0.9, 0.34], [0.96, 0.58], [0.98, 0.82], [0.96, 0.87], [0.68, 0.88], [0.34, 0.89], [0, 0.9]] },
    { z: -1.8, pts: [[0, 0.2], [0.74, 0.22], [0.93, 0.34], [0.99, 0.6], [1.0, 0.85], [0.98, 0.9], [0.7, 0.92], [0.35, 0.93], [0, 0.94]] },
    { z: -1.42, pts: [[0, 0.2], [0.75, 0.22], [0.94, 0.34], [1.01, 0.62], [1.02, 0.87], [0.99, 0.92], [0.72, 0.94], [0.36, 0.95], [0, 0.96]] },
    { z: -1.0, pts: [[0, 0.2], [0.76, 0.22], [0.95, 0.34], [1.0, 0.63], [1.0, 0.9], [0.97, 0.95], [0.73, 0.96], [0.37, 0.97], [0, 0.98]] },
    { z: -0.68, pts: [[0, 0.2], [0.76, 0.22], [0.95, 0.34], [1.0, 0.64], [1.0, 0.96], [0.96, 1.05], [0.86, 1.07], [0.66, 1.08], [0, 1.09]] },
    { z: -0.12, pts: [[0, 0.2], [0.77, 0.22], [0.95, 0.34], [1.0, 0.64], [1.0, 0.98], [0.96, 1.08], [0.82, 1.12], [0.66, 1.52], [0, 1.58]] },
    { z: 0.55, pts: [[0, 0.2], [0.77, 0.22], [0.95, 0.34], [1.0, 0.64], [1.0, 0.98], [0.96, 1.08], [0.83, 1.12], [0.67, 1.54], [0, 1.6]] },
    { z: 1.02, pts: [[0, 0.2], [0.76, 0.22], [0.95, 0.34], [1.0, 0.63], [1.0, 0.98], [0.96, 1.06], [0.84, 1.09], [0.7, 1.35], [0, 1.43]] },
    { z: 1.48, pts: [[0, 0.2], [0.75, 0.22], [0.94, 0.34], [1.01, 0.62], [1.02, 0.98], [0.98, 1.04], [0.86, 1.06], [0.72, 1.18], [0, 1.24]] },
    { z: 1.9, pts: [[0, 0.22], [0.73, 0.24], [0.92, 0.35], [0.98, 0.6], [0.99, 0.96], [0.95, 1.0], [0.85, 1.02], [0.72, 1.05], [0, 1.08]] },
    { z: 2.16, pts: [[0, 0.24], [0.7, 0.26], [0.9, 0.36], [0.96, 0.6], [0.97, 0.94], [0.94, 0.99], [0.8, 1.0], [0.5, 1.01], [0, 1.02]] },
    { z: 2.38, pts: [[0, 0.3], [0.64, 0.32], [0.84, 0.4], [0.92, 0.6], [0.94, 0.9], [0.92, 0.94], [0.76, 0.95], [0.46, 0.96], [0, 0.97]] },
  ];
  const Z = S.map((st) => st.z);

  const anchors: CarAnchors = {
    halfWidth: 1.0,
    deckY: 1.02,
    deckZ: 2.16,
    rearZ: 2.38,
    frontZ: -2.28,
    sillY: 0.34,
    wheelRadius: 0.37,
    wheelWidth: 0.3,
  };
  const colors: CarColors = { paint, trim, tire };

  function spanU(rc: UVRect, band: number, zA: number, zB: number): UVRect {
    const u0 = Math.max(0, Math.min(1, (Z[band] - zA) / (zB - zA)));
    const u1 = Math.max(0, Math.min(1, (Z[band + 1] - zA) / (zB - zA)));
    return subU(rc, u0, u1);
  }
  const sideV: Record<number, [number, number]> = { 4: [0, 0.18], 3: [0.18, 0.72], 2: [0.72, 1] };
  function isGlass(band: number, seg: number): boolean {
    if (band === 5 && seg === 7) return true;
    if ((band === 6 || band === 7) && seg === 6) return true;
    if ((band === 7 || band === 8 || band === 9) && seg === 7) return true;
    return false;
  }
  function hullUV(band: number, seg: number): UVRect | null {
    if (band === 5 && seg === 7) return r.glassFront;
    if (band === 6 && seg === 6) return subU(r.glassSide, 0, 0.6);
    if (band === 7 && seg === 6) return subU(r.glassSide, 0.6, 1);
    if (band === 7 && seg === 7) return subV(r.glassRear, 0, 0.34);
    if (band === 8 && seg === 7) return subV(r.glassRear, 0.34, 0.67);
    if (band === 9 && seg === 7) return subV(r.glassRear, 0.67, 1);
    if (band >= 1 && band <= 10 && sideV[seg]) {
      const [a, b] = sideV[seg];
      return subV(spanU(r.side, band, -2.05, 2.16), a, b);
    }
    if (band <= 4 && (seg === 6 || seg === 7)) {
      return subV(spanU(r.hood, band, -2.28, -0.68), seg === 7 ? 0 : 0.5, seg === 7 ? 0.5 : 1);
    }
    return null;
  }
  const hull = loftHull(S, paint, {
    colorFor: (band, seg) => (isGlass(band, seg) ? white : null),
    uvFor: (band, seg) => hullUV(band, seg),
  });

  const P = shadedPrism;
  const details: THREE.BufferGeometry[] = [
    P(1.7, 0.3, 0.05, 0, 0.66, -2.29, white, { flat: true, uv: { front: r.fascia, back: r.dark, left: r.dark, right: r.dark, top: r.dark, bottom: r.dark } }),
    P(1.94, 0.12, 0.18, 0, 0.42, -2.28, chrome),
    P(1.96, 0.05, 0.19, 0, 0.34, -2.27, trim),
    P(1.78, 0.26, 0.05, 0, 0.82, 2.4, white, { flat: true, uv: { back: r.tail, front: r.dark, left: r.dark, right: r.dark, top: r.dark, bottom: r.dark } }),
    P(0.44, 0.15, 0.04, 0, 0.62, 2.43, white, { flat: true, uv: { back: r.plate, front: r.dark, left: r.dark, right: r.dark, top: r.dark, bottom: r.dark } }),
    P(1.9, 0.12, 0.18, 0, 0.44, 2.42, chrome),
    P(1.92, 0.05, 0.19, 0, 0.36, 2.41, trim),
    P(0.05, 0.05, 0.06, -0.99, 1.05, -0.52, trim),
    P(0.05, 0.05, 0.06, 0.99, 1.05, -0.52, trim),
    P(0.17, 0.11, 0.05, -1.08, 1.11, -0.54, chrome),
    P(0.17, 0.11, 0.05, 1.08, 1.11, -0.54, chrome),
    P(0.4, 0.06, 0.04, -0.42, 1.075, -0.7, trim),
    P(0.4, 0.06, 0.04, 0.2, 1.075, -0.7, trim),
    P(0.015, 0.3, 0.015, -0.88, 1.22, -0.62, chrome),
    P(0.14, 0.07, 0.18, 0.6, 0.26, 2.34, trim),
  ];

  const archBase = { radius: 0.47, lipWidth: 0.06, depth: 0.16, segments: 8, lipColor: paintLow, tubColor: new THREE.Color('#141419') };
  const arches = [
    archFlare({ ...archBase, x: 1.03, y: 0.37, z: -1.42 }),
    archFlare({ ...archBase, x: -1.03, y: 0.37, z: -1.42 }),
    archFlare({ ...archBase, x: 1.03, y: 0.37, z: 1.5 }),
    archFlare({ ...archBase, x: -1.03, y: 0.37, z: 1.5 }),
  ];

  const bodyGeo = mergeParts([hull, ...arches, ...details])!;
  group.add(new THREE.Mesh(bodyGeo, material));

  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 5.6),
    new THREE.MeshBasicMaterial({ color: neon, transparent: true, opacity: 0.34, depthWrite: false }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.06;
  group.add(glow);

  function rimDef(id: string): PecaAro {
    return ctx.parts.aro.find((p) => p.id === id) ?? ctx.parts.aro[0];
  }
  let wheelGeo = buildRim(rimDef(data.pecas.aro), colors, anchors, r.hubcap, r.rimFace);
  const wheels: THREE.Mesh[] = [];
  const steerPivots: THREE.Group[] = [];
  const wheelPos: Array<[number, number, boolean]> = [
    [-0.92, -1.42, true],
    [0.92, -1.42, true],
    [-0.92, 1.5, false],
    [0.92, 1.5, false],
  ];
  for (const [wx, wz, steerable] of wheelPos) {
    const wheel = new THREE.Mesh(wheelGeo, material);
    const pivot = new THREE.Group();
    pivot.position.set(wx, 0.37, wz);
    pivot.add(wheel);
    group.add(pivot);
    wheels.push(wheel);
    if (steerable) steerPivots.push(pivot);
  }

  const loadout: PecasCarro = { aro: rimDef(data.pecas.aro).id, aerofolio: null };
  let spoilerMesh: THREE.Mesh | null = null;

  function applyRim(def: PecaAro) {
    const geo = buildRim(def, colors, anchors, r.hubcap, r.rimFace);
    for (const w of wheels) w.geometry = geo;
    wheelGeo.dispose();
    wheelGeo = geo;
  }
  function applySpoiler(def: PecaAerofolio | null) {
    if (spoilerMesh) {
      group.remove(spoilerMesh);
      spoilerMesh.geometry.dispose();
      spoilerMesh = null;
    }
    if (def) {
      spoilerMesh = new THREE.Mesh(buildSpoiler(def, colors, anchors), material);
      group.add(spoilerMesh);
    }
  }
  function setPart(slot: SlotId, id: string | null): boolean {
    if (slot === 'aro') {
      const def = id ? ctx.parts.aro.find((p) => p.id === id) : undefined;
      if (!def) return false;
      applyRim(def);
      loadout.aro = def.id;
      return true;
    }
    if (id === null) {
      applySpoiler(null);
      loadout.aerofolio = null;
      return true;
    }
    const def = ctx.parts.aerofolio.find((p) => p.id === id);
    if (!def) return false;
    applySpoiler(def);
    loadout.aerofolio = def.id;
    return true;
  }
  if (data.pecas.aerofolio) setPart('aerofolio', data.pecas.aerofolio);

  ctx.scene.add(group);

  const state = { x: ctx.map.spawn.x, z: ctx.map.spawn.z, heading: ctx.map.spawn.heading, vx: 0, vz: 0 };
  group.position.set(state.x, 0, state.z);
  group.rotation.y = state.heading + Math.PI;
  let squashUntil = 0;
  let roll = 0;

  return {
    state,
    group,
    loadout,
    setPart,
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
      for (const w of wheels) w.rotation.x -= spin;
      const steerAngle = tel.steer * 0.42;
      for (const p of steerPivots) p.rotation.y += (steerAngle - p.rotation.y) * (1 - Math.exp(-10 * dt));
      const squash = performance.now() < squashUntil && !ctx.reducedMotion ? 0.88 : 1;
      group.scale.set(2 - squash, squash, squash);
      glow.material.opacity = tel.drifting ? 0.55 : 0.34;
    },
  };
}
