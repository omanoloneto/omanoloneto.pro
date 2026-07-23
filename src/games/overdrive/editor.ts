type Pt = [number, number];

interface Via { tipo: string; nome?: string; pontos: Pt[] }
interface Marco { tipo: string; x: number; z: number; rot?: number }
interface Predio { tipo?: string; x: number; z: number; w: number; d: number; h: number; cor: string; rot?: number }
interface Rotatoria { x: number; z: number; raioInterno: number; raioExterno: number }
interface Spawn { x: number; z: number; heading: number }
interface Mapa { nome: string; vias: Via[]; predios: Predio[]; marcos: Marco[]; rotatorias: Rotatoria[]; spawn: Spawn }

type Sel =
  | { kind: 'vertex'; via: number; i: number }
  | { kind: 'viaBody'; via: number }
  | { kind: 'marco'; i: number }
  | { kind: 'predio'; i: number }
  | { kind: 'rotCenter'; i: number }
  | { kind: 'rotIn'; i: number }
  | { kind: 'rotOut'; i: number }
  | { kind: 'spawn' }
  | { kind: 'spawnHeading' }
  | null;

const VIA_STYLE: Record<string, { w: number; casing: string; fill: string }> = {
  avenida: { w: 18, casing: '#2a2f3c', fill: '#525a70' },
  rua: { w: 9, casing: '#2a2f3c', fill: '#464d60' },
  br: { w: 20, casing: '#5a3a1a', fill: '#c2761e' },
};

