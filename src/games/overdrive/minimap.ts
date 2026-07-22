import { createMinimapView } from '../../lib/minimap-view';
import type { Ctx, Minimap } from './types';

export function createMinimap(ctx: Ctx): Minimap {
  const T = ctx.cfg.mundo.tamanho;
  const HALF = T / 2;
  const terrain = document.createElement('canvas');
  ctx.city.paintMap(terrain);
  const s = terrain.width / T;

  const hud = ctx.ui.els.minimap as HTMLCanvasElement;
  const view = createMinimapView({
    terrain,
    hud,
    big: ctx.ui.els.mapCanvas as HTMLCanvasElement,
    panel: ctx.ui.els.mapPanel,
    worldToMap: (x, z) => [(x + HALF) * s, (z + HALF) * s],
    mapToWorldScale: s,
    view: 230,
    markers(g, project, pxPerUnit, isBig) {
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      for (const m of ctx.map.marcos) {
        const [px, py] = project(m.x, m.z);
        if (px < -8 || py < -8 || px > g.canvas.width + 8 || py > g.canvas.height + 8) continue;
        if (isBig) {
          g.font = '12px sans-serif';
          g.fillText(m.emoji, px, py);
          g.font = '700 10px Oxanium, Verdana, sans-serif';
          g.lineWidth = 3;
          g.strokeStyle = 'rgba(4, 6, 16, 0.9)';
          g.strokeText(m.nome, px, py + 11);
          g.fillStyle = '#e8ecf8';
          g.fillText(m.nome, px, py + 11);
        } else {
          g.font = '11px sans-serif';
          g.fillText(m.emoji, px, py);
        }
      }
      const car = ctx.car.state;
      const [cx, cy] = project(car.x, car.z);
      const size = isBig ? 8 : 6;
      g.save();
      g.translate(cx, cy);
      g.rotate(-car.heading);
      g.beginPath();
      g.moveTo(0, -size);
      g.lineTo(size * 0.72, size);
      g.lineTo(0, size * 0.45);
      g.lineTo(-size * 0.72, size);
      g.closePath();
      g.fillStyle = '#ffd23f';
      g.fill();
      g.lineWidth = Math.max(1, size * 0.22);
      g.strokeStyle = 'rgba(10, 12, 20, 0.9)';
      g.stroke();
      g.restore();
    },
    onToggle(open) {
      ctx.audio.ui();
      ctx.ui.announce(open ? 'Mapa de São Leopoldo aberto. O triângulo amarelo é você.' : 'Mapa fechado.');
    },
  });

  ctx.ui.els.mapClose.addEventListener('click', () => view.toggleMap());
  hud.addEventListener('click', () => view.toggleMap());

  return {
    step(dtMs) {
      if (hud.hidden) return;
      view.step(ctx.car.state.x, ctx.car.state.z, dtMs);
    },
    toggleMap: () => view.toggleMap(),
    mapOpen: () => view.mapOpen(),
  };
}
