// Menu iniciar: renderiza os itens dos dados (com cascata de 1 nível),
// alterna com aria-expanded, fecha ao clicar fora. Item Desligar chama o
// callback do main.
import type { Contexto, ItemMenu } from './tipos';

export interface Menu {
  alternar(abrir?: boolean): void;
}

export function criarMenu(ctx: Contexto, opcoes: { aoDesligar: () => void }): Menu {
  const { menu, menuItens, iniciar } = ctx.ui.els;
  // grupos com submenu (pra fechar todos de uma vez)
  const grupos: Array<{ sub: HTMLElement; btn: HTMLButtonElement }> = [];

  function botaoItem(icone: string, rotulo: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.append(ctx.ui.icone(icone, 'menu__ico'), document.createTextNode(rotulo));
    return btn;
  }

  function fecharSubs() {
    grupos.forEach((g) => {
      g.sub.hidden = true;
      g.btn.setAttribute('aria-expanded', 'false');
    });
  }

  function itemMenu(m: ItemMenu): HTMLLIElement {
    const li = document.createElement('li');
    const btn = botaoItem(m.icone, m.rotulo);
    if (m.submenu) {
      // grupo com cascata: clique/hover abre; fecha junto com o menu
      li.className = 'menu__grupo';
      // sem aria-haspopup="menu": o submenu é lista de botões (padrão
      // disclosure), não um widget role=menu com navegação por setas
      btn.setAttribute('aria-expanded', 'false');
      const seta = document.createElement('span');
      seta.className = 'menu__seta';
      seta.setAttribute('aria-hidden', 'true');
      seta.textContent = '▶';
      btn.appendChild(seta);
      const sub = document.createElement('ul');
      sub.className = 'menu__sub bisel-alto';
      sub.hidden = true;
      m.submenu.forEach((s) => sub.appendChild(itemMenu(s)));
      const abrirSub = () => {
        fecharSubs();
        sub.hidden = false;
        btn.setAttribute('aria-expanded', 'true');
      };
      btn.addEventListener('click', () => { ctx.audio.somClique(); abrirSub(); });
      // hover só de mouse — no touch, o pointerenter do tap brigaria com o click
      btn.addEventListener('pointerenter', (e) => {
        if (e.pointerType === 'mouse') abrirSub();
      });
      grupos.push({ sub, btn });
      li.append(btn, sub);
    } else {
      if (m.id) btn.dataset.abre = m.id;
      li.appendChild(btn);
    }
    return li;
  }

  ctx.dados.menu.forEach((m) => menuItens.appendChild(itemMenu(m)));
  const sep = document.createElement('li');
  sep.className = 'menu__sep';
  sep.setAttribute('aria-hidden', 'true');
  menuItens.appendChild(sep);
  const liDesligar = document.createElement('li');
  const btnDesligar = botaoItem(ctx.dados.desligar.icone, ctx.dados.desligar.rotulo);
  btnDesligar.dataset.desligar = '';
  btnDesligar.addEventListener('click', opcoes.aoDesligar);
  liDesligar.appendChild(btnDesligar);
  menuItens.appendChild(liDesligar);

  function alternar(abrir?: boolean) {
    const alvo = typeof abrir === 'boolean' ? abrir : menu.hidden;
    ctx.estado.menuAberto = alvo;
    menu.hidden = !alvo;
    iniciar.setAttribute('aria-expanded', String(alvo));
    fecharSubs();
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
