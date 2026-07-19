const STATS_KEY = 'bolhas-de-letras:stats';
const PROG_KEY = 'bolhas-de-letras:progresso';

export interface LetterStat {
  presented: number;
  correct: number;
  incorrect: number;
  confusedWith: Record<string, number>;
  totalMs: number;
  timed: number;
}

export function criarProgresso(totalNiveis: number) {
  let stats: Record<string, LetterStat> = {};
  let done: boolean[] = Array.from({ length: totalNiveis }, () => false);
  try {
    const s = localStorage.getItem(STATS_KEY);
    if (s) stats = JSON.parse(s);
    const p = localStorage.getItem(PROG_KEY);
    if (p) {
      const arr = JSON.parse(p);
      if (Array.isArray(arr)) done = done.map((_, i) => !!arr[i]);
    }
  } catch { }

  function salvar() {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
      localStorage.setItem(PROG_KEY, JSON.stringify(done));
    } catch { }
  }

  function statDe(id: string): LetterStat {
    if (!stats[id]) stats[id] = { presented: 0, correct: 0, incorrect: 0, confusedWith: {}, totalMs: 0, timed: 0 };
    return stats[id];
  }

  return {
    get stats() { return stats; },
    get done() { return done; },
    apresentada(id: string) {
      statDe(id).presented++;
      salvar();
    },
    acerto(id: string, ms: number) {
      const s = statDe(id);
      s.correct++;
      s.totalMs += ms;
      s.timed++;
      salvar();
    },
    erro(id: string, confundidaCom: string | null, ms: number) {
      const s = statDe(id);
      s.incorrect++;
      s.totalMs += ms;
      s.timed++;
      if (confundidaCom && confundidaCom !== id) {
        s.confusedWith[confundidaCom] = (s.confusedWith[confundidaCom] || 0) + 1;
      }
      salvar();
    },
    nivelFeito(idx: number) {
      done[idx] = true;
      salvar();
    },
    resumo(): { bons: string[]; praticar: string[] } {
      const bons: string[] = [];
      const praticar: string[] = [];
      for (const [id, s] of Object.entries(stats)) {
        const tent = s.correct + s.incorrect;
        if (tent < 3) continue;
        const acc = s.correct / tent;
        if (acc >= 0.8) bons.push(id);
        else if (acc < 0.6) praticar.push(id);
      }
      bons.sort();
      praticar.sort();
      return { bons, praticar };
    },
  };
}
