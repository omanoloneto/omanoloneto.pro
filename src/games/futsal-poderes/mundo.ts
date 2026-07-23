import * as THREE from 'three';
import { criarToon, toonEmissivo } from './toon';
import type { Bola, Ctx, Jogador, Mundo } from './tipos';
import type { Crianca } from '../../data/futsal-poderes';

function texturaCampo(comp: number, larg: number, K: Record<string, string>): THREE.CanvasTexture {
  const px = 20;
  const c = document.createElement('canvas');
  c.width = Math.round(comp * px);
  c.height = Math.round(larg * px);
  const g = c.getContext('2d')!;
  const faixas = 10;
  for (let i = 0; i < faixas; i++) {
    g.fillStyle = i % 2 === 0 ? K.piso : K.pisoFaixa;
    g.fillRect((i / faixas) * c.width, 0, c.width / faixas + 1, c.height);
  }
  g.strokeStyle = K.linha;
  g.lineWidth = px * 0.5;
  const m = px * 1.5;
  g.strokeRect(m, m, c.width - 2 * m, c.height - 2 * m);
  g.beginPath();
  g.moveTo(c.width / 2, m);
  g.lineTo(c.width / 2, c.height - m);
  g.stroke();
  g.beginPath();
  g.arc(c.width / 2, c.height / 2, px * 6, 0, Math.PI * 2);
  g.stroke();
  const areaW = px * 9;
  const areaH = px * 16;
  for (const lx of [m, c.width - m - areaW]) {
    g.strokeRect(lx, c.height / 2 - areaH / 2, areaW, areaH);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function criarJogador(crianca: Crianca, time: number, corTime: string): Jogador {
  const grupo = new THREE.Group();
  const pele = criarToon(crianca.pele);
  const camisa = criarToon(corTime);
  const shorts = criarToon('#20242c');
  const cabelo = criarToon(crianca.cabelo);

  const q = (w: number, h: number, d: number, mat: THREE.Material, y: number, x = 0, z = 0) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    return mesh;
  };

  const pernaE = new THREE.Group();
  pernaE.position.set(-0.32, 1.15, 0);
  pernaE.add(q(0.42, 1.1, 0.42, shorts, -0.55));
  const pernaD = new THREE.Group();
  pernaD.position.set(0.32, 1.15, 0);
  pernaD.add(q(0.42, 1.1, 0.42, shorts, -0.55));
  grupo.add(pernaE, pernaD);
  grupo.add(q(1.05, 1.15, 0.7, camisa, 1.9));
  grupo.add(q(0.24, 0.9, 0.24, pele, 1.9, -0.62));
  grupo.add(q(0.24, 0.9, 0.24, pele, 1.9, 0.62));
  const cabeca = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), pele);
  cabeca.position.y = 2.9;
  grupo.add(cabeca);
  grupo.add(q(0.62, 0.34, 0.62, cabelo, 3.15));

  const aura = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.7, 24), new THREE.MeshBasicMaterial({ color: corTime, transparent: true, opacity: 0, side: THREE.DoubleSide }));
  aura.rotation.x = -Math.PI / 2;
  aura.position.y = 0.06;
  grupo.add(aura);

  return {
    crianca, time, goleiro: !!crianca.goleiro,
    x: 0, z: 0, vx: 0, vz: 0, olhar: time === 0 ? Math.PI / 2 : -Math.PI / 2, passo: 0,
    energia: 100, dribleAte: 0, baseX: 0, baseZ: 0,
    grupo, pernaE, pernaD, aura,
  };
}

