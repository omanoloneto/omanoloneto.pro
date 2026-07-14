// Física do jogador: AABB 0.6×1.8 contra a grade voxel, passo por eixo
// com subpassos anti-tunneling, pulo com coyote, água com empuxo.
// SEM voo — construir alto é pillar-up (pular + colocar embaixo).
import type { Contexto, Fisica } from './tipos';

export function criarFisica(ctx: Contexto): Fisica {
  const { jogador, input, mundo, porId } = ctx;
  const F = ctx.cfg.fisica;
  const J = ctx.cfg.jogador;
  const meia = J.largura / 2;
  const EPS = 0.001;

  // o AABB (px±meia, py..py+altura, pz±meia) toca algum bloco sólido?
  function colide(px: number, py: number, pz: number): boolean {
    const x0 = Math.floor(px - meia);
    const x1 = Math.floor(px + meia);
    const y0 = Math.floor(py);
    const y1 = Math.floor(py + J.altura);
    const z0 = Math.floor(pz - meia);
    const z1 = Math.floor(pz + meia);
    for (let y = y0; y <= y1; y++) {
      for (let z = z0; z <= z1; z++) {
        for (let x = x0; x <= x1; x++) {
          const id = mundo.obter(x, y, z);
          if (id !== 0 && porId(id).solido) return true;
        }
      }
    }
    return false;
  }

  // subpasso ≤ 0.45 garante penetração de no máximo 1 célula: dá pra
  // resolver clampando na fronteira da célula invadida
  function moverEixo(eixo: 0 | 1 | 2, delta: number): boolean {
    if (delta === 0) return false;
    const p = jogador;
    if (eixo === 0) {
      p.x += delta;
      if (!colide(p.x, p.y, p.z)) return false;
      p.x = delta > 0 ? Math.floor(p.x + meia) - meia - EPS : Math.floor(p.x - meia) + 1 + meia + EPS;
      return true;
    }
    if (eixo === 2) {
      p.z += delta;
      if (!colide(p.x, p.y, p.z)) return false;
      p.z = delta > 0 ? Math.floor(p.z + meia) - meia - EPS : Math.floor(p.z - meia) + 1 + meia + EPS;
      return true;
    }
    p.y += delta;
    if (!colide(p.x, p.y, p.z)) return false;
    p.y = delta > 0 ? Math.floor(p.y + J.altura) - J.altura - EPS : Math.floor(p.y) + 1 + EPS;
    return true;
  }

  function passo(dt: number) {
    const p = jogador;
    const { SX, SZ, SY } = ctx.cfg.mundo;

    // ----- intenção de movimento (câmera-relativa) -----
    const digX = (input.dir ? 1 : 0) - (input.esq ? 1 : 0);
    const digY = (input.frente ? 1 : 0) - (input.tras ? 1 : 0);
    let mx = digX + input.joyX;
    let my = digY + input.joyY;
    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }
    const fx = -Math.sin(p.yaw);
    const fz = -Math.cos(p.yaw);
    const rx = Math.cos(p.yaw);
    const rz = -Math.sin(p.yaw);
    const fator = p.naAgua ? F.aguaFator : 1;
    p.vx = (fx * my + rx * mx) * F.andar * fator;
    p.vz = (fz * my + rz * mx) * F.andar * fator;

    // ----- na água? (bloco do tronco) -----
    p.naAgua = porId(mundo.obter(Math.floor(p.x), Math.floor(p.y + 0.9), Math.floor(p.z))).render === 'agua';

    // ----- vertical -----
    if (p.naAgua) {
      p.vy -= F.aguaGravidade * dt;
      if (p.vy < -F.aguaAfundaMax) p.vy = -F.aguaAfundaMax;
      if (input.pulo) p.vy = F.aguaNado; // segurar pulo = nadar pra cima
    } else {
      // pulo com coyote; segurar pulo re-pula ao pousar (criança adora)
      if (input.pulo && (p.noChao || p.coyoteMs > 0)) {
        p.vy = F.pulo;
        p.noChao = false;
        p.coyoteMs = 0;
        ctx.audio.somPulo();
      }
      p.vy -= F.gravidade * dt;
      if (p.vy < -F.quedaTerminal) p.vy = -F.quedaTerminal;
    }

    // ----- mover com subpassos -----
    const desloc = Math.max(Math.abs(p.vx * dt), Math.abs(p.vy * dt), Math.abs(p.vz * dt));
    const n = Math.min(4, Math.max(1, Math.ceil(desloc / F.subpassoMax)));
    const sdt = dt / n;
    let estavaNoChao = p.noChao;
    p.noChao = false;
    for (let i = 0; i < n; i++) {
      const bateuX = moverEixo(0, p.vx * sdt);
      const bateuY = moverEixo(1, p.vy * sdt);
      const bateuZ = moverEixo(2, p.vz * sdt);
      if (bateuY) {
        if (p.vy < 0) {
          p.noChao = true;
          if (p.vy < -12 && !ctx.estado.mudo) ctx.audio.somSplash(); // tumbo de queda alta
        }
        p.vy = 0;
      }
      // pulinho pra sair da água na beirada
      if ((bateuX || bateuZ) && p.naAgua && input.pulo) p.vy = F.aguaPuloBorda;
    }

    // coyote: uma janelinha de pulo depois de sair da beirada
    if (p.noChao) p.coyoteMs = F.coyoteMs;
    else p.coyoteMs = Math.max(0, p.coyoteMs - dt * 1000);
    if (p.noChao && !estavaNoChao && p.naAgua) ctx.audio.somSplash();

    // ----- cerca do mundo -----
    p.x = Math.max(meia + EPS, Math.min(SX - meia - EPS, p.x));
    p.z = Math.max(meia + EPS, Math.min(SZ - meia - EPS, p.z));
    if (p.y < 0) p.y = 0; // paranoia: nunca cai do mundo
    if (p.y + J.altura > SY) { p.y = SY - J.altura; if (p.vy > 0) p.vy = 0; }
  }

  return {
    passo,
    assentar() {
      const p = jogador;
      const topo = mundo.chaoMaisAlto(Math.floor(p.x), Math.floor(p.z));
      p.y = topo + 1 + EPS;
      p.vx = p.vy = p.vz = 0;
      p.noChao = true;
    },
  };
}
