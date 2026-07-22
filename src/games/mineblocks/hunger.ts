import type { Ctx, Hunger } from './types';

export function createHunger(ctx: Ctx): Hunger {
  const F = ctx.cfg.fome;
  let pointMs = 0;
  let starveMs = 0;
  let pulseMs = 0;

  function starving(): boolean {
    return ctx.state.fome <= 0;
  }

  function isWaterColumn(x: number, z: number): boolean {
    const top = ctx.world.highestGround(x, z);
    return ctx.byId(ctx.world.get(x, top + 1, z)).render === 'agua';
  }

  function respawn() {
    const { SX, SZ } = ctx.cfg.mundo;
    let x = Math.floor(SX / 2);
    let z = Math.floor(SZ / 2);
    for (let i = 0; i < 24; i++) {
      const rx = 8 + Math.floor(Math.random() * (SX - 16));
      const rz = 8 + Math.floor(Math.random() * (SZ - 16));
      if (isWaterColumn(rx, rz)) continue;
      x = rx;
      z = rz;
      break;
    }
    ctx.player.x = x + 0.5;
    ctx.player.z = z + 0.5;
    ctx.physics.settle();
  }

  function die() {
    if (ctx.ui.isPanelOpen()) ctx.ui.closeTopPanel();
    ctx.state.inventory.fill(0);
    ctx.ui.updateCounts();
    ctx.state.fome = F.max;
    pointMs = 0;
    starveMs = 0;
    pulseMs = 0;
    ctx.ui.updateHunger();
    respawn();
    ctx.ui.flashHurt();
    ctx.audio.soundGhost();
    ctx.ui.showToast('💀 Você desmaiou de fome! Perdeu a mochila e acordou num lugar aleatório…', 'err', 4600);
    ctx.ui.announce('Você desmaiou de fome, perdeu os itens da mochila e acordou num lugar aleatório.');
    ctx.save.schedule();
  }

  function autoEat() {
    const inv = ctx.state.inventory;
    const eaten: string[] = [];
    let guard = 0;
    while (ctx.state.fome <= F.comeEm && guard++ < 40) {
      const food = F.comidas.find((c) => (inv[c.id] || 0) > 0);
      if (!food) break;
      inv[food.id]--;
      ctx.state.fome = Math.min(F.max, ctx.state.fome + food.recupera);
      eaten.push(ctx.byId(food.id).nome);
    }
    if (!eaten.length) return;
    starveMs = 0;
    pulseMs = 0;
    ctx.ui.updateCounts();
    ctx.ui.updateHunger();
    ctx.audio.soundSaved();
    ctx.ui.showToast(eaten.length > 1
      ? '🍽️ Nham! Você comeu ' + eaten.length + ' petiscos da mochila!'
      : '🍽️ Nham! Você comeu ' + eaten[0] + ' da mochila!', 'ok', 2400);
    ctx.ui.announce('Você comeu ' + eaten.join(' e ') + ' e recuperou fome.');
    ctx.save.schedule();
  }

  function step(dt: number) {
    autoEat();
    const ms = dt * 1000;
    if (!starving()) {
      pointMs += ms;
      while (pointMs >= F.msPorPonto && ctx.state.fome > 0) {
        pointMs -= F.msPorPonto;
        ctx.state.fome--;
        ctx.ui.updateHunger();
        ctx.save.schedule();
        if (ctx.state.fome === F.avisoPontos) {
          ctx.ui.showToast('🍗 Sua fome está acabando!', 'info', 2600);
          ctx.ui.announce('Sua fome está acabando!');
        }
        if (ctx.state.fome === 0) {
          starveMs = 0;
          pulseMs = F.danoIntervaloMs;
          ctx.ui.showToast('😵 Você está fraco de fome — mal consegue andar!', 'err', 3400);
          ctx.ui.announce('Você está fraco de fome e anda devagar!');
        }
      }
      return;
    }
    starveMs += ms;
    pulseMs += ms;
    if (pulseMs >= F.danoIntervaloMs) {
      pulseMs = 0;
      ctx.ui.flashHurt();
      ctx.audio.soundScare();
    }
    if (starveMs >= F.msAteMorrer) die();
  }

  function reset() {
    pointMs = 0;
    starveMs = 0;
    pulseMs = 0;
    ctx.ui.updateHunger();
  }

  return { step, reset, starving };
}
