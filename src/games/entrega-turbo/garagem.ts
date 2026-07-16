// Garagem: o cofre de moedas + a loja de skins.
//
// Os PONTOS SÃO AS MOEDAS: todo ponto ganho entra no placar da partida
// (estado.pontos, que vai pro ranking) E no cofre, que sobrevive entre
// partidas. Comprar debita só o cofre — o placar da partida nunca é
// tocado, senão a compra viraria trapaça no ranking.
//
// Crédito é AO VIVO, não no fim do turno: criança fecha a aba no meio
// da partida e não pode perder o que ganhou.
import type { Contexto, Garagem } from './tipos';

const CHAVE = 'entrega-turbo:garagem';
const VERSAO = 1;
const DEBOUNCE_MS = 400;
const SALDO_MAX = 9_999_999;

type Save = { v: number; saldo: number; compradas: string[]; escolhida: string };

export function criarGaragem(ctx: Contexto): Garagem {
  const { skins } = ctx;
  const GRATIS = skins[0].id;
  const IDS = new Set(skins.map((s) => s.id));

  const padrao = (): Save => ({ v: VERSAO, saldo: 0, compradas: [GRATIS], escolhida: GRATIS });

  // Carga defensiva: qualquer coisa estranha vira o padrão em vez de
  // quebrar o jogo. Save é localStorage — criança mexe, extensão mexe,
  // versão velha do jogo mexe.
  function ler(): Save {
    let cru: unknown;
    try {
      const txt = localStorage.getItem(CHAVE);
      if (!txt) return padrao();
      cru = JSON.parse(txt);
    } catch (_) {
      return padrao(); // JSON corrompido
    }
    // typeof null === 'object': precisa do teste explícito
    if (typeof cru !== 'object' || cru === null || Array.isArray(cru)) return padrao();
    const o = cru as Record<string, unknown>;
    if (o.v !== VERSAO) return padrao(); // versão desconhecida/futura: recusa inteiro

    // '{"saldo":1e999}' é JSON válido e parseia pra Infinity; NaN também passa
    // pelo typeof. Number.isFinite pega os dois.
    const saldoCru = o.saldo;
    const saldo = typeof saldoCru === 'number' && Number.isFinite(saldoCru)
      ? Math.max(0, Math.min(SALDO_MAX, Math.floor(saldoCru)))
      : 0;

    // só ids que existem hoje, sem repetir, e a grátis sempre dentro
    const compradas = Array.isArray(o.compradas)
      ? [...new Set(o.compradas.filter((id): id is string => typeof id === 'string' && IDS.has(id)))]
      : [];
    if (!compradas.includes(GRATIS)) compradas.unshift(GRATIS);

    // escolhida tem que ser uma que ela REALMENTE tem
    const escolhida = typeof o.escolhida === 'string' && compradas.includes(o.escolhida)
      ? o.escolhida
      : GRATIS;

    return { v: VERSAO, saldo, compradas, escolhida };
  }

  const save = ler();

  let debounce = 0;
  function salvarAgora() {
    clearTimeout(debounce);
    debounce = 0;
    try { localStorage.setItem(CHAVE, JSON.stringify(save)); } catch (_) { /* cota cheia: segue o jogo */ }
  }
  function agendar() {
    clearTimeout(debounce);
    debounce = window.setTimeout(salvarAgora, DEBOUNCE_MS);
  }
  // aba fechando/escondendo: descarrega o que o debounce ainda deve
  const flush = () => { if (debounce) salvarAgora(); };
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });

  // ----- DOM -----
  const $ = (s: string) => document.querySelector(s) as HTMLElement;
  const modal = $('[data-garagem]');
  const saldoEl = $('[data-garagem-saldo]');
  const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-skin]'));
  let voltarPara: 'inicio' | 'fim' = 'inicio';

  function pintarSaldo() {
    saldoEl.textContent = String(save.saldo);
    ctx.ui.popHud('[data-moedas]', save.saldo);
  }

  function pintarCards() {
    cards.forEach((c) => {
      const id = c.dataset.skin!;
      const preco = Number(c.dataset.preco);
      const tem = save.compradas.includes(id);
      const sel = save.escolhida === id;
      c.classList.toggle('sel', sel);
      c.classList.toggle('skin--tem', tem);
      c.classList.toggle('pode', !tem && save.saldo >= preco);
      c.setAttribute('aria-pressed', String(sel));
      const precoEl = c.querySelector('.skin__preco') as HTMLElement;
      precoEl.textContent = sel ? '✓ no caminhão' : tem ? 'na garagem' : '💰 ' + preco;
    });
  }

  function escolher(id: string) {
    save.escolhida = id;
    ctx.caminhao.aplicarSkin(id);
    // 1 frame estático: com o loop parado a skin nova aparece atrás do modal
    if (!ctx.fluxo.loopRodando()) ctx.renderer.render(ctx.scene, ctx.camera);
    pintarCards();
    agendar();
  }

  function clicar(id: string) {
    const skin = ctx.porSkinId.get(id);
    if (!skin) return;
    if (save.compradas.includes(id)) {
      if (save.escolhida === id) return;
      escolher(id);
      ctx.audio.somColeta();
      ctx.ui.anunciar(skin.nome + ' no caminhão!');
      return;
    }
    // a classe .pode é só cosmética — quem decide a compra é esta checagem
    if (save.saldo < skin.preco) {
      ctx.audio.somBatida();
      ctx.ui.mostrarToast('💰 Faltam ' + (skin.preco - save.saldo) + ' moedas pro ' + skin.nome + '. Entregue mais caixas!', 'info', 2400);
      ctx.ui.anunciar('Ainda não dá pra comprar ' + skin.nome + '.');
      return;
    }
    save.saldo -= skin.preco;
    save.compradas.push(id);
    escolher(id);
    pintarSaldo();
    ctx.audio.somNivel();
    ctx.ui.confete();
    ctx.ui.mostrarToast('🎉 ' + skin.emoji + ' ' + skin.nome + ' é seu!', 'ok', 2400);
    ctx.ui.anunciar('Comprou ' + skin.nome + '! Já está no caminhão.');
    salvarAgora(); // compra é evento raro e importante: grava na hora
  }

  cards.forEach((c) => c.addEventListener('click', () => clicar(c.dataset.skin!)));
  $('[data-garagem-voltar]').addEventListener('click', () => api.fechar());

  const api: Garagem = {
    ganharPontos(n) {
      const { estado, ui } = ctx;
      estado.pontos += n;
      save.saldo = Math.min(SALDO_MAX, save.saldo + n);
      ui.popHud('[data-pontos]', estado.pontos);
      ui.popHud('[data-moedas]', save.saldo);
      agendar();
    },
    escolhida() {
      return save.escolhida;
    },
    abrir(volta) {
      voltarPara = volta;
      ctx.estado.fase = 'garagem';
      ctx.ui.els.introModal.hidden = true;
      ctx.ui.els.fimModal.hidden = true;
      pintarSaldo();
      pintarCards();
      modal.hidden = false;
      // hidden não é focável antes do reflow — daí o respiro
      setTimeout(() => cards[0] && cards[0].focus(), 60);
      ctx.ui.anunciar('Garagem aberta. Você tem ' + save.saldo + ' moedas.');
    },
    fechar() {
      modal.hidden = true;
      const volta = voltarPara === 'fim' ? '[data-replay]' : '[data-modo="facil"]';
      if (voltarPara === 'fim') {
        ctx.estado.fase = 'fim';
        ctx.ui.els.fimModal.hidden = false;
      } else {
        ctx.estado.fase = 'inicio';
        ctx.ui.els.introModal.hidden = false;
      }
      setTimeout(() => $(volta).focus(), 60);
    },
  };

  // cofre já aparece no HUD antes da 1ª entrega
  pintarSaldo();
  return api;
}
