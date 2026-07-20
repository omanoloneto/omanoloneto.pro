import { config, difficulties, levels, keyboardRounds, scoring, textos, temasBg, juice, letters } from '../../data/bolhas-de-letras';
import type { DifficultyDef, DifficultyId } from '../../data/bolhas-de-letras';
import { createBoard, type Board } from './board';
import { criarRender, type Projectile } from './render';
import { criarBackground, type Background } from './backgrounds';
import { criarAudio } from './audio';
import { criarProgresso } from './progress';
import { criarModoTeclado } from './keyboard';
import { criarUi } from './ui';
import type { Estado, FloatText, Particle } from './tipos';

const AIM_MAX = 1.32;

export function iniciarJogo() {
  document.body.classList.add('is-game');
  const ui = criarUi();
  const audio = criarAudio();
  const progresso = criarProgresso(levels.length);
  const render = criarRender(ui.els.tela, ui.els.fundo);

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

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let diff: DifficultyDef = difficulties[0];
  let board: Board = createBoard(diff);
  let current: { letterId: string; lower: boolean } | null = null;
  let next: { letterId: string; lower: boolean } | null = null;
  let currentDesde = 0;
  let proj: Projectile | null = null;
  let aimAngle = 0;
  let floats: FloatText[] = [];
  let particles: Particle[] = [];
  let matchesNivel = 0;
  let pulseT = 0;
  let trauma = 0;
  let shakeX = 0;
  let shakeY = 0;
  let recoil = 0;
  let trailAcc = 0;
  let tema = temasBg[0];
  let bg: Background = criarBackground(tema, 1);
  const teclas = new Set<string>();

  const corLetra = new Map<string, string>();
  for (const l of letters) if (l.easyColor) corLetra.set(l.id, l.easyColor);

  function corParticula(letterId: string, useColors: boolean): string {
    if (useColors && corLetra.has(letterId)) return corLetra.get(letterId)!;
    const pal = juice.festivePalette;
    return pal[letterId.charCodeAt(0) % pal.length];
  }

  function novoBg(t: (typeof temasBg)[number], seed: number) {
    tema = t;
    bg = criarBackground(t, seed);
  }

  function addTrauma(v: number) {
    trauma = Math.min(juice.traumaMax, trauma + v);
  }

  function spawnPop(x: number, y: number, cor: string, extra: number) {
    if (reduced) return;
    const n = juice.popShards + extra;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + Math.random() * 0.5;
      const sp = 60 + Math.random() * 150;
      particles.push({
        x, y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - 40,
        life: 0.5 + Math.random() * 0.4,
        maxLife: 0.9,
        r: 2 + Math.random() * 3,
        cor,
        kind: 'shard',
        grav: 520,
        spin: 0,
        ang: 0,
      });
    }
    particles.push({ x, y, vx: 0, vy: 0, life: 0.42, maxLife: 0.42, r: board.radius * 2.4, cor, kind: 'ring', grav: 0, spin: 0, ang: 0 });
  }

  function spawnConfete() {
    if (reduced) return;
    const pal = juice.festivePalette;
    for (let i = 0; i < juice.confete; i++) {
      particles.push({
        x: Math.random() * config.canvasW,
        y: -10 - Math.random() * 60,
        vx: (Math.random() - 0.5) * 80,
        vy: 60 + Math.random() * 120,
        life: 1.6 + Math.random() * 1.2,
        maxLife: 2.8,
        r: 3 + Math.random() * 4,
        cor: pal[i % pal.length],
        kind: 'confete',
        grav: 90,
        spin: (Math.random() - 0.5) * 12,
        ang: Math.random() * Math.PI,
      });
    }
  }

  const teclado = criarModoTeclado({
    onAcerto(b, ms) {
      progresso.acerto(b.letterId, ms);
      estado.pontos += scoring.match;
      const p = teclado.board.posDe(b);
      floats.push({ texto: textos.feedbackMatch(b.letterId), x: p.x, y: p.y, t: 0, cor: '#1d7a3c', grande: false });
      spawnPop(p.x, p.y, corParticula(b.letterId, false), 0);
      addTrauma(juice.traumaMatch);
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
    particles = [];
    trauma = 0;
    matchesNivel = 0;
    estado.combo = 0;
    estado.shots = 0;
    estado.fase = 'jogando';
    aimAngle = 0;
    novoBg(temasBg[idx % temasBg.length], 1 + idx * 131);
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
    particles = [];
    trauma = 0;
    novoBg('galaxy', 777);
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
    spawnConfete();
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
    spawnConfete();
    addTrauma(juice.traumaCluster);
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
      trail: [],
    };
    recoil = 1;
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
      const cluster = res.popped.length + 1 >= 3;
      for (const pb of [res.bubble, ...res.popped]) {
        const pp = board.posDe(pb);
        spawnPop(pp.x, pp.y, corParticula(letterId, diff.useColors), cluster ? juice.clusterExtra : 0);
      }
      const p = board.posDe(res.bubble);
      const fy = Math.max(60, p.y);
      floats.push({ texto: textos.feedbackMatch(letterId), x: p.x, y: fy, t: 0, cor: '#1d7a3c', grande: false });
      if (estado.combo >= 2) {
        floats.push({ texto: 'Combo x' + estado.combo + '!', x: config.canvasW / 2, y: 150, t: 0, cor: '#e8620e', grande: true });
      }
      addTrauma(cluster || estado.combo >= 3 ? juice.traumaCluster : juice.traumaMatch);
      audio.somMatch();
      audio.falarLetra(letterId);
    } else {
      estado.combo = 0;
      const viz = res.vizinhos[0];
      progresso.erro(letterId, viz ? viz.letterId : null, ms);
      res.bubble.settleT = config.settleMs;
      for (const v of res.vizinhos) v.shakeT = Math.max(v.shakeT, config.shakeMs * 0.4);
      addTrauma(0.12);
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
    bg.update(dt, reduced);
    pulseT += dt * 1000;
    for (const f of floats) f.t += dt * 1000;
    floats = floats.filter((f) => f.t < config.feedbackMs);

    for (const p of particles) {
      p.life -= dt;
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.ang += p.spin * dt;
    }
    particles = particles.filter((p) => p.life > 0);

    trauma = Math.max(0, trauma - juice.traumaDecay * dt);
    const s2 = trauma * trauma;
    if (reduced || s2 <= 0) {
      shakeX = 0;
      shakeY = 0;
    } else {
      shakeX = (Math.random() * 2 - 1) * juice.shakeAmpl * s2;
      shakeY = (Math.random() * 2 - 1) * juice.shakeAmpl * s2;
    }
    recoil = Math.max(0, recoil - dt * 6);

    if (teclas.has('ArrowLeft')) aimAngle = Math.max(-AIM_MAX, aimAngle - 2.4 * dt);
    if (teclas.has('ArrowRight')) aimAngle = Math.min(AIM_MAX, aimAngle + 2.4 * dt);

    if (proj) {
      const r = board.radius;
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      if (!reduced) {
        trailAcc += dt * 1000;
        if (trailAcc >= juice.trailEveryMs) {
          trailAcc = 0;
          proj.trail.push({ x: proj.x, y: proj.y });
          if (proj.trail.length > 8) proj.trail.shift();
        }
      }
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
    const alvoBoard = emTeclado ? teclado.board : board;
    const baixo = alvoBoard.lowestY();
    const perigo = Math.max(0, Math.min(1, (baixo - (config.dangerY - 120)) / 120));
    render.render({
      board: alvoBoard,
      fase: estado.fase,
      useColors: !emTeclado && diff.useColors,
      aimAngle,
      guideBounces: diff.guideBounces,
      current: estado.fase === 'jogando' ? current : null,
      proj,
      floats,
      particles,
      bg,
      shakeX,
      shakeY,
      recoil,
      reduced,
      ativa: emTeclado ? teclado.ativa : null,
      pulseT,
      perigo,
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

  function destravarMusica() {
    audio.iniciarMusica();
    window.removeEventListener('pointerdown', destravarMusica);
    window.removeEventListener('keydown', destravarMusica);
  }
  window.addEventListener('pointerdown', destravarMusica);
  window.addEventListener('keydown', destravarMusica);

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
    audio,
    reduced,
    board: () => board,
    particles: () => particles,
    bgTema: () => tema,
    shake: () => ({ x: shakeX, y: shakeY, trauma }),
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
