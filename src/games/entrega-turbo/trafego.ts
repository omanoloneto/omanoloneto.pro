// Tráfego: carrinhos NPC — decorativos em cima da BR-101 (sempre) e
// circulando pelas ruas leste-oeste da cidade (só no modo Normal).
// Só custa coração quando OS DOIS estão em movimento: caminhão andando
// contra carro rodando. Carro parado pela cortesia (ou caminhão parado)
// nunca pune — a criança manobrando na zona de entrega está segura.
import * as THREE from 'three';
import type { Contexto } from './tipos';

const CORES_CARROS = [0xd94f3d, 0x3d7dd8, 0xf2f2f2, 0x4a4e5a, 0xf2c14e, 0x7bc950, 0x9b6dd6, 0xe88ab0];

type Carro =
  | { tipo: 'br'; t: number; vel: number; mao: 1 | -1 }
  | { tipo: 'rua'; x: number; z: number; dir: 1 | -1; vel: number; velAtual: number };

export function criarTrafego(ctx: Contexto) {
  const { scene, cfg } = ctx;
  const TC = cfg.trafego;
  const MAXC = TC.carrosBR + TC.carrosCidade;

  const corpo = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1.7, 0.6, 3.4),
    new THREE.MeshLambertMaterial({ color: 0xffffff }),
    MAXC
  );
  const cabine = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1.5, 0.5, 1.7),
    new THREE.MeshLambertMaterial({ color: 0x2c3f52 }),
    MAXC
  );
  corpo.frustumCulled = false; // InstancedMesh dinâmico: boundingSphere cacheado
  cabine.frustumCulled = false;
  const corTmp = new THREE.Color();
  for (let i = 0; i < MAXC; i++) {
    corTmp.setHex(CORES_CARROS[i % CORES_CARROS.length]);
    corpo.setColorAt(i, corTmp);
  }
  if (corpo.instanceColor) corpo.instanceColor.needsUpdate = true;
  scene.add(corpo, cabine);

  const carros: Carro[] = [];
  // invencibilidade em TEMPO DE SIMULAÇÃO (mesmo motivo do prazo do pedido:
  // pausar não pode consumir o escudo enquanto o mundo está congelado)
  let tempoMs = 0;
  let invencivelAte = 0;

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const eixoY = new THREE.Vector3(0, 1, 0);
  const um = new THREE.Vector3(1, 1, 1);
  const posV = new THREE.Vector3();

  function pose(i: number, x: number, y: number, z: number, ang: number) {
    q.setFromAxisAngle(eixoY, ang);
    posV.set(x, y, z);
    m.compose(posV, q, um);
    corpo.setMatrixAt(i, m);
    // cabine em cima, puxada pra trás do carro
    posV.set(x - Math.sin(ang) * 0.4, y + 0.5, z - Math.cos(ang) * 0.4);
    m.compose(posV, q, um);
    cabine.setMatrixAt(i, m);
  }

  function atualizarMatrizes() {
    const av = ctx.mundo.avenidaInfo;
    corpo.count = carros.length;
    cabine.count = carros.length;
    const angBR = Math.atan2(av.dir[0], av.dir[1]);
    carros.forEach((c, i) => {
      if (c.tipo === 'br') {
        const [px, pz] = av.ponto(c.t);
        pose(
          i,
          px + av.perp[0] * 2.2 * c.mao,
          av.altura + 0.42,
          pz + av.perp[1] * 2.2 * c.mao,
          angBR + (c.mao < 0 ? Math.PI : 0)
        );
      } else {
        pose(i, c.x, 0.42, c.z, c.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
      }
    });
    corpo.instanceMatrix.needsUpdate = true;
    cabine.instanceMatrix.needsUpdate = true;
  }

  function reset(comCidade: boolean) {
    const av = ctx.mundo.avenidaInfo;
    const { mundo } = ctx;
    carros.length = 0;
    tempoMs = 0;
    invencivelAte = 0;
    for (let i = 0; i < TC.carrosBR; i++) {
      carros.push({
        tipo: 'br',
        t: (i / TC.carrosBR) * av.comprimento,
        vel: TC.velBRMin + ((i * 7) % 5) / 5 * (TC.velBRMax - TC.velBRMin),
        mao: i % 2 === 0 ? 1 : -1,
      });
    }
    if (comCidade) {
      for (let i = 0; i < TC.carrosCidade; i++) {
        // uma rua leste-oeste diferente pra cada carro (pula as bordas)
        const laneBase = mundo.ruaCentro(1 + ((i * 2 + 1) % (mundo.N - 1)));
        const dir: 1 | -1 = i % 2 === 0 ? 1 : -1;
        carros.push({
          tipo: 'rua',
          x: -mundo.MEIO + ((i * 53 + 20) % (2 * mundo.MEIO)),
          z: laneBase + dir * 2.6, // mão da direção
          dir,
          vel: TC.velCidade * (0.85 + ((i * 3) % 4) * 0.1),
          velAtual: TC.velCidade,
        });
      }
    }
    atualizarMatrizes();
  }

  function passo(dt: number) {
    const av = ctx.mundo.avenidaInfo;
    const { truck, mundo } = ctx;
    tempoMs += dt * 1000;
    for (const c of carros) {
      if (c.tipo === 'br') {
        c.t += c.vel * dt * c.mao;
        if (c.t > av.comprimento + 8) c.t = -8;
        if (c.t < -8) c.t = av.comprimento + 8;
        continue;
      }
      // cortesia: freia atrás do caminhão na mesma faixa (ninguém atropela
      // a criança parada entregando)
      const aFrente = (truck.x - c.x) * c.dir;
      let velAlvo = c.vel;
      if (Math.abs(truck.z - c.z) < 3 && aFrente > 0 && aFrente < 12) {
        velAlvo = c.vel * Math.max(0, (aFrente - 4) / 8);
      }
      c.velAtual += (velAlvo - c.velAtual) * Math.min(1, 4 * dt);
      c.x += c.velAtual * c.dir * dt;
      // wrap só quando o outro lado está LONGE da criança — carro nunca
      // materializa na frente dela; senão espera na borda do mundo
      const LIM = mundo.MEIO + 5;
      if (c.x > LIM) c.x = Math.abs(truck.x + LIM) > 35 ? -LIM : LIM;
      if (c.x < -LIM) c.x = Math.abs(truck.x - LIM) > 35 ? LIM : -LIM;
      // colisão círculo×círculo com o caminhão
      const dx = truck.x - c.x;
      const dz = truck.z - c.z;
      const d = Math.hypot(dx, dz);
      const alcance = TC.raioCarro + ctx.cfg.raioColisao;
      if (d < alcance) {
        const dn = d || 0.001;
        truck.x += (dx / dn) * (alcance - dn);
        truck.z += (dz / dn) * (alcance - dn);
        // dano só se OS DOIS estavam andando: caminhão parado não é punido,
        // e encostar num carro parado pela cortesia também não
        if (tempoMs > invencivelAte && Math.abs(truck.v) > 1.5 && c.velAtual > 1.5) {
          invencivelAte = tempoMs + TC.invencivelMs;
          truck.squashAte = performance.now() + 120;
          truck.v *= 0.4;
          ctx.pedidos.bateuEmCarro();
        }
      }
    }
    atualizarMatrizes();
  }

  return { passo, reset, carros };
}
