// Lixeira DE VERDADE: lista o que o aluno excluiu, restaura item a item,
// esvazia com confirmação em dois toques (sem window.confirm). O ícone do
// desktop troca pra "cheia" quando tem coisa dentro (se o sprite tiver
// o symbol #i-lixeira-cheia).
import type { AppInstancia, Contexto } from '../tipos';
import { preencher } from '../ui';

export function criarLixeira(ctx: Contexto): AppInstancia {
  const { textos } = ctx.dados;
  let lista: HTMLElement | null = null;
  let esvaziarBtn: HTMLButtonElement | null = null;
  let secEl: HTMLElement | null = null;
  let confirmando = 0;
  let armadoEm = 0;

  // ícone do desktop cheio/vazio — assina já na criação (funciona antes
  // de a janela da Lixeira ser aberta pela primeira vez)
  const temCheiaSvg = !!document.getElementById('i-lixeira-cheia');
  function atualizarIconeDesktop() {
    const ico = ctx.ui.els.icones.querySelector('[data-abre="lixeira"] .ico');
    if (!ico) return;
    const cheia = ctx.arquivos.naLixeira().length > 0;
    const use = ico.querySelector('use');
    if (use && temCheiaSvg) use.setAttribute('href', cheia ? '#i-lixeira-cheia' : '#i-lixeira');
    if (!ctx.dados.pastaIcones) return;
    // PNG opcional POR ESTADO: lixeira.png / lixeira-cheia.png. Se o do
    // estado não existir, o 404 remove o <img> e o SVG do sprite aparece;
    // recriamos o <img> na próxima troca pra tentar o outro do par.
    const alvo = ctx.dados.pastaIcones + (cheia ? 'lixeira-cheia.png' : 'lixeira.png');
    let img = ico.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      img.alt = '';
      img.addEventListener('load', () => ico.classList.add('ico--png'));
      img.addEventListener('error', () => {
        ico.classList.remove('ico--png');
        img!.remove();
      });
      ico.prepend(img);
    }
    if (!img.src.endsWith(alvo)) img.src = alvo;
  }
  ctx.arquivos.assinar(atualizarIconeDesktop);

  function normalizarEsvaziar() {
    clearTimeout(confirmando);
    confirmando = 0;
    if (esvaziarBtn) esvaziarBtn.textContent = 'Esvaziar Lixeira';
  }

  function render() {
    if (!lista || !esvaziarBtn) return;
    const itens = ctx.arquivos.naLixeira();
    if (!itens.length) {
      const vazia = document.createElement('p');
      vazia.className = 'lixo__vazia';
      vazia.textContent = textos.lixeiraVazia;
      lista.replaceChildren(vazia);
    } else {
      lista.replaceChildren(...itens.map((arq) => {
        const linha = document.createElement('div');
        linha.className = 'lixo__item';
        const nome = document.createElement('span');
        nome.className = 'lixo__nome';
        nome.textContent = arq.nome;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'bisel-alto';
        btn.dataset.restaura = arq.id;
        btn.textContent = textos.restaurar;
        linha.append(ctx.ui.icone(arq.icone), nome, btn);
        return linha;
      }));
    }
    esvaziarBtn.disabled = !itens.length;
    normalizarEsvaziar();
  }

  return {
    montar(sec) {
      secEl = sec;
      lista = sec.querySelector('[data-lixeira-lista]');
      esvaziarBtn = sec.querySelector('[data-lixeira-esvaziar]');
      render();
      ctx.arquivos.assinar(render);
      lista?.addEventListener('click', (e) => {
        const btn = (e.target as Element).closest<HTMLElement>('[data-restaura]');
        if (!btn) return;
        // re-render síncrono: o 2º clique de um duplo clique restauraria o
        // vizinho que assumiu a posição (detail>1 = clique repetido no lugar)
        if ((e as MouseEvent).detail > 1) return;
        const arq = ctx.arquivos.obter(btn.dataset.restaura!);
        ctx.audio.somClique();
        if (arq && ctx.arquivos.restaurar(arq.id)) {
          ctx.ui.anunciar(preencher(textos.restaurado, { nome: arq.nome }));
          // devolve o foco que o replaceChildren derrubou pro body
          const proximo = lista!.querySelector<HTMLElement>('[data-restaura]');
          if (proximo) proximo.focus();
          else if (secEl) secEl.focus({ preventScroll: true });
        }
      });
      esvaziarBtn?.addEventListener('click', () => {
        ctx.audio.somClique();
        if (!confirmando) {
          // 1º toque vira pergunta; sem resposta em 4s, volta ao normal
          esvaziarBtn!.textContent = textos.esvaziarConfirma;
          armadoEm = Date.now();
          confirmando = window.setTimeout(normalizarEsvaziar, 4000);
          return;
        }
        // duplo clique acidental NÃO atravessa a pergunta: o 2º toque só
        // vale depois de meio segundo lendo o "Tem certeza?"
        if (Date.now() - armadoEm < 500) return;
        normalizarEsvaziar();
        ctx.arquivos.esvaziar();
        ctx.ui.anunciar(textos.lixeiraEsvaziada);
        if (secEl) secEl.focus({ preventScroll: true });
      });
    },
  };
}
