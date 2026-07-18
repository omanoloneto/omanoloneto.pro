// Winpup — 1º animal do jogo. Bolinha peluda (mas QUADRADA, como tudo aqui)
// com capacete dourado; flutua, vagueia devagar e solta lã de dia. A lã cai
// como bloco não-sólido (id 21) e some quando o jogador passa por cima
// (coleta = recurso). Modelo = caixas merged com vertexColor (1 draw call),
// igual boneco.ts. MeshBasicMaterial (cena sem luz, SwiftShader).
//
// Multiplayer: SÓ o anfitrião simula (wander/drop usam Math.random — em duas
// máquinas divergiria). O anfitrião publica as posições no blackboard `bichos`
// do poll; os visitantes só interpolam pra lá. A coleta roda em todo cliente
// (lê o mundo local, que já está sincronizado).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32 } from '../../lib/rng';
import { DIA_S } from './ceu';
import type { BichoRede, Contexto, Mob } from './tipos';

const LA = 21;

interface Winpup {
  grupo: THREE.Group;
  x: number; y: number; z: number; // posição do centro do corpo
  yaw: number;
  ox: number; oz: number; // origem do passeio
  alvoX: number; alvoZ: number;
  trocaMs: number; // quando repensar o destino
  dropMs: number; // quando soltar a próxima lã
  fase: number; // offset do bob (dessincroniza os bichos)
  // interpolação do visitante (alvo vindo da rede)
  rx: number; ry: number; rz: number; ryaw: number;
}

// ----- modelo (uma geometria, compartilhada pelos 3 Winpups) -----
function parte(w: number, h: number, d: number, x: number, y: number, z: number, cor: THREE.Color): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  const n = g.attributes.position.count;
  const cores = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { cores[i * 3] = cor.r; cores[i * 3 + 1] = cor.g; cores[i * 3 + 2] = cor.b; }
  g.setAttribute('color', new THREE.BufferAttribute(cores, 3));
  return g;
}

function geometriaWinpup(): THREE.BufferGeometry {
  const creme = new THREE.Color('#e9e1c6');
  const cremeF = new THREE.Color('#d8cca6'); // fur mais escuro
  const ouro = new THREE.Color('#c9a227');
  const ouroClaro = new THREE.Color('#e6c65a');
  const olho = new THREE.Color('#d8463a');
  const pupila = new THREE.Color('#2a1410');

  // frente = -Z (yaw 0 olha pra -Z, igual boneco/câmera)
  const p: THREE.BufferGeometry[] = [
    parte(0.72, 0.6, 0.72, 0, 0, 0, creme), // corpo cubo
    // capacete dourado cobrindo topo + testa
    parte(0.8, 0.34, 0.78, 0, 0.28, 0, ouro),
    parte(0.8, 0.08, 0.8, 0, 0.11, 0, ouroClaro), // aba/brilho do capacete
    // fur: cubinhos saltando atrás/cima (a "juba" peluda)
    parte(0.16, 0.16, 0.16, -0.16, 0.16, 0.38, cremeF),
    parte(0.16, 0.16, 0.16, 0.16, 0.16, 0.38, cremeF),
    parte(0.16, 0.16, 0.16, 0, 0.26, 0.4, cremeF),
    parte(0.14, 0.14, 0.14, -0.28, 0.02, 0.32, cremeF),
    parte(0.14, 0.14, 0.14, 0.28, 0.02, 0.32, cremeF),
    parte(0.13, 0.13, 0.13, 0, -0.02, 0.42, cremeF),
    // olhos vermelhos na frente
    parte(0.13, 0.15, 0.05, -0.16, -0.04, -0.37, olho),
    parte(0.13, 0.15, 0.05, 0.16, -0.04, -0.37, olho),
    parte(0.05, 0.06, 0.04, -0.16, -0.04, -0.39, pupila),
    parte(0.05, 0.06, 0.04, 0.16, -0.04, -0.39, pupila),
    // pézinhos
    parte(0.12, 0.1, 0.12, -0.16, -0.34, -0.02, cremeF),
    parte(0.12, 0.1, 0.12, 0.16, -0.34, -0.02, cremeF),
  ];
  const geo = mergeGeometries(p)!;
  p.forEach((g) => g.dispose());
  return geo;
}

