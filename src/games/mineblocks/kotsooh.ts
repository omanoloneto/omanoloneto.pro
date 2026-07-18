import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { DIA_S } from './ceu';
import type { Contexto, Kotsooh } from './tipos';

const NIGHT_START = DIA_S;

function cubePart(w: number, h: number, d: number, x: number, y: number, z: number, cor: THREE.Color, rz = 0, rx = 0): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rz) g.rotateZ(rz);
  if (rx) g.rotateX(rx);
  g.translate(x, y, z);
  const n = g.attributes.position.count;
  const cores = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    cores[i * 3] = cor.r;
    cores[i * 3 + 1] = cor.g;
    cores[i * 3 + 2] = cor.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(cores, 3));
  return g;
}

function ghostGeometry(): THREE.BufferGeometry {
  const body = new THREE.Color('#f2f0ec');
  const bodyShade = new THREE.Color('#dcd8d0');
  const horn = new THREE.Color('#8a6aaa');
  const socket = new THREE.Color('#4a3a7a');
  const gold = new THREE.Color('#f0d896');
  const mouth = new THREE.Color('#3a3244');
  const claw = new THREE.Color('#f8f6f0');
  const palm = new THREE.Color('#7a5f9d');
  const tail = new THREE.Color('#9a7ab8');

  const p: THREE.BufferGeometry[] = [];
  p.push(cubePart(1.0, 1.3, 0.8, 0, 1.35, 0, body));
  p.push(cubePart(1.1, 0.35, 0.9, 0, 1.75, 0, body));
  p.push(cubePart(0.2, 0.28, 0.2, -0.48, 2.05, 0, horn, 0.45));
  p.push(cubePart(0.2, 0.28, 0.2, 0.48, 2.05, 0, horn, -0.45));
  p.push(cubePart(0.12, 0.16, 0.12, -0.6, 2.18, 0, horn, 0.7));
  p.push(cubePart(0.12, 0.16, 0.12, 0.6, 2.18, 0, horn, -0.7));
  p.push(cubePart(0.3, 0.36, 0.06, -0.24, 1.58, 0.41, socket));
  p.push(cubePart(0.3, 0.36, 0.06, 0.24, 1.66, 0.41, socket));
  p.push(cubePart(0.15, 0.18, 0.06, -0.24, 1.58, 0.45, gold));
  p.push(cubePart(0.15, 0.18, 0.06, 0.24, 1.66, 0.45, gold));
  p.push(cubePart(0.24, 0.07, 0.05, 0, 1.24, 0.41, mouth));
  p.push(cubePart(0.07, 0.07, 0.05, -0.17, 1.3, 0.41, mouth));
  p.push(cubePart(0.07, 0.07, 0.05, 0.17, 1.3, 0.41, mouth));
  p.push(cubePart(0.3, 0.3, 0.3, -0.62, 1.05, 0.16, body));
  p.push(cubePart(0.3, 0.3, 0.3, 0.62, 1.05, 0.16, body));
  p.push(cubePart(0.24, 0.14, 0.24, -0.62, 0.92, 0.16, palm));
  p.push(cubePart(0.24, 0.14, 0.24, 0.62, 0.92, 0.16, palm));
  for (const s of [-1, 1]) {
    for (const dx of [-0.08, 0, 0.08]) {
      p.push(cubePart(0.06, 0.18, 0.06, s * 0.62 + dx, 0.8, 0.2, claw));
    }
  }
  const hem = [
    [-0.4, 0.52, 0.3], [-0.2, 0.62, 0.24], [0, 0.5, 0.34], [0.2, 0.6, 0.26], [0.4, 0.54, 0.3],
  ] as const;
  for (const [hx, hy, hh] of hem) {
    p.push(cubePart(0.2, hh, 0.7, hx, hy, 0, bodyShade));
  }
  p.push(cubePart(0.24, 0.24, 0.24, 0.16, 0.42, -0.14, tail, 0.35));
  p.push(cubePart(0.17, 0.17, 0.17, 0.34, 0.28, -0.26, tail, 0.6));
  p.push(cubePart(0.11, 0.11, 0.11, 0.48, 0.16, -0.36, tail, 0.9));
  const geo = mergeGeometries(p)!;
  p.forEach((g) => g.dispose());
  return geo;
}

