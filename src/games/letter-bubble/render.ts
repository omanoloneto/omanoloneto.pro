import { config, letters } from '../../data/bolhas-de-letras';
import type { Board } from './board';
import type { Background } from './backgrounds';
import type { Bubble, FloatText, Particle } from './tipos';

const corDe = new Map<string, string>();
for (const l of letters) if (l.easyColor) corDe.set(l.id, l.easyColor);

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  letterId: string;
  lower: boolean;
  bounces: number;
  trail: Array<{ x: number; y: number }>;
}

export interface RenderState {
  board: Board;
  fase: string;
  useColors: boolean;
  aimAngle: number;
  guideBounces: number;
  current: { letterId: string; lower: boolean } | null;
  proj: Projectile | null;
  floats: FloatText[];
  particles: Particle[];
  bg: Background;
  shakeX: number;
  shakeY: number;
  recoil: number;
  reduced: boolean;
  ativa?: Bubble | null;
  pulseT: number;
  perigo: number;
}

export function criarRender(canvas: HTMLCanvasElement) {
  const g = canvas.getContext('2d')!;
  const W = config.canvasW;
  const H = config.canvasH;
  canvas.width = W;
  canvas.height = H;

  function bolha(x: number, y: number, r: number, letterId: string, lower: boolean, useColors: boolean, ex = 1, ey = 1, alfa = 1, aro?: string) {
    g.save();
    g.globalAlpha = alfa;
    g.translate(x, y);
    g.scale(ex, ey);
    const cor = useColors ? corDe.get(letterId) || config.neutralFill : config.neutralFill;
    const grad = g.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.2, 0, 0, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.25, cor);
    grad.addColorStop(1, cor);
    g.fillStyle = grad;
    g.beginPath();
    g.arc(0, 0, r - 1, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 3;
    g.strokeStyle = aro || (useColors ? 'rgba(30,40,60,0.35)' : config.neutralBorder);
    g.stroke();
    g.globalAlpha = alfa * 0.5;
    g.fillStyle = 'rgba(255,255,255,0.7)';
    g.beginPath();
    g.ellipse(-r * 0.32, -r * 0.38, r * 0.26, r * 0.16, -0.5, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = alfa;
    const ch = lower ? letterId.toLowerCase() : letterId;
    g.font = '700 ' + Math.round(r * 1.14) + 'px Andika, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 4;
    g.strokeStyle = 'rgba(255,255,255,0.9)';
    g.strokeText(ch, 0, r * 0.06);
    g.fillStyle = config.letterInk;
    g.fillText(ch, 0, r * 0.06);
    g.restore();
  }

  function guia(s: RenderState) {
    const r = s.board.radius;
    let x = W / 2;
    let y = config.launcherY - r * 2.4;
    let vx = Math.sin(s.aimAngle);
    let vy = -Math.cos(s.aimAngle);
    let bounces = 0;
    const passo = 9;
    let fim = { x, y };
    const marcha = s.reduced ? 0 : (s.pulseT / 34) % 3;
    g.save();
    g.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 240; i++) {
      x += vx * passo;
      y += vy * passo;
      if (x < r || x > W - r) {
        vx = -vx;
        bounces++;
        if (bounces > s.guideBounces) break;
        x = Math.max(r, Math.min(W - r, x));
      }
      if (y < 40) break;
      let bateu = false;
      for (const b of s.board.alive()) {
        const p = s.board.posDe(b);
        if (Math.hypot(p.x - x, p.y - y) < r * 1.7) {
          bateu = true;
          break;
        }
      }
      fim = { x, y };
      if (bateu) break;
      if ((i + marcha) % 3 < 1) {
        g.beginPath();
        g.arc(x, y, 3, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.restore();
    g.save();
    g.strokeStyle = 'rgba(255,255,255,0.85)';
    g.lineWidth = 2.5;
    const rr = r * 0.7 + (s.reduced ? 0 : Math.sin(s.pulseT / 150) * 2.5);
    g.beginPath();
    g.arc(fim.x, fim.y, rr, 0, Math.PI * 2);
    g.stroke();
    g.restore();
  }

  function particula(p: Particle) {
    const k = p.life / p.maxLife;
    if (p.kind === 'ring') {
      g.save();
      g.globalAlpha = k * 0.7;
      g.strokeStyle = p.cor;
      g.lineWidth = 3 * k + 1;
      g.beginPath();
      g.arc(p.x, p.y, (1 - k) * p.r, 0, Math.PI * 2);
      g.stroke();
      g.restore();
      return;
    }
    g.save();
    g.globalAlpha = Math.min(1, k * 1.4);
    g.fillStyle = p.cor;
    if (p.kind === 'confete') {
      g.translate(p.x, p.y);
      g.rotate(p.ang);
      g.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r);
    } else {
      g.beginPath();
      g.arc(p.x, p.y, p.r * (p.kind === 'trail' ? k : 1), 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }

  function render(s: RenderState) {
    const r = s.board.radius;
    s.bg.draw(g, W, H);

    g.save();
    g.setLineDash([10, 8]);
    const perigo = s.perigo;
    const glow = s.reduced ? perigo : perigo * (0.6 + 0.4 * Math.sin(s.pulseT / 120));
    g.strokeStyle = 'rgba(226,88,110,' + (0.4 + glow * 0.55) + ')';
    g.lineWidth = 2 + glow * 2;
    g.beginPath();
    g.moveTo(10, config.dangerY);
    g.lineTo(W - 10, config.dangerY);
    g.stroke();
    g.restore();

    g.save();
    g.translate(s.shakeX, s.shakeY);

    if (s.current && s.fase !== 'teclado') guia(s);

    for (const b of s.board.bubbles) {
      const p = s.board.posDe(b);
      let ex = 1;
      let ey = 1;
      let alfa = 1;
      let dx = 0;
      if (b.popT > 0) {
        const t = Math.min(1, b.popT / config.popMs);
        ex = ey = 1 + t * 0.45;
        alfa = 1 - t;
      } else if (b.settleT > 0) {
        const t = b.settleT / config.settleMs;
        const q = Math.sin(t * Math.PI * 2) * t * 0.18;
        ex = 1 + q;
        ey = 1 - q;
      }
      if (b.shakeT > 0) dx = Math.sin(b.shakeT / 26) * 3.2;
      let aro: string | undefined;
      let extra = 1;
      if (s.ativa === b) {
        aro = '#ffb520';
        extra = 1 + (s.reduced ? 0 : Math.sin(s.pulseT / 180) * 0.07);
      }
      bolha(p.x + dx, p.y, r, b.letterId, b.lower, s.useColors, ex * extra, ey * extra, alfa, aro);
      if (aro) {
        g.save();
        g.lineWidth = 4;
        g.strokeStyle = 'rgba(255,181,32,0.85)';
        g.beginPath();
        g.arc(p.x, p.y, r + 4 + (s.reduced ? 0 : Math.sin(s.pulseT / 180) * 2), 0, Math.PI * 2);
        g.stroke();
        g.restore();
      }
    }

    if (s.proj) {
      for (let i = 0; i < s.proj.trail.length; i++) {
        const tp = s.proj.trail[i];
        const a = (i / s.proj.trail.length) * 0.4;
        g.save();
        g.globalAlpha = a;
        g.fillStyle = s.useColors ? corDe.get(s.proj.letterId) || '#fff' : '#dfe8f5';
        g.beginPath();
        g.arc(tp.x, tp.y, r * (0.4 + a), 0, Math.PI * 2);
        g.fill();
        g.restore();
      }
      bolha(s.proj.x, s.proj.y, r, s.proj.letterId, s.proj.lower, s.useColors);
    }

    if (s.current && s.fase !== 'teclado') {
      const lx = W / 2;
      const ly = config.launcherY + s.recoil * r * 0.5;
      g.save();
      g.translate(lx, ly);
      g.rotate(s.aimAngle);
      g.fillStyle = '#3d5a80';
      g.beginPath();
      g.moveTo(-r * 0.55, r * 0.9);
      g.lineTo(r * 0.55, r * 0.9);
      g.lineTo(r * 0.32, -r * 1.5);
      g.lineTo(-r * 0.32, -r * 1.5);
      g.closePath();
      g.fill();
      g.restore();
      const sq = 1 - s.recoil * 0.25;
      bolha(lx, ly - r * 0.1, r, s.current.letterId, s.current.lower, s.useColors, 1 / sq, sq);
    }

    for (const p of s.particles) particula(p);

    for (const f of s.floats) {
      const t = f.t / config.feedbackMs;
      const pop = f.grande ? 1 + Math.max(0, 0.4 - t * 2) * (t < 0.2 ? 1 : 0) : 1;
      const sc = f.grande ? (t < 0.16 ? 0.4 + (t / 0.16) * 0.7 : 1.1 - (t - 0.16) * 0.1) : 1;
      g.save();
      g.globalAlpha = 1 - t;
      g.translate(f.x, f.y - t * 46);
      g.scale(sc * pop, sc * pop);
      g.font = '700 ' + (f.grande ? 34 : 30) + 'px Andika, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineWidth = 5;
      g.strokeStyle = 'rgba(255,255,255,0.95)';
      g.strokeText(f.texto, 0, 0);
      g.fillStyle = f.cor;
      g.fillText(f.texto, 0, 0);
      g.restore();
    }

    g.restore();
  }

  return { render };
}
