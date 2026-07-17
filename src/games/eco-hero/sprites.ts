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

function contorno(sprite: HTMLCanvasElement, cor = '#2a2620'): HTMLCanvasElement {
  const [c, g] = novo(sprite.width, sprite.height);
  for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) g.drawImage(sprite, ox, oy);
  g.globalCompositeOperation = 'source-in';
  ret(g, 0, 0, c.width, c.height, cor);
  g.globalCompositeOperation = 'source-over';
  g.drawImage(sprite, 0, 0);
  return c;
}

function tileAreia(): HTMLCanvasElement {
  const [c, g] = novo(16, 16);
  ret(g, 0, 0, 16, 16, '#eed28a');
  ret(g, 0, 0, 16, 3, '#f8e6a8');
  ret(g, 0, 3, 16, 1, '#d8b868');
  const pontos: Array<[number, number]> = [[3, 7], [11, 5], [6, 11], [13, 13], [2, 14]];
  for (const [x, y] of pontos) px(g, x, y, '#d8b868');
  return c;
}

function tilePlataforma(): HTMLCanvasElement {
  const [c, g] = novo(16, 16);
  ret(g, 0, 2, 16, 10, '#b8763a');
  ret(g, 0, 2, 16, 2, '#d89858');
  ret(g, 0, 10, 16, 2, '#8a5228');
  ret(g, 7, 2, 1, 10, '#8a5228');
  px(g, 3, 6, '#8a5228');
  px(g, 12, 7, '#8a5228');
  return c;
}

function tileAgua(frame: number): HTMLCanvasElement {
  const [c, g] = novo(16, 16);
  ret(g, 0, 0, 16, 16, '#48a0e0');
  ret(g, 0, 0, 16, 3, '#78c8f0');
  const o = frame ? 4 : 0;
  for (let x = 0; x < 16; x += 8) {
    ret(g, (x + o) % 16, 1, 4, 1, '#b8e8ff');
  }
  ret(g, 0, 10, 16, 6, '#3888c8');
  return c;
}

function tileLodo(frame: number): HTMLCanvasElement {
  const [c, g] = novo(16, 16);
  ret(g, 0, 0, 16, 16, '#5a7a2a');
  ret(g, 0, 0, 16, 3, '#7a9a3a');
  const bolhas: Array<[number, number]> = frame ? [[4, 4], [12, 7]] : [[8, 5], [2, 8]];
  for (const [x, y] of bolhas) {
    px(g, x, y, '#9aba4a');
    px(g, x + 1, y, '#9aba4a');
    px(g, x, y - 1, '#c8d878');
  }
  ret(g, 0, 12, 16, 4, '#465e20');
  return c;
}

function coqueiro(): HTMLCanvasElement {
  const [c, g] = novo(32, 48);
  ret(g, 14, 16, 4, 32, '#9a6a3a');
  ret(g, 15, 16, 1, 32, '#b8854a');
  for (let i = 0; i < 4; i++) {
    px(g, 14 + (i % 2) * 3, 22 + i * 6, '#7a5228');
  }
  const folhas: Array<[number, number, number, number]> = [
    [2, 10, 14, 4], [16, 10, 14, 4], [4, 5, 12, 4], [16, 5, 12, 4], [10, 2, 12, 4],
  ];
  for (const [x, y, w, h] of folhas) {
    ret(g, x, y, w, h, '#3a9a44');
    ret(g, x + 1, y, w - 2, 2, '#52b858');
  }
  ret(g, 12, 12, 3, 3, '#8a5a28');
  ret(g, 17, 12, 3, 3, '#8a5a28');
  return contorno(c);
}

function guardaSol(): HTMLCanvasElement {
  const [c, g] = novo(24, 32);
  ret(g, 11, 8, 2, 24, '#e8e4da');
  for (let i = 0; i < 12; i++) {
    const w = 22 - i * 1.6;
    ret(g, Math.round(12 - w / 2), 8 - i, Math.round(w), 1, i % 4 < 2 ? '#e84848' : '#f8f4ec');
  }
  return contorno(c);
}

