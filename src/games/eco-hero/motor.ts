import type { Contexto } from './tipos';

export function criarMotor(ctx: Contexto) {
  const { cfg, estado, heroi: h, input, g } = ctx;
  const T = cfg.tile;
  const F = cfg.fisica;
  const J = cfg.jogador;
  let camX = 0;
  let animMs = 0;

  function solidoRet(x: number, y: number, w: number, alt: number): boolean {
    const x0 = Math.floor(x / T);
    const x1 = Math.floor((x + w - 0.01) / T);
    const y0 = Math.floor(y / T);
    const y1 = Math.floor((y + alt - 0.01) / T);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (ctx.nivel.solidoEm(tx, ty)) return true;
      }
    }
    return false;
  }

  function tocaTile(x: number, y: number, w: number, alt: number, teste: (tx: number, ty: number) => boolean): boolean {
    const x0 = Math.floor(x / T);
    const x1 = Math.floor((x + w - 0.01) / T);
    const y0 = Math.floor(y / T);
    const y1 = Math.floor((y + alt - 0.01) / T);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (teste(tx, ty)) return true;
      }
    }
    return false;
  }

  function danoNoHeroi(knockDir: number) {
    const agora = performance.now();
    if (agora < h.invencivelAte || h.morrendo) return;
    estado.vidas--;
    ctx.ui.flashDano();
    ctx.audio.somDano();
    ctx.ui.atualizarHud();
    if (estado.vidas <= 0) {
      ctx.fluxo.perderVida();
      return;
    }
    h.invencivelAte = agora + J.invencivelMs;
    h.vy = -F.pulo * 0.6;
    h.vx = knockDir * 90;
    ctx.ui.anunciar('Ai! Vidas: ' + estado.vidas + '.');
  }

  function passo(dt: number, ts: number) {
    animMs = ts;
    estado.tempoMs += dt * 1000;

    const alvoVx = (input.dir ? F.correr : 0) - (input.esq ? F.correr : 0);
    if (alvoVx !== 0) {
      h.vx += Math.sign(alvoVx - h.vx) * F.acel * dt;
      if (Math.abs(h.vx) > F.correr) h.vx = Math.sign(h.vx) * F.correr;
      h.olhando = alvoVx > 0 ? 1 : -1;
    } else {
      const antes = Math.sign(h.vx);
      h.vx -= antes * F.atrito * dt;
      if (Math.sign(h.vx) !== antes) h.vx = 0;
    }

    if (input.pulo) {
      h.puloPedidoMs = performance.now();
      input.pulo = false;
    }
    const agora = performance.now();
    if (agora - h.puloPedidoMs < F.bufferPuloMs && agora - h.ultimoChaoMs < F.coyoteMs) {
      h.vy = -F.pulo;
      h.puloPedidoMs = 0;
      h.ultimoChaoMs = 0;
      ctx.audio.somPulo();
    }
    if (!input.puloSegurado && h.vy < -F.pulo * F.puloCorte) {
      h.vy = -F.pulo * F.puloCorte;
    }

    h.vy = Math.min(F.vyMax, h.vy + F.gravidade * dt);

    let nx = h.x + h.vx * dt;
    if (!solidoRet(nx, h.y, J.w, J.h)) {
      h.x = nx;
    } else {
      h.vx = 0;
    }
    h.x = Math.max(0, Math.min(ctx.nivel.largura * T - J.w, h.x));

    let ny = h.y + h.vy * dt;
    h.noChao = false;
    if (!solidoRet(h.x, ny, J.w, J.h)) {
      h.y = ny;
    } else if (h.vy > 0) {
      h.y = Math.floor((ny + J.h) / T) * T - J.h;
      h.vy = 0;
      h.noChao = true;
      h.ultimoChaoMs = performance.now();
    } else {
      h.y = Math.floor(ny / T + 1) * T;
      h.vy = 0;
    }
    if (h.noChao) h.ultimoChaoMs = performance.now();

    if (tocaTile(h.x, h.y + J.h - 4, J.w, 4, ctx.nivel.lodoEm)) {
      danoNoHeroi(-h.olhando);
    }
    if (tocaTile(h.x, h.y + J.h - 2, J.w, 2, ctx.nivel.aguaEm) || h.y > 13 * T) {
      ctx.fluxo.perderVida();
      return;
    }

    for (const c of ctx.nivel.caranguejos) {
      if (c.escondido) continue;
      const cw = cfg.caranguejo.w;
      const nxC = c.x + c.vx * dt;
      const frenteX = c.vx > 0 ? nxC + cw : nxC;
      const txFrente = Math.floor(frenteX / T);
      const tyPe = Math.floor((c.y + cfg.caranguejo.h) / T);
      if (ctx.nivel.solidoEm(txFrente, tyPe - 1) || !ctx.nivel.solidoEm(txFrente, tyPe)) {
        c.vx = -c.vx;
      } else {
        c.x = nxC;
      }
    }

    const agora2 = performance.now();
    for (const c of ctx.nivel.caranguejos) {
      const cw = cfg.caranguejo.w;
      const chC = cfg.caranguejo.h;
      const sobrepoe = h.x < c.x + cw && h.x + J.w > c.x && h.y < c.y + chC && h.y + J.h > c.y;
      if (!sobrepoe) continue;
      if (c.escondido) continue;
      const porCima = h.vy > 0 && h.y + J.h - c.y < 7;
      if (porCima) {
        c.escondido = true;
        h.vy = -F.pulo * 0.55;
        estado.pontos += 50;
        ctx.audio.somStomp();
        ctx.ui.mostrarToast('🦀 O caranguejo se escondeu na casquinha!', 1600);
        ctx.ui.atualizarHud();
      } else if (agora2 >= h.invencivelAte) {
        danoNoHeroi(h.x < c.x ? -1 : 1);
      }
    }

    for (const l of ctx.nivel.lixos) {
      if (l.coletado) continue;
      const dx = h.x + J.w / 2 - l.x;
      const dy = h.y + J.h / 2 - l.y;
      if (Math.abs(dx) < 11 && Math.abs(dy) < 12) {
        l.coletado = true;
        estado.coletados++;
        estado.pontos += cfg.pontos.porLixo;
        ctx.audio.somColeta();
        ctx.ui.atualizarHud();
        if (estado.coletados === estado.totalLixos) {
          estado.lixeiraAberta = true;
          ctx.audio.somLixeira();
          ctx.ui.mostrarToast('🚮 Praia limpa! A lixeira abriu — corre lá!', 3000);
          ctx.ui.anunciar('Você coletou todo o lixo! A lixeira do fim da fase abriu!');
        }
      }
    }

    if (!estado.checkpoint && h.x >= ctx.nivel.checkpointX) {
      estado.checkpoint = true;
      ctx.audio.somCheckpoint();
      ctx.ui.mostrarToast('🚩 Checkpoint!', 1600);
    }

    if (estado.lixeiraAberta) {
      const lx = ctx.nivel.lixeira;
      if (h.x + J.w > lx.x + 2 && h.x < lx.x + 22 && h.y + J.h > lx.y) {
        ctx.fluxo.vitoria();
      }
    }

    const alvoCam = h.x + J.w / 2 - cfg.viewW / 2;
    camX += (alvoCam - camX) * Math.min(1, 8 * dt);
    camX = Math.max(0, Math.min(ctx.nivel.largura * T - cfg.viewW, camX));
  }

  function sprite(nome: string): HTMLCanvasElement {
    const s = ctx.sprites[nome];
    return Array.isArray(s) ? s[0] : s;
  }
  function spriteAnim(nome: string, periodoMs: number): HTMLCanvasElement {
    const s = ctx.sprites[nome];
    if (!Array.isArray(s)) return s;
    const idx = ctx.motionReduzido ? 0 : ((animMs / periodoMs) | 0) % s.length;
    return s[idx];
  }

  function desenhar() {
    g.drawImage(sprite('fundo'), 0, 0);
    const morros = sprite('morros');
    const mx = -((camX * 0.25) % morros.width);
    g.drawImage(morros, mx, 60);
    g.drawImage(morros, mx + morros.width, 60);
    const mar = sprite('mar');
    const mrx = -((camX * 0.45) % mar.width);
    g.drawImage(mar, mrx, 118);
    g.drawImage(mar, mrx + mar.width, 118);

    const cx = Math.round(camX);
    for (const d of ctx.nivel.decoracoes) {
      const sp = sprite(d.tipo);
      if (d.x - cx > -48 && d.x - cx < cfg.viewW + 48) g.drawImage(sp, d.x - cx, d.y);
    }

    const mapa = ctx.fase1.mapa as readonly string[];
    const tx0 = Math.max(0, (cx / T) | 0);
    const tx1 = Math.min(ctx.nivel.largura - 1, tx0 + cfg.viewW / T + 1);
    for (let ty = 0; ty < mapa.length; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const ch = mapa[ty][tx];
        let sp: HTMLCanvasElement | null = null;
        if (ch === '#') sp = sprite('areia');
        else if (ch === '=') sp = sprite('plataforma');
        else if (ch === '~') sp = spriteAnim('agua', 500);
        else if (ch === 'L') sp = spriteAnim('lodo', 600);
        if (sp) g.drawImage(sp, tx * T - cx, ty * T);
      }
    }

    const flutu = ctx.motionReduzido ? 0 : Math.sin(animMs / 300) * 2;
    for (const l of ctx.nivel.lixos) {
      if (l.coletado) continue;
      const sp = sprite(l.tipo);
      g.drawImage(sp, Math.round(l.x - sp.width / 2 - cx), Math.round(l.y - sp.height / 2 + flutu));
    }

    const band = sprite(estado.checkpoint ? 'bandeiraAtiva' : 'bandeira');
    g.drawImage(band, ctx.nivel.checkpointX - cx, 10 * T - 32);

    const lix = sprite(estado.lixeiraAberta ? 'lixeiraAberta' : 'lixeiraFechada');
    g.drawImage(lix, ctx.nivel.lixeira.x - cx, ctx.nivel.lixeira.y);

    for (const c of ctx.nivel.caranguejos) {
      const sp = c.escondido ? sprite('casquinha') : spriteAnim('caranguejo', 240);
      g.drawImage(sp, Math.round(c.x - cx), Math.round(c.y + (c.escondido ? 0 : -2)));
    }

    const pisca = performance.now() < h.invencivelAte && ((performance.now() / 90) | 0) % 2 === 0;
    if (!pisca) {
      const frame = !h.noChao ? 1 : Math.abs(h.vx) > 8 ? (ctx.motionReduzido ? 0 : 1 + (((animMs / 120) | 0) % 2)) : 0;
      const sp = (ctx.sprites.heroi as HTMLCanvasElement[])[frame === 2 ? 2 : frame];
      const dx = Math.round(h.x - 3 - cx);
      const dy = Math.round(h.y + J.h - 16);
      if (h.olhando === -1) {
        g.save();
        g.translate(dx + 8, 0);
        g.scale(-1, 1);
        g.drawImage(sp, -8, dy);
        g.restore();
      } else {
        g.drawImage(sp, dx, dy);
      }
    }
  }

  function resetCamera() {
    camX = Math.max(0, Math.min(ctx.nivel.largura * T - cfg.viewW, h.x - cfg.viewW / 2));
  }

  return { passo, desenhar, resetCamera, danoNoHeroi };
}
