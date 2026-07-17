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

function contorno(sprite: HTMLCanvasElement, cor = '#26302a'): HTMLCanvasElement {
  const [c, g] = novo(sprite.width, sprite.height);
  for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) g.drawImage(sprite, ox, oy);
  g.globalCompositeOperation = 'source-in';
  ret(g, 0, 0, c.width, c.height, cor);
  g.globalCompositeOperation = 'source-over';
  g.drawImage(sprite, 0, 0);
  return c;
}

const P = {
  gramaClara: '#a0d078',
  grama: '#88c060',
  gramaEscura: '#70a850',
  gramaSombra: '#5c9040',
  calcada: '#e8dcb0',
  calcadaLinha: '#c0ac78',
  calcadaPonto: '#d8c898',
  copaLuz: '#78c058',
  copaMedia: '#4c9848',
  copaEscura: '#347038',
  copaSombra: '#1e5028',
  tronco: '#805030',
  aguaClara: '#a8d8f8',
  agua: '#5098e0',
  aguaEscura: '#3878c0',
  pedraClara: '#d8dce0',
  pedra: '#b0b8c0',
  pedraEscura: '#788088',
  telhado: '#d0a850',
  telhadoBanda: '#a88038',
  telhadoLuz: '#e8c878',
  telhadoLab: '#6890d8',
  telhadoLabBanda: '#4868a8',
  telhadoLabLuz: '#90b0e8',
  telhadoPosto: '#e890b0',
  telhadoPostoBanda: '#c06888',
  telhadoPostoLuz: '#f8b8d0',
  parede: '#dce4ec',
  paredeLinha: '#a8b4c0',
  paredeSombra: '#8890a0',
  vidro: '#487098',
  vidroLuz: '#88b0d0',
  porta: '#8a5a30',
  portaLuz: '#a87848',
};

function tileGrama(): HTMLCanvasElement {
  const [c, g] = novo(16, 16);
  ret(g, 0, 0, 16, 16, P.grama);
  const motivo: Array<[number, number]> = [[2, 3], [10, 1], [6, 7], [13, 9], [3, 12], [9, 14]];
  for (const [x, y] of motivo) {
    px(g, x, y, P.gramaEscura);
    px(g, x + 1, y, P.gramaEscura);
    px(g, x, y + 1, P.gramaClara);
  }
  return c;
}

function tileMatinho(): HTMLCanvasElement {
  const [c, g] = novo(16, 16);
  ret(g, 0, 0, 16, 16, P.gramaEscura);
  for (let linha = 0; linha < 3; linha++) {
    const y = 2 + linha * 5;
    for (let x = (linha % 2) * 2; x < 16; x += 4) {
      px(g, x, y + 2, P.gramaSombra);
      px(g, x, y + 1, P.gramaSombra);
      px(g, x, y, P.copaMedia);
      px(g, x + 1, y + 2, P.copaMedia);
      px(g, x + 1, y + 1, P.gramaClara);
    }
  }
  return c;
}

function tileCalcada(): HTMLCanvasElement {
  const [c, g] = novo(16, 16);
  ret(g, 0, 0, 16, 16, P.calcada);
  ret(g, 0, 15, 16, 1, P.calcadaLinha);
  ret(g, 15, 0, 1, 16, P.calcadaLinha);
  ret(g, 0, 7, 15, 1, P.calcadaPonto);
  ret(g, 7, 0, 1, 7, P.calcadaPonto);
  const pontos: Array<[number, number]> = [[3, 3], [11, 4], [4, 11], [12, 12]];
  for (const [x, y] of pontos) px(g, x, y, P.calcadaPonto);
  return c;
}

