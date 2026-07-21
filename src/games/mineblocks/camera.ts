// Câmera em primeira pessoa: só aplica posição do olho + yaw/pitch.
// Sem head-bob (enjoo em criança não). Overlay azul quando o olho
// está debaixo d'água.
import type { Ctx, Camera3 } from './types';

export function criarCamera(ctx: Ctx): Camera3 {
  const { camera, player: jogador, world: mundo, byId: porId } = ctx;
  camera.rotation.order = 'YXZ';
  let dentroDagua = false;

  return {
    step() {
      const olhoY = jogador.y + ctx.cfg.jogador.olho;
      camera.position.set(jogador.x, olhoY, jogador.z);
      camera.rotation.y = jogador.yaw;
      camera.rotation.x = jogador.pitch;
      const agua =
        porId(mundo.get(Math.floor(jogador.x), Math.floor(olhoY), Math.floor(jogador.z))).render === 'agua';
      if (agua !== dentroDagua) {
        dentroDagua = agua;
        ctx.ui.els.waterOverlay.hidden = !agua;
      }
    },
  };
}
