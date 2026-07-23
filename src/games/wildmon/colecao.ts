import type { Colecao, Contexto } from './tipos';
import { TIPO_NOME } from '../../data/wildmon';

export function criarColecao(ctx: Contexto): Colecao {
  const $ = (s: string) => document.querySelector(s) as HTMLElement;
  const modal = $('[data-colecao]');
  const grade = $('[data-colecao-grade]');
  const contagem = $('[data-colecao-contagem]');

  function clonar(src: HTMLCanvasElement): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = src.width;
    c.height = src.height;
    c.getContext('2d')!.drawImage(src, 0, 0);
    return c;
  }

  function montar() {
    grade.innerHTML = '';
    const colecao = ctx.estado.colecao;
    for (const e of ctx.especies) {
      const cel = document.createElement('div');
      cel.className = 'dex-cel';
      const tem = colecao.includes(e.id);
      const sp = ctx.sprites['batalha-' + e.id] as HTMLCanvasElement | undefined;
      const arte = document.createElement('div');
      arte.className = 'dex-arte';
      if (sp) {
        const c = clonar(sp);
        if (!tem) cel.classList.add('oculto');
        arte.appendChild(c);
      } else {
        cel.classList.add('bloqueado');
        arte.textContent = '?';
      }
      cel.appendChild(arte);
      const nome = document.createElement('strong');
      nome.textContent = tem ? e.nome : '???';
      const trad = document.createElement('span');
      trad.textContent = tem ? e.traducao + ' · ' + TIPO_NOME[e.tipo] : (sp ? 'ainda não é amigo' : 'em breve');
      cel.appendChild(nome);
      cel.appendChild(trad);
      grade.appendChild(cel);
    }
    contagem.textContent = colecao.length + '/' + ctx.especies.length;
  }

  return {
    abrir() {
      montar();
      ctx.estado.fase = 'colecao';
      modal.hidden = false;
    },
    fechar() {
      modal.hidden = true;
      ctx.estado.fase = 'jogando';
    },
    aberta: () => !modal.hidden,
  };
}
