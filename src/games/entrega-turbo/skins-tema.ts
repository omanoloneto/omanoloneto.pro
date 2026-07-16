// Texturas das skins temáticas, desenhadas em canvas na hora (mesma
// técnica das faixas refletivas da traseira — zero arquivo de imagem).
//
// A cabine é ExtrudeGeometry e o gerador de UV padrão do three emite UV
// em UNIDADE DE MUNDO, não 0-1. Com RepeatWrapping isso tem um lado bom:
// o V é a altura em metros, então a faixa do bombeiro cai numa altura
// escolhida em vez de esticar. Padrões orgânicos (pintas, arco-íris) não
// ligam pra posição exata.
import * as THREE from 'three';
import type { Tema } from '../../data/entrega-turbo';

const cache = new Map<Tema, THREE.CanvasTexture>();

function canvas(w: number, h: number, pintar: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  pintar(c.getContext('2d')!);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

const PINTORES: Record<Tema, () => THREE.CanvasTexture> = {
  // vermelho com faixa branca na altura do meio da porta
  bombeiro: () =>
    canvas(64, 64, (g) => {
      g.fillStyle = '#d42a1e';
      g.fillRect(0, 0, 64, 64);
      g.fillStyle = '#f5f5f5';
      g.fillRect(0, 26, 64, 12);
      g.fillStyle = '#ffd23f';
      g.fillRect(0, 38, 64, 3);
    }),
  // azul escuro com faixa branca larga (viatura)
  policia: () =>
    canvas(64, 64, (g) => {
      g.fillStyle = '#1e2a4a';
      g.fillRect(0, 0, 64, 64);
      g.fillStyle = '#f5f5f5';
      g.fillRect(0, 22, 64, 20);
      g.fillStyle = '#1e2a4a';
      g.fillRect(0, 30, 64, 4);
    }),
  // faixas do arco-íris na diagonal
  arcoiris: () =>
    canvas(64, 64, (g) => {
      const cores = ['#ff4d4d', '#ff9f40', '#ffd23f', '#7bc950', '#22a7e0', '#9b6dd6'];
      g.save();
      g.translate(32, 32);
      g.rotate(-Math.PI / 5);
      g.translate(-32, -32);
      cores.forEach((c, i) => {
        g.fillStyle = c;
        g.fillRect(-32, -32 + i * 21, 128, 22);
      });
      g.restore();
    }),
  // pintas de onça: anel escuro com miolo mais escuro, posições fixas
  // (sem Math.random — textura tem que sair igual toda vez)
  oncinha: () =>
    canvas(64, 64, (g) => {
      g.fillStyle = '#e8a33d';
      g.fillRect(0, 0, 64, 64);
      const pintas: Array<[number, number, number]> = [
        [10, 12, 6], [30, 8, 5], [50, 16, 6], [18, 30, 5],
        [40, 34, 6], [58, 40, 5], [8, 48, 6], [28, 54, 5], [48, 58, 6],
      ];
      pintas.forEach(([x, y, r]) => {
        g.strokeStyle = '#5a3a12';
        g.lineWidth = 3;
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.stroke();
        g.fillStyle = '#8a5a20';
        g.beginPath();
        g.arc(x + 1, y + 1, r * 0.45, 0, Math.PI * 2);
        g.fill();
      });
    }),
};

/** Constrói sob demanda e cacheia: as 5 skins de cor não pagam canvas nenhum. */
export function criarTexturaTema(tema: Tema, repetir: number): THREE.CanvasTexture {
  let tex = cache.get(tema);
  if (!tex) {
    tex = PINTORES[tema]();
    cache.set(tema, tex);
  }
  // a mesma textura serve cabine e baú com repeat diferente: clona a view
  // barata (compartilha a imagem, não redesenha o canvas)
  const view = tex.clone();
  view.needsUpdate = true;
  view.repeat.set(repetir, repetir);
  return view;
}
