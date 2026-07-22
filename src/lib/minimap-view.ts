export type MapProject = (x: number, z: number) => [number, number];

export interface MinimapViewOptions {
  terrain: HTMLCanvasElement;
  hud: HTMLCanvasElement;
  big: HTMLCanvasElement;
  panel: HTMLElement;
  worldToMap: MapProject;
  mapToWorldScale: number;
  view: number;
  markers(g: CanvasRenderingContext2D, project: MapProject, pxPerUnit: number, isBig: boolean): void;
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
    const viewPx = opts.view * opts.mapToWorldScale;
    const [mx, mz] = opts.worldToMap(cx, cz);
    const sx = Math.max(0, Math.min(opts.terrain.width - viewPx, mx - viewPx / 2));
    const sz = Math.max(0, Math.min(opts.terrain.height - viewPx, mz - viewPx / 2));
    const scale = opts.hud.width / viewPx;
    hg.imageSmoothingEnabled = false;
    hg.clearRect(0, 0, opts.hud.width, opts.hud.height);
    hg.drawImage(opts.terrain, sx, sz, viewPx, viewPx, 0, 0, opts.hud.width, opts.hud.height);
    const project: MapProject = (x, z) => {
      const [px, pz] = opts.worldToMap(x, z);
      return [(px - sx) * scale, (pz - sz) * scale];
    };
    opts.markers(hg, project, opts.mapToWorldScale * scale, false);
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
    opts.markers(bg, project, opts.mapToWorldScale * scale, true);
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
