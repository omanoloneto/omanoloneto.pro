// Bloco de Notas DE VERDADE: escreve, salva como .txt em Meus Documentos
// (sistema de arquivos virtual — só na sessão), reabre, edita, baixa.
// Instância única, como o notepad original. Nome digitado pelo aluno passa
// SEMPRE por textContent/aria-label — nunca innerHTML.
// ATENÇÃO: este módulo é importado no BUILD (Node) pelos arquivos de dados
// (pra usar o HTML_ padrão) — nada de document/window no top-level.
import type { AppInstancia, Contexto } from '../tipos';
import { preencher } from '../ui';


// HTML do Bloco de Notas
// Estrutura PADRÃO da janela (compartilhada entre os sims — feature nova
// aqui aparece em todos). Rótulos NEUTROS de era; um sim pode sobrescrever
// o html inteiro nos dados se quiser outra estrutura.
export const HTML_BLOCO_DE_NOTAS = `
      <div class="notas">
        <div class="notas__menu" role="toolbar" aria-label="Menu do Bloco de Notas">
          <button type="button" data-nota-novo>Novo</button>
          <button type="button" data-nota-salvar>Salvar</button>
          <button type="button" data-nota-baixar>Baixar</button>
        </div>
        <div class="notas__aviso bisel-baixo" data-nota-confirma hidden>
          <span data-nota-confirma-msg></span>
          <span class="notas__aviso-botoes">
            <button type="button" class="bisel-alto" data-nota-descartar>Descartar</button>
            <button type="button" class="bisel-alto" data-nota-voltar>Voltar</button>
          </span>
        </div>
        <div class="notas__aviso bisel-baixo" data-nota-salvarcomo hidden>
          <label for="nota-nome">Nome:</label>
          <input id="nota-nome" class="bisel-campo" type="text" data-nota-nome maxlength="44"
            autocomplete="off" placeholder="minha nota" />
          <span class="notas__aviso-botoes">
            <button type="button" class="bisel-alto" data-nota-confirmar>Salvar</button>
            <button type="button" class="bisel-alto" data-nota-cancelar>Cancelar</button>
          </span>
        </div>
        <textarea class="notas__texto bisel-campo" data-nota-texto spellcheck="false"
          aria-label="Texto da nota" placeholder="Escreva aqui a sua nota…"></textarea>
        <div class="notas__status bisel-baixo" data-nota-status></div>
      </div>`;