function heroi(frame: number): HTMLCanvasElement {
  const [c, g] = novo(16, 16);
  const pele = '#f2c090';
  const camisa = '#38b858';
  const calca = '#3858a0';
  ret(g, 4, 0, 8, 3, '#28a048');
  ret(g, 3, 2, 10, 1, '#28a048');
  ret(g, 4, 3, 8, 4, pele);
  px(g, 6, 4, '#282828');
  px(g, 9, 4, '#282828');
  ret(g, 4, 7, 8, 4, camisa);
  ret(g, 4, 7, 8, 1, '#28a048');
  ret(g, 2, 7, 2, 3, pele);
  ret(g, 12, 7, 2, 3, pele);
  if (frame === 2) {
    ret(g, 4, 11, 3, 3, calca);
    ret(g, 9, 11, 3, 3, calca);
    ret(g, 4, 14, 3, 1, '#403028');
    ret(g, 9, 14, 3, 1, '#403028');
  } else if (frame === 1) {
    ret(g, 3, 11, 3, 3, calca);
    ret(g, 10, 11, 3, 2, calca);
    ret(g, 3, 14, 3, 1, '#403028');
    ret(g, 10, 13, 3, 1, '#403028');
  } else {
    ret(g, 4, 11, 3, 4, calca);
    ret(g, 9, 11, 3, 4, calca);
    ret(g, 4, 15, 3, 1, '#403028');
    ret(g, 9, 15, 3, 1, '#403028');
  }
  return contorno(c);
}

function caranguejo(frame: number): HTMLCanvasElement {
  const [c, g] = novo(16, 12);
  const corpo = '#e86848';
  ret(g, 3, 4, 10, 6, corpo);
  ret(g, 4, 3, 8, 2, '#f88868');
  px(g, 5, 2, '#282828');
  px(g, 10, 2, '#282828');
  px(g, 5, 1, corpo);
  px(g, 10, 1, corpo);
  ret(g, 1, 3, 2, 3, corpo);
  ret(g, 13, 3, 2, 3, corpo);
  const o = frame ? 1 : 0;
  ret(g, 3 + o, 10, 2, 2, '#c84828');
  ret(g, 7, 10, 2, 2, '#c84828');
  ret(g, 11 - o, 10, 2, 2, '#c84828');
  return contorno(c);
}

function casquinha(): HTMLCanvasElement {
  const [c, g] = novo(16, 12);
  ret(g, 3, 4, 10, 7, '#e86848');
  ret(g, 4, 3, 8, 2, '#f88868');
  ret(g, 4, 5, 8, 1, '#c84828');
  ret(g, 5, 7, 6, 1, '#c84828');
  return contorno(c);
}

function lixoGarrafa(): HTMLCanvasElement {
  const [c, g] = novo(10, 12);
  ret(g, 3, 0, 4, 2, '#3878c0');
  ret(g, 2, 2, 6, 9, '#78c8e8');
  ret(g, 3, 3, 2, 7, '#a8e0f0');
  ret(g, 2, 6, 6, 2, '#f0f0f0');
  return contorno(c);
}

function lixoLata(): HTMLCanvasElement {
  const [c, g] = novo(10, 12);
  ret(g, 2, 1, 6, 10, '#c0c8d0');
  ret(g, 2, 1, 6, 2, '#e0e8f0');
  ret(g, 2, 5, 6, 3, '#e84848');
  px(g, 4, 0, '#909aa8');
  return contorno(c);
}

function lixoSacola(): HTMLCanvasElement {
  const [c, g] = novo(12, 12);
  ret(g, 2, 3, 8, 8, '#f0f0f0');
  ret(g, 3, 4, 3, 5, '#d8d8dc');
  ret(g, 3, 1, 2, 3, '#f0f0f0');
  ret(g, 7, 1, 2, 3, '#f0f0f0');
  px(g, 4, 2, '#8fd4f0');
  px(g, 8, 2, '#8fd4f0');
  return contorno(c);
}

