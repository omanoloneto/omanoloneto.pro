import * as THREE from 'three';
import type { Bots, Contexto } from './tipos';

const MAX_BOTS = 12;

type Bot = {
  ativo: boolean;
  derretendo: number;
  x: number;
  y: number;
  z: number;
  hp: number;
  hpMax: number;
  vel: number;
  proxTiroMs: number;
  grupo: THREE.Group;
  poca: THREE.Mesh;
};

function texAcucar(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 32;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f8f6f0';
  g.fillRect(0, 0, 32, 32);
  for (let i = 0; i < 60; i++) {
    const x = (i * 13) % 32;
    const y = (i * 7 + ((i / 3) | 0)) % 32;
    g.fillStyle = i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? '#e8e4d8' : '#dcd8cc';
    g.fillRect(x, y, 1, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  return t;
}

export function criarBots(ctx: Contexto): Bots {
  const { scene, cfg } = ctx;
  const B = cfg.bots;

  const acucarTex = texAcucar();
  const corpoMat = new THREE.MeshLambertMaterial({ map: acucarTex });
  const olhoMat = new THREE.MeshBasicMaterial({ color: 0x303030 });
  const bisnagaMat = new THREE.MeshLambertMaterial({ color: 0xf07838 });
  const pocaMat = new THREE.MeshBasicMaterial({ color: 0x9adcf5, transparent: true, opacity: 0.7 });
  const pocaGeo = new THREE.CircleGeometry(0.9, 14);

  function montarBoneco(): THREE.Group {
    const g = new THREE.Group();
    const corpo = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.5), corpoMat);
    corpo.position.y = 0.85;
    const cabeca = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.55), corpoMat);
    cabeca.position.y = 1.6;
    const pernaE = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.5, 0.3), corpoMat);
    pernaE.position.set(-0.2, 0.25, 0);
    const pernaD = pernaE.clone();
    pernaD.position.x = 0.2;
    const bracoE = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.25), corpoMat);
    bracoE.position.set(-0.55, 0.95, 0);
    const bracoD = bracoE.clone();
    bracoD.position.x = 0.55;
    const olhoE = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.03), olhoMat);
    olhoE.position.set(-0.13, 1.66, 0.29);
    const olhoD = olhoE.clone();
    olhoD.position.x = 0.13;
    const bisnaga = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.55), bisnagaMat);
    bisnaga.position.set(0.55, 1.15, 0.3);
    g.add(corpo, cabeca, pernaE, pernaD, bracoE, bracoD, olhoE, olhoD, bisnaga);
    return g;
  }

  const bots: Bot[] = Array.from({ length: MAX_BOTS }, () => {
    const grupo = montarBoneco();
    grupo.visible = false;
    scene.add(grupo);
    const poca = new THREE.Mesh(pocaGeo, pocaMat);
    poca.rotation.x = -Math.PI / 2;
    poca.visible = false;
    scene.add(poca);
    return { ativo: false, derretendo: 0, x: 0, y: 0, z: 0, hp: 0, hpMax: 0, vel: 0, proxTiroMs: 0, grupo, poca };
  });

  function spawnOnda(onda: number) {
    const n = Math.min(cfg.ondas.botsMax, cfg.ondas.botsBase + (onda - 1) * cfg.ondas.botsPorOnda);
    const vel = Math.min(B.velMax, B.velBase + (onda - 1) * B.velPorOnda);
    const hp = B.hpBase + (onda - 1) * B.hpPorOnda;
    let feitos = 0;
    for (const b of bots) {
      if (feitos >= n) break;
      if (b.ativo) continue;
      const [sx, sz] = ctx.spawnsBots[feitos % ctx.spawnsBots.length];
      b.ativo = true;
      b.derretendo = 0;
      b.x = sx + (Math.random() - 0.5) * 2;
      b.z = sz + (Math.random() - 0.5) * 2;
      b.y = ctx.arena.chaoEm(b.x, b.z);
      b.hp = hp;
      b.hpMax = hp;
      b.vel = vel * (0.85 + Math.random() * 0.3);
      b.proxTiroMs = performance.now() + 800 + Math.random() * 1200;
      b.grupo.visible = true;
      b.grupo.scale.set(1, 1, 1);
      b.grupo.position.set(b.x, b.y, b.z);
      b.poca.visible = false;
      feitos++;
    }
  }

  function passo(dt: number, ts: number) {
    const j = ctx.jogador;
    for (const b of bots) {
      if (!b.ativo) continue;
      if (b.derretendo > 0) {
        b.derretendo += dt;
        const t = Math.min(1, b.derretendo / 0.9);
        b.grupo.scale.set(1 + t * 0.4, Math.max(0.02, 1 - t), 1 + t * 0.4);
        b.poca.visible = true;
        b.poca.scale.setScalar(0.3 + t * 0.9);
        b.poca.position.set(b.x, b.y + 0.02, b.z);
        if (b.derretendo > 2.2) {
          b.ativo = false;
          b.grupo.visible = false;
          b.poca.visible = false;
        }
        continue;
      }
      const dx = j.x - b.x;
      const dz = j.z - b.z;
      const dist = Math.hypot(dx, dz);
      if (dist < B.alcanceVisao && dist > B.alcanceTiro * 0.55) {
        const passoX = (dx / dist) * b.vel * dt;
        const passoZ = (dz / dist) * b.vel * dt;
        let nx = b.x + passoX;
        let nz = b.z + passoZ;
        for (const box of ctx.arena.aabbs) {
          if (box.alt < 1) continue;
          const px = Math.max(box.minX, Math.min(nx, box.maxX));
          const pz = Math.max(box.minZ, Math.min(nz, box.maxZ));
          const ddx = nx - px;
          const ddz = nz - pz;
          const d2 = ddx * ddx + ddz * ddz;
          if (d2 < B.raio * B.raio) {
            const d = Math.sqrt(d2) || 0.001;
            nx += (ddx / d) * (B.raio - d);
            nz += (ddz / d) * (B.raio - d);
          }
        }
        b.x = nx;
        b.z = nz;
      }
      const alvoY = ctx.arena.chaoEm(b.x, b.z);
      b.y += (alvoY - b.y) * Math.min(1, 8 * dt);
      b.grupo.position.set(b.x, b.y, b.z);
      b.grupo.rotation.y = Math.atan2(dx, dz);
      if (!ctx.motionReduzido) {
        b.grupo.position.y = b.y + Math.abs(Math.sin(ts / 180 + b.x)) * 0.06;
      }
      if (dist < B.alcanceTiro && ts >= b.proxTiroMs && ctx.estado.fase === 'jogando' && !ctx.estado.derretendo) {
        b.proxTiroMs = ts + B.cadenciaMs + Math.random() * 500;
        const origemY = b.y + 1.2;
        const alvoAltura = j.y + 1.2;
        const dy = alvoAltura - origemY + dist * 0.06;
        const norm = Math.hypot(dx, dy, dz) || 0.001;
        ctx.agua.atirar(b.x + (dx / dist) * 0.6, origemY, b.z + (dz / dist) * 0.6, dx / norm, dy / norm, dz / norm, false);
        ctx.audio.somJato();
      }
    }
  }

  function atingir(idx: number, dano: number) {
    const b = bots[idx];
    if (!b || !b.ativo || b.derretendo > 0) return;
    b.hp -= dano;
    if (b.hp <= 0) {
      b.derretendo = 0.001;
      ctx.estado.pontos += B.pontosPorBot;
      ctx.audio.somDerreter();
      ctx.ui.atualizarHud();
    }
  }

  function colideJato(px: number, py: number, pz: number): number {
    for (let i = 0; i < bots.length; i++) {
      const b = bots[i];
      if (!b.ativo || b.derretendo > 0) continue;
      const dx = px - b.x;
      const dz = pz - b.z;
      const dy = py - b.y;
      if (dx * dx + dz * dz < B.raio * B.raio * 1.3 && dy > 0 && dy < B.altura + 0.2) return i;
    }
    return -1;
  }

  function vivos(): number {
    return bots.filter((b) => b.ativo && b.derretendo === 0).length;
  }

  function limpar() {
    for (const b of bots) {
      b.ativo = false;
      b.grupo.visible = false;
      b.poca.visible = false;
    }
  }

  function posicoes() {
    return bots.filter((b) => b.ativo).map((b) => ({ x: b.x, y: b.y, z: b.z, hp: b.hp }));
  }

  return { vivos, spawnOnda, passo, atingir, colideJato, limpar, posicoes };
}