export function criarMundo(ctx: Ctx): Mundo {
  const { scene, cfg, dados } = ctx;
  const K = cfg.cores;
  const comp = cfg.campo.comprimento;
  const larg = cfg.campo.largura;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x557755, 1.05));
  const sol = new THREE.DirectionalLight(0xffffff, 1.6);
  sol.position.set(-30, 50, 20);
  scene.add(sol);

  const piso = new THREE.Mesh(new THREE.PlaneGeometry(comp, larg), criarToon('#ffffff'));
  (piso.material as THREE.MeshToonMaterial).map = texturaCampo(comp, larg, K);
  piso.rotation.x = -Math.PI / 2;
  scene.add(piso);

  const muroMat = criarToon(K.muro);
  const hM = cfg.campo.muroAltura;
  const vao = cfg.campo.golVao;
  const addMuro = (w: number, d: number, x: number, z: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, hM, d), muroMat);
    mesh.position.set(x, hM / 2, z);
    scene.add(mesh);
  };
  addMuro(comp + 2, 1, 0, larg / 2 + 0.5);
  addMuro(comp + 2, 1, 0, -larg / 2 - 0.5);
  const segZ = (larg - vao) / 2;
  for (const sx of [-1, 1]) {
    addMuro(1, segZ, (sx * comp) / 2 + sx * 0.5, larg / 2 - segZ / 2);
    addMuro(1, segZ, (sx * comp) / 2 + sx * 0.5, -larg / 2 + segZ / 2);
  }

  const redeMat = new THREE.MeshToonMaterial({ color: K.rede, transparent: true, opacity: 0.5, gradientMap: (criarToon('#fff').gradientMap) });
  const traveMat = criarToon('#f4f4f4');
  const fundo = cfg.campo.golFundo;
  const golH = cfg.campo.golAltura;
  for (const sx of [-1, 1]) {
    const gx = (sx * comp) / 2;
    const trave = new THREE.Group();
    const post = (z: number) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, golH, 0.3), traveMat); p.position.set(gx, golH / 2, z); trave.add(p); };
    post(vao / 2); post(-vao / 2);
    const cima = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, vao), traveMat); cima.position.set(gx, golH, 0); trave.add(cima);
    const rede = new THREE.Mesh(new THREE.BoxGeometry(fundo, golH, vao), redeMat);
    rede.position.set(gx + sx * fundo / 2, golH / 2, 0);
    trave.add(rede);
    scene.add(trave);
  }

  const jogadores: Jogador[] = [];
  for (let t = 0; t < 2; t++) {
    for (const crianca of dados[t].criancas) {
      const j = criarJogador(crianca, t, dados[t].cor);
      scene.add(j.grupo);
      jogadores.push(j);
    }
  }

  const bolaMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(cfg.bola.raio, 1), criarToon(K.bola));
  scene.add(bolaMesh);
  const sombraMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 });
  const bolaSombra = new THREE.Mesh(new THREE.CircleGeometry(cfg.bola.raio * 1.1, 16), sombraMat);
  bolaSombra.rotation.x = -Math.PI / 2;
  scene.add(bolaSombra);
  const bola: Bola = {
    x: 0, y: cfg.bola.raio, z: 0, vx: 0, vy: 0, vz: 0, dono: null, ultimoDono: null,
    especial: 0, corEspecial: new THREE.Color('#ff7a2f'), mesh: bolaMesh, sombra: bolaSombra,
  };

  const trailPool: { mesh: THREE.Mesh; vida: number }[] = [];
  const trailGeo = new THREE.SphereGeometry(0.6, 8, 6);
  for (let i = 0; i < 36; i++) {
    const mesh = new THREE.Mesh(trailGeo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }));
    mesh.visible = false;
    scene.add(mesh);
    trailPool.push({ mesh, vida: 0 });
  }
  let trailIdx = 0;

  return {
    jogadores,
    bola,
    golLinhaX: comp / 2,
    passoAnim(dt: number) {
      for (const j of jogadores) {
        j.grupo.position.set(j.x, 0, j.z);
        j.grupo.rotation.y = j.olhar;
        const vel = Math.hypot(j.vx, j.vz);
        j.passo += vel * dt * 1.1;
        const sw = Math.sin(j.passo) * Math.min(0.9, vel * 0.06);
        j.pernaE.rotation.x = sw;
        j.pernaD.rotation.x = -sw;
        const am = j.aura.material as THREE.MeshBasicMaterial;
        const alvo = j === ctx.estado.ativo ? 0.55 : j.dribleAte > 0 ? 0.8 : 0;
        am.opacity += (alvo - am.opacity) * Math.min(1, dt * 10);
      }
      bolaMesh.position.set(bola.x, bola.y, bola.z);
      bolaMesh.rotation.x += bola.vz * dt * 0.5;
      bolaMesh.rotation.z -= bola.vx * dt * 0.5;
      bolaSombra.position.set(bola.x, 0.03, bola.z);
      const s = 1 + bola.y * 0.05;
      bolaSombra.scale.set(1 / s, 1 / s, 1 / s);
    },
    soltarTrail(x: number, z: number, cor: THREE.Color) {
      const t = trailPool[trailIdx];
      trailIdx = (trailIdx + 1) % trailPool.length;
      t.mesh.position.set(x, cfg.bola.raio, z);
      t.mesh.visible = true;
      (t.mesh.material as THREE.MeshBasicMaterial).color.copy(cor);
      (t.mesh.material as THREE.MeshBasicMaterial).opacity = 0.8;
      t.mesh.scale.setScalar(1);
      t.vida = 0.5;
    },
    passoTrail(dt: number) {
      for (const t of trailPool) {
        if (t.vida <= 0) continue;
        t.vida -= dt;
        const k = Math.max(0, t.vida / 0.5);
        (t.mesh.material as THREE.MeshBasicMaterial).opacity = 0.8 * k;
        t.mesh.scale.setScalar(0.3 + k);
        if (t.vida <= 0) t.mesh.visible = false;
      }
    },
  };
}
