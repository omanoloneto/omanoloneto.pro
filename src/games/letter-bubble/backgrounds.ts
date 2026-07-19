import { mulberry32 } from '../../lib/rng';
import type { TemaBg } from '../../data/bolhas-de-letras';

export interface Background {
  tema: TemaBg;
  update(dt: number, reduced: boolean): void;
  draw(g: CanvasRenderingContext2D, W: number, H: number): void;
}

type Star = { x: number; y: number; r: number; fase: number; camada: number };
type Drifter = { x: number; y: number; r: number; vy: number; wob: number; fase: number; alpha: number };
type Cloud = { x: number; y: number; s: number; v: number };

function criarGalaxy(seed: number): Background {
  const rng = mulberry32(seed);
  let t = 0;
  const estrelas: Star[] = Array.from({ length: 90 }, () => ({
    x: rng(),
    y: rng(),
    r: 0.5 + rng() * 1.6,
    fase: rng() * Math.PI * 2,
    camada: Math.floor(rng() * 3),
  }));
  const nebulas = Array.from({ length: 2 }, () => ({
    x: rng(),
    y: 0.2 + rng() * 0.5,
    r: 0.35 + rng() * 0.25,
    cor: rng() < 0.5 ? '120,80,200' : '200,80,150',
    vx: (rng() - 0.5) * 0.008,
  }));
  let shootT = 2 + rng() * 4;
  let shoot = { x: 0, y: 0, vida: 0 };
  return {
    tema: 'galaxy',
    update(dt, reduced) {
      if (reduced) return;
      t += dt;
      for (const n of nebulas) {
        n.x += n.vx * dt;
        if (n.x < -0.3) n.x = 1.3;
        if (n.x > 1.3) n.x = -0.3;
      }
      shootT -= dt;
      if (shootT <= 0 && shoot.vida <= 0) {
        shoot = { x: rng() * 0.7, y: rng() * 0.4, vida: 0.9 };
        shootT = 4 + rng() * 6;
      }
      if (shoot.vida > 0) shoot.vida -= dt;
    },
    draw(g, W, H) {
      const grad = g.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#0e1030');
      grad.addColorStop(0.6, '#171a44');
      grad.addColorStop(1, '#241a4d');
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);
      for (const n of nebulas) {
        const rg = g.createRadialGradient(n.x * W, n.y * H, 0, n.x * W, n.y * H, n.r * W);
        rg.addColorStop(0, 'rgba(' + n.cor + ',0.22)');
        rg.addColorStop(1, 'rgba(' + n.cor + ',0)');
        g.fillStyle = rg;
        g.fillRect(0, 0, W, H);
      }
      for (const s of estrelas) {
        const drift = (t * (2 + s.camada * 3)) % (H + 8);
        const y = ((s.y * H + drift) % (H + 8));
        const tw = 0.5 + 0.5 * Math.sin(t * 2 + s.fase);
        g.globalAlpha = 0.35 + tw * 0.6;
        g.fillStyle = '#fdfdff';
        g.beginPath();
        g.arc(s.x * W, y, s.r, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      if (shoot.vida > 0) {
        const p = 1 - shoot.vida / 0.9;
        const x = shoot.x * W + p * 120;
        const y = shoot.y * H + p * 80;
        g.strokeStyle = 'rgba(255,255,255,' + (shoot.vida) + ')';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x - 34, y - 22);
        g.stroke();
      }
    },
  };
}

