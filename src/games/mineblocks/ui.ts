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
    susto: $('[data-susto]'),
    salvando: $('[data-salvando]'),
    nomeMundoHud: $('[data-nome-mundo]'),
    controles: $('[data-controles]'),
    btnQuebrar: $('[data-btn-quebrar]'),
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
    formJogar: $('[data-form-jogar]'),
    formEntrar: $('[data-form-entrar]'),
    erroInicio: $('[data-erro-inicio]'),
    salvarAgoraBtn: $('[data-salvar-agora]'),
    sairBtn: $('[data-sair]'),
    pausaAviso: $('[data-pausa-aviso]'),
    // baú (painel de troca de itens)
    bauPainel: $('[data-bau]'),
    bauTitulo: $('[data-bau-titulo]'),
    bauTrava: $('[data-bau-trava]'),
    bauConteudo: $('[data-bau-conteudo]'),
    bauInventario: $('[data-bau-inv]'),
    bauFechar: $('[data-bau-fechar]'),
    // lista de jogadores (TAB)
    tabJogadores: $('[data-tab-jogadores]'),
    // fornalha (bancada só de receitas de fogo)
    fornalhaPainel: $('[data-fornalha]'),
    fornalhaPainelLista: $('[data-fornalha-painel]'),
    fornalhaFechar: $('[data-fornalha-fechar]'),
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
    if (b.icone) {
      return '<span class="slot__img slot__img--icone" style="background-image:url(/class/games/mineblocks/icones/' +
        b.icone + '.png)"></span>';
    }
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
        img.hidden = false;
        img.classList.toggle('slot__img--icone', !!b.icone);
        if (b.icone) {
          img.style.backgroundImage = 'url(/class/games/mineblocks/icones/' + b.icone + '.png)';
          img.style.backgroundPosition = '';
        } else {
          const GRADE = 4;
          const tile = b.render === 'cruz' ? b.tiles[0] : b.tiles[1];
          img.style.backgroundImage = 'url(' + ctx.textura.dataURL + ')';
          img.style.backgroundPosition = (-(tile % GRADE) * 100) + '% ' + (-Math.floor(tile / GRADE) * 100) + '%';
        }
        qtd.textContent = String(inv[id] || 0);
        s.classList.remove('vago');
        s.setAttribute('aria-label', 'Espaço ' + (i + 1) + ': ' + b.nome + ', ' + (inv[id] || 0));
      }
      s.classList.remove('vazio');
    });
    // grade do inventário (tecla E): só o que a criança TEM, em slots 3×9
    const donos = ctx.itens.concat(ctx.materiais || []).filter((id) => (inv[id] || 0) > 0);
    els.invGrade.querySelectorAll<HTMLElement>('.inv-slot').forEach((s, i) => {
      const id = donos[i] || 0;
      if (+(s.dataset.id || 0) !== id) {
        s.dataset.id = String(id);
        s.innerHTML = id ? imgDoBloco(id) + '<span class="inv-slot__qtd" data-qtd></span>' : '';
      }
      if (id) {
        (s.querySelector('[data-qtd]') as HTMLElement).textContent = String(inv[id] || 0);
        s.setAttribute('aria-label', ctx.porId(id).nome + ', ' + (inv[id] || 0));
      } else {
        s.setAttribute('aria-label', 'Espaço vazio');
      }
      s.classList.toggle('tem', id !== 0);
      s.classList.toggle('sel', id !== 0 && id === ctx.estado.hotbarSlots[ctx.estado.sel]);
    });
    // receitas acendem/apagam conforme o material disponível (índice ORIGINAL
    // em dataset.receita — os painéis filtram, então posição ≠ índice)
    const acender = (r: HTMLElement) => {
      const rec = ctx.receitas[+(r.dataset.receita || 0)];
      if (!rec) return;
      const tem = (inv[rec.de] || 0) >= rec.qtd && (!rec.de2 || (inv[rec.de2] || 0) >= (rec.qtd2 || 1));
      r.classList.toggle('pode', tem);
    };
    els.craftPainel.querySelectorAll<HTMLElement>('.receita').forEach(acender);
    els.fornalhaPainelLista.querySelectorAll<HTMLElement>('.receita').forEach(acender);
  }

  // grade do inventário estilo Minecraft: 3 linhas de 9 slots, mostrando SÓ
  // o que foi coletado (materiais como lã incluídos); clicar num item colocável
  // PÕE ele no slot selecionado da hotbar (atalho — as contagens são globais,
  // nada se perde na troca)
  function montarInventario() {
    els.invGrade.innerHTML = '';
    const total = ctx.cfg.hotbarTamanho * 3;
    for (let i = 0; i < total; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'inv-slot';
      btn.setAttribute('aria-label', 'Espaço vazio');
      btn.addEventListener('click', () => {
        const id = +(btn.dataset.id || 0);
        if (!id) return;
        const b = ctx.porId(id);
        if (!ctx.itens.includes(id)) {
          api.mostrarToast('🧶 ' + b.nome + ' é material de fabricação — usa nas receitas aí embaixo!', 'info', 2200);
          return;
        }
        ctx.estado.hotbarSlots[ctx.estado.sel] = id;
        atualizarContagens();
        selecionarSlot(ctx.estado.sel, false);
        api.anunciar(b.nome + ' está no espaço ' + (ctx.estado.sel + 1) + ' da hotbar.');
      });
      els.invGrade.appendChild(btn);
    }
  }

  // uma linha de receita (índice ORIGINAL em dataset.receita — o clique e o
  // acender por material dependem dele)
  function linhaReceita(rec: (typeof ctx.receitas)[number], i: number): HTMLButtonElement {
    const de = ctx.porId(rec.de);
    const para = ctx.porId(rec.para);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'receita';
    btn.dataset.receita = String(i);
    const extras = rec.de2 ? ' e ' + (rec.qtd2 || 1) + ' ' + ctx.porId(rec.de2).nome : '';
    btn.setAttribute('aria-label', 'Fabricar: ' + rec.qtd + ' ' + de.nome + extras + ' vira ' + rec.ganha + ' ' + para.nome);
    btn.innerHTML =
      '<span class="receita__lado">' + rec.qtd + '× ' + imgDoBloco(rec.de) +
      (rec.de2 ? ' + ' + (rec.qtd2 || 1) + '× ' + imgDoBloco(rec.de2) : '') + '</span>' +
      '<span class="receita__seta">' + (rec.fornalha ? '🔥' : '→') + '</span>' +
      '<span class="receita__lado">' + rec.ganha + '× ' + imgDoBloco(rec.para) + '</span>';
    return btn;
  }

  // mochila: só as receitas SEM fogo (as de fogo vão pra fornalha)
  function montarCraft() {
    els.craftPainel.innerHTML = '';
    ctx.receitas.forEach((rec, i) => { if (!rec.fornalha) els.craftPainel.appendChild(linhaReceita(rec, i)); });
  }

  // fornalha: só as receitas que precisam de fogo
  function montarFornalha() {
    els.fornalhaPainelLista.innerHTML = '';
    ctx.receitas.forEach((rec, i) => { if (rec.fornalha) els.fornalhaPainelLista.appendChild(linhaReceita(rec, i)); });
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
    const tudo = (e as MouseEvent).shiftKey; // SHIFT+clique = pilha inteira
    if (btn.dataset.dir === 'dep') {
      const mover = tudo ? Math.min(inv[id] || 0, 999 - (m.itens[id] || 0)) : Math.min(1, inv[id] || 0);
      if (mover <= 0) return;
      inv[id] -= mover;
      m.itens[id] = Math.min(999, (m.itens[id] || 0) + mover);
    } else {
      const mover = tudo ? Math.min(m.itens[id] || 0, 999 - (inv[id] || 0)) : Math.min(1, m.itens[id] || 0);
      if (mover <= 0) return;
      m.itens[id] -= mover;
      ctx.edicao.ganharItemPublico(id, mover);
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

  function rotuloTrava() {
    const m = ctx.metas.todos().get(bauChave);
    const publico = !!(m && m.tipo === 'bau' && m.publico);
    els.bauTrava.textContent = publico ? '🔓 Liberado pra todos' : '🔒 Só eu abro';
    els.bauTrava.setAttribute('aria-pressed', String(publico));
  }
  els.bauTrava.addEventListener('click', () => {
    const m = ctx.metas.todos().get(bauChave);
    if (!m || m.tipo !== 'bau') return;
    m.publico = !m.publico;
    ctx.metas.tocar(bauChave); // mesmo caminho de sync dos itens
    ctx.salvar.agendar();
    rotuloTrava();
    ctx.audio.somUI();
    api.anunciar(m.publico ? 'Baú liberado pra todos abrirem.' : 'Baú bloqueado, só você abre.');
  });

  function fecharBau() {
    if (bauChave < 0) return;
    bauChave = -1;
    els.bauPainel.hidden = true;
    reTravarPainel();
  }

  function abrirFornalha() {
    api.alternarCraft(false); // fecha o inventário se estava aberto
    montarFornalha();
    els.fornalhaPainel.hidden = false;
    api.atualizarContagens(); // acende as receitas que dá pra fazer
    soltarLockPainel();
    ctx.audio.somUI();
    api.anunciar('Fornalha aberta — receitas que precisam de fogo.');
  }
  function fecharFornalha() {
    if (els.fornalhaPainel.hidden) return;
    els.fornalhaPainel.hidden = true;
    reTravarPainel();
  }
  els.fornalhaFechar.addEventListener('click', () => fecharFornalha());

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
    abrirBau(chave, titulo, souDono) {
      api.alternarCraft(false); // fecha o inventário se estava aberto
      bauChave = chave;
      els.bauTitulo.textContent = titulo;
      els.bauTrava.hidden = !souDono;
      if (souDono) rotuloTrava();
      els.bauPainel.hidden = false;
      renderBau();
      soltarLockPainel();
      ctx.audio.somUI();
      api.anunciar(titulo + ' aberto.');
    },
    fecharBau,
    bauAberto: () => bauChave,
    atualizarBau() { if (bauChave >= 0) renderBau(); },
    abrirFornalha,
    fecharFornalha,
    fornalhaAberta: () => !els.fornalhaPainel.hidden,
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
    painelModalAberto: () => !els.invPainel.hidden || !els.bauPainel.hidden || !els.placaForm.hidden || !els.fornalhaPainel.hidden,
    mostrarJogadores(mostrar) {
      if (mostrar && !ctx.sync.emSala()) {
        els.tabJogadores.innerHTML =
          '<h3 class="tabj__titulo">👥 Jogadores (1)</h3><ul class="tabj__lista"><li><span class="tabj__nome">Você</span> <span class="tabj__eu">(sozinho)</span></li></ul>';
      }
      els.tabJogadores.hidden = !mostrar;
    },
    atualizarTabJogadores(eu, dono, lista) {
      const nomes = [eu].concat(lista.map((j) => j.nome));
      const linhas = nomes
        .map((n) => {
          const coroa = n && n === dono ? '<span class="tabj__coroa">👑</span>' : '';
          const marca = n === eu ? ' <span class="tabj__eu">(você)</span>' : '';
          return '<li>' + coroa + '<span class="tabj__nome">' + esc(n) + '</span>' + marca + '</li>';
        })
        .join('');
      els.tabJogadores.innerHTML =
        '<h3 class="tabj__titulo">👥 Jogadores (' + nomes.length + ')</h3><ul class="tabj__lista">' + linhas + '</ul>';
    },
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
    flashSusto() {
      els.susto.classList.remove('show');
      void els.susto.offsetWidth;
      els.susto.classList.add('show');
    },
  };
  return api;
}
