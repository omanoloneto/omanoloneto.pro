// Caminhão procedural estilo kei-truck de entregas (referência: foto do
// Manolo) — cabine cab-over arredondada na frente das rodas, para-brisa
// grandão, baú branco mais alto que a cabine com faixas refletivas na
// traseira, rodas com calota prateada. Tudo primitiva/Shape, zero .glb.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Caminhao, Contexto } from './tipos';
import { criarTexturaTema } from './skins-tema';

export function criarCaminhao(ctx: Contexto): Caminhao {
  const { scene, skins } = ctx;
  const grupo = new THREE.Group();

  const cabMat = new THREE.MeshLambertMaterial({ color: skins[0].cabine });
  const bauMat = new THREE.MeshLambertMaterial({ color: skins[0].bau });
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

  // ----- carroceria ABERTA: plataforma + guardas baixas (sem baú) -----
  const plataforma = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.22, 3.7), bauMat);
  plataforma.position.set(0, 0.94, -1.15);
  grupo.add(plataforma);
  ([-1, 1] as const).forEach((lado) => {
    const guardaLateral = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 3.7), bauMat);
    guardaLateral.position.set(lado * 1.14, 1.3, -1.15);
    grupo.add(guardaLateral);
  });
  const guardaTraseira = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 0.12), bauMat);
  guardaTraseira.position.set(0, 1.3, -2.94);
  grupo.add(guardaTraseira);

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
    new THREE.PlaneGeometry(2.3, 0.34),
    new THREE.MeshBasicMaterial({ map: faixasTex })
  );
  faixas.position.set(0, 1.3, -3.01);
  faixas.rotation.y = Math.PI;
  grupo.add(faixas);

  // chassi escuro por baixo
  const chassi = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.4, 5.6), escuroMat);
  chassi.position.set(0, 0.38, 0);
  grupo.add(chassi);

  // giroflex no teto: só aparece nas skins de bombeiro/polícia
  const giroflex = new THREE.Group();
  giroflex.add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.24), escuroMat));
  ([[-1, 0xff3b30], [1, 0x2f7dff]] as const).forEach(([lado, cor]) => {
    const luz = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.16, 0.2),
      new THREE.MeshBasicMaterial({ color: cor })
    );
    luz.position.set(lado * 0.24, 0.11, 0);
    giroflex.add(luz);
  });
  giroflex.position.set(0, 2.5, 1.5);
  giroflex.visible = false;
  grupo.add(giroflex);

  // ----- rodas: pneu torneado + calota de verdade só na face de fora -----
  // Monta tudo com o eixo em +Y (natural pro Lathe/Cylinder), funde numa
  // geometria só com 2 grupos de material e no fim gira o eixo pra X.
  // Fundir mantém 1 mesh por roda: o giro (rotation.x) e os pivôs de
  // esterço seguem valendo, e as porcas giram junto de graça.
  const pneuMat = new THREE.MeshLambertMaterial({ color: 0x23262e });
  const calotaMat = new THREE.MeshLambertMaterial({ color: skins[0].calota });

  const R = 0.5;      // raio externo do pneu (mantém o caminhão na mesma altura)
  const MEIA = 0.21;  // meia-largura

  // pneu: perfil com ombro chanfrado — cilindro reto não tem ombro
  const perfilPneu = [
    new THREE.Vector2(0.3, -MEIA),
    new THREE.Vector2(0.44, -MEIA),
    new THREE.Vector2(R, -MEIA + 0.06),
    new THREE.Vector2(R, MEIA - 0.06),
    new THREE.Vector2(0.44, MEIA),
    new THREE.Vector2(0.3, MEIA),
  ];
  const pneuGeo = new THREE.LatheGeometry(perfilPneu, 20);
  // tampa escura do lado de DENTRO (antes as duas tampas eram prateadas —
  // o caminhão tinha calota virada pro chassi, que não existe em carro nenhum)
  const tampaInterna = new THREE.CircleGeometry(0.3, 20);
  tampaInterna.rotateX(Math.PI / 2); // normal pra -y
  tampaInterna.translate(0, -MEIA, 0);

  // calota: aba → cone → miolo abaulado, só na face externa (+y).
  // Perfil na mesma ordem do pneu (y crescendo), senão a normal inverte
  // e o Lathe sai preto.
  const perfilCalota = [
    new THREE.Vector2(0.33, MEIA - 0.03),
    new THREE.Vector2(0.28, MEIA + 0.005),
    new THREE.Vector2(0.2, MEIA + 0.045),
    new THREE.Vector2(0.1, MEIA + 0.07),
    new THREE.Vector2(0, MEIA + 0.075),
  ];
  const calotaGeo = new THREE.LatheGeometry(perfilCalota, 20);
  // aro cromado na junção pneu/calota
  const aroGeo = new THREE.TorusGeometry(0.34, 0.035, 6, 20);
  aroGeo.rotateX(Math.PI / 2);
  aroGeo.translate(0, MEIA - 0.02, 0);
  // 5 porcas em volta do miolo
  const porcas: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const p = new THREE.CylinderGeometry(0.032, 0.032, 0.03, 6);
    p.translate(Math.cos(a) * 0.19, MEIA + 0.05, Math.sin(a) * 0.19);
    porcas.push(p);
  }

  const parteEscura = mergeGeometries([pneuGeo, tampaInterna]);
  const parteCromada = mergeGeometries([calotaGeo, aroGeo, ...porcas]);
  if (!parteEscura || !parteCromada) throw new Error('roda: mergeGeometries falhou (atributos incompatíveis)');
  // useGroups: grupo 0 → pneuMat, grupo 1 → calotaMat
  const rodaBase = mergeGeometries([parteEscura, parteCromada], true)!;
  rodaBase.rotateZ(Math.PI / 2); // eixo pra x (convenção do resto do caminhão)

  // rotateZ manda +y → -x, então a calota nasce sempre em -x: certa na roda
  // esquerda, errada na direita. Espelhar com scale.x = -1 inverteria o
  // winding (iluminação quebra) e girar o mesh em Y brigaria com o pivô de
  // esterço — então assa duas geometrias, uma girada de fábrica.
  const rodaGeoEsq = rodaBase;
  const rodaGeoDir = rodaBase.clone().rotateY(Math.PI);
  const rodaMats = [pneuMat, calotaMat];
  const rodas: THREE.Mesh[] = [];
  const pivosDianteiros: THREE.Group[] = [];
  ([[-1.05, 2.05, true], [1.05, 2.05, true], [-1.05, -1.9, false], [1.05, -1.9, false]] as const).forEach(([x, z, frente]) => {
    const roda = new THREE.Mesh(x < 0 ? rodaGeoEsq : rodaGeoDir, rodaMats);
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
      // caixas visíveis DENTRO da carroceria aberta, em fila no leito
      const m = new THREE.Matrix4();
      caixaMesh.count = Math.min(3, n);
      for (let i = 0; i < caixaMesh.count; i++) {
        m.makeTranslation((i % 2) * 1.1 - 0.55, 1.5, -0.45 - i * 0.92);
        caixaMesh.setMatrixAt(i, m);
      }
      caixaMesh.instanceMatrix.needsUpdate = true;
      ctx.ui.popHud('[data-caixas]', n);
    },
    aplicarSkin(id) {
      const skin = ctx.porSkinId.get(id) || skins[0];
      // map indo de null ↔ textura recompila o shader: sem needsUpdate a
      // textura não aparece (ou fica grudada ao voltar pra skin de cor).
      // Sai barato porque skin só troca na Garagem/no boot, nunca no loop.
      const vestir = (mat: THREE.MeshLambertMaterial, cor: number, repetir: number) => {
        const tex = skin.tema ? criarTexturaTema(skin.tema, repetir) : null;
        if (!!mat.map !== !!tex) mat.needsUpdate = true;
        mat.map = tex;
        // map multiplica com color: temática precisa de branco pra textura
        // sair na cor de verdade
        mat.color.setHex(tex ? 0xffffff : cor);
      };
      vestir(cabMat, skin.cabine, 0.5);
      vestir(bauMat, skin.bau, 0.35);
      calotaMat.color.setHex(skin.calota); // compartilhado pelas 4 rodas
      giroflex.visible = skin.tema === 'bombeiro' || skin.tema === 'policia';
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
