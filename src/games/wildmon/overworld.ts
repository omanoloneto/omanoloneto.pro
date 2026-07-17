import type { Contexto, Dir, Overworld } from './tipos';

const DX = [0, 0, -1, 1];
const DY = [1, -1, 0, 0];

export function criarOverworld(ctx: Contexto): Overworld {
  const { cfg, mapa, tiles, npcs, jogador, g } = ctx;
  const T = cfg.tile;
  const ALTO = mapa.length;
  const LARGO = mapa[0].length;

  function tileEm(x: number, y: number) {
    if (x < 0 || y < 0 || x >= LARGO || y >= ALTO) return null;
    return tiles[mapa[y][x]] || null;
  }

  function solido(x: number, y: number): boolean {
    const t = tileEm(x, y);
    if (!t || t.solido) return true;
    if (npcs.some((n) => n.x === x && n.y === y)) return true;
    return false;
  }

  function ordenarCamisa(nome: string): number {
    let h = 0;
    for (const c of nome) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return h % 4;
  }

  function passo(dt: number) {
    const j = jogador;
    if (j.andando) {
      j.progresso += dt * 1000 / cfg.passoMs;
      if (j.progresso >= 1) {
        j.progresso = 0;
        j.andando = false;
        j.px = j.x;
        j.py = j.y;
        ctx.audio.somPasso();
      } else {
        j.px = j.x - DX[j.dir] * (1 - j.progresso);
        j.py = j.y - DY[j.dir] * (1 - j.progresso);
      }
    }
    if (!j.andando && (ctx.input.dx !== 0 || ctx.input.dy !== 0)) {
      const dir: Dir = ctx.input.dy > 0 ? 0 : ctx.input.dy < 0 ? 1 : ctx.input.dx < 0 ? 2 : 3;
      j.dir = dir;
      const nx = j.x + DX[dir];
      const ny = j.y + DY[dir];
      if (!solido(nx, ny)) {
        j.trilha.unshift({ x: j.x, y: j.y, dir });
        j.trilha.length = Math.min(j.trilha.length, 3);
        j.x = nx;
        j.y = ny;
        j.andando = true;
        j.progresso = 0;
      }
    }
  }

  function interagir() {
    const alvoX = jogador.x + DX[jogador.dir];
    const alvoY = jogador.y + DY[jogador.dir];
    const npc = npcs.find((n) => n.x === alvoX && n.y === alvoY);
    if (npc) {
      ctx.audio.somConfirma();
      ctx.ui.abrirDialogo(npc.falas);
    }
  }

  function frameAnda(progresso: number, andando: boolean): number {
    if (!andando) return 0;
    return progresso < 0.5 ? 1 : 0;
  }

  function desenharSprite(nome: string, px: number, py: number, camX: number, camY: number, sombra = false) {
    const sp = ctx.sprites[nome];
    if (!sp || Array.isArray(sp)) return;
    const dx = Math.round(px * T - camX);
    const dy = Math.round(py * T - camY);
    if (sombra) {
      g.fillStyle = 'rgba(20, 40, 24, 0.28)';
      g.beginPath();
      g.ellipse(dx + 8, dy + 14.5, 5, 2, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.drawImage(sp, dx, dy);
  }

  function ehTelhado(x: number, y: number): boolean {
    const t = tileEm(x, y);
    return !!t && t.sprite.startsWith('telhado');
  }

  function desenhar(ts: number) {
    const j = jogador;
    const frameAgua = ctx.motionReduzido ? 0 : ((ts / 600) | 0) % 2;
    let camX = Math.round(j.px * T - cfg.viewW / 2 + T / 2);
    let camY = Math.round(j.py * T - cfg.viewH / 2 + T / 2);
    camX = Math.max(0, Math.min(LARGO * T - cfg.viewW, camX));
    camY = Math.max(0, Math.min(ALTO * T - cfg.viewH, camY));

    const x0 = Math.max(0, (camX / T) | 0);
    const y0 = Math.max(0, (camY / T) | 0);
    for (let y = y0; y <= Math.min(ALTO - 1, y0 + cfg.viewH / T + 1); y++) {
      for (let x = x0; x <= Math.min(LARGO - 1, x0 + cfg.viewW / T + 1); x++) {
        const t = tileEm(x, y);
        if (!t) continue;
        let nome = t.sprite;
        if (nome === 'fonte') {
          const esq = tileEm(x - 1, y)?.sprite !== 'fonte';
          const topo = tileEm(x, y - 1)?.sprite !== 'fonte';
          nome = 'fonte' + (topo ? (esq ? 0 : 1) : esq ? 2 : 3);
        }
        const sp = ctx.sprites[nome];
        const img = Array.isArray(sp) ? sp[frameAgua] : sp;
        if (!img) continue;
        const dx = x * T - camX;
        const dy = y * T - camY;
        g.drawImage(img, dx, dy);
        if (t.sprite.startsWith('telhado')) {
          if (!ehTelhado(x, y - 1)) {
            g.fillStyle = 'rgba(255, 255, 255, 0.35)';
            g.fillRect(dx, dy, T, 2);
          }
          if (!ehTelhado(x, y + 1)) {
            g.fillStyle = 'rgba(30, 20, 10, 0.3)';
            g.fillRect(dx, dy + T - 3, T, 3);
          }
          if (!ehTelhado(x - 1, y)) {
            g.fillStyle = 'rgba(30, 20, 10, 0.22)';
            g.fillRect(dx, dy, 2, T);
          }
          if (!ehTelhado(x + 1, y)) {
            g.fillStyle = 'rgba(30, 20, 10, 0.22)';
            g.fillRect(dx + T - 2, dy, 2, T);
          }
        }
      }
    }

    for (const n of npcs) desenharSprite('npc-' + n.sprite, n.x, n.y, camX, camY, n.sprite !== 'placa');

    const nomesPraDesenhar: Array<[string, number, number]> = [];
    for (const r of ctx.rede.remotos()) {
      const f = frameAnda((ts / 250) % 1, r.andando);
      desenharSprite(r.skin + '-' + r.dir + '-' + f, r.x - DX[r.dir], r.y - DY[r.dir], camX, camY, true);
      desenharSprite('heroi' + ordenarCamisa(r.nome) + '-' + r.dir + '-' + f, r.x, r.y, camX, camY, true);
      nomesPraDesenhar.push([r.nome, r.x, r.y]);
    }

    const alvoSeg = j.trilha[0];
    if (alvoSeg) {
      const origemSeg = j.trilha[1] || alvoSeg;
      const f = frameAnda(j.progresso, j.andando);
      let bx = alvoSeg.x;
      let by = alvoSeg.y;
      if (j.andando) {
        bx = origemSeg.x + (alvoSeg.x - origemSeg.x) * j.progresso;
        by = origemSeg.y + (alvoSeg.y - origemSeg.y) * j.progresso;
      }
      desenharSprite(ctx.estado.starter + '-' + alvoSeg.dir + '-' + f, bx, by, camX, camY, true);
    }

    const fj = frameAnda(j.progresso, j.andando);
    desenharSprite('heroi' + ordenarCamisa(ctx.estado.nome) + '-' + j.dir + '-' + fj, j.px, j.py, camX, camY, true);

    g.font = '7px monospace';
    g.textAlign = 'center';
    for (const [nome, x, y] of nomesPraDesenhar.concat([[ctx.estado.nome, j.px, j.py]])) {
      const tx = Math.round(x * T - camX) + T / 2;
      const ty = Math.round(y * T - camY) - 2;
      g.fillStyle = 'rgba(0,0,0,0.55)';
      g.fillRect(tx - nome.length * 2.4, ty - 7, nome.length * 4.8, 8);
      g.fillStyle = '#fff';
      g.fillText(nome, tx, ty);
    }
  }

  return { passo, desenhar, interagir, solido };
}
