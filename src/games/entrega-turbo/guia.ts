// Navegação visual: seta 3D estilo NFS Underground 2 sobre o caminhão,
// zonas (anel + pilar de luz), rota pontilhada (BFS nas ruas), seta 2D
// de borda quando o alvo sai da tela, e o morador que acena na entrega.
import * as THREE from 'three';
import type { Contexto, Guia, Zona } from './tipos';

const MAX_PONTOS = 90;

export function criarGuia(ctx: Contexto): Guia {
  const { scene, cfg } = ctx;

  // ----- zonas: anel pulsante + pilar de luz -----
  function fazerAnel(cor: number) {
    const anel = new THREE.Mesh(
      new THREE.RingGeometry(cfg.raioZona - 0.7, cfg.raioZona, 36),
      new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.85, depthWrite: false })
    );
    anel.rotation.x = -Math.PI / 2;
    anel.position.y = 0.05;
    return anel;
  }
  function fazerPilar(cor: number) {
    const pilar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.9, 26, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.3, depthWrite: false, fog: false, side: THREE.DoubleSide })
    );
    pilar.position.y = 13;
    return pilar;
  }
  const zonaColeta = new THREE.Group();
  zonaColeta.add(fazerAnel(0xffd23f), fazerPilar(0xffd23f));
  const zonaEntrega = new THREE.Group();
  zonaEntrega.add(fazerAnel(0x2ee08a), fazerPilar(0x2ee08a));
  zonaColeta.visible = false;
  zonaEntrega.visible = false;
  scene.add(zonaColeta, zonaEntrega);

  // ----- seta NFSU2: seta chapada extrudada, deitada, com contorno -----
  // desenhada apontando +y no plano do shape; deitada ela aponta +z
  const forma = new THREE.Shape();
  forma.moveTo(-0.42, -1.15);
  forma.lineTo(0.42, -1.15);
  forma.lineTo(0.42, 0.1);
  forma.lineTo(0.95, 0.1);
  forma.lineTo(0, 1.3);
  forma.lineTo(-0.95, 0.1);
  forma.lineTo(-0.42, 0.1);
  forma.closePath();
  const setaGeo = new THREE.ExtrudeGeometry(forma, {
    depth: 0.28,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: 1,
  });
  setaGeo.rotateX(Math.PI / 2); // deita: shape +y vira +z do mundo
  setaGeo.rotateX(0.42);        // nariz bem inclinado pra baixo (o jeitão do NFS)
  // dois materiais nos grupos do extrude: topo/fundo brilhantes, laterais
  // escuras — contorno legível de QUALQUER ângulo, sem malha extra
  const setaMat = new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.95 });
  const ladoMat = new THREE.MeshBasicMaterial({ color: 0x6b5510 });
  const seta = new THREE.Mesh(setaGeo, [setaMat, ladoMat]);
  seta.scale.setScalar(1.35);
  seta.visible = false;
  scene.add(seta);
  const corLado = new THREE.Color();

  // ----- rota pontilhada (InstancedMesh dinâmico → sem frustum culling) -----
  const pontosRota = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.35, 0.35, 0.06, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }),
    MAX_PONTOS
  );
  pontosRota.count = 0;
  pontosRota.frustumCulled = false; // boundingSphere cacheado vazio no 1º render
  scene.add(pontosRota);

  function rotaBFS(deXZ: [number, number], ateXZ: [number, number]) {
    const { mundo } = ctx;
    const N = mundo.N;
    const inicio = mundo.noMaisProximo(deXZ[0], deXZ[1]);
    const fim = mundo.noMaisProximo(ateXZ[0], ateXZ[1]);
    const chave = (n: [number, number]) => n[0] * 10 + n[1];
    const veio = new Map<number, [number, number] | null>([[chave(inicio), null]]);
    const fila: Array<[number, number]> = [inicio];
    while (fila.length) {
      const atual = fila.shift()!;
      if (atual[0] === fim[0] && atual[1] === fim[1]) break;
      ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const).forEach(([di, dj]) => {
        const viz: [number, number] = [atual[0] + di, atual[1] + dj];
        if (viz[0] < 0 || viz[0] > N || viz[1] < 0 || viz[1] > N) return;
        if (veio.has(chave(viz))) return;
        veio.set(chave(viz), atual);
        fila.push(viz);
      });
    }
    const caminho: Array<[number, number]> = [];
    let atual: [number, number] | null | undefined = fim;
    while (atual) {
      caminho.unshift([mundo.ruaCentro(atual[0]), mundo.ruaCentro(atual[1])]);
      atual = veio.get(chave(atual));
    }
    return [deXZ, ...caminho, ateXZ];
  }

  // ----- morador que acena -----
  const morador = new THREE.Group();
  const corpoM = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.9, 3, 8), new THREE.MeshLambertMaterial({ color: 0xd94f7c }));
  corpoM.position.y = 1.1;
  const cabecaM = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), new THREE.MeshLambertMaterial({ color: 0xf2c9a0 }));
  cabecaM.position.y = 2.1;
  morador.add(corpoM, cabecaM);
  morador.visible = false;
  scene.add(morador);
  let moradorAte = 0;

  const projV = new THREE.Vector3();
  const setaBordaEl = () => ctx.ui.els.setaBorda;

  return {
    zonaColeta,
    zonaEntrega,
    apontarSeta(alvo: Zona | null, corHex: number, ts: number) {
      const el = setaBordaEl();
      if (!alvo) {
        seta.visible = false;
        el.hidden = true;
        return;
      }
      const { truck, camera, cenaEl, motionReduzido } = ctx;
      seta.visible = true;
      setaMat.color.setHex(corHex);
      corLado.setHex(corHex).multiplyScalar(0.42);
      ladoMat.color.copy(corLado);
      const ang = Math.atan2(alvo.x - truck.x, alvo.z - truck.z);
      // respirada do NFS: a seta desliza um tiquinho na direção do alvo e volta
      const pulso = motionReduzido ? 0 : (Math.sin(ts / 380) * 0.5 + 0.5) * 0.55;
      const bob = motionReduzido ? 0 : Math.sin(ts / 260) * 0.18;
      seta.position.set(
        truck.x + Math.sin(ang) * pulso,
        4.6 + bob,
        truck.z + Math.cos(ang) * pulso
      );
      seta.rotation.y = ang;
      // alvo fora da tela → seta 2D na borda
      projV.set(alvo.x, 1, alvo.z).project(camera);
      const fora = projV.x < -1 || projV.x > 1 || projV.y < -1 || projV.y > 1 || projV.z > 1;
      el.hidden = !fora;
      if (fora) {
        const cw = cenaEl.clientWidth;
        const chh = cenaEl.clientHeight;
        const x = Math.max(0.06, Math.min(0.94, (projV.x + 1) / 2));
        const y = Math.max(0.08, Math.min(0.9, 1 - (projV.y + 1) / 2));
        el.style.left = x * cw - 18 + 'px';
        el.style.top = y * chh - 18 + 'px';
        el.style.transform = 'rotate(' + Math.atan2(y * chh - chh / 2, x * cw - cw / 2) + 'rad)';
        el.style.color = '#' + corHex.toString(16).padStart(6, '0');
      }
    },
    pulsarAneis(ts: number) {
      if (ctx.motionReduzido) return;
      const puls = 1 + Math.sin(ts / 300) * 0.08;
      (zonaColeta.children[0] as THREE.Mesh).scale.set(puls, puls, 1);
      (zonaEntrega.children[0] as THREE.Mesh).scale.set(puls, puls, 1);
    },
    atualizarRota(alvo: Zona | null) {
      if (!alvo) {
        pontosRota.count = 0;
        return;
      }
      const caminho = rotaBFS([ctx.truck.x, ctx.truck.z], [alvo.x, alvo.z]);
      const m = new THREE.Matrix4();
      let n = 0;
      for (let s = 0; s < caminho.length - 1 && n < MAX_PONTOS; s++) {
        const [ax, az] = caminho[s];
        const [bx, bz] = caminho[s + 1];
        const passos = Math.max(1, Math.floor(Math.hypot(bx - ax, bz - az) / 2.5));
        for (let p = 0; p < passos && n < MAX_PONTOS; p++) {
          const k = p / passos;
          m.makeTranslation(ax + (bx - ax) * k, 0.1, az + (bz - az) * k);
          pontosRota.setMatrixAt(n++, m);
        }
      }
      pontosRota.count = n;
      pontosRota.instanceMatrix.needsUpdate = true;
    },
    limparRota() {
      pontosRota.count = 0;
    },
    temRota() {
      return pontosRota.count > 0;
    },
    esconderTudo() {
      zonaColeta.visible = false;
      zonaEntrega.visible = false;
      seta.visible = false;
      pontosRota.count = 0;
      setaBordaEl().hidden = true;
      morador.visible = false;
    },
    mostrarMorador(x: number, z: number) {
      morador.position.set(x, 0, z);
      morador.visible = true;
      moradorAte = performance.now() + 1200;
    },
    passoMorador(ts: number) {
      if (!morador.visible) return;
      if (performance.now() > moradorAte) morador.visible = false;
      else if (!ctx.motionReduzido) morador.rotation.z = Math.sin(ts / 90) * 0.18;
    },
  };
}
