// Caminhão procedural estilo kei-truck de entregas (referência: foto do
// Manolo) — cabine cab-over arredondada na frente das rodas, para-brisa
// grandão, baú branco mais alto que a cabine com faixas refletivas na
// traseira, rodas com calota prateada. Tudo primitiva/Shape, zero .glb.
import * as THREE from 'three';
import type { Caminhao, Contexto } from './tipos';

export function criarCaminhao(ctx: Contexto): Caminhao {
  const { scene, skins } = ctx;
  const grupo = new THREE.Group();

  const cabMat = new THREE.MeshLambertMaterial({ color: skins[0][0] });
  const bauMat = new THREE.MeshLambertMaterial({ color: skins[0][1] });
  const escuroMat = new THREE.MeshLambertMaterial({ color: 0x2a2e38 });
  const cinzaMat = new THREE.MeshLambertMaterial({ color: 0x8a8f99 });
  const vidroMat = new THREE.MeshBasicMaterial({ color: 0x2c3f52 });
  const farolMat = new THREE.MeshBasicMaterial({ color: 0xfff6d8 });

  // ----- cabine cab-over: perfil lateral desenhado e extrudado na largura -----
  // shape em (z, y) do caminhão: frente curva, para-brisa inclinado, teto
  const perfil = new THREE.Shape();
  perfil.moveTo(0.8, 0.55);                       // traseira baixa da cabine
  perfil.lineTo(2.75, 0.55);                      // assoalho até a frente
  perfil.quadraticCurveTo(2.98, 0.6, 2.98, 0.95); // curva do para-choque subindo
  perfil.lineTo(2.94, 1.5);                       // frente quase vertical
  perfil.quadraticCurveTo(2.9, 1.78, 2.72, 1.95); // nariz → base do para-brisa
  perfil.lineTo(2.12, 2.36);                      // para-brisa inclinado
  perfil.quadraticCurveTo(2.0, 2.44, 1.86, 2.44); // curvinha do teto
  perfil.lineTo(0.8, 2.44);                       // teto até a traseira
  perfil.closePath();
  const cabGeo = new THREE.ExtrudeGeometry(perfil, { depth: 2.2, bevelEnabled: false });
  // shape (z,y) + depth → largura: gira pra depth virar o eixo x e centraliza
  cabGeo.rotateY(-Math.PI / 2);
  cabGeo.translate(1.1, 0, 0);
  const cab = new THREE.Mesh(cabGeo, cabMat);
  grupo.add(cab);

  // para-brisa (plano escuro deitado na inclinação do perfil)
  const paraBrisa = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.78), vidroMat);
  paraBrisa.position.set(0, 2.17, 2.47);
  paraBrisa.rotation.x = -0.97; // acompanha a rampa (2.72,1.95)→(2.12,2.36)
  grupo.add(paraBrisa);
  // janelas laterais
  ([-1, 1] as const).forEach((lado) => {
    const jan = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.6), vidroMat);
    jan.position.set(lado * 1.105, 1.92, 1.6);
    jan.rotation.y = (lado * Math.PI) / 2;
    grupo.add(jan);
    // retrovisor: haste + plaquinha
    const haste = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.05), escuroMat);
    haste.position.set(lado * 1.25, 2.1, 2.35);
    const espelho = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.2), escuroMat);
    espelho.position.set(lado * 1.42, 2.05, 2.35);
    grupo.add(haste, espelho);
  });
  // para-choque, grade e faróis
  const paraChoque = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.32, 0.22), cinzaMat);
  paraChoque.position.set(0, 0.62, 2.95);
  const grade = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.16, 0.05), escuroMat);
  grade.position.set(0, 0.88, 3.0);
  grupo.add(paraChoque, grade);
  ([-1, 1] as const).forEach((lado) => {
    const farol = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.06), farolMat);
    farol.position.set(lado * 0.78, 1.12, 3.0);
    grupo.add(farol);
  });

  // ----- baú branco, mais alto que a cabine -----
  const bau = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.6, 3.8), bauMat);
  bau.position.set(0, 1.85, -1.2);
  // tampa do teto e moldura inferior (cinza)
  const tampa = new THREE.Mesh(new THREE.BoxGeometry(2.46, 0.1, 3.86), cinzaMat);
  tampa.position.set(0, 3.2, -1.2);
  const moldura = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.28, 3.84), cinzaMat);
  moldura.position.set(0, 0.68, -1.2);
  grupo.add(bau, tampa, moldura);

  // traseira: faixas refletivas vermelhas/brancas (textura canvas)
  const faixasCanvas = document.createElement('canvas');
  faixasCanvas.width = 128;
  faixasCanvas.height = 32;
  {
    const g = faixasCanvas.getContext('2d')!;
    g.fillStyle = '#fff';
    g.fillRect(0, 0, 128, 32);
    g.fillStyle = '#d9302f';
    for (let x = -32; x < 128; x += 32) {
      g.beginPath();
      g.moveTo(x, 32);
      g.lineTo(x + 16, 0);
      g.lineTo(x + 32, 0);
      g.lineTo(x + 16, 32);
      g.closePath();
      g.fill();
    }
  }
  const faixasTex = new THREE.CanvasTexture(faixasCanvas);
  faixasTex.colorSpace = THREE.SRGBColorSpace;
  const faixas = new THREE.Mesh(
    new THREE.PlaneGeometry(2.3, 0.45),
    new THREE.MeshBasicMaterial({ map: faixasTex })
  );
  faixas.position.set(0, 1.0, -3.11);
  faixas.rotation.y = Math.PI;
  grupo.add(faixas);

  // chassi escuro por baixo
  const chassi = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.4, 5.6), escuroMat);
  chassi.position.set(0, 0.38, 0);
  grupo.add(chassi);

  // ----- rodas com calota: cilindro com material por grupo (lateral/tampas) -----
  const rodaGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.42, 12);
  rodaGeo.rotateZ(Math.PI / 2); // eixo pra x — tampas viram as laterais externas
  const pneuMat = new THREE.MeshLambertMaterial({ color: 0x23262e });
  const calotaMat = new THREE.MeshLambertMaterial({ color: 0xc7cdd6 });
  const rodaMats = [pneuMat, calotaMat, calotaMat];
  const rodas: THREE.Mesh[] = [];
  const pivosDianteiros: THREE.Group[] = [];
  ([[-1.05, 2.05, true], [1.05, 2.05, true], [-1.05, -1.9, false], [1.05, -1.9, false]] as const).forEach(([x, z, frente]) => {
    const roda = new THREE.Mesh(rodaGeo, rodaMats);
    rodas.push(roda);
    if (frente) {
      const pivo = new THREE.Group();
      pivo.position.set(x, 0.5, z);
      pivo.add(roda);
      pivosDianteiros.push(pivo);
      grupo.add(pivo);
    } else {
      roda.position.set(x, 0.5, z);
      grupo.add(roda);
    }
  });

  // ----- caixas no baú (instanciadas, até 3 visíveis no teto) -----
  const caixaMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.9, 0.9, 0.9),
    new THREE.MeshLambertMaterial({ color: 0xc9925b }),
    3
  );
  caixaMesh.count = 0;
  // InstancedMesh dinâmico: boundingSphere cacheado vazio no 1º render → sem culling
  caixaMesh.frustumCulled = false;
  grupo.add(caixaMesh);

  // ----- sombra blob -----
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
    new THREE.PlaneGeometry(4.6, 6.8),
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
        m.makeTranslation((i % 2) * 1 - 0.5, 3.7 + Math.floor(i / 2) * 0.95, -1.2 - (i % 2) * 0.3);
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
      const giro = (truck.v * dt) / 0.5;
      rodas.forEach((roda) => { roda.rotation.x += giro; });
      pivosDianteiros.forEach((p) => { p.rotation.y = steer * 0.45 * Math.sign(truck.v || 1); });
    },
  };
}