function tileArvore(): HTMLCanvasElement {
  const [c, g] = novo(16, 16);
  ret(g, 0, 0, 16, 16, P.copaSombra);
  ret(g, 5, 13, 6, 3, P.tronco);
  ret(g, 6, 13, 2, 3, '#95643c');
  g.fillStyle = P.copaEscura;
  g.fillRect(1, 1, 14, 12);
  g.fillRect(0, 3, 16, 8);
  const bolhas: Array<[number, number, number, string]> = [
    [2, 2, 5, P.copaMedia], [9, 1, 5, P.copaMedia], [5, 6, 6, P.copaMedia], [11, 7, 4, P.copaMedia],
    [3, 3, 3, P.copaLuz], [10, 2, 3, P.copaLuz], [6, 7, 3, P.copaLuz],
  ];
  for (const [x, y, t, cor] of bolhas) {
    g.fillStyle = cor;
    g.fillRect(x, y, t, t - 1);
    g.fillRect(x + 1, y - 1, t - 2, t + 1);
  }
  px(g, 4, 4, '#98d878');
  px(g, 11, 3, '#98d878');
  ret(g, 0, 12, 5, 1, P.copaSombra);
  ret(g, 11, 12, 5, 1, P.copaSombra);
  return c;
}

function tileAgua(frame: number): HTMLCanvasElement {
  const [c, g] = novo(16, 16);
  ret(g, 0, 0, 16, 16, P.agua);
  ret(g, 0, 13, 16, 3, P.aguaEscura);
  const ondas: Array<[number, number]> = [[2, 3], [9, 5], [4, 9], [12, 11], [7, 1]];
  for (const [x, y] of ondas) {
    const ox = frame ? x + 1 : x;
    ret(g, ox, y, 4, 1, P.aguaClara);
    px(g, ox + 1, y + 1, '#78b8f0');
  }
  return c;
}

function tileFlor(frame: number): HTMLCanvasElement {
  const c = tileGrama();
  const g = c.getContext('2d')!;
  const flores: Array<[number, number, string]> = [[4, 4, '#f05868'], [11, 10, '#f8d048']];
  for (const [x, y, cor] of flores) {
    const o = frame ? 1 : 0;
    px(g, x, y - 1, cor);
    px(g, x - 1 + o, y, cor);
    px(g, x + 1, y, cor);
    px(g, x, y + 1, cor);
    px(g, x, y, '#f8f0d8');
    px(g, x, y + 2, P.gramaSombra);
  }
  return c;
}

function tileArbusto(): HTMLCanvasElement {
  const [c, g] = novo(16, 16);
  ret(g, 0, 0, 16, 16, P.grama);
  ret(g, 1, 3, 14, 12, P.copaSombra);
  ret(g, 2, 2, 12, 12, P.copaEscura);
  ret(g, 2, 2, 12, 4, P.copaMedia);
  ret(g, 3, 2, 4, 2, P.copaLuz);
  ret(g, 9, 3, 3, 2, P.copaLuz);
  px(g, 4, 7, P.copaMedia);
  px(g, 10, 8, P.copaMedia);
  ret(g, 2, 14, 12, 1, '#54803c');
  return c;
}

function tileFonte(canto: number): HTMLCanvasElement {
  const [c, g] = novo(16, 16);
  const esq = canto === 0 || canto === 2;
  const topo = canto === 0 || canto === 1;
  ret(g, 0, 0, 16, 16, P.agua);
  const ondas: Array<[number, number]> = [[5, 8], [10, 12]];
  for (const [x, y] of ondas) ret(g, x, y, 3, 1, P.aguaClara);
  const bx = esq ? 0 : 12;
  const by = topo ? 0 : 12;
  ret(g, 0, topo ? 0 : 12, 16, 4, topo ? P.pedraClara : P.pedra);
  ret(g, esq ? 0 : 12, 0, 4, 16, P.pedraClara);
  ret(g, bx, by, 4, 4, P.pedraClara);
  ret(g, 0, topo ? 3 : 12, 16, 1, P.pedraEscura);
  ret(g, esq ? 3 : 12, 0, 1, 16, P.pedraEscura);
  if (topo) {
    px(g, esq ? 14 : 1, 6, '#d8ecff');
    px(g, esq ? 13 : 2, 9, P.aguaClara);
  }
  return c;
}