type Ghost = {
  x: number;
  y: number;
  z: number;
  faceX: number;
  faceZ: number;
  yawVis: number;
  tx: number;
  tz: number;
  state: 'wander' | 'chase';
  retargetMs: number;
  freezeMs: number;
  gazeS: number;
  noTriggerS: number;
  shelterS: number;
  hitCdMs: number;
  bobPhase: number;
  looking: boolean;
  mat: THREE.MeshBasicMaterial;
  mesh: THREE.Mesh;
};

export function criarKotsooh(ctx: Contexto): Kotsooh {
  const K = ctx.cfg.kotsooh;
  const { SX, SZ, SY, nivelAgua } = ctx.cfg.mundo;

  const geo = ghostGeometry();

  function rand(a: number, b: number) {
    return a + Math.random() * (b - a);
  }

  const ghosts: Ghost[] = [];
  for (let i = 0; i < K.quantos; i++) {
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 3;
    mesh.visible = false;
    ctx.scene.add(mesh);
    ghosts.push({
      x: 0, y: 0, z: 0, faceX: 1, faceZ: 0, yawVis: 0, tx: 0, tz: 0,
      state: 'wander', retargetMs: 0, freezeMs: 0, gazeS: 0, noTriggerS: 0,
      shelterS: 0, hitCdMs: 0, bobPhase: rand(0, Math.PI * 2), looking: false,
      mat, mesh,
    });
  }

  let materialized = false;
  let toldOnce = false;
  let howlMs = rand(K.uivoMinMs, K.uivoMaxMs);
  let bobT = 0;

  function isNight() {
    return ctx.ceu.tempo() >= NIGHT_START;
  }

  function isCovered(x: number, y: number, z: number): boolean {
    const cx = Math.floor(x);
    const cz = Math.floor(z);
    for (let cy = Math.floor(y) + 1; cy < SY; cy++) {
      const id = ctx.mundo.obter(cx, cy, cz);
      if (id !== 0 && ctx.porId(id).solido) return true;
    }
    return false;
  }

  function playerCovered(): boolean {
    return isCovered(ctx.jogador.x, ctx.jogador.y + 1.6, ctx.jogador.z);
  }

  function hoverY(x: number, z: number): number {
    const ground = ctx.mundo.chaoMaisAlto(Math.floor(x), Math.floor(z));
    return Math.max(ground, nivelAgua) + 1 + K.alturaVoo;
  }

  function losClear(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): boolean {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dz = z1 - z0;
    const dist = Math.hypot(dx, dy, dz);
    const steps = Math.ceil(dist);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const id = ctx.mundo.obter(Math.floor(x0 + dx * t), Math.floor(y0 + dy * t), Math.floor(z0 + dz * t));
      if (id !== 0 && ctx.porId(id).solido) return false;
    }
    return true;
  }

  function newWanderTarget(g: Ghost, awayFromPlayer = false) {
    for (let t = 0; t < 8; t++) {
      let ang = Math.random() * Math.PI * 2;
      if (awayFromPlayer) {
        const j = ctx.jogador;
        ang = Math.atan2(g.z - j.z, g.x - j.x) + rand(-0.7, 0.7);
      }
      const d = rand(K.passeioMin, K.passeioMax) * (awayFromPlayer ? 1.6 : 1);
      const nx = Math.max(4, Math.min(SX - 4, g.x + Math.cos(ang) * d));
      const nz = Math.max(4, Math.min(SZ - 4, g.z + Math.sin(ang) * d));
      if (isCovered(nx, hoverY(nx, nz), nz)) continue;
      g.tx = nx;
      g.tz = nz;
      g.retargetMs = rand(K.trocaAlvoMinMs, K.trocaAlvoMaxMs);
      return;
    }
    g.retargetMs = 1500;
  }

  function materialize(): boolean {
    const j = ctx.jogador;
    let ok = false;
    for (const g of ghosts) {
      let placed = false;
      for (let t = 0; t < 30 && !placed; t++) {
        const x = rand(8, SX - 8);
        const z = rand(8, SZ - 8);
        if (Math.hypot(x - j.x, z - j.z) < 14) continue;
        const y = hoverY(x, z);
        if (isCovered(x, y, z)) continue;
        g.x = x;
        g.z = z;
        g.y = y + 1;
        placed = true;
      }
      if (!placed) continue;
      const fa = Math.random() * Math.PI * 2;
      g.faceX = Math.cos(fa);
      g.faceZ = Math.sin(fa);
      g.yawVis = Math.atan2(g.faceX, g.faceZ);
      g.state = 'wander';
      g.gazeS = 0;
      g.noTriggerS = 0;
      g.shelterS = 0;
      g.hitCdMs = 0;
      g.freezeMs = 0;
      g.looking = false;
      g.mat.opacity = 0;
      g.mesh.visible = true;
      newWanderTarget(g);
      ok = true;
    }
    materialized = ok;
    return ok;
  }

  function stopChase(g: Ghost, recuo: boolean) {
    g.state = 'wander';
    g.gazeS = 0;
    g.shelterS = 0;
    if (recuo) {
      g.noTriggerS = K.recuoS;
      newWanderTarget(g, true);
    } else {
      newWanderTarget(g);
    }
  }

  function applyVisual(g: Ghost, dt: number) {
    const targetYaw = Math.atan2(g.faceX, g.faceZ);
    let dYaw = targetYaw - g.yawVis;
    while (dYaw > Math.PI) dYaw -= Math.PI * 2;
    while (dYaw < -Math.PI) dYaw += Math.PI * 2;
    g.yawVis += dYaw * Math.min(1, dt * 6);
    g.mesh.rotation.y = g.yawVis;
    const pulse = 1 + Math.sin(bobT * 3.1 + g.bobPhase) * 0.03;
    g.mesh.scale.setScalar(pulse);
    g.mesh.position.set(g.x, g.y - 1.3 + Math.sin(bobT * 2.6 + g.bobPhase) * 0.16, g.z);
  }

  function passo(dt: number) {
    bobT += dt;
    const night = isNight();

    if (!night && materialized) {
      let anyVisible = false;
      for (const g of ghosts) {
        if (g.state === 'chase') stopChase(g, false);
        g.mat.opacity = Math.max(0, g.mat.opacity - dt * 0.7);
        g.y += dt * 1.5;
        applyVisual(g, dt);
        if (g.mat.opacity > 0.01) anyVisible = true;
        else g.mesh.visible = false;
      }
      if (!anyVisible) materialized = false;
      return;
    }
    if (!night) return;
    if (!materialized) {
      materialize();
      return;
    }

    const j = ctx.jogador;
    const eyeY = j.y + 1.62;
    const fwdX = -Math.sin(j.yaw) * Math.cos(j.pitch);
    const fwdY = Math.sin(j.pitch);
    const fwdZ = -Math.cos(j.yaw) * Math.cos(j.pitch);
    const abrigado = playerCovered();

    howlMs -= dt * 1000;
    if (howlMs <= 0) {
      howlMs = rand(K.uivoMinMs, K.uivoMaxMs);
      ctx.audio.somFantasma();
    }

    for (const g of ghosts) {
      if (!g.mesh.visible) continue;
      g.mat.opacity = Math.min(0.92, g.mat.opacity + dt * 0.8);
      g.hitCdMs = Math.max(0, g.hitCdMs - dt * 1000);
      g.noTriggerS = Math.max(0, g.noTriggerS - dt);

      const dxp = j.x - g.x;
      const dzp = j.z - g.z;
      const distH = Math.hypot(dxp, dzp);
      const dist3 = Math.hypot(dxp, eyeY - g.y, dzp);

      if (g.state === 'wander') {
        const dxt = g.tx - g.x;
        const dzt = g.tz - g.z;
        const dT = Math.hypot(dxt, dzt);
        g.retargetMs -= dt * 1000;
        if (g.freezeMs > 0) {
          g.freezeMs -= dt * 1000;
        } else if (dT < 0.6 || g.retargetMs <= 0) {
          newWanderTarget(g);
        } else {
          const step = K.velPasseio * dt;
          const nx = g.x + (dxt / dT) * Math.min(step, dT);
          const nz = g.z + (dzt / dT) * Math.min(step, dT);
          if (isCovered(nx, hoverY(nx, nz), nz)) {
            newWanderTarget(g);
          } else {
            g.x = nx;
            g.z = nz;
            const k = Math.min(1, dt * 4);
            g.faceX += (dxt / dT - g.faceX) * k;
            g.faceZ += (dzt / dT - g.faceZ) * k;
            const fl = Math.hypot(g.faceX, g.faceZ) || 1;
            g.faceX /= fl;
            g.faceZ /= fl;
          }
        }

        g.looking = distH > 0.001 && (g.faceX * (dxp / distH) + g.faceZ * (dzp / distH)) > K.olharConeFantasma;

        let mutual = false;
        if (g.looking && g.noTriggerS <= 0 && !abrigado && dist3 < K.olharDistMax) {
          const dirX = (g.x - j.x) / dist3;
          const dirY = (g.y - eyeY) / dist3;
          const dirZ = (g.z - j.z) / dist3;
          const dot = fwdX * dirX + fwdY * dirY + fwdZ * dirZ;
          if (dot > K.olharConeJogador && losClear(j.x, eyeY, j.z, g.x, g.y, g.z)) mutual = true;
        }
        if (mutual) {
          g.gazeS += dt;
          if (g.gazeS >= K.encararS) {
            g.state = 'chase';
            g.shelterS = 0;
            ctx.audio.somSusto();
            if (!toldOnce) {
              toldOnce = true;
              ctx.ui.mostrarToast('👻 Você encarou o Kotsooh e ele NÃO gostou! Corre pra um teto!', 'err', 3400);
            }
            ctx.ui.anunciar('O Kotsooh percebeu seu olhar e vem atrás de você!');
          }
        } else {
          g.gazeS = Math.max(0, g.gazeS - dt * 2);
        }
      } else {
        g.looking = true;
        if (abrigado) {
          g.shelterS += dt;
          if (g.shelterS >= K.abrigoS) {
            stopChase(g, true);
            ctx.ui.mostrarToast('👻 O Kotsooh desistiu — lugar com teto é seguro!', 'ok', 3000);
          }
        } else {
          g.shelterS = 0;
        }
        if (g.state === 'chase') {
          if (distH > K.desisteDist) {
            stopChase(g, false);
          } else if (distH > 0.15 && !abrigado) {
            const step = K.velCaca * dt;
            let nx = g.x + (dxp / distH) * Math.min(step, distH);
            let nz = g.z + (dzp / distH) * Math.min(step, distH);
            if (isCovered(nx, hoverY(nx, nz), nz)) {
              const sx = g.x + (-dzp / distH) * step;
              const sz = g.z + (dxp / distH) * step;
              if (!isCovered(sx, hoverY(sx, sz), sz)) {
                nx = sx;
                nz = sz;
              } else {
                nx = g.x;
                nz = g.z;
              }
            }
            g.x = nx;
            g.z = nz;
            g.faceX = dxp / distH;
            g.faceZ = dzp / distH;
          }
          if (dist3 < K.alcanceBatida && g.hitCdMs <= 0 && !abrigado) {
            g.hitCdMs = K.cooldownBatidaMs;
            const n = Math.max(0.001, distH);
            ctx.fisica.empurrar((dxp / n) * K.empurrao, (dzp / n) * K.empurrao);
            j.vy = Math.max(j.vy, K.pulinho);
            ctx.ui.flashSusto();
            ctx.audio.somSusto();
            ctx.ui.anunciar('O Kotsooh te assustou!');
          }
        }
      }

      const targetY = g.state === 'chase' ? Math.max(hoverY(g.x, g.z), eyeY - 0.4) : hoverY(g.x, g.z);
      g.y += (targetY - g.y) * Math.min(1, dt * 3);
      applyVisual(g, dt);
    }
  }

  return {
    nascer() {
      materialized = false;
      toldOnce = false;
      for (const g of ghosts) {
        g.state = 'wander';
        g.mesh.visible = false;
        g.mat.opacity = 0;
      }
    },
    passo,
    aparecer() {
      return materialize();
    },
    provocar() {
      const j = ctx.jogador;
      for (const g of ghosts) {
        const d = Math.hypot(j.x - g.x, j.z - g.z) || 1;
        g.faceX = (j.x - g.x) / d;
        g.faceZ = (j.z - g.z) / d;
        g.noTriggerS = 0;
        g.tx = g.x;
        g.tz = g.z;
        g.freezeMs = 4000;
      }
    },
    ativo: () => ghosts.some((g) => g.state === 'chase' && g.mesh.visible),
    fantasmas: () =>
      ghosts
        .filter((g) => g.mesh.visible)
        .map((g) => ({ x: g.x, y: g.y, z: g.z, cacando: g.state === 'chase', olhando: g.looking })),
    limpar() {
      materialized = false;
      for (const g of ghosts) g.mesh.visible = false;
    },
  };
}
