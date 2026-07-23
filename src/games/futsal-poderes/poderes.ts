import * as THREE from 'three';
import type { Ctx, Jogador } from './tipos';

export function ativarPoder(
  ctx: Ctx,
  jog: Jogador,
  agora: number,
  chutarForte: (j: Jogador, forca: number, especial: boolean) => void,
): boolean {
  const P = ctx.cfg.poder;
  if (jog.energia < P.custo) return false;
  const tipo = jog.crianca.poder.tipo;
  const bola = ctx.mundo.bola;

  if (tipo === 'superChute') {
    if (bola.dono !== jog) return false;
    jog.energia = 0;
    bola.corEspecial = new THREE.Color(jog.crianca.poder.cor);
    bola.especial = 1;
    chutarForte(jog, ctx.cfg.bola.chuteMax * P.superChuteMul, true);
    ctx.audio.poder();
    ctx.ui.toast('⚡ ' + jog.crianca.poder.nome + '!');
    return true;
  }

  if (tipo === 'dribleTurbo') {
    jog.energia = 0;
    jog.dribleAte = agora + P.dribleS;
    ctx.audio.poder();
    ctx.ui.toast('💨 ' + jog.crianca.poder.nome + '!');
    return true;
  }

  if (tipo === 'defesaca') {
    jog.energia = 0;
    jog.dribleAte = agora + P.defesacaS;
    ctx.audio.poder();
    ctx.ui.toast('🧤 ' + jog.crianca.poder.nome + '!');
    return true;
  }

  return false;
}
