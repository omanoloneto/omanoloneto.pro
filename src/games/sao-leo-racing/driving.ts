import { stepArcadeCar, type CarTelemetry } from '../../lib/arcade-car';
import type { Ctx, Driving } from './types';

export function createDriving(ctx: Ctx): Driving {
  const { cfg } = ctx;
  let tel: CarTelemetry = { speedFwd: 0, lateral: 0, drifting: false, steer: 0 };
  let lastHitMs = -1e9;
  let placeMs = 0;

  function collide() {
    const car = ctx.car.state;
    const r = cfg.colisao.raio;
    const cell = cfg.mundo.celula;
    let bumped = false;
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const cx = Math.floor((car.x + dx * cell) / cell) * cell + cell / 2;
        const cz = Math.floor((car.z + dz * cell) / cell) * cell + cell / 2;
        if (!ctx.city.solidAt(cx, cz)) continue;
        const minX = cx - cell / 2;
        const maxX = cx + cell / 2;
        const minZ = cz - cell / 2;
        const maxZ = cz + cell / 2;
        const px = Math.max(minX, Math.min(car.x, maxX));
        const pz = Math.max(minZ, Math.min(car.z, maxZ));
        const ddx = car.x - px;
        const ddz = car.z - pz;
        const d2 = ddx * ddx + ddz * ddz;
        if (d2 >= r * r) continue;
        const d = Math.sqrt(d2) || 0.001;
        car.x += (ddx / d) * (r - d);
        car.z += (ddz / d) * (r - d);
        bumped = true;
      }
    }
    if (bumped) {
      const speed = Math.hypot(car.vx, car.vz);
      const now = performance.now();
      if (speed > 6 && now - lastHitMs > cfg.colisao.batidaCooldownMs) {
        lastHitMs = now;
        car.vx *= cfg.colisao.batidaFreio;
        car.vz *= cfg.colisao.batidaFreio;
        ctx.car.hit();
        ctx.audio.crash();
      }
    }
  }

  return {
    step(dt: number) {
      const car = ctx.car.state;
      const kind = ctx.city.surfaceAt(car.x, car.z);
      const surface = kind === 'rua' ? ctx.surfaces.rua : kind === 'trilho' ? ctx.surfaces.trilho : ctx.surfaces.grama;
      tel = stepArcadeCar(car, ctx.carData.fisica, ctx.input, surface, dt);
      collide();
      ctx.car.update(dt, tel);
      ctx.ui.setSpeed(Math.abs(tel.speedFwd) * 3.6);
      placeMs += dt * 1000;
      if (placeMs > 300) {
        placeMs = 0;
        const near = ctx.city.nearestLandmark(car.x, car.z);
        if (near && near.dist < cfg.hud.marcoDist) ctx.ui.setPlace(near.nome, near.emoji);
        else ctx.ui.setPlace(null);
      }
    },
    telemetry: () => tel,
  };
}
