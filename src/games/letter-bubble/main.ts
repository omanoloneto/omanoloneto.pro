import { config, difficulties, levels, keyboardRounds, scoring, textos } from '../../data/bolhas-de-letras';
import type { DifficultyDef, DifficultyId } from '../../data/bolhas-de-letras';
import { createBoard, type Board } from './board';
import { criarRender, type Projectile } from './render';
import { criarAudio } from './audio';
import { criarProgresso } from './progress';
import { criarModoTeclado } from './keyboard';
import { criarUi } from './ui';
import type { Estado, FloatText } from './tipos';

const AIM_MAX = 1.32;

export function iniciarJogo() {
  document.body.classList.add('is-game');
  const ui = criarUi();
  const audio = criarAudio();
  const progresso = criarProgresso(levels.length);
  const render = criarRender(ui.els.tela);

  const porDif: Record<string, number[]> = {};
  levels.forEach((l, i) => {
    if (!porDif[l.difficulty]) porDif[l.difficulty] = [];
    porDif[l.difficulty].push(i);
  });

  const estado: Estado = {
    fase: 'intro',
    modo: 'arcade',
    nivelIdx: 0,
    pontos: 0,
    combo: 0,
    matches: 0,
    shots: 0,
    rodadaTeclado: 0,
  };

  let diff: DifficultyDef = difficulties[0];
  let board: Board = createBoard(diff);
  let current: { letterId: string; lower: boolean } | null = null;
  let next: { letterId: string; lower: boolean } | null = null;
  let currentDesde = 0;
  let proj: Projectile | null = null;
  let aimAngle = 0;
  let floats: FloatText[] = [];
  let matchesNivel = 0;
  let pulseT = 0;
  const teclas = new Set<string>();

  const teclado = criarModoTeclado({
    onAcerto(b, ms) {
      progresso.acerto(b.letterId, ms);
      estado.pontos += scoring.match;
      const p = teclado.board.posDe(b);
      floats.push({ texto: textos.feedbackMatch(b.letterId), x: p.x, y: p.y, t: 0, cor: '#1d7a3c' });
      audio.somMatch();
      audio.falarLetra(b.letterId);
      atualizarHud();
    },
    onErro(b, pressionada, ms) {
      progresso.erro(b.letterId, pressionada, ms);
      audio.somErro();
    },
    onRodadaFeita(r) {
      if (r + 1 < keyboardRounds.length) {
        ui.toast('🎉 Rodada ' + (r + 1) + ' completa!');
        estado.rodadaTeclado = r + 1;
        teclado.start(r + 1);
        atualizarHud();
      } else {
        vitoria('⌨️ Modo Teclado completo!');
      }
    },
  });

  function sample(): { letterId: string; lower: boolean } | null {
    const ops = board.matchable();
    if (!ops.length) return null;
    return ops[Math.floor(Math.random() * ops.length)];
  }

  function valida(op: { letterId: string; lower: boolean } | null): boolean {
    if (!op) return false;
    return board.matchable().some((o) => o.letterId === op.letterId && o.lower === op.lower);
  }

  function refill() {
    if (!valida(current)) {
      current = sample();
      if (current) {
        progresso.apresentada(current.letterId);
        currentDesde = performance.now();
        audio.falarLetra(current.lower ? current.letterId.toLowerCase() : current.letterId);
      }
    }
    if (!valida(next) || (current && next && current.letterId === next.letterId && current.lower === next.lower && board.matchable().length > 1)) {
      next = sample();
    }
    ui.proxima(next ? (next.lower ? next.letterId.toLowerCase() : next.letterId) : null);
  }

  function rotuloNivel(): string {
    const idxs = porDif[levels[estado.nivelIdx].difficulty];
    return diff.emoji + ' ' + (idxs.indexOf(estado.nivelIdx) + 1) + '/' + idxs.length;
  }

  function atualizarHud() {
    if (estado.fase === 'teclado') {
      ui.hud(estado.pontos, '⌨️ ' + (estado.rodadaTeclado + 1) + '/' + keyboardRounds.length, textos.objetivoTeclado);
      ui.proxima(null);
      return;
    }
    const lvl = levels[estado.nivelIdx];
    const obj = lvl.objective === 'matches'
      ? textos.objetivoMatches(lvl.target || 10) + ' (' + matchesNivel + ')'
      : textos.objetivoClear;
    ui.hud(estado.pontos, rotuloNivel(), obj);
  }

  function startLevel(idx: number) {
    estado.nivelIdx = idx;
    const lvl = levels[idx];
    diff = difficulties.find((d) => d.id === lvl.difficulty)!;
    board = createBoard(diff);
    board.generate(lvl, 0xb01a5 + idx * 7919);
    proj = null;
    current = null;
    next = null;
    floats = [];
    matchesNivel = 0;
    estado.combo = 0;
    estado.shots = 0;
    estado.fase = 'jogando';
    aimAngle = 0;
    refill();
    ui.mostrarModal(null);
    atualizarHud();
  }

  function startDifficulty(id: DifficultyId) {
    estado.modo = 'arcade';
    estado.pontos = 0;
    const idxs = porDif[id];
    const pendente = idxs.find((i) => !progresso.done[i]);
    startLevel(pendente !== undefined ? pendente : idxs[0]);
    audio.somClique();
  }

  function startTeclado() {
    estado.modo = 'teclado';
    estado.fase = 'teclado';
    estado.pontos = 0;
    estado.rodadaTeclado = 0;
    proj = null;
    current = null;
    floats = [];
    teclado.start(0);
    ui.mostrarModal(null);
    atualizarHud();
    audio.somClique();
  }

  function vitoria(texto: string) {
    estado.fase = 'vitoria';
    ui.els.winTexto.textContent = texto + ' Você fez ' + estado.pontos + ' pontos!';
    const r = progresso.resumo();
    ui.resumo(r.bons, r.praticar);
    ui.mostrarModal(ui.els.win);
    audio.somVitoria();
  }

  function derrota() {
    estado.fase = 'derrota';
    ui.els.failTexto.textContent = textos.derrota(matchesNivel);
    ui.mostrarModal(ui.els.fail);
  }

  function nivelCompleto() {
    progresso.nivelFeito(estado.nivelIdx);
    const idxs = porDif[levels[estado.nivelIdx].difficulty];
    const pos = idxs.indexOf(estado.nivelIdx);
    audio.somVitoria();
    if (pos + 1 < idxs.length) {
      estado.fase = 'nivelFeito';
      ui.els.nivelDoneTitulo.textContent = '⭐ Nível ' + (pos + 1) + ' completo!';
      ui.mostrarModal(ui.els.nivelDone);
    } else {
      vitoria(diff.emoji + ' Modo ' + diff.nome + ' completo!');
    }
  }

  function shoot() {
    if (estado.fase !== 'jogando' || proj || !current) return;
    const r = board.radius;
    const vel = diff.speed * 60;
    proj = {
      x: config.canvasW / 2,
      y: config.launcherY - r * 0.1,
      vx: Math.sin(aimAngle) * vel,
      vy: -Math.cos(aimAngle) * vel,
      letterId: current.letterId,
      lower: current.lower,
      bounces: 0,
    };
    audio.somLancar();
  }

  function resolver(px: number, py: number) {
    if (!proj) return;
    const { letterId, lower, bounces } = proj;
    proj = null;
    const res = board.attach(px, py, letterId, lower);
    const ms = performance.now() - currentDesde;
    if (res.popped.length) {
      estado.combo++;
      matchesNivel++;
      estado.matches++;
      let ganho = scoring.match;
      ganho += Math.min((estado.combo - 1) * scoring.comboStep, scoring.comboMax);
      if (bounces > 0) ganho += scoring.bankShot;
      if (res.popped.length + 1 >= 3) ganho += scoring.cluster;
      estado.pontos += ganho;
      progresso.acerto(letterId, ms);
      const p = board.posDe(res.bubble);
      floats.push({ texto: textos.feedbackMatch(letterId), x: p.x, y: Math.max(60, p.y), t: 0, cor: '#1d7a3c' });
      audio.somMatch();
      audio.falarLetra(letterId);
    } else {
      estado.combo = 0;
      const viz = res.vizinhos[0];
      progresso.erro(letterId, viz ? viz.letterId : null, ms);
      res.bubble.shakeT = config.shakeMs;
      audio.somErro();
      ui.toast(textos.dicaErro(letterId, !lower), 1800);
    }
    estado.shots++;
    if (diff.descentEveryShots && estado.shots % diff.descentEveryShots === 0) board.descend();
    current = next;
    next = null;
    if (current) {
      progresso.apresentada(current.letterId);
      currentDesde = performance.now();
    }
    const lvl = levels[estado.nivelIdx];
    if (!board.alive().length || (lvl.objective === 'matches' && matchesNivel >= (lvl.target || 10))) {
      nivelCompleto();
      return;
    }
    if (board.lowestY() > config.dangerY) {
      derrota();
      return;
    }
    refill();
    atualizarHud();
  }

  function passo(dt: number) {
    board.update(dt);
    if (estado.fase === 'teclado') teclado.board.update(dt);
    pulseT += dt * 1000;
    for (const f of floats) f.t += dt * 1000;
    floats = floats.filter((f) => f.t < config.feedbackMs);

    if (teclas.has('ArrowLeft')) aimAngle = Math.max(-AIM_MAX, aimAngle - 2.4 * dt);
    if (teclas.has('ArrowRight')) aimAngle = Math.min(AIM_MAX, aimAngle + 2.4 * dt);

    if (proj) {
      const r = board.radius;
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      if (proj.x < r) {
        proj.x = r;
        proj.vx = -proj.vx;
        proj.bounces++;
      } else if (proj.x > config.canvasW - r) {
        proj.x = config.canvasW - r;
        proj.vx = -proj.vx;
        proj.bounces++;
      }
      if (proj.y < 54 + r) {
        resolver(proj.x, 54 + r);
      } else {
        for (const b of board.alive()) {
          const p = board.posDe(b);
          if (Math.hypot(p.x - proj.x, p.y - proj.y) < r * 1.75) {
            resolver(proj.x, proj.y);
            break;
          }
        }
      }
    }
  }

  function desenhar() {
    const emTeclado = estado.fase === 'teclado';
    render.render({
      board: emTeclado ? teclado.board : board,
      fase: estado.fase,
      useColors: !emTeclado && diff.useColors,
      aimAngle,
      guideBounces: diff.guideBounces,
      current: estado.fase === 'jogando' ? current : null,
      proj,
      floats,
      ativa: emTeclado ? teclado.ativa : null,
      pulseT,
    });
  }

  let ultimoTs = 0;
  function loop(ts: number) {
    const dt = Math.min(0.05, (ts - ultimoTs) / 1000 || 0.016);
    ultimoTs = ts;
    if (estado.fase === 'jogando' || estado.fase === 'teclado') passo(dt);
    desenhar();
    requestAnimationFrame(loop);
  }

  function mirarPara(clientX: number, clientY: number) {
    const rect = ui.els.tela.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * config.canvasW;
    const py = ((clientY - rect.top) / rect.height) * config.canvasH;
    const ang = Math.atan2(px - config.canvasW / 2, config.launcherY - py);
    aimAngle = Math.max(-AIM_MAX, Math.min(AIM_MAX, ang));
  }

  ui.els.tela.addEventListener('pointermove', (e) => {
    if (estado.fase === 'jogando') mirarPara(e.clientX, e.clientY);
  });
  ui.els.tela.addEventListener('pointerdown', (e) => {
    if (estado.fase === 'jogando') {
      e.preventDefault();
      mirarPara(e.clientX, e.clientY);
    }
  });
  ui.els.tela.addEventListener('pointerup', (e) => {
    if (estado.fase === 'jogando') {
      mirarPara(e.clientX, e.clientY);
      shoot();
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (estado.fase === 'teclado') {
      const r = teclado.tecla(e.key);
      if (r !== 'ignorada') e.preventDefault();
      return;
    }
    if (estado.fase !== 'jogando') return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      teclas.add(e.key);
      e.preventDefault();
    } else if (e.key === ' ' || e.key === 'Enter') {
      shoot();
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => teclas.delete(e.key));
  window.addEventListener('blur', () => teclas.clear());

  for (const btn of Array.from(document.querySelectorAll('[data-dif]'))) {
    btn.addEventListener('click', () => startDifficulty(btn.getAttribute('data-dif') as DifficultyId));
  }
  ui.els.intro.querySelector('[data-modo-teclado]')?.addEventListener('click', startTeclado);
  document.querySelector('[data-nd-continuar]')?.addEventListener('click', () => {
    const idxs = porDif[levels[estado.nivelIdx].difficulty];
    startLevel(idxs[idxs.indexOf(estado.nivelIdx) + 1]);
    audio.somClique();
  });
  document.querySelector('[data-fail-retry]')?.addEventListener('click', () => {
    startLevel(estado.nivelIdx);
    audio.somClique();
  });
  for (const sel of ['[data-fail-menu]', '[data-win-menu]']) {
    document.querySelector(sel)?.addEventListener('click', () => {
      estado.fase = 'intro';
      ui.badgesNiveis(progresso.done, porDif);
      ui.mostrarModal(ui.els.intro);
      audio.somClique();
    });
  }

  function atualizarMute() {
    ui.els.muteIcon.textContent = audio.mudo ? '🔇' : '🔊';
    ui.els.mute.setAttribute('aria-pressed', String(audio.mudo));
  }
  ui.els.mute.addEventListener('click', () => {
    audio.setMudo(!audio.mudo);
    atualizarMute();
  });
  function atualizarFalar() {
    ui.els.falar.classList.toggle('on', audio.falar);
    ui.els.falar.setAttribute('aria-pressed', String(audio.falar));
  }
  ui.els.falar.addEventListener('click', () => {
    audio.setFalar(!audio.falar);
    atualizarFalar();
    audio.somClique();
  });
  atualizarMute();
  atualizarFalar();

  ui.badgesNiveis(progresso.done, porDif);
  ui.mostrarModal(ui.els.intro);
  atualizarHud();
  requestAnimationFrame(loop);

  (window as any).__bl = {
    estado,
    progresso,
    teclado,
    ui,
    board: () => board,
    fila: () => ({ current, next }),
    setFila(c: { letterId: string; lower: boolean }, n?: { letterId: string; lower: boolean }) {
      current = c;
      next = n || next;
      currentDesde = performance.now();
    },
    mirar(ang: number) {
      aimAngle = ang;
    },
    atirar(ang?: number) {
      if (ang !== undefined) aimAngle = ang;
      shoot();
    },
    projetil: () => proj,
    startDifficulty,
    startLevel,
    startTeclado,
    matchesNivel: () => matchesNivel,
  };
}
