import type { Ctx, Physics } from './types';

const LADDER = 36;

export function criarFisica(ctx: Ctx): Physics {
  const { player, input, world, byId } = ctx;
  const F = ctx.cfg.fisica;
  const J = ctx.cfg.jogador;
  const halfW = J.largura / 2;
  const EPS = 0.001;

  function collides(px: number, py: number, pz: number): boolean {
    const x0 = Math.floor(px - halfW);
    const x1 = Math.floor(px + halfW);
    const y0 = Math.floor(py);
    const y1 = Math.floor(py + J.altura);
    const z0 = Math.floor(pz - halfW);
    const z1 = Math.floor(pz + halfW);
    for (let y = y0; y <= y1; y++) {
      for (let z = z0; z <= z1; z++) {
        for (let x = x0; x <= x1; x++) {
          const id = world.get(x, y, z);
          if (id !== 0 && byId(id).solido) return true;
        }
      }
    }
    return false;
  }

  function moveAxis(axis: 0 | 1 | 2, delta: number): boolean {
    if (delta === 0) return false;
    const p = player;
    if (axis === 0) {
      p.x += delta;
      if (!collides(p.x, p.y, p.z)) return false;
      p.x = delta > 0 ? Math.floor(p.x + halfW) - halfW - EPS : Math.floor(p.x - halfW) + 1 + halfW + EPS;
      return true;
    }
    if (axis === 2) {
      p.z += delta;
      if (!collides(p.x, p.y, p.z)) return false;
      p.z = delta > 0 ? Math.floor(p.z + halfW) - halfW - EPS : Math.floor(p.z - halfW) + 1 + halfW + EPS;
      return true;
    }
    p.y += delta;
    if (!collides(p.x, p.y, p.z)) return false;
    p.y = delta > 0 ? Math.floor(p.y + J.altura) - J.altura - EPS : Math.floor(p.y) + 1 + EPS;
    return true;
  }

  let kbX = 0;
  let kbZ = 0;

  function step(dt: number) {
    const p = player;
    const { SX, SZ, SY } = ctx.cfg.mundo;

    const digX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const digY = (input.forward ? 1 : 0) - (input.back ? 1 : 0);
    let mx = digX + input.joyX;
    let my = digY + input.joyY;
    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }
    const fx = -Math.sin(p.yaw);
    const fz = -Math.cos(p.yaw);
    const rx = Math.cos(p.yaw);
    const rz = -Math.sin(p.yaw);
    const factor = (p.inWater ? F.aguaFator : 1) * (ctx.state.fome <= 0 ? ctx.cfg.fome.fatorLento : 1);
    p.vx = (fx * my + rx * mx) * F.andar * factor + kbX;
    p.vz = (fz * my + rz * mx) * F.andar * factor + kbZ;
    const kbDecay = Math.exp(-dt * 5);
    kbX *= kbDecay;
    kbZ *= kbDecay;
    if (Math.abs(kbX) < 0.02) kbX = 0;
    if (Math.abs(kbZ) < 0.02) kbZ = 0;

    p.inWater = byId(world.get(Math.floor(p.x), Math.floor(p.y + 0.9), Math.floor(p.z))).render === 'agua';
    const px = Math.floor(p.x);
    const pz = Math.floor(p.z);
    const onLadder = !p.inWater && (
      world.get(px, Math.floor(p.y + 0.1), pz) === LADDER ||
      world.get(px, Math.floor(p.y + 0.9), pz) === LADDER
    );

    if (p.inWater) {
      p.vy -= F.aguaGravidade * dt;
      if (p.vy < -F.aguaAfundaMax) p.vy = -F.aguaAfundaMax;
      if (input.jump) p.vy = F.aguaNado;
    } else if (onLadder) {
      p.vy = input.jump ? F.escadaSobe : -F.escadaDesce;
      p.coyoteMs = 0;
    } else {
      if (input.jump && (p.onGround || p.coyoteMs > 0)) {
        p.vy = F.pulo;
        p.onGround = false;
        p.coyoteMs = 0;
        ctx.audio.soundJump();
      }
      p.vy -= F.gravidade * dt;
      if (p.vy < -F.quedaTerminal) p.vy = -F.quedaTerminal;
    }

    const moved = Math.max(Math.abs(p.vx * dt), Math.abs(p.vy * dt), Math.abs(p.vz * dt));
    const n = Math.min(4, Math.max(1, Math.ceil(moved / F.subpassoMax)));
    const sdt = dt / n;
    const wasOnGround = p.onGround;
    p.onGround = false;
    for (let i = 0; i < n; i++) {
      const hitX = moveAxis(0, p.vx * sdt);
      const hitY = moveAxis(1, p.vy * sdt);
      const hitZ = moveAxis(2, p.vz * sdt);
      if (hitY) {
        if (p.vy < 0) {
          p.onGround = true;
          if (p.vy < -12 && !ctx.state.muted) ctx.audio.soundSplash();
        }
        p.vy = 0;
      }
      if ((hitX || hitZ) && p.inWater && input.jump) p.vy = F.aguaPuloBorda;
    }

    if (p.onGround) p.coyoteMs = F.coyoteMs;
    else p.coyoteMs = Math.max(0, p.coyoteMs - dt * 1000);
    if (p.onGround && !wasOnGround && p.inWater) ctx.audio.soundSplash();

    p.x = Math.max(halfW + EPS, Math.min(SX - halfW - EPS, p.x));
    p.z = Math.max(halfW + EPS, Math.min(SZ - halfW - EPS, p.z));
    if (p.y < 0) p.y = 0;
    if (p.y + J.altura > SY) { p.y = SY - J.altura; if (p.vy > 0) p.vy = 0; }
  }

  return {
    step,
    push(dx: number, dz: number) {
      kbX += dx;
      kbZ += dz;
    },
    settle() {
      const p = player;
      const top = world.highestGround(Math.floor(p.x), Math.floor(p.z));
      p.y = top + 1 + EPS;
      p.vx = p.vy = p.vz = 0;
      p.onGround = true;
    },
  };
}