export function criarBlocoDeNotas(ctx: Contexto): AppInstancia {
  const { textos } = ctx.dados;

  let arquivoId: string | null = null;
  let nomeAtual: string | null = null;
  let sujo = false;
  let acaoPendente: (() => void) | null = null;
  let flashTimer = 0;

  let els: {
    idJanela: string;
    sufixo: string; // ' — Bloco de Notas' (vem do título inicial da janela)
    texto: HTMLTextAreaElement;
    status: HTMLElement;
    confirma: HTMLElement;
    confirmaMsg: HTMLElement;
    salvarcomo: HTMLElement;
    nome: HTMLInputElement;
  } | null = null;

  function atualizarTitulo() {
    if (!els) return;
    const nome = nomeAtual || textos.semTitulo;
    ctx.janelas.definirTitulo(els.idJanela, (sujo ? '*' : '') + nome + els.sufixo);
  }

  function atualizarStatus() {
    if (!els) return;
    clearTimeout(flashTimer);
    els.status.textContent = nomeAtual || textos.semTitulo;
  }

  function flash(msg: string) {
    if (!els) return;
    els.status.textContent = msg;
    clearTimeout(flashTimer);
    flashTimer = window.setTimeout(atualizarStatus, 2500);
  }

  function esconderBarras() {
    if (!els) return;
    els.confirma.hidden = true;
    els.salvarcomo.hidden = true;
    acaoPendente = null;
  }

  function mostrarConfirma(acao: () => void) {
    if (!els) return;
    els.salvarcomo.hidden = true;
    els.confirmaMsg.textContent = textos.naoSalvou;
    els.confirma.hidden = false;
    acaoPendente = acao;
    ctx.ui.anunciar(textos.naoSalvou);
    els.confirma.querySelector<HTMLElement>('[data-nota-voltar]')?.focus();
  }

  function abrirSalvarComo() {
    if (!els) return;
    els.confirma.hidden = true;
    els.salvarcomo.hidden = false;
    els.nome.value = nomeAtual ? nomeAtual.replace(/\.txt$/i, '') : '';
    els.nome.focus();
    els.nome.select();
  }

  // trim + remove caracteres proibidos/de controle + .txt automático
  function limparNome(bruto: string): string | null {
    const limpo = bruto.replace(/[\u0000-\u001f\\/:"<>|*?]/g, '').trim();
    // corta por code POINT (Array.from), não por code unit — não parte emoji ao meio
    const n = Array.from(limpo).slice(0, 40).join('').trim();
    if (!n) return null;
    return /\.txt$/i.test(n) ? n : n + '.txt';
  }

  function confirmarSalvarComo() {
    if (!els) return;
    const nome = limparNome(els.nome.value);
    if (!nome) {
      flash(textos.nomeInvalido);
      ctx.ui.anunciar(textos.nomeInvalido);
      els.nome.focus();
      return;
    }
    const nomeFinal = ctx.arquivos.nomeLivre(nome); // colisão vira "nota (2).txt"
    const arq = ctx.arquivos.criarNota(nomeFinal, els.texto.value);
    arquivoId = arq.id;
    nomeAtual = arq.nome;
    sujo = false;
    els.salvarcomo.hidden = true;
    atualizarTitulo();
    atualizarStatus();
    const msg = preencher(textos.salvoComo, { nome: nomeFinal });
    flash(msg);
    ctx.ui.anunciar(msg);
    els.texto.focus();
  }

  function salvar() {
    if (!els) return;
    if (arquivoId && ctx.arquivos.salvarNota(arquivoId, els.texto.value)) {
      sujo = false;
      esconderBarras(); // salvar resolve o "você não salvou" — barra não pode ficar mentindo
      atualizarTitulo();
      flash(textos.salvo);
      ctx.ui.anunciar(textos.salvo);
      return;
    }
    // sem arquivo ainda (ou a nota foi pra Lixeira) → salvar como
    abrirSalvarComo();
  }

  function novo() {
    if (!els) return;
    const fazer = () => {
      if (!els) return;
      els.texto.value = '';
      arquivoId = null;
      nomeAtual = null;
      sujo = false;
      esconderBarras();
      atualizarTitulo();
      atualizarStatus();
      els.texto.focus();
    };
    if (sujo) mostrarConfirma(fazer);
    else fazer();
  }

  function baixar() {
    if (!els) return;
    const blob = new Blob([els.texto.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeAtual || 'minha nota.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const instancia: AppInstancia = {
    montar(sec) {
      const q = <T extends HTMLElement>(s: string) => sec.querySelector(s) as T;
      const idJanela = sec.dataset.janela!;
      const tituloInicial = document.getElementById('jt-' + idJanela)?.textContent || '';
      const traco = tituloInicial.indexOf('—');
      els = {
        idJanela,
        sufixo: traco >= 0 ? ' ' + tituloInicial.slice(traco) : '',
        texto: q<HTMLTextAreaElement>('[data-nota-texto]'),
        status: q('[data-nota-status]'),
        confirma: q('[data-nota-confirma]'),
        confirmaMsg: q('[data-nota-confirma-msg]'),
        salvarcomo: q('[data-nota-salvarcomo]'),
        nome: q<HTMLInputElement>('[data-nota-nome]'),
      };
      atualizarStatus();

      q('[data-nota-novo]').addEventListener('click', () => { ctx.audio.somClique(); novo(); });
      q('[data-nota-salvar]').addEventListener('click', () => { ctx.audio.somClique(); salvar(); });
      q('[data-nota-baixar]').addEventListener('click', () => { ctx.audio.somClique(); baixar(); });
      q('[data-nota-confirmar]').addEventListener('click', () => { ctx.audio.somClique(); confirmarSalvarComo(); });
      q('[data-nota-cancelar]').addEventListener('click', () => {
        ctx.audio.somClique();
        els!.salvarcomo.hidden = true;
        els!.texto.focus();
      });
      q('[data-nota-descartar]').addEventListener('click', () => {
        ctx.audio.somClique();
        sujo = false;
        // descartar = voltar pro último estado salvo (senão o texto "descartado"
        // continua no buffer e um Salvar depois grava o que a criança jogou fora)
        if (els) {
          const arq = arquivoId ? ctx.arquivos.obter(arquivoId) : null;
          els.texto.value = (arq && arq.texto) || '';
        }
        atualizarTitulo();
        const acao = acaoPendente;
        esconderBarras();
        if (acao) acao();
      });
      q('[data-nota-voltar]').addEventListener('click', () => {
        ctx.audio.somClique();
        esconderBarras();
        els!.texto.focus();
      });

      els.texto.addEventListener('input', () => {
        if (!sujo) {
          sujo = true;
          atualizarTitulo();
        }
      });
      // Esc no textarea/input NÃO pode fechar a janela (Esc global)
      els.texto.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        e.stopPropagation();
        if (els && (!els.confirma.hidden || !els.salvarcomo.hidden)) {
          esconderBarras();
        }
      });
      // Esc com QUALQUER barra inline aberta só fecha a barra — senão o Esc
      // global fecha a janela no meio do salvar-como/confirmação
      sec.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape' || !els) return;
        if (els.confirma.hidden && els.salvarcomo.hidden) return;
        e.stopPropagation();
        esconderBarras();
        els.texto.focus();
      });
      els.nome.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          confirmarSalvarComo();
        }
        if (e.key === 'Escape') {
          e.stopPropagation();
          els!.salvarcomo.hidden = true;
          els!.texto.focus();
        }
      });

      // fechar com texto não salvo pede confirmação (veto + barra inline)
      ctx.janelas.antesDeFechar(idJanela, () => {
        if (!sujo) return true;
        mostrarConfirma(() => ctx.janelas.fechar(idJanela));
        return false;
      });
    },

    aoAbrir() {
      if (els && els.confirma.hidden && els.salvarcomo.hidden) els.texto.focus();
    },

    aoReligar() {
      // desligou = perdeu o que não salvou (as notas SALVAS ficam no "disco")
      if (!els) return;
      els.texto.value = '';
      arquivoId = null;
      nomeAtual = null;
      sujo = false;
      esconderBarras();
      atualizarTitulo();
      atualizarStatus();
    },

    abrirArquivo(id, abridor) {
      const arq = ctx.arquivos.obter(id);
      if (!arq) return;
      // acha a própria janela pelo registro (primeira vez constrói via abrir)
      const idJanela =
        els?.idJanela ||
        ctx.dados.janelas.find((j) => j.app && ctx.apps[j.app] === instancia)?.id;
      if (!idJanela) return;
      ctx.janelas.abrir(idJanela, abridor);
      if (!els) return;
      const carregar = () => {
        if (!els) return;
        els.texto.value = arq.texto || '';
        arquivoId = arq.id;
        nomeAtual = arq.nome;
        sujo = false;
        esconderBarras();
        atualizarTitulo();
        atualizarStatus();
        els.texto.focus();
      };
      // sujo? confirma SEMPRE — recarregar até o mesmo arquivo descartaria a edição
      if (sujo) mostrarConfirma(carregar);
      else carregar();
    },
  };

  return instancia;
}
