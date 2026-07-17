import * as THREE from 'three';
import { buildCharacter, createCharacterMaterials } from './models';
import type { Contexto, RemotePlayers, RoomPlayer } from './tipos';

const MAX_REMOTE = 12;

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
  teamMeshes: THREE.Mesh[];
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
      atirando: false, derretido: false, meltT: 0, moving: false, nextDropMs: 0,
      group: rig.group, armL: rig.armL, armR: rig.armR, legL: rig.legL, legR: rig.legR,
      teamMeshes: rig.teamMeshes, label, labelCanvas, labelTex, puddle,
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
          r.meltT = 0;
          r.nextDropMs = 0;
          const teamMat = r.team === 0 ? mats.trunksBlue : mats.trunksRed;
          for (const mesh of r.teamMeshes) mesh.material = teamMat;
          resetLimbs(r);
          r.group.scale.set(1, 1, 1);
          r.group.visible = true;
          r.puddle.visible = false;
          drawLabel(r);
        }
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
        const k = Math.min(1, dt * 8);
        const antesX = r.x;
        const antesZ = r.z;
        r.x += (r.tx - r.x) * k;
        r.y += (r.ty - r.y) * k;
        r.z += (r.tz - r.z) * k;
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
