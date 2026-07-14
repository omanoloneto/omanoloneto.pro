// Caminhão procedural: cabine + baú + rodas (dianteiras esterçam) +
// caixas instanciadas no baú + sombra blob. Skins trocam as cores.
import * as THREE from 'three';
import type { Caminhao, Contexto } from './tipos';

export function criarCaminhao(ctx: Contexto): Caminhao {
  const { scene, skins } = ctx;
  const grupo = new THREE.Group();
  const cabMat = new THREE.MeshLambertMaterial({ color: skins[0][0] });
  const bauMat = new THREE.MeshLambertMaterial({ color: skins[0][1] });
  const escuroMat = new THREE.MeshLambertMaterial({ color: 0x2a2e38 });
  const vidroMat = new THREE.MeshLambertMaterial({ color: 0x9fd8ef });

  // frente aponta pra +z
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.7, 1.7), cabMat);
  cab.position.set(0, 1.35, 1.95);
  const vidro = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 0.1), vidroMat);
  vidro.position.set(0, 1.75, 2.81);
  const bau = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 3.6), bauMat);
  bau.position.set(0, 1.7, -0.9);
  const chassi = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 5.6), escuroMat);
  chassi.position.set(0, 0.55, 0.2);
  grupo.add(cab, vidro, bau, chassi);

  const rodaGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.4, 10);
  rodaGeo.rotateZ(Math.PI / 2);
  const rodas: THREE.Mesh[] = [];
  const pivosDianteiros: THREE.Group[] = [];
  ([[-1.15, 1.9, true], [1.15, 1.9, true], [-1.15, -1.4, false], [1.15, -1.4, false]] as const).forEach(([x, z, frente]) => {
    const roda = new THREE.Mesh(rodaGeo, escuroMat);
    rodas.push(roda);
    if (frente) {
      const pivo = new THREE.Group();
      pivo.position.set(x, 0.55, z);
      pivo.add(roda);
      pivosDianteiros.push(pivo);
      grupo.add(pivo);
    } else {
      roda.position.set(x, 0.55, z);
      grupo.add(roda);
    }
  });

  const caixaMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.9, 0.9, 0.9),
    new THREE.MeshLambertMaterial({ color: 0xc9925b }),
    3
  );
  caixaMesh.count = 0;
  // InstancedMesh dinâmico: boundingSphere cacheado vazio no 1º render → sem culling
  caixaMesh.frustumCulled = false;
  grupo.add(caixaMesh);

  // sombra blob
  const blobCanvas = document.createElement('canvas');
  blobCanvas.width = 64;
  blobCanvas.height = 64;
  {
    const g = blobCanvas.getContext('2d')!;
    const rad = g.createRadialGradient(32, 32, 4, 32, 32, 30);
    rad.addColorStop(0, 'rgba(0,0,0,0.4)');
    rad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rad;
    g.fillRect(0, 0, 64, 64);
  }
  const blob = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, 6.6),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(blobCanvas), transparent: true, depthWrite: false })
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.02;
  grupo.add(blob);
  scene.add(grupo);

  return {
    grupo,
    atualizarCaixasVisiveis(n) {
      const m = new THREE.Matrix4();
      caixaMesh.count = Math.min(3, n);
      for (let i = 0; i < caixaMesh.count; i++) {
        m.makeTranslation((i % 2) * 1 - 0.5, 2.95 + Math.floor(i / 2) * 0.95, -0.9 - (i % 2) * 0.2);
        caixaMesh.setMatrixAt(i, m);
      }
      caixaMesh.instanceMatrix.needsUpdate = true;
      ctx.ui.popHud('[data-caixas]', n);
    },
    aplicarSkin(nivel) {
      const idx = Math.min(Math.floor((nivel - 1) / 2), skins.length - 1);
      cabMat.color.setHex(skins[idx][0]);
      bauMat.color.setHex(skins[idx][1]);
    },
    atualizarVisual(dt, steer) {
      const { truck } = ctx;
      grupo.position.set(truck.x, 0, truck.z);
      grupo.rotation.y = truck.heading;
      const squash = performance.now() < truck.squashAte && !ctx.motionReduzido ? 0.92 : 1;
      grupo.scale.set(1, squash, 1);
      const giro = (truck.v * dt) / 0.55;
      rodas.forEach((roda) => { roda.rotation.x += giro; });
      pivosDianteiros.forEach((p) => { p.rotation.y = steer * 0.45 * Math.sign(truck.v || 1); });
    },
  };
}
