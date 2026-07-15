// Navegador de mentirinha (o "Internet Explorer" do Win98): mini-web vem
// de dados.sites, histórico voltar/avançar, discagem sintetizada, gags de
// download. Entrada do aluno vai SEMPRE por textContent/.value.
// ATENÇÃO: este módulo é importado no BUILD (Node) pelos arquivos de dados
// (pra usar o HTML_ padrão) — nada de document/window no top-level.
import type { AppInstancia, Contexto } from '../tipos';
import { preencher } from '../ui';


// HTML do navegador
// Estrutura PADRÃO da janela (compartilhada entre os sims — feature nova
// aqui aparece em todos). Rótulos NEUTROS de era; um sim pode sobrescrever
// o html inteiro nos dados se quiser outra estrutura.
export const HTML_NAVEGADOR = `
      <div class="ie">
        <div class="ie__tools" role="toolbar" aria-label="Botões de navegação">
          <button type="button" class="ie__btn bisel-alto" data-ie-voltar disabled><span aria-hidden="true">◀</span> Voltar</button>
          <button type="button" class="ie__btn bisel-alto" data-ie-avancar disabled>Avançar <span aria-hidden="true">▶</span></button>
          <button type="button" class="ie__btn bisel-alto" data-ie-atualizar disabled><span aria-hidden="true">⟳</span> Atualizar</button>
          <button type="button" class="ie__btn bisel-alto" data-ie-inicio><span aria-hidden="true">🏠</span> Início</button>
        </div>
        <div class="ie__endereco">
          <label for="ie-url">Endereço</label>
          <input id="ie-url" class="bisel-campo" type="text" data-ie-url inputmode="url"
            autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"
            placeholder="www.algumsite.com.br" />
          <button type="button" class="ie__btn bisel-alto" data-ie-ir>Ir</button>
        </div>
        <div class="ie__pagina bisel-campo" data-ie-pagina tabindex="0" aria-label="Página da internet"></div>
        <div class="ie__status bisel-baixo" role="status" data-ie-status>Pronto</div>
      </div>`;

