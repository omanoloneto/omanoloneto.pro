import * as THREE from 'three';
import type { Contexto, Kotsooh } from './tipos';

const NIGHT_START = 900;

function drawGhostFront(g: CanvasRenderingContext2D) {
  g.clearRect(0, 0, 64, 96);

  g.fillStyle = '#8a6aaa';
  g.beginPath();
  g.moveTo(10, 18); g.lineTo(2, 6); g.lineTo(18, 10); g.closePath();
  g.fill();
  g.beginPath();
  g.moveTo(54, 16); g.lineTo(62, 4); g.lineTo(46, 8); g.closePath();
  g.fill();
  g.fillStyle = '#6a4e8a';
  g.beginPath();
  g.moveTo(10, 18); g.lineTo(6, 8); g.lineTo(14, 12); g.closePath();
  g.fill();

  g.fillStyle = '#f2f0ec';
  g.beginPath();
  g.ellipse(32, 30, 24, 22, 0, Math.PI, 0);
  g.fill();
  g.fillRect(8, 28, 48, 34);
  g.beginPath();
  g.ellipse(32, 62, 24, 10, 0, 0, Math.PI);
  g.fill();

  g.fillStyle = '#e2ded6';
  g.fillRect(8, 56, 6, 8);
  g.fillRect(50, 54, 6, 8);

  const eye = (ex: number, ey: number) => {
    g.fillStyle = '#4a3a7a';
    g.beginPath();
    g.ellipse(ex, ey, 8, 9.5, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#d8d4e8';
    g.beginPath();
    g.ellipse(ex, ey - 1, 5.5, 6.5, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#f0d896';
    g.beginPath();
    g.arc(ex, ey - 1, 4, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#fff8e0';
    g.beginPath();
    g.arc(ex - 1.5, ey - 2.5, 1.5, 0, Math.PI * 2);
    g.fill();
  };
  eye(21, 32);
  eye(43, 27);

  g.strokeStyle = '#3a3244';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(32, 48, 5, Math.PI * 1.15, Math.PI * 1.85);
  g.stroke();

  const hand = (hx: number, hy: number) => {
    g.fillStyle = '#f2f0ec';
    g.beginPath();
    g.ellipse(hx, hy, 8, 7, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#7a5f9d';
    g.beginPath();
    g.ellipse(hx, hy + 3, 6, 4, 0, 0, Math.PI);
    g.fill();
    g.fillStyle = '#f8f6f0';
    for (const dx of [-4, 0, 4]) {
      g.beginPath();
      g.moveTo(hx + dx - 1.5, hy + 4);
      g.lineTo(hx + dx, hy + 11);
      g.lineTo(hx + dx + 1.5, hy + 4);
      g.closePath();
      g.fill();
    }
  };
  hand(12, 58);
  hand(52, 55);

  g.fillStyle = '#f2f0ec';
  for (const [tx, tw, th] of [[10, 8, 12], [20, 7, 8], [28, 9, 14], [38, 7, 9], [46, 8, 12]] as const) {
    g.beginPath();
    g.moveTo(tx, 64);
    g.lineTo(tx + tw / 2, 64 + th);
    g.lineTo(tx + tw, 64);
    g.closePath();
    g.fill();
  }

  g.fillStyle = '#9a7ab8';
  g.beginPath();
  g.moveTo(30, 68);
  g.quadraticCurveTo(24, 80, 12, 88);
  g.quadraticCurveTo(20, 82, 26, 74);
  g.closePath();
  g.fill();
  g.beginPath();
  g.ellipse(28, 72, 6, 4, -0.6, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#b898d4';
  g.beginPath();
  g.ellipse(14, 86, 4, 2.5, -0.8, 0, Math.PI * 2);
  g.fill();

  g.fillStyle = '#5a4a8a';
  for (const [px, py] of [[24, 58], [36, 62], [42, 56], [18, 50]] as const) {
    g.fillRect(px, py, 2, 3);
  }
}

function drawGhostBack(g: CanvasRenderingContext2D) {
  g.clearRect(0, 0, 64, 96);

  g.fillStyle = '#8a6aaa';
  g.beginPath();
  g.moveTo(18, 16); g.lineTo(8, 5); g.lineTo(24, 9); g.closePath();
  g.fill();
  g.beginPath();
  g.moveTo(46, 14); g.lineTo(56, 3); g.lineTo(40, 7); g.closePath();
  g.fill();

  g.fillStyle = '#e9e6df';
  g.beginPath();
  g.ellipse(32, 30, 24, 22, 0, Math.PI, 0);
  g.fill();
  g.fillRect(8, 28, 48, 34);
  g.beginPath();
  g.ellipse(32, 62, 24, 10, 0, 0, Math.PI);
  g.fill();

  g.fillStyle = '#dbd6cc';
  g.beginPath();
  g.ellipse(32, 34, 14, 16, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#e9e6df';
  g.beginPath();
  g.ellipse(30, 32, 11, 13, 0, 0, Math.PI * 2);
  g.fill();

  g.fillStyle = '#e9e6df';
  for (const [tx, tw, th] of [[10, 8, 12], [20, 7, 8], [28, 9, 14], [38, 7, 9], [46, 8, 12]] as const) {
    g.beginPath();
    g.moveTo(tx, 64);
    g.lineTo(tx + tw / 2, 64 + th);
    g.lineTo(tx + tw, 64);
    g.closePath();
    g.fill();
  }

  g.fillStyle = '#9a7ab8';
  g.beginPath();
  g.moveTo(34, 68);
  g.quadraticCurveTo(40, 80, 52, 88);
  g.quadraticCurveTo(44, 82, 38, 74);
  g.closePath();
  g.fill();
  g.fillStyle = '#b898d4';
  g.beginPath();
  g.ellipse(50, 86, 4, 2.5, 0.8, 0, Math.PI * 2);
  g.fill();
}

function makeTex(draw: (g: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 96;
  draw(canvas.getContext('2d')!);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

type Ghost = {
  x: number;
  y: number;
  z: number;
  faceX: number;
  faceZ: number;
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
  mat: THREE.SpriteMaterial;
  sprite: THREE.Sprite;
};

export function criarKotsooh(ctx: Contexto): Kotsooh {
  const K = ctx.cfg.kotsooh;
  const { SX, SZ, SY, nivelAgua } = ctx.cfg.mundo;

  const texFront = makeTex(drawGhostFront);
  const texBack = makeTex(drawGhostBack);

  function rand(a: number, b: number) {
    return a + Math.random() * (b - a);
  }

  const ghosts: Ghost[] = [];
  for (let i = 0; i < K.quantos; i++) {
    const mat = new THREE.SpriteMaterial({ map: texBack, transparent: true, opacity: 0, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.7, 2.55, 1);
    sprite.renderOrder = 3;
    sprite.visible = false;
    ctx.scene.add(sprite);
    ghosts.push({
      x: 0, y: 0, z: 0, faceX: 1, faceZ: 0, tx: 0, tz: 0,
      state: 'wander', retargetMs: 0, freezeMs: 0, gazeS: 0, noTriggerS: 0,
      shelterS: 0, hitCdMs: 0, bobPhase: rand(0, Math.PI * 2), looking: false,
      mat, sprite,
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
      g.state = 'wander';
      g.gazeS = 0;
      g.noTriggerS = 0;
      g.shelterS = 0;
      g.hitCdMs = 0;
      g.looking = false;
      g.mat.opacity = 0;
      g.sprite.visible = true;
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

  function passo(dt: number) {
    bobT += dt;
    const night = isNight();

    if (!night && materialized) {
      let anyVisible = false;
      for (const g of ghosts) {
        if (g.state === 'chase') stopChase(g, false);
        g.mat.opacity = Math.max(0, g.mat.opacity - dt * 0.7);
        g.y += dt * 1.5;
        g.sprite.position.set(g.x, g.y + Math.sin(bobT * 2.6 + g.bobPhase) * 0.16, g.z);
        if (g.mat.opacity > 0.01) anyVisible = true;
        else g.sprite.visible = false;
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
      if (!g.sprite.visible) continue;
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

      const showFront = g.state === 'chase' || g.looking;
      const wantTex = showFront ? texFront : texBack;
      if (g.mat.map !== wantTex) {
        g.mat.map = wantTex;
        g.mat.needsUpdate = true;
      }

      const targetY = g.state === 'chase' ? Math.max(hoverY(g.x, g.z), eyeY - 0.4) : hoverY(g.x, g.z);
      g.y += (targetY - g.y) * Math.min(1, dt * 3);
      const pulse = 1 + Math.sin(bobT * 3.1 + g.bobPhase) * 0.03;
      g.sprite.scale.set(1.7 * pulse, 2.55 * pulse, 1);
      g.sprite.position.set(g.x, g.y + Math.sin(bobT * 2.6 + g.bobPhase) * 0.16, g.z);
    }
  }

  return {
    nascer() {
      materialized = false;
      toldOnce = false;
      for (const g of ghosts) {
        g.state = 'wander';
        g.sprite.visible = false;
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
    ativo: () => ghosts.some((g) => g.state === 'chase' && g.sprite.visible),
    fantasmas: () =>
      ghosts
        .filter((g) => g.sprite.visible)
        .map((g) => ({ x: g.x, y: g.y, z: g.z, cacando: g.state === 'chase', olhando: g.looking })),
    limpar() {
      materialized = false;
      for (const g of ghosts) g.sprite.visible = false;
    },
  };
}
