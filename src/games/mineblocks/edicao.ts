// Quebrar e colocar blocos (criativo: instantâneo).
// Regras: rocha-mãe (y=0) não quebra; flor/água são substituíveis;
// não dá pra colocar bloco sólido dentro do próprio corpo — mas a
// checagem é exata de propósito: no ápice do pulo a célula dos pés
// fica livre e o pillar-up (jeito Minecraft de subir) funciona.
import { brotarArvore } from './geracao';
import type { Contexto, Edicao } from './tipos';

export function criarEdicao(ctx: Contexto): Edicao {
  const { mundo, jogador, porId, cfg } = ctx;
  const meia = cfg.jogador.largura / 2;
  let avisoTimer = 0;
  // mudas plantadas esperando crescer (tempo de simulação: pausa congela)
  let tempoMs = 0;
  const mudas: Array<{ x: number; y: number; z: number; quandoMs: number }> = [];

  function avisar(msg: string) {
    const agora = performance.now();
    if (agora - avisoTimer < 1200) return;
    avisoTimer = agora;
    ctx.ui.mostrarToast(msg, 'info', 1600);
  }

  function intersectaJogador(cx: number, cy: number, cz: number): boolean {
    return (
      jogador.x + meia > cx && jogador.x - meia < cx + 1 &&
      jogador.y + cfg.jogador.altura > cy && jogador.y < cy + 1 &&
      jogador.z + meia > cz && jogador.z - meia < cz + 1
    );
  }

  // sobrevivência: quebrar rende o DROP do bloco (pedra → pedregulho,
  // grama → terra — estilo Minecraft; drop 0 = nada, ex.: folhas)
  function ganharItem(idQuebrado: number) {
    const inv = ctx.estado.inventario;
    const def = porId(idQuebrado);
    const item = def.drop ?? idQuebrado;
    if (item !== 0) {
      inv[item] = Math.min(999, (inv[item] || 0) + 1);
      ctx.ui.atualizarContagens();
      ctx.ui.anunciar('Pegou ' + porId(item).nome + '! Você tem ' + inv[item] + '.');
    }
    // drop de sorte: das folhas às vezes cai uma muda
    if (def.dropSorte && Math.random() < def.dropSorte.chance) {
      const s = def.dropSorte.id;
      inv[s] = Math.min(999, (inv[s] || 0) + 1);
      ctx.ui.atualizarContagens();
      ctx.ui.mostrarToast('🌱 Caiu uma ' + porId(s).nome + '! Plante em grama ou terra.', 'ok', 2200);
      ctx.audio.somSalvo();
    }
  }

  function quebrar(): boolean {
    if (ctx.estado.fase !== 'jogando') return false;
    const a = ctx.mira.alvo();
    if (!a) return false;
    if (a.id === 14) {
      avisar('🪨 Essa rocha do fundo não quebra!');
      return false;
    }
    mundo.definir(a.x, a.y, a.z, 0);
    ganharItem(a.id);
    // flor em cima perdeu o chão? cai junto (e vai pro bolso também)
    const acima = mundo.obter(a.x, a.y + 1, a.z);
    if (acima !== 0 && porId(acima).render === 'cruz') {
      mundo.definir(a.x, a.y + 1, a.z, 0);
      ganharItem(acima);
    }
    ctx.audio.somQuebrar(a.id);
    ctx.salvar.agendar();
    ctx.fluxo.aoPrimeiroInput();
    return true;
  }

  function colocar(): boolean {
    if (ctx.estado.fase !== 'jogando') return false;
    const a = ctx.mira.alvo();
    if (!a) return false;
    const id = ctx.hotbar[ctx.estado.sel];
    const def = porId(id);
    // sem estoque, sem bloco: quebra uns por aí primeiro!
    if ((ctx.estado.inventario[id] || 0) <= 0) {
      avisar('🎒 Você não tem ' + def.nome + '! Quebre blocos pra ganhar.');
      ctx.audio.somErro();
      return false;
    }
    // flor mirada é SUBSTITUÍDA no lugar; bloco normal vai na face
    // (água nem entra: a mira atravessa ela)
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
    // flor precisa de chão sólido embaixo
    if (def.render === 'cruz' && !porId(mundo.obter(cx, cy - 1, cz)).solido) {
      avisar('🌼 A flor precisa de um chão pra plantar!');
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
    mundo.definir(cx, cy, cz, id);
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

  // relógio das mudas: quando dá a hora (e a célula ainda é muda), brota
  function passo(dt: number) {
    tempoMs += dt * 1000;
    for (let i = mudas.length - 1; i >= 0; i--) {
      const m = mudas[i];
      if (tempoMs < m.quandoMs) continue;
      mudas.splice(i, 1);
      if (mundo.obter(m.x, m.y, m.z) !== 15) continue; // quebraram a muda
      crescer(m.x, m.y, m.z);
    }
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

  // mundo carregado do save: mudas plantadas voltam pro relógio
  function iniciarMudas() {
    mudas.length = 0;
    tempoMs = 0;
    const { SX, SZ, SY } = ctx.cfg.mundo;
    const C = ctx.cfg.crescimento;
    for (let y = 0; y < SY; y++) {
      for (let z = 0; z < SZ; z++) {
        for (let x = 0; x < SX; x++) {
          if (mundo.obter(x, y, z) === 15) {
            mudas.push({ x, y, z, quandoMs: C.minMs + Math.random() * (C.maxMs - C.minMs) });
          }
        }
      }
    }
  }

  return {
    quebrar,
    colocar,
    passo,
    iniciarMudas,
    crescerMudasAgora() {
      // teste/depuração: adianta o relógio de todas as mudas
      for (const m of mudas) m.quandoMs = tempoMs;
      passo(0);
    },
    executarModo() {
      if (ctx.estado.modoColocar) colocar();
      else quebrar();
    },
  };
}
