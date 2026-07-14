// Quebrar e colocar blocos, do jeito Minecraft de verdade:
// - quebrar leva TEMPO (segurar golpeia; rachadura cresce no bloco)
// - quebrar rende o DROP no inventário; item novo entra na hotbar
// - colocar consome do slot selecionado da hotbar
// - folhas naturais sem tronco conectado DECAEM em cascata
// - muda plantada vira árvore com o tempo
// Regras de proteção: rocha-mãe não quebra; não coloca dentro do corpo
// (checagem exata — o pillar-up depende dela).
import * as THREE from 'three';
import { brotarArvore } from './geracao';
import type { Alvo, Contexto, Edicao } from './tipos';

const FOLHA_NATURAL = 7;
const FOLHA_COLOCADA = 16;
const TRONCO = 5;

export function criarEdicao(ctx: Contexto): Edicao {
  const { mundo, jogador, porId, cfg } = ctx;
  const meia = cfg.jogador.largura / 2;
  let avisoTimer = 0;
  // relógio de simulação compartilhado: mudas + decay congelam na pausa
  let tempoMs = 0;
  const mudas: Array<{ x: number; y: number; z: number; quandoMs: number }> = [];

  // ----- golpe (quebra com tempo) -----
  let progresso = 0; // ms acumulados no alvo atual
  let alvoGolpe: Alvo | null = null;
  let estaGolpeando = false;
  let ultimoToc = 0;

  // mesh de rachadura: cubo levinho por cima do bloco golpeado,
  // trocando o tile (17→19) conforme o progresso
  const matRachadura = new THREE.MeshBasicMaterial({
    map: ctx.textura.atlas,
    alphaTest: 0.4,
    transparent: true,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    side: THREE.DoubleSide,
  });
  const geoRachadura = new THREE.BoxGeometry(1.001, 1.001, 1.001);
  const rachadura = new THREE.Mesh(geoRachadura, matRachadura);
  rachadura.frustumCulled = false;
  rachadura.visible = false;
  ctx.scene.add(rachadura);
  let tileRachadura = -1;

  function aplicarTileRachadura(tile: number) {
    if (tile === tileRachadura) return;
    tileRachadura = tile;
    const [u0, v0, u1, v1] = ctx.textura.uv(tile);
    const uv = geoRachadura.attributes.uv as THREE.BufferAttribute;
    // BoxGeometry: 6 faces × 4 verts com uv padrão (0..1); remapeia pro tile
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, uv.getX(i) > 0.5 ? u1 : u0, uv.getY(i) > 0.5 ? v1 : v0);
    }
    uv.needsUpdate = true;
  }
  // uv original do Box é 0/1 → o remapeio acima só funciona partindo do
  // padrão; guarda uma cópia pra reprocessar a cada troca de tile
  const uvOriginal = (geoRachadura.attributes.uv as THREE.BufferAttribute).array.slice();
  function trocarTile(tile: number) {
    if (tile === tileRachadura) return;
    (geoRachadura.attributes.uv as THREE.BufferAttribute).array.set(uvOriginal);
    tileRachadura = -1;
    aplicarTileRachadura(tile);
  }

  function esconderRachadura() {
    rachadura.visible = false;
    progresso = 0;
    alvoGolpe = null;
  }

  function avisar(msg: string): boolean {
    const agora = performance.now();
    if (agora - avisoTimer < 1200) return false;
    avisoTimer = agora;
    ctx.ui.mostrarToast(msg, 'info', 1600);
    return true;
  }

  function intersectaJogador(cx: number, cy: number, cz: number): boolean {
    return (
      jogador.x + meia > cx && jogador.x - meia < cx + 1 &&
      jogador.y + cfg.jogador.altura > cy && jogador.y < cy + 1 &&
      jogador.z + meia > cz && jogador.z - meia < cz + 1
    );
  }

  // ----- inventário / hotbar dinâmica -----
  function registrarItemNaHotbar(item: number): boolean {
    const slots = ctx.estado.hotbarSlots;
    if (slots.includes(item)) return true;
    const vazio = slots.indexOf(0);
    if (vazio >= 0) { slots[vazio] = item; return true; }
    return false; // hotbar cheia: item fica só no inventário (E)
  }

  function ganharItem(idQuebrado: number) {
    const inv = ctx.estado.inventario;
    const def = porId(idQuebrado);
    const item = def.drop ?? idQuebrado;
    if (item !== 0) {
      inv[item] = Math.min(999, (inv[item] || 0) + 1);
      if (!registrarItemNaHotbar(item)) {
        avisar('🎒 Hotbar cheia! O item foi pro inventário — aperte E pra ver.');
      }
      ctx.ui.atualizarContagens();
      ctx.ui.anunciar('Pegou ' + porId(item).nome + '! Você tem ' + inv[item] + '.');
    }
    // drop de sorte: das folhas naturais às vezes cai uma muda
    if (def.dropSorte && Math.random() < def.dropSorte.chance) {
      const s = def.dropSorte.id;
      inv[s] = Math.min(999, (inv[s] || 0) + 1);
      registrarItemNaHotbar(s);
      ctx.ui.atualizarContagens();
      ctx.ui.mostrarToast('🌱 Caiu uma ' + porId(s).nome + '! Plante em grama ou terra.', 'ok', 2200);
      ctx.audio.somSalvo();
    }
  }

  // ----- quebrar (comum ao golpe e ao backdoor instantâneo) -----
  function removerBloco(a: Alvo): boolean {
    mundo.definir(a.x, a.y, a.z, 0);
    ganharItem(a.id);
    // flor/muda em cima perdeu o chão? cai junto (e vai pro bolso)
    const acima = mundo.obter(a.x, a.y + 1, a.z);
    if (acima !== 0 && porId(acima).render === 'cruz') {
      mundo.definir(a.x, a.y + 1, a.z, 0);
      ganharItem(acima);
    }
    // tronco/folha removida: folhas vizinhas podem ter ficado órfãs
    if (a.id === TRONCO || a.id === FOLHA_NATURAL || a.id === FOLHA_COLOCADA) {
      enfileirarVizinhas(a.x, a.y, a.z);
    }
    ctx.audio.somQuebrar(a.id);
    ctx.salvar.agendar();
    ctx.fluxo.aoPrimeiroInput();
    return true;
  }

  function podeQuebrar(a: Alvo): boolean {
    if (a.id === 14 || porId(a.id).dureza === undefined) {
      avisar('🪨 Essa rocha do fundo não quebra!');
      return false;
    }
    return true;
  }

  // backdoor de teste/depuração: quebra na hora, sem golpe
  function quebrar(): boolean {
    if (ctx.estado.fase !== 'jogando') return false;
    const a = ctx.mira.alvo();
    if (!a) return false;
    if (!podeQuebrar(a)) return false;
    return removerBloco(a);
  }

  // gameplay real: segurar golpeia até quebrar
  function golpear(dt: number) {
    if (ctx.estado.fase !== 'jogando') { esconderRachadura(); return; }
    estaGolpeando = true;
    const a = ctx.mira.alvo();
    if (!a || !podeQuebrar(a)) { esconderRachadura(); return; }
    // mudou de alvo: progresso zera (Minecraft moderno) e o 1º toc só
    // vem depois de segurar de verdade (flick de olhar não faz croc)
    if (!alvoGolpe || alvoGolpe.x !== a.x || alvoGolpe.y !== a.y || alvoGolpe.z !== a.z) {
      alvoGolpe = a;
      progresso = 0;
      ultimoToc = tempoMs;
    }
    progresso += dt * 1000;
    const dureza = porId(a.id).dureza!;
    if (progresso >= dureza) {
      removerBloco(a); // o som cheio vem daqui — sem toc empilhado
      esconderRachadura();
      return;
    }
    // toc-toc enquanto bate
    if (tempoMs - ultimoToc > 240) {
      ultimoToc = tempoMs;
      ctx.audio.somQuebrar(a.id);
    }
    const frac = progresso / dureza;
    trocarTile(frac < 0.34 ? 17 : frac < 0.67 ? 18 : 19);
    rachadura.position.set(a.x + 0.5, a.y + 0.5, a.z + 0.5);
    // flick de <90ms não pisca rachadura; cruz (flor/muda) não ganha
    // cubo de riscos flutuando em volta
    rachadura.visible = progresso > 90 && porId(a.id).render !== 'cruz';
  }

  function soltarGolpe() {
    estaGolpeando = false;
    esconderRachadura();
  }

  // ----- colocar -----
  function colocar(): boolean {
    if (ctx.estado.fase !== 'jogando') return false;
    const a = ctx.mira.alvo();
    if (!a) return false;
    const id = ctx.estado.hotbarSlots[ctx.estado.sel];
    if (!id) {
      if (avisar('🎒 Esse espaço da hotbar está vazio! Escolha um item no inventário (E).')) ctx.audio.somErro();
      return false;
    }
    const def = porId(id);
    if ((ctx.estado.inventario[id] || 0) <= 0) {
      if (avisar('🎒 Você não tem ' + def.nome + '! Quebre blocos pra ganhar.')) ctx.audio.somErro();
      return false;
    }
    // flor mirada é SUBSTITUÍDA no lugar; bloco normal vai na face
    const alvoDireto = porId(a.id).render === 'cruz';
    const cx = alvoDireto ? a.x : a.x + a.nx;
    const cy = alvoDireto ? a.y : a.y + a.ny;
    const cz = alvoDireto ? a.z : a.z + a.nz;
    const { SX, SZ, tetoConstrucao } = ctx.cfg.mundo;
    if (cx < 0 || cx >= SX || cz < 0 || cz >= SZ || cy < 1 || cy > tetoConstrucao) return false;
    const ocupante = mundo.obter(cx, cy, cz);
    if (ocupante !== 0 && porId(ocupante).render === 'cubo') return false;
    if (ocupante !== 0 && porId(ocupante).render === 'recorte') return false;
    if (def.solido && intersectaJogador(cx, cy, cz)) return false;
    if (def.render === 'cruz' && !porId(mundo.obter(cx, cy - 1, cz)).solido) {
      avisar('🌼 Isso precisa de um chão pra plantar!');
      return false;
    }
    // muda só pega em grama ou terra
    if (id === 15) {
      const solo = mundo.obter(cx, cy - 1, cz);
      if (solo !== 1 && solo !== 2) {
        avisar('🌱 A muda só pega em grama ou terra!');
        return false;
      }
    }
    // colocar em cima de flor devolve a flor pro bolso (nada some do nada)
    if (ocupante !== 0 && porId(ocupante).render === 'cruz') ganharItem(ocupante);
    // o item "folhas" colocado vira FOLHA COLOCADA (nunca decai)
    const idFinal = id === FOLHA_NATURAL ? FOLHA_COLOCADA : id;
    mundo.definir(cx, cy, cz, idFinal);
    ctx.estado.inventario[id]--;
    if (id === 15) {
      const C = ctx.cfg.crescimento;
      mudas.push({ x: cx, y: cy, z: cz, quandoMs: tempoMs + C.minMs + Math.random() * (C.maxMs - C.minMs) });
    }
    ctx.ui.atualizarContagens();
    ctx.audio.somColocar();
    ctx.salvar.agendar();
    ctx.fluxo.aoPrimeiroInput();
    return true;
  }

  // ----- leaf decay: folhas naturais sem tronco conectado caem -----
  const paraChecar: Array<[number, number, number]> = [];
  const decaindo: Array<{ x: number; y: number; z: number; quandoMs: number }> = [];
  const naFila = new Set<number>();
  const agendadas = new Set<number>();
  const chave = (x: number, y: number, z: number) =>
    x + z * cfg.mundo.SX + y * cfg.mundo.SX * cfg.mundo.SZ;
  let mudaDecayToastMs = -Infinity;

  function enfileirarVizinhas(x: number, y: number, z: number) {
    for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      const nz = z + dz;
      if (mundo.obter(nx, ny, nz) !== FOLHA_NATURAL) continue;
      const k = chave(nx, ny, nz);
      if (naFila.has(k)) continue;
      naFila.add(k);
      paraChecar.push([nx, ny, nz]);
    }
  }

  // BFS andando só por folhas naturais (6-conectado, raio ≤ alcance)
  // procurando um tronco encostado em qualquer folha do caminho
  function temTroncoConectado(x0: number, y0: number, z0: number): boolean {
    const alcance = ctx.cfg.decay.alcanceTronco;
    const visitado = new Set<number>([chave(x0, y0, z0)]);
    let borda: Array<[number, number, number]> = [[x0, y0, z0]];
    for (let dist = 0; dist <= alcance; dist++) {
      const proxima: Array<[number, number, number]> = [];
      for (const [x, y, z] of borda) {
        for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const) {
          const nx = x + dx;
          const ny = y + dy;
          const nz = z + dz;
          const id = mundo.obter(nx, ny, nz);
          if (id === TRONCO) return true;
          if (id !== FOLHA_NATURAL) continue;
          const k = chave(nx, ny, nz);
          if (visitado.has(k)) continue;
          visitado.add(k);
          proxima.push([nx, ny, nz]);
        }
      }
      borda = proxima;
      if (!borda.length) break;
    }
    return false;
  }

  function processarDecay(agoraMs: number, tudo: boolean) {
    const D = ctx.cfg.decay;
    // checagens (com orçamento por frame)
    let orcamento = tudo ? Infinity : 30;
    while (paraChecar.length && orcamento-- > 0) {
      const [x, y, z] = paraChecar.shift()!;
      const k = chave(x, y, z);
      naFila.delete(k);
      if (agendadas.has(k)) continue; // já tem queda marcada
      if (mundo.obter(x, y, z) !== FOLHA_NATURAL) continue;
      if (temTroncoConectado(x, y, z)) continue;
      // atraso em lotes de 300ms: quedas agrupadas = menos remesh de chunk
      const atraso = D.atrasoMinMs + Math.random() * (D.atrasoMaxMs - D.atrasoMinMs);
      agendadas.add(k);
      decaindo.push({ x, y, z, quandoMs: tudo ? agoraMs : agoraMs + Math.round(atraso / 300) * 300 });
    }
    // quedas agendadas
    for (let i = decaindo.length - 1; i >= 0; i--) {
      const d = decaindo[i];
      if (!tudo && agoraMs < d.quandoMs) continue;
      decaindo.splice(i, 1);
      agendadas.delete(chave(d.x, d.y, d.z));
      if (mundo.obter(d.x, d.y, d.z) !== FOLHA_NATURAL) continue;
      // re-checa: a criança pode ter recolocado um tronco
      if (temTroncoConectado(d.x, d.y, d.z)) continue;
      mundo.definir(d.x, d.y, d.z, 0);
      enfileirarVizinhas(d.x, d.y, d.z); // cascata
      if (Math.random() < D.chanceMuda) {
        const inv = ctx.estado.inventario;
        inv[15] = Math.min(999, (inv[15] || 0) + 1);
        registrarItemNaHotbar(15);
        ctx.ui.atualizarContagens();
        if (tempoMs - mudaDecayToastMs > 4000) {
          mudaDecayToastMs = tempoMs;
          ctx.ui.mostrarToast('🌱 Caiu uma muda da árvore!', 'ok', 2000);
        }
      }
      ctx.salvar.agendar();
    }
  }

  // ----- relógios (mudas + decay), em tempo de simulação -----
  function passo(dt: number) {
    tempoMs += dt * 1000;
    for (let i = mudas.length - 1; i >= 0; i--) {
      const m = mudas[i];
      if (tempoMs < m.quandoMs) continue;
      mudas.splice(i, 1);
      if (mundo.obter(m.x, m.y, m.z) !== 15) continue; // quebraram a muda
      crescer(m.x, m.y, m.z);
    }
    if (paraChecar.length || decaindo.length) processarDecay(tempoMs, false);
  }

  function crescer(x: number, y: number, z: number) {
    mundo.definir(x, y, z, 0);
    brotarArvore(ctx, x, y - 1, z, Math.random);
    ctx.audio.somSalvo();
    ctx.salvar.agendar();
    const d = Math.hypot(x - jogador.x, z - jogador.z);
    if (d < 24) ctx.ui.mostrarToast('🌳 Sua muda virou uma árvore!', 'ok', 2400);
    ctx.ui.anunciar('Uma muda cresceu e virou árvore!');
  }

  function iniciarMudas() {
    mudas.length = 0;
    paraChecar.length = 0;
    decaindo.length = 0;
    naFila.clear();
    agendadas.clear();
    tempoMs = 0;
    const { SX, SZ, SY } = ctx.cfg.mundo;
    const C = ctx.cfg.crescimento;
    for (let y = 0; y < SY; y++) {
      for (let z = 0; z < SZ; z++) {
        for (let x = 0; x < SX; x++) {
          const id = mundo.obter(x, y, z);
          if (id === 15) {
            mudas.push({ x, y, z, quandoMs: C.minMs + Math.random() * (C.maxMs - C.minMs) });
          } else if (id === FOLHA_NATURAL) {
            // re-arma o decay pós-load: cascata interrompida por um save
            // não congela folhas órfãs no ar (checagem é barata, 30/frame)
            const k = chave(x, y, z);
            naFila.add(k);
            paraChecar.push([x, y, z]);
          }
        }
      }
    }
  }

  return {
    quebrar,
    colocar,
    golpear,
    soltarGolpe,
    golpeando: () => estaGolpeando,
    passo,
    iniciarMudas,
    registrarItemNaHotbar,
    crescerMudasAgora() {
      for (const m of mudas) m.quandoMs = tempoMs;
      passo(0);
    },
    decairAgora() {
      // teste: roda checagens+quedas até secar (cascata completa)
      let guarda = 0;
      while ((paraChecar.length || decaindo.length) && guarda++ < 200) {
        processarDecay(tempoMs, true);
      }
    },
  };
}
