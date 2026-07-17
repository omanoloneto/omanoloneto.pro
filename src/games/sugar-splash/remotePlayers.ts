import * as THREE from 'three';
import { buildCharacter, createCharacterMaterials } from './models';
import type { Contexto, RemotePlayers, RoomPlayer } from './tipos';

const MAX_REMOTE = 12;
const SNAP_DIST = 12;
const MAX_EXTRAP_S = 0.55;
const CATCHUP_SPEED_MULT = 1.6;
const MIN_SYNC_GAP_S = 0.12;
const MAX_SYNC_GAP_S = 1.6;

type Remote = {
  used: boolean;
  nome: string;
  team: 0 | 1;
  x: number;
  y: number;
  z: number;
  yaw: number;
  tx: number;
  ty: number;
  tz: number;
  tyaw: number;
  vx: number;
  vz: number;
  lastSyncMs: number;
  atirando: boolean;
  derretido: boolean;
  meltT: number;
  moving: boolean;
  nextDropMs: number;
  group: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  setTeam: (team: 0 | 1) => void;
  label: THREE.Sprite;
  labelCanvas: HTMLCanvasElement;
  labelTex: THREE.CanvasTexture;
  puddle: THREE.Mesh;
};

function drawLabel(r: Remote) {
  const g = r.labelCanvas.getContext('2d')!;
  g.clearRect(0, 0, 160, 40);
  g.fillStyle = 'rgba(8, 48, 63, 0.72)';
  g.fillRect(8, 4, 144, 32);
  g.fillStyle = r.team === 0 ? '#6cc0ff' : '#ff8a74';
  g.font = '800 22px Oxanium, Verdana, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(r.nome, 80, 21);
  r.labelTex.needsUpdate = true;
}

