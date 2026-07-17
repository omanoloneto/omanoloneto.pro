import * as THREE from 'three';
import type { Bots, Contexto } from './tipos';
import { buildCharacter, createCharacterMaterials } from './models';

const MAX_BOTS = 12;

type Bot = {
  ativo: boolean;
  derretendo: number;
  respawnRestante: number;
  hitPulse: number;
  x: number;
  y: number;
  z: number;
  hp: number;
  hpMax: number;
  vel: number;
  proxTiroMs: number;
  grupo: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  teamMeshes: THREE.Mesh[];
  poca: THREE.Mesh;
};

export function criarBots(ctx: Contexto): Bots {
  const { scene, cfg } = ctx;
  const B = cfg.bots;

  const mats = createCharacterMaterials();
  const pocaMat = new THREE.MeshBasicMaterial({ color: 0x9adcf5, transparent: true, opacity: 0.7 });
  const pocaGeo = new THREE.CircleGeometry(0.9, 14);

  const bots: Bot[] = Array.from({ length: MAX_BOTS }, () => {
    const rig = buildCharacter(mats);
    rig.group.visible = false;
    scene.add(rig.group);
    const poca = new THREE.Mesh(pocaGeo, pocaMat);
    poca.rotation.x = -Math.PI / 2;
    poca.visible = false;
    scene.add(poca);
    return {
      ativo: false, derretendo: 0, respawnRestante: 0, hitPulse: 0, x: 0, y: 0, z: 0, hp: 0, hpMax: 0, vel: 0, proxTiroMs: 0,
      grupo: rig.group, armL: rig.armL, armR: rig.armR, legL: rig.legL, legR: rig.legR,
      teamMeshes: rig.teamMeshes, poca,
    };
  });

  function resetLimbs(b: Bot) {
    b.armL.rotation.x = 0;
    b.armR.rotation.x = 0;
    b.legL.rotation.x = 0;
    b.legR.rotation.x = 0;
  }

  let spawnIndex = 0;

  function enemySpawns(): Array<[number, number]> {
    const ladoInimigo = ctx.estado.team === 0 ? 1 : -1;
    return ctx.spawnsBots.filter(([x]) => Math.sign(x) === ladoInimigo);
  }

  function reviver(b: Bot) {
    const pontos = enemySpawns();
    const [sx, sz] = pontos[spawnIndex++ % pontos.length];
    b.ativo = true;
    b.derretendo = 0;
    b.respawnRestante = 0;
    b.hitPulse = 0;
    b.x = sx + (Math.random() - 0.5) * 2;
    b.z = sz + (Math.random() - 0.5) * 2;
    b.y = ctx.arena.chaoEm(b.x, b.z);
    b.hp = B.hp;
    b.hpMax = B.hp;
    b.vel = B.vel * (0.85 + Math.random() * 0.3);
    b.proxTiroMs = performance.now() + 800 + Math.random() * 1200;
    const teamMat = ctx.estado.team === 0 ? mats.trunksRed : mats.trunksBlue;
    for (const mesh of b.teamMeshes) mesh.material = teamMat;
    resetLimbs(b);
    b.grupo.visible = true;
    b.grupo.scale.set(1, 1, 1);
    b.grupo.position.set(b.x, b.y, b.z);
    b.poca.visible = false;
  }

  function spawnInicial() {
    limpar();
    spawnIndex = 0;
    for (let i = 0; i < cfg.partida.inimigos && i < bots.length; i++) reviver(bots[i]);
  }

  function passo(dt: number, ts: number) {
    const j = ctx.jogador;
    for (const b of bots) {
      if (!b.ativo) {
        if (b.respawnRestante > 0 && ctx.estado.fase === 'jogando') {
          b.respawnRestante -= dt;
          if (b.respawnRestante <= 0) reviver(b);
        }
        continue;
      }
      if (b.derretendo > 0) {
        b.derretendo += dt;
        const t = Math.min(1, b.derretendo / 0.45);
        b.grupo.scale.set(1 + t * 0.4, Math.max(0.02, 1 - t), 1 + t * 0.4);
        b.poca.visible = true;
        b.poca.scale.setScalar(0.3 + t * 0.9);
        b.poca.position.set(b.x, b.y + 0.02, b.z);
        if (b.derretendo > 1.2) {
          b.ativo = false;
          b.grupo.visible = false;
          b.poca.visible = false;
          b.respawnRestante = Math.max(0.5, cfg.partida.respawnS - 1.2);
        }
        continue;
      }
      const dx = j.x - b.x;
      const dz = j.z - b.z;
      const dist = Math.hypot(dx, dz);
      const walking = dist > B.alcanceTiro * 0.55;
      if (walking) {
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
      const swing = !ctx.motionReduzido && walking ? Math.sin(ts / 140 + b.x * 3) * 0.55 : 0;
      b.legL.rotation.x = swing;
      b.legR.rotation.x = -swing;
      b.armL.rotation.x = -swing;
      b.armR.rotation.x = dist < B.alcanceTiro * 1.4 ? -1.25 : swing;
      const pulse = ctx.motionReduzido ? 0 : b.hitPulse;
      b.grupo.scale.set(1 + pulse * 0.12, 1 - pulse * 0.18, 1 + pulse * 0.12);
      b.hitPulse = Math.max(0, b.hitPulse - dt * 8);
      if (!ctx.motionReduzido) {
        b.grupo.position.y = b.y + Math.abs(Math.sin(ts / 180 + b.x)) * 0.06;
      }
      if (dist < B.alcanceTiro && ts >= b.proxTiroMs && ctx.estado.fase === 'jogando' && !ctx.estado.derretendo) {
        b.proxTiroMs = ts + B.cadenciaMs + Math.random() * 500;
        const origemY = b.y + 1.2;
        const alvoAltura = j.y + 1.2;
        const drop = (cfg.bisnaga.dropletGravity * dist * dist) / (2 * B.velJato * B.velJato);
        const dy = alvoAltura - origemY + drop;
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
      resetLimbs(b);
      ctx.estado.kills++;
      ctx.estado.pontos += B.pontosPorBot;
      ctx.ui.mostrarPontos('+' + B.pontosPorBot, { x: b.x, y: b.y, z: b.z });
      ctx.audio.somDerreter();
      ctx.ui.atualizarHud();
    } else {
      b.hitPulse = 1;
      ctx.audio.somHit();
    }
  }

  function colideJato(px: number, py: number, pz: number): number {
    for (let i = 0; i < bots.length; i++) {
      const b = bots[i];
      if (!b.ativo || b.derretendo > 0) continue;
      const dx = px - b.x;
      const dz = pz - b.z;
      const dy = py - b.y;
      if (dx * dx + dz * dz < B.raio * B.raio * 1.3 && dy > 0 && dy < B.altura + 0.3) return i;
    }
    return -1;
  }

  function vivos(): number {
    return bots.filter((b) => b.ativo && b.derretendo === 0).length;
  }

  function limpar() {
    for (const b of bots) {
      b.ativo = false;
      b.respawnRestante = 0;
      b.hitPulse = 0;
      b.grupo.visible = false;
      b.poca.visible = false;
    }
  }

  function posicoes() {
    return bots.filter((b) => b.ativo).map((b) => ({ x: b.x, y: b.y, z: b.z, hp: b.hp }));
  }

  return { vivos, spawnInicial, passo, atingir, colideJato, limpar, posicoes };
}
