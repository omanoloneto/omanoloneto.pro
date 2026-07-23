import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createStage3D } from '../../lib/stage3d';
import { createCity } from './city';
import { buildMapaExport, type ExpMapa } from './map-export';
import { fetchPublishedMapa, loadLocalDraft, saveLocalDraft, getSenha, setSenha, publishMapa } from './map-load';
import type { City, Ctx } from './types';

type Ref = { kind: 'predio'; i: number } | { kind: 'marco'; i: number } | { kind: 'morro'; i: number };

const PREDIO_DEF: Record<string, { w: number; d: number; h: number; cor: string }> = {
  torre: { w: 16, d: 16, h: 40, cor: '#2b3242' },
  predio: { w: 20, d: 14, h: 24, cor: '#8d7f6e' },
  loja: { w: 18, d: 14, h: 7, cor: '#b5563f' },
  galpao: { w: 34, d: 20, h: 8, cor: '#7d8794' },
  box: { w: 14, d: 14, h: 12, cor: '#3a4152' },
};

export async function startEditor3D() {
  const data = JSON.parse(document.querySelector('[data-dados]')!.textContent!);
  const cfg = data.config;
  const mapa = ((loadLocalDraft() as Record<string, unknown>) ?? (await fetchPublishedMapa()) ?? data.mapa) as any;
  mapa.predios ??= [];
  mapa.marcos ??= [];
  mapa.rotatorias ??= [];
  mapa.morros ??= [];

  const sceneEl = document.querySelector('[data-cena]') as HTMLElement;
  const stage = createStage3D(sceneEl, { fov: 55, far: 2400, onFrame() { controls.update(); } });
  stage.renderer.toneMapping = THREE.LinearToneMapping;
  const K = cfg.cores;
  stage.scene.background = new THREE.Color(K.ceuDia);
  stage.scene.fog = null;

  const ctx = {
    cfg, map: mapa, textures: {}, reducedMotion: false,
    stage, scene: stage.scene, camera: stage.camera, sceneEl,
  } as unknown as Ctx;

  let city: City = createCity(ctx);
  ctx.city = city;
  function applyDay() {
    const tint = cfg.ciclo.claridadeDia;
    for (const m of city.tintables) m.color.setScalar(tint);
    city.nightGlow.color.setScalar(0.5);
    city.nightDecals.opacity = 0;
  }
  applyDay();

  const controls = new OrbitControls(stage.camera, stage.renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.maxPolarAngle = 1.45;
  controls.minDistance = 25;
  controls.maxDistance = 1200;
  controls.enableDamping = true;
  controls.dampingFactor = 0.12;
  controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE } as any;
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  stage.camera.position.set(0, 600, 620);
  controls.update();
  stage.measure();
  stage.startLoop();

  const raycaster = new THREE.Raycaster();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const domEl = stage.renderer.domElement;

  function pointerGround(ev: PointerEvent): [number, number] | null {
    const rect = domEl.getBoundingClientRect();
    const ndc = new THREE.Vector2(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, stage.camera);
    const pt = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(groundPlane, pt)) return null;
    return [Math.round(pt.x), Math.round(pt.z)];
  }

  const proxyMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  let proxies: THREE.Mesh[] = [];

  function marcoDims(tipo: string): [number, number, number] {
    const m = cfg.marcos;
    if (tipo === 'ginasio') return [m.ginasio.drumR * 2, m.ginasio.drumR * 2, m.ginasio.drumH + m.ginasio.domeH];
    if (tipo === 'prefeitura') return [m.prefeitura.w, m.prefeitura.d, m.prefeitura.h];
    if (tipo === 'skate') return [m.skate.padW, m.skate.padD, 3];
    if (tipo === 'casa') return [m.casa.w, m.casa.d, m.casa.h];
    if (tipo === 'bourbon') return [m.bourbon.w, m.bourbon.d, m.bourbon.h];
    return [12, 12, 12];
  }

  function addProxy(x: number, z: number, w: number, d: number, h: number, rot: number, ref: Ref) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), proxyMat);
    mesh.position.set(x, city.heightAt(x, z) + h / 2, z);
    mesh.rotation.y = rot;
    (mesh as any).ref = ref;
    stage.scene.add(mesh);
    proxies.push(mesh);
  }

  function rebuildProxies() {
    for (const p of proxies) stage.scene.remove(p);
    proxies = [];
    mapa.predios.forEach((b: any, i: number) => addProxy(b.x, b.z, b.w, b.d, b.h, b.rot || 0, { kind: 'predio', i }));
    mapa.marcos.forEach((m: any, i: number) => { const [w, d, h] = marcoDims(m.tipo); addProxy(m.x, m.z, w, d, h, m.rot || 0, { kind: 'marco', i }); });
  }
  rebuildProxies();

  const hlBox = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0xffd23f }));
  hlBox.visible = false;
  stage.scene.add(hlBox);
  const ringGeo = new THREE.BufferGeometry();
  const hlRing = new THREE.LineLoop(ringGeo, new THREE.LineBasicMaterial({ color: 0x8fd15a }));
  hlRing.visible = false;
  stage.scene.add(hlRing);

  let sel: Ref | null = null;

  function selData(): any {
    if (!sel) return null;
    if (sel.kind === 'predio') return mapa.predios[sel.i];
    if (sel.kind === 'marco') return mapa.marcos[sel.i];
    return mapa.morros[sel.i];
  }

  function refreshHighlight() {
    hlBox.visible = false;
    hlRing.visible = false;
    if (!sel) return;
    if (sel.kind === 'morro') {
      const h = mapa.morros[sel.i];
      const pts: number[] = [];
      for (let a = 0; a <= 48; a++) {
        const t = (a / 48) * Math.PI * 2;
        const x = h.x + Math.cos(t) * h.raio;
        const z = h.z + Math.sin(t) * h.raio;
        pts.push(x, city.heightAt(x, z) + 0.5, z);
      }
      ringGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      hlRing.visible = true;
      return;
    }
    const d = selData();
    const [w, dd, hh] = sel.kind === 'marco' ? marcoDims(d.tipo) : [d.w, d.d, d.h];
    hlBox.scale.set(w + 1, hh + 1, dd + 1);
    hlBox.position.set(d.x, city.heightAt(d.x, d.z) + hh / 2, d.z);
    hlBox.rotation.y = d.rot || 0;
    hlBox.visible = true;
  }

  let rebuildTimer = 0;
  function scheduleRebuild(delay = 90) {
    clearTimeout(rebuildTimer);
    rebuildTimer = window.setTimeout(rebuildNow, delay);
  }
  function rebuildNow() {
    city.dispose();
    city = createCity(ctx);
    ctx.city = city;
    applyDay();
    rebuildProxies();
    refreshHighlight();
  }

  let tool: 'select' | 'place' | 'terreno' = 'select';
  let placeSpec = '';
  let dragging = false;

  function select(ref: Ref | null) {
    sel = ref;
    refreshHighlight();
    buildPanel();
  }

  function placeAt(x: number, z: number) {
    if (tool === 'terreno') {
      let near = -1;
      for (let i = 0; i < mapa.morros.length; i++) {
        const m = mapa.morros[i];
        if (Math.hypot(m.x - x, m.z - z) <= m.raio) { near = i; break; }
      }
      if (near >= 0) { select({ kind: 'morro', i: near }); return; }
      mapa.morros.push({ x, z, raio: 60, altura: 12 });
      select({ kind: 'morro', i: mapa.morros.length - 1 });
      scheduleRebuild();
      return;
    }
    const [group, tipo] = placeSpec.split(':');
    if (group === 'predio') {
      const def = PREDIO_DEF[tipo] ?? PREDIO_DEF.box;
      mapa.predios.push({ tipo, x, z, w: def.w, d: def.d, h: def.h, cor: def.cor });
      select({ kind: 'predio', i: mapa.predios.length - 1 });
    } else {
      mapa.marcos.push({ tipo, x, z });
      select({ kind: 'marco', i: mapa.marcos.length - 1 });
    }
    scheduleRebuild();
  }

  domEl.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0) return;
    const g = pointerGround(ev);
    if (!g) return;
    if (tool === 'place') { placeAt(g[0], g[1]); return; }
    if (tool === 'terreno') {
      placeAt(g[0], g[1]);
      if (sel?.kind === 'morro') dragging = true;
      return;
    }
    const rect = domEl.getBoundingClientRect();
    const ndc = new THREE.Vector2(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, stage.camera);
    const hit = raycaster.intersectObjects(proxies, false)[0];
    if (hit) {
      select((hit.object as any).ref as Ref);
      dragging = true;
    } else {
      select(null);
    }
  });

  domEl.addEventListener('pointermove', (ev) => {
    if (!dragging || !sel) return;
    const g = pointerGround(ev);
    if (!g) return;
    const d = selData();
    d.x = g[0];
    d.z = g[1];
    refreshHighlight();
    if (sel.kind !== 'morro') {
      const hh = sel.kind === 'marco' ? marcoDims(d.tipo)[2] : d.h;
      const px = proxies.find((p) => { const r = (p as any).ref as Ref; return r.kind === sel!.kind && r.i === sel!.i; });
      if (px) px.position.set(d.x, city.heightAt(d.x, d.z) + hh / 2, d.z);
    }
    scheduleRebuild(140);
    buildPanel();
  });

  const endDrag = () => { if (dragging) { dragging = false; scheduleRebuild(0); } };
  domEl.addEventListener('pointerup', endDrag);
  domEl.addEventListener('pointerleave', endDrag);

  window.addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
    if (!sel) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (sel.kind === 'predio') mapa.predios.splice(sel.i, 1);
      else if (sel.kind === 'marco') mapa.marcos.splice(sel.i, 1);
      else mapa.morros.splice(sel.i, 1);
      select(null);
      scheduleRebuild(0);
      return;
    }
    if ((e.key === '[' || e.key === ']') && sel.kind !== 'morro') {
      const d = selData();
      d.rot = (d.rot || 0) + (e.key === '[' ? -1 : 1) * Math.PI / 12;
      scheduleRebuild(0);
      buildPanel();
      return;
    }
    if ((e.key === '+' || e.key === '=' || e.key === '-') && sel.kind === 'morro') {
      mapa.morros[sel.i].altura += e.key === '-' ? -2 : 2;
      scheduleRebuild(0);
      buildPanel();
    }
  });

  const panel = document.querySelector('[data-panel]') as HTMLElement;
  function buildPanel() {
    if (!sel) { panel.innerHTML = '<p class="hint">Clique num objeto pra selecionar. Botão direito gira a câmera · meio arrasta · roda dá zoom.</p>'; return; }
    const d = selData();
    const num = (label: string, val: number, key: string) => `<label>${label}<input type="number" step="0.5" value="${Math.round(val * 10) / 10}" data-f="${key}"></label>`;
    const rows: string[] = [];
    if (sel.kind === 'morro') {
      rows.push('<h3>morro</h3>', num('x', d.x, 'x'), num('z', d.z, 'z'), num('raio', d.raio, 'raio'), num('altura', d.altura, 'altura'));
      rows.push('<p class="hint">+ / − muda altura · Delete apaga.</p>');
    } else if (sel.kind === 'marco') {
      rows.push(`<h3>marco · ${d.tipo}</h3>`, num('x', d.x, 'x'), num('z', d.z, 'z'), num('rotação°', (d.rot || 0) * 180 / Math.PI, 'rotDeg'));
      rows.push('<p class="hint">[ ] gira · Delete apaga.</p>');
    } else {
      rows.push(`<h3>prédio · ${d.tipo ?? 'box'}</h3>`, num('x', d.x, 'x'), num('z', d.z, 'z'), num('larg', d.w, 'w'), num('prof', d.d, 'd'), num('alt', d.h, 'h'), num('rotação°', (d.rot || 0) * 180 / Math.PI, 'rotDeg'));
      rows.push(`<label>cor<input type="color" value="${d.cor || '#3a4152'}" data-f="cor"></label>`);
      rows.push('<p class="hint">[ ] gira · Delete apaga.</p>');
    }
    panel.innerHTML = rows.join('');
    panel.querySelectorAll('input[data-f]').forEach((el) => {
      el.addEventListener('input', () => {
        const inp = el as HTMLInputElement;
        const f = inp.dataset.f!;
        if (f === 'cor') d.cor = inp.value;
        else if (f === 'rotDeg') d.rot = parseFloat(inp.value) * Math.PI / 180;
        else { const v = parseFloat(inp.value); if (!Number.isNaN(v)) d[f] = v; }
        refreshHighlight();
        scheduleRebuild(0);
      });
    });
  }
  buildPanel();

  document.querySelectorAll('[data-tool]').forEach((btn) => {
    btn.addEventListener('click', () => {
      tool = (btn as HTMLElement).dataset.tool as any;
      placeSpec = '';
      document.querySelectorAll('[data-tool],[data-place]').forEach((b) => b.classList.remove('on'));
      btn.classList.add('on');
      document.querySelector('[data-palette]')?.classList.toggle('open', tool === 'place');
    });
  });
  document.querySelectorAll('[data-place]').forEach((btn) => {
    btn.addEventListener('click', () => {
      tool = 'place';
      placeSpec = (btn as HTMLElement).dataset.place!;
      document.querySelectorAll('[data-tool],[data-place]').forEach((b) => b.classList.remove('on'));
      btn.classList.add('on');
    });
  });

  function toast(msg: string, ok = true) {
    const t = document.querySelector('[data-toast]') as HTMLElement;
    t.textContent = msg;
    t.className = 'ed3__toast ' + (ok ? 'ok' : 'err') + ' show';
    setTimeout(() => (t.className = 'ed3__toast'), 1800);
  }

  document.querySelector('[data-save]')?.addEventListener('click', () => { saveLocalDraft(mapa); toast('Salvo neste navegador'); });
  document.querySelector('[data-publish]')?.addEventListener('click', async () => {
    let senha = getSenha();
    if (!senha) { senha = prompt('Senha pra publicar:') || ''; if (!senha) return; setSenha(senha); }
    saveLocalDraft(mapa);
    toast('Publicando…');
    const r = await publishMapa(mapa, senha);
    if (r.ok) toast('Publicado! O jogo já carrega esse mapa.');
    else { toast('Falhou: ' + r.erro, false); if (r.erro === 'senha incorreta') setSenha(''); }
  });
  document.querySelector('[data-download]')?.addEventListener('click', () => {
    const txt = buildMapaExport(mapa as ExpMapa);
    navigator.clipboard?.writeText(txt);
    toast('Código copiado (colar no data)');
  });

  (window as any).__ed3 = {
    mapa,
    counts: () => ({ predios: mapa.predios.length, marcos: mapa.marcos.length, morros: mapa.morros.length }),
    setTool: (t: string) => { tool = t as any; },
    place: (spec: string, x: number, z: number) => { tool = 'place'; placeSpec = spec; placeAt(x, z); },
    addMorro: (x: number, z: number) => { tool = 'terreno'; placeAt(x, z); },
  };
}
