import * as THREE from 'three';
import type { Contexto, Kotsooh } from './tipos';

const NIGHT_START = 900;

function drawGhost(g: CanvasRenderingContext2D) {
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

export function criarKotsooh(ctx: Contexto): Kotsooh {
  const K = ctx.cfg.kotsooh;
  const { SX, SZ, SY, nivelAgua } = ctx.cfg.mundo;

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 96;
  drawGhost(canvas.getContext('2d')!);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.7, 2.55, 1);
  sprite.renderOrder = 3;
  sprite.visible = false;
  ctx.scene.add(sprite);

  function rand(a: number, b: number) {
    return a + Math.random() * (b - a);
  }

  let state: 'hidden' | 'chasing' | 'leaving' = 'hidden';
  let gx = 0;
  let gy = 0;
  let gz = 0;
  let waitS = rand(K.esperaMinS, K.esperaMaxS);
  let nightFresh = true;
  let shelterS = 0;
  let hitCooldownMs = 0;
  let howlMs = 0;
  let leaveT = 0;
  let toldOnce = false;
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

  function aparecer(): boolean {
    const j = ctx.jogador;
    for (let t = 0; t < 14; t++) {
      const ang = Math.random() * Math.PI * 2;
      const x = Math.max(2, Math.min(SX - 2, j.x + Math.cos(ang) * K.distSpawn));
      const z = Math.max(2, Math.min(SZ - 2, j.z + Math.sin(ang) * K.distSpawn));
      const y = hoverY(x, z);
      if (isCovered(x, y, z)) continue;
      gx = x;
      gy = y + 1.5;
      gz = z;
      state = 'chasing';
      shelterS = 0;
      hitCooldownMs = 0;
      howlMs = rand(K.uivoMinMs, K.uivoMaxMs);
      mat.opacity = 0;
      sprite.visible = true;
      ctx.audio.somFantasma();
      if (!toldOnce) {
        toldOnce = true;
        ctx.ui.mostrarToast('👻 O Kotsooh acordou! Corre pra um lugar com teto!', 'err', 3400);
      }
      ctx.ui.anunciar('O fantasma Kotsooh apareceu! Se esconda embaixo de um teto.');
      return true;
    }
    return false;
  }

  function dismiss(msg?: string) {
    state = 'leaving';
    leaveT = 0;
    if (msg) ctx.ui.mostrarToast(msg, 'ok', 3000);
  }

  function passo(dt: number) {
    bobT += dt;
    hitCooldownMs = Math.max(0, hitCooldownMs - dt * 1000);

    if (state === 'hidden') {
      if (!isNight()) {
        nightFresh = true;
        return;
      }
      if (nightFresh) {
        nightFresh = false;
        waitS = rand(K.esperaMinS, K.esperaMaxS);
      }
      if (playerCovered()) return;
      waitS -= dt;
      if (waitS <= 0 && !aparecer()) waitS = 3;
      return;
    }

    if (state === 'leaving') {
      leaveT += dt;
      gy += dt * 2.2;
      mat.opacity = Math.max(0, 0.92 - leaveT * 0.7);
      sprite.position.set(gx, gy + Math.sin(bobT * 2.6) * 0.16, gz);
      if (leaveT >= 1.4) {
        state = 'hidden';
        sprite.visible = false;
        waitS = rand(K.retornoMinS, K.retornoMaxS);
        nightFresh = false;
      }
      return;
    }

    if (!isNight()) {
      dismiss();
      return;
    }
    const j = ctx.jogador;
    const abrigado = playerCovered();
    if (abrigado) {
      shelterS += dt;
      if (shelterS >= K.abrigoS) {
        dismiss('👻 O Kotsooh desistiu — lugar com teto é seguro!');
        return;
      }
    } else {
      shelterS = 0;
    }

    mat.opacity = Math.min(0.92, mat.opacity + dt * 0.8);

    const px = j.x;
    const py = j.y + 1.1;
    const pz = j.z;
    const dx = px - gx;
    const dz = pz - gz;
    const distH = Math.hypot(dx, dz);
    if (distH > 0.15 && !abrigado) {
      const step = K.vel * dt;
      let nx = gx + (dx / distH) * Math.min(step, distH);
      let nz = gz + (dz / distH) * Math.min(step, distH);
      if (isCovered(nx, hoverY(nx, nz), nz)) {
        const sx = gx + (-dz / distH) * step;
        const sz = gz + (dx / distH) * step;
        if (!isCovered(sx, hoverY(sx, sz), sz)) {
          nx = sx;
          nz = sz;
        } else {
          nx = gx;
          nz = gz;
        }
      }
      gx = nx;
      gz = nz;
    }
    const targetY = Math.max(hoverY(gx, gz), py + 0.4);
    gy += (targetY - gy) * Math.min(1, dt * 3);

    howlMs -= dt * 1000;
    if (howlMs <= 0) {
      howlMs = rand(K.uivoMinMs, K.uivoMaxMs);
      ctx.audio.somFantasma();
    }

    const dist3 = Math.hypot(px - gx, py - gy, pz - gz);
    if (dist3 < K.alcanceBatida && hitCooldownMs <= 0 && !abrigado) {
      hitCooldownMs = K.cooldownBatidaMs;
      const n = Math.max(0.001, distH);
      ctx.fisica.empurrar((dx / n) * K.empurrao, (dz / n) * K.empurrao);
      j.vy = Math.max(j.vy, K.pulinho);
      ctx.ui.flashSusto();
      ctx.audio.somSusto();
      ctx.ui.anunciar('O Kotsooh te assustou!');
    }

    const pulse = 1 + Math.sin(bobT * 3.1) * 0.03;
    sprite.scale.set(1.7 * pulse, 2.55 * pulse, 1);
    sprite.position.set(gx, gy + Math.sin(bobT * 2.6) * 0.16, gz);
  }

  return {
    nascer() {
      state = 'hidden';
      sprite.visible = false;
      mat.opacity = 0;
      toldOnce = false;
      nightFresh = true;
      waitS = rand(K.esperaMinS, K.esperaMaxS);
    },
    passo,
    aparecer,
    ativo: () => state === 'chasing',
    posicao: () => (state === 'hidden' ? null : { x: gx, y: gy, z: gz }),
    limpar() {
      state = 'hidden';
      sprite.visible = false;
    },
  };
}
