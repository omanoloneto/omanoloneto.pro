export interface CarSpec {
  accel: number;
  topSpeed: number;
  reverseMax: number;
  brakeForce: number;
  coastDrag: number;
  steerRate: number;
  steerFalloff: number;
  gripRoad: number;
  gripDrift: number;
  driftSteerBoost: number;
  minSteerSpeed: number;
  driftThreshold: number;
}

export interface CarState {
  x: number;
  z: number;
  heading: number;
  vx: number;
  vz: number;
}

export interface CarControls {
  accel: boolean;
  brake: boolean;
  left: boolean;
  right: boolean;
  handbrake: boolean;
}

export interface Surface {
  dragMul: number;
  gripMul: number;
  topSpeedMul: number;
}

export interface CarTelemetry {
  speedFwd: number;
  lateral: number;
  drifting: boolean;
  steer: number;
}

export const ROAD_SURFACE: Surface = { dragMul: 1, gripMul: 1, topSpeedMul: 1 };

export function stepArcadeCar(car: CarState, spec: CarSpec, input: CarControls, surface: Surface, dt: number): CarTelemetry {
  const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  let fwdX = Math.sin(car.heading);
  let fwdZ = Math.cos(car.heading);
  let speedFwd = car.vx * fwdX + car.vz * fwdZ;

  if (steer && Math.abs(speedFwd) > spec.minSteerSpeed) {
    const power = spec.steerRate *
      Math.min(1, Math.abs(speedFwd) / 7) *
      (1 / (1 + spec.steerFalloff * Math.abs(speedFwd))) *
      (input.handbrake ? spec.driftSteerBoost : 1);
    car.heading += steer * power * Math.sign(speedFwd) * dt;
  }

  fwdX = Math.sin(car.heading);
  fwdZ = Math.cos(car.heading);
  const rightX = Math.cos(car.heading);
  const rightZ = -Math.sin(car.heading);
  speedFwd = car.vx * fwdX + car.vz * fwdZ;
  let lateral = car.vx * rightX + car.vz * rightZ;

  const top = spec.topSpeed * surface.topSpeedMul;
  if (input.accel && !input.brake) {
    if (speedFwd < top) speedFwd = Math.min(top, speedFwd + spec.accel * dt);
  }
  if (input.brake) {
    if (speedFwd > 0.4) speedFwd = Math.max(0, speedFwd - spec.brakeForce * dt);
    else speedFwd = Math.max(-spec.reverseMax, speedFwd - spec.accel * 0.55 * dt);
  }
  const rolling = input.accel && !input.brake ? 0.08 : spec.coastDrag;
  speedFwd -= speedFwd * rolling * surface.dragMul * dt;
  if (speedFwd > top) speedFwd -= (speedFwd - top) * 2.5 * dt;
  if (input.handbrake) speedFwd -= speedFwd * 1.2 * dt;
  if (!input.accel && !input.brake && Math.abs(speedFwd) < 0.05) speedFwd = 0;

  const grip = (input.handbrake ? spec.gripDrift : spec.gripRoad) * surface.gripMul;
  lateral *= Math.exp(-grip * dt);

  car.vx = fwdX * speedFwd + rightX * lateral;
  car.vz = fwdZ * speedFwd + rightZ * lateral;
  car.x += car.vx * dt;
  car.z += car.vz * dt;

  return { speedFwd, lateral, drifting: Math.abs(lateral) > spec.driftThreshold, steer };
}
