// Menu iniciar: renderiza os itens dos dados, alterna com aria-expanded,
// fecha ao clicar fora. O item Desligar chama o callback do main.
import type { Contexto } from './tipos';

export interface Menu {
  alternar(abrir?: boolean): void;
}

export function criarMenu(ctx: Contexto, opcoes: { aoDesligar: () => void }): Menu {
  const { menu, menuItens, iniciar } = ctx.ui.els;

  function itemMenu(icone: string, rotulo: string): { li: HTMLLIElement; btn: HTMLButtonElement } {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.append(ctx.ui.icone(icone, 'menu__ico'), document.createTextNode(rotulo));
    li.appendChild(btn);
    return { li, btn };
  }

  ctx.dados.menu.forEach((m) => {
    const { li, btn } = itemMenu(m.icone, m.rotulo);
    btn.dataset.abre = m.id;
    menuItens.appendChild(li);
  });
  const sep = document.createElement('li');
  sep.className = 'menu__sep';
  sep.setAttribute('aria-hidden', 'true');
  menuItens.appendChild(sep);
  const desligar = itemMenu(ctx.dados.desligar.icone, ctx.dados.desligar.rotulo);
  desligar.btn.dataset.desligar = '';
  desligar.btn.addEventListener('click', opcoes.aoDesligar);
  menuItens.appendChild(desligar.li);

  function alternar(abrir?: boolean) {
    const alvo = typeof abrir === 'boolean' ? abrir : menu.hidden;
    ctx.estado.menuAberto = alvo;
    menu.hidden = !alvo;
    iniciar.setAttribute('aria-expanded', String(alvo));
    if (alvo) {
      ctx.audio.somClique();
      const primeiro = menu.querySelector<HTMLElement>('button');
      if (primeiro) primeiro.focus();
    }
  }

  iniciar.addEventListener('click', () => alternar());
  document.addEventListener('pointerdown', (e) => {
    if (!ctx.estado.menuAberto) return;
    if ((e.target as Element).closest('[data-menu],[data-iniciar]')) return;
    alternar(false);
  });

  return { alternar };
}
