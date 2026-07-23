import { createMinimapView } from '../../lib/minimap-view';
import type { Ctx, Minimap } from './types';

export function createMinimap(ctx: Ctx): Minimap {
  const T = ctx.cfg.mundo.tamanho;
  const HALF = T / 2;
  const terrain = document.createElement('canvas');
  ctx.city.paintMap(terrain);
  const gpsTerrain = document.createElement('canvas');
  ctx.city.paintMap(gpsTerrain, 'gps');
  const s = terrain.width / T;

  const hud = ctx.ui.els.minimap as HTMLCanvasElement;
  const view = createMinimapView({
    terrain,
    hudTerrain: gpsTerrain,
    hud,
    big: ctx.ui.els.mapCanvas as HTMLCanvasElement,
    panel: ctx.ui.els.mapPanel,
    worldToMap: (x, z) => [(x + HALF) * s, (z + HALF) * s],
    mapToWorldScale: s,
    view: 230,
    rotation: () => ctx.car.state.heading - Math.PI,
    circular: true,
    hudBackground: '#0a0b0d',
    markers(g, project, pxPerUnit, isBig, rotation) {
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const car = ctx.car.state;
      const [cx, cy] = project(car.x, car.z);
      const size = isBig ? 8 : 7;
      g.save();
      g.translate(cx, cy);
      g.rotate(Math.PI - car.heading + rotation);
      g.beginPath();
      g.moveTo(0, -size);
      g.lineTo(size * 0.72, size);
      g.lineTo(0, size * 0.45);
      g.lineTo(-size * 0.72, size);
      g.closePath();
      g.fillStyle = isBig ? '#ffd23f' : '#41e25e';
      g.fill();
      g.lineWidth = Math.max(1, size * 0.22);
      g.strokeStyle = isBig ? 'rgba(10, 12, 20, 0.9)' : 'rgba(6, 18, 10, 0.9)';
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
      if (ctx.ui.els.gps.hidden) return;
      view.step(ctx.car.state.x, ctx.car.state.z, dtMs);
    },
    toggleMap: () => view.toggleMap(),
    mapOpen: () => view.mapOpen(),
  };
}
