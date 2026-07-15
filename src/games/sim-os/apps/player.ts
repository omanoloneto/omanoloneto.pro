// Reprodutor de Mídia: toca arquivos de áudio DE VERDADE (<audio>).
// A playlist do site vem de dados.playlist (a página escaneia public/ no
// build); faixas do computador do aluno entram só na sessão via
// showDirectoryPicker (fallback <input webkitdirectory>).
//
// CONTRATO DE SKIN — o html da janela (nos dados) fornece os ganchos:
//   [data-player-lista]        container re-renderizado da playlist
//   [data-player-visor-nome]   nome da faixa no visor
//   [data-player-visor-tempo]  '0:12 / 3:07'
//   [data-player-seek]         <input type=range> de posição
//   [data-player-volume]       <input type=range min=0 max=1> de volume
//   [data-player-tocar] [data-player-pausar] [data-player-parar]
//   [data-player-ant] [data-player-prox]
//   [data-player-pasta]        botão "abrir pasta do computador"
//   [data-player-input-pasta]  <input type=file webkitdirectory hidden> (fallback)
//   [data-player-status]       linha de status (role=status)
// Nome de faixa LOCAL é input do aluno — SEMPRE textContent, nunca innerHTML.
import type { AppInstancia, Contexto, Faixa } from '../tipos';
import { preencher } from '../ui';

interface FaixaViva extends Faixa {
  /** veio do computador do aluno (marcação 💻; some no religar) */
  local?: boolean;
  /** id do seed no VFS (só faixas do site — abre por Meus Documentos) */
  idArquivo?: string;
}

const EXT_MUSICA = /\.(mp3|ogg|wav|m4a)$/i;
const MAX_LOCAIS = 100;

