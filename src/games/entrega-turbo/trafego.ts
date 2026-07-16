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

type Pedestre = {
  x: number;
  z: number;
  dir: 1 | -1;
  vel: number;
  velAtual: number;
  ruaZ: number;
  lado: 1 | -1;
  fase: 'beirada' | 'cruzando';
  alvoZ: number;
  proximoCruzeMs: number;
};

export function criarTrafego(ctx: Contexto) {
  const { scene, cfg } = ctx;
  const TC = cfg.trafego;
  const MAXC = TC.carrosBR + TC.carrosCidadeMax;

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

  const pedCorpo = new THREE.InstancedMesh(
    new THREE.CapsuleGeometry(0.32, 0.7, 3, 8),
    new THREE.MeshLambertMaterial({ color: 0xffffff }),
    TC.pedestresMax
  );
  const pedCabeca = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.28, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0xf2c9a0 }),
    TC.pedestresMax
  );
  pedCorpo.frustumCulled = false;
  pedCabeca.frustumCulled = false;
  for (let i = 0; i < TC.pedestresMax; i++) {
    corTmp.setHex(CORES_CARROS[(i * 3 + 1) % CORES_CARROS.length]);
    pedCorpo.setColorAt(i, corTmp);
  }
  if (pedCorpo.instanceColor) pedCorpo.instanceColor.needsUpdate = true;
  scene.add(pedCorpo, pedCabeca);

  const carros: Carro[] = [];
  const pedestres: Pedestre[] = [];
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

    pedCorpo.count = pedestres.length;
    pedCabeca.count = pedestres.length;
    pedestres.forEach((p, i) => {
      const bob = ctx.motionReduzido ? 0 : Math.sin(tempoMs / 125 + i * 1.7) * 0.06;
      const ang = p.fase === 'cruzando'
        ? (p.alvoZ > p.z ? 0 : Math.PI)
        : (p.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
      q.setFromAxisAngle(eixoY, ang);
      posV.set(p.x, 0.85 + bob, p.z);
      m.compose(posV, q, um);
      pedCorpo.setMatrixAt(i, m);
      posV.set(p.x, 1.62 + bob, p.z);
      m.compose(posV, q, um);
      pedCabeca.setMatrixAt(i, m);
    });
    pedCorpo.instanceMatrix.needsUpdate = true;
    pedCabeca.instanceMatrix.needsUpdate = true;
  }

  function contagemCarros(nivel: number) {
    return Math.min(TC.carrosCidadeMax, TC.carrosCidade + (nivel - 1) * TC.carrosCidadePorNivel);
  }

  function contagemPedestres(nivel: number) {
    return Math.min(TC.pedestresMax, TC.pedestres + Math.floor((nivel - 1) / TC.pedestresACada));
  }

  function novoCarroRua(i: number, xInicial?: number): Carro {
    const { mundo } = ctx;
    const laneBase = mundo.ruaCentro(1 + ((i * 2 + 1) % (mundo.N - 1)));
    const dir: 1 | -1 = i % 2 === 0 ? 1 : -1;
    return {
      tipo: 'rua',
      x: xInicial ?? -mundo.MEIO + ((i * 53 + 20) % (2 * mundo.MEIO)),
      z: laneBase + dir * 2.6,
      dir,
      vel: TC.velCidade * (0.85 + ((i * 3) % 4) * 0.1),
      velAtual: TC.velCidade,
    };
  }

  function novoPedestre(i: number, xInicial?: number): Pedestre {
    const { mundo } = ctx;
    const laneBase = mundo.ruaCentro(1 + ((i * 3 + 2) % (mundo.N - 1)));
    const lado: 1 | -1 = i % 2 === 0 ? 1 : -1;
    return {
      x: xInicial ?? -mundo.MEIO + ((i * 41 + 33) % (2 * mundo.MEIO)),
      z: laneBase + lado * TC.pedestreOffset,
      dir: i % 3 === 0 ? -1 : 1,
      vel: TC.velPedestre * (0.8 + ((i * 5) % 5) * 0.1),
      velAtual: TC.velPedestre,
      ruaZ: laneBase,
      lado,
      fase: 'beirada',
      alvoZ: 0,
      proximoCruzeMs: tempoMs + 3000 + ((i * 2500) % 8000),
    };
  }

  let cidadeAtiva = false;

  function reset(comCidade: boolean, nivel = 1) {
    const av = ctx.mundo.avenidaInfo;
    carros.length = 0;
    pedestres.length = 0;
    tempoMs = 0;
    invencivelAte = 0;
    cidadeAtiva = comCidade;
    for (let i = 0; i < TC.carrosBR; i++) {
      carros.push({
        tipo: 'br',
        t: (i / TC.carrosBR) * av.comprimento,
        vel: TC.velBRMin + ((i * 7) % 5) / 5 * (TC.velBRMax - TC.velBRMin),
        mao: i % 2 === 0 ? 1 : -1,
      });
    }
    if (comCidade) {
      for (let i = 0; i < contagemCarros(nivel); i++) carros.push(novoCarroRua(i));
      for (let i = 0; i < contagemPedestres(nivel); i++) pedestres.push(novoPedestre(i));
    }
    atualizarMatrizes();
  }

  function atualizarNivel(nivel: number) {
    if (!cidadeAtiva) return;
    const { truck, mundo } = ctx;
    const bordaLonge = (truck.x > 0 ? -1 : 1) * (mundo.MEIO + 5);
    let naCidade = 0;
    for (const c of carros) if (c.tipo === 'rua') naCidade++;
    for (let i = naCidade; i < contagemCarros(nivel); i++) {
      carros.push(novoCarroRua(i, bordaLonge));
    }
    for (let i = pedestres.length; i < contagemPedestres(nivel); i++) {
      pedestres.push(novoPedestre(i, bordaLonge));
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
    const LIM = mundo.MEIO + 5;
    for (const p of pedestres) {
      const dxT = truck.x - p.x;
      const dzT = truck.z - p.z;
      const dT = Math.hypot(dxT, dzT);
      if (p.fase === 'cruzando') {
        p.velAtual += (p.vel - p.velAtual) * Math.min(1, 4 * dt);
        const passoZ = p.velAtual * dt;
        const falta = p.alvoZ - p.z;
        if (Math.abs(falta) <= passoZ) {
          p.z = p.alvoZ;
          p.lado = -p.lado as 1 | -1;
          p.fase = 'beirada';
          p.proximoCruzeMs = tempoMs + TC.cruzaBaseMs + ((pedestres.indexOf(p) * 3777) % TC.cruzaVarMs);
        } else {
          p.z += Math.sign(falta) * passoZ;
        }
      } else {
        const velAlvo = dT < 5 ? 0 : p.vel;
        p.velAtual += (velAlvo - p.velAtual) * Math.min(1, 4 * dt);
        p.x += p.velAtual * p.dir * dt;
        if (p.x > LIM) p.x = Math.abs(truck.x + LIM) > 35 ? -LIM : LIM;
        if (p.x < -LIM) p.x = Math.abs(truck.x - LIM) > 35 ? LIM : -LIM;
        if (tempoMs > p.proximoCruzeMs && dT > 12) {
          p.fase = 'cruzando';
          p.alvoZ = p.ruaZ - p.lado * TC.pedestreOffset;
        }
      }
      const alcance = TC.raioPedestre + ctx.cfg.raioColisao;
      if (dT < alcance) {
        const dn = dT || 0.001;
        truck.x += (dxT / dn) * (alcance - dn);
        truck.z += (dzT / dn) * (alcance - dn);
        if (tempoMs > invencivelAte && Math.abs(truck.v) > 1.5) {
          invencivelAte = tempoMs + TC.invencivelMs;
          truck.squashAte = performance.now() + 120;
          truck.v *= 0.4;
          p.x = (truck.x > 0 ? -1 : 1) * LIM;
          p.z = p.ruaZ + p.lado * TC.pedestreOffset;
          p.fase = 'beirada';
          p.proximoCruzeMs = tempoMs + TC.cruzaBaseMs;
          ctx.pedidos.bateuEmPedestre();
        }
      }
    }
    atualizarMatrizes();
  }

  return { passo, reset, atualizarNivel, carros, pedestres };
}
