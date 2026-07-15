// UI base: ganchos do shell, live region, telas, fábrica de ícone, relógio.
import type { Contexto, ElsShell, UI } from './tipos';

/** 'Salvo como {nome}!' + {nome:'x.txt'} → 'Salvo como x.txt!' */
export function preencher(modelo: string, vars: Record<string, string | number>): string {
  return modelo.replace(/\{(\w+)\}/g, (tudo, chave) => (chave in vars ? String(vars[chave]) : tudo));
}

const SVG_NS = 'http://www.w3.org/2000/svg';

export function criarUI(ctx: Contexto): UI {
  const q = (sel: string) => ctx.raiz.querySelector(sel) as HTMLElement;
  const els: ElsShell = {
    area: q('[data-area]'),
    icones: q('[data-icones]'),
    menu: q('[data-menu]'),
    menuItens: q('[data-menu-itens]'),
    iniciar: q('[data-iniciar]'),
    tarefas: q('[data-tarefas]'),
    anuncio: q('[data-anuncio]'),
    relogio: q('[data-relogio]'),
    mute: q('[data-mute]'),
    muteUse: ctx.raiz.querySelector('[data-mute-use]') as Element,
    aguarde: q('[data-aguarde]'),
    msgFinal: q('[data-msg-final]'),
    religar: q('[data-religar]'),
  };

  function anunciar(msg: string) {
    els.anuncio.textContent = '';
    requestAnimationFrame(() => { els.anuncio.textContent = msg; });
  }

  function trocarTela(nome: 'boot' | 'desktop' | 'desligado') {
    ctx.estado.tela = nome;
    ctx.raiz.querySelectorAll<HTMLElement>('[data-tela]').forEach((t) => {
      t.hidden = t.dataset.tela !== nome;
    });
  }

  // Padrão triplo: PNG opcional (da pastaIcones) cobrindo o <use> do sprite.
  // Se o PNG não existir, o erro remove o <img> e o SVG desenhado aparece —
  // e o nome entra no cache pra não repetir o 404 a cada re-render.
  const semPng = new Set<string>();
  function icone(nome: string, classe?: string): HTMLSpanElement {
    const span = document.createElement('span');
    span.className = 'ico' + (classe ? ' ' + classe : '');
    span.setAttribute('aria-hidden', 'true');
    if (ctx.dados.pastaIcones && !semPng.has(nome)) {
      const img = document.createElement('img');
      img.alt = '';
      img.addEventListener('error', () => {
        semPng.add(nome);
        img.remove();
      });
      img.src = ctx.dados.pastaIcones + nome + '.png';
      span.append(img);
    }
    const svg = document.createElementNS(SVG_NS, 'svg');
    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', '#i-' + nome);
    svg.appendChild(use);
    span.append(svg);
    return span;
  }

  function iniciarRelogio() {
    function tique() {
      els.relogio.textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      setTimeout(tique, 60000 - (Date.now() % 60000) + 250);
    }
    tique();
  }

  return { els, anunciar, trocarTela, icone, iniciarRelogio };
}
