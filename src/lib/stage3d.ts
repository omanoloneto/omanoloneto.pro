import * as THREE from 'three';

export interface Stage3D {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  lowTier: boolean;
  measure(): void;
  startLoop(): void;
  stopLoop(): void;
  running(): boolean;
  render(): void;
}

export interface Stage3DOptions {
  fov: number;
  far: number;
  onFrame(dt: number): void;
  maxPixelRatio?: number;
  renderFn?: () => void;
}

export function createStage3D(sceneEl: HTMLElement, opts: Stage3DOptions): Stage3D {
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  let lowTier = false;
  try {
    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const gpu = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '';
    if (/swiftshader|llvmpipe|software/i.test(String(gpu))) lowTier = true;
  } catch { }
  const maxRatio = opts.maxPixelRatio ?? 1.5;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowTier ? 1 : maxRatio));
  sceneEl.insertBefore(renderer.domElement, sceneEl.firstChild);
  const camera = new THREE.PerspectiveCamera(opts.fov, 1, 0.1, opts.far);

  let rafId = 0;
  let lastTs = 0;
  let avgDt = 16;
  let degrade = 0;
  const renderScene = () => (opts.renderFn ? opts.renderFn() : renderer.render(scene, camera));

  function measure() {
    const w = sceneEl.clientWidth || 1;
    const h = sceneEl.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (!rafId) renderScene();
  }
  window.addEventListener('resize', measure);
  renderer.domElement.addEventListener('webglcontextrestored', () => measure());

  function loop(ts: number) {
    rafId = requestAnimationFrame(loop);
    if (!lastTs) { lastTs = ts; return; }
    const dtMs = ts - lastTs;
    lastTs = ts;
    avgDt = avgDt * 0.95 + dtMs * 0.05;
    if (avgDt > 45 && degrade < 2) {
      degrade++;
      avgDt = 16;
      const target = lowTier ? (degrade === 1 ? 0.75 : 0.55) : degrade === 1 ? 0.85 : 0.7;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, target));
      measure();
    }
    opts.onFrame(Math.min(dtMs / 1000, 0.05));
    renderScene();
  }

  return {
    scene,
    camera,
    renderer,
    lowTier,
    measure,
    startLoop() {
      if (!rafId) {
        lastTs = 0;
        rafId = requestAnimationFrame(loop);
      }
    },
    stopLoop() {
      cancelAnimationFrame(rafId);
      rafId = 0;
    },
    running: () => rafId !== 0,
    render: renderScene,
  };
}
