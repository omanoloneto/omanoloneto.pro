import type { Ctx, Jogador } from './tipos';

export function passoIA(
  ctx: Ctx,
  dt: number,
  chutar: (j: Jogador, forca: number, especial: boolean, alvoX: number, alvoZ: number) => void,
) {
  const { mundo, cfg, estado } = ctx;
  const comp = cfg.campo.comprimento;
  const vaoM = cfg.campo.golVao / 2 + 1;
  const bola = mundo.bola;

  const maisPerto = (time: number): Jogador | null => {
    let best: Jogador | null = null;
    let bd = Infinity;
    for (const j of mundo.jogadores) {
      if (j.time !== time || j.goleiro) continue;
      const d = Math.hypot(j.x - bola.x, j.z - bola.z);
      if (d < bd) { bd = d; best = j; }
    }
    return best;
  };
  const perto0 = maisPerto(0);
  const perto1 = maisPerto(1);

  const irPara = (j: Jogador, tx: number, tz: number, vmax: number) => {
    const dx = tx - j.x;
    const dz = tz - j.z;
    const d = Math.hypot(dx, dz) || 1;
    const k = Math.min(1, dt * 6);
    j.vx += ((dx / d) * vmax - j.vx) * k;
    j.vz += ((dz / d) * vmax - j.vz) * k;
    if (d < 0.6) { j.vx *= 0.5; j.vz *= 0.5; }
    if (Math.hypot(j.vx, j.vz) > 0.3) j.olhar = Math.atan2(j.vx, j.vz);
  };

  const vel = cfg.jogador.velMax * 0.92;
  const velG = cfg.jogador.velGoleiro;

  for (const j of mundo.jogadores) {
    if (j === estado.ativo) continue;
    const golA = j.time === 0 ? comp / 2 : -comp / 2;
    const golD = -golA;

    if (j.goleiro) {
      const tz = Math.max(-vaoM, Math.min(vaoM, bola.z * 0.7));
      const sairX = Math.abs(bola.x - golD) < 12 && bola.dono?.time !== j.time ? golD + Math.sign(golA) * 4 : golD + Math.sign(golA) * 1.5;
      irPara(j, sairX, tz, velG);
      continue;
    }

    const perto = j.time === 0 ? perto0 : perto1;

    if (bola.dono === j) {
      const mira = golA * 0.98;
      const dz = -j.z * 0.4;
      irPara(j, mira, j.z + dz, vel);
      const distX = Math.abs(golA - j.x);
      if (distX < cfg.ia.alcanceChute) {
        const err = (ctx.rng() - 0.5) * cfg.ia.erro * cfg.campo.golVao;
        chutar(j, cfg.bola.chuteMax * 0.85, false, golA, err);
      }
    } else if (j === perto && bola.dono?.time !== j.time) {
      irPara(j, bola.x, bola.z, vel);
    } else {
      const hx = j.baseX * 0.55 + bola.x * 0.4;
      const hz = j.baseZ * 0.55 + bola.z * 0.35;
      irPara(j, hx, hz, vel * 0.82);
    }
  }
}
