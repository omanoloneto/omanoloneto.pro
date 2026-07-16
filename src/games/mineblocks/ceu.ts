// Céu com ciclo dia/noite. Mundo é MeshBasicMaterial (SwiftShader, sem luz
// dinâmica), então nada de shadow map: o dia/noite é um domo de gradiente +
// sol/lua cruzando em arco + um tint global nos materiais do mundo.
// Dia = 15 min (900s), noite = 10 min (600s). Pausa/reduced-motion congela.
import * as THREE from 'three';
import type { Contexto, Ceu } from './tipos';

const DIA_S = 900;
const NOITE_S = 600;
const CICLO_S = DIA_S + NOITE_S;
const R = 250; // raio do domo (< far 260); recentrado na câmera todo frame

// Paletas por segundo do ciclo: cor do zênite, do horizonte e tint do mundo.
// O sol/lua NÃO vêm daqui — a opacidade deles sai da própria elevação.
interface Chave {
  s: number;
  zen: number;
  hor: number;
  tint: [number, number, number];
}
const CHAVES: Chave[] = [
  { s: 0, zen: 0x1c4f96, hor: 0xffb877, tint: [1.0, 0.88, 0.74] }, // amanhecer
  { s: 120, zen: 0x2f7ad0, hor: 0xcfe9f7, tint: [1.0, 1.0, 1.0] }, // manhã
  { s: 450, zen: 0x2b78d4, hor: 0xd8edf9, tint: [1.0, 1.0, 1.0] }, // meio-dia
  { s: 760, zen: 0x2e6fbe, hor: 0xffd39a, tint: [1.0, 0.93, 0.8] }, // tarde dourada
  { s: 880, zen: 0x2a3f7a, hor: 0xff8c4a, tint: [0.92, 0.66, 0.52] }, // pôr do sol
  { s: 980, zen: 0x13204a, hor: 0x243a63, tint: [0.52, 0.58, 0.74] }, // anoitecer
  { s: 1290, zen: 0x111c40, hor: 0x1e2c54, tint: [0.52, 0.58, 0.74] }, // noite cheia (luar)
  { s: 1440, zen: 0x1a2a58, hor: 0x35477a, tint: [0.58, 0.6, 0.74] }, // pré-amanhecer
];

