import * as THREE from 'three';
import { brotarArvore } from './geracao';
import type { Target, Ctx, Editing } from './types';

const LEAF_NATURAL = 7;
const LEAF_PLACED = 16;
const TRUNK = 5;
const CHEST = 17;
const DOOR_CLOSED = 18;
const DOOR_OPEN = 19;
const SIGN = 20;
const PICKAXE = 24;
const IRON_PICKAXE = 28;
const SWORD_WOOD = 30;
const SWORD_IRON = 31;
const AXE_WOOD = 32;
const AXE_IRON = 33;
const MELEE = 3.2;
const CONE = 0.6;
const SWING_MS = 350;
const FURNACE = 27;
const MAILBOX = 34;
const PACKAGE = 35;
const isDoor = (id: number) => id === DOOR_CLOSED || id === DOOR_OPEN;

export function createEditing(ctx: Ctx): Editing {
  const { world, player, byId, cfg } = ctx;
  const halfW = cfg.jogador.largura / 2;
  let toastTimer = 0;
  let timeMs = 0;
  const saplings: Array<{ x: number; y: number; z: number; quandoMs: number }> = [];

  let progress = 0;
  let strikeTarget: Target | null = null;
  let isStriking = false;
  let lastKnock = 0;
  let meleeCdMs = SWING_MS;

  const crackMat = new THREE.MeshBasicMaterial({
    map: ctx.texture.atlas,
    alphaTest: 0.4,
    transparent: true,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    side: THREE.DoubleSide,
  });
  const crackGeo = new THREE.BoxGeometry(1.001, 1.001, 1.001);
  const crack = new THREE.Mesh(crackGeo, crackMat);
  crack.frustumCulled = false;
  crack.visible = false;
  ctx.scene.add(crack);
  let crackTile = -1;

  function applyCrackTile(tile: number) {
    if (tile === crackTile) return;
    crackTile = tile;
    const [u0, v0, u1, v1] = ctx.texture.uv(tile);
    const uv = crackGeo.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, uv.getX(i) > 0.5 ? u1 : u0, uv.getY(i) > 0.5 ? v1 : v0);
    }
    uv.needsUpdate = true;
  }
  const originalUv = (crackGeo.attributes.uv as THREE.BufferAttribute).array.slice();
  function swapTile(tile: number) {
    if (tile === crackTile) return;
    (crackGeo.attributes.uv as THREE.BufferAttribute).array.set(originalUv);
    crackTile = -1;
    applyCrackTile(tile);
  }

  function hideCrack() {
    crack.visible = false;
    progress = 0;
    strikeTarget = null;
  }

  function warn(msg: string): boolean {
    const now = performance.now();
    if (now - toastTimer < 1200) return false;
    toastTimer = now;
    ctx.ui.showToast(msg, 'info', 1600);
    return true;
  }

  function intersectsPlayer(cx: number, cy: number, cz: number): boolean {
    return (
      player.x + halfW > cx && player.x - halfW < cx + 1 &&
      player.y + cfg.jogador.altura > cy && player.y < cy + 1 &&
      player.z + halfW > cz && player.z - halfW < cz + 1
    );
  }

  function addToHotbar(item: number): boolean {
    if (!ctx.items.includes(item)) return true;
    const slots = ctx.state.hotbarSlots;
    if (slots.includes(item)) return true;
    const empty = slots.indexOf(0);
    if (empty >= 0) { slots[empty] = item; return true; }
    return false;
  }

  function myName(): string {
    return ctx.sync.inRoom() ? ctx.sync.myRoomName() : '';
  }
  function canUse(owner: string): boolean {
    if (owner === '*') return true;
    if (!ctx.sync.inRoom()) return true;
    if (ctx.sync.isVisiting()) return owner === ctx.sync.myRoomName();
    return owner === '' || owner === ctx.sync.myRoomName();
  }

  function gainItemDirect(id: number, n = 1) {
    if (id <= 0 || id >= ctx.blocks.length || n <= 0) return;
    const inv = ctx.state.inventory;
    inv[id] = Math.min(999, (inv[id] || 0) + n);
    addToHotbar(id);
    ctx.ui.updateCounts();
  }

  function gainItem(brokenId: number) {
    const inv = ctx.state.inventory;
    const def = byId(brokenId);
    const item = def.drop ?? brokenId;
    if (item !== 0) {
      inv[item] = Math.min(999, (inv[item] || 0) + 1);
      if (!addToHotbar(item)) {
        warn('🎒 Hotbar cheia! O item foi pro inventário — aperte E pra ver.');
      }
      ctx.ui.updateCounts();
      ctx.ui.announce('Pegou ' + byId(item).nome + '! Você tem ' + inv[item] + '.');
    }
    if (def.dropSorte && Math.random() < def.dropSorte.chance) {
      const s = def.dropSorte.id;
      inv[s] = Math.min(999, (inv[s] || 0) + 1);
      addToHotbar(s);
      ctx.ui.updateCounts();
      ctx.ui.showToast('🌱 Caiu uma ' + byId(s).nome + '! Plante em grama ou terra.', 'ok', 2200);
      ctx.audio.soundSaved();
    }
  }

  function clearMetaOnBreak(x: number, y: number, z: number) {
    const m = ctx.metas.get(x, y, z);
    if (!m) return;
    if (m.tipo === 'bau') {
      for (let id = 0; id < m.itens.length; id++) gainItemDirect(id, m.itens[id] | 0);
    }
    ctx.metas.remove(x, y, z);
  }

  function removeBlock(a: Target): boolean {
    clearMetaOnBreak(a.x, a.y, a.z);
    if (isDoor(a.id)) {
      const oy = isDoor(world.get(a.x, a.y + 1, a.z)) ? a.y + 1
        : isDoor(world.get(a.x, a.y - 1, a.z)) ? a.y - 1 : null;
      world.set(a.x, a.y, a.z, 0);
      if (oy !== null) world.set(a.x, oy, a.z, 0);
      gainItem(a.id);
      ctx.audio.soundBreak(a.id);
      ctx.save.schedule();
      ctx.flow.onFirstInput();
      return true;
    }
    world.set(a.x, a.y, a.z, 0);
    gainItem(a.id);
    const above = world.get(a.x, a.y + 1, a.z);
    if (above !== 0 && byId(above).render === 'cruz') {
      world.set(a.x, a.y + 1, a.z, 0);
      gainItem(above);
      ctx.metas.remove(a.x, a.y + 1, a.z);
    }
    if (a.id === TRUNK || a.id === LEAF_NATURAL || a.id === LEAF_PLACED) {
      queueNeighbors(a.x, a.y, a.z);
    }
    ctx.audio.soundBreak(a.id);
    ctx.save.schedule();
    ctx.flow.onFirstInput();
    return true;
  }

  function heldItem(): number {
    return ctx.state.hotbarSlots[ctx.state.sel] || 0;
  }

  function holdingPickaxe(): boolean {
    const h = heldItem();
    return h === PICKAXE || h === IRON_PICKAXE;
  }

  function holdingSword(): boolean {
    const h = heldItem();
    return h === SWORD_WOOD || h === SWORD_IRON;
  }

  function holdingAxe(): boolean {
    const h = heldItem();
    return h === AXE_WOOD || h === AXE_IRON;
  }

  function swordDamage(): number {
    return heldItem() === SWORD_IRON ? 3 : 1;
  }

  const { SX, SZ } = cfg.mundo;
  const key2 = (x: number, z: number) => x + z * SX;
  const NEI4 = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
  const DIAG4 = [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const;

  function floorLevel(x: number, yTop: number, z: number): number {
    for (let y = yTop; y > 1 && y > yTop - 16; y--) {
      const below = world.get(x, y - 1, z);
      if (below !== 0 && byId(below).solido) return y;
    }
    return yTop;
  }
  function houseAt(x0: number, yHint: number, z0: number): { closed: boolean; hasDoor: boolean; inside: Set<number>; shell: Set<number> } {
    const CAP = 1500;
    const RADIUS = 24;
    const y0 = floorLevel(x0, yHint, z0);
    const inside = new Set<number>();
    const shell = new Set<number>();
    const first = world.get(x0, y0, z0);
    if ((first !== 0 && byId(first).solido) || isDoor(first)) return { closed: false, hasDoor: false, inside, shell };
    let hasDoor = false;
    const seen = new Set<number>([key2(x0, z0)]);
    let frontier: Array<[number, number]> = [[x0, z0]];
    let counted = 1;
    while (frontier.length) {
      const next: Array<[number, number]> = [];
      for (const [x, z] of frontier) {
        inside.add(key2(x, z));
        for (const [dx, dz] of NEI4) {
          const nx = x + dx;
          const nz = z + dz;
          const id = world.get(nx, y0, nz);
          if (isDoor(id)) { shell.add(key2(nx, nz)); hasDoor = true; continue; }
          if (id !== 0 && byId(id).solido) { shell.add(key2(nx, nz)); continue; }
          if (Math.abs(nx - x0) > RADIUS || Math.abs(nz - z0) > RADIUS) return { closed: false, hasDoor, inside, shell };
          const k = key2(nx, nz);
          if (seen.has(k)) continue;
          seen.add(k);
          if (++counted > CAP) return { closed: false, hasDoor, inside, shell };
          next.push([nx, nz]);
        }
        for (const [dx, dz] of DIAG4) {
          const nx = x + dx;
          const nz = z + dz;
          const id = world.get(nx, y0, nz);
          if (isDoor(id) || (id !== 0 && byId(id).solido)) shell.add(key2(nx, nz));
        }
      }
      frontier = next;
    }
    return { closed: true, hasDoor, inside, shell };
  }
  function anyMailbox(): boolean {
    for (const m of ctx.metas.all().values()) if (m.tipo === 'caixa') return true;
    return false;
  }
  const houseMemo = new Map<number, { ms: number; ok: boolean; columns: Set<number> }>();
  function mailboxHouse(memoKey: number, seedKey: number): { ok: boolean; columns: Set<number> } {
    const now = performance.now();
    const cache = houseMemo.get(memoKey);
    if (cache && now - cache.ms < 500) return cache;
    const cx = seedKey % SX;
    const cz = Math.floor(seedKey / SX) % SZ;
    const cy = Math.floor(seedKey / (SX * SZ));
    const r = houseAt(cx, cy, cz);
    const columns = new Set<number>([...r.inside, ...r.shell]);
    const res = { ms: now, ok: r.closed && r.hasDoor, columns };
    houseMemo.set(memoKey, res);
    return res;
  }
  const mailboxSeed = (ck: number, m: { casa?: number }) => (typeof m.casa === 'number' ? m.casa : ck);
  const colsMemo = new Map<number, { source: number[]; set: Set<number> }>();
  function storedCols(ck: number, cols: number[]): Set<number> {
    const cache = colsMemo.get(ck);
    if (cache && cache.source === cols) return cache.set;
    const set = new Set<number>(cols);
    colsMemo.set(ck, { source: cols, set });
    return set;
  }
  function healLegacyMailbox(ck: number, m: { dono: string; casa?: number }, columns: Set<number>) {
    if (!canUse(m.dono)) return;
    const cx = ck % SX;
    const cz = Math.floor(ck / SX) % SZ;
    const cy = Math.floor(ck / (SX * SZ));
    ctx.metas.set(cx, cy, cz, { tipo: 'caixa', dono: m.dono, casa: m.casa, cols: [...columns] });
  }
  let protMemoKey = -1;
  let protMemoMs = -1e9;
  let protMemoOwner: string | null = null;
  function protectorAt(x: number, y: number, z: number): string | null {
    if (!anyMailbox()) return null;
    const k = ctx.metas.keyOf(x, y, z);
    const now = performance.now();
    if (k === protMemoKey && now - protMemoMs < 200) return protMemoOwner;
    const col = key2(x, z);
    let owner: string | null = null;
    for (const [ck, m] of ctx.metas.all()) {
      if (m.tipo !== 'caixa') continue;
      if (Array.isArray(m.cols)) {
        if (storedCols(ck, m.cols).has(col)) { owner = m.dono; break; }
        continue;
      }
      const house = mailboxHouse(ck, mailboxSeed(ck, m));
      if (house.ok) healLegacyMailbox(ck, m, house.columns);
      if (house.ok && house.columns.has(col)) { owner = m.dono; break; }
    }
    protMemoKey = k;
    protMemoMs = now;
    protMemoOwner = owner;
    return owner;
  }
  function protectingOwner(a: Target): string | null {
    return protectorAt(a.x, a.y, a.z);
  }

  function canBreak(a: Target): boolean {
    if (a.id === 14 || byId(a.id).dureza === undefined) {
      warn('🪨 Essa rocha do fundo não quebra!');
      return false;
    }
    if (byId(a.id).precisaPicareta && !holdingPickaxe()) {
      warn('⛏ ' + byId(a.id).nome + ' é duro demais pra mão! Segure uma picareta.');
      return false;
    }
    if (a.id === CHEST) {
      const m = ctx.metas.get(a.x, a.y, a.z);
      if (m && m.tipo === 'bau' && !canUse(m.dono)) {
        warn('🔒 Esse baú é do(a) ' + (m.dono || 'dono') + '! Só ele(a) pode quebrar.');
        return false;
      }
    }
    if (a.id === MAILBOX) {
      const m = ctx.metas.get(a.x, a.y, a.z);
      if (m && m.tipo === 'caixa' && !canUse(m.dono)) {
        warn('🔒 Essa caixa é do(a) ' + (m.dono || 'dono') + '!');
        return false;
      }
      return true;
    }
    const protector = protectingOwner(a);
    if (protector !== null && !canUse(protector)) {
      warn('🔒 Essa casa é do(a) ' + protector + '! Só ele(a) mexe aqui.');
      return false;
    }
    return true;
  }

  function breakBlock(forcedTarget?: Target): boolean {
    if (ctx.state.phase !== 'playing') return false;
    const a = forcedTarget || ctx.aim.target();
    if (!a) return false;
    if (!canBreak(a)) return false;
    return removeBlock(a);
  }

  function strikeWithSword(dt: number) {
    hideCrack();
    meleeCdMs += dt * 1000;
    if (meleeCdMs < SWING_MS) return;
    meleeCdMs = 0;
    const ex = player.x;
    const ey = player.y + cfg.jogador.olho;
    const ez = player.z;
    const fx = -Math.sin(player.yaw) * Math.cos(player.pitch);
    const fy = Math.sin(player.pitch);
    const fz = -Math.cos(player.yaw) * Math.cos(player.pitch);
    const g = ctx.kotsooh.hit(ex, ey, ez, fx, fy, fz, MELEE, CONE, swordDamage());
    if (g.acertou) {
      ctx.ui.flashScare();
      if (g.evaporou) {
        ctx.audio.soundGhost();
        ctx.ui.showToast('👻 Puff! O Kotsooh evaporou!', 'ok', 1800);
      } else {
        ctx.audio.soundScare();
      }
      ctx.flow.onFirstInput();
      return;
    }
    if (ctx.mob.scare(ex, ey, ez, fx, fy, fz, MELEE, CONE)) {
      ctx.audio.soundSaved();
      ctx.ui.showToast('🐾 O Winpup fugiu assustado!', 'info', 1500);
      ctx.flow.onFirstInput();
      return;
    }
    ctx.audio.soundJump();
  }

  function strike(dt: number) {
    if (ctx.state.phase !== 'playing') { hideCrack(); return; }
    isStriking = true;
    if (holdingSword()) { strikeWithSword(dt); return; }
    const a = ctx.aim.target();
    if (!a || !canBreak(a)) { hideCrack(); return; }
    if (!strikeTarget || strikeTarget.x !== a.x || strikeTarget.y !== a.y || strikeTarget.z !== a.z) {
      strikeTarget = a;
      progress = 0;
      lastKnock = timeMs;
    }
    progress += dt * 1000;
    const targetDef = byId(a.id);
    const tool = heldItem();
    let hardness = tool === IRON_PICKAXE && targetDef.durezaFerro !== undefined ? targetDef.durezaFerro
      : holdingPickaxe() && targetDef.durezaPicareta !== undefined ? targetDef.durezaPicareta
        : targetDef.dureza!;
    if (targetDef.madeira && holdingAxe()) hardness /= tool === AXE_IRON ? 3.5 : 2;
    if (progress >= hardness) {
      removeBlock(a);
      hideCrack();
      return;
    }
    if (timeMs - lastKnock > 240) {
      lastKnock = timeMs;
      ctx.audio.soundBreak(a.id);
    }
    const frac = progress / hardness;
    swapTile(frac < 0.34 ? 17 : frac < 0.67 ? 18 : 19);
    crack.position.set(a.x + 0.5, a.y + 0.5, a.z + 0.5);
    crack.visible = progress > 90 && byId(a.id).render !== 'cruz';
  }

  function releaseStrike() {
    isStriking = false;
    meleeCdMs = SWING_MS;
    hideCrack();
  }

  function place(forcedTarget?: Target): boolean {
    if (ctx.state.phase !== 'playing') return false;
    const a = forcedTarget || ctx.aim.target();
    if (!a) return false;
    const id = ctx.state.hotbarSlots[ctx.state.sel];
    if (!id) {
      if (warn('🎒 Esse espaço da hotbar está vazio! Escolha um item no inventário (E).')) ctx.audio.soundError();
      return false;
    }
    const def = byId(id);
    if (def.ferramenta) {
      if (warn('🛠 ' + def.nome + ' é ferramenta! Segure e bata pra usar — não dá pra colocar no chão.')) ctx.audio.soundError();
      return false;
    }
    if (id === MAILBOX) return placeMailbox(a);
    if ((ctx.state.inventory[id] || 0) <= 0) {
      if (warn('🎒 Você não tem ' + def.nome + '! Quebre blocos pra ganhar.')) ctx.audio.soundError();
      return false;
    }
    const replaceInPlace = byId(a.id).render === 'cruz';
    const cx = replaceInPlace ? a.x : a.x + a.nx;
    const cy = replaceInPlace ? a.y : a.y + a.ny;
    const cz = replaceInPlace ? a.z : a.z + a.nz;
    const { SX, SZ, tetoConstrucao } = ctx.cfg.mundo;
    if (cx < 0 || cx >= SX || cz < 0 || cz >= SZ || cy < 1 || cy > tetoConstrucao) return false;
    const occupant = world.get(cx, cy, cz);
    if (occupant === MAILBOX) {
      const mc = ctx.metas.get(cx, cy, cz);
      if (mc && mc.tipo === 'caixa' && !canUse(mc.dono)) {
        if (warn('🔒 Essa caixa é do(a) ' + (mc.dono || 'dono') + '! Só ele(a) mexe aqui.')) ctx.audio.soundError();
        return false;
      }
    }
    const placeProtector = protectorAt(cx, cy, cz);
    if (placeProtector !== null && !canUse(placeProtector)) {
      if (warn('🔒 Essa casa é do(a) ' + placeProtector + '! Só ele(a) mexe aqui.')) ctx.audio.soundError();
      return false;
    }
    if (occupant !== 0 && byId(occupant).render === 'cubo') return false;
    if (occupant !== 0 && byId(occupant).render === 'recorte') return false;
    if (occupant !== 0 && byId(occupant).render === 'porta') return false;
    if (def.solido && intersectsPlayer(cx, cy, cz)) return false;
    if (def.render === 'cruz' && !byId(world.get(cx, cy - 1, cz)).solido) {
      warn('🌼 Isso precisa de um chão pra plantar!');
      return false;
    }
    if (id === 15) {
      const soil = world.get(cx, cy - 1, cz);
      if (soil !== 1 && soil !== 2) {
        warn('🌱 A muda só pega em grama ou terra!');
        return false;
      }
    }
    if (id === SIGN) {
      placeSign(cx, cy, cz);
      return false;
    }
    if (occupant !== 0 && byId(occupant).render === 'cruz') {
      gainItem(occupant);
      ctx.metas.remove(cx, cy, cz);
    }
    if (id === DOOR_CLOSED) {
      if (cy + 1 > ctx.cfg.mundo.tetoConstrucao || world.get(cx, cy + 1, cz) !== 0) {
        warn('🚪 Precisa de 2 blocos de altura livre pra porta!');
        return false;
      }
      world.set(cx, cy + 1, cz, DOOR_CLOSED);
    }
    const finalId = id === LEAF_NATURAL ? LEAF_PLACED : id;
    world.set(cx, cy, cz, finalId);
    ctx.state.inventory[id]--;
    if (id === 15) {
      const C = ctx.cfg.crescimento;
      saplings.push({ x: cx, y: cy, z: cz, quandoMs: timeMs + C.minMs + Math.random() * (C.maxMs - C.minMs) });
    }
    if (finalId === CHEST) ctx.metas.set(cx, cy, cz, { tipo: 'bau', dono: myName(), itens: [] });
    ctx.ui.updateCounts();
    ctx.audio.soundPlace();
    ctx.save.schedule();
    ctx.flow.onFirstInput();
    return true;
  }

  function placeSign(cx: number, cy: number, cz: number) {
    ctx.ui.askSignText((text) => {
      if (text === null) return;
      if ((ctx.state.inventory[SIGN] || 0) <= 0) return;
      if (world.get(cx, cy, cz) !== 0) return;
      if (!byId(world.get(cx, cy - 1, cz)).solido) {
        warn('🌼 A placa precisa de um chão embaixo!');
        return;
      }
      world.set(cx, cy, cz, SIGN);
      ctx.state.inventory[SIGN]--;
      ctx.metas.set(cx, cy, cz, { tipo: 'placa', autor: myName(), texto: text });
      ctx.ui.updateCounts();
      ctx.audio.soundPlace();
      ctx.save.schedule();
      ctx.flow.onFirstInput();
    });
  }

  function interact(forcedTarget?: Target): boolean {
    if (ctx.state.phase !== 'playing') return false;
    const a = forcedTarget || ctx.aim.target();
    if (!a) return place();
    if (a.id === CHEST) { openChest(a); return false; }
    if (a.id === FURNACE) { ctx.flow.releaseInputs(); ctx.ui.openFurnace(); ctx.flow.onFirstInput(); return false; }
    if (a.id === MAILBOX) { readMailbox(a); return false; }
    if (a.id === DOOR_CLOSED) { toggleDoor(a, DOOR_OPEN); return false; }
    if (a.id === DOOR_OPEN) { toggleDoor(a, DOOR_CLOSED); return false; }
    if (a.id === SIGN) { readSign(a); return false; }
    return place();
  }

  function openChest(a: Target) {
    const m = ctx.metas.get(a.x, a.y, a.z);
    if (!m || m.tipo !== 'bau') return;
    if (!m.publico && !canUse(m.dono)) {
      warn('🔒 Esse baú é do(a) ' + (m.dono || 'dono') + '! Só ele(a) pode abrir.');
      ctx.audio.soundError();
      return;
    }
    ctx.flow.releaseInputs();
    const isOwner = ctx.sync.inRoom() && m.dono !== '*' && canUse(m.dono);
    const title = m.dono === '*' ? '💎 Baú do tesouro!' : (m.publico ? '🔓 ' : '') + (m.dono ? 'Baú de ' + m.dono : 'Seu baú');
    ctx.ui.openChest(ctx.metas.keyOf(a.x, a.y, a.z), title, isOwner);
    ctx.flow.onFirstInput();
  }

  function toggleDoor(a: Target, next: number) {
    const oy = isDoor(world.get(a.x, a.y + 1, a.z)) ? a.y + 1
      : isDoor(world.get(a.x, a.y - 1, a.z)) ? a.y - 1 : null;
    world.set(a.x, a.y, a.z, next);
    if (oy !== null) world.set(a.x, oy, a.z, next);
    ctx.audio.soundUI();
    ctx.flow.onFirstInput();
    ctx.save.schedule();
  }

  function readSign(a: Target) {
    const m = ctx.metas.get(a.x, a.y, a.z);
    if (!m || m.tipo !== 'placa') return;
    ctx.ui.showSign(m.texto, m.autor);
    ctx.flow.onFirstInput();
  }

  function readMailbox(a: Target) {
    const m = ctx.metas.get(a.x, a.y, a.z);
    if (!m || m.tipo !== 'caixa') return;
    ctx.ui.showToast('🏠 Casa de <b>' + (m.dono || 'ninguém') + '</b> — só o dono mexe nos blocos daqui.', 'info', 2800);
    ctx.flow.onFirstInput();
  }

  function placeMailbox(a: Target): boolean {
    if (!(a.ny === 0 && (a.nx !== 0 || a.nz !== 0))) {
      if (warn('📮 Pregue a caixa de correio numa PAREDE (do lado, não no chão)!')) ctx.audio.soundError();
      return false;
    }
    const mx = a.x + a.nx;
    const my = a.y;
    const mz = a.z + a.nz;
    if (world.get(mx, my, mz) !== 0) { warn('📮 Não tem espaço vazio nessa parede!'); return false; }
    if ((ctx.state.inventory[MAILBOX] || 0) <= 0) {
      if (warn('📮 Você não tem caixa de correio! Fabrique com 4 tábuas.')) ctx.audio.soundError();
      return false;
    }
    const protector = protectorAt(mx, my, mz);
    if (protector !== null && !canUse(protector)) {
      if (warn('🔒 Essa casa é do(a) ' + protector + '! Pregue sua caixa na sua casa.')) ctx.audio.soundError();
      return false;
    }
    let r = houseAt(mx, my, mz);
    let seedX = mx;
    let seedZ = mz;
    if (!(r.closed && r.hasDoor)) {
      for (let i = 1; i <= 3; i++) {
        const ox = a.x - a.nx * i;
        const oz = a.z - a.nz * i;
        const rO = houseAt(ox, my, oz);
        if (!rO.closed && rO.inside.size === 0) continue;
        if ((rO.closed && rO.hasDoor) || (!r.closed && rO.closed)) { r = rO; seedX = ox; seedZ = oz; }
        break;
      }
    }
    if (!r.closed) {
      if (warn('🏠 Faça um contorno fechado de paredes ao redor (não precisa de teto)!')) ctx.audio.soundError();
      return false;
    }
    if (!r.hasDoor) {
      if (warn('🚪 A casa precisa de uma porta pra ter dono!')) ctx.audio.soundError();
      return false;
    }
    const columns = new Set<number>([...r.inside, ...r.shell]);
    for (const [ck, m] of ctx.metas.all()) {
      if (m.tipo !== 'caixa') continue;
      const sk = typeof m.casa === 'number' ? m.casa : ck;
      if (columns.has(key2(sk % SX, Math.floor(sk / SX) % SZ))) {
        if (warn('📮 Essa casa já tem uma caixa de correio!')) ctx.audio.soundError();
        return false;
      }
    }
    world.set(mx, my, mz, MAILBOX);
    ctx.state.inventory[MAILBOX]--;
    ctx.metas.set(mx, my, mz, { tipo: 'caixa', dono: myName(), casa: ctx.metas.keyOf(seedX, my, seedZ), cols: [...columns] });
    ctx.ui.updateCounts();
    ctx.audio.soundPlace();
    ctx.ui.showToast('📮 Caixa pregada! Agora só você quebra os blocos dessa casa.', 'ok', 2600);
    ctx.save.schedule();
    ctx.flow.onFirstInput();
    return false;
  }

  function dropSelectedItem() {
    if (ctx.state.phase !== 'playing') return;
    const id = heldItem();
    if (!id || (ctx.state.inventory[id] || 0) <= 0) return;
    const fx = -Math.sin(player.yaw);
    const fz = -Math.cos(player.yaw);
    const tx = Math.floor(player.x + fx * 1.2);
    const tz = Math.floor(player.z + fz * 1.2);
    const ty = world.highestGround(tx, tz) + 1;
    const protector = protectorAt(tx, ty, tz);
    if (protector !== null && !canUse(protector)) {
      if (warn('🔒 Essa casa é do(a) ' + protector + '! Largue o pacote fora dela.')) ctx.audio.soundError();
      return;
    }
    if (world.get(tx, ty, tz) !== 0) {
      if (warn('🎁 Sem espaço pra largar aqui — vire pra um lugar aberto!')) ctx.audio.soundError();
      return;
    }
    ctx.state.inventory[id]--;
    world.set(tx, ty, tz, PACKAGE);
    ctx.metas.set(tx, ty, tz, { tipo: 'drop', item: id, n: 1 });
    ctx.ui.updateCounts();
    ctx.audio.soundPlace();
    ctx.save.schedule();
    ctx.flow.onFirstInput();
  }

  const toCheck: Array<[number, number, number]> = [];
  const decaying: Array<{ x: number; y: number; z: number; quandoMs: number }> = [];
  const queued = new Set<number>();
  const scheduled = new Set<number>();
  const key3 = (x: number, y: number, z: number) =>
    x + z * cfg.mundo.SX + y * cfg.mundo.SX * cfg.mundo.SZ;
  let saplingToastMs = -Infinity;

  function queueNeighbors(x: number, y: number, z: number) {
    for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      const nz = z + dz;
      if (world.get(nx, ny, nz) !== LEAF_NATURAL) continue;
      const k = key3(nx, ny, nz);
      if (queued.has(k)) continue;
      queued.add(k);
      toCheck.push([nx, ny, nz]);
    }
  }

  function hasConnectedTrunk(x0: number, y0: number, z0: number): boolean {
    const range = ctx.cfg.decay.alcanceTronco;
    const visited = new Set<number>([key3(x0, y0, z0)]);
    let frontier: Array<[number, number, number]> = [[x0, y0, z0]];
    for (let dist = 0; dist <= range; dist++) {
      const next: Array<[number, number, number]> = [];
      for (const [x, y, z] of frontier) {
        for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const) {
          const nx = x + dx;
          const ny = y + dy;
          const nz = z + dz;
          const id = world.get(nx, ny, nz);
          if (id === TRUNK) return true;
          if (id !== LEAF_NATURAL) continue;
          const k = key3(nx, ny, nz);
          if (visited.has(k)) continue;
          visited.add(k);
          next.push([nx, ny, nz]);
        }
      }
      frontier = next;
      if (!frontier.length) break;
    }
    return false;
  }

  function processDecay(nowMs: number, flushAll: boolean) {
    const D = ctx.cfg.decay;
    let budget = flushAll ? Infinity : 30;
    while (toCheck.length && budget-- > 0) {
      const [x, y, z] = toCheck.shift()!;
      const k = key3(x, y, z);
      queued.delete(k);
      if (scheduled.has(k)) continue;
      if (world.get(x, y, z) !== LEAF_NATURAL) continue;
      if (hasConnectedTrunk(x, y, z)) continue;
      const delay = D.atrasoMinMs + Math.random() * (D.atrasoMaxMs - D.atrasoMinMs);
      scheduled.add(k);
      decaying.push({ x, y, z, quandoMs: flushAll ? nowMs : nowMs + Math.round(delay / 300) * 300 });
    }
    for (let i = decaying.length - 1; i >= 0; i--) {
      const d = decaying[i];
      if (!flushAll && nowMs < d.quandoMs) continue;
      decaying.splice(i, 1);
      scheduled.delete(key3(d.x, d.y, d.z));
      if (world.get(d.x, d.y, d.z) !== LEAF_NATURAL) continue;
      if (hasConnectedTrunk(d.x, d.y, d.z)) continue;
      world.set(d.x, d.y, d.z, 0);
      queueNeighbors(d.x, d.y, d.z);
      if (Math.random() < D.chanceMuda) {
        const inv = ctx.state.inventory;
        inv[15] = Math.min(999, (inv[15] || 0) + 1);
        addToHotbar(15);
        ctx.ui.updateCounts();
        if (timeMs - saplingToastMs > 4000) {
          saplingToastMs = timeMs;
          ctx.ui.showToast('🌱 Caiu uma muda da árvore!', 'ok', 2000);
        }
      }
      ctx.save.schedule();
    }
  }

  function step(dt: number, simulate = true) {
    timeMs += dt * 1000;
    if (!simulate) return;
    for (let i = saplings.length - 1; i >= 0; i--) {
      const m = saplings[i];
      if (timeMs < m.quandoMs) continue;
      saplings.splice(i, 1);
      if (world.get(m.x, m.y, m.z) !== 15) continue;
      grow(m.x, m.y, m.z);
    }
    if (toCheck.length || decaying.length) processDecay(timeMs, false);
  }

  function grow(x: number, y: number, z: number) {
    world.set(x, y, z, 0);
    brotarArvore(ctx, x, y - 1, z, Math.random);
    ctx.audio.soundSaved();
    ctx.save.schedule();
    const d = Math.hypot(x - player.x, z - player.z);
    if (d < 24) ctx.ui.showToast('🌳 Sua muda virou uma árvore!', 'ok', 2400);
    ctx.ui.announce('Uma muda cresceu e virou árvore!');
  }

  function startSaplings() {
    saplings.length = 0;
    toCheck.length = 0;
    decaying.length = 0;
    queued.clear();
    scheduled.clear();
    timeMs = 0;
    const { SX, SZ, SY } = ctx.cfg.mundo;
    const C = ctx.cfg.crescimento;
    for (let y = 0; y < SY; y++) {
      for (let z = 0; z < SZ; z++) {
        for (let x = 0; x < SX; x++) {
          const id = world.get(x, y, z);
          if (id === 15) {
            saplings.push({ x, y, z, quandoMs: C.minMs + Math.random() * (C.maxMs - C.minMs) });
          } else if (id === LEAF_NATURAL) {
            const k = key3(x, y, z);
            queued.add(k);
            toCheck.push([x, y, z]);
          }
        }
      }
    }
  }

  function onRemoteEdit(x: number, y: number, z: number, id: number) {
    if (id === 0) {
      queueNeighbors(x, y, z);
    } else if (id === 15) {
      const C = ctx.cfg.crescimento;
      saplings.push({ x, y, z, quandoMs: timeMs + C.minMs + Math.random() * (C.maxMs - C.minMs) });
    }
  }

  return {
    breakBlock,
    place,
    strike,
    releaseStrike,
    striking: () => isStriking,
    step,
    startSaplings,
    addItemToHotbar: addToHotbar,
    gainItem: gainItemDirect,
    interact,
    canUse,
    dropSelectedItem,
    onRemoteEdit,
    growSaplingsNow() {
      for (const m of saplings) m.quandoMs = timeMs;
      step(0);
    },
    decayNow() {
      let guard = 0;
      while ((toCheck.length || decaying.length) && guard++ < 200) {
        processDecay(timeMs, true);
      }
    },
  };
}
