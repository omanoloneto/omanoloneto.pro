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

type Parte = 'cabine' | 'bau';
type Pintor = () => THREE.CanvasTexture;

const cache = new Map<string, THREE.CanvasTexture>();

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

// desenha manchas em posições FIXAS (nada de Math.random: a textura tem
// que sair igual toda vez que o jogo abre)
function manchas(
  g: CanvasRenderingContext2D,
  pontos: Array<[number, number, number]>,
  pintar: (x: number, y: number, r: number) => void
) {
  pontos.forEach(([x, y, r]) => pintar(x, y, r));
}

// ----- pintores por tema -----
// `bau` ausente = usa o pintor da cabine (caminhão inteiro na mesma
// estampa, que é o que os 4 primeiros temas sempre fizeram)
const PINTORES: Record<Tema, { cabine: Pintor; bau?: Pintor }> = {
  // vermelho com faixa branca na altura do meio da porta
  bombeiro: {
    cabine: () =>
      canvas(64, 64, (g) => {
        g.fillStyle = '#d42a1e';
        g.fillRect(0, 0, 64, 64);
        g.fillStyle = '#f5f5f5';
        g.fillRect(0, 26, 64, 12);
        g.fillStyle = '#ffd23f';
        g.fillRect(0, 38, 64, 3);
      }),
  },
  // azul escuro com faixa branca larga (viatura)
  policia: {
    cabine: () =>
      canvas(64, 64, (g) => {
        g.fillStyle = '#1e2a4a';
        g.fillRect(0, 0, 64, 64);
        g.fillStyle = '#f5f5f5';
        g.fillRect(0, 22, 64, 20);
        g.fillStyle = '#1e2a4a';
        g.fillRect(0, 30, 64, 4);
      }),
  },
  // faixas do arco-íris na diagonal
  arcoiris: {
    cabine: () =>
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
  },
  // pintas de onça: anel escuro com miolo mais escuro
  oncinha: {
    cabine: () =>
      canvas(64, 64, (g) => {
        g.fillStyle = '#e8a33d';
        g.fillRect(0, 0, 64, 64);
        manchas(g, [
          [10, 12, 6], [30, 8, 5], [50, 16, 6], [18, 30, 5],
          [40, 34, 6], [58, 40, 5], [8, 48, 6], [28, 54, 5], [48, 58, 6],
        ], (x, y, r) => {
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
  },
  // Bob Esponja: esponja furada + camisa branca com gravata. A faixa da
  // camisa fica na mesma altura de canvas da faixa do bombeiro (y 26-38),
  // que já se provou caindo no meio da cabine.
  bobesponja: {
    cabine: () =>
      canvas(64, 64, (g) => {
        g.fillStyle = '#f5e94e';
        g.fillRect(0, 0, 64, 64);
        // furos da esponja
        manchas(g, [
          [10, 8, 4], [34, 5, 3], [52, 12, 4], [20, 18, 3],
          [44, 20, 4], [6, 46, 3], [26, 50, 4], [48, 46, 3], [58, 56, 4], [14, 60, 3],
        ], (x, y, r) => {
          g.fillStyle = '#d9c81f';
          g.beginPath();
          g.ellipse(x, y, r, r * 0.8, 0, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = '#bfae12';
          g.beginPath();
          g.ellipse(x, y + r * 0.2, r * 0.5, r * 0.4, 0, 0, Math.PI * 2);
          g.fill();
        });
        // camisa branca + colarinho
        g.fillStyle = '#fbfbfb';
        g.fillRect(0, 26, 64, 12);
        g.fillStyle = '#e6e6e6';
        g.fillRect(0, 26, 64, 2);
        // gravata vermelha (repete ao longo da faixa: a cabine dá ~1 ciclo)
        g.fillStyle = '#d1332b';
        [16, 48].forEach((cx) => {
          g.beginPath();
          g.moveTo(cx - 3, 28);
          g.lineTo(cx + 3, 28);
          g.lineTo(cx + 2, 38);
          g.lineTo(cx - 2, 38);
          g.closePath();
          g.fill();
        });
        // calça marrom começa embaixo da camisa
        g.fillStyle = '#8b6d3f';
        g.fillRect(0, 38, 64, 4);
      }),
    // carroceria = a calça marrom, com o cinto preto
    bau: () =>
      canvas(64, 64, (g) => {
        g.fillStyle = '#8b6d3f';
        g.fillRect(0, 0, 64, 64);
        g.fillStyle = '#7a5f36';
        g.fillRect(0, 30, 64, 34); // costura da perna
        g.fillStyle = '#2e2013';
        g.fillRect(0, 22, 64, 6); // cinto
        g.fillStyle = '#e8c34a';
        [16, 48].forEach((cx) => g.fillRect(cx - 4, 21, 8, 8)); // fivela
      }),
  },
  // Patrick: rosa com pintinhas + short verde de flor roxa
  patrick: {
    cabine: () =>
      canvas(64, 64, (g) => {
        g.fillStyle = '#f2a3c7';
        g.fillRect(0, 0, 64, 64);
        manchas(g, [
          [8, 10, 3], [28, 6, 2], [48, 14, 3], [16, 26, 2],
          [38, 30, 3], [58, 22, 2], [10, 44, 3], [30, 52, 2], [50, 48, 3], [22, 60, 2],
        ], (x, y, r) => {
          g.fillStyle = '#d9709f';
          g.beginPath();
          g.arc(x, y, r, 0, Math.PI * 2);
          g.fill();
        });
      }),
    // carroceria = o short verde florido.
    // Grade 3×3: o baú usa repeat 0.35, ou seja só ~1/3 da textura entra na
    // face — flor esparsa simplesmente não aparece. Espalhadas assim,
    // qualquer janela pega uma.
    bau: () =>
      canvas(64, 64, (g) => {
        g.fillStyle = '#6fbf5e';
        g.fillRect(0, 0, 64, 64);
        const grade: Array<[number, number, number]> = [];
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) grade.push([11 + i * 21, 11 + j * 21, 5]);
        }
        manchas(g, grade, (x, y, r) => {
          // florzinha: 5 pétalas roxas com miolo claro
          g.fillStyle = '#9b6dd6';
          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2;
            g.beginPath();
            g.arc(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, r * 0.42, 0, Math.PI * 2);
            g.fill();
          }
          g.fillStyle = '#ffe9a8';
          g.beginPath();
          g.arc(x, y, r * 0.3, 0, Math.PI * 2);
          g.fill();
        });
      }),
  },
};

/** Constrói sob demanda e cacheia: as skins de cor não pagam canvas nenhum. */
export function criarTexturaTema(tema: Tema, repetir: number, parte: Parte): THREE.CanvasTexture {
  const chave = tema + ':' + parte;
  let tex = cache.get(chave);
  if (!tex) {
    const p = PINTORES[tema];
    tex = (p[parte] || p.cabine)();
    cache.set(chave, tex);
  }
  // o repeat difere entre cabine e baú: clona a view (compartilha a
  // imagem, não redesenha o canvas)
  const view = tex.clone();
  view.needsUpdate = true;
  view.repeat.set(repetir, repetir);
  return view;
}

// ----- rostos (só Bob e Patrick) -----
// Plano transparente colado no para-brisa: o vidro aparece em volta dos
// olhos. Canvas na proporção do para-brisa (1.9 × 0.78 ≈ 2.44:1).
function olho(
  g: CanvasRenderingContext2D,
  x: number, y: number, rx: number, ry: number,
  iris: string, rIris: number
) {
  g.fillStyle = '#ffffff';
  g.strokeStyle = '#1a1a1a';
  g.lineWidth = 4;
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.fillStyle = iris;
  g.beginPath();
  g.arc(x, y + 2, rIris, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#101010';
  g.beginPath();
  g.arc(x, y + 2, rIris * 0.5, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(x - rIris * 0.4, y - rIris * 0.3, rIris * 0.28, 0, Math.PI * 2);
  g.fill();
}

const ROSTOS: Record<'bobesponja' | 'patrick', () => THREE.CanvasTexture> = {
  // olhos grandes, íris azul, cílios
  bobesponja: () =>
    canvas(256, 106, (g) => {
      olho(g, 88, 56, 38, 34, '#2f8fd8', 15);
      olho(g, 168, 56, 38, 34, '#2f8fd8', 15);
      g.strokeStyle = '#1a1a1a';
      g.lineWidth = 4;
      g.lineCap = 'round';
      [88, 168].forEach((cx) => {
        [-0.9, -0.4, 0.1].forEach((a) => {
          const ax = cx + Math.sin(a) * 34;
          const ay = 56 - Math.cos(a) * 30;
          g.beginPath();
          g.moveTo(ax, ay);
          g.lineTo(ax + Math.sin(a) * 12, ay - Math.cos(a) * 12);
          g.stroke();
        });
      });
    }),
  // olhos menores e sobrancelhas grossas
  patrick: () =>
    canvas(256, 106, (g) => {
      olho(g, 92, 60, 27, 24, '#3a7fc4', 10);
      olho(g, 164, 60, 27, 24, '#3a7fc4', 10);
      g.strokeStyle = '#1a1a1a';
      g.lineWidth = 7;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(68, 28);
      g.lineTo(112, 22);
      g.stroke();
      g.beginPath();
      g.moveTo(144, 22);
      g.lineTo(188, 28);
      g.stroke();
    }),
};

const cacheRosto = new Map<string, THREE.CanvasTexture>();

/** Textura do rosto, ou null pros temas que não têm cara. */
export function criarTexturaRosto(tema: Tema | undefined): THREE.CanvasTexture | null {
  if (tema !== 'bobesponja' && tema !== 'patrick') return null;
  let tex = cacheRosto.get(tema);
  if (!tex) {
    tex = ROSTOS[tema]();
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; // rosto não repete
    cacheRosto.set(tema, tex);
  }
  return tex;
}
