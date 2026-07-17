function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function novo(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  return [c, g];
}

function px(g: CanvasRenderingContext2D, x: number, y: number, cor: string) {
  g.fillStyle = cor;
  g.fillRect(x, y, 1, 1);
}

function ret(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, cor: string) {
  g.fillStyle = cor;
  g.fillRect(x, y, w, h);
}

function base(cor: string, ruido: string, seed: number, quanto = 26): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const [c, g] = novo(16, 16);
  ret(g, 0, 0, 16, 16, cor);
  const r = mulberry32(seed);
  for (let i = 0; i < quanto; i++) px(g, (r() * 16) | 0, (r() * 16) | 0, ruido);
  return [c, g];
}

function tileGrama(): HTMLCanvasElement {
  const [c] = base('#6abe4f', '#5aa843', 11);
  return c;
}

function tileMatinho(): HTMLCanvasElement {
  const [c, g] = base('#4e9c3e', '#438a35', 22, 18);
  const r = mulberry32(7);
  for (let i = 0; i < 7; i++) {
    const x = 1 + ((r() * 14) | 0);
    const y = 3 + ((r() * 11) | 0);
    ret(g, x, y, 1, 3, '#2f6b26');
    px(g, x - 1, y + 1, '#3b7d2f');
    px(g, x + 1, y + 1, '#3b7d2f');
  }
  return c;
}

function tileCaminho(): HTMLCanvasElement {
  const [c] = base('#d9b380', '#c9a06a', 33);
  return c;
}

function tileArvore(): HTMLCanvasElement {
  const [c, g] = novo(16, 16);
  ret(g, 0, 0, 16, 16, '#5aa843');
  ret(g, 6, 11, 4, 5, '#7a5230');
  ret(g, 1, 1, 14, 11, '#2e7a2a');
  ret(g, 2, 0, 12, 2, '#2e7a2a');
  ret(g, 3, 2, 10, 3, '#3f9436');
  ret(g, 2, 5, 5, 3, '#3f9436');
  px(g, 4, 3, '#5cb64f');
  px(g, 9, 2, '#5cb64f');
  px(g, 6, 6, '#5cb64f');
  px(g, 12, 5, '#245f20');
  px(g, 11, 9, '#245f20');
  return c;
}

function tileAgua(frame: number): HTMLCanvasElement {
  const [c, g] = base('#3f8fd8', '#3583c9', 44 + frame, 20);
  const r = mulberry32(90 + frame);
  for (let i = 0; i < 5; i++) {
    const x = 1 + ((r() * 12) | 0);
    const y = 2 + ((r() * 12) | 0);
    ret(g, frame ? x + 1 : x, y, 3, 1, '#bfe2ff');
  }
  return c;
}

function tileFlor(): HTMLCanvasElement {
  const [c, g] = base('#6abe4f', '#5aa843', 11);
  const flores: Array<[number, number, string]> = [[4, 4, '#ff6f9c'], [11, 9, '#ffd23f'], [5, 12, '#f2f2f2']];
  for (const [x, y, cor] of flores) {
    px(g, x, y - 1, cor);
    px(g, x - 1, y, cor);
    px(g, x + 1, y, cor);
    px(g, x, y + 1, cor);
    px(g, x, y, '#ffef9e');
  }
  return c;
}

function tileFonte(frame: number): HTMLCanvasElement {
  const [c, g] = novo(16, 16);
  ret(g, 0, 0, 16, 16, '#9aa3ae');
  ret(g, 1, 1, 14, 14, '#b8c0ca');
  ret(g, 3, 3, 10, 10, '#3f8fd8');
  ret(g, 5, 5, 6, 6, frame ? '#6fb4ea' : '#5aa5e2');
  px(g, 7, 4, '#e8f4ff');
  px(g, frame ? 5 : 9, 7, '#e8f4ff');
  return c;
}

function tileTelhado(cor: string, escuro: string): HTMLCanvasElement {
  const [c, g] = novo(16, 16);
  ret(g, 0, 0, 16, 16, cor);
  for (let y = 3; y < 16; y += 4) ret(g, 0, y, 16, 1, escuro);
  ret(g, 0, 0, 16, 1, '#00000022');
  return c;
}

