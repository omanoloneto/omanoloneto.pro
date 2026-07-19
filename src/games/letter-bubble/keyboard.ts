import { keyboardRounds } from '../../data/bolhas-de-letras';
import { createBoard, type Board } from './board';
import type { Bubble } from './tipos';

export interface ModoTeclado {
  board: Board;
  ativa: Bubble | null;
  rodada: number;
  start(rodada: number): void;
  tecla(k: string): 'acerto' | 'erro' | 'ignorada';
}

export function criarModoTeclado(deps: {
  onAcerto(b: Bubble, ms: number): void;
  onErro(b: Bubble, pressionada: string, ms: number): void;
  onRodadaFeita(rodada: number): void;
}): ModoTeclado {
  let board = createBoard({ radius: 24, cols: 9 });
  let ativa: Bubble | null = null;
  let rodada = 0;
  let ativaDesde = 0;

  function pickAtiva() {
    const vivas = board.alive();
    if (!vivas.length) {
      ativa = null;
      deps.onRodadaFeita(rodada);
      return;
    }
    ativa = vivas[Math.floor(Math.random() * vivas.length)];
    ativaDesde = performance.now();
  }

  function start(r: number) {
    rodada = r;
    const rd = keyboardRounds[r];
    board = createBoard({ radius: 24, cols: 9 });
    board.generate({ letters: rd.letters, rows: rd.rows }, 0xbeca + r, true);
    pickAtiva();
  }

  function tecla(k: string): 'acerto' | 'erro' | 'ignorada' {
    if (!ativa || k.length !== 1 || !/[a-z]/i.test(k)) return 'ignorada';
    const ms = performance.now() - ativaDesde;
    if (k.toLowerCase() === ativa.letterId.toLowerCase()) {
      const b = ativa;
      board.pop(b);
      deps.onAcerto(b, ms);
      pickAtiva();
      return 'acerto';
    }
    ativa.shakeT = 320;
    deps.onErro(ativa, k.toUpperCase(), ms);
    return 'erro';
  }

  return {
    get board() { return board; },
    get ativa() { return ativa; },
    get rodada() { return rodada; },
    start,
    tecla,
  };
}
