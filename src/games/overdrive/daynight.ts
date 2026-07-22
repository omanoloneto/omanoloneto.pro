import * as THREE from 'three';
import type { Ctx, DayNight } from './types';

export function createDayNight(ctx: Ctx): DayNight {
  const C = ctx.cfg.ciclo;
  const K = ctx.cfg.cores;
  const cycle = C.diaS + C.noiteS;
  const nightSky = new THREE.Color(K.ceu);
  const daySky = new THREE.Color(K.ceuDia);
  const nightFog = new THREE.Color(K.neblina);
  const dayFog = new THREE.Color(K.neblinaDia);
  let t = 0;

  function discSprite(inner: string, outer: string, name: string, scale: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const g = canvas.getContext('2d')!;
    const grad = g.createRadialGradient(32, 32, 5, 32, 32, 30);
    grad.addColorStop(0, inner);
    grad.addColorStop(0.55, outer);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(canvas);
    ctx.textures[name] = tex;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, fog: false, depthWrite: false }));
    sprite.scale.set(scale, scale, 1);
    sprite.visible = false;
    ctx.scene.add(sprite);
    return sprite;
  }
  const sun = discSprite('#fff6d0', '#ffc94d', 'sol', 110);
  const moon = discSprite('#f4f6ff', '#96a0c8', 'lua', 64);

  function smooth(a: number): number {
    const x = Math.max(0, Math.min(1, a));
    return x * x * (3 - 2 * x);
  }
  function dayness(): number {
    const h = C.transicaoS;
    const up = smooth((t - C.noiteS) / (2 * h));
    const down = smooth((t - (cycle - 2 * h)) / (2 * h));
    return up * (1 - down);
  }

  function apply() {
    const k = dayness();
    (ctx.scene.background as THREE.Color).copy(nightSky).lerp(daySky, k);
    const fog = ctx.scene.fog as THREE.Fog;
    fog.color.copy(nightFog).lerp(dayFog, k);
    fog.near = K.neblinaPerto + (K.neblinaPertoDia - K.neblinaPerto) * k;
    fog.far = K.neblinaLonge + (K.neblinaLongeDia - K.neblinaLonge) * k;
    const tint = 1 + (C.claridadeDia - 1) * k;
    for (const m of ctx.city.tintables) m.color.setScalar(tint);
    ctx.city.nightGlow.color.setScalar(1 - 0.5 * k);
    ctx.city.nightDecals.opacity = 1 - k;
    const cam = ctx.camera.position;
    const place = (s: THREE.Sprite, p: number, alpha: number) => {
      const a = Math.PI * Math.max(0, Math.min(1, p));
      s.position.set(cam.x - Math.cos(a) * 340, 26 + Math.sin(a) * 190, cam.z - 150);
      (s.material as THREE.SpriteMaterial).opacity = alpha;
      s.visible = alpha > 0.02;
    };
    place(sun, (t - C.noiteS) / C.diaS, k);
    const tn = t < C.noiteS ? t : t - cycle;
    place(moon, tn / C.noiteS, 1 - k);
  }
  apply();

  return {
    step(dt: number) {
      t = (t + dt) % cycle;
      apply();
    },
    set(tt: number) {
      t = ((tt % cycle) + cycle) % cycle;
      apply();
    },
    info() {
      return { t, k: dayness(), fase: (t < C.noiteS ? 'noite' : 'dia') as 'noite' | 'dia' };
    },
  };
}