function tileParede(): HTMLCanvasElement {
  const [c, g] = novo(16, 16);
  ret(g, 0, 0, 16, 16, '#efe3c8');
  ret(g, 0, 0, 16, 1, '#d9c9a6');
  ret(g, 2, 4, 4, 5, '#7fb8d8');
  ret(g, 10, 4, 4, 5, '#7fb8d8');
  ret(g, 2, 4, 4, 1, '#5a8db0');
  ret(g, 10, 4, 4, 1, '#5a8db0');
  ret(g, 0, 14, 16, 2, '#c9ba93');
  return c;
}

function tilePorta(): HTMLCanvasElement {
  const [c, g] = novo(16, 16);
  ret(g, 0, 0, 16, 16, '#efe3c8');
  ret(g, 0, 0, 16, 1, '#d9c9a6');
  ret(g, 4, 3, 8, 13, '#8a5a30');
  ret(g, 5, 4, 6, 11, '#a06a3a');
  px(g, 9, 10, '#ffd23f');
  ret(g, 0, 14, 2, 2, '#c9ba93');
  ret(g, 14, 14, 2, 2, '#c9ba93');
  return c;
}

function heroi(dir: number, frame: number, camisa: string): HTMLCanvasElement {
  const [c, g] = novo(16, 16);
  const pele = '#f2c9a0';
  const cabelo = '#5a3a1e';
  const calca = '#3a5a8c';
  const passo = frame === 1;
  ret(g, 5, 1, 6, 5, cabelo);
  ret(g, 5, 3, 6, 3, pele);
  if (dir === 0) {
    px(g, 6, 4, '#222');
    px(g, 9, 4, '#222');
  } else if (dir === 1) {
    ret(g, 5, 3, 6, 2, cabelo);
  } else {
    const ox = dir === 2 ? -1 : 1;
    px(g, 8 + ox * 1, 4, '#222');
    ret(g, dir === 2 ? 9 : 5, 2, 2, 3, cabelo);
  }
  ret(g, 4, 6, 8, 5, camisa);
  ret(g, 3, 7, 1, 3, pele);
  ret(g, 12, 7, 1, 3, pele);
  ret(g, 5, 11, 2, 3, calca);
  ret(g, 9, 11, 2, 3, calca);
  if (passo) {
    ret(g, 5, 14, 2, 1, '#2a2a2a');
    ret(g, 9, 13, 2, 1, '#2a2a2a');
  } else {
    ret(g, 5, 14, 2, 1, '#2a2a2a');
    ret(g, 9, 14, 2, 1, '#2a2a2a');
  }
  return c;
}

function npcSprite(tipo: string): HTMLCanvasElement {
  if (tipo === 'placa') {
    const [c, g] = novo(16, 16);
    ret(g, 7, 8, 2, 8, '#8a5a30');
    ret(g, 2, 2, 12, 7, '#d9b380');
    ret(g, 2, 2, 12, 1, '#b98f5c');
    ret(g, 4, 4, 8, 1, '#7a5230');
    ret(g, 4, 6, 6, 1, '#7a5230');
    return c;
  }
  const camisa = tipo === 'professora' ? '#f2f2f2' : tipo === 'crianca' ? '#ffd23f' : '#d94f3d';
  const c = heroi(0, 0, camisa);
  const g = c.getContext('2d')!;
  if (tipo === 'professora') ret(g, 5, 1, 6, 2, '#c98a3a');
  if (tipo === 'crianca') ret(g, 5, 1, 6, 2, '#2a2a2a');
  return c;
}

