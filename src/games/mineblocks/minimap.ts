import type { Ctx, Minimap } from './types';

const COLOR_TABLE: Record<number, [number, number, number]> = {
  1: [106, 190, 92],
  2: [134, 96, 67],
  3: [138, 138, 142],
  4: [226, 210, 154],
  5: [110, 85, 55],
  6: [186, 148, 92],
  7: [64, 142, 52],
  8: [223, 243, 255],
  9: [168, 78, 60],
  10: [126, 126, 128],
  11: [255, 210, 63],
  12: [224, 74, 58],
  13: [58, 120, 214],
  14: [70, 70, 74],
  15: [63, 143, 55],
  16: [64, 142, 52],
  17: [150, 104, 58],
  18: [150, 110, 66],
  19: [138, 100, 56],
  20: [185, 138, 78],
  21: [245, 168, 207],
  22: [90, 90, 96],
  25: [160, 122, 100],
  27: [110, 110, 116],
  29: [138, 140, 146],
  34: [58, 110, 165],
  35: [201, 149, 90],
  37: [64, 142, 52],
  38: [150, 130, 70],
  41: [200, 50, 45],
  42: [200, 50, 45],
};

export function createMinimap(ctx: Ctx): Minimap {
  const { SX, SZ, SY } = ctx.cfg.mundo;
  const world = ctx.world;
  const VIEW = 96;
  const SWEEP_COLS = 1536;

  const colors = new Uint8ClampedArray(ctx.blocks.length * 3);
  for (let i = 0; i < ctx.blocks.length; i++) {
    const c = COLOR_TABLE[i] || [120, 120, 120];
    colors[i * 3] = c[0];
    colors[i * 3 + 1] = c[1];
    colors[i * 3 + 2] = c[2];
  }

  const terrain = document.createElement('canvas');
  terrain.width = SX;
  terrain.height = SZ;
  const tg = terrain.getContext('2d')!;
  const img = tg.createImageData(SX, SZ);
  let sweep = 0;

  function paintColumn(x: number, z: number) {
    let y = SY - 1;
    let id = 0;
    for (; y >= 1; y--) {
      id = world.get(x, y, z);
      if (id !== 0) break;
    }
    const o = (x + z * SX) * 4;
    const shade = 0.68 + 0.32 * Math.min(1, y / 64);
    img.data[o] = colors[id * 3] * shade;
    img.data[o + 1] = colors[id * 3 + 1] * shade;
    img.data[o + 2] = colors[id * 3 + 2] * shade;
    img.data[o + 3] = 255;
  }

  function repaintAll() {
    for (let z = 0; z < SZ; z++) for (let x = 0; x < SX; x++) paintColumn(x, z);
    tg.putImageData(img, 0, 0);
    sweep = 0;
    boxesMs = -1e9;
  }

  const hud = ctx.ui.els.minimap as HTMLCanvasElement;
  const hg = hud.getContext('2d')!;
  const mapPanel = ctx.ui.els.mapPanel;
  const mapCanvas = ctx.ui.els.mapCanvas as HTMLCanvasElement;
  const mg = mapCanvas.getContext('2d')!;

  let boxes: Array<[number, number]> = [];
  let boxesMs = -1e9;
  let mapMs = -1e9;
  let timeMs = 0;

  function refreshBoxes() {
    boxes = [];
    for (const [ck, m] of ctx.metas.all()) {
      if (m.tipo !== 'caixa') continue;
      if (!ctx.editing.canUse(m.dono)) continue;
      boxes.push([ck % SX, Math.floor(ck / SX) % SZ]);
    }
  }

  function arrow(g: CanvasRenderingContext2D, x: number, y: number, ang: number, size: number) {
    g.save();
    g.translate(x, y);
    g.rotate(ang);
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
  }

  function dot(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fillStyle = '#ffffff';
    g.fill();
    g.lineWidth = 1;
    g.strokeStyle = 'rgba(10, 12, 20, 0.9)';
    g.stroke();
  }

  function drawHud() {
    const p = ctx.player;
    const vx = Math.max(0, Math.min(SX - VIEW, p.x - VIEW / 2));
    const vz = Math.max(0, Math.min(SZ - VIEW, p.z - VIEW / 2));
    const s = hud.width / VIEW;
    hg.imageSmoothingEnabled = false;
    hg.clearRect(0, 0, hud.width, hud.height);
    hg.drawImage(terrain, vx, vz, VIEW, VIEW, 0, 0, hud.width, hud.height);
    hg.font = '10px sans-serif';
    hg.textAlign = 'center';
    hg.textBaseline = 'middle';
    for (const [bx, bz] of boxes) {
      const x = (bx + 0.5 - vx) * s;
      const y = (bz + 0.5 - vz) * s;
      if (x < -6 || y < -6 || x > hud.width + 6 || y > hud.height + 6) continue;
      hg.fillText('🏠', x, y);
    }
    for (const r of ctx.avatars.list()) {
      const x = (r.x - vx) * s;
      const y = (r.z - vz) * s;
      if (x < 0 || y < 0 || x > hud.width || y > hud.height) continue;
      dot(hg, x, y, 2.6);
    }
    arrow(hg, (p.x - vx) * s, (p.z - vz) * s, -p.yaw, 5);
  }

  function drawMap() {
    const p = ctx.player;
    mg.imageSmoothingEnabled = false;
    mg.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
    mg.drawImage(terrain, 0, 0);
    mg.textAlign = 'center';
    mg.textBaseline = 'middle';
    mg.font = '12px sans-serif';
    for (const [bx, bz] of boxes) mg.fillText('🏠', bx + 0.5, bz + 0.5);
    mg.font = '700 9px Oxanium, Verdana, sans-serif';
    for (const r of ctx.avatars.list()) {
      dot(mg, r.x, r.z, 3);
      mg.lineWidth = 3;
      mg.strokeStyle = 'rgba(10, 12, 20, 0.85)';
      mg.strokeText(r.nome, r.x, r.z - 8);
      mg.fillStyle = '#ffffff';
      mg.fillText(r.nome, r.x, r.z - 8);
    }
    arrow(mg, p.x, p.z, -p.yaw, 7);
  }

  function mapOpen(): boolean {
    return !mapPanel.hidden;
  }

  function toggleMap() {
    if (ctx.state.phase !== 'playing') return;
    if (mapOpen()) {
      mapPanel.hidden = true;
      ctx.lock.request();
      ctx.audio.soundUI();
      ctx.ui.announce('Mapa fechado.');
      return;
    }
    let guard = 0;
    while (ctx.ui.closeTopPanel() && guard++ < 8);
    refreshBoxes();
    drawMap();
    mapPanel.hidden = false;
    ctx.flow.releaseInputs();
    ctx.lock.release();
    ctx.audio.soundUI();
    ctx.ui.announce('Mapa aberto. O triângulo amarelo é você.');
  }

  function step(dt: number) {
    timeMs += dt * 1000;
    const z0 = Math.floor(sweep / SX);
    for (let i = 0; i < SWEEP_COLS; i++) {
      paintColumn(sweep % SX, Math.floor(sweep / SX));
      sweep = (sweep + 1) % (SX * SZ);
    }
    const z1 = sweep === 0 ? SZ - 1 : Math.floor((sweep - 1) / SX);
    if (z1 >= z0) tg.putImageData(img, 0, 0, 0, z0, SX, z1 - z0 + 1);
    else tg.putImageData(img, 0, 0);
    if (timeMs - boxesMs > 1000) {
      boxesMs = timeMs;
      refreshBoxes();
    }
    if (!hud.hidden) drawHud();
    if (mapOpen() && timeMs - mapMs > 250) {
      mapMs = timeMs;
      drawMap();
    }
  }

  ctx.ui.els.mapClose.addEventListener('click', toggleMap);
  hud.addEventListener('click', toggleMap);

  return { step, reset: repaintAll, toggleMap, mapOpen };
}
