// Meus Documentos: grade re-renderizada do sistema de arquivos virtual.
// Seeds abrem a janela-visualizadora ([data-abre] → delegação global do
// main); notas do aluno abrem via app (arquivo.abrirCom) e têm botão de
// excluir que manda pra Lixeira.
// ATENÇÃO: este módulo é importado no BUILD (Node) pelos arquivos de dados
// (pra usar o HTML_ padrão) — nada de document/window no top-level.
import type { AppInstancia, Arquivo, Contexto } from '../tipos';
import { preencher } from '../ui';


// HTML do Meus Documentos
// Estrutura PADRÃO da janela (compartilhada entre os sims — feature nova
// aqui aparece em todos). Rótulos NEUTROS de era; um sim pode sobrescrever
// o html inteiro nos dados se quiser outra estrutura.
export const HTML_EXPLORADOR = `
      <div class="exp">
        <div class="exp__tools" aria-hidden="true">
          <span class="ie__btn bisel-alto exp__btn--off">◀ Voltar</span>
          <span class="ie__btn bisel-alto exp__btn--off">▲ Acima</span>
        </div>
        <div class="exp__end">
          <span class="exp__rotulo">Endereço</span>
          <span class="bisel-campo exp__caminho">C:\\Meus Documentos</span>
        </div>
        <div class="exp__grade bisel-campo" data-arquivos role="group" aria-label="Arquivos da pasta"></div>
        <div class="exp__status bisel-baixo" data-arquivos-status></div>
      </div>`;

export function criarExplorador(ctx: Contexto): AppInstancia {
  const { textos } = ctx.dados;
  let grade: HTMLElement | null = null;
  let status: HTMLElement | null = null;

  function celula(arq: Arquivo): HTMLElement {
    const item = document.createElement('div');
    item.className = 'arq-item';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'arq';
    btn.dataset.abreArquivo = arq.id; // a delegação global do main resolve
    const nome = document.createElement('span');
    nome.className = 'arq__nome';
    nome.textContent = arq.nome; // nome pode vir do aluno — textContent sempre
    btn.append(ctx.ui.icone(arq.icone, 'arq__ico'), nome);
    item.appendChild(btn);
    if (arq.origem === 'aluno') {
      const excluir = document.createElement('button');
      excluir.type = 'button';
      excluir.className = 'arq__excluir bisel-alto';
      excluir.dataset.exclui = arq.id;
      excluir.setAttribute('aria-label', preencher(textos.excluirRotulo, { nome: arq.nome }));
      excluir.textContent = '✕';
      item.appendChild(excluir);
    }
    return item;
  }

  function render() {
    if (!grade || !status) return;
    const lista = ctx.arquivos.listar();
    grade.replaceChildren(...lista.map(celula));
    status.textContent = preencher(textos.statusPasta, { n: lista.length });
  }

  return {
    montar(sec) {
      grade = sec.querySelector('[data-arquivos]');
      status = sec.querySelector('[data-arquivos-status]');
      render();
      ctx.arquivos.assinar(render);
      // delegação no container (sobrevive ao re-render); [data-abre] dos
      // seeds NÃO é tratado aqui — a delegação global do main cuida
      grade?.addEventListener('click', (e) => {
        const alvo = e.target as Element;
        const exclui = alvo.closest<HTMLElement>('[data-exclui]');
        if (exclui) {
          // o re-render é síncrono: sem este guarda, o 2º clique de um duplo
          // clique acertaria o ✕ do arquivo VIZINHO que assumiu a posição
          // (detail>1 = clique repetido no mesmo lugar, contado pelo navegador)
          if ((e as MouseEvent).detail > 1) return;
          const arq = ctx.arquivos.obter(exclui.dataset.exclui!);
          ctx.audio.somClique();
          if (arq && ctx.arquivos.excluir(arq.id)) {
            ctx.ui.anunciar(preencher(textos.foiPraLixeira, { nome: arq.nome }));
            // devolve o foco que o replaceChildren derrubou pro body
            const proximo =
              grade!.querySelector<HTMLElement>('[data-exclui]') ||
              grade!.querySelector<HTMLElement>('.arq');
            if (proximo) proximo.focus();
          } else {
            ctx.ui.anunciar(textos.protegido);
          }
        }
        // abrir arquivo fica com a delegação global ([data-abre-arquivo])
      });
    },
  };
}
