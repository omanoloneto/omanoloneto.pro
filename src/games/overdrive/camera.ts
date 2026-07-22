import * as THREE from 'three';
import type { ChaseCam, Ctx } from './types';

export function createChaseCam(ctx: Ctx): ChaseCam {
  const C = ctx.cfg.camera;
  const target = new THREE.Vector3();
  const look = new THREE.Vector3();

  function computeTarget() {
    const car = ctx.car.state;
    const fwdX = Math.sin(car.heading);
    const fwdZ = Math.cos(car.heading);
    let x = car.x - fwdX * C.dist;
    let z = car.z - fwdZ * C.dist;
    let y = C.altura;
    const top = ctx.city.buildingTopAt(x, z);
    if (top > 0) y = Math.max(y, top + 2.2);
    target.set(x, y, z);
    look.set(car.x + fwdX * C.lookAhead, C.lookAltura, car.z + fwdZ * C.lookAhead);
  }

  return {
    snap() {
      computeTarget();
      ctx.camera.position.copy(target);
      ctx.camera.lookAt(look);
    },
    step(dt: number) {
      computeTarget();
      ctx.camera.position.lerp(target, 1 - Math.exp(-C.lagK * dt));
      ctx.camera.lookAt(look);
      const tel = ctx.driving.telemetry();
      const speedK = Math.min(1, Math.abs(tel.speedFwd) / ctx.carData.fisica.topSpeed);
      const fovTarget = ctx.reducedMotion ? C.fov : C.fov + C.fovKick * speedK;
      const fovNext = ctx.camera.fov + (fovTarget - ctx.camera.fov) * (1 - Math.exp(-4 * dt));
      if (Math.abs(fovNext - ctx.camera.fov) > 0.01) {
        ctx.camera.fov = fovNext;
        ctx.camera.updateProjectionMatrix();
      }
    },
  };
}
