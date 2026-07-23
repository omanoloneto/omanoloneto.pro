import type { Contexto, Dir, Overworld } from './tipos';

const DX = [0, 0, -1, 1];
const DY = [1, -1, 0, 0];

type Bicho = {
  especie: string;
  nome: string;
  traducao: string;
  baseX: number;
  baseY: number;
  raio: number;
  x: number;
  y: number;
  px: number;
  py: number;
  flip: boolean;
  andando: boolean;
  progresso: number;
  proximoMs: number;
};

export function criarOverworld(ctx: Contexto): Overworld {
  const { cfg, tiles, jogador, g } = ctx;
  const T = cfg.tile;
  let bichos: Bicho[] = [];

  const atual = () => ctx.mapas[ctx.estado.mapa];
  const mapa = () => atual().mapa;
  const npcs = () => atual().npcs;

  function tileEm(x: number, y: number) {
    const m = mapa();
    if (x < 0 || y < 0 || x >= m[0].length || y >= m.length) return null;
    return tiles[m[y][x]] || null;
  }

  function solido(x: number, y: number): boolean {
    const t = tileEm(x, y);
    if (!t || t.solido) return true;
    if (npcs().some((n) => n.x === x && n.y === y)) return true;
    if (bichos.some((b) => b.x === x && b.y === y)) return true;
    return false;
  }

  function montarBichos() {
    bichos = atual().selvagens.map((sv, i) => {
      const esp = ctx.especies.find((e) => e.id === sv.especie)!;
      return {
        especie: sv.especie,
        nome: esp.nome.toUpperCase(),
        traducao: esp.traducao,
        baseX: sv.x,
        baseY: sv.y,
        raio: sv.raio,
        x: sv.x,
        y: sv.y,
        px: sv.x,
        py: sv.y,
        flip: false,
        andando: false,
        progresso: 0,
        proximoMs: performance.now() + 800 + i * 700,
      };
    });
  }
  montarBichos();

  function trocarMapa(id: string, x: number, y: number) {
    ctx.estado.mapa = id;
    jogador.x = x;
    jogador.y = y;
    jogador.px = x;
    jogador.py = y;
    jogador.andando = false;
    jogador.progresso = 0;
    jogador.trilha = [];
    montarBichos();
    ctx.salvar.gravar();
    ctx.ui.anunciar(id === 'rota1' ? 'Rota 1 — a mata! Chegue perto dos bichos pra ver o nome deles.' : 'De volta à vila!');
  }

  function ordenarCamisa(nome: string): number {
    let h = 0;
    for (const c of nome) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return h % 4;
  }

  function passoBichos(dt: number, ts: number) {
    for (const b of bichos) {
      if (b.andando) {
        b.px += (b.x - b.px) * Math.min(1, 8 * dt);
        b.py += (b.y - b.py) * Math.min(1, 8 * dt);
        if (Math.abs(b.x - b.px) < 0.04 && Math.abs(b.y - b.py) < 0.04) {
          b.px = b.x;
          b.py = b.y;
          b.andando = false;
        }
        continue;
      }
      if (ts >= b.proximoMs) {
        b.proximoMs = ts + 1200 + Math.random() * 2200;
        const dir = (Math.random() * 4) | 0;
        const nx = b.x + DX[dir];
        const ny = b.y + DY[dir];
        const longeJogador = Math.abs(nx - jogador.x) + Math.abs(ny - jogador.y) > 1;
        if (
          longeJogador &&
          Math.abs(nx - b.baseX) <= b.raio &&
          Math.abs(ny - b.baseY) <= b.raio &&
          !solido(nx, ny) &&
          !(nx === jogador.x && ny === jogador.y)
        ) {
          if (DX[dir] !== 0) b.flip = DX[dir] < 0;
          b.x = nx;
          b.y = ny;
          b.andando = true;
          b.progresso = 0;
        }
      }
    }
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
        const saida = atual().saidas.find((sd) => sd.x === j.x && sd.y === j.y);
        if (saida) {
          trocarMapa(saida.para, saida.px, saida.py);
          return;
        }
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
    passoBichos(dt, performance.now());
  }

  function interagir() {
    if (jogador.andando) return;
    const alvoX = jogador.x + DX[jogador.dir];
    const alvoY = jogador.y + DY[jogador.dir];
    const npc = npcs().find((n) => n.x === alvoX && n.y === alvoY);
    if (npc) {
      ctx.audio.somConfirma();
      ctx.ui.abrirDialogo(npc.falas);
      return;
    }
    const bicho = bichos.find((b) => b.x === alvoX && b.y === alvoY);
    if (bicho) {
      ctx.audio.somConfirma();
      ctx.batalha.iniciar(bicho.especie, (r) => {
        if (r === 'amigo') {
          const i = bichos.indexOf(bicho);
          if (i >= 0) bichos.splice(i, 1);
        }
      });
    }
  }

  function frameAnda(progresso: number, andando: boolean): number {
    if (!andando) return 0;
    return progresso < 0.5 ? 1 : 0;
  }

  function desenhar(ts: number) {
    const j = jogador;
    const m = mapa();
    const LARGO = m[0].length;
    const ALTO = m.length;
    const frameAgua = ctx.motionReduzido ? 0 : ((ts / 600) | 0) % 2;
    let camX = Math.round(j.px * T - cfg.viewW / 2 + T / 2);
    let camY = Math.round(j.py * T - cfg.viewH / 2 + T / 2);
    camX = Math.max(0, Math.min(Math.max(0, LARGO * T - cfg.viewW), camX));
    camY = Math.max(0, Math.min(Math.max(0, ALTO * T - cfg.viewH), camY));

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

    for (const n of npcs()) desenharSpriteSombra('npc-' + n.sprite, n.x, n.y, camX, camY, n.sprite !== 'placa');

    const frameBicho = ctx.motionReduzido ? 0 : ((ts / 320) | 0) % 2;
    for (const b of bichos) {
      const sp = ctx.sprites['selvagem-' + b.especie];
      if (!Array.isArray(sp)) continue;
      const img = sp[frameBicho];
      const dx = Math.round(b.px * T - camX);
      const dy = Math.round(b.py * T - camY);
      g.fillStyle = 'rgba(20, 40, 24, 0.28)';
      g.beginPath();
      g.ellipse(dx + 8, dy + 14.5, 5, 2, 0, 0, Math.PI * 2);
      g.fill();
      if (b.flip) {
        g.save();
        g.translate(dx + 8, 0);
        g.scale(-1, 1);
        g.drawImage(img, -8, dy);
        g.restore();
      } else {
        g.drawImage(img, dx, dy);
      }
    }

    const nomesPraDesenhar: Array<[string, number, number]> = [];
    for (const r of ctx.rede.remotos()) {
      const f = frameAnda((ts / 250) % 1, r.andando);
      desenharSpriteSombra(r.skin + '-' + r.dir + '-' + f, r.x - DX[r.dir], r.y - DY[r.dir], camX, camY, true);
      desenharSpriteSombra('heroi' + ordenarCamisa(r.nome) + '-' + r.dir + '-' + f, r.x, r.y, camX, camY, true);
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
      desenharSpriteSombra(ctx.estado.starter + '-' + alvoSeg.dir + '-' + f, bx, by, camX, camY, true);
    }

    const fj = frameAnda(j.progresso, j.andando);
    desenharSpriteSombra('heroi' + ordenarCamisa(ctx.estado.nome) + '-' + j.dir + '-' + fj, j.px, j.py, camX, camY, true);

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

    for (const b of bichos) {
      const dist = Math.abs(b.x - j.x) + Math.abs(b.y - j.y);
      if (dist > 2) continue;
      const rotulo = b.nome + ' · ' + b.traducao;
      const tx = Math.round(b.px * T - camX) + T / 2;
      const ty = Math.round(b.py * T - camY) - 3;
      g.font = '7px monospace';
      g.fillStyle = 'rgba(10, 25, 12, 0.82)';
      g.fillRect(tx - rotulo.length * 2.4 - 2, ty - 8, rotulo.length * 4.8 + 4, 10);
      g.strokeStyle = 'rgba(255, 210, 63, 0.8)';
      g.strokeRect(tx - rotulo.length * 2.4 - 2, ty - 8, rotulo.length * 4.8 + 4, 10);
      g.fillStyle = '#ffd23f';
      g.fillText(rotulo, tx, ty);
    }
  }

  function ehTelhado(x: number, y: number): boolean {
    const t = tileEm(x, y);
    return !!t && t.sprite.startsWith('telhado');
  }

  function desenharSpriteSombra(nome: string, px: number, py: number, camX: number, camY: number, sombra = false) {
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

  return { passo, desenhar, interagir, solido, trocarMapa };
}
