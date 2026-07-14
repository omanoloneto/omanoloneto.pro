// Física arcade: aceleração por pedal (nos dois modos), esterço dependente
// de velocidade, arrasto, cerca da borda e colisão círculo×AABB com slide.
import type { Contexto } from './tipos';

export function criarFisica(ctx: Contexto) {
  return {
    passo(dt: number) {
      const { truck, input, cfg, estado, mundo } = ctx;
      const vmax = estado.modo === 'facil' ? cfg.vmaxFacil : cfg.vmaxNormal;
      // pedal manual nos DOIS modos (Fácil só é mais manso e sem prazo)
      if (input.acel && !input.re) {
        truck.v = Math.min(vmax, truck.v + cfg.aceleracao * dt);
      } else if (input.re) {
        if (truck.v > 0.3) truck.v = Math.max(0, truck.v - cfg.freio * dt);
        else truck.v = Math.max(-cfg.vmaxRe, truck.v - cfg.aceleracao * dt);
      } else {
        truck.v -= truck.v * cfg.arrasto * dt;
        if (Math.abs(truck.v) < 0.05) truck.v = 0;
      }
      // esterço (escala com velocidade, aperta em alta, inverte em ré)
      const steer = (input.esq ? 1 : 0) - (input.dir ? 1 : 0);
      if (steer && Math.abs(truck.v) > 0.1) {
        truck.heading +=
          steer * cfg.esterco *
          Math.min(1, Math.abs(truck.v) / 3) *
          (1 / (1 + 0.06 * Math.abs(truck.v))) *
          Math.sign(truck.v) * dt;
      }
      truck.x += Math.sin(truck.heading) * truck.v * dt;
      truck.z += Math.cos(truck.heading) * truck.v * dt;
      // cerca da borda
      truck.x = Math.max(-mundo.MEIO + 2, Math.min(mundo.MEIO - 2, truck.x));
      truck.z = Math.max(-mundo.MEIO + 2, Math.min(mundo.MEIO - 2, truck.z));
      // colisão com slide (nunca trava — empurra pra fora pela normal)
      const r = cfg.raioColisao;
      const registrarBatida = () => {
        const agora = performance.now();
        if (Math.abs(truck.v) > 2 && agora - truck.ultimaBatidaMs > cfg.batidaCooldownMs) {
          truck.ultimaBatidaMs = agora;
          truck.squashAte = agora + 90;
          truck.v *= cfg.batidaFreio;
          ctx.audio.somBatida();
          if (estado.pedido) estado.pedido.bateu = true;
        }
      };
      for (const b of mundo.aabbs) {
        const px = Math.max(b.minX, Math.min(truck.x, b.maxX));
        const pz = Math.max(b.minZ, Math.min(truck.z, b.maxZ));
        const dx = truck.x - px;
        const dz = truck.z - pz;
        const d2 = dx * dx + dz * dz;
        if (d2 < r * r) {
          const d = Math.sqrt(d2) || 0.001;
          truck.x += (dx / d) * (r - d);
          truck.z += (dz / d) * (r - d);
          registrarBatida();
        }
      }
      // talude da BR-101 elevada (livre só embaixo dos viadutos)
      const talude = mundo.colisaoAvenida(truck.x, truck.z, r);
      if (talude) {
        truck.x += talude.nx * talude.pen;
        truck.z += talude.nz * talude.pen;
        registrarBatida();
      }
      ctx.caminhao.atualizarVisual(dt, steer);
    },
  };
}