function tileTelhado(cor: string, banda: string, luz: string): HTMLCanvasElement {
  const [c, g] = novo(16, 16);
  ret(g, 0, 0, 16, 16, cor);
  for (let y = 4; y < 16; y += 5) {
    ret(g, 0, y, 16, 1, banda);
    ret(g, 0, y + 1, 16, 1, luz);
  }
  return c;
}

function tileParede(): HTMLCanvasElement {
  const [c, g] = novo(16, 16);
  ret(g, 0, 0, 16, 16, P.parede);
  ret(g, 0, 0, 16, 3, P.paredeSombra);
  ret(g, 0, 3, 16, 1, P.paredeLinha);
  ret(g, 2, 6, 5, 6, '#f8fcff');
  ret(g, 3, 7, 3, 4, P.vidro);
  ret(g, 3, 7, 3, 1, P.vidroLuz);
  ret(g, 9, 6, 5, 6, '#f8fcff');
  ret(g, 10, 7, 3, 4, P.vidro);
  ret(g, 10, 7, 3, 1, P.vidroLuz);
  ret(g, 0, 13, 16, 3, P.paredeLinha);
  ret(g, 0, 13, 16, 1, P.paredeSombra);
  return c;
}

function tilePorta(): HTMLCanvasElement {
  const [c, g] = novo(16, 16);
  ret(g, 0, 0, 16, 16, P.parede);
  ret(g, 0, 0, 16, 3, P.paredeSombra);
  ret(g, 0, 3, 16, 1, P.paredeLinha);
  ret(g, 3, 2, 10, 2, P.telhadoBanda);
  ret(g, 3, 4, 10, 1, '#785828');
  ret(g, 4, 5, 8, 11, '#4a3018');
  ret(g, 5, 6, 6, 10, P.porta);
  ret(g, 5, 6, 6, 2, P.portaLuz);
  px(g, 10, 11, '#f8d048');
  ret(g, 0, 13, 2, 3, P.paredeLinha);
  ret(g, 14, 13, 2, 3, P.paredeLinha);
  return c;
}

function corpoHeroi(dir: number, frame: number, camisa: string, escura: string): HTMLCanvasElement {
  const [c, g] = novo(16, 16);
  const pele = '#f8c890';
  const cabelo = '#684828';
  const calca = '#3858a0';
  const bota = '#403028';
  const passo = frame === 1;
  ret(g, 5, 0, 6, 3, cabelo);
  px(g, 4, 1, cabelo);
  px(g, 11, 1, cabelo);
  ret(g, 5, 3, 6, 3, pele);
  if (dir === 0) {
    px(g, 6, 4, '#282828');
    px(g, 9, 4, '#282828');
  } else if (dir === 1) {
    ret(g, 5, 3, 6, 2, cabelo);
  } else {
    const olho = dir === 2 ? 6 : 9;
    px(g, olho, 4, '#282828');
    ret(g, dir === 2 ? 9 : 5, 2, 2, 3, cabelo);
  }
  ret(g, 4, 6, 8, 5, camisa);
  ret(g, 4, 6, 8, 1, escura);
  ret(g, dir === 2 ? 4 : 11, 6, 1, 5, escura);
  ret(g, 3, 7, 1, 3, pele);
  ret(g, 12, 7, 1, 3, pele);
  ret(g, 5, 11, 2, 3, calca);
  ret(g, 9, 11, 2, 3, calca);
  if (passo) {
    ret(g, 5, 14, 2, 1, bota);
    ret(g, 9, 13, 2, 1, bota);
  } else {
    ret(g, 5, 14, 2, 1, bota);
    ret(g, 9, 14, 2, 1, bota);
  }
  return c;
}

function heroi(dir: number, frame: number, camisa: string, escura: string): HTMLCanvasElement {
  return contorno(corpoHeroi(dir, frame, camisa, escura));
}

