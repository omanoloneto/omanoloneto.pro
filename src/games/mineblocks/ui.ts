// UI DOM: refs, hotbar (ícones recortados do atlas via CSS), toasts,
// indicador de save, anunciar() sr-only com rate-limit.
import type { Contexto, UI } from './tipos';

export function criarUI(ctx: Contexto): UI {
  const $ = (s: string) => document.querySelector(s) as HTMLElement;
  const els = {
    cena: $('[data-cena]'),
    toast: $('[data-toast]'),
    anuncio: $('[data-anuncio]'),
    inicioModal: $('[data-inicio]'),
    pausaModal: $('[data-pausa]'),
    overlayGerando: $('[data-gerando]'),
    hotbar: $('[data-hotbar]'),
    balao: $('[data-balao]'),
    reticula: $('[data-reticula]'),
    aguaOverlay: $('[data-agua]'),
    salvando: $('[data-salvando]'),
    nomeMundoHud: $('[data-nome-mundo]'),
    controles: $('[data-controles]'),
    btnModo: $('[data-btn-modo]'),
    btnPulo: $('[data-btn-pulo]'),
    joystick: $('[data-joystick]'),
    joystickPino: $('[data-joystick-pino]'),
    craftBtn: $('[data-craft-btn]'),
    craftPainel: $('[data-craft-painel]'),
    invPainel: $('[data-inv]'),
    invGrade: $('[data-inv-grade]'),
    fantasma: $('[data-fantasma]'),
    pauseBtn: $('[data-pause]'),
    muteBtn: $('[data-mute]'),
    muteIcon: $('[data-mute-icon]'),
    formNovo: $('[data-form-novo]'),
    formCarregar: $('[data-form-carregar]'),
    erroInicio: $('[data-erro-inicio]'),
    // mundo aleatório + batizar
    jogarAleatorio: $('[data-jogar-aleatorio]'),
    divisor: $('[data-divisor]'),
    abasEl: $('.abas'),
    inicioTitulo: $('[data-inicio-titulo]'),
    inicioSub: $('[data-inicio-sub]'),
    voltarJogos: $('[data-voltar-jogos]'),
    batizarVoltar: $('[data-batizar-voltar]'),
    batizarBtn: $('[data-batizar]'),
    salvarAgoraBtn: $('[data-salvar-agora]'),
    sairBtn: $('[data-sair]'),
    pausaAviso: $('[data-pausa-aviso]'),
  };

  let toastTimer = 0;
  let balaoTimer = 0;
  let anuncioMs = 0;
  let salvandoTimer = 0;

  // ícone de bloco = recorte do próprio atlas via background-position
  function imgDoBloco(id: number): string {
    const GRADE = 4;
    const b = ctx.porId(id);
    const tile = b.render === 'cruz' ? b.tiles[0] : b.tiles[1];
    const tx = tile % GRADE;
    const ty = Math.floor(tile / GRADE);
    return '<span class="slot__img" style="background-image:url(' + ctx.textura.dataURL + ');' +
      'background-position:' + (-tx * 100) + '% ' + (-ty * 100) + '%"></span>';
  }

  function montarHotbar() {
    els.hotbar.innerHTML = '';
    ctx.hotbar.forEach((id, i) => {
      const b = ctx.porId(id);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'slot';
      btn.dataset.slot = String(i);
      btn.setAttribute('aria-label', 'Bloco ' + (i + 1) + ': ' + b.nome);
      btn.innerHTML =
        imgDoBloco(id) +
        '<span class="slot__num">' + (i < 9 ? i + 1 : '') + '</span>' +
        '<span class="slot__qtd" data-qtd></span>';
      els.hotbar.appendChild(btn);
    });
    atualizarContagens();
  }

  // sobrevivência: mostra quantos de cada bloco a criança TEM
  function atualizarContagens() {
    const inv = ctx.estado.inventario;
    els.hotbar.querySelectorAll<HTMLElement>('.slot').forEach((s, i) => {
      const id = ctx.hotbar[i];
      const n = inv[id] || 0;
      const qtd = s.querySelector('[data-qtd]') as HTMLElement;
      qtd.textContent = n > 0 ? String(n) : '';
      s.classList.toggle('vazio', n === 0);
    });
    // grade do inventário (tecla E): mesmas contagens, ícones grandes
    els.invGrade.querySelectorAll<HTMLElement>('.inv-item').forEach((s, i) => {
      const id = ctx.hotbar[i];
      const n = inv[id] || 0;
      (s.querySelector('[data-qtd]') as HTMLElement).textContent = n > 0 ? '× ' + n : '—';
      s.classList.toggle('vazio', n === 0);
      s.classList.toggle('sel', i === ctx.estado.sel);
    });
    // receitas acendem/apagam conforme o material disponível
    els.craftPainel.querySelectorAll<HTMLElement>('.receita').forEach((r, i) => {
      const rec = ctx.receitas[i];
      r.classList.toggle('pode', (inv[rec.de] || 0) >= rec.qtd);
    });
  }

  // grade do inventário estilo Minecraft: todos os itens com contagem;
  // clicar escolhe o bloco na hotbar
  function montarInventario() {
    els.invGrade.innerHTML = '';
    ctx.hotbar.forEach((id, i) => {
      const b = ctx.porId(id);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'inv-item';
      btn.dataset.slot = String(i);
      btn.setAttribute('aria-label', b.nome);
      btn.innerHTML =
        imgDoBloco(id) +
        '<span class="inv-item__nome">' + b.nome + '</span>' +
        '<span class="inv-item__qtd" data-qtd>—</span>';
      btn.addEventListener('click', () => selecionarSlot(i, true));
      els.invGrade.appendChild(btn);
    });
  }

  function montarCraft() {
    els.craftPainel.innerHTML = '';
    ctx.receitas.forEach((rec, i) => {
      const de = ctx.porId(rec.de);
      const para = ctx.porId(rec.para);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'receita';
      btn.dataset.receita = String(i);
      btn.setAttribute('aria-label', 'Fabricar: ' + rec.qtd + ' ' + de.nome + ' vira ' + rec.ganha + ' ' + para.nome);
      btn.innerHTML =
        '<span class="receita__lado">' + rec.qtd + '× ' + imgDoBloco(rec.de) + '</span>' +
        '<span class="receita__seta">→</span>' +
        '<span class="receita__lado">' + rec.ganha + '× ' + imgDoBloco(rec.para) + '</span>';
      els.craftPainel.appendChild(btn);
    });
  }

  function selecionarSlot(i: number, anunciarSel: boolean) {
    ctx.estado.sel = ((i % ctx.hotbar.length) + ctx.hotbar.length) % ctx.hotbar.length;
    els.hotbar.querySelectorAll('.slot').forEach((s, j) => {
      s.classList.toggle('sel', j === ctx.estado.sel);
    });
    const id = ctx.hotbar[ctx.estado.sel];
    const n = ctx.estado.inventario[id] || 0;
    const nome = ctx.porId(id).nome + (n > 0 ? ' × ' + n : ' (você não tem!)');
    els.balao.textContent = nome;
    els.balao.classList.add('show');
    clearTimeout(balaoTimer);
    balaoTimer = window.setTimeout(() => els.balao.classList.remove('show'), 1100);
    if (anunciarSel) api.anunciar('Bloco: ' + nome);
    // pegou um bloco = quer colocar (touch)
    if (!ctx.estado.modoColocar) {
      ctx.estado.modoColocar = true;
      api.atualizarModo();
    }
  }

  const api: UI = {
    els,
    anunciar(msg) {
      // rate-limit: leitor de tela não pode virar metralhadora
      const agora = performance.now();
      if (agora - anuncioMs < 1000) return;
      anuncioMs = agora;
      els.anuncio.textContent = '';
      requestAnimationFrame(() => { els.anuncio.textContent = msg; });
    },
    mostrarToast(html, tipo, ms) {
      els.toast.innerHTML = html;
      els.toast.className = 'toast ' + tipo;
      els.toast.hidden = false;
      requestAnimationFrame(() => els.toast.classList.add('show'));
      clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => {
        els.toast.classList.remove('show');
        setTimeout(() => { els.toast.hidden = true; }, 250);
      }, ms || 2400);
    },
    montarHotbar,
    selecionarSlot,
    atualizarContagens,
    montarCraft,
    montarInventario,
    alternarCraft(abrir) {
      const painel = els.invPainel;
      const quer = abrir === undefined ? painel.hidden : abrir;
      painel.hidden = !quer;
      els.craftBtn.setAttribute('aria-expanded', String(quer));
      if (quer) api.atualizarContagens();
    },
    atualizarModo() {
      const colocar = ctx.estado.modoColocar;
      els.btnModo.innerHTML = colocar ? '🧱' : '⛏️';
      els.btnModo.setAttribute('aria-label', colocar ? 'Modo: colocar bloco (toque pra trocar)' : 'Modo: quebrar bloco (toque pra trocar)');
      els.btnModo.classList.toggle('colocar', colocar);
    },
    mostrarSalvando(estado) {
      clearTimeout(salvandoTimer);
      const el = els.salvando;
      if (estado === 'nada') { el.hidden = true; return; }
      el.textContent = estado === 'salvando' ? '💾 salvando…' : estado === 'salvo' ? '✅ salvo!' : '📡 sem conexão';
      el.hidden = false;
      if (estado !== 'salvando') {
        salvandoTimer = window.setTimeout(() => { el.hidden = true; }, 1800);
      }
    },
  };
  return api;
}
