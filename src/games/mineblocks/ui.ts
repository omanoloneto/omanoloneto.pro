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
    matLista: $('[data-mat-lista]'),
    fantasma: $('[data-fantasma]'),
    pauseBtn: $('[data-pause]'),
    muteBtn: $('[data-mute]'),
    muteIcon: $('[data-mute-icon]'),
    formJogar: $('[data-form-jogar]'),
    formEntrar: $('[data-form-entrar]'),
    erroInicio: $('[data-erro-inicio]'),
    salvarAgoraBtn: $('[data-salvar-agora]'),
    sairBtn: $('[data-sair]'),
    pausaAviso: $('[data-pausa-aviso]'),
    // baú (painel de troca de itens)
    bauPainel: $('[data-bau]'),
    bauTitulo: $('[data-bau-titulo]'),
    bauConteudo: $('[data-bau-conteudo]'),
    bauInventario: $('[data-bau-inv]'),
    bauFechar: $('[data-bau-fechar]'),
    // placa: form de escrever na colocação (leitura é via toast)
    placaForm: $('[data-placa-form]'),
    placaInput: $('[data-placa-input]'),
    placaOk: $('[data-placa-ok]'),
    placaCancelar: $('[data-placa-cancelar]'),
    // multiplayer (sala de amigos)
    salaChip: $('[data-sala-chip]'),
    salaSecao: $('[data-sala-secao]'),
    salaInfo: $('[data-sala-info]'),
    salaCodigo: $('[data-sala-codigo]'),
    salaLista: $('[data-sala-lista]'),
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
    // materiais (lã etc.): contagem read-only
    els.matLista.querySelectorAll<HTMLElement>('.mat-item').forEach((s) => {
      const id = +(s.dataset.mat || 0);
      const n = inv[id] || 0;
      (s.querySelector('[data-qtd]') as HTMLElement).textContent = n > 0 ? '× ' + n : '—';
      s.classList.toggle('vazio', n === 0);
    });
    // receitas acendem/apagam conforme o material disponível
    els.craftPainel.querySelectorAll<HTMLElement>('.receita').forEach((r, i) => {
      const rec = ctx.receitas[i];
      const tem = (inv[rec.de] || 0) >= rec.qtd && (!rec.de2 || (inv[rec.de2] || 0) >= (rec.qtd2 || 1));
      r.classList.toggle('pode', tem);
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
    montarMateriais();
  }

  // materiais = recursos só-coletáveis (lã do Winpup): cards read-only com
  // contagem, não viram atalho de hotbar (não são colocáveis)
  function montarMateriais() {
    els.matLista.innerHTML = '';
    (ctx.materiais || []).forEach((id) => {
      const b = ctx.porId(id);
      const div = document.createElement('div');
      div.className = 'mat-item';
      div.dataset.mat = String(id);
      div.innerHTML =
        imgDoBloco(id) +
        '<span class="mat-item__nome">' + b.nome + '</span>' +
        '<span class="mat-item__qtd" data-qtd>—</span>';
      els.matLista.appendChild(div);
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
      const extras = (rec.de2 ? ' e ' + (rec.qtd2 || 1) + ' ' + ctx.porId(rec.de2).nome : '') + (rec.fornalha ? ' (perto de uma fornalha)' : '');
      btn.setAttribute('aria-label', 'Fabricar: ' + rec.qtd + ' ' + de.nome + extras + ' vira ' + rec.ganha + ' ' + para.nome);
      btn.innerHTML =
        '<span class="receita__lado">' + rec.qtd + '× ' + imgDoBloco(rec.de) +
        (rec.de2 ? ' + ' + (rec.qtd2 || 1) + '× ' + imgDoBloco(rec.de2) : '') + '</span>' +
        '<span class="receita__seta">' + (rec.fornalha ? '🔥' : '→') + '</span>' +
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

  // ----- baú (painel de troca de itens) + placa (form/leitura) -----
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  let bauChave = -1;
  let placaCb: ((t: string | null) => void) | null = null;

  function soltarLockPainel() {
    if (!coarse && document.pointerLockElement) document.exitPointerLock();
  }
  function reTravarPainel() {
    if (coarse) return;
    // requestPointerLock devolve promise que pode REJEITAR (cooldown do
    // Chrome, doc inválido): engole os dois jeitos — a criança clica na tela
    try { ((ctx.renderer.domElement as any).requestPointerLock?.() as Promise<void> | undefined)?.catch?.(() => {}); } catch { /* browser antigo */ }
  }
  function esc(s: string): string {
    return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
  }

  function botaoBauItem(id: number, n: number, dir: 'dep' | 'ret'): HTMLButtonElement {
    const b = ctx.porId(id);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bau-item';
    btn.dataset.id = String(id);
    btn.dataset.dir = dir;
    btn.setAttribute('aria-label', (dir === 'dep' ? 'Guardar ' : 'Pegar ') + b.nome + ', você tem ' + n);
    btn.innerHTML = imgDoBloco(id) + '<span class="bau-item__q">' + n + '</span>';
    return btn;
  }

  function renderBau() {
    const m = ctx.metas.todos().get(bauChave);
    if (!m || m.tipo !== 'bau') { fecharBau(); return; }
    els.bauConteudo.innerHTML = '';
    let vazio = true;
    for (let id = 0; id < m.itens.length; id++) {
      const n = m.itens[id] | 0;
      if (n <= 0) continue;
      vazio = false;
      els.bauConteudo.appendChild(botaoBauItem(id, n, 'ret'));
    }
    if (vazio) els.bauConteudo.innerHTML = '<p class="bau__vazio">Baú vazio — clique nos seus itens pra guardar aqui! 👇</p>';
    els.bauInventario.innerHTML = '';
    let temInv = false;
    for (const id of ctx.itens) {
      const n = ctx.estado.inventario[id] | 0;
      if (n <= 0) continue;
      temInv = true;
      els.bauInventario.appendChild(botaoBauItem(id, n, 'dep'));
    }
    if (!temInv) els.bauInventario.innerHTML = '<p class="bau__vazio">Você não tem itens pra guardar.</p>';
  }

  function onBauClick(e: Event) {
    const btn = (e.target as HTMLElement).closest('.bau-item') as HTMLElement | null;
    if (!btn || bauChave < 0) return;
    const m = ctx.metas.todos().get(bauChave);
    if (!m || m.tipo !== 'bau') return;
    const id = +btn.dataset.id!;
    const inv = ctx.estado.inventario;
    if (btn.dataset.dir === 'dep') {
      if ((inv[id] || 0) <= 0) return;
      inv[id]--;
      m.itens[id] = Math.min(999, (m.itens[id] || 0) + 1);
    } else {
      if ((m.itens[id] || 0) <= 0) return;
      m.itens[id]--;
      ctx.edicao.ganharItemPublico(id, 1);
    }
    ctx.metas.tocar(bauChave); // avisa o sync (o objeto mudou no lugar)
    ctx.salvar.agendar();
    renderBau();
    api.atualizarContagens();
    ctx.audio.somUI();
  }
  els.bauConteudo.addEventListener('click', onBauClick);
  els.bauInventario.addEventListener('click', onBauClick);
  els.bauFechar.addEventListener('click', () => fecharBau());

  function fecharBau() {
    if (bauChave < 0) return;
    bauChave = -1;
    els.bauPainel.hidden = true;
    reTravarPainel();
  }

  // placa: form de escrever (na colocação)
  function fecharPlacaForm(texto: string | null) {
    if (!placaCb) return;
    const cb = placaCb;
    placaCb = null;
    els.placaForm.hidden = true;
    reTravarPainel();
    cb(texto);
  }
  els.placaOk.addEventListener('click', () => fecharPlacaForm((els.placaInput as HTMLInputElement).value.trim().slice(0, 48)));
  els.placaCancelar.addEventListener('click', () => fecharPlacaForm(null));
  els.placaInput.addEventListener('keydown', (e) => {
    const ev = e as KeyboardEvent;
    if (ev.key === 'Enter') { e.preventDefault(); fecharPlacaForm((els.placaInput as HTMLInputElement).value.trim().slice(0, 48)); }
    else if (ev.key === 'Escape') { e.preventDefault(); fecharPlacaForm(null); }
  });

  const api: UI = {
    els,
    abrirBau(chave, titulo) {
      api.alternarCraft(false); // fecha o inventário se estava aberto
      bauChave = chave;
      els.bauTitulo.textContent = titulo;
      els.bauPainel.hidden = false;
      renderBau();
      soltarLockPainel();
      ctx.audio.somUI();
      api.anunciar(titulo + ' aberto.');
    },
    fecharBau,
    bauAberto: () => bauChave,
    atualizarBau() { if (bauChave >= 0) renderBau(); },
    pedirTextoPlaca(cb) {
      placaCb = cb;
      (els.placaInput as HTMLInputElement).value = '';
      els.placaForm.hidden = false;
      soltarLockPainel();
      setTimeout(() => els.placaInput.focus(), 30);
    },
    mostrarPlaca(texto, autor) {
      api.mostrarToast('📜 <b>' + esc(texto || '(placa em branco)') + '</b>' + (autor ? ' <span class="placa__autor">— ' + esc(autor) + '</span>' : ''), 'info', 4200);
    },
    painelModalAberto: () => !els.invPainel.hidden || !els.bauPainel.hidden || !els.placaForm.hidden,
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