export function criarCeu(ctx: Contexto): Ceu {
  const { scene, cfg, camera, malha } = ctx;
  const { SX, SZ } = cfg.mundo;
  const parado = ctx.motionReduzido;

  // relógio do ciclo (segundos). Começa de manhã; save/mundo novo ajustam.
  let rel = 120;
  let acumTint = 0; // throttle das cores (não precisa recolorir todo frame)

  // ---- domo de céu: esfera grande, BackSide, gradiente por vertexColor ----
  const domoGeo = new THREE.SphereGeometry(R, 24, 16);
  const nV = domoGeo.attributes.position.count;
  const alt = new Float32Array(nV); // altura normalizada 0..1 de cada vértice
  {
    const pos = domoGeo.attributes.position;
    for (let i = 0; i < nV; i++) alt[i] = Math.min(1, Math.max(0, pos.getY(i) / R));
  }
  domoGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(nV * 3), 3));
  const domoMat = new THREE.MeshBasicMaterial({
    vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false,
  });
  const domo = new THREE.Mesh(domoGeo, domoMat);
  // desenha DEPOIS do terreno opaco (renderOrder 1) com depthTest ligado: o
  // depth do terreno rejeita os fragmentos do domo atrás dos morros, então o
  // domo só pinta o céu de verdade — sem overdraw de tela cheia (SwiftShader
  // é fill-rate). depthWrite false pra não ocluir sol/lua/água (que vêm depois).
  domo.renderOrder = 1;
  domo.frustumCulled = false;
  scene.add(domo);

  // ---- sol e lua: sprites QUADRADOS pixelados (nada redondo neste jogo) ----
  // canvas 16×16, NearestFilter → borda dura de pixel-art. Sol = quadrado
  // amarelo com miolo claro; lua = quadrado marfim com crateras quadradas.
  function astro(corpo: string, detalhe: string, crateras: boolean): THREE.CanvasTexture {
    const N = 16;
    const c = document.createElement('canvas');
    c.width = c.height = N;
    const g = c.getContext('2d')!;
    g.fillStyle = corpo;
    g.fillRect(1, 1, N - 2, N - 2); // quadrado cheio (deixa 1px de folga transparente)
    g.fillStyle = detalhe;
    if (crateras) {
      // lua: quadradinhos de cratera
      g.fillRect(4, 4, 3, 3);
      g.fillRect(9, 8, 2, 2);
      g.fillRect(6, 11, 2, 2);
    } else {
      // sol: miolo claro quadrado
      g.fillRect(4, 4, N - 8, N - 8);
    }
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const solMat = new THREE.SpriteMaterial({
    map: astro('#ffe14d', '#fff6c2', false),
    transparent: true, depthWrite: false, fog: false,
  });
  const luaMat = new THREE.SpriteMaterial({
    map: astro('#e9eef7', '#c2cde4', true),
    transparent: true, depthWrite: false, fog: false,
  });
  const sol = new THREE.Sprite(solMat);
  const lua = new THREE.Sprite(luaMat);
  sol.name = 'sol';
  lua.name = 'lua';
  sol.scale.setScalar(32);
  lua.scale.setScalar(34);
  scene.add(sol, lua);

  // ---- nuvens (mantidas): quads brancos no alto, drift lento ----
  const nuvemMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
  const nuvens: THREE.Mesh[] = [];
  const rnd = (a: number, b: number) => a + Math.random() * (b - a);
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(rnd(10, 22), rnd(6, 14)), nuvemMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(rnd(-20, SX + 20), 46 + rnd(0, 3), rnd(-20, SZ + 20));
    scene.add(m);
    nuvens.push(m);
  }

  // fog só em GPU de verdade (SwiftShader é fill-rate); cor atualiza no ciclo
  if (!ctx.tierBaixo) scene.fog = new THREE.Fog(0x87c6ea, 90, 240);
  scene.background = new THREE.Color(0x87c6ea);

  // ----- cores por hora: interpola entre as chaves (com wrap no fim) -----
  const cZen = new THREE.Color();
  const cHor = new THREE.Color();
  const cTint = new THREE.Color();
  const cVert = new THREE.Color();
  function corPorTempo(s: number) {
    let a = CHAVES[CHAVES.length - 1];
    let b = CHAVES[0];
    let sa = a.s - CICLO_S; // a última chave "vem de antes" do zero
    let sb = b.s;
    for (let i = 0; i < CHAVES.length; i++) {
      const k = CHAVES[i];
      const kNext = CHAVES[(i + 1) % CHAVES.length];
      const kNextS = i + 1 < CHAVES.length ? kNext.s : CICLO_S; // wrap volta pra chave 0 em CICLO
      if (s >= k.s && s < kNextS) {
        a = k; b = kNext; sa = k.s; sb = kNextS;
        break;
      }
    }
    const t = sb === sa ? 0 : (s - sa) / (sb - sa);
    cZen.set(a.zen).lerp(new THREE.Color(b.zen), t);
    cHor.set(a.hor).lerp(new THREE.Color(b.hor), t);
    cTint.setRGB(
      a.tint[0] + (b.tint[0] - a.tint[0]) * t,
      a.tint[1] + (b.tint[1] - a.tint[1]) * t,
      a.tint[2] + (b.tint[2] - a.tint[2]) * t,
    );
  }

  const corAttr = domoGeo.attributes.color as THREE.BufferAttribute;
  function pintarDomo() {
    for (let i = 0; i < nV; i++) {
      // banda do horizonte embaixo, zênite preenchendo o alto
      const f = Math.min(1, Math.max(0, (alt[i] - 0.0) / 0.55));
      const s = f * f * (3 - 2 * f); // smoothstep
      cVert.copy(cHor).lerp(cZen, s);
      corAttr.setXYZ(i, cVert.r, cVert.g, cVert.b);
    }
    corAttr.needsUpdate = true;
  }

  function aplicarCores() {
    corPorTempo(rel);
    pintarDomo();
    malha.tingir(cTint);
    nuvemMat.color.copy(cTint).lerp(new THREE.Color(0xffffff), 0.25); // nuvem menos escura que o chão
    (scene.background as THREE.Color).copy(cHor);
    if (scene.fog) scene.fog.color.copy(cHor);
  }

  // sol/lua: elevação sai do próprio ciclo (dia 0..π, noite 0..π); opacidade
  // = elevação (some no horizonte, brilha no alto). Posição recentra na câmera.
  const dir = new THREE.Vector3();
  // ativo = a fase daquele corpo está no ar; fora dela o corpo some. O gate
  // por 'ativo' é obrigatório: como o dia (900s) é mais longo que a noite
  // (600s), a frac da lua chega a -1.5 no amanhecer e sin(-1.5π)=+1 faria a
  // lua reaparecer de dia se a visibilidade saísse só do sinal do seno.
  function posicionar(corpo: THREE.Sprite, fracFase: number, mat: THREE.SpriteMaterial, ativo: boolean) {
    const phi = Math.PI * fracFase; // 0 nasce (leste), π/2 no alto, π põe (oeste)
    const el = Math.sin(phi); // elevação: 0 no horizonte, 1 no alto
    const op = ativo ? Math.min(1, Math.max(0, el * 4)) : 0; // fade no horizonte; some fora da fase
    mat.opacity = op;
    corpo.visible = op > 0.01;
    if (!corpo.visible) return;
    dir.set(Math.cos(phi), Math.max(0.02, el), 0.32).normalize();
    corpo.position.copy(camera.position).addScaledVector(dir, R * 0.92);
  }

  function atualizarCorpos() {
    posicionar(sol, rel / DIA_S, solMat, rel < DIA_S); // sol: só de dia [0,900)
    posicionar(lua, (rel - DIA_S) / NOITE_S, luaMat, rel >= DIA_S); // lua: só de noite [900,1500)
  }

  aplicarCores();
  atualizarCorpos();
  domo.position.copy(camera.position);

  return {
    passo(dt: number) {
      // domo/sol/lua acompanham a câmera pra parecerem infinitamente longe
      domo.position.copy(camera.position);
      if (!parado) {
        rel = (rel + dt) % CICLO_S;
        for (const n of nuvens) {
          n.position.x += dt * 0.7;
          if (n.position.x > SX + 30) n.position.x = -30;
        }
        acumTint += dt;
        if (acumTint >= 0.2) { acumTint = 0; aplicarCores(); } // recolore ~5×/s
      }
      atualizarCorpos(); // posição do sol/lua todo frame (barato, movimento liso)
    },
    tempo: () => rel,
    definirTempo(s: number) {
      rel = ((s % CICLO_S) + CICLO_S) % CICLO_S;
      aplicarCores();
      atualizarCorpos();
    },
  };
}
