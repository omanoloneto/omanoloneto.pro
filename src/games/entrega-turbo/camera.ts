// Câmera follow atrás do caminhão: suavização frame-rate-independent,
// nunca flipa em ré, e não entra em prédio (aproxima e sobe).
import * as THREE from 'three';
import type { Contexto } from './tipos';

export function criarCamera(ctx: Contexto) {
  const camAlvo = new THREE.Vector3();
  const camOlhar = new THREE.Vector3();
  const vistaAerea = new THREE.Vector3(0, 46, 46);
  let flyoverAte = 0;

  return {
    iniciarFlyover() {
      if (!ctx.motionReduzido) flyoverAte = performance.now() + 2000;
    },
    passo(dt: number) {
      const { truck, camera, mundo } = ctx;
      const fwdX = Math.sin(truck.heading);
      const fwdZ = Math.cos(truck.heading);
      camAlvo.set(truck.x - fwdX * 10, 6, truck.z - fwdZ * 10);
      // câmera cairia dentro de um prédio? aproxima do caminhão e sobe
      if (mundo.dentroDePredio(camAlvo.x, camAlvo.z)) {
        let achou = false;
        for (let t = 0.87; t >= 0.3; t -= 0.14) {
          const x = truck.x - fwdX * 10 * t;
          const z = truck.z - fwdZ * 10 * t;
          if (!mundo.dentroDePredio(x, z)) {
            camAlvo.set(x, 6 + (1 - t) * 11, z);
            achou = true;
            break;
          }
        }
        if (!achou) camAlvo.set(truck.x, 17, truck.z); // vista de cima como último recurso
      }
      camOlhar.set(truck.x + fwdX * 3, 1.5, truck.z + fwdZ * 3);
      const agora = performance.now();
      if (agora < flyoverAte) {
        // sobrevoo de abertura descendo da vista aérea
        const k = 1 - (flyoverAte - agora) / 2000;
        camera.position.lerpVectors(vistaAerea, camAlvo, k * k);
      } else {
        camera.position.lerp(camAlvo, 1 - Math.exp(-4 * dt));
      }
      camera.lookAt(camOlhar);
    },
  };
}
