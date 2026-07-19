import { config, letters } from '../../data/bolhas-de-letras';
import type { Board } from './board';
import type { Bubble, FloatText } from './tipos';

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
  ativa?: Bubble | null;
  pulseT: number;
}

export function criarRender(canvas: HTMLCanvasElement) {
  const g = canvas.getContext('2d')!;
  const W = config.canvasW;
  const H = config.canvasH;
  canvas.width = W;
  canvas.height = H;

  function bolha(x: number, y: number, r: number, letterId: string, lower: boolean, useColors: boolean, escala = 1, alfa = 1, aro?: string) {
    g.save();
    g.globalAlpha = alfa;
    g.translate(x, y);
    g.scale(escala, escala);
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
    g.save();
    g.fillStyle = 'rgba(255,255,255,0.75)';
    for (let i = 0; i < 220; i++) {
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
      if (bateu) break;
      if (i % 3 === 0) {
        g.beginPath();
        g.arc(x, y, 3, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.restore();
  }

  function render(s: RenderState) {
    const r = s.board.radius;
    const ceu = g.createLinearGradient(0, 0, 0, H);
    ceu.addColorStop(0, '#8ec9ef');
    ceu.addColorStop(0.65, '#bfe3f7');
    ceu.addColorStop(1, '#e3f3fc');
    g.fillStyle = ceu;
    g.fillRect(0, 0, W, H);

    g.fillStyle = 'rgba(30,50,80,0.25)';
    g.fillRect(0, 0, W, 40);

    g.save();
    g.setLineDash([10, 8]);
    g.strokeStyle = 'rgba(226,88,110,0.55)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(10, config.dangerY);
    g.lineTo(W - 10, config.dangerY);
    g.stroke();
    g.restore();

    if (s.current && s.fase !== 'teclado') guia(s);

    for (const b of s.board.bubbles) {
      const p = s.board.posDe(b);
      let escala = 1;
      let alfa = 1;
      let dx = 0;
      if (b.popT > 0) {
        const t = Math.min(1, b.popT / config.popMs);
        escala = 1 + t * 0.45;
        alfa = 1 - t;
      }
      if (b.shakeT > 0) dx = Math.sin(b.shakeT / 26) * 3.2;
      let aro: string | undefined;
      let extra = 1;
      if (s.ativa === b) {
        aro = '#ffb520';
        extra = 1 + Math.sin(s.pulseT / 180) * 0.07;
      }
      bolha(p.x + dx, p.y, r, b.letterId, b.lower, s.useColors, escala * extra, alfa, aro);
      if (aro) {
        g.save();
        g.lineWidth = 4;
        g.strokeStyle = 'rgba(255,181,32,0.85)';
        g.beginPath();
        g.arc(p.x, p.y, r + 4 + Math.sin(s.pulseT / 180) * 2, 0, Math.PI * 2);
        g.stroke();
        g.restore();
      }
    }

    if (s.proj) bolha(s.proj.x, s.proj.y, r, s.proj.letterId, s.proj.lower, s.useColors);

    if (s.current && s.fase !== 'teclado') {
      const lx = W / 2;
      const ly = config.launcherY;
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
      bolha(lx, ly - r * 0.1, r, s.current.letterId, s.current.lower, s.useColors);
    }

    for (const f of s.floats) {
      const t = f.t / config.feedbackMs;
      g.save();
      g.globalAlpha = 1 - t;
      g.font = '700 30px Andika, sans-serif';
      g.textAlign = 'center';
      g.lineWidth = 5;
      g.strokeStyle = 'rgba(255,255,255,0.95)';
      g.strokeText(f.texto, f.x, f.y - t * 46);
      g.fillStyle = f.cor;
      g.fillText(f.texto, f.x, f.y - t * 46);
      g.restore();
    }
  }

  return { render };
}