function lixeira(aberta: boolean): HTMLCanvasElement {
  const [c, g] = novo(24, 32);
  ret(g, 3, 8, 18, 22, '#38a058');
  ret(g, 4, 9, 4, 20, '#52c072');
  ret(g, 3, 8, 18, 3, '#288048');
  ret(g, 6, 14, 12, 10, '#e8f4ec');
  ret(g, 8, 16, 8, 2, '#288048');
  ret(g, 11, 18, 2, 4, '#288048');
  if (aberta) {
    ret(g, 1, 0, 22, 4, '#288048');
    ret(g, 2, 1, 20, 2, '#38a058');
    px(g, 11, 5, '#f8e048');
    px(g, 13, 6, '#f8e048');
    px(g, 9, 6, '#f8e048');
  } else {
    ret(g, 1, 5, 22, 4, '#288048');
    ret(g, 2, 6, 20, 2, '#38a058');
  }
  return contorno(c);
}

function bandeira(ativa: boolean): HTMLCanvasElement {
  const [c, g] = novo(16, 32);
  ret(g, 7, 0, 2, 32, '#b0b8c0');
  ret(g, 9, 1, 7, 5, ativa ? '#38b858' : '#c0c8d0');
  if (ativa) ret(g, 10, 2, 3, 3, '#f8e048');
  return contorno(c);
}

function fundoPraia(): HTMLCanvasElement {
  const [c, g] = novo(320, 192);
  const ceu = g.createLinearGradient(0, 0, 0, 192);
  ceu.addColorStop(0, '#68b8e8');
  ceu.addColorStop(0.7, '#a8dcf4');
  ceu.addColorStop(1, '#d8f0fa');
  g.fillStyle = ceu;
  g.fillRect(0, 0, 320, 192);
  g.fillStyle = '#f8f4d8';
  g.beginPath();
  g.arc(268, 30, 14, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.85)';
  for (const [x, y, w] of [[40, 34, 34], [150, 22, 44], [240, 52, 30]] as Array<[number, number, number]>) {
    g.beginPath();
    g.ellipse(x, y, w, 8, 0, 0, Math.PI * 2);
    g.ellipse(x + w * 0.4, y - 5, w * 0.55, 7, 0, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

function morros(): HTMLCanvasElement {
  const [c, g] = novo(320, 100);
  g.fillStyle = '#5a9a78';
  g.beginPath();
  g.moveTo(0, 100);
  g.quadraticCurveTo(45, 38, 90, 100);
  g.fill();
  g.beginPath();
  g.moveTo(190, 100);
  g.quadraticCurveTo(250, 20, 292, 100);
  g.fill();
  g.fillStyle = '#4a8a68';
  g.beginPath();
  g.moveTo(216, 100);
  g.quadraticCurveTo(238, 26, 262, 58);
  g.quadraticCurveTo(270, 78, 274, 100);
  g.fill();
  g.fillStyle = '#78b890';
  g.beginPath();
  g.moveTo(90, 100);
  g.quadraticCurveTo(150, 56, 210, 100);
  g.fill();
  return c;
}

function mar(): HTMLCanvasElement {
  const [c, g] = novo(320, 40);
  g.fillStyle = '#3890d0';
  g.fillRect(0, 6, 320, 34);
  g.fillStyle = '#58b0e8';
  g.fillRect(0, 6, 320, 3);
  g.fillStyle = 'rgba(255,255,255,0.5)';
  for (let x = 0; x < 320; x += 26) {
    g.fillRect(x + 4, 12 + (x % 3) * 4, 12, 1);
  }
  return c;
}

export function criarSprites(): Record<string, HTMLCanvasElement | HTMLCanvasElement[]> {
  return {
    areia: tileAreia(),
    plataforma: tilePlataforma(),
    agua: [tileAgua(0), tileAgua(1)],
    lodo: [tileLodo(0), tileLodo(1)],
    coqueiro: coqueiro(),
    guardaSol: guardaSol(),
    heroi: [heroi(0), heroi(1), heroi(2)],
    caranguejo: [caranguejo(0), caranguejo(1)],
    casquinha: casquinha(),
    garrafa: lixoGarrafa(),
    lata: lixoLata(),
    sacola: lixoSacola(),
    lixeiraFechada: lixeira(false),
    lixeiraAberta: lixeira(true),
    bandeira: bandeira(false),
    bandeiraAtiva: bandeira(true),
    fundo: fundoPraia(),
    morros: morros(),
    mar: mar(),
  };
}
