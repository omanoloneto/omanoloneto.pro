import type * as THREE from 'three';
import type { blocos, itens, materiais, config, receitas, Bloco } from '../../data/mineblocks';

export type Cfg = typeof config;

export type Phase = 'intro' | 'generating' | 'playing' | 'paused';

export interface State {
  phase: Phase;
  muted: boolean;
  seed: number;
  sel: number;
  firstInput: boolean;
  inventory: number[];
  hotbarSlots: number[];
  fome: number;
}

export interface Player {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  pitch: number;
  onGround: boolean;
  inWater: boolean;
  coyoteMs: number;
}

export interface Input {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  strike: boolean;
  joyX: number;
  joyY: number;
}

export interface Target {
  x: number;
  y: number;
  z: number;
  nx: number;
  ny: number;
  nz: number;
  id: number;
}

export interface Audio {
  init(): void;
  resume(): void;
  suspend(): void;
  musicStep(dt: number): void;
  musicInfo(): { tocando: boolean; nivelNoite: number; volDia: number; volNoite: number };
  bindMute(btn: HTMLElement, icon: HTMLElement): void;
  soundBreak(id: number): void;
  soundPlace(): void;
  soundJump(): void;
  soundSplash(): void;
  soundUI(): void;
  soundSaved(): void;
  soundError(): void;
  soundGhost(): void;
  soundQueroQuero(): void;
  soundScare(): void;
}

export interface Texture {
  atlas: THREE.CanvasTexture;
  uv(tile: number): [number, number, number, number];
  dataURL: string;
}

export interface World {
  data: Uint8Array;
  get(x: number, y: number, z: number): number;
  set(x: number, y: number, z: number, id: number): void;
  dirty: Set<number>;
  highestGround(x: number, z: number): number;
  clear(): void;
  onChange?: (x: number, y: number, z: number, id: number) => void;
}

export interface Meshes {
  buildAll(): void;
  rebuildDirty(): void;
  tint(color: THREE.Color): void;
}

export interface Sky {
  step(dt: number): void;
  time(): number;
  setTime(s: number): void;
}