function criarOcean(seed: number): Background {
  const rng = mulberry32(seed);
  let t = 0;
  const bolhas: Drifter[] = Array.from({ length: 22 }, () => ({
    x: rng(),
    y: rng(),
    r: 2 + rng() * 6,
    vy: 0.02 + rng() * 0.05,
    wob: 0.4 + rng() * 0.9,
    fase: rng() * Math.PI * 2,
    alpha: 0.15 + rng() * 0.25,
  }));
  return {
    tema: 'ocean',
    update(dt, reduced) {
      if (reduced) return;
      t += dt;
      for (const b of bolhas) {
        b.y -= b.vy * dt;
        if (b.y < -0.05) {
          b.y = 1.05;
          b.x = rng();
        }
      }
    },
    draw(g, W, H) {
      const grad = g.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#2fb6c9');
      grad.addColorStop(0.55, '#1f7fb0');
      grad.addColorStop(1, '#14507f');
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);
      g.save();
      g.globalAlpha = 0.12;
      g.fillStyle = '#eaffff';
      for (let i = 0; i < 3; i++) {
        const x = (0.2 + i * 0.3) * W + Math.sin(t * 0.3 + i) * 20;
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x + 60, 0);
        g.lineTo(x + 180, H);
        g.lineTo(x + 120, H);
        g.closePath();
        g.fill();
      }
      g.restore();
      g.save();
      g.strokeStyle = 'rgba(220,250,255,0.16)';
      g.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const y = (i / 5) * H + ((t * 12) % (H / 5));
        g.beginPath();
        for (let x = 0; x <= W; x += 12) {
          g.lineTo(x, y + Math.sin(x / 30 + t + i) * 6);
        }
        g.stroke();
      }
      g.restore();
      for (const b of bolhas) {
        g.globalAlpha = b.alpha;
        g.strokeStyle = '#eafeff';
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(b.x * W + Math.sin(t * b.wob + b.fase) * 8, b.y * H, b.r, 0, Math.PI * 2);
        g.stroke();
      }
      g.globalAlpha = 1;
    },
  };
}

function criarWind(seed: number): Background {
  const rng = mulberry32(seed);
  let t = 0;
  const nuvens: Cloud[] = Array.from({ length: 5 }, () => ({
    x: rng(),
    y: 0.08 + rng() * 0.5,
    s: 0.6 + rng() * 0.8,
    v: 0.01 + rng() * 0.02,
  }));
  const folhas: Drifter[] = Array.from({ length: 16 }, () => ({
    x: rng(),
    y: rng(),
    r: 2 + rng() * 3,
    vy: 0.015 + rng() * 0.03,
    wob: 0.6 + rng() * 1.1,
    fase: rng() * Math.PI * 2,
    alpha: 0.5 + rng() * 0.4,
  }));
  function nuvem(g: CanvasRenderingContext2D, x: number, y: number, s: number) {
    g.beginPath();
    for (const [dx, dy, r] of [[0, 0, 26], [22, 6, 20], [-22, 6, 20], [10, -8, 18], [-10, -8, 18]] as Array<[number, number, number]>) {
      g.moveTo(x + dx * s + r * s, y + dy * s);
      g.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
    }
    g.fill();
  }
  return {
    tema: 'wind',
    update(dt, reduced) {
      if (reduced) return;
      t += dt;
      for (const n of nuvens) {
        n.x += n.v * dt;
        if (n.x > 1.25) n.x = -0.25;
      }
      for (const f of folhas) {
        f.x += Math.cos(t * f.wob + f.fase) * 0.02 * dt + 0.03 * dt;
        f.y += f.vy * dt;
        if (f.y > 1.05) {
          f.y = -0.05;
          f.x = rng();
        }
        if (f.x > 1.05) f.x = -0.05;
      }
    },
    draw(g, W, H) {
      const grad = g.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#8fd0f0');
      grad.addColorStop(0.6, '#b6e3f6');
      grad.addColorStop(1, '#dff3fb');
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,255,255,0.85)';
      for (const n of nuvens) nuvem(g, n.x * W, n.y * H, n.s);
      for (const f of folhas) {
        g.globalAlpha = f.alpha;
        g.fillStyle = '#e7b24a';
        g.save();
        g.translate(f.x * W, f.y * H);
        g.rotate(t * f.wob + f.fase);
        g.beginPath();
        g.ellipse(0, 0, f.r * 1.6, f.r * 0.7, 0, 0, Math.PI * 2);
        g.fill();
        g.restore();
      }
      g.globalAlpha = 1;
    },
  };
}

