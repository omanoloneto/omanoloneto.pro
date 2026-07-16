// Mundo: Terra de Areia procedural derivada da grade de strings + avenida
// diagonal (BR-101) do data file. Prédios com fachada de janelas por
// textura (1 draw call no merge), casas com telhado de duas águas no
// bairro, rótulos de bairro pintados no chão como no Google Maps.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Contexto, Mundo, Zona } from './tipos';

const PALETA_PREDIOS = [0xe8b04b, 0xd97757, 0x7ba3c9, 0xa3c47e, 0xc9917b, 0xb9a3d9, 0x8fbfae, 0xd9c47e];
const PALETA_CASAS = [0xf2e3c6, 0xd9e8f2, 0xf2d0d0, 0xe3f2d9, 0xf2ead0, 0xe8d9f2];
const COR_TELHADO = 0xb5563c;
const COR_PORTA = 0x2e3a48;

export function criarMundo(ctx: Contexto): Mundo {
  const { mapa, cfg, scene, porSimbolo, avenida } = ctx;
  const N = mapa.length;
  const CEL = cfg.celulaM;
  const MEIO = (N * CEL + 8) / 2;
  const TAM = MEIO * 2 + 14; // chão um pouco maior que o mundo
  const loteCentro = (i: number) => -MEIO + 8 + cfg.loteM / 2 + i * CEL;
  const ruaCentro = (i: number) => -MEIO + 4 + i * CEL;

  // ----- avenida diagonal (reta infinita atravessando o mapa) -----
  const [ax1, az1] = avenida.de;
  const [ax2, az2] = avenida.para;
  const avLen = Math.hypot(ax2 - ax1, az2 - az1);
  const avDirX = (ax2 - ax1) / avLen;
  const avDirZ = (az2 - az1) / avLen;
  function distAvenida(x: number, z: number) {
    const t = (x - ax1) * avDirX + (z - az1) * avDirZ;
    return Math.hypot(x - (ax1 + avDirX * t), z - (az1 + avDirZ * t));
  }
  const naFaixaDaAvenida = (x: number, z: number, folga: number) =>
    distAvenida(x, z) < avenida.largura / 2 + folga;
  const projAvenida = (x: number, z: number) => (x - ax1) * avDirX + (z - az1) * avDirZ;
  const pontoAvenida = (t: number): [number, number] => [ax1 + avDirX * t, az1 + avDirZ * t];

  // vãos de viaduto: onde a linha da BR cruza as ruas da grade
  const ALT_BR = 9;          // altura da pista elevada (rodovia alta de verdade)
  const TALUDE_BASE = 12.5;  // meia-largura da base (inclinação ~igual, altura 2×)
  // vão de 17m: com a base de 12.5m, atravessar o aterro numa rua
  // leste-oeste varre ~12.4m do parâmetro t da BR + folga de manobra
  const MEIO_VAO = 8.5;
  const tsVaos: number[] = [];
  for (let i = 0; i <= N; i++) {
    const rua = ruaCentro(i);
    // SÓ ruas leste-oeste viram viaduto — as norte-sul são cortadas
    // pela rodovia (igual à cidade de verdade)
    if (Math.abs(avDirZ) > 1e-6) {
      const t = (rua - az1) / avDirZ;
      const [x] = pontoAvenida(t);
      if (Math.abs(x) <= MEIO && t > 2 && t < avLen - 2) tsVaos.push(t);
    }
  }
  tsVaos.sort((a, b) => a - b);
  // cruzamentos quase no mesmo ponto (esquina) viram um vão só
  const vaos: number[] = [];
  tsVaos.forEach((t) => {
    if (!vaos.length || t - vaos[vaos.length - 1] > 7) vaos.push(t);
    else vaos[vaos.length - 1] = (vaos[vaos.length - 1] + t) / 2;
  });

  function pertoDeVao(t: number, folga: number) {
    return vaos.some((tv) => Math.abs(t - tv) < MEIO_VAO + folga);
  }

  const aabbs: Mundo['aabbs'] = [];
  const zonas = new Map<string, Zona>();
  const sombras: Array<[number, number, number, number]> = [];
  const arvores: Array<[number, number]> = [];
  const geosConstrucoes: THREE.BufferGeometry[] = []; // fachadas (textura de janelas × vertex color)
  const geosDetalhes: THREE.BufferGeometry[] = [];    // portas/toldos (cor chapada)

  // ----- textura de fachada: grade de janelas em cinza (tinge por vertex color) -----
  // tile = 4m (u) × 3m/andar (v); borda de 16px lisa (vira pilar/laje ao repetir)
  // e o texel (0.03, 0.03) fica liso pra colapsar UV de tetos/telhados.
  const fachadaCanvas = document.createElement('canvas');
  fachadaCanvas.width = 256;
  fachadaCanvas.height = 256;
  {
    const g = fachadaCanvas.getContext('2d')!;
    g.fillStyle = '#dcdcdc';
    g.fillRect(0, 0, 256, 256);
    for (let cx = 0; cx < 2; cx++) {
      for (let cy = 0; cy < 2; cy++) {
        const x = 40 + cx * 112;
        const y = 40 + cy * 112;
        // janela: moldura + vidro (algumas "acesas")
        g.fillStyle = '#b8b8b8';
        g.fillRect(x - 4, y - 4, 72, 88);
        g.fillStyle = (cx + cy) % 3 === 0 ? '#f2e6b8' : '#31404f';
        g.fillRect(x, y, 64, 80);
        g.strokeStyle = '#b8b8b8';
        g.lineWidth = 4;
        g.beginPath();
        g.moveTo(x + 32, y);
        g.lineTo(x + 32, y + 80);
        g.stroke();
      }
    }
  }
  const fachadaTex = new THREE.CanvasTexture(fachadaCanvas);
  fachadaTex.colorSpace = THREE.SRGBColorSpace;
  fachadaTex.wrapS = THREE.RepeatWrapping;
  fachadaTex.wrapT = THREE.RepeatWrapping;

  // caixa com vertex colors e UVs de fachada: laterais repetem a textura na
  // escala do mundo (janelas de tamanho constante); topo/baixo colapsam num
  // texel liso. comJanelas=false colapsa TUDO (toldo, base, telhado…).
  function caixa(w: number, h: number, d: number, x: number, z: number, corHex: number, opts?: { comJanelas?: boolean; topoEscuro?: boolean; yBase?: number }) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const cor = new THREE.Color(corHex);
    const teto = cor.clone().multiplyScalar(opts?.topoEscuro === false ? 1 : 0.72);
    const cores: number[] = [];
    const pos = geo.getAttribute('position');
    const normal = geo.getAttribute('normal');
    for (let i = 0; i < pos.count; i++) {
      const usar = normal.getY(i) > 0.5 ? teto : cor;
      cores.push(usar.r, usar.g, usar.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cores, 3));
    const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
    // ordem das faces do BoxGeometry: +x, -x, +y, -y, +z, -z (4 vértices cada)
    const escalas: Array<[number, number] | null> = [
      [d / 4, h / 3], [d / 4, h / 3], null, null, [w / 4, h / 3], [w / 4, h / 3],
    ];
    for (let f = 0; f < 6; f++) {
      const esc = opts?.comJanelas ? escalas[f] : null;
      for (let vtx = 0; vtx < 4; vtx++) {
        const i = f * 4 + vtx;
        if (esc) uv.setXY(i, uv.getX(i) * esc[0], uv.getY(i) * esc[1]);
        else uv.setXY(i, 0.03, 0.03); // texel liso
      }
    }
    geo.translate(x, (opts?.yBase ?? 0) + h / 2, z);
    // ExtrudeGeometry (telhado) é não-indexada — todo o merge precisa casar
    return geo.toNonIndexed();
  }

  function porta(x: number, z: number, frenteZ: number) {
    const geo = new THREE.PlaneGeometry(1.4, 2.2);
    const cores: number[] = [];
    const cor = new THREE.Color(COR_PORTA);
    for (let i = 0; i < 4; i++) cores.push(cor.r, cor.g, cor.b);
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cores, 3));
    geo.translate(x, 1.1, frenteZ);
    return geo.toNonIndexed();
  }

  function disco(raio: number, x: number, y: number, z: number, corHex: number, rotY = 0) {
    const geo = new THREE.CircleGeometry(raio, 20);
    const cor = new THREE.Color(corHex);
    const cores: number[] = [];
    for (let i = 0; i < geo.getAttribute('position').count; i++) cores.push(cor.r, cor.g, cor.b);
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cores, 3));
    if (rotY) geo.rotateY(rotY);
    geo.translate(x, y, z);
    return geo.toNonIndexed();
  }

  function telhado(w: number, d: number, altura: number, x: number, z: number, yBase: number) {
    const forma = new THREE.Shape();
    forma.moveTo(-w / 2, 0);
    forma.lineTo(w / 2, 0);
    forma.lineTo(0, altura);
    forma.closePath();
    const geo = new THREE.ExtrudeGeometry(forma, { depth: d, bevelEnabled: false });
    const cor = new THREE.Color(COR_TELHADO);
    const cores: number[] = [];
    for (let i = 0; i < geo.getAttribute('position').count; i++) cores.push(cor.r, cor.g, cor.b);
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cores, 3));
    const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.03, 0.03);
    geo.translate(x, yBase, z - d / 2);
    return geo;
  }

  // ----- varre a grade -----
  for (let r = 0; r < N; r++) {
    for (let q = 0; q < N; q++) {
      const sim = mapa[r][q];
      const cx = loteCentro(q);
      const cz = loteCentro(r);
      if (sim === '.') continue;
      // lote atravessado pela BR-101: não constrói (a avenida é dirigível)
      if (naFaixaDaAvenida(cx, cz, TALUDE_BASE + 4.5) && sim !== 'D' && !porSimbolo.get(sim)) continue;
      if (sim === 'T') {
        const nArv = 4 + ((r * 5 + q) % 3);
        for (let a = 0; a < nArv; a++) {
          const axz: [number, number] = [cx + ((a * 37 + r * 13) % 14) - 7, cz + ((a * 53 + q * 17) % 14) - 7];
          if (!naFaixaDaAvenida(axz[0], axz[1], 2)) arvores.push(axz);
        }
        continue;
      }
      if (sim === 'D') {
        geosConstrucoes.push(caixa(16, 7, 14, cx, cz - 2, 0xc9b458, { comJanelas: true }));
        geosConstrucoes.push(caixa(17, 1.2, 15, cx, cz - 2, 0x8a8578));
        geosDetalhes.push(porta(cx, cz, cz + 5.01));
        aabbs.push({ minX: cx - 8.5, maxX: cx + 8.5, minZ: cz - 9.5, maxZ: cz + 5.5 });
        sombras.push([cx - 8.5, cz - 9.5, 17, 15]);
        zonas.set('D', { x: cx, z: cz + 14, destino: null });
        continue;
      }
      const destino = porSimbolo.get(sim);
      if (destino) {
        if (sim === 's') {
          const cxa = (w: number, h: number, d: number, dx: number, dz: number, cor: number, opts?: { comJanelas?: boolean; topoEscuro?: boolean; yBase?: number }) =>
            caixa(d, h, w, cx - dz, cz + dx, cor, opts);
          geosConstrucoes.push(cxa(11, 5.2, 10, 0, -3, 0xf0efe9));
          geosConstrucoes.push(cxa(11.6, 2.4, 1.2, 0, 1.7, destino.cor, { yBase: 4.4 }));
          geosConstrucoes.push(cxa(11.6, 0.2, 1.3, 0, 1.7, 0xf5f5f5, { yBase: 6.8, topoEscuro: false }));
          geosConstrucoes.push(cxa(1.2, 2.4, 7, 5.6, -2, destino.cor, { yBase: 4.4 }));
          geosConstrucoes.push(cxa(1.3, 0.2, 7, 5.6, -2, 0xf5f5f5, { yBase: 6.8, topoEscuro: false }));
          geosConstrucoes.push(cxa(12.4, 0.55, 3, 0, 2.6, 0xc9a349, { yBase: 2.7, topoEscuro: false }));
          geosConstrucoes.push(cxa(9.5, 2.2, 0.3, 0, 2.1, 0x2c3f52, { yBase: 0.25 }));
          geosConstrucoes.push(cxa(2.6, 2.1, 0.14, 0.6, 2.3, 0x7fb8d8, { yBase: 0.3, topoEscuro: false }));
          geosConstrucoes.push(cxa(13.6, 0.14, 7.4, 0, 5.9, 0xb8b4a8, { topoEscuro: false }));
          [-4.5, -1.5, 1.5, 4.5].forEach((dx) => {
            geosConstrucoes.push(cxa(0.18, 0.03, 2.6, dx, 8.2, 0xf5f5f5, { yBase: 0.16, topoEscuro: false }));
          });
          geosConstrucoes.push(cxa(1.6, 6.4, 1, 5.8, 3, destino.cor));
          geosConstrucoes.push(cxa(2.2, 1, 1.8, -2.5, -5, 0xb9bec7, { yBase: 5.2 }));
          geosConstrucoes.push(cxa(0.9, 0.7, 0.8, -5.6, -4, 0xb9bec7, { yBase: 3.4 }));
          geosConstrucoes.push(cxa(0.9, 0.7, 0.8, -5.6, -1.5, 0xb9bec7, { yBase: 3 }));
          geosConstrucoes.push(cxa(0.9, 0.7, 0.8, -5.6, -6.5, 0xb9bec7, { yBase: 2.6 }));
          geosDetalhes.push(disco(0.85, cx - 2.31, 5.6, cz - 2.6, 0xffffff, -Math.PI / 2));
          geosDetalhes.push(disco(0.34, cx - 2.33, 5.6, cz - 2.6, 0xc9a349, -Math.PI / 2));
          geosDetalhes.push(disco(0.55, cx - 3.51, 5.2, cz + 5.8, 0xffffff, -Math.PI / 2));
          aabbs.push({ minX: cx - 3.4, maxX: cx + 8, minZ: cz - 6, maxZ: cz + 6 });
          aabbs.push({ minX: cx - 3.5, maxX: cx - 2.5, minZ: cz + 5, maxZ: cz + 6.6 });
          sombras.push([cx - 3.4, cz - 6, 11.4, 12]);
          sombras.push([cx - 3.5, cz + 5, 1, 1.6]);
        } else {
          geosConstrucoes.push(caixa(11, 6, 10, cx, cz - 3, destino.cor, { comJanelas: true }));
          geosConstrucoes.push(caixa(12, 1, 2.4, cx, cz + 2.2, 0xffffff, { topoEscuro: false }));
          geosDetalhes.push(porta(cx, cz, cz + 2.01));
          aabbs.push({ minX: cx - 6, maxX: cx + 6, minZ: cz - 8, maxZ: cz + 3.4 });
          sombras.push([cx - 6, cz - 8, 12, 11]);
        }
        const zona = sim === 's' ? { x: cx - 14, z: cz, destino } : { x: cx, z: cz + 14, destino };
        zonas.set(sim, zona);
        if (distAvenida(zona.x, zona.z) < TALUDE_BASE + 1 && !pertoDeVao(projAvenida(zona.x, zona.z), 0)) {
          console.warn('[entrega-turbo] zona de "' + destino.rotulo + '" colada no aterro da BR — ajuste o mapa');
        }
        continue;
      }
      if (sim === 'H') {
        // casa do bairro: corpo pastel + telhado de duas águas + porta
        const seed = r * 17 + q * 5;
        const corCasa = PALETA_CASAS[seed % PALETA_CASAS.length];
        geosConstrucoes.push(caixa(7.4, 3, 7.4, cx, cz, corCasa, { comJanelas: true }));
        geosConstrucoes.push(telhado(8, 8, 2.1, cx, cz, 3)); // o helper já centraliza em z
        geosDetalhes.push(porta(cx + 1.6, cz, cz + 3.72));
        aabbs.push({ minX: cx - 3.9, maxX: cx + 3.9, minZ: cz - 3.9, maxZ: cz + 3.9 });
        sombras.push([cx - 3.9, cz - 3.9, 7.8, 7.8]);
        continue;
      }
      // prédio: mais alto no CENTRO (leste da avenida), mais baixo a oeste
      const seed = r * 31 + q * 7;
      const centro = cx > ax1 + avDirX * ((cz - az1) / avDirZ || 0);
      const h1 = centro ? 9 + (seed % 8) : 6 + (seed % 3);
      const cor1 = PALETA_PREDIOS[seed % PALETA_PREDIOS.length];
      geosConstrucoes.push(caixa(13, h1, 13, cx - 2, cz - 2, cor1, { comJanelas: true }));
      geosDetalhes.push(porta(cx - 2, cz, cz - 2 + 6.51));
      aabbs.push({ minX: cx - 8.5, maxX: cx + 4.5, minZ: cz - 8.5, maxZ: cz + 4.5 });
      sombras.push([cx - 8.5, cz - 8.5, 13, 13]);
      if (seed % 3 === 0) {
        const h2 = 5 + (seed % 4);
        geosConstrucoes.push(caixa(6, h2, 6, cx + 5.5, cz + 4, PALETA_PREDIOS[(seed + 3) % PALETA_PREDIOS.length], { comJanelas: true }));
        aabbs.push({ minX: cx + 2.5, maxX: cx + 8.5, minZ: cz + 1, maxZ: cz + 7 });
        sombras.push([cx + 2.5, cz + 1, 6, 6]);
      }
    }
  }

  // ----- BR-101 elevada: aterros entre vãos + tabuleiros + pilares -----
  const anguloBR = Math.atan2(avDirX, avDirZ);
  const perpX = -avDirZ;
  const perpZ = avDirX;
  const ASFALTO = new THREE.Color(0x4a4d55);
  const GRAMA_TALUDE = new THREE.Color(0x6ea44f);
  const CONCRETO = new THREE.Color(0xb9bcc2);

  // seção trapezoidal do aterro (x = perpendicular, y = altura)
  function aterro(t0: number, t1: number) {
    const s = new THREE.Shape();
    s.moveTo(-TALUDE_BASE, 0);
    s.lineTo(TALUDE_BASE, 0);
    s.lineTo(avenida.largura / 2, ALT_BR);
    s.lineTo(-avenida.largura / 2, ALT_BR);
    s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: t1 - t0, bevelEnabled: false });
    // vertex colors por altura: talude gramado, pista de asfalto
    const pos = geo.getAttribute('position');
    const cores: number[] = [];
    for (let i = 0; i < pos.count; i++) {
      const c = pos.getY(i) > ALT_BR - 0.6 ? ASFALTO : GRAMA_TALUDE;
      cores.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cores, 3));
    const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.03, 0.03);
    geo.rotateY(anguloBR);
    const [sx, sz] = pontoAvenida(t0);
    geo.translate(sx, 0, sz);
    return geo;
  }

  // caixa rotacionada no ângulo da BR (tabuleiro, mureta, pilar)
  function caixaBR(w: number, h: number, comp: number, tCentro: number, perpOff: number, yCentro: number, cor: THREE.Color) {
    const geo = new THREE.BoxGeometry(w, h, comp);
    const cores: number[] = [];
    for (let i = 0; i < geo.getAttribute('position').count; i++) cores.push(cor.r, cor.g, cor.b);
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cores, 3));
    const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.03, 0.03);
    geo.rotateY(anguloBR);
    const [cxp, czp] = pontoAvenida(tCentro);
    geo.translate(cxp + perpX * perpOff, yCentro, czp + perpZ * perpOff);
    return geo.toNonIndexed();
  }

  {
    const tIni = -8;
    const tFim = avLen + 8;
    let cursor = tIni;
    vaos.forEach((tv) => {
      const a = tv - MEIO_VAO;
      const b = tv + MEIO_VAO;
      if (a > cursor) geosConstrucoes.push(aterro(cursor, a)); // extrude já é não-indexado
      // tabuleiro do viaduto sobre o vão + 4 pilares fora da faixa da rua
      geosConstrucoes.push(caixaBR(avenida.largura + 1, 1.2, MEIO_VAO * 2 + 1.6, tv, 0, ALT_BR - 0.6, CONCRETO));
      ([-1, 1] as const).forEach((ladoT) => {
        ([-1, 1] as const).forEach((ladoP) => {
          const tp = tv + ladoT * (MEIO_VAO - 0.8);
          geosConstrucoes.push(caixaBR(1.4, ALT_BR - 1.2, 1.4, tp, ladoP * 4.6, (ALT_BR - 1.2) / 2, CONCRETO));
          const [pxp, pzp] = pontoAvenida(tp);
          const pcx = pxp + perpX * ladoP * 4.6;
          const pcz = pzp + perpZ * ladoP * 4.6;
          aabbs.push({ minX: pcx - 0.8, maxX: pcx + 0.8, minZ: pcz - 0.8, maxZ: pcz + 0.8 });
        });
      });
      cursor = b;
    });
    if (cursor < tFim) geosConstrucoes.push(aterro(cursor, tFim));
    // guard-rail contínuo nas duas bordas da pista
    ([-1, 1] as const).forEach((lado) => {
      geosConstrucoes.push(caixaBR(0.35, 0.55, tFim - tIni, (tIni + tFim) / 2, lado * (avenida.largura / 2 - 0.3), ALT_BR + 0.27, CONCRETO));
    });
  }

  // ----- chão: grama, calçadas, ruas, BR-101, sombras e rótulos -----
  const chaoCanvas = document.createElement('canvas');
  chaoCanvas.width = 1024;
  chaoCanvas.height = 1024;
  {
    const g = chaoCanvas.getContext('2d')!;
    const esc = 1024 / TAM;
    const px = (m: number) => (m + TAM / 2) * esc;
    g.fillStyle = '#8fbf5a';
    g.fillRect(0, 0, 1024, 1024);
    g.fillStyle = '#cfc7b8'; // calçadas
    for (let r = 0; r < N; r++) {
      for (let q = 0; q < N; q++) {
        if (mapa[r][q] === '.') continue;
        const lado = (cfg.loteM + 4) * esc;
        g.fillRect(px(loteCentro(q)) - lado / 2, px(loteCentro(r)) - lado / 2, lado, lado);
      }
    }
    g.fillStyle = '#4a4d55'; // ruas da grade
    for (let i = 0; i <= N; i++) {
      const c1 = px(ruaCentro(i) - 4);
      g.fillRect(c1, px(-MEIO), 8 * esc, 2 * MEIO * esc);
      g.fillRect(px(-MEIO), c1, 2 * MEIO * esc, 8 * esc);
    }
    g.strokeStyle = '#e8c84a';
    g.lineWidth = 2;
    g.setLineDash([10, 12]);
    for (let i = 0; i <= N; i++) {
      const cc = px(ruaCentro(i));
      g.beginPath(); g.moveTo(cc, px(-MEIO)); g.lineTo(cc, px(MEIO)); g.stroke();
      g.beginPath(); g.moveTo(px(-MEIO), cc); g.lineTo(px(MEIO), cc); g.stroke();
    }
    g.setLineDash([]);
    // sombra suave do aterro da BR-101 (a rodovia em si é 3D, elevada)
    g.strokeStyle = 'rgba(20, 30, 20, 0.18)';
    g.lineWidth = 20 * esc;
    g.lineCap = 'butt';
    g.beginPath();
    g.moveTo(px(ax1), px(az1));
    g.lineTo(px(ax2), px(az2));
    g.stroke();
    // sombras assadas das construções
    g.fillStyle = 'rgba(30, 40, 30, 0.25)';
    sombras.forEach(([x, z, w, d]) => {
      g.fillRect(px(x) - 8, px(z) + 8, w * esc, d * esc);
    });
  }
  const chaoTex = new THREE.CanvasTexture(chaoCanvas);
  chaoTex.colorSpace = THREE.SRGBColorSpace;
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(TAM, TAM), new THREE.MeshLambertMaterial({ map: chaoTex }));
  chao.rotation.x = -Math.PI / 2;
  scene.add(chao);

  // ----- meshes mesclados -----
  if (geosConstrucoes.length) {
    scene.add(new THREE.Mesh(
      mergeGeometries(geosConstrucoes),
      new THREE.MeshLambertMaterial({ vertexColors: true, map: fachadaTex })
    ));
  }
  if (geosDetalhes.length) {
    scene.add(new THREE.Mesh(mergeGeometries(geosDetalhes), new THREE.MeshBasicMaterial({ vertexColors: true })));
  }

  // ----- árvores instanciadas -----
  if (arvores.length) {
    const tronco = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.3, 0.4, 1.6, 6),
      new THREE.MeshLambertMaterial({ color: 0x8a6242 }),
      arvores.length
    );
    const copa = new THREE.InstancedMesh(
      new THREE.ConeGeometry(1.7, 3.2, 7),
      new THREE.MeshLambertMaterial({ color: 0x4f9e46 }),
      arvores.length
    );
    const m = new THREE.Matrix4();
    arvores.forEach(([x, z], i) => {
      m.makeTranslation(x, 0.8, z);
      tronco.setMatrixAt(i, m);
      m.makeTranslation(x, 3.1, z);
      copa.setMatrixAt(i, m);
      aabbs.push({ minX: x - 0.7, maxX: x + 0.7, minZ: z - 0.7, maxZ: z + 0.7 });
    });
    scene.add(tronco, copa);
  }

  // ----- placas flutuantes (sprite: emoji + rótulo, fonte auto-ajustada) -----
  function fazerPlaca(texto: string, emoji: string) {
    const c = document.createElement('canvas');
    c.width = 320;
    c.height = 96;
    const g = c.getContext('2d')!;
    g.fillStyle = 'rgba(10, 22, 44, 0.85)';
    g.beginPath();
    g.roundRect(4, 4, 312, 88, 18);
    g.fill();
    g.strokeStyle = 'rgba(34, 224, 255, 0.8)';
    g.lineWidth = 4;
    g.stroke();
    g.font = '44px sans-serif';
    g.textAlign = 'center';
    g.fillText(emoji, 48, 64);
    g.fillStyle = '#eaf6ff';
    let fonte = 30;
    g.font = '800 ' + fonte + 'px Verdana, sans-serif';
    while (g.measureText(texto).width > 220 && fonte > 18) {
      fonte -= 2;
      g.font = '800 ' + fonte + 'px Verdana, sans-serif';
    }
    g.fillText(texto, 190, 62);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    sp.scale.set(11, 3.3, 1);
    return sp;
  }
  zonas.forEach((z, sim) => {
    const sp = sim === 'D' ? fazerPlaca('Depósito', '📦') : fazerPlaca(z.destino!.rotulo, z.destino!.emoji);
    if (sim === 's') sp.position.set(z.x + 14, 8, z.z);
    else sp.position.set(z.x, sim === 'D' ? 9.5 : 8, z.z - (sim === 'D' ? 16 : 14));
    scene.add(sp);
  });

  // placas rodoviárias "BR-101" (3D, ao lado de dois viadutos — nada escrito no chão)
  function placaRodovia() {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 64;
    const g = c.getContext('2d')!;
    g.fillStyle = '#1c7a3d';
    g.beginPath();
    g.roundRect(2, 2, 124, 60, 8);
    g.fill();
    g.strokeStyle = '#f4f4f4';
    g.lineWidth = 4;
    g.stroke();
    g.fillStyle = '#fff';
    g.font = '800 26px Verdana, sans-serif';
    g.textAlign = 'center';
    g.fillText('BR-101', 64, 41);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    sp.scale.set(4.2, 2.1, 1);
    return sp;
  }
  [vaos[0], vaos[Math.max(0, vaos.length - 2)]].forEach((tv) => {
    if (tv === undefined) return;
    const [pxp, pzp] = pontoAvenida(tv);
    const sp = placaRodovia();
    sp.position.set(pxp + perpX * 12, 3, pzp + perpZ * 12);
    scene.add(sp);
  });

  function noMaisProximo(x: number, z: number): [number, number] {
    let melhor: [number, number] = [0, 0];
    let dist = Infinity;
    for (let i = 0; i <= N; i++) {
      for (let j = 0; j <= N; j++) {
        const d = Math.abs(ruaCentro(i) - x) + Math.abs(ruaCentro(j) - z);
        if (d < dist) { dist = d; melhor = [i, j]; }
      }
    }
    return melhor;
  }

  function dentroDePredio(x: number, z: number) {
    for (const b of aabbs) {
      if (x > b.minX - 0.6 && x < b.maxX + 0.6 && z > b.minZ - 0.6 && z < b.maxZ + 0.6) return true;
    }
    return false;
  }

  // colisão com o aterro da BR-101 (fora dos vãos de viaduto):
  // devolve a normal perpendicular + penetração pro slide da física
  function colisaoAvenida(x: number, z: number, raio: number) {
    const d = distAvenida(x, z);
    if (d > TALUDE_BASE + raio) return null;
    const t = projAvenida(x, z);
    if (pertoDeVao(t, -0.5)) return null; // embaixo do viaduto: passagem livre
    const [cxp, czp] = pontoAvenida(t);
    let nx = x - cxp;
    let nz = z - czp;
    const len = Math.hypot(nx, nz) || 0.001;
    nx /= len;
    nz /= len;
    // pen com teto: quem "nasce" fundo no aterro (ex.: saiu do vão dirigindo
    // no eixo da BR) é empurrado pra fora em vários frames, sem teleporte
    return { nx, nz, pen: Math.min(TALUDE_BASE + raio - d, 0.45) };
  }

  // volume de terra do talude (pro anti-clip da câmera): topo em ALT_BR na
  // pista, descendo linear até 0 na borda da base
  function dentroDeAterro(x: number, z: number, y: number) {
    const d = distAvenida(x, z);
    if (d > TALUDE_BASE) return false;
    if (pertoDeVao(projAvenida(x, z), -0.5)) return false;
    const topo = Math.min(ALT_BR, (ALT_BR * (TALUDE_BASE - d)) / (TALUDE_BASE - avenida.largura / 2));
    return y < topo;
  }

  function sobViaduto(x: number, z: number) {
    return distAvenida(x, z) < avenida.largura / 2 + 2 && pertoDeVao(projAvenida(x, z), 0);
  }

  return {
    zonas, aabbs, N, MEIO, loteCentro, ruaCentro, noMaisProximo, dentroDePredio, colisaoAvenida,
    dentroDeAterro, sobViaduto,
    avenidaInfo: {
      altura: ALT_BR,
      comprimento: avLen,
      dir: [avDirX, avDirZ],
      perp: [perpX, perpZ],
      ponto: pontoAvenida,
    },
  };
}
