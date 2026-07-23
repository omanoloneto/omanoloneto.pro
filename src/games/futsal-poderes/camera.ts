import type { CameraPES, Ctx } from './tipos';

export function criarCameraPES(ctx: Ctx): CameraPES {
  const C = ctx.cfg.camera;
  const comp = ctx.cfg.campo.comprimento;
  const cam = ctx.camera;
  const limX = comp * 0.34;

  function alvo() {
    const b = ctx.mundo.bola;
    const ax = Math.max(-limX, Math.min(limX, b.x * 0.85));
    const az = b.z * C.seguirZ;
    return { ax, az };
  }

  function aplicar(k: number) {
    const { ax, az } = alvo();
    const px = ax;
    const py = C.altura;
    const pz = az + C.distancia;
    cam.position.x += (px - cam.position.x) * k;
    cam.position.y += (py - cam.position.y) * k;
    cam.position.z += (pz - cam.position.z) * k;
    cam.lookAt(ax, C.tilt * C.altura, az - C.olhaFrente);
  }

  return {
    passo(dt: number) {
      aplicar(1 - Math.exp(-C.lag * dt));
    },
    reset() {
      const { ax, az } = alvo();
      cam.position.set(ax, C.altura, az + C.distancia);
      cam.lookAt(ax, C.tilt * C.altura, az - C.olhaFrente);
    },
  };
}