export function startEditor() {
  const data = JSON.parse(document.querySelector('[data-dados]')!.textContent!);
  const cfg = data.config;
  const mapa: Mapa = data.mapa;
  const T = cfg.mundo.tamanho;

  const canvas = document.querySelector('[data-canvas]') as HTMLCanvasElement;
  const g = canvas.getContext('2d')!;
  const panel = document.querySelector('[data-panel]') as HTMLElement;
  const readout = document.querySelector('[data-readout]') as HTMLElement;
  const snapBtn = document.querySelector('[data-snap]') as HTMLButtonElement;
  const fitBtn = document.querySelector('[data-fit]') as HTMLButtonElement;
  const exportBtn = document.querySelector('[data-export]') as HTMLButtonElement;
  const exportBox = document.querySelector('[data-export-box]') as HTMLElement;
  const exportText = document.querySelector('[data-export-text]') as HTMLTextAreaElement;
  const copyBtn = document.querySelector('[data-copy]') as HTMLButtonElement;
  const closeExport = document.querySelector('[data-export-close]') as HTMLButtonElement;

  const view = { cx: 0, cz: 0, scale: 1 };
  let snap = 1;
  let sel: Sel = null;
  let dragging: Sel = null;
  let dragOff: Pt = [0, 0];
  let dragBody: Pt[] | null = null;
  let mouseWorld: Pt = [0, 0];

  const halfW = (tipo: string) => (VIA_STYLE[tipo]?.w ?? 9) / 2;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    render();
  }

  function fit() {
    const r = canvas.getBoundingClientRect();
    view.scale = Math.min(r.width, r.height) / (T * 1.05);
    view.cx = 0;
    view.cz = 0;
    render();
  }

  const W = () => canvas.getBoundingClientRect().width;
  const H = () => canvas.getBoundingClientRect().height;
  const sx = (x: number) => (x - view.cx) * view.scale + W() / 2;
  const sy = (z: number) => (z - view.cz) * view.scale + H() / 2;
  const wx = (px: number) => (px - W() / 2) / view.scale + view.cx;
  const wz = (py: number) => (py - H() / 2) / view.scale + view.cz;

  const snapV = (v: number, free: boolean) => (free ? v : Math.round(v / snap) * snap);

  function render() {
    const w = W();
    const h = H();
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#0e1a12';
    g.fillRect(0, 0, w, h);

    g.strokeStyle = 'rgba(255,255,255,0.06)';
    g.lineWidth = 1;
    for (let c = -T / 2; c <= T / 2; c += 100) {
      g.beginPath();
      g.moveTo(sx(c), sy(-T / 2));
      g.lineTo(sx(c), sy(T / 2));
      g.moveTo(sx(-T / 2), sy(c));
      g.lineTo(sx(T / 2), sy(c));
      g.stroke();
    }
    g.strokeStyle = 'rgba(255,255,255,0.14)';
    g.strokeRect(sx(-T / 2), sy(-T / 2), T * view.scale, T * view.scale);

    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (const pass of [0, 1]) {
      mapa.vias.forEach((via) => {
        const st = VIA_STYLE[via.tipo] ?? VIA_STYLE.rua;
        g.strokeStyle = pass === 0 ? st.casing : st.fill;
        g.lineWidth = Math.max(2, (st.w + (pass === 0 ? 2 : 0)) * view.scale);
        g.beginPath();
        via.pontos.forEach((p, i) => (i ? g.lineTo(sx(p[0]), sy(p[1])) : g.moveTo(sx(p[0]), sy(p[1]))));
        g.stroke();
      });
    }

    for (const r of mapa.rotatorias) {
      g.strokeStyle = '#8a8f98';
      g.lineWidth = Math.max(2, 10 * view.scale);
      g.beginPath();
      g.arc(sx(r.x), sy(r.z), ((r.raioInterno + r.raioExterno) / 2) * view.scale, 0, Math.PI * 2);
      g.stroke();
      g.strokeStyle = '#3a5';
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(sx(r.x), sy(r.z), r.raioInterno * view.scale, 0, Math.PI * 2);
      g.stroke();
      handleDot(r.x + r.raioExterno, r.z, '#ffd23f');
      handleDot(r.x - r.raioInterno, r.z, '#41e25e');
      centerDot(r.x, r.z, '#ffd23f', 'rotatória');
    }

    for (const b of mapa.predios) {
      g.save();
      g.globalAlpha = 0.5;
      g.fillStyle = b.cor || '#888';
      g.fillRect(sx(b.x - b.w / 2), sy(b.z - b.d / 2), b.w * view.scale, b.d * view.scale);
      g.restore();
      handleDot(b.x, b.z, '#c9d2e0');
    }

    for (const m of mapa.marcos) {
      g.save();
      g.globalAlpha = 0.5;
      g.fillStyle = marcoColor(m.tipo);
      if (m.tipo === 'ginasio') {
        const rr = cfg.marcos.ginasio.drumR * view.scale;
        g.beginPath();
        g.arc(sx(m.x), sy(m.z), rr, 0, Math.PI * 2);
        g.fill();
      } else {
        const [fw, fd] = footprint(m.tipo);
        g.fillRect(sx(m.x - fw / 2), sy(m.z - fd / 2), fw * view.scale, fd * view.scale);
      }
      g.restore();
      centerDot(m.x, m.z, marcoColor(m.tipo), m.tipo);
    }

    drawSpawn();
    drawVertices();
    highlightSelection();

    readout.textContent = `x ${mouseWorld[0].toFixed(1)}  z ${mouseWorld[1].toFixed(1)}  ·  zoom ${view.scale.toFixed(2)}`;
  }

  function marcoColor(tipo: string) {
    if (tipo === 'ginasio') return '#ff33cc';
    if (tipo === 'prefeitura') return '#ffe14d';
    if (tipo === 'casa') return '#e0705a';
    if (tipo === 'bourbon') return '#c9bfa8';
    return '#3fd23f';
  }

  function footprint(tipo: string): [number, number] {
    if (tipo === 'prefeitura') return [cfg.marcos.prefeitura.w, cfg.marcos.prefeitura.d];
    if (tipo === 'casa') return [cfg.marcos.casa.w, cfg.marcos.casa.d];
    if (tipo === 'bourbon') return [cfg.marcos.bourbon.w, cfg.marcos.bourbon.d];
    return [cfg.marcos.skate.padW, cfg.marcos.skate.padD];
  }

  function handleDot(x: number, z: number, color: string) {
    g.fillStyle = color;
    g.strokeStyle = '#05070f';
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(sx(x), sy(z), 5, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }

  function centerDot(x: number, z: number, color: string, label: string) {
    handleDot(x, z, color);
    g.fillStyle = '#e8ecf8';
    g.font = '11px Oxanium, Verdana, sans-serif';
    g.textAlign = 'center';
    g.fillText(label, sx(x), sy(z) - 9);
  }

  function drawVertices() {
    mapa.vias.forEach((via) => {
      via.pontos.forEach((p) => {
        g.fillStyle = '#dfe4ee';
        g.strokeStyle = '#05070f';
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(sx(p[0]), sy(p[1]), 4, 0, Math.PI * 2);
        g.fill();
        g.stroke();
      });
    });
  }

  function drawSpawn() {
    const s = mapa.spawn;
    const px = sx(s.x);
    const py = sy(s.z);
    const fx = Math.sin(s.heading);
    const fz = Math.cos(s.heading);
    g.save();
    g.translate(px, py);
    g.rotate(Math.atan2(fx, -fz));
    g.fillStyle = '#00e5ff';
    g.strokeStyle = '#05070f';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(0, -11);
    g.lineTo(8, 9);
    g.lineTo(0, 4);
    g.lineTo(-8, 9);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
    const hx = s.x + fx * 26;
    const hz = s.z + fz * 26;
    g.strokeStyle = '#00e5ff';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(px, py);
    g.lineTo(sx(hx), sy(hz));
    g.stroke();
    handleDot(hx, hz, '#00e5ff');
  }

  function highlightSelection() {
    if (!sel) return;
    let p: Pt | null = null;
    if (sel.kind === 'vertex') p = mapa.vias[sel.via].pontos[sel.i];
    else if (sel.kind === 'marco') p = [mapa.marcos[sel.i].x, mapa.marcos[sel.i].z];
    else if (sel.kind === 'predio') p = [mapa.predios[sel.i].x, mapa.predios[sel.i].z];
    else if (sel.kind === 'rotCenter') p = [mapa.rotatorias[sel.i].x, mapa.rotatorias[sel.i].z];
    else if (sel.kind === 'spawn') p = [mapa.spawn.x, mapa.spawn.z];
    if (!p) return;
    g.strokeStyle = '#ffd23f';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(sx(p[0]), sy(p[1]), 10, 0, Math.PI * 2);
    g.stroke();
  }

  const dist2 = (ax: number, ay: number, bx: number, by: number) => (ax - bx) ** 2 + (ay - by) ** 2;

  function distToSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
    const dx = bx - ax;
    const dy = by - ay;
    const l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
    return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
  }

  function pick(px: number, py: number): Sel {
    const near = (x: number, z: number, r: number) => dist2(px, py, sx(x), sy(z)) <= r * r;
    for (let v = 0; v < mapa.vias.length; v++) {
      const via = mapa.vias[v];
      for (let i = 0; i < via.pontos.length; i++) if (near(via.pontos[i][0], via.pontos[i][1], 9)) return { kind: 'vertex', via: v, i };
    }
    const s = mapa.spawn;
    const fx = Math.sin(s.heading);
    const fz = Math.cos(s.heading);
    if (near(s.x + fx * 26, s.z + fz * 26, 9)) return { kind: 'spawnHeading' };
    for (let i = 0; i < mapa.rotatorias.length; i++) {
      const r = mapa.rotatorias[i];
      if (near(r.x + r.raioExterno, r.z, 8)) return { kind: 'rotOut', i };
      if (near(r.x - r.raioInterno, r.z, 8)) return { kind: 'rotIn', i };
    }
    if (near(s.x, s.z, 12)) return { kind: 'spawn' };
    for (let i = 0; i < mapa.marcos.length; i++) if (near(mapa.marcos[i].x, mapa.marcos[i].z, 12)) return { kind: 'marco', i };
    for (let i = 0; i < mapa.predios.length; i++) if (near(mapa.predios[i].x, mapa.predios[i].z, 11)) return { kind: 'predio', i };
    for (let i = 0; i < mapa.rotatorias.length; i++) if (near(mapa.rotatorias[i].x, mapa.rotatorias[i].z, 12)) return { kind: 'rotCenter', i };
    for (let v = 0; v < mapa.vias.length; v++) {
      const via = mapa.vias[v];
      const lim = halfW(via.tipo) * view.scale + 4;
      for (let i = 0; i < via.pontos.length - 1; i++) {
        const a = via.pontos[i];
        const b = via.pontos[i + 1];
        if (distToSeg(px, py, sx(a[0]), sy(a[1]), sx(b[0]), sy(b[1])) <= lim) return { kind: 'viaBody', via: v };
      }
    }
    return null;
  }

  let panning = false;
  let panStart: Pt = [0, 0];
  let viewStart: Pt = [0, 0];

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const hit = pick(px, py);
    if (hit) {
      dragging = hit;
      sel = hit;
      if (hit.kind === 'viaBody') {
        dragBody = mapa.vias[hit.via].pontos.map((p) => [p[0], p[1]]);
        dragOff = [wx(px), wz(py)];
      }
      buildPanel();
      render();
    } else {
      panning = true;
      panStart = [px, py];
      viewStart = [view.cx, view.cz];
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    mouseWorld = [wx(px), wz(py)];
    if (panning) {
      view.cx = viewStart[0] - (px - panStart[0]) / view.scale;
      view.cz = viewStart[1] - (py - panStart[1]) / view.scale;
      render();
      return;
    }
    if (!dragging) {
      render();
      return;
    }
    const free = e.altKey;
    const mx = snapV(wx(px), free);
    const mz = snapV(wz(py), free);
    const d = dragging;
    if (d.kind === 'vertex') {
      mapa.vias[d.via].pontos[d.i] = [mx, mz];
    } else if (d.kind === 'marco') {
      mapa.marcos[d.i].x = mx;
      mapa.marcos[d.i].z = mz;
    } else if (d.kind === 'predio') {
      mapa.predios[d.i].x = mx;
      mapa.predios[d.i].z = mz;
    } else if (d.kind === 'rotCenter') {
      mapa.rotatorias[d.i].x = mx;
      mapa.rotatorias[d.i].z = mz;
    } else if (d.kind === 'rotOut') {
      mapa.rotatorias[d.i].raioExterno = Math.max(mapa.rotatorias[d.i].raioInterno + 2, Math.round(Math.hypot(wx(px) - mapa.rotatorias[d.i].x, wz(py) - mapa.rotatorias[d.i].z)));
    } else if (d.kind === 'rotIn') {
      mapa.rotatorias[d.i].raioInterno = Math.max(2, Math.min(mapa.rotatorias[d.i].raioExterno - 2, Math.round(Math.hypot(wx(px) - mapa.rotatorias[d.i].x, wz(py) - mapa.rotatorias[d.i].z))));
    } else if (d.kind === 'spawn') {
      mapa.spawn.x = mx;
      mapa.spawn.z = mz;
    } else if (d.kind === 'spawnHeading') {
      mapa.spawn.heading = Math.atan2(wx(px) - mapa.spawn.x, wz(py) - mapa.spawn.z);
    } else if (d.kind === 'viaBody' && dragBody) {
      const ddx = snapV(wx(px) - dragOff[0], free);
      const ddz = snapV(wz(py) - dragOff[1], free);
      mapa.vias[d.via].pontos = dragBody.map((p) => [p[0] + ddx, p[1] + ddz]);
    }
    buildPanel();
    render();
  });

  const endDrag = () => {
    panning = false;
    dragging = null;
    dragBody = null;
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const bx = wx(px);
    const bz = wz(py);
    const f = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    view.scale = Math.max(0.05, Math.min(6, view.scale * f));
    view.cx = bx - (px - W() / 2) / view.scale;
    view.cz = bz - (py - H() / 2) / view.scale;
    render();
  }, { passive: false });

  canvas.addEventListener('dblclick', (e) => {
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    for (let v = 0; v < mapa.vias.length; v++) {
      const via = mapa.vias[v];
      const lim = halfW(via.tipo) * view.scale + 4;
      for (let i = 0; i < via.pontos.length - 1; i++) {
        const a = via.pontos[i];
        const b = via.pontos[i + 1];
        if (distToSeg(px, py, sx(a[0]), sy(a[1]), sx(b[0]), sy(b[1])) <= lim) {
          via.pontos.splice(i + 1, 0, [Math.round(wx(px)), Math.round(wz(py))]);
          sel = { kind: 'vertex', via: v, i: i + 1 };
          buildPanel();
          render();
          return;
        }
      }
    }
  });

  window.addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
    if ((e.key === 'Delete' || e.key === 'Backspace') && sel?.kind === 'vertex') {
      const via = mapa.vias[sel.via];
      if (via.pontos.length > 2) {
        via.pontos.splice(sel.i, 1);
        sel = null;
        buildPanel();
        render();
      }
      return;
    }
    const step = e.shiftKey ? 10 : 1;
    const nudge = (dx: number, dz: number) => {
      if (!sel) return;
      if (sel.kind === 'vertex') { mapa.vias[sel.via].pontos[sel.i][0] += dx; mapa.vias[sel.via].pontos[sel.i][1] += dz; }
      else if (sel.kind === 'marco') { mapa.marcos[sel.i].x += dx; mapa.marcos[sel.i].z += dz; }
      else if (sel.kind === 'predio') { mapa.predios[sel.i].x += dx; mapa.predios[sel.i].z += dz; }
      else if (sel.kind === 'rotCenter') { mapa.rotatorias[sel.i].x += dx; mapa.rotatorias[sel.i].z += dz; }
      else if (sel.kind === 'spawn') { mapa.spawn.x += dx; mapa.spawn.z += dz; }
      buildPanel();
      render();
    };
    if (e.key === 'ArrowLeft') { e.preventDefault(); nudge(-step, 0); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); nudge(step, 0); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); nudge(0, -step); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); nudge(0, step); }
  });

  function buildPanel() {
    if (!sel) { panel.innerHTML = '<p class="hint">Clique num objeto pra selecionar. Arraste pra mover · roda dá zoom · arraste o vazio pra andar.</p>'; return; }
    const rows: string[] = [];
    const num = (label: string, val: number, key: string) => `<label>${label}<input type="number" step="0.5" value="${val}" data-field="${key}"></label>`;
    if (sel.kind === 'vertex') {
      const via = mapa.vias[sel.via];
      const p = via.pontos[sel.i];
      rows.push(`<h3>${via.nome ?? via.tipo} · vértice ${sel.i + 1}/${via.pontos.length}</h3>`);
      rows.push(num('x', p[0], 'vx'));
      rows.push(num('z', p[1], 'vz'));
      rows.push('<p class="hint">Delete apaga o vértice · duplo-clique numa via insere um novo.</p>');
    } else if (sel.kind === 'viaBody') {
      const via = mapa.vias[sel.via];
      rows.push(`<h3>${via.nome ?? via.tipo} (via inteira)</h3><p class="hint">Arrastando move a via toda. Clique num vértice pra editar ponto.</p>`);
    } else if (sel.kind === 'marco') {
      const m = mapa.marcos[sel.i];
      rows.push(`<h3>marco · ${m.tipo}</h3>`);
      rows.push(num('x', m.x, 'mx'));
      rows.push(num('z', m.z, 'mz'));
    } else if (sel.kind === 'predio') {
      const b = mapa.predios[sel.i];
      rows.push(`<h3>prédio · ${b.tipo ?? 'box'}</h3>`);
      rows.push(num('x', b.x, 'px'));
      rows.push(num('z', b.z, 'pz'));
      rows.push(num('largura', b.w, 'pw'));
      rows.push(num('profund.', b.d, 'pd'));
      rows.push(num('altura', b.h, 'ph'));
    } else if (sel.kind === 'rotCenter' || sel.kind === 'rotIn' || sel.kind === 'rotOut') {
      const r = mapa.rotatorias[sel.i];
      rows.push('<h3>rotatória</h3>');
      rows.push(num('x', r.x, 'rx'));
      rows.push(num('z', r.z, 'rz'));
      rows.push(num('raio interno', r.raioInterno, 'rin'));
      rows.push(num('raio externo', r.raioExterno, 'rout'));
    } else if (sel.kind === 'spawn' || sel.kind === 'spawnHeading') {
      const s = mapa.spawn;
      rows.push('<h3>spawn</h3>');
      rows.push(num('x', s.x, 'sx'));
      rows.push(num('z', s.z, 'sz'));
      rows.push(num('heading (graus)', Math.round((s.heading * 180 / Math.PI) * 10) / 10, 'sh'));
    }
    panel.innerHTML = rows.join('');
    panel.querySelectorAll('input[data-field]').forEach((el) => {
      el.addEventListener('input', () => {
        const inp = el as HTMLInputElement;
        const val = parseFloat(inp.value);
        if (Number.isNaN(val)) return;
        applyField(inp.dataset.field!, val);
        render();
      });
    });
  }

  function applyField(field: string, val: number) {
    if (!sel) return;
    if (sel.kind === 'vertex') { if (field === 'vx') mapa.vias[sel.via].pontos[sel.i][0] = val; else mapa.vias[sel.via].pontos[sel.i][1] = val; }
    else if (sel.kind === 'marco') { if (field === 'mx') mapa.marcos[sel.i].x = val; else mapa.marcos[sel.i].z = val; }
    else if (sel.kind === 'predio') {
      const b = mapa.predios[sel.i];
      if (field === 'px') b.x = val;
      else if (field === 'pz') b.z = val;
      else if (field === 'pw') b.w = val;
      else if (field === 'pd') b.d = val;
      else if (field === 'ph') b.h = val;
    } else if (sel.kind === 'rotCenter' || sel.kind === 'rotIn' || sel.kind === 'rotOut') {
      const r = mapa.rotatorias[sel.i];
      if (field === 'rx') r.x = val;
      else if (field === 'rz') r.z = val;
      else if (field === 'rin') r.raioInterno = val;
      else if (field === 'rout') r.raioExterno = val;
    } else if (sel.kind === 'spawn' || sel.kind === 'spawnHeading') {
      if (field === 'sx') mapa.spawn.x = val;
      else if (field === 'sz') mapa.spawn.z = val;
      else if (field === 'sh') mapa.spawn.heading = val * Math.PI / 180;
    }
  }

  const ri = (v: number) => Math.round(v);
  function buildExport() {
    const via = (v: Via) => `    { tipo: '${v.tipo}',${v.nome ? ` nome: '${v.nome.replace(/'/g, "\\'")}',` : ''} pontos: [${v.pontos.map((p) => `[${ri(p[0])}, ${ri(p[1])}]`).join(', ')}] },`;
    const marco = (m: Marco) => `    { tipo: '${m.tipo}', x: ${ri(m.x)}, z: ${ri(m.z)}${m.rot !== undefined ? `, rot: ${m.rot}` : ''} },`;
    const rota = (r: Rotatoria) => `    { x: ${ri(r.x)}, z: ${ri(r.z)}, raioInterno: ${ri(r.raioInterno)}, raioExterno: ${ri(r.raioExterno)} },`;
    const predio = (b: Predio) => `    { tipo: '${b.tipo ?? 'box'}', x: ${ri(b.x)}, z: ${ri(b.z)}, w: ${ri(b.w)}, d: ${ri(b.d)}, h: ${ri(b.h)}, cor: '${b.cor}'${b.rot !== undefined ? `, rot: ${b.rot}` : ''} },`;
    return [
      '  vias: [',
      mapa.vias.map(via).join('\n'),
      '  ] as Via[],',
      mapa.predios.length ? `  predios: [\n${mapa.predios.map(predio).join('\n')}\n  ] as Predio[],` : '  predios: [] as Predio[],',
      '  marcos: [',
      mapa.marcos.map(marco).join('\n'),
      '  ] as Marco[],',
      '  rotatorias: [',
      mapa.rotatorias.map(rota).join('\n'),
      '  ] as Rotatoria[],',
      `  spawn: { x: ${Math.round(mapa.spawn.x * 100) / 100}, z: ${Math.round(mapa.spawn.z * 100) / 100}, heading: ${Math.round(mapa.spawn.heading * 1e6) / 1e6} },`,
    ].join('\n');
  }

  snapBtn.addEventListener('click', () => {
    snap = snap === 1 ? 0.25 : snap === 0.25 ? 5 : 1;
    snapBtn.textContent = `Snap: ${snap}`;
  });
  fitBtn.addEventListener('click', fit);
  exportBtn.addEventListener('click', () => {
    exportText.value = buildExport();
    exportBox.hidden = false;
    exportText.focus();
    exportText.select();
  });
  copyBtn.addEventListener('click', () => {
    navigator.clipboard?.writeText(exportText.value);
    copyBtn.textContent = 'Copiado!';
    setTimeout(() => (copyBtn.textContent = 'Copiar'), 1200);
  });
  closeExport.addEventListener('click', () => (exportBox.hidden = true));

  window.addEventListener('resize', resize);
  snapBtn.textContent = `Snap: ${snap}`;
  buildPanel();
  resize();
  fit();
}