function bicho(id: 'dog' | 'cat', dir: number, frame: number): HTMLCanvasElement {
  const [c, g] = novo(16, 16);
  const corpo = id === 'dog' ? '#c98a3a' : '#9aa3ae';
  const claro = id === 'dog' ? '#e8b46a' : '#c2cad4';
  const passo = frame === 1;
  const lado = dir === 2 || dir === 3;
  if (lado) {
    const flip = dir === 2;
    const fx = (x: number) => (flip ? 15 - x : x);
    ret(g, fx(3) < fx(11) ? fx(3) : fx(11), 7, 9, 5, corpo);
    ret(g, fx(11) - (flip ? 3 : 0), 4, 4, 4, corpo);
    ret(g, fx(12) - (flip ? 2 : 0), 5, 2, 2, claro);
    px(g, fx(13), 5, '#222');
    if (id === 'dog') ret(g, fx(11) - (flip ? 1 : 0), 3, 2, 3, '#8a5a30');
    else {
      px(g, fx(11), 3, corpo);
      px(g, fx(14), 3, corpo);
    }
    ret(g, fx(2), 5, 2, 3, id === 'dog' ? corpo : claro);
    ret(g, passo ? 4 : 5, 12, 2, 2, corpo);
    ret(g, passo ? 10 : 9, 12, 2, 2, corpo);
  } else {
    ret(g, 4, 6, 8, 6, corpo);
    ret(g, 5, 2, 6, 5, corpo);
    if (id === 'dog') {
      ret(g, 4, 2, 2, 4, '#8a5a30');
      ret(g, 10, 2, 2, 4, '#8a5a30');
    } else {
      px(g, 5, 1, corpo);
      px(g, 10, 1, corpo);
    }
    if (dir === 0) {
      px(g, 6, 4, '#222');
      px(g, 9, 4, '#222');
      ret(g, 7, 5, 2, 1, id === 'dog' ? '#222' : '#e88ab0');
    }
    ret(g, passo ? 4 : 5, 12, 2, 2, corpo);
    ret(g, passo ? 10 : 9, 12, 2, 2, corpo);
  }
  return c;
}

function retrato(id: 'dog' | 'cat'): HTMLCanvasElement {
  const [c, g] = novo(32, 32);
  const corpo = id === 'dog' ? '#c98a3a' : '#9aa3ae';
  const claro = id === 'dog' ? '#e8b46a' : '#c2cad4';
  ret(g, 6, 10, 20, 16, corpo);
  ret(g, 9, 4, 14, 12, corpo);
  ret(g, 11, 8, 4, 4, '#fff');
  ret(g, 18, 8, 4, 4, '#fff');
  ret(g, 12, 9, 2, 2, '#222');
  ret(g, 19, 9, 2, 2, '#222');
  if (id === 'dog') {
    ret(g, 6, 2, 4, 8, '#8a5a30');
    ret(g, 22, 2, 4, 8, '#8a5a30');
    ret(g, 13, 13, 6, 3, claro);
    ret(g, 15, 12, 2, 2, '#222');
    ret(g, 12, 26, 4, 3, corpo);
    ret(g, 17, 26, 4, 3, corpo);
  } else {
    ret(g, 8, 1, 4, 5, corpo);
    ret(g, 20, 1, 4, 5, corpo);
    px(g, 9, 3, '#e88ab0');
    px(g, 21, 3, '#e88ab0');
    ret(g, 14, 13, 4, 2, '#e88ab0');
    px(g, 10, 14, '#555');
    px(g, 22, 14, '#555');
    ret(g, 12, 26, 4, 3, corpo);
    ret(g, 17, 26, 4, 3, corpo);
    ret(g, 25, 16, 3, 8, corpo);
  }
  return c;
}

export function criarSprites(): Record<string, HTMLCanvasElement | HTMLCanvasElement[]> {
  const s: Record<string, HTMLCanvasElement | HTMLCanvasElement[]> = {
    grama: tileGrama(),
    matinho: tileMatinho(),
    caminho: tileCaminho(),
    arvore: tileArvore(),
    agua: [tileAgua(0), tileAgua(1)],
    flor: tileFlor(),
    fonte: [tileFonte(0), tileFonte(1)],
    telhado: tileTelhado('#d94f3d', '#b53a2c'),
    telhadoLab: tileTelhado('#3d7dd8', '#2c62b0'),
    telhadoPosto: tileTelhado('#e88ab0', '#c96a92'),
    parede: tileParede(),
    porta: tilePorta(),
    retratoDog: retrato('dog'),
    retratoCat: retrato('cat'),
  };
  const camisas = ['#d94f3d', '#3d7dd8', '#7bc950', '#9b6dd6'];
  camisas.forEach((cor, i) => {
    for (let d = 0; d < 4; d++) {
      for (let f = 0; f < 2; f++) s['heroi' + i + '-' + d + '-' + f] = heroi(d, f, cor);
    }
  });
  (['dog', 'cat'] as const).forEach((id) => {
    for (let d = 0; d < 4; d++) {
      for (let f = 0; f < 2; f++) s[id + '-' + d + '-' + f] = bicho(id, d, f);
    }
  });
  ['professora', 'morador', 'crianca', 'placa'].forEach((n) => {
    s['npc-' + n] = npcSprite(n);
  });
  return s;
}
