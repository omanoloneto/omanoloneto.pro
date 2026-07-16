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
      // câmera cairia dentro de prédio ou da terra do talude? aproxima do
      // caminhão e sobe — mas sem subir se estamos embaixo do viaduto, senão
      // o tabuleiro tapa o caminhão
      const solido = (x: number, z: number, y: number) =>
        mundo.dentroDePredio(x, z) || mundo.dentroDeAterro(x, z, y);
      const sobDeck = mundo.sobViaduto(truck.x, truck.z);
      if (solido(camAlvo.x, camAlvo.z, camAlvo.y)) {
        let achou = false;
        for (let t = 0.87; t >= 0.3; t -= 0.14) {
          const x = truck.x - fwdX * 10 * t;
          const z = truck.z - fwdZ * 10 * t;
          const y = sobDeck ? 6 : 6 + (1 - t) * 11;
          if (!solido(x, z, y)) {
            camAlvo.set(x, y, z);
            achou = true;
            break;
          }
        }
        // último recurso: de cima (ou colado no caminhão, se há laje em cima)
        if (!achou) camAlvo.set(truck.x, sobDeck ? 6 : 17, truck.z);
      }
      camOlhar.set(truck.x + fwdX * 3, 1.5, truck.z + fwdZ * 3);
      const agora = performance.now();
      if (agora < flyoverAte) {
        // sobrevoo de abertura descendo da vista aérea
        const k = 1 - (flyoverAte - agora) / 2000;
        camera.position.lerpVectors(vistaAerea, camAlvo, k * k);
      } else {
        // k=6: o atraso em regime é v/k, então 15 m/s aqui dá os mesmos
        // 2,5m de folga que 10 m/s dava com k=4 — a câmera não descola
        camera.position.lerp(camAlvo, 1 - Math.exp(-6 * dt));
      }
      camera.lookAt(camOlhar);
    },
  };
}