export function createRemotePlayers(ctx: Contexto): RemotePlayers {
  const { scene } = ctx;
  const mats = createCharacterMaterials();
  const puddleMat = new THREE.MeshBasicMaterial({ color: 0x9adcf5, transparent: true, opacity: 0.7 });
  const puddleGeo = new THREE.CircleGeometry(0.9, 14);

  const remotes: Remote[] = Array.from({ length: MAX_REMOTE }, () => {
    const rig = buildCharacter(mats);
    rig.group.visible = false;
    scene.add(rig.group);
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 160;
    labelCanvas.height = 40;
    const labelTex = new THREE.CanvasTexture(labelCanvas);
    labelTex.colorSpace = THREE.SRGBColorSpace;
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex, transparent: true }));
    label.scale.set(1.7, 0.42, 1);
    label.position.y = 2.4;
    rig.group.add(label);
    const puddle = new THREE.Mesh(puddleGeo, puddleMat);
    puddle.rotation.x = -Math.PI / 2;
    puddle.visible = false;
    scene.add(puddle);
    return {
      used: false, nome: '', team: 0 as 0 | 1,
      x: 0, y: 0, z: 0, yaw: 0, tx: 0, ty: 0, tz: 0, tyaw: 0,
      vx: 0, vz: 0, lastSyncMs: 0,
      atirando: false, derretido: false, meltT: 0, moving: false, nextDropMs: 0,
      group: rig.group, armL: rig.armL, armR: rig.armR, legL: rig.legL, legR: rig.legR,
      setTeam: rig.setTeam, label, labelCanvas, labelTex, puddle,
    };
  });

  function resetLimbs(r: Remote) {
    r.armL.rotation.x = 0;
    r.armR.rotation.x = 0;
    r.legL.rotation.x = 0;
    r.legR.rotation.x = 0;
  }

  function release(r: Remote) {
    r.used = false;
    r.nome = '';
    r.group.visible = false;
    r.puddle.visible = false;
  }

  return {
    update(lista: RoomPlayer[]) {
      const now = performance.now();
      const seen = new Set<string>();
      for (const p of lista) {
        seen.add(p.nome);
        let r = remotes.find((c) => c.used && c.nome === p.nome);
        if (!r) {
          r = remotes.find((c) => !c.used);
          if (!r) continue;
          r.used = true;
          r.nome = p.nome;
          r.team = p.team === 1 ? 1 : 0;
          r.x = p.x;
          r.y = p.y;
          r.z = p.z;
          r.yaw = p.yaw;
          r.vx = 0;
          r.vz = 0;
          r.meltT = 0;
          r.nextDropMs = 0;
          r.setTeam(r.team);
          resetLimbs(r);
          r.group.scale.set(1, 1, 1);
          r.group.visible = true;
          r.puddle.visible = false;
          drawLabel(r);
        } else {
          const gap = (now - r.lastSyncMs) / 1000;
          const jump = Math.hypot(p.x - r.tx, p.z - r.tz);
          const respawned = r.derretido && p.derretido !== true;
          if (respawned || jump > SNAP_DIST) {
            r.x = p.x;
            r.y = p.y;
            r.z = p.z;
            r.yaw = p.yaw;
            r.vx = 0;
            r.vz = 0;
          } else if (p.derretido === true || gap < MIN_SYNC_GAP_S || gap > MAX_SYNC_GAP_S) {
            r.vx = 0;
            r.vz = 0;
          } else {
            let vx = (p.x - r.tx) / gap;
            let vz = (p.z - r.tz) / gap;
            const speed = Math.hypot(vx, vz);
            const maxSpeed = ctx.cfg.jogador.vel * 1.3;
            if (speed > maxSpeed) {
              vx *= maxSpeed / speed;
              vz *= maxSpeed / speed;
            }
            r.vx = vx;
            r.vz = vz;
          }
        }
        r.lastSyncMs = now;
        r.tx = p.x;
        r.ty = p.y;
        r.tz = p.z;
        r.tyaw = p.yaw;
        r.atirando = p.atirando === true;
        r.derretido = p.derretido === true;
      }
      for (const r of remotes) {
        if (r.used && !seen.has(r.nome)) release(r);
      }
    },
    passo(dt: number, ts: number) {
      for (const r of remotes) {
        if (!r.used) continue;
        const age = Math.min(MAX_EXTRAP_S, Math.max(0, (ts - r.lastSyncMs) / 1000));
        const gx = r.tx + r.vx * age;
        const gz = r.tz + r.vz * age;
        const k = Math.min(1, dt * 10);
        const antesX = r.x;
        const antesZ = r.z;
        let stepX = (gx - r.x) * k;
        let stepZ = (gz - r.z) * k;
        const stepLen = Math.hypot(stepX, stepZ);
        const stepMax = ctx.cfg.jogador.vel * CATCHUP_SPEED_MULT * dt;
        if (stepLen > stepMax) {
          stepX *= stepMax / stepLen;
          stepZ *= stepMax / stepLen;
        }
        r.x += stepX;
        r.y += (r.ty - r.y) * k;
        r.z += stepZ;
        let dyaw = r.tyaw - r.yaw;
        while (dyaw > Math.PI) dyaw -= Math.PI * 2;
        while (dyaw < -Math.PI) dyaw += Math.PI * 2;
        r.yaw += dyaw * k;
        r.moving = Math.hypot(r.x - antesX, r.z - antesZ) / Math.max(dt, 0.001) > 0.5;
        r.group.position.set(r.x, r.y, r.z);
        r.group.rotation.y = r.yaw + Math.PI;

        if (r.derretido) {
          r.meltT = Math.min(1.2, r.meltT + dt);
          const t = Math.min(1, r.meltT / 0.45);
          r.group.scale.set(1 + t * 0.4, Math.max(0.02, 1 - t), 1 + t * 0.4);
          r.puddle.visible = true;
          r.puddle.scale.setScalar(0.3 + t * 0.9);
          r.puddle.position.set(r.x, r.y + 0.02, r.z);
          continue;
        }
        if (r.meltT > 0) {
          r.meltT = 0;
          r.group.scale.set(1, 1, 1);
          r.puddle.visible = false;
          resetLimbs(r);
        }

        const swing = !ctx.motionReduzido && r.moving ? Math.sin(ts / 140 + r.x * 3) * 0.55 : 0;
        r.legL.rotation.x = swing;
        r.legR.rotation.x = -swing;
        r.armL.rotation.x = -swing;
        r.armR.rotation.x = r.atirando ? -1.25 : swing;

        if (r.atirando && ts >= r.nextDropMs) {
          r.nextDropMs = ts + 140;
          const dx = -Math.sin(r.yaw);
          const dz = -Math.cos(r.yaw);
          ctx.agua.atirarCosmetico(r.x + dx * 0.45, r.y + 1.35, r.z + dz * 0.45, dx, -0.02, dz);
        }
      }
    },
    hitTest(x: number, y: number, z: number) {
      for (const r of remotes) {
        if (!r.used || r.derretido || r.team === ctx.estado.team) continue;
        const dx = x - r.x;
        const dz = z - r.z;
        const dy = y - r.y;
        if (dx * dx + dz * dz < 0.55 * 0.55 * 1.3 && dy > 0 && dy < 2.1) return r.nome;
      }
      return null;
    },
    positionOf(nome: string) {
      const r = remotes.find((c) => c.used && c.nome === nome);
      return r ? { x: r.x, y: r.y, z: r.z } : null;
    },
    clear() {
      for (const r of remotes) release(r);
    },
  };
}
