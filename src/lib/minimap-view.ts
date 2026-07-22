export type MapProject = (x: number, z: number) => [number, number];

export interface MinimapViewOptions {
  terrain: HTMLCanvasElement;
  hudTerrain?: HTMLCanvasElement;
  hud: HTMLCanvasElement;
  big: HTMLCanvasElement;
  panel: HTMLElement;
  worldToMap: MapProject;
  mapToWorldScale: number;
  view: number;
  rotation?: () => number;
  circular?: boolean;
  hudBackground?: string;
  markers(g: CanvasRenderingContext2D, project: MapProject, pxPerUnit: number, isBig: boolean, rotation: number): void;
  onToggle?(open: boolean): void;
}

export interface MinimapView {
  drawHud(cx: number, cz: number): void;
  drawBig(): void;
  toggleMap(): void;
  mapOpen(): boolean;
  step(cx: number, cz: number, dtMs: number): void;
}

export function createMinimapView(opts: MinimapViewOptions): MinimapView {
  const hg = opts.hud.getContext('2d')!;
  const bg = opts.big.getContext('2d')!;
  let bigMs = -1e9;
  let clock = 0;

  function drawHud(cx: number, cz: number) {
    const src = opts.hudTerrain ?? opts.terrain;
    const W = opts.hud.width;
    const H = opts.hud.height;
    const viewPx = opts.view * opts.mapToWorldScale;
    const scale = W / viewPx;
    const [mx, my] = opts.worldToMap(cx, cz);
    const rot = opts.rotation ? opts.rotation() : 0;
    hg.clearRect(0, 0, W, H);
    hg.save();
    if (opts.circular) {
      hg.beginPath();
      hg.arc(W / 2, H / 2, Math.min(W, H) / 2, 0, Math.PI * 2);
      hg.clip();
    }
    if (opts.hudBackground) {
      hg.fillStyle = opts.hudBackground;
      hg.fillRect(0, 0, W, H);
    }
    hg.save();
    hg.translate(W / 2, H / 2);
    hg.rotate(rot);
    hg.scale(scale, scale);
    hg.translate(-mx, -my);
    hg.imageSmoothingEnabled = true;
    hg.drawImage(src, 0, 0);
    hg.restore();
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const project: MapProject = (x, z) => {
      const [px, py] = opts.worldToMap(x, z);
      const dx = px - mx;
      const dy = py - my;
      return [W / 2 + (dx * cos - dy * sin) * scale, H / 2 + (dx * sin + dy * cos) * scale];
    };
    opts.markers(hg, project, opts.mapToWorldScale * scale, false, rot);
    hg.restore();
  }

  function drawBig() {
    const scale = opts.big.width / opts.terrain.width;
    bg.imageSmoothingEnabled = false;
    bg.clearRect(0, 0, opts.big.width, opts.big.height);
    bg.drawImage(opts.terrain, 0, 0, opts.big.width, opts.big.height);
    const project: MapProject = (x, z) => {
      const [px, pz] = opts.worldToMap(x, z);
      return [px * scale, pz * scale];
    };
    opts.markers(bg, project, opts.mapToWorldScale * scale, true, 0);
  }

  function mapOpen() {
    return !opts.panel.hidden;
  }

  return {
    drawHud,
    drawBig,
    mapOpen,
    toggleMap() {
      if (mapOpen()) {
        opts.panel.hidden = true;
        opts.onToggle?.(false);
        return;
      }
      drawBig();
      opts.panel.hidden = false;
      opts.onToggle?.(true);
    },
    step(cx, cz, dtMs) {
      clock += dtMs;
      drawHud(cx, cz);
      if (mapOpen() && clock - bigMs > 250) {
        bigMs = clock;
        drawBig();
      }
    },
  };
}
