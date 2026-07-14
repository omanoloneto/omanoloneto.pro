// Quebrar e colocar blocos (criativo: instantâneo).
// Regras: rocha-mãe (y=0) não quebra; flor/água são substituíveis;
// não dá pra colocar bloco sólido dentro do próprio corpo — mas a
// checagem é exata de propósito: no ápice do pulo a célula dos pés
// fica livre e o pillar-up (jeito Minecraft de subir) funciona.
import type { Contexto, Edicao } from './tipos';

export function criarEdicao(ctx: Contexto): Edicao {
  const { mundo, jogador, porId, cfg } = ctx;
  const meia = cfg.jogador.largura / 2;
  let avisoTimer = 0;

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

  function quebrar(): boolean {
    if (ctx.estado.fase !== 'jogando') return false;
    const a = ctx.mira.alvo();
    if (!a) return false;
    if (a.id === 14) {
      avisar('🪨 Essa rocha do fundo não quebra!');
      return false;
    }
    mundo.definir(a.x, a.y, a.z, 0);
    // flor em cima perdeu o chão? cai junto
    const acima = mundo.obter(a.x, a.y + 1, a.z);
    if (acima !== 0 && porId(acima).render === 'cruz') mundo.definir(a.x, a.y + 1, a.z, 0);
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
    mundo.definir(cx, cy, cz, id);
    ctx.audio.somColocar();
    ctx.salvar.agendar();
    ctx.fluxo.aoPrimeiroInput();
    return true;
  }

  return {
    quebrar,
    colocar,
    executarModo() {
      if (ctx.estado.modoColocar) colocar();
      else quebrar();
    },
  };
}