function npcSprite(tipo: string): HTMLCanvasElement {
  if (tipo === 'placa') {
    const [c, g] = novo(16, 16);
    ret(g, 6, 9, 4, 6, '#786048');
    ret(g, 2, 1, 12, 9, P.pedra);
    ret(g, 2, 1, 12, 1, P.pedraClara);
    ret(g, 2, 9, 12, 1, P.pedraEscura);
    ret(g, 3, 2, 10, 7, P.pedraClara);
    ret(g, 4, 4, 8, 1, P.pedraEscura);
    ret(g, 4, 6, 6, 1, P.pedraEscura);
    return contorno(c);
  }
  const cores: Record<string, [string, string]> = {
    professora: ['#f0f0f0', '#c8c8d0'],
    morador: ['#d05038', '#a03828'],
    crianca: ['#f8c848', '#d0a030'],
  };
  const [camisa, escura] = cores[tipo] || cores.morador;
  const base = corpoHeroi(0, 0, camisa, escura);
  const g = base.getContext('2d')!;
  if (tipo === 'professora') {
    ret(g, 5, 0, 6, 2, '#b08048');
    ret(g, 4, 1, 1, 4, '#b08048');
    ret(g, 11, 1, 1, 4, '#b08048');
  }
  if (tipo === 'crianca') {
    ret(g, 5, 0, 6, 2, '#e04838');
    ret(g, 4, 1, 8, 1, '#e04838');
  }
  return contorno(base);
}

function corpoBicho(id: 'dog' | 'cat', dir: number, frame: number): HTMLCanvasElement {
  const [c, g] = novo(16, 16);
  const corpo = id === 'dog' ? '#c88840' : '#98a0b0';
  const claro = id === 'dog' ? '#e8b070' : '#c8d0dc';
  const orelha = id === 'dog' ? '#8a5a30' : '#788090';
  const passo = frame === 1;
  const lado = dir === 2 || dir === 3;
  if (lado) {
    const flip = dir === 2;
    const fx = (x: number, w = 1) => (flip ? 16 - x - w : x);
    ret(g, fx(3, 9), 8, 9, 5, corpo);
    ret(g, fx(3, 9), 8, 9, 2, claro);
    ret(g, fx(10, 5), 4, 5, 5, corpo);
    ret(g, fx(11, 3), 5, 3, 2, claro);
    px(g, fx(13), 5, '#282828');
    px(g, fx(14), 7, '#302020');
    if (id === 'dog') {
      ret(g, fx(10, 2), 3, 2, 3, orelha);
    } else {
      px(g, fx(10), 3, orelha);
      px(g, fx(11), 2, orelha);
      px(g, fx(13), 2, orelha);
      px(g, fx(14), 3, orelha);
    }
    if (id === 'dog') {
      ret(g, fx(1, 2), 6, 2, 2, corpo);
      px(g, fx(1), 5, corpo);
    } else {
      ret(g, fx(2, 1), 4, 1, 4, corpo);
      px(g, fx(1), 3, corpo);
    }
    ret(g, fx(passo ? 4 : 5, 2), 13, 2, 2, corpo);
    ret(g, fx(passo ? 9 : 8, 2), 13, 2, 2, corpo);
  } else {
    ret(g, 4, 7, 8, 6, corpo);
    ret(g, 5, 2, 6, 6, corpo);
    ret(g, 5, 2, 6, 2, claro);
    if (id === 'dog') {
      ret(g, 3, 2, 2, 4, orelha);
      ret(g, 11, 2, 2, 4, orelha);
    } else {
      px(g, 5, 1, orelha);
      px(g, 6, 1, orelha);
      px(g, 9, 1, orelha);
      px(g, 10, 1, orelha);
      px(g, 5, 0, orelha);
      px(g, 10, 0, orelha);
    }
    if (dir === 0) {
      px(g, 6, 4, '#282828');
      px(g, 9, 4, '#282828');
      px(g, 7, 6, id === 'dog' ? '#302020' : '#e08098');
      px(g, 8, 6, id === 'dog' ? '#302020' : '#e08098');
    }
    ret(g, passo ? 4 : 5, 13, 2, 2, corpo);
    ret(g, passo ? 10 : 9, 13, 2, 2, corpo);
  }
  return c;
}