export function criarNavegador(ctx: Contexto): AppInstancia {
  const { textos } = ctx.dados;
  const HOME = ctx.dados.navegador.home;

  // fontes das páginas: url -> { titulo, el } (clonadas a cada render)
  const fontes = new Map(
    ctx.dados.sites.map((s) => {
      const el = document.createElement('div');
      el.innerHTML = s.html;
      return [s.url, { titulo: s.titulo, el }];
    })
  );

  const estado = { hist: [] as string[], idx: -1, token: 0, discou: false, visitas: 0 };
  let els: {
    idJanela: string;
    tituloBase: string;
    pagina: HTMLElement;
    url: HTMLInputElement;
    status: HTMLElement;
    voltar: HTMLButtonElement;
    avancar: HTMLButtonElement;
    atualizar: HTMLButtonElement;
  } | null = null;

  function siteDe(url: string) {
    return fontes.get(url) || null;
  }

  function normalizarUrl(txt: string): string | null {
    let u = (txt || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
    if (!u) return null;
    if (!siteDe(u) && siteDe('www.' + u)) u = 'www.' + u;
    return u;
  }

  function urlAtual(): string | null {
    return estado.hist[estado.idx] || null;
  }

  function botoes() {
    if (!els) return;
    els.voltar.disabled = estado.idx <= 0;
    els.avancar.disabled = estado.idx >= estado.hist.length - 1;
    els.atualizar.disabled = estado.idx < 0;
  }

  function render(url: string) {
    if (!els) return;
    const fonte = siteDe(url) || siteDe('__erro__')!;
    const clone = fonte.el.cloneNode(true) as HTMLElement;
    const tinhaFoco = els.pagina.contains(document.activeElement);
    els.pagina.replaceChildren(...clone.childNodes);
    els.pagina.scrollTop = 0;
    const eErro = !siteDe(url);
    if (eErro) {
      const alvo = els.pagina.querySelector('[data-url-erro]');
      // textContent, NUNCA innerHTML: o que a criança digitar vira texto inofensivo
      if (alvo) alvo.textContent = 'http://' + url + '/';
    }
    ctx.janelas.definirTitulo(els.idJanela, fonte.titulo + ' — ' + els.tituloBase);
    if (!eErro && url === HOME) {
      estado.visitas++;
      const v = els.pagina.querySelector('[data-visitas]');
      if (v) v.textContent = String(4318 + estado.visitas).padStart(6, '0').replace(/^(\d{3})/, '$1.');
    }
    if (tinhaFoco) els.pagina.focus({ preventScroll: true });
    ctx.ui.anunciar(eErro ? textos.erroPagina : preencher(textos.paginaCarregada, { titulo: fonte.titulo }));
  }

  function navegar(url: string, modo: 'empurra' | 'historico' | 'atualiza') {
    if (!els) return;
    const meu = ++estado.token; // navegação mais nova invalida as pendentes
    somDiscada();
    if (modo === 'empurra') {
      // digitar/clicar no meio do histórico corta o "Avançar" (igual IE de verdade)
      estado.hist = estado.hist.slice(0, estado.idx + 1);
      estado.hist.push(url);
      estado.idx++;
      if (estado.hist.length > 50) { estado.hist.shift(); estado.idx--; }
    }
    botoes();
    els.url.value = 'http://' + url + '/';
    els.status.textContent = preencher(textos.conectando, { url });
    setTimeout(() => {
      if (meu !== estado.token || !els) return;
      render(url);
      els.status.textContent = textos.concluido;
    }, ctx.dados.tempos.navegacao);
  }

  // DTMF + "atendeu" + chiado de modem — só na 1ª navegação que conseguir tocar
  function somDiscada() {
    if (ctx.estado.mudo || !ctx.audio.pronto() || estado.discou) return;
    estado.discou = true;
    ctx.audio.dtmf([[941, 1336], [697, 1209], [770, 1477], [852, 1209]], 0.14, 0.05);
    ctx.audio.tom(2100, 0.6, 0.15, 'sine', 0.045);
    ctx.audio.ruidoFiltrado(0.78, 0.45, 1800, 0.035);
  }

  function irDigitado() {
    if (!els) return;
    const u = normalizarUrl(els.url.value);
    if (!u) {
      els.status.textContent = textos.digiteEndereco;
      return;
    }
    navegar(u, u === urlAtual() ? 'atualiza' : 'empurra');
  }

  return {
    montar(sec) {
      const q = <T extends HTMLElement>(s: string) => sec.querySelector(s) as T;
      els = {
        idJanela: sec.dataset.janela!,
        tituloBase: document.getElementById('jt-' + sec.dataset.janela)!.textContent || '',
        pagina: q('[data-ie-pagina]'),
        url: q<HTMLInputElement>('[data-ie-url]'),
        status: q('[data-ie-status]'),
        voltar: q<HTMLButtonElement>('[data-ie-voltar]'),
        avancar: q<HTMLButtonElement>('[data-ie-avancar]'),
        atualizar: q<HTMLButtonElement>('[data-ie-atualizar]'),
      };
      els.voltar.addEventListener('click', () => {
        if (estado.idx <= 0) return;
        ctx.audio.somClique();
        estado.idx--;
        navegar(urlAtual()!, 'historico');
      });
      els.avancar.addEventListener('click', () => {
        if (estado.idx >= estado.hist.length - 1) return;
        ctx.audio.somClique();
        estado.idx++;
        navegar(urlAtual()!, 'historico');
      });
      els.atualizar.addEventListener('click', () => {
        if (estado.idx < 0) return;
        ctx.audio.somClique();
        navegar(urlAtual()!, 'atualiza');
      });
      q('[data-ie-inicio]').addEventListener('click', () => {
        ctx.audio.somClique();
        navegar(HOME, urlAtual() === HOME ? 'atualiza' : 'empurra');
      });
      q('[data-ie-ir]').addEventListener('click', () => { ctx.audio.somClique(); irDigitado(); });
      els.url.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); irDigitado(); }
        if (e.key === 'Escape') {
          // sem isso o Esc global fecharia a janela enquanto a criança edita a URL
          e.stopPropagation();
          const atual = urlAtual();
          if (atual && els) els.url.value = 'http://' + atual + '/';
        }
      });
      els.url.addEventListener('focus', () => els!.url.select());
      // cliques dentro da página (delegação — sobrevive ao replaceChildren)
      els.pagina.addEventListener('click', (e) => {
        const alvo = e.target as Element;
        const a = alvo.closest<HTMLElement>('[data-vai]');
        if (a) {
          e.preventDefault();
          ctx.audio.somClique();
          const u = normalizarUrl(a.dataset.vai || '');
          if (u) navegar(u, 'empurra');
          return;
        }
        const b = alvo.closest<HTMLElement>('[data-baixar]');
        if (b) {
          ctx.audio.somClique();
          els!.status.textContent = preencher(textos.baixando, { nome: b.dataset.baixar || '' });
          const meu = estado.token;
          setTimeout(() => {
            if (meu === estado.token && els) els.status.textContent = textos.downloadCaiu;
          }, 2500);
          return;
        }
        if (alvo.closest('[data-votar]')) {
          ctx.audio.somClique();
          els!.status.textContent = textos.votou;
        }
      });
    },
    aoAbrir() {
      // primeira abertura (ou pós-religar) conecta na home, com direito a discagem
      if (estado.idx < 0) navegar(HOME, 'empurra');
    },
    aoReligar() {
      // religou = internet "desconectou": histórico zera e a discagem toca de novo
      estado.hist = [];
      estado.idx = -1;
      estado.token++;
      estado.discou = false;
      botoes();
      if (els) els.status.textContent = textos.pronto;
    },
  };
}
