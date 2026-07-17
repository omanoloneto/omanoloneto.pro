import * as THREE from 'three';
import type { Agua, Contexto } from './tipos';

const MAX_GOTAS = 120;
const MAX_PARTICULAS = 160;

type Gota = { ativa: boolean; x: number; y: number; z: number; vx: number; vy: number; vz: number; doJogador: boolean; cosmetica: boolean; vida: number };
type Part = { ativa: boolean; x: number; y: number; z: number; vx: number; vy: number; vz: number; vida: number };

export function criarAgua(ctx: Contexto): Agua {
  const { scene, cfg } = ctx;

  const gotaMesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.09, 6, 5),
    new THREE.MeshLambertMaterial({ color: 0x58c8f0, transparent: true, opacity: 0.9 }),
    MAX_GOTAS
  );
  gotaMesh.frustumCulled = false;
  scene.add(gotaMesh);

  const partMesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.05, 5, 4),
    new THREE.MeshBasicMaterial({ color: 0xa8e0f8, transparent: true, opacity: 0.8 }),
    MAX_PARTICULAS
  );
  partMesh.frustumCulled = false;
  scene.add(partMesh);

  const gotas: Gota[] = Array.from({ length: MAX_GOTAS }, () => ({ ativa: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, doJogador: false, cosmetica: false, vida: 0 }));
  const parts: Part[] = Array.from({ length: MAX_PARTICULAS }, () => ({ ativa: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, vida: 0 }));
  const m = new THREE.Matrix4();
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);

  function splash(x: number, y: number, z: number, grande: boolean) {
    if (ctx.motionReduzido) return;
    const n = grande ? 14 : 6;
    let feitos = 0;
    for (const p of parts) {
      if (feitos >= n) break;
      if (p.ativa) continue;
      feitos++;
      p.ativa = true;
      p.x = x;
      p.y = y;
      p.z = z;
      const a = Math.random() * Math.PI * 2;
      const v = 1 + Math.random() * 2.5;
      p.vx = Math.cos(a) * v;
      p.vz = Math.sin(a) * v;
      p.vy = 1.5 + Math.random() * 2.5;
      p.vida = 0.5 + Math.random() * 0.3;
    }
  }

  function lancar(x: number, y: number, z: number, dx: number, dy: number, dz: number, doJogador: boolean, cosmetica: boolean) {
    for (const g of gotas) {
      if (g.ativa) continue;
      g.ativa = true;
      g.x = x;
      g.y = y;
      g.z = z;
      const vel = doJogador ? cfg.bisnaga.velJato : cfg.bots.velJato;
      const esp = doJogador ? 0.01 : 0.05;
      g.vx = (dx + (Math.random() - 0.5) * esp) * vel;
      g.vy = (dy + (Math.random() - 0.5) * esp) * vel;
      g.vz = (dz + (Math.random() - 0.5) * esp) * vel;
      g.doJogador = doJogador;
      g.cosmetica = cosmetica;
      g.vida = cosmetica ? 1.2 : cfg.bisnaga.dropletLifeS;
      return;
    }
  }

  function atirar(x: number, y: number, z: number, dx: number, dy: number, dz: number, doJogador: boolean) {
    lancar(x, y, z, dx, dy, dz, doJogador, false);
  }

  function atirarCosmetico(x: number, y: number, z: number, dx: number, dy: number, dz: number) {
    lancar(x, y, z, dx, dy, dz, true, true);
  }

  function hitsSolid(x: number, y: number, z: number): boolean {
    for (const b of ctx.arena.aabbs) {
      if (x > b.minX - 0.09 && x < b.maxX + 0.09 && z > b.minZ - 0.09 && z < b.maxZ + 0.09 && y < b.alt) return true;
    }
    return false;
  }

  function passo(dt: number) {
    const j = ctx.jogador;
    const rj = cfg.jogador.raio;
    const gravity = cfg.bisnaga.dropletGravity;
    for (const g of gotas) {
      if (!g.ativa) continue;
      g.vida -= dt;
      if (g.vida <= 0) {
        g.ativa = false;
        continue;
      }
      const speed = Math.hypot(g.vx, g.vy, g.vz);
      const steps = Math.min(6, Math.max(1, Math.ceil((speed * dt) / 0.3)));
      const sdt = dt / steps;
      for (let s = 0; s < steps; s++) {
        g.vy -= gravity * sdt;
        g.x += g.vx * sdt;
        g.y += g.vy * sdt;
        g.z += g.vz * sdt;
        const chao = ctx.arena.chaoEm(g.x, g.z);
        if (g.y <= chao + 0.05) {
          splash(g.x, chao + 0.08, g.z, false);
          g.ativa = false;
          break;
        }
        if (hitsSolid(g.x, g.y, g.z)) {
          splash(g.x, g.y, g.z, false);
          g.ativa = false;
          break;
        }
        if (g.cosmetica) continue;
        if (g.doJogador) {
          const idx = ctx.bots.colideJato(g.x, g.y, g.z);
          if (idx >= 0) {
            ctx.bots.atingir(idx, cfg.bisnaga.dano);
            splash(g.x, g.y, g.z, true);
            g.ativa = false;
            break;
          }
          const alvo = ctx.remotos.hitTest(g.x, g.y, g.z);
          if (alvo) {
            ctx.net.queueEvent(['hit', alvo, cfg.bisnaga.dano]);
            splash(g.x, g.y, g.z, true);
            ctx.audio.somHit();
            g.ativa = false;
            break;
          }
        } else {
          const dx = g.x - j.x;
          const dz = g.z - j.z;
          const dy = g.y - (j.y + 1);
          if (dx * dx + dz * dz < rj * rj * 1.4 && dy > -1.2 && dy < 0.9) {
            ctx.fluxo && ctx.ui.flashDano();
            j.shake = 1;
            ctx.estado.solidez -= cfg.bots.dano;
            ctx.estado.ultimoDanoMs = performance.now();
            ctx.audio.somDano();
            ctx.ui.atualizarHud();
            splash(g.x, g.y, g.z, true);
            g.ativa = false;
            break;
          }
        }
      }
    }
    for (const p of parts) {
      if (!p.ativa) continue;
      p.vida -= dt;
      p.vy -= 8 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      if (p.vida <= 0) p.ativa = false;
    }
    gotas.forEach((g, i) => {
      if (g.ativa) {
        m.makeTranslation(g.x, g.y, g.z);
        gotaMesh.setMatrixAt(i, m);
      } else {
        gotaMesh.setMatrixAt(i, zero);
      }
    });
    gotaMesh.instanceMatrix.needsUpdate = true;
    parts.forEach((p, i) => {
      if (p.ativa) {
        m.makeTranslation(p.x, p.y, p.z);
        partMesh.setMatrixAt(i, m);
      } else {
        partMesh.setMatrixAt(i, zero);
      }
    });
    partMesh.instanceMatrix.needsUpdate = true;
  }

  function limpar() {
    for (const g of gotas) g.ativa = false;
    for (const p of parts) p.ativa = false;
  }

  return { atirar, atirarCosmetico, passo, splash, limpar };
}