function criarAurora(seed: number): Background {
  const rng = mulberry32(seed);
  let t = 0;
  const estrelas: Star[] = Array.from({ length: 55 }, () => ({
    x: rng(),
    y: rng() * 0.9,
    r: 0.5 + rng() * 1.2,
    fase: rng() * Math.PI * 2,
    camada: 0,
  }));
  const faixas = Array.from({ length: 3 }, (_, i) => ({
    base: 0.25 + i * 0.16,
    amp: 0.05 + rng() * 0.05,
    vel: 0.3 + rng() * 0.4,
    fase: rng() * Math.PI * 2,
    cor: ['70,220,160', '90,180,240', '200,110,210'][i],
  }));
  return {
    tema: 'aurora',
    update(dt, reduced) {
      if (reduced) return;
      t += dt;
    },
    draw(g, W, H) {
      const grad = g.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#0b1636');
      grad.addColorStop(0.6, '#122048');
      grad.addColorStop(1, '#1b2c55');
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);
      for (const s of estrelas) {
        g.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(t * 1.5 + s.fase));
        g.fillStyle = '#eef2ff';
        g.beginPath();
        g.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      for (const f of faixas) {
        g.beginPath();
        g.moveTo(0, H);
        for (let x = 0; x <= W; x += 10) {
          const y = (f.base + Math.sin(x / 70 + t * f.vel + f.fase) * f.amp) * H;
          g.lineTo(x, y);
        }
        g.lineTo(W, H);
        g.closePath();
        const yg = g.createLinearGradient(0, f.base * H - 60, 0, f.base * H + 90);
        yg.addColorStop(0, 'rgba(' + f.cor + ',0)');
        yg.addColorStop(0.5, 'rgba(' + f.cor + ',0.28)');
        yg.addColorStop(1, 'rgba(' + f.cor + ',0)');
        g.fillStyle = yg;
        g.fill();
      }
    },
  };
}

function criarCandy(seed: number): Background {
  const rng = mulberry32(seed);
  let t = 0;
  const bolhas: Drifter[] = Array.from({ length: 14 }, () => ({
    x: rng(),
    y: rng(),
    r: 10 + rng() * 26,
    vy: 0.012 + rng() * 0.025,
    wob: 0.3 + rng() * 0.7,
    fase: rng() * Math.PI * 2,
    alpha: 0.14 + rng() * 0.16,
  }));
  return {
    tema: 'candy',
    update(dt, reduced) {
      if (reduced) return;
      t += dt;
      for (const b of bolhas) {
        b.y -= b.vy * dt;
        if (b.y < -0.1) {
          b.y = 1.1;
          b.x = rng();
        }
      }
    },
    draw(g, W, H) {
      const h = (t * 8) % 360;
      const grad = g.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, 'hsl(' + h + ',70%,86%)');
      grad.addColorStop(0.5, 'hsl(' + ((h + 60) % 360) + ',72%,84%)');
      grad.addColorStop(1, 'hsl(' + ((h + 130) % 360) + ',70%,86%)');
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);
      for (const b of bolhas) {
        const x = b.x * W + Math.sin(t * b.wob + b.fase) * 12;
        const y = b.y * H;
        const rg = g.createRadialGradient(x - b.r * 0.3, y - b.r * 0.3, b.r * 0.1, x, y, b.r);
        rg.addColorStop(0, 'rgba(255,255,255,' + (b.alpha + 0.25) + ')');
        rg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = rg;
        g.beginPath();
        g.arc(x, y, b.r, 0, Math.PI * 2);
        g.fill();
      }
    },
  };
}

export function criarBackground(tema: TemaBg, seed: number): Background {
  switch (tema) {
    case 'galaxy': return criarGalaxy(seed);
    case 'ocean': return criarOcean(seed);
    case 'wind': return criarWind(seed);
    case 'aurora': return criarAurora(seed);
    case 'candy': return criarCandy(seed);
  }
}