function bicho(id: 'dog' | 'cat', dir: number, frame: number): HTMLCanvasElement {
  return contorno(corpoBicho(id, dir, frame));
}

function retrato(id: 'dog' | 'cat'): HTMLCanvasElement {
  const [c, g] = novo(32, 32);
  const corpo = id === 'dog' ? '#c88840' : '#98a0b0';
  const claro = id === 'dog' ? '#e8b070' : '#c8d0dc';
  const orelha = id === 'dog' ? '#8a5a30' : '#788090';
  ret(g, 6, 12, 20, 14, corpo);
  ret(g, 8, 24, 16, 2, claro);
  ret(g, 9, 4, 14, 12, corpo);
  ret(g, 10, 5, 12, 4, claro);
  ret(g, 11, 8, 4, 4, '#ffffff');
  ret(g, 18, 8, 4, 4, '#ffffff');
  ret(g, 12, 9, 2, 2, '#282828');
  ret(g, 19, 9, 2, 2, '#282828');
  px(g, 13, 9, '#ffffff');
  px(g, 20, 9, '#ffffff');
  if (id === 'dog') {
    ret(g, 5, 2, 4, 9, orelha);
    ret(g, 23, 2, 4, 9, orelha);
    ret(g, 13, 13, 6, 3, claro);
    ret(g, 15, 12, 2, 2, '#302020');
    ret(g, 13, 15, 6, 1, '#8a5a30');
    ret(g, 11, 26, 4, 3, corpo);
    ret(g, 17, 26, 4, 3, corpo);
  } else {
    ret(g, 8, 0, 5, 6, orelha);
    ret(g, 19, 0, 5, 6, orelha);
    ret(g, 9, 2, 3, 3, '#e08098');
    ret(g, 20, 2, 3, 3, '#e08098');
    ret(g, 14, 13, 4, 2, '#e08098');
    px(g, 9, 13, '#605850');
    px(g, 7, 14, '#605850');
    px(g, 22, 13, '#605850');
    px(g, 24, 14, '#605850');
    ret(g, 11, 26, 4, 3, corpo);
    ret(g, 17, 26, 4, 3, corpo);
    ret(g, 26, 14, 3, 10, corpo);
    ret(g, 26, 12, 3, 3, claro);
  }
  return contorno(c);
}


