import type { Ctx, UI } from './types';

export function createUI(ctx: Ctx): UI {
  const $ = (s: string) => document.querySelector(s) as HTMLElement;
  const els = {
    scene: $('[data-cena]'),
    toast: $('[data-toast]'),
    announcer: $('[data-anuncio]'),
    introModal: $('[data-inicio]'),
    pauseModal: $('[data-pausa]'),
    generatingOverlay: $('[data-gerando]'),
    hotbar: $('[data-hotbar]'),
    bubble: $('[data-balao]'),
    reticle: $('[data-reticula]'),
    waterOverlay: $('[data-agua]'),
    scare: $('[data-susto]'),
    hurt: $('[data-fome-dano]'),
    hunger: $('[data-fome]'),
    saving: $('[data-salvando]'),
    worldNameHud: $('[data-nome-mundo]'),
    touchControls: $('[data-controles]'),
    breakBtn: $('[data-btn-quebrar]'),
    jumpBtn: $('[data-btn-pulo]'),
    joystick: $('[data-joystick]'),
    joystickPin: $('[data-joystick-pino]'),
    craftBtn: $('[data-craft-btn]'),
    craftPanel: $('[data-craft-painel]'),
    invPanel: $('[data-inv]'),
    invGrid: $('[data-inv-grade]'),
    ghostHint: $('[data-fantasma]'),
    pauseBtn: $('[data-pause]'),
    muteBtn: $('[data-mute]'),
    muteIcon: $('[data-mute-icon]'),
    playForm: $('[data-form-jogar]'),
    joinForm: $('[data-form-entrar]'),
    introError: $('[data-erro-inicio]'),
    saveNowBtn: $('[data-salvar-agora]'),
    exitBtn: $('[data-sair]'),
    pauseNotice: $('[data-pausa-aviso]'),
    chestPanel: $('[data-bau]'),
    chestTitle: $('[data-bau-titulo]'),
    chestLock: $('[data-bau-trava]'),
    chestContent: $('[data-bau-conteudo]'),
    chestInventory: $('[data-bau-inv]'),
    chestClose: $('[data-bau-fechar]'),
    playersTab: $('[data-tab-jogadores]'),
    furnacePanel: $('[data-fornalha]'),
    furnaceList: $('[data-fornalha-painel]'),
    furnaceClose: $('[data-fornalha-fechar]'),
    signForm: $('[data-placa-form]'),
    signInput: $('[data-placa-input]'),
    signOk: $('[data-placa-ok]'),
    signCancel: $('[data-placa-cancelar]'),
    roomChip: $('[data-sala-chip]'),
    roomSection: $('[data-sala-secao]'),
    roomInfo: $('[data-sala-info]'),
    roomCode: $('[data-sala-codigo]'),
    roomList: $('[data-sala-lista]'),
  };

  let toastTimer = 0;
  let bubbleTimer = 0;
  let announceAt = 0;
  let savingTimer = 0;

  function blockImg(id: number): string {
    const GRID = 4;
    const b = ctx.byId(id);
    if (b.icone) {
      return '<span class="slot__img slot__img--icone" style="background-image:url(/class/games/mineblocks/icones/' +
        b.icone + '.png)"></span>';
    }
    const tile = b.render === 'cruz' ? b.tiles[0] : b.tiles[1];
    const tx = tile % GRID;
    const ty = Math.floor(tile / GRID);
    return '<span class="slot__img" style="background-image:url(' + ctx.texture.dataURL + ');' +
      'background-position:' + (-tx * 100) + '% ' + (-ty * 100) + '%"></span>';
  }

  function buildHotbar() {
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
    updateCounts();
  }

  function buildHunger() {
    els.hunger.innerHTML = '';
    for (let i = 0; i < ctx.cfg.fome.max; i++) {
      const s = document.createElement('span');
      s.className = 'fome__ponto';
      s.textContent = '🍗';
      els.hunger.appendChild(s);
    }
    updateHunger();
  }

  function updateHunger() {
    const n = ctx.state.fome;
    const pts = els.hunger.children;
    for (let i = 0; i < pts.length; i++) {
      pts[i].classList.toggle('fome__ponto--vazio', i >= n);
    }
    els.hunger.setAttribute('aria-label', 'Fome: ' + n + ' de ' + ctx.cfg.fome.max);
    els.hunger.classList.toggle('fome--zerada', n <= 0);
  }

  function updateCounts() {
    const inv = ctx.state.inventory;
    const slots = ctx.state.hotbarSlots;
    for (let i = 0; i < slots.length; i++) {
      if (slots[i] !== 0 && (inv[slots[i]] || 0) <= 0) slots[i] = 0;
    }
    els.hotbar.querySelectorAll<HTMLElement>('.slot').forEach((s, i) => {
      const id = slots[i] || 0;
      const img = s.querySelector('[data-img]') as HTMLElement;
      const qty = s.querySelector('[data-qtd]') as HTMLElement;
      if (id === 0) {
        img.hidden = true;
        qty.textContent = '';
        s.classList.add('vago');
        s.setAttribute('aria-label', 'Espaço ' + (i + 1) + ' da hotbar: vazio');
      } else {
        const b = ctx.byId(id);
        img.hidden = false;
        img.classList.toggle('slot__img--icone', !!b.icone);
        if (b.icone) {
          img.style.backgroundImage = 'url(/class/games/mineblocks/icones/' + b.icone + '.png)';
          img.style.backgroundPosition = '';
        } else {
          const GRID = 4;
          const tile = b.render === 'cruz' ? b.tiles[0] : b.tiles[1];
          img.style.backgroundImage = 'url(' + ctx.texture.dataURL + ')';
          img.style.backgroundPosition = (-(tile % GRID) * 100) + '% ' + (-Math.floor(tile / GRID) * 100) + '%';
        }
        qty.textContent = String(inv[id] || 0);
        s.classList.remove('vago');
        s.setAttribute('aria-label', 'Espaço ' + (i + 1) + ': ' + b.nome + ', ' + (inv[id] || 0));
      }
      s.classList.remove('vazio');
    });
    const owned = ctx.items.concat(ctx.materials || []).filter((id) => (inv[id] || 0) > 0);
    els.invGrid.querySelectorAll<HTMLElement>('.inv-slot').forEach((s, i) => {
      const id = owned[i] || 0;
      if (+(s.dataset.id || 0) !== id) {
        s.dataset.id = String(id);
        s.innerHTML = id ? blockImg(id) + '<span class="inv-slot__qtd" data-qtd></span>' : '';
      }
      if (id) {
        (s.querySelector('[data-qtd]') as HTMLElement).textContent = String(inv[id] || 0);
        s.setAttribute('aria-label', ctx.byId(id).nome + ', ' + (inv[id] || 0));
      } else {
        s.setAttribute('aria-label', 'Espaço vazio');
      }
      s.classList.toggle('tem', id !== 0);
      s.classList.toggle('sel', id !== 0 && id === ctx.state.hotbarSlots[ctx.state.sel]);
    });
    const light = (r: HTMLElement) => {
      const rec = ctx.recipes[+(r.dataset.receita || 0)];
      if (!rec) return;
      const has = (inv[rec.de] || 0) >= rec.qtd && (!rec.de2 || (inv[rec.de2] || 0) >= (rec.qtd2 || 1));
      r.classList.toggle('pode', has);
    };
    els.craftPanel.querySelectorAll<HTMLElement>('.receita').forEach(light);
    els.furnaceList.querySelectorAll<HTMLElement>('.receita').forEach(light);
  }

  function buildInventory() {
    els.invGrid.innerHTML = '';
    const total = ctx.cfg.hotbarTamanho * 3;
    for (let i = 0; i < total; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'inv-slot';
      btn.setAttribute('aria-label', 'Espaço vazio');
      btn.addEventListener('click', () => {
        const id = +(btn.dataset.id || 0);
        if (!id) return;
        const b = ctx.byId(id);
        if (!ctx.items.includes(id)) {
          api.showToast('🧶 ' + b.nome + ' é material de fabricação — usa nas receitas aí embaixo!', 'info', 2200);
          return;
        }
        ctx.state.hotbarSlots[ctx.state.sel] = id;
        updateCounts();
        selectSlot(ctx.state.sel, false);
        api.announce(b.nome + ' está no espaço ' + (ctx.state.sel + 1) + ' da hotbar.');
      });
      els.invGrid.appendChild(btn);
    }
  }

  function recipeRow(rec: (typeof ctx.recipes)[number], i: number): HTMLButtonElement {
    const from = ctx.byId(rec.de);
    const to = ctx.byId(rec.para);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'receita';
    btn.dataset.receita = String(i);
    const extras = rec.de2 ? ' e ' + (rec.qtd2 || 1) + ' ' + ctx.byId(rec.de2).nome : '';
    btn.setAttribute('aria-label', 'Fabricar: ' + rec.qtd + ' ' + from.nome + extras + ' vira ' + rec.ganha + ' ' + to.nome);
    btn.innerHTML =
      '<span class="receita__lado">' + rec.qtd + '× ' + blockImg(rec.de) +
      (rec.de2 ? ' + ' + (rec.qtd2 || 1) + '× ' + blockImg(rec.de2) : '') + '</span>' +
      '<span class="receita__seta">' + (rec.fornalha ? '🔥' : '→') + '</span>' +
      '<span class="receita__lado">' + rec.ganha + '× ' + blockImg(rec.para) + '</span>';
    return btn;
  }

  function buildCraft() {
    els.craftPanel.innerHTML = '';
    ctx.recipes.forEach((rec, i) => { if (!rec.fornalha) els.craftPanel.appendChild(recipeRow(rec, i)); });
  }

  function buildFurnace() {
    els.furnaceList.innerHTML = '';
    ctx.recipes.forEach((rec, i) => { if (rec.fornalha) els.furnaceList.appendChild(recipeRow(rec, i)); });
  }

  function selectSlot(i: number, announceIt: boolean) {
    const N = ctx.cfg.hotbarTamanho;
    ctx.state.sel = ((i % N) + N) % N;
    els.hotbar.querySelectorAll('.slot').forEach((s, j) => {
      s.classList.toggle('sel', j === ctx.state.sel);
    });
    const id = ctx.state.hotbarSlots[ctx.state.sel] || 0;
    const n = id ? ctx.state.inventory[id] || 0 : 0;
    const name = id ? ctx.byId(id).nome + ' × ' + n : 'espaço vazio';
    els.bubble.textContent = name;
    els.bubble.classList.add('show');
    clearTimeout(bubbleTimer);
    bubbleTimer = window.setTimeout(() => els.bubble.classList.remove('show'), 1100);
    if (announceIt) api.announce('Bloco: ' + name);
  }

  let chestKey = -1;
  let signCb: ((t: string | null) => void) | null = null;

  function esc(s: string): string {
    return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
  }

  function chestItemBtn(id: number, n: number, dir: 'dep' | 'ret'): HTMLButtonElement {
    const b = ctx.byId(id);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bau-item';
    btn.dataset.id = String(id);
    btn.dataset.dir = dir;
    btn.setAttribute('aria-label', (dir === 'dep' ? 'Guardar ' : 'Pegar ') + b.nome + ', você tem ' + n);
    btn.innerHTML = blockImg(id) + '<span class="bau-item__q">' + n + '</span>';
    return btn;
  }

  function renderChest() {
    const m = ctx.metas.all().get(chestKey);
    if (!m || m.tipo !== 'bau') { closeChest(); return; }
    els.chestContent.innerHTML = '';
    let empty = true;
    for (let id = 0; id < m.itens.length; id++) {
      const n = m.itens[id] | 0;
      if (n <= 0) continue;
      empty = false;
      els.chestContent.appendChild(chestItemBtn(id, n, 'ret'));
    }
    if (empty) els.chestContent.innerHTML = '<p class="bau__vazio">Baú vazio — clique nos seus itens pra guardar aqui! 👇</p>';
    els.chestInventory.innerHTML = '';
    let hasInv = false;
    for (const id of ctx.items) {
      const n = ctx.state.inventory[id] | 0;
      if (n <= 0) continue;
      hasInv = true;
      els.chestInventory.appendChild(chestItemBtn(id, n, 'dep'));
    }
    if (!hasInv) els.chestInventory.innerHTML = '<p class="bau__vazio">Você não tem itens pra guardar.</p>';
  }

  function onChestClick(e: Event) {
    const btn = (e.target as HTMLElement).closest('.bau-item') as HTMLElement | null;
    if (!btn || chestKey < 0) return;
    const m = ctx.metas.all().get(chestKey);
    if (!m || m.tipo !== 'bau') return;
    const id = +btn.dataset.id!;
    const inv = ctx.state.inventory;
    const all = (e as MouseEvent).shiftKey;
    if (btn.dataset.dir === 'dep') {
      const move = all ? Math.min(inv[id] || 0, 999 - (m.itens[id] || 0)) : Math.min(1, inv[id] || 0);
      if (move <= 0) return;
      inv[id] -= move;
      m.itens[id] = Math.min(999, (m.itens[id] || 0) + move);
    } else {
      const move = all ? Math.min(m.itens[id] || 0, 999 - (inv[id] || 0)) : Math.min(1, m.itens[id] || 0);
      if (move <= 0) return;
      m.itens[id] -= move;
      ctx.editing.gainItem(id, move);
    }
    ctx.metas.touch(chestKey);
    ctx.save.schedule();
    renderChest();
    api.updateCounts();
    ctx.audio.soundUI();
  }
  els.chestContent.addEventListener('click', onChestClick);
  els.chestInventory.addEventListener('click', onChestClick);
  els.chestClose.addEventListener('click', () => closeChest());

  function lockLabel() {
    const m = ctx.metas.all().get(chestKey);
    const isPublic = !!(m && m.tipo === 'bau' && m.publico);
    els.chestLock.textContent = isPublic ? '🔓 Liberado pra todos' : '🔒 Só eu abro';
    els.chestLock.setAttribute('aria-pressed', String(isPublic));
  }
  els.chestLock.addEventListener('click', () => {
    const m = ctx.metas.all().get(chestKey);
    if (!m || m.tipo !== 'bau') return;
    m.publico = !m.publico;
    ctx.metas.touch(chestKey);
    ctx.save.schedule();
    lockLabel();
    ctx.audio.soundUI();
    api.announce(m.publico ? 'Baú liberado pra todos abrirem.' : 'Baú bloqueado, só você abre.');
  });

  function closeChest() {
    if (chestKey < 0) return;
    chestKey = -1;
    els.chestPanel.hidden = true;
    ctx.lock.request();
  }

  function openFurnace() {
    api.toggleCraftPanel(false);
    buildFurnace();
    els.furnacePanel.hidden = false;
    api.updateCounts();
    ctx.lock.release();
    ctx.audio.soundUI();
    api.announce('Fornalha aberta — receitas que precisam de fogo.');
  }
  function closeFurnace() {
    if (els.furnacePanel.hidden) return;
    els.furnacePanel.hidden = true;
    ctx.lock.request();
  }
  els.furnaceClose.addEventListener('click', () => closeFurnace());

  function closeSignForm(text: string | null) {
    if (!signCb) return;
    const cb = signCb;
    signCb = null;
    els.signForm.hidden = true;
    ctx.lock.request();
    cb(text);
  }
  els.signOk.addEventListener('click', () => closeSignForm((els.signInput as HTMLInputElement).value.trim().slice(0, 48)));
  els.signCancel.addEventListener('click', () => closeSignForm(null));
  els.signInput.addEventListener('keydown', (e) => {
    const ev = e as KeyboardEvent;
    if (ev.key === 'Enter') { e.preventDefault(); closeSignForm((els.signInput as HTMLInputElement).value.trim().slice(0, 48)); }
  });

  const api: UI = {
    els,
    openChest(key, title, isOwner) {
      api.toggleCraftPanel(false);
      chestKey = key;
      els.chestTitle.textContent = title;
      els.chestLock.hidden = !isOwner;
      if (isOwner) lockLabel();
      els.chestPanel.hidden = false;
      renderChest();
      ctx.lock.release();
      ctx.audio.soundUI();
      api.announce(title + ' aberto.');
    },
    closeChest,
    chestOpen: () => chestKey,
    updateChest() { if (chestKey >= 0) renderChest(); },
    openFurnace,
    closeFurnace,
    furnaceOpen: () => !els.furnacePanel.hidden,
    askSignText(cb) {
      signCb = cb;
      (els.signInput as HTMLInputElement).value = '';
      els.signForm.hidden = false;
      ctx.lock.release();
      setTimeout(() => els.signInput.focus(), 30);
    },
    showSign(text, author) {
      api.showToast('📜 <b>' + esc(text || '(placa em branco)') + '</b>' + (author ? ' <span class="placa__autor">— ' + esc(author) + '</span>' : ''), 'info', 4200);
    },
    isPanelOpen: () => !els.invPanel.hidden || !els.chestPanel.hidden || !els.signForm.hidden || !els.furnacePanel.hidden,
    closeTopPanel() {
      if (!els.signForm.hidden) { closeSignForm(null); return true; }
      if (chestKey >= 0) { closeChest(); return true; }
      if (!els.furnacePanel.hidden) { closeFurnace(); return true; }
      if (!els.invPanel.hidden) {
        api.toggleCraftPanel(false);
        ctx.lock.request();
        ctx.audio.soundUI();
        api.announce('Inventário fechado.');
        return true;
      }
      return false;
    },
    showPlayers(show) {
      if (show && !ctx.sync.inRoom()) {
        els.playersTab.innerHTML =
          '<h3 class="tabj__titulo">👥 Jogadores (1)</h3><ul class="tabj__lista"><li><span class="tabj__nome">Você</span> <span class="tabj__eu">(sozinho)</span></li></ul>';
      }
      els.playersTab.hidden = !show;
    },
    updatePlayersTab(me, owner, list) {
      const names = [me].concat(list.map((p) => p.nome));
      const rows = names
        .map((n) => {
          const crown = n && n === owner ? '<span class="tabj__coroa">👑</span>' : '';
          const mark = n === me ? ' <span class="tabj__eu">(você)</span>' : '';
          return '<li>' + crown + '<span class="tabj__nome">' + esc(n) + '</span>' + mark + '</li>';
        })
        .join('');
      els.playersTab.innerHTML =
        '<h3 class="tabj__titulo">👥 Jogadores (' + names.length + ')</h3><ul class="tabj__lista">' + rows + '</ul>';
    },
    announce(msg) {
      const now = performance.now();
      if (now - announceAt < 1000) return;
      announceAt = now;
      els.announcer.textContent = '';
      requestAnimationFrame(() => { els.announcer.textContent = msg; });
    },
    showToast(html, kind, ms) {
      els.toast.innerHTML = html;
      els.toast.className = 'toast ' + kind;
      els.toast.hidden = false;
      requestAnimationFrame(() => els.toast.classList.add('show'));
      clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => {
        els.toast.classList.remove('show');
        setTimeout(() => { els.toast.hidden = true; }, 250);
      }, ms || 2400);
    },
    buildHotbar,
    selectSlot,
    updateCounts,
    buildCraft,
    buildInventory,
    toggleCraftPanel(open) {
      const panel = els.invPanel;
      const want = open === undefined ? panel.hidden : open;
      panel.hidden = !want;
      els.craftBtn.setAttribute('aria-expanded', String(want));
      if (want) api.updateCounts();
    },
    showSaving(state) {
      clearTimeout(savingTimer);
      const el = els.saving;
      if (state === 'nada') { el.hidden = true; return; }
      el.textContent = state === 'salvando' ? '💾 salvando…' : state === 'salvo' ? '✅ salvo!' : '📡 sem conexão';
      el.hidden = false;
      if (state !== 'salvando') {
        savingTimer = window.setTimeout(() => { el.hidden = true; }, 1800);
      }
    },
    flashScare() {
      els.scare.classList.remove('show');
      void els.scare.offsetWidth;
      els.scare.classList.add('show');
    },
    flashHurt() {
      els.hurt.classList.remove('show');
      void els.hurt.offsetWidth;
      els.hurt.classList.add('show');
    },
    buildHunger,
    updateHunger,
  };
  return api;
}
