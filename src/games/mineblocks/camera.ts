// Câmera em primeira pessoa: só aplica posição do olho + yaw/pitch.
// Sem head-bob (enjoo em criança não). Overlay azul quando o olho
// está debaixo d'água.
import type { Contexto, Camera3 } from './tipos';

export function criarCamera(ctx: Contexto): Camera3 {
  const { camera, jogador, mundo, porId } = ctx;
  camera.rotation.order = 'YXZ';
  let dentroDagua = false;

  return {
    passo() {
      const olhoY = jogador.y + ctx.cfg.jogador.olho;
      camera.position.set(jogador.x, olhoY, jogador.z);
      camera.rotation.y = jogador.yaw;
      camera.rotation.x = jogador.pitch;
      const agua =
        porId(mundo.obter(Math.floor(jogador.x), Math.floor(olhoY), Math.floor(jogador.z))).render === 'agua';
      if (agua !== dentroDagua) {
        dentroDagua = agua;
        ctx.ui.els.aguaOverlay.hidden = !agua;
      }
    },
  };
}
