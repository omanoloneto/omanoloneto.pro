import type * as THREE from 'three';
import type { config, mapa, carros, pecas, PecasCarro } from '../../data/overdrive';
import type { CarState, CarControls, CarTelemetry, Surface } from '../../lib/arcade-car';
import type { Stage3D } from '../../lib/stage3d';

export type Cfg = typeof config;
export type MapData = typeof mapa;
export type CarData = (typeof carros)[number];
export type PartsData = typeof pecas;
export type SlotId = keyof PartsData;

export type Phase = 'intro' | 'playing' | 'paused';

export type SurfaceKind = 'rua' | 'grama' | 'agua' | 'trilho';

export interface State {
  phase: Phase;
  muted: boolean;
  firstInput: boolean;
}

export interface City {
  solidAt(x: number, z: number): boolean;
  surfaceAt(x: number, z: number): SurfaceKind;
  buildingTopAt(x: number, z: number): number;
  nearestLandmark(x: number, z: number): { nome: string; emoji: string; dist: number } | null;
  paintMap(canvas: HTMLCanvasElement): void;
}

export interface Minimap {
  step(dtMs: number): void;
  toggleMap(): void;
  mapOpen(): boolean;
}

export interface CarRig {
  state: CarState;
  group: THREE.Group;
  loadout: PecasCarro;
  setPart(slot: SlotId, id: string | null): boolean;
  hit(): void;
  update(dt: number, tel: CarTelemetry): void;
}

export interface Driving {
  step(dt: number): void;
  telemetry(): CarTelemetry;
}

export interface ChaseCam {
  step(dt: number): void;
  snap(): void;
}

export interface UI {
  els: Record<string, HTMLElement>;
  setSpeed(kmh: number): void;
  setPlace(nome: string | null, emoji?: string): void;
  announce(msg: string): void;
}

export interface Audio {
  init(): void;
  resume(): void;
  suspend(): void;
  bindMute(btn: HTMLElement, icon: HTMLElement): void;
  engine(speed: number, throttle: boolean, drifting: boolean): void;
  crash(): void;
  ui(): void;
}

export interface Flow {
  start(): void;
  pause(): void;
  resume(): void;
  releaseInputs(): void;
  onFirstInput(): void;
}

export interface Ctx {
  cfg: Cfg;
  map: MapData;
  carData: CarData;
  parts: PartsData;
  state: State;
  input: CarControls;
  stage: Stage3D;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  sceneEl: HTMLElement;
  reducedMotion: boolean;
  city: City;
  car: CarRig;
  driving: Driving;
  chase: ChaseCam;
  minimap: Minimap;
  ui: UI;
  audio: Audio;
  flow: Flow;
  surfaces: Record<'rua' | 'grama' | 'trilho', Surface>;
}