export function criarMob(ctx: Contexto): Mob {
  const { cfg, mundo } = ctx;
  const B = cfg.bichos;
  const { SX, SZ } = cfg.mundo;
  const material = new THREE.MeshBasicMaterial({ vertexColors: true });
  const geo = geometriaWinpup();
  const vivos: Winpup[] = [];
  let tempoMs = 0;
  let coletaMs = 0;
  let despawnMs = 0;
  const dropped = new Map<number, number>();

  const woolKey = (x: number, y: number, z: number) => x + z * SX + y * SX * SZ;

  // altura do chão sólido em (x,z) — pra flutuar acompanhando o relevo
  const chao = (x: number, z: number) =>
    mundo.chaoMaisAlto(Math.floor(x), Math.floor(z));

  function hoverY(x: number, z: number): number {
    return chao(x, z) + 1 + B.altura;
  }

  function limpar() {
    // a geometria é compartilhada pelos 3 Winpups (não dispõe aqui; ela vive
    // toda a sessão) — só tira os grupos da cena
    for (const w of vivos) ctx.scene.remove(w.grupo);
    vivos.length = 0;
  }

  function novo(x: number, z: number, rng: () => number): Winpup {
    const grupo = new THREE.Group();
    grupo.add(new THREE.Mesh(geo, material)); // geometria compartilhada
    ctx.scene.add(grupo);
    const y = hoverY(x, z);
    grupo.position.set(x, y, z);
    return {
      grupo, x, y, z, yaw: rng() * Math.PI * 2,
      ox: x, oz: z, alvoX: x, alvoZ: z,
      trocaMs: 0, dropMs: 1500 + rng() * 4000,
      fase: rng() * Math.PI * 2,
      rx: x, ry: y, rz: z, ryaw: 0,
    };
  }

  function nascer(seed: number) {
    limpar();
    tempoMs = 0;
    dropped.clear();
    // lã de save antigo (sem timestamp) ganha TTL cheio a partir de agora
    for (let y = 1; y < cfg.mundo.SY; y++)
      for (let z = 0; z < SZ; z++)
        for (let x = 0; x < SX; x++)
          if (mundo.obter(x, y, z) === LA) dropped.set(woolKey(x, y, z), B.woolDespawnMs);
    const rng = mulberry32((seed ^ 0x7712bb) >>> 0);
    let tentativas = 0;
    while (vivos.length < B.quantos && tentativas < 400) {
      tentativas++;
      const x = 6 + Math.floor(rng() * (SX - 12)) + 0.5;
      const z = 6 + Math.floor(rng() * (SZ - 12)) + 0.5;
      const h = chao(x, z);
      // nasce só sobre grama seca (id 1) — não no mar nem na areia da praia
      if (mundo.obter(Math.floor(x), h, Math.floor(z)) !== 1) continue;
      vivos.push(novo(x, z, rng));
    }
  }

  // conta tufos de lã perto de (cx,cz) — evita floodar o chão
  function laPerto(cx: number, cz: number, surf: number): number {
    let n = 0;
    for (let dz = -5; dz <= 5; dz++) {
      for (let dx = -5; dx <= 5; dx++) {
        if (mundo.obter(cx + dx, surf + 1, cz + dz) === LA) n++;
      }
    }
    return n;
  }

  function soltarLa(w: Winpup) {
    const cx = Math.floor(w.x);
    const cz = Math.floor(w.z);
    const surf = chao(cx, cz);
    if (surf < 1) return; // fora do mundo/no mar fundo
    // só sobre chão sólido "de verdade" e com ar em cima
    if (mundo.obter(cx, surf + 1, cz) !== 0) return;
    if (laPerto(cx, cz, surf) >= B.maxLaPerto) return;
    mundo.definir(cx, surf + 1, cz, LA); // vira bloco → sincroniza sozinho
    dropped.set(woolKey(cx, surf + 1, cz), tempoMs + B.woolDespawnMs);
  }

  function despawnWool() {
    for (const [key, expiresMs] of dropped) {
      if (tempoMs < expiresMs) continue;
      const x = key % SX;
      const z = Math.floor(key / SX) % SZ;
      const y = Math.floor(key / (SX * SZ));
      if (mundo.obter(x, y, z) === LA) mundo.definir(x, y, z, 0);
      dropped.delete(key);
    }
  }

  // simulação (anfitrião/solo): wander + bob + drop de dia
  function simular(dt: number) {
    const dtMs = dt * 1000;
    const deDia = ctx.ceu.tempo() < DIA_S; // dropa só de dia
    for (const w of vivos) {
      // repensa o destino de vez em quando
      if (tempoMs >= w.trocaMs) {
        const ang = Math.random() * Math.PI * 2;
        const r = Math.random() * B.raioPasseio;
        w.alvoX = Math.max(2, Math.min(SX - 2, w.ox + Math.cos(ang) * r));
        w.alvoZ = Math.max(2, Math.min(SZ - 2, w.oz + Math.sin(ang) * r));
        w.trocaMs = tempoMs + B.trocaAlvoMin + Math.random() * (B.trocaAlvoMax - B.trocaAlvoMin);
      }
      // caminha rumo ao alvo
      const dx = w.alvoX - w.x;
      const dz = w.alvoZ - w.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.05) {
        const passo = Math.min(dist, B.passeio * dt);
        w.x += (dx / dist) * passo;
        w.z += (dz / dist) * passo;
        w.yaw = Math.atan2(-dx, -dz); // olha pra onde vai (-Z na frente → atan2(-dx,-dz))
      }
      w.y = hoverY(w.x, w.z);
      // solta lã
      if (deDia && tempoMs >= w.dropMs) {
        soltarLa(w);
        w.dropMs = tempoMs + B.larguraDropMin + Math.random() * (B.larguraDropMax - B.larguraDropMin);
      } else if (!deDia) {
        // à noite não acumula "dívida" de drop: reagenda pra frente
        w.dropMs = Math.max(w.dropMs, tempoMs + 4000);
      }
      posicionar(w, w.x, w.y, w.z, w.yaw);
    }
  }

  // coloca o grupo com o bob senoidal por cima da posição lógica
  function posicionar(w: Winpup, x: number, y: number, z: number, yaw: number) {
    const bob = Math.sin(tempoMs / 1000 * Math.PI * 2 * B.bobHz + w.fase) * B.bobAmp;
    w.grupo.position.set(x, y + bob, z);
    w.grupo.rotation.y = yaw;
  }

  // visitante: interpola suave rumo à posição da rede
  function seguirRede(dt: number) {
    const k = 1 - Math.exp(-dt * 5);
    for (const w of vivos) {
      const dx = w.rx - w.x, dy = w.ry - w.y, dz = w.rz - w.z;
      if (dx * dx + dy * dy + dz * dz > 64) { w.x = w.rx; w.y = w.ry; w.z = w.rz; }
      else { w.x += dx * k; w.y += dy * k; w.z += dz * k; }
      let dyaw = w.ryaw - w.yaw;
      dyaw = ((dyaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
      w.yaw += dyaw * k;
      posicionar(w, w.x, w.y, w.z, w.yaw);
    }
  }

  // coleta (todo cliente): passar por cima da lã recolhe como recurso.
  // Só as células que o CORPO do jogador ocupa (pé + joelho) — o raio
  // apertado torna raro dois jogadores colherem o mesmo tufo. NOTA co-op:
  // sem árbitro no servidor, se dois pisarem no MESMO tufo na mesma janela
  // de poll ambos ganham +1 (a remoção do bloco converge, mas o item é
  // local). Aceito de propósito: lã é recurso cosmético e finito (o Winpup
  // limita o drop), então a "duplicação" no máximo é generosa, nunca farm.
  function coletar() {
    const j = ctx.jogador;
    const meia = 0.32; // meia-largura do corpo
    const x0 = Math.floor(j.x - meia), x1 = Math.floor(j.x + meia);
    const z0 = Math.floor(j.z - meia), z1 = Math.floor(j.z + meia);
    const y0 = Math.floor(j.y), y1 = Math.floor(j.y + 1);
    let n = 0;
    for (let y = y0; y <= y1; y++)
      for (let z = z0; z <= z1; z++)
        for (let x = x0; x <= x1; x++)
          if (mundo.obter(x, y, z) === LA) { mundo.definir(x, y, z, 0); n++; }
    if (n > 0) {
      ctx.edicao.ganharItemPublico(LA, n); // 1 concessão agregada (guard tira da hotbar)
      ctx.audio.somSalvo();
      ctx.ui.mostrarToast(n > 1 ? '🧶 Peguei ' + n + ' lãs!' : '🧶 Peguei lã!', 'ok', 1200);
    }
  }

  return {
    nascer,
    passo(dt, simularBichos) {
      tempoMs += dt * 1000;
      if (simularBichos) {
        despawnMs += dt * 1000;
        if (despawnMs >= 1000) { despawnMs = 0; despawnWool(); }
      }
      if (!vivos.length) return;
      if (simularBichos) simular(dt);
      else seguirRede(dt);
      // coleta throttled (~8×/s): barato e suficiente pra "passar por cima"
      coletaMs += dt * 1000;
      if (coletaMs >= 120) { coletaMs = 0; coletar(); }
    },
    atualizarRede(bichos) {
      for (const b of bichos) {
        const w = vivos[b.i];
        if (!w) continue;
        w.rx = b.x; w.ry = b.y; w.rz = b.z; w.ryaw = b.yaw;
      }
    },
    estadoRede(): BichoRede[] {
      return vivos.map((w, i) => ({
        i, x: +w.x.toFixed(2), y: +w.y.toFixed(2), z: +w.z.toFixed(2), yaw: +w.yaw.toFixed(2),
      }));
    },
    limpar,
    quantos: () => vivos.length,
  };
}
