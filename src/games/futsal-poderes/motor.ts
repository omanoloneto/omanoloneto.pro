import type { Ctx, Jogador, Motor } from './tipos';
import { passoIA } from './ia';
import { ativarPoder } from './poderes';

export function criarMotor(ctx: Ctx): Motor {
  const { cfg, mundo, estado, input, ui, audio, cameraPES } = ctx;
  const B = cfg.bola;
  const J = cfg.jogador;
  const comp = cfg.campo.comprimento;
  const larg = cfg.campo.largura;
  const halfX = comp / 2;
  const halfZ = larg / 2;
  const vao = cfg.campo.golVao / 2;
  const bola = mundo.bola;

  let t = 0;
  let segChute = 0;
  let prevChutar = false;
  let prevPoder = false;
  let travaAte = 0;

  const homes = (time: number) => {
    const s = time === 0 ? -1 : 1;
    return [
      { x: s * (halfX - 3), z: 0 },
      { x: s * halfX * 0.55, z: 9 },
      { x: s * halfX * 0.55, z: -9 },
      { x: s * halfX * 0.2, z: 6 },
      { x: s * halfX * 0.2, z: -6 },
    ];
  };

  function posicionar(sacaTime: number) {
    for (const j of mundo.jogadores) {
      const arr = homes(j.time);
      const idx = mundo.jogadores.filter((o) => o.time === j.time).indexOf(j);
      const h = arr[idx];
      j.x = j.baseX = h.x;
      j.z = j.baseZ = h.z;
      j.vx = j.vz = 0;
      j.olhar = j.time === 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    bola.x = 0; bola.z = 0; bola.y = B.raio;
    bola.vx = bola.vy = bola.vz = 0;
    bola.dono = null; bola.ultimoDono = null; bola.especial = 0;
    const sacador = mundo.jogadores.find((j) => j.time === sacaTime && !j.goleiro && Math.abs(j.z) < 7);
    if (sacador) { sacador.x = -Math.sign(homes(sacaTime)[0].x) * 2; sacador.z = 1.5; }
    travaAte = 0;
  }

  function golArea(time: number) {
    return time === 0 ? halfX : -halfX;
  }

  function chutar(j: Jogador, forca: number, especial: boolean, alvoX?: number, alvoZ?: number) {
    let dx: number;
    let dz: number;
    if (alvoX !== undefined && alvoZ !== undefined) {
      dx = alvoX - j.x; dz = alvoZ - j.z;
    } else {
      dx = Math.sin(j.olhar); dz = Math.cos(j.olhar);
    }
    const d = Math.hypot(dx, dz) || 1;
    bola.dono = null;
    bola.ultimoDono = j;
    bola.vx = (dx / d) * forca;
    bola.vz = (dz / d) * forca;
    bola.vy = forca * B.lob;
    if (especial) bola.especial = 1.2;
    travaAte = t + 0.28;
    audio.chute(forca > B.chuteMax);
  }

  function companheiroFrente(j: Jogador): Jogador | null {
    const dir = j.time === 0 ? 1 : -1;
    let best: Jogador | null = null;
    let bd = Infinity;
    for (const o of mundo.jogadores) {
      if (o === j || o.time !== j.time || o.goleiro) continue;
      if (Math.sign(o.x - j.x) !== dir) continue;
      const d = Math.hypot(o.x - j.x, o.z - j.z);
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  }

  function humano(dt: number) {
    let a = estado.ativo;
    if (bola.dono && bola.dono.time === 0 && !bola.dono.goleiro) a = bola.dono;
    else {
      let best: Jogador | null = null;
      let bd = Infinity;
      for (const j of mundo.jogadores) {
        if (j.time !== 0 || j.goleiro) continue;
        const d = Math.hypot(j.x - bola.x, j.z - bola.z);
        if (d < bd) { bd = d; best = j; }
      }
      a = best;
    }
    estado.ativo = a;
    if (!a) return;

    const ix = input.eixoX;
    const iz = input.eixoZ;
    const mag = Math.hypot(ix, iz);
    const drible = a.dribleAte > t ? cfg.poder.dribleMul : 1;
    const vmax = J.velMax * (input.correr ? J.sprintMul : 1) * drible;
    if (mag > 0.12) {
      const nx = ix / mag;
      const nz = iz / mag;
      const k = Math.min(1, dt * 12);
      a.vx += (nx * vmax - a.vx) * k;
      a.vz += (nz * vmax - a.vz) * k;
      a.olhar = Math.atan2(a.vx, a.vz);
    } else {
      const f = Math.exp(-J.atrito * dt);
      a.vx *= f; a.vz *= f;
    }

    if (input.chutar) segChute += dt;
    if (prevChutar && !input.chutar && bola.dono === a) {
      const carga = Math.min(1, segChute / B.cargaS);
      if (segChute < 0.14) {
        const alvo = companheiroFrente(a);
        if (alvo) chutar(a, B.passe, false, alvo.x, alvo.z);
        else chutar(a, B.passe, false);
      } else {
        const gx = golArea(0);
        chutar(a, B.chuteMin + (B.chuteMax - B.chuteMin) * carga, false, gx, bola.z * 0.3);
      }
    }
    if (!input.chutar) segChute = 0;
    prevChutar = input.chutar;

    if (input.poder && !prevPoder) ativarPoder(ctx, a, t, chutar);
    prevPoder = input.poder;
  }

  function integrar(dt: number) {
    for (const j of mundo.jogadores) {
      j.x += j.vx * dt;
      j.z += j.vz * dt;
      const r = J.raio;
      j.x = Math.max(-halfX + r, Math.min(halfX - r, j.x));
      j.z = Math.max(-halfZ + r, Math.min(halfZ - r, j.z));
      j.energia = Math.min(cfg.poder.energiaMax, j.energia + cfg.poder.recargaPorS * dt);
    }
    const js = mundo.jogadores;
    for (let i = 0; i < js.length; i++) {
      for (let k = i + 1; k < js.length; k++) {
        const a = js[i];
        const b = js[k];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const d = Math.hypot(dx, dz);
        const min = J.raio * 2;
        if (d > 0.0001 && d < min) {
          const push = (min - d) / 2;
          const ux = dx / d;
          const uz = dz / d;
          a.x -= ux * push; a.z -= uz * push;
          b.x += ux * push; b.z += uz * push;
        }
      }
    }
  }

  function posse(dt: number) {
    if (t < travaAte) { bola.dono = null; return; }
    let melhor: Jogador | null = null;
    let md = Infinity;
    for (const j of mundo.jogadores) {
      const reach = J.alcanceBola + (j.goleiro && j.dribleAte > t ? cfg.poder.defesacaAlcance : j.goleiro ? 0.6 : 0);
      const d = Math.hypot(j.x - bola.x, j.z - bola.z);
      if (d < reach && d < md) { md = d; melhor = j; }
    }
    if (!melhor) { bola.dono = null; return; }
    if (!bola.dono || (bola.dono.time !== melhor.time && md < J.raio * 1.4) || bola.dono === melhor) {
      bola.dono = melhor;
    }
    const dn = bola.dono;
    const fx = Math.sin(dn.olhar);
    const fz = Math.cos(dn.olhar);
    const off = J.raio + B.raio + 0.35;
    bola.x = dn.x + fx * off;
    bola.z = dn.z + fz * off;
    bola.y = B.raio;
    bola.vx = dn.vx;
    bola.vz = dn.vz;
    bola.vy = 0;
    dn.energia = Math.min(cfg.poder.energiaMax, dn.energia + cfg.poder.ganhoAcao * dt);
  }

  function fisicaBola(dt: number) {
    if (bola.dono) return;
    const f = Math.exp(-B.atrito * dt);
    bola.vx *= f; bola.vz *= f;
    bola.vy -= B.gravidade * dt;
    bola.x += bola.vx * dt;
    bola.y += bola.vy * dt;
    bola.z += bola.vz * dt;
    if (bola.y < B.raio) {
      bola.y = B.raio;
      if (bola.vy < 0) bola.vy = -bola.vy * B.quiqueChao;
      if (Math.abs(bola.vy) < 1) bola.vy = 0;
    }
    if (bola.z > halfZ - B.raio) { bola.z = halfZ - B.raio; bola.vz = -bola.vz * B.quique; audio.quique(); }
    if (bola.z < -halfZ + B.raio) { bola.z = -halfZ + B.raio; bola.vz = -bola.vz * B.quique; audio.quique(); }
    for (const sx of [-1, 1]) {
      const wallX = sx * halfX;
      const passou = sx > 0 ? bola.x > wallX - B.raio : bola.x < wallX + B.raio;
      if (passou && (Math.abs(bola.z) > vao || bola.y > cfg.campo.golAltura)) {
        bola.x = wallX - sx * B.raio;
        bola.vx = -bola.vx * B.quique;
        audio.quique();
      }
    }
    if (bola.especial > 0) {
      bola.especial -= dt;
      mundo.soltarTrail(bola.x, bola.z, bola.corEspecial);
    }
  }

  function checarGol() {
    if (Math.abs(bola.z) < vao && bola.y < cfg.campo.golAltura) {
      if (bola.x > halfX + 0.1) return 0;
      if (bola.x < -halfX - 0.1) return 1;
    }
    return -1;
  }

  function marcarGol(time: number) {
    estado.placar[time]++;
    ui.setPlacar(estado.placar[0], estado.placar[1]);
    audio.gol();
    const nome = ctx.dados[time].nome;
    ui.toast('⚽ GOL dos ' + nome + '!');
    ui.anunciar('Gol! ' + estado.placar[0] + ' a ' + estado.placar[1]);
    estado.golDe = time;
    estado.golAte = t + 1.8;
  }

  return {
    posicionar,
    passo(dt: number) {
      t += dt;
      if (t < estado.golAte) {
        for (const j of mundo.jogadores) { j.vx *= 0.9; j.vz *= 0.9; }
        cameraPES.passo(dt);
        mundo.passoAnim(dt);
        mundo.passoTrail(dt);
        return;
      }
      if (estado.golDe >= 0) {
        posicionar(estado.golDe === 0 ? 1 : 0);
        estado.golDe = -1;
      }

      estado.tempoS -= dt;
      if (estado.tempoS <= 0) { estado.tempoS = 0; ctx.fluxo.fim(); return; }
      ui.setTempo(estado.tempoS);

      humano(dt);
      passoIA(ctx, dt, chutar);
      integrar(dt);
      posse(dt);
      fisicaBola(dt);
      const g = checarGol();
      if (g >= 0) marcarGol(g);

      if (estado.ativo) ui.setPoder(estado.ativo.energia, estado.ativo.crianca.poder.nome, estado.ativo.crianca.poder.cor);

      cameraPES.passo(dt);
      mundo.passoAnim(dt);
      mundo.passoTrail(dt);
    },
  };
}
