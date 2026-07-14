// Céu: cor de fundo, fog leve (só em GPU de verdade) e nuvens —
// quads brancos opacos bem no alto, com drift lento.
import * as THREE from 'three';
import type { Contexto } from './tipos';

export function criarCeu(ctx: Contexto) {
  const { scene, cfg } = ctx;
  const { SX, SZ } = cfg.mundo;
  scene.background = new THREE.Color(0x87c6ea);
  if (!ctx.tierBaixo) scene.fog = new THREE.Fog(0x87c6ea, 90, 220);

  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const nuvens: THREE.Mesh[] = [];
  const rnd = (a: number, b: number) => a + Math.random() * (b - a);
  for (let i = 0; i < 10; i++) {
    const w = rnd(10, 22);
    const d = rnd(6, 14);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(rnd(-20, SX + 20), 46 + rnd(0, 3), rnd(-20, SZ + 20));
    scene.add(m);
    nuvens.push(m);
  }

  const parado = ctx.motionReduzido;
  return {
    passo(dt: number) {
      if (parado) return;
      for (const n of nuvens) {
        n.position.x += dt * 0.7;
        if (n.position.x > SX + 30) n.position.x = -30;
      }
    },
  };
}
