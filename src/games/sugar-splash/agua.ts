import * as THREE from 'three';
import type { Agua, Contexto } from './tipos';

const MAX_GOTAS = 120;
const MAX_PARTICULAS = 160;

type Gota = { ativa: boolean; x: number; y: number; z: number; vx: number; vy: number; vz: number; doJogador: boolean; vida: number };
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

  const gotas: Gota[] = Array.from({ length: MAX_GOTAS }, () => ({ ativa: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, doJogador: false, vida: 0 }));
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

  function atirar(x: number, y: number, z: number, dx: number, dy: number, dz: number, doJogador: boolean) {
    for (const g of gotas) {
      if (g.ativa) continue;
      g.ativa = true;
      g.x = x;
      g.y = y;
      g.z = z;
      const vel = doJogador ? cfg.bisnaga.velJato : cfg.bots.velJato;
      const esp = doJogador ? 0.015 : 0.05;
      g.vx = (dx + (Math.random() - 0.5) * esp) * vel;
      g.vy = (dy + (Math.random() - 0.5) * esp) * vel;
      g.vz = (dz + (Math.random() - 0.5) * esp) * vel;
      g.doJogador = doJogador;
      g.vida = 2;
      return;
    }
  }

  function passo(dt: number) {
    const j = ctx.jogador;
    const rj = cfg.jogador.raio;
    for (const g of gotas) {
      if (!g.ativa) continue;
      g.vida -= dt;
      g.vy -= 3.5 * dt;
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      g.z += g.vz * dt;
      const chao = ctx.arena.chaoEm(g.x, g.z);
      if (g.vida <= 0 || g.y <= chao + 0.05) {
        if (g.y <= chao + 0.05) splash(g.x, chao + 0.08, g.z, false);
        g.ativa = false;
        continue;
      }
      if (g.doJogador) {
        const idx = ctx.bots.colideJato(g.x, g.y, g.z);
        if (idx >= 0) {
          ctx.bots.atingir(idx, cfg.bisnaga.dano);
          splash(g.x, g.y, g.z, true);
          g.ativa = false;
        }
      } else {
        const dx = g.x - j.x;
        const dz = g.z - j.z;
        const dy = g.y - (j.y + 1);
        if (dx * dx + dz * dz < rj * rj * 1.4 && dy > -1.2 && dy < 0.9) {
          ctx.fluxo && ctx.ui.flashDano();
          ctx.estado.solidez -= cfg.bots.dano;
          ctx.estado.ultimoDanoMs = performance.now();
          ctx.audio.somDano();
          ctx.ui.atualizarHud();
          splash(g.x, g.y, g.z, true);
          g.ativa = false;
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

  return { atirar, passo, splash, limpar };
}
