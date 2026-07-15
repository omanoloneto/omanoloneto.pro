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
    // multiplayer (sala de amigos)
    formVisitar: $('[data-form-visitar]'),
    salaChip: $('[data-sala-chip]'),
    salaSecao: $('[data-sala-secao]'),
    salaAbrir: $('[data-sala-abrir]'),
    salaNome: $('[data-sala-nome]'),
    salaCriarBtn: $('[data-sala-criar]'),
    salaInfo: $('[data-sala-info]'),
    salaCodigo: $('[data-sala-codigo]'),
    salaLista: $('[data-sala-lista]'),
    salaSairBtn: $('[data-sala-sair]'),
    salaErro: $('[data-sala-erro]'),
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

  // hotbar Minecraft: 9 slots VAZIOS que enchem conforme a criança coleta
  function montarHotbar() {
    els.hotbar.innerHTML = '';
    for (let i = 0; i < ctx.cfg.hotbarTamanho; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'slot';
      btn.dataset.slot = String(i);
      btn.setAttribute('aria-label', 'Espaço ' + (i + 1) + ' da hotbar');
      btn.innerHTML =
        '<span class="slot__img" data-img hidden></span>' +
        '<span class="slot__num">' + (i + 1) + '</span>' +
        '<span class="slot__qtd" data-qtd></span>';
      els.hotbar.appendChild(btn);
    }
    atualizarContagens();
  }

  // posiciona ícone/contagem de cada slot conforme hotbarSlots + inventario
  function atualizarContagens() {
    const inv = ctx.estado.inventario;
    const slots = ctx.estado.hotbarSlots;
    // contagem zerou → slot esvazia (o buraco fica, igual Minecraft)
    for (let i = 0; i < slots.length; i++) {
      if (slots[i] !== 0 && (inv[slots[i]] || 0) <= 0) slots[i] = 0;
    }
    els.hotbar.querySelectorAll<HTMLElement>('.slot').forEach((s, i) => {
      const id = slots[i] || 0;
      const img = s.querySelector('[data-img]') as HTMLElement;
      const qtd = s.querySelector('[data-qtd]') as HTMLElement;
      if (id === 0) {
        img.hidden = true;
        qtd.textContent = '';
        s.classList.add('vago');
        s.setAttribute('aria-label', 'Espaço ' + (i + 1) + ' da hotbar: vazio');
      } else {
        const b = ctx.porId(id);
        const GRADE = 4;
        const tile = b.render === 'cruz' ? b.tiles[0] : b.tiles[1];
        img.hidden = false;
        img.style.backgroundImage = 'url(' + ctx.textura.dataURL + ')';
        img.style.backgroundPosition = (-(tile % GRADE) * 100) + '% ' + (-Math.floor(tile / GRADE) * 100) + '%';
        qtd.textContent = String(inv[id] || 0);
        s.classList.remove('vago');
        s.setAttribute('aria-label', 'Espaço ' + (i + 1) + ': ' + b.nome + ', ' + (inv[id] || 0));
      }
      s.classList.remove('vazio');
    });
    // grade do inventário (tecla E): todos os tipos com contagem
    els.invGrade.querySelectorAll<HTMLElement>('.inv-item').forEach((s, i) => {
      const id = ctx.itens[i];
      const n = inv[id] || 0;
      (s.querySelector('[data-qtd]') as HTMLElement).textContent = n > 0 ? '× ' + n : '—';
      s.classList.toggle('vazio', n === 0);
      s.classList.toggle('sel', id === ctx.estado.hotbarSlots[ctx.estado.sel]);
    });
    // receitas acendem/apagam conforme o material disponível
    els.craftPainel.querySelectorAll<HTMLElement>('.receita').forEach((r, i) => {
      const rec = ctx.receitas[i];
      r.classList.toggle('pode', (inv[rec.de] || 0) >= rec.qtd);
    });
  }

  // grade do inventário estilo Minecraft: todos os tipos com contagem;
  // clicar num item PÕE ele no slot selecionado da hotbar (atalho —
  // as contagens são globais, nada se perde na troca)
  function montarInventario() {
    els.invGrade.innerHTML = '';
    ctx.itens.forEach((id) => {
      const b = ctx.porId(id);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'inv-item';
      btn.setAttribute('aria-label', b.nome + ' — pôr no espaço selecionado da hotbar');
      btn.innerHTML =
        imgDoBloco(id) +
        '<span class="inv-item__nome">' + b.nome + '</span>' +
        '<span class="inv-item__qtd" data-qtd>—</span>';
      btn.addEventListener('click', () => {
        // item que a criança ainda não TEM não vira atalho (apagaria o
        // atalho atual e anunciaria sucesso falso)
        if ((ctx.estado.inventario[id] || 0) <= 0) {
          api.mostrarToast('🎒 Você ainda não tem ' + b.nome + ' — quebre blocos pra ganhar!', 'info', 2000);
          return;
        }
        ctx.estado.hotbarSlots[ctx.estado.sel] = id;
        atualizarContagens();
        selecionarSlot(ctx.estado.sel, false);
        api.anunciar(b.nome + ' está no espaço ' + (ctx.estado.sel + 1) + ' da hotbar.');
      });
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
    const N = ctx.cfg.hotbarTamanho;
    ctx.estado.sel = ((i % N) + N) % N;
    els.hotbar.querySelectorAll('.slot').forEach((s, j) => {
      s.classList.toggle('sel', j === ctx.estado.sel);
    });
    const id = ctx.estado.hotbarSlots[ctx.estado.sel] || 0;
    const n = id ? ctx.estado.inventario[id] || 0 : 0;
    const nome = id ? ctx.porId(id).nome + ' × ' + n : 'espaço vazio';
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