export function criarPlayer(ctx: Contexto): AppInstancia {
  const { textos } = ctx.dados;

  let som: HTMLAudioElement | null = null;
  let faixas: FaixaViva[] = [];
  let indice = -1;
  let urlsLocais: string[] = [];
  let arrastandoSeek = false;
  let els: {
    idJanela: string;
    lista: HTMLElement;
    visorNome: HTMLElement;
    visorTempo: HTMLElement;
    seek: HTMLInputElement;
    volume: HTMLInputElement;
    status: HTMLElement;
    inputPasta: HTMLInputElement;
  } | null = null;

  function faixasDoSite(): FaixaViva[] {
    return (ctx.dados.playlist || []).map((f) => ({
      ...f,
      idArquivo: ctx.arquivos.listar().find((a) => a.url === f.url)?.id,
    }));
  }

  function formatarTempo(s: number): string {
    if (!isFinite(s) || isNaN(s)) return '--:--';
    const m = Math.floor(s / 60);
    const seg = Math.floor(s % 60);
    return m + ':' + String(seg).padStart(2, '0');
  }

  function atualizarVisor() {
    if (!els || !som) return;
    if (arrastandoSeek) return; // o dedo no seek é dono do visor até soltar
    const faixa = faixas[indice];
    els.visorNome.textContent = faixa ? (faixa.local ? '💻 ' : '') + faixa.nome : '—';
    els.visorTempo.textContent = faixa
      ? formatarTempo(som.currentTime) + ' / ' + formatarTempo(som.duration)
      : '0:00 / 0:00';
  }

  function marcarAtual() {
    if (!els) return;
    els.lista.querySelectorAll<HTMLElement>('.player__faixa').forEach((b, i) => {
      b.setAttribute('aria-current', String(i === indice));
    });
  }

  function renderLista() {
    if (!els) return;
    if (!faixas.length) {
      const vazio = document.createElement('p');
      vazio.className = 'player__vazio';
      vazio.textContent = textos.playerSemMusicas;
      els.lista.replaceChildren(vazio);
      return;
    }
    els.lista.replaceChildren(...faixas.map((f, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'player__faixa';
      btn.dataset.faixa = String(i);
      const nome = document.createElement('span');
      nome.textContent = (f.local ? '💻 ' : '♪ ') + f.nome; // nome local = input do aluno
      if (f.local) btn.setAttribute('aria-label', f.nome + ' — ' + textos.playerFaixaLocal);
      btn.appendChild(nome);
      return btn;
    }));
    marcarAtual();
  }

  function status(msg: string) {
    if (els) els.status.textContent = msg;
  }

  function tocarIndice(i: number) {
    if (!els || !som || i < 0 || i >= faixas.length) return;
    const faixa = faixas[i];
    const mesma = indice === i && som.src && som.src.endsWith(faixa.url.replace(/^\//, ''));
    indice = i;
    if (!mesma) {
      som.src = faixa.url;
      els.seek.value = '0';
    } else {
      som.currentTime = 0;
    }
    som.muted = ctx.estado.mudo;
    som.play().catch((err) => {
      if (err && err.name === 'AbortError') return; // troca de faixa no meio do play
      status(preencher(textos.playerErro, { nome: faixa.nome }));
    });
    marcarAtual();
    atualizarVisor();
    status(preencher(textos.playerTocando, { nome: faixa.nome }));
    if (ctx.estado.mudo) status(textos.somDesligado);
  }

  function pausar() {
    if (!som || som.paused) return;
    som.pause();
    status(textos.playerPausado);
  }

  function parar() {
    if (!som) return;
    som.pause();
    if (som.src) som.currentTime = 0;
    if (els) els.seek.value = '0';
    atualizarVisor();
    status(textos.playerParado);
  }

  function pular(passo: 1 | -1) {
    if (!faixas.length) return;
    const alvo = indice < 0 ? 0 : indice + passo;
    if (alvo < 0 || alvo >= faixas.length) return;
    tocarIndice(alvo);
  }

  // FSA rejeitou uma vez (política da escola etc.): próximos cliques vão
  // DIRETO pro seletor clássico, dentro do gesto — o click() pós-await pode
  // ser bloqueado por falta de ativação de usuário
  let fsaQuebrado = false;

  function limparLocais() {
    urlsLocais.forEach((u) => URL.revokeObjectURL(u));
    urlsLocais = [];
  }

  function receberLocais(arquivos: File[]) {
    const musicas = arquivos.filter((f) => EXT_MUSICA.test(f.name)).slice(0, MAX_LOCAIS);
    if (!musicas.length) {
      status(textos.playerPastaVazia);
      return;
    }
    // trocar de pasta substitui as locais anteriores
    limparLocais();
    const tocavaLocal = faixas[indice]?.local;
    if (tocavaLocal) parar();
    faixas = faixas.filter((f) => !f.local);
    if (tocavaLocal) indice = -1;
    musicas.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { numeric: true }));
    for (const arq of musicas) {
      const url = URL.createObjectURL(arq);
      urlsLocais.push(url);
      faixas.push({ nome: arq.name, url, local: true });
    }
    renderLista();
    const msg = preencher(textos.playerLocais, { n: musicas.length });
    status(msg);
    ctx.ui.anunciar(msg);
  }

  async function abrirPasta() {
    if (!els) return;
    const picker = (window as any).showDirectoryPicker;
    if (fsaQuebrado || typeof picker !== 'function') {
      els.inputPasta.click();
      return;
    }
    try {
      const dir = await picker.call(window);
      const arquivos: File[] = [];
      for await (const item of dir.values()) {
        if (item.kind !== 'file') continue;
        if (!EXT_MUSICA.test(item.name)) continue;
        arquivos.push(await item.getFile());
        if (arquivos.length >= MAX_LOCAIS) break;
      }
      receberLocais(arquivos);
    } catch (e: any) {
      if (e && e.name === 'AbortError') return; // criança cancelou o diálogo
      // SecurityError e afins: tenta o seletor clássico já (pode ser
      // bloqueado sem gesto) e avisa — o próximo clique vai direto nele
      fsaQuebrado = true;
      status(textos.playerPastaDeNovo);
      els.inputPasta.click();
    }
  }

  const instancia: AppInstancia = {
    montar(sec) {
      const q = <T extends HTMLElement>(s: string) => sec.querySelector(s) as T;
      const idJanela = sec.dataset.janela!;
      els = {
        idJanela,
        lista: q('[data-player-lista]'),
        visorNome: q('[data-player-visor-nome]'),
        visorTempo: q('[data-player-visor-tempo]'),
        seek: q<HTMLInputElement>('[data-player-seek]'),
        volume: q<HTMLInputElement>('[data-player-volume]'),
        status: q('[data-player-status]'),
        inputPasta: q<HTMLInputElement>('[data-player-input-pasta]'),
      };

      som = document.createElement('audio');
      som.preload = 'metadata';
      som.muted = ctx.estado.mudo;
      som.volume = parseFloat(els.volume.value) || 0.8;
      sec.appendChild(som);

      som.addEventListener('loadedmetadata', () => {
        if (!els || !som) return;
        els.seek.max = String(som.duration || 0);
        atualizarVisor();
      });
      som.addEventListener('timeupdate', () => {
        if (!els || !som) return;
        if (!arrastandoSeek) els.seek.value = String(som.currentTime);
        atualizarVisor();
      });
      som.addEventListener('ended', () => {
        if (indice < faixas.length - 1) {
          tocarIndice(indice + 1);
        } else {
          parar(); // visor ainda mostra a última
          indice = -1; // "Aperte ▶ pra ouvir de novo" recomeça a LISTA
          marcarAtual();
          status(textos.playerFimDaLista);
        }
      });
      som.addEventListener('error', () => {
        const faixa = faixas[indice];
        if (faixa) status(preencher(textos.playerErro, { nome: faixa.nome }));
      });

      ctx.audio.aoMudarMudo((mudo) => {
        if (som) som.muted = mudo;
      });

      faixas = faixasDoSite();
      renderLista();
      status(faixas.length ? textos.playerParado : textos.playerSemMusicas);

      // lista (delegação — sobrevive ao re-render)
      els.lista.addEventListener('click', (e) => {
        const btn = (e.target as Element).closest<HTMLElement>('[data-faixa]');
        if (!btn) return;
        ctx.audio.somClique();
        tocarIndice(parseInt(btn.dataset.faixa!, 10));
      });

      q('[data-player-tocar]').addEventListener('click', () => {
        ctx.audio.somClique();
        if (som && !som.paused && som.src) return; // já tocando: ▶ não recomeça
        if (indice >= 0 && som && som.paused && som.src) {
          som.muted = ctx.estado.mudo;
          som.play().catch(() => {});
          status(preencher(textos.playerTocando, { nome: faixas[indice].nome }));
          if (ctx.estado.mudo) status(textos.somDesligado);
        } else {
          tocarIndice(indice >= 0 ? indice : 0);
        }
      });
      q('[data-player-pausar]').addEventListener('click', () => { ctx.audio.somClique(); pausar(); });
      q('[data-player-parar]').addEventListener('click', () => { ctx.audio.somClique(); parar(); });
      q('[data-player-ant]').addEventListener('click', () => { ctx.audio.somClique(); pular(-1); });
      q('[data-player-prox]').addEventListener('click', () => { ctx.audio.somClique(); pular(1); });
      q('[data-player-pasta]').addEventListener('click', () => { ctx.audio.somClique(); abrirPasta(); });

      els.inputPasta.addEventListener('change', () => {
        if (!els) return;
        // imita o "1 nível" do caminho FSA: pasta/arquivo.mp3, sem subpastas
        const arquivos = [...(els.inputPasta.files || [])].filter((f) => {
          const rel = (f as any).webkitRelativePath as string;
          return !rel || rel.split('/').length <= 2;
        });
        receberLocais(arquivos);
        els.inputPasta.value = '';
      });

      // seek: enquanto arrasta, o timeupdate não briga com o dedo
      els.seek.addEventListener('input', () => {
        if (!els || !som) return;
        arrastandoSeek = true;
        els.visorTempo.textContent =
          formatarTempo(parseFloat(els.seek.value)) + ' / ' + formatarTempo(som.duration);
      });
      els.seek.addEventListener('change', () => {
        if (!els || !som) return;
        if (som.src) som.currentTime = parseFloat(els.seek.value) || 0;
        arrastandoSeek = false;
      });
      ['pointerup', 'pointercancel'].forEach((ev) =>
        els!.seek.addEventListener(ev, () => { arrastandoSeek = false; })
      );

      els.volume.addEventListener('input', () => {
        if (som && els) som.volume = parseFloat(els.volume.value) || 0;
      });

      // fechar a janela PARA a música (fiel ao Win98 — sem música fantasma);
      // minimizar não para
      ctx.janelas.antesDeFechar(idJanela, () => {
        parar();
        return true;
      });
    },

    aoReligar() {
      parar();
      limparLocais();
      indice = -1;
      if (som) {
        som.removeAttribute('src');
        som.load();
      }
      faixas = faixasDoSite();
      renderLista();
      atualizarVisor();
      if (els) {
        els.seek.value = '0';
        els.seek.max = '0'; // senão o slider fantasma da faixa antiga mente no visor
      }
    },

    abrirArquivo(id, abridor) {
      const idJanela =
        els?.idJanela ||
        ctx.dados.janelas.find((j) => j.app && ctx.apps[j.app] === instancia)?.id;
      if (!idJanela) return;
      ctx.janelas.abrir(idJanela, abridor);
      const i = faixas.findIndex((f) => f.idArquivo === id);
      if (i >= 0) tocarIndice(i);
    },
  };

  return instancia;
}