export interface RemoteMob {
  i: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export interface Mob {
  spawn(seed: number): void;
  step(dt: number, simulate: boolean): void;
  applyNet(mobs: RemoteMob[]): void;
  netState(): RemoteMob[];
  scare(ox: number, oy: number, oz: number, fx: number, fy: number, fz: number, range: number, cone: number): boolean;
  clear(): void;
  count(): number;
  fishCount(): number;
  fishCap(): number;
  spawnFishAt(x: number, z: number): boolean;
  ploverCount(): number;
  ploverState(): Array<{ x: number; y: number; z: number; flying: boolean }>;
  yujackState(): { x: number; y: number; z: number; sitting: boolean } | null;
}

export type Meta =
  | { tipo: 'bau'; dono: string; itens: number[]; publico?: boolean }
  | { tipo: 'placa'; autor: string; texto: string }
  | { tipo: 'caixa'; dono: string; casa?: number; cols?: number[] }
  | { tipo: 'drop'; item: number; n: number };

export interface MetaStore {
  onChange?: (key: number, meta: Meta | null) => void;
  keyOf(x: number, y: number, z: number): number;
  get(x: number, y: number, z: number): Meta | undefined;
  set(x: number, y: number, z: number, meta: Meta): void;
  remove(x: number, y: number, z: number): void;
  apply(key: number, meta: Meta | null): void;
  touch(key: number): void;
  findChest(filter: (chest: Meta & { tipo: 'bau' }, key: number) => boolean): { chave: number; bau: Meta & { tipo: 'bau' } } | null;
  serialize(): Record<string, Meta>;
  load(obj: unknown): void;
  clear(): void;
  all(): Map<number, Meta>;
}

export interface Physics {
  step(dt: number): void;
  push(dx: number, dz: number): void;
  settle(): void;
}

export interface Hunger {
  step(dt: number): void;
  reset(): void;
  starving(): boolean;
}

export interface Kotsooh {
  spawn(): void;
  step(dt: number): void;
  appear(): boolean;
  taunt(): void;
  active(): boolean;
  ghosts(): Array<{ x: number; y: number; z: number; cacando: boolean; olhando: boolean }>;
  hit(ox: number, oy: number, oz: number, fx: number, fy: number, fz: number, range: number, cone: number, damage: number): { acertou: boolean; evaporou: boolean };
  clear(): void;
}

export interface Camera3 {
  step(): void;
}

export interface Aim {
  target(): Target | null;
  step(): void;
}

export interface Editing {
  breakBlock(forced?: Target): boolean;
  place(forced?: Target): boolean;
  strike(dt: number): void;
  releaseStrike(): void;
  striking(): boolean;
  step(dt: number, simulate?: boolean): void;
  startSaplings(): void;
  growSaplingsNow(): void;
  decayNow(): void;
  addItemToHotbar(item: number): boolean;
  gainItem(id: number, n?: number): void;
  onRemoteEdit(x: number, y: number, z: number, id: number): void;
  interact(forced?: Target): boolean;
  canUse(owner: string): boolean;
  dropSelectedItem(): void;
}

export interface Save {
  currentPayload(): string;
  createWorld(): Promise<string | null>;
  loadWorld(code: string): Promise<string | null>;
  adoptWorld(code: string): void;
  saveNow(reason?: 'auto' | 'manual' | 'flush'): Promise<boolean>;
  schedule(): void;
  hasWorld(): boolean;
  worldCode(): string;
  dirty(): boolean;
}

export interface UI {
  els: Record<string, HTMLElement>;
  announce(msg: string): void;
  showToast(html: string, kind: 'ok' | 'info' | 'err', ms?: number): void;
  buildHotbar(): void;
  selectSlot(i: number, announce: boolean): void;
  updateCounts(): void;
  buildCraft(): void;
  buildInventory(): void;
  toggleCraftPanel(open?: boolean): void;
  showSaving(state: 'salvando' | 'salvo' | 'erro' | 'nada'): void;
  flashScare(): void;
  flashHurt(): void;
  buildHunger(): void;
  updateHunger(): void;
  openFurnace(): void;
  openVending(): void;
  closeFurnace(): void;
  furnaceOpen(): boolean;
  openChest(key: number, title: string, isOwner: boolean): void;
  closeChest(): void;
  chestOpen(): number;
  updateChest(): void;
  askSignText(onDone: (text: string | null) => void): void;
  showSign(text: string, author: string): void;
  isPanelOpen(): boolean;
  closeTopPanel(): boolean;
  showPlayers(show: boolean): void;
  updatePlayersTab(me: string, owner: string, list: RemotePlayer[]): void;
}

export interface Flow {
  enterWorld(): void;
  pause(): void;
  resume(): void;
  exitWorld(): Promise<void>;
  measure(): void;
  releaseInputs(): void;
  onFirstInput(): void;
}

export interface Lock {
  request(): void;
  release(): void;
  locked(): boolean;
}

export interface RemotePlayer {
  nome: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
}

export interface Sync {
  inRoom(): boolean;
  isVisiting(): boolean;
  isHost(): boolean;
  roomCode(): string;
  myRoomName(): string;
  createRoom(playerName: string, code: string): Promise<string | null>;
  joinRoom(code: string, playerName: string): Promise<string | null>;
  applyInitialSnapshot(): boolean;
  startPoll(): void;
  leaveRoom(): Promise<void>;
  flushLeave(): void;
  pollNow(): void;
}

export interface Avatars {
  updateList(players: RemotePlayer[]): void;
  step(dt: number): void;
  clear(): void;
  count(): number;
  names(): string[];
  list(): RemotePlayer[];
}

export interface Minimap {
  step(dt: number): void;
  reset(): void;
  toggleMap(): void;
  mapOpen(): boolean;
}

export interface Ctx {
  blocks: typeof blocos;
  items: typeof itens;
  materials: typeof materiais;
  recipes: typeof receitas;
  cfg: Cfg;
  byId: (id: number) => Bloco;
  reducedMotion: boolean;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  sceneEl: HTMLElement;
  lowTier: boolean;
  state: State;
  player: Player;
  input: Input;
  ui: UI;
  audio: Audio;
  texture: Texture;
  world: World;
  metas: MetaStore;
  meshes: Meshes;
  sky: Sky;
  mob: Mob;
  physics: Physics;
  hunger: Hunger;
  kotsooh: Kotsooh;
  camera3: Camera3;
  aim: Aim;
  editing: Editing;
  save: Save;
  sync: Sync;
  avatars: Avatars;
  minimap: Minimap;
  flow: Flow;
  lock: Lock;
}
