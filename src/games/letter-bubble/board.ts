import { mulberry32 } from '../../lib/rng';
import { config } from '../../data/bolhas-de-letras';
import type { DifficultyDef, LevelDef } from '../../data/bolhas-de-letras';
import type { Bubble } from './tipos';

const ROW_F = Math.sqrt(3);
const TOP_Y = 54;

export interface Board {
  radius: number;
  bubbles: Bubble[];
  alive(): Bubble[];
  cellX(row: number, col: number): number;
  cellY(row: number): number;
  posDe(b: Bubble): { x: number; y: number };
  generate(level: Pick<LevelDef, 'letters' | 'rows' | 'clusterAdjacent'>, seed: number, allLower?: boolean): void;
  attach(px: number, py: number, letterId: string, lower: boolean): { bubble: Bubble; popped: Bubble[]; fell: Bubble[]; vizinhos: Bubble[] };
  pop(b: Bubble): void;
  dropFloating(): Bubble[];
  matchable(): Array<{ letterId: string; lower: boolean }>;
  descend(): void;
  lowestY(): number;
  update(dt: number): void;
}

export function createBoard(diff: Pick<DifficultyDef, 'radius' | 'cols'>): Board {
  const radius = diff.radius;
  const rowH = radius * ROW_F;
  const marginX = (config.canvasW - diff.cols * radius * 2) / 2;
  let offsetRows = 0;
  let bubbles: Bubble[] = [];

  const colsInRow = (row: number) => (row % 2 === 0 ? diff.cols : diff.cols - 1);
  const cellX = (row: number, col: number) => marginX + radius + col * radius * 2 + (row % 2 === 1 ? radius : 0);
  const cellY = (row: number) => TOP_Y + radius + (row + offsetRows) * rowH;

  function alive(): Bubble[] {
    return bubbles.filter((b) => b.popT === 0 && !b.falling);
  }

  function at(row: number, col: number): Bubble | null {
    for (const b of bubbles) {
      if (b.row === row && b.col === col && b.popT === 0 && !b.falling) return b;
    }
    return null;
  }

  function neighborCells(row: number, col: number): Array<[number, number]> {
    const side = row % 2 === 1
      ? [[-1, 0], [-1, 1], [1, 0], [1, 1]]
      : [[-1, -1], [-1, 0], [1, -1], [1, 0]];
    return [[0, -1], [0, 1], ...side]
      .map(([dr, dc]) => [row + dr, col + dc] as [number, number])
      .filter(([r, c]) => r >= 0 && c >= 0 && c < colsInRow(r));
  }

  function neighborsOf(b: Bubble): Bubble[] {
    const out: Bubble[] = [];
    for (const [r, c] of neighborCells(b.row, b.col)) {
      const n = at(r, c);
      if (n) out.push(n);
    }
    return out;
  }

  function generate(level: Pick<LevelDef, 'letters' | 'rows' | 'clusterAdjacent'>, seed: number, allLower = false) {
    const rng = mulberry32(seed);
    bubbles = [];
    offsetRows = 0;
    const slots: Array<[number, number]> = [];
    for (let r = 0; r < level.rows; r++) {
      for (let c = 0; c < colsInRow(r); c++) slots.push([r, c]);
    }
    if (allLower) {
      for (let i = 0; i < slots.length; i++) {
        const [r, c] = slots[i];
        const id = level.letters[i % level.letters.length];
        bubbles.push(novaBolha(id, true, r, c));
      }
      return;
    }
    if (!level.clusterAdjacent) {
      for (let i = slots.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [slots[i], slots[j]] = [slots[j], slots[i]];
      }
    }
    const pares = Math.floor(slots.length / 2);
    for (let i = 0; i < pares; i++) {
      const id = level.letters[i % level.letters.length];
      const primeiraMinuscula = rng() < 0.5;
      const [r1, c1] = slots[i * 2];
      const [r2, c2] = slots[i * 2 + 1];
      bubbles.push(novaBolha(id, primeiraMinuscula, r1, c1));
      bubbles.push(novaBolha(id, !primeiraMinuscula, r2, c2));
    }
  }

  function novaBolha(letterId: string, lower: boolean, row: number, col: number): Bubble {
    return { letterId, lower, row, col, popT: 0, shakeT: 0, falling: false, fx: 0, fy: 0, vy: 0 };
  }

  function cellFromPoint(px: number, py: number): [number, number] {
    let row = Math.round((py - TOP_Y - radius) / rowH - offsetRows);
    row = Math.max(0, row);
    let col = Math.round((px - marginX - radius - (row % 2 === 1 ? radius : 0)) / (radius * 2));
    col = Math.max(0, Math.min(colsInRow(row) - 1, col));
    return [row, col];
  }

  function findFreeCell(px: number, py: number): [number, number] {
    const start = cellFromPoint(px, py);
    const vistos = new Set<string>();
    const fila: Array<[number, number]> = [start];
    let melhor: [number, number] | null = null;
    let melhorD = Infinity;
    while (fila.length) {
      const [r, c] = fila.shift()!;
      const k = r + ':' + c;
      if (vistos.has(k)) continue;
      vistos.add(k);
      if (!at(r, c)) {
        const d = Math.hypot(cellX(r, c) - px, cellY(r) - py);
        if (d < melhorD) {
          melhorD = d;
          melhor = [r, c];
        }
        continue;
      }
      for (const nc of neighborCells(r, c)) fila.push(nc);
    }
    return melhor || start;
  }

  function pop(b: Bubble) {
    if (b.popT === 0) b.popT = 0.0001;
  }

  function dropFloating(): Bubble[] {
    const vivos = alive();
    const presos = new Set<Bubble>();
    const fila = vivos.filter((b) => b.row === 0);
    for (const b of fila) presos.add(b);
    while (fila.length) {
      const b = fila.shift()!;
      for (const n of neighborsOf(b)) {
        if (!presos.has(n)) {
          presos.add(n);
          fila.push(n);
        }
      }
    }
    const soltos = vivos.filter((b) => !presos.has(b));
    for (const b of soltos) {
      b.falling = true;
      b.fx = cellX(b.row, b.col);
      b.fy = cellY(b.row);
      b.vy = -60;
    }
    return soltos;
  }

  function attach(px: number, py: number, letterId: string, lower: boolean) {
    const [row, col] = findFreeCell(px, py);
    const b = novaBolha(letterId, lower, row, col);
    bubbles.push(b);
    const vizinhos = neighborsOf(b).filter((n) => n !== b);
    const popped = vizinhos.filter((n) => n.letterId === letterId && n.lower !== lower);
    let fell: Bubble[] = [];
    if (popped.length) {
      pop(b);
      for (const n of popped) pop(n);
      fell = dropFloating();
    }
    return { bubble: b, popped, fell, vizinhos };
  }

  function matchable(): Array<{ letterId: string; lower: boolean }> {
    const vistos = new Set<string>();
    const out: Array<{ letterId: string; lower: boolean }> = [];
    for (const b of alive()) {
      const k = b.letterId + (b.lower ? 'U' : 'L');
      if (vistos.has(k)) continue;
      vistos.add(k);
      out.push({ letterId: b.letterId, lower: !b.lower });
    }
    return out;
  }

  function descend() {
    offsetRows++;
  }

  function lowestY(): number {
    let max = 0;
    for (const b of alive()) max = Math.max(max, cellY(b.row) + radius);
    return max;
  }

  function update(dt: number) {
    for (const b of bubbles) {
      if (b.popT > 0) b.popT += dt * 1000;
      if (b.shakeT > 0) b.shakeT = Math.max(0, b.shakeT - dt * 1000);
      if (b.falling) {
        b.vy += 1400 * dt;
        b.fy += b.vy * dt;
      }
    }
    bubbles = bubbles.filter((b) => b.popT <= config.popMs && (!b.falling || b.fy < config.canvasH + 60));
  }

  return {
    radius,
    get bubbles() { return bubbles; },
    alive,
    cellX,
    cellY,
    posDe: (b: Bubble) => (b.falling ? { x: b.fx, y: b.fy } : { x: cellX(b.row, b.col), y: cellY(b.row) }),
    generate,
    attach,
    pop,
    dropFloating,
    matchable,
    descend,
    lowestY,
    update,
  };
}