function selvagem(id: string, frame: number): HTMLCanvasElement {
  const [c, g] = novo(16, 16);
  const f = frame === 1;
  if (id === 'fox') {
    ret(g, 3, 8, 9, 5, '#e07830');
    ret(g, 3, 8, 9, 2, '#f09850');
    ret(g, 10, 4, 4, 5, '#e07830');
    ret(g, 11, 6, 3, 2, '#f8f0e0');
    px(g, 12, 5, '#282828');
    px(g, 10, 2, '#e07830');
    px(g, 11, 3, '#e07830');
    px(g, 13, 2, '#e07830');
    px(g, 13, 3, '#e07830');
    ret(g, 0, 5, 3, 3, '#e07830');
    ret(g, 0, 5, 2, 2, '#f8f0e0');
    ret(g, f ? 4 : 5, 13, 2, 2, '#a05020');
    ret(g, f ? 9 : 8, 13, 2, 2, '#a05020');
  } else if (id === 'owl') {
    ret(g, 4, 4, 8, 10, '#9a7048');
    ret(g, 5, 3, 6, 3, '#9a7048');
    ret(g, 5, 8, 6, 5, '#c8a878');
    ret(g, 4, 5, 3, 3, '#f8f0e0');
    ret(g, 9, 5, 3, 3, '#f8f0e0');
    px(g, 5, 6, '#282828');
    px(g, 10, 6, '#282828');
    px(g, 7, 7, '#f0a030');
    px(g, 8, 7, '#f0a030');
    px(g, 4, 2, '#9a7048');
    px(g, 11, 2, '#9a7048');
    ret(g, 5, 14, 2, 1, '#f0a030');
    ret(g, 9, 14, 2, 1, '#f0a030');
    if (f) {
      ret(g, 2, 6, 2, 5, '#7a5838');
      ret(g, 12, 6, 2, 5, '#7a5838');
    } else {
      ret(g, 3, 6, 1, 6, '#7a5838');
      ret(g, 12, 6, 1, 6, '#7a5838');
    }
  } else if (id === 'bird') {
    ret(g, 4, 7, 8, 5, '#4890e0');
    ret(g, 9, 4, 4, 4, '#4890e0');
    ret(g, 5, 8, 5, 3, '#78b8f0');
    px(g, 11, 5, '#282828');
    ret(g, 13, 5, 2, 2, '#f0a030');
    ret(g, 2, 6, 3, 3, '#3878c0');
    if (f) {
      ret(g, 4, 5, 5, 2, '#3878c0');
    }
    ret(g, f ? 6 : 7, 12, 1, 2, '#f0a030');
    ret(g, f ? 9 : 8, 12, 1, 2, '#f0a030');
  } else {
    ret(g, 7, 6, 2, 6, '#484038');
    px(g, 6, 4, '#484038');
    px(g, 9, 4, '#484038');
    const asa = f ? 1 : 0;
    ret(g, 2 + asa, 4, 5 - asa, 5, '#e878b0');
    ret(g, 9, 4, 5 - asa, 5, '#e878b0');
    ret(g, 3 + asa, 9, 4 - asa, 3, '#f8b048');
    ret(g, 9, 9, 4 - asa, 3, '#f8b048');
    px(g, 4 + asa, 5, '#f8f0e0');
    px(g, 11 - asa, 5, '#f8f0e0');
  }
  return contorno(c);
}

export function criarSprites(): Record<string, HTMLCanvasElement | HTMLCanvasElement[]> {
  const s: Record<string, HTMLCanvasElement | HTMLCanvasElement[]> = {
    grama: tileGrama(),
    matinho: tileMatinho(),
    caminho: tileCalcada(),
    arvore: tileArvore(),
    arbusto: tileArbusto(),
    agua: [tileAgua(0), tileAgua(1)],
    flor: [tileFlor(0), tileFlor(1)],
    fonte0: tileFonte(0),
    fonte1: tileFonte(1),
    fonte2: tileFonte(2),
    fonte3: tileFonte(3),
    fonte: tileFonte(0),
    telhado: tileTelhado(P.telhado, P.telhadoBanda, P.telhadoLuz),
    telhadoLab: tileTelhado(P.telhadoLab, P.telhadoLabBanda, P.telhadoLabLuz),
    telhadoPosto: tileTelhado(P.telhadoPosto, P.telhadoPostoBanda, P.telhadoPostoLuz),
    parede: tileParede(),
    porta: tilePorta(),
    retratoDog: retrato('dog'),
    retratoCat: retrato('cat'),
  };
  const camisas: Array<[string, string]> = [
    ['#e04838', '#b03028'],
    ['#4878d0', '#3058a8'],
    ['#58a848', '#3f8838'],
    ['#9868c8', '#7848a8'],
  ];
  camisas.forEach(([cor, escura], i) => {
    for (let d = 0; d < 4; d++) {
      for (let f = 0; f < 2; f++) s['heroi' + i + '-' + d + '-' + f] = heroi(d, f, cor, escura);
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
  ['fox', 'owl', 'bird', 'butterfly'].forEach((id) => {
    s['selvagem-' + id] = [selvagem(id, 0), selvagem(id, 1)];
  });
  return s;
}
