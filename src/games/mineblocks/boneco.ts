import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Avatars, Ctx, RemotePlayer } from './types';

interface LiveAvatar {
  group: THREE.Group;
  nametag: THREE.Sprite;
  target: { x: number; y: number; z: number; yaw: number };
  yaw: number;
}

function nameHue(nome: string): number {
  let h = 0;
  for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function criarBonecos(ctx: Ctx): Avatars {
  const alive = new Map<string, LiveAvatar>();
  const material = new THREE.MeshBasicMaterial({ vertexColors: true });

  function part(w: number, h: number, d: number, x: number, y: number, z: number, color: THREE.Color): THREE.BufferGeometry {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(x, y, z);
    const n = g.attributes.position.count;
    const colors = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  }

  function buildBody(nome: string): THREE.Group {
    const hue = nameHue(nome);
    const shirt = new THREE.Color().setHSL(hue / 360, 0.62, 0.52);
    const pants = new THREE.Color().setHSL(hue / 360, 0.45, 0.28);
    const skin = new THREE.Color('#e8b98f');
    const eye = new THREE.Color('#26262e');

    const parts = [
      part(0.22, 0.72, 0.22, -0.14, 0.36, 0, pants),
      part(0.22, 0.72, 0.22, 0.14, 0.36, 0, pants),
      part(0.52, 0.62, 0.3, 0, 1.03, 0, shirt),
      part(0.16, 0.56, 0.2, -0.34, 1.06, 0, shirt),
      part(0.16, 0.56, 0.2, 0.34, 1.06, 0, shirt),
      part(0.46, 0.46, 0.46, 0, 1.57, 0, skin),
      part(0.08, 0.1, 0.02, -0.11, 1.62, -0.235, eye),
      part(0.08, 0.1, 0.02, 0.11, 1.62, -0.235, eye),
    ];
    const geo = mergeGeometries(parts);
    parts.forEach((p) => p.dispose());
    const mesh = new THREE.Mesh(geo, material);
    const group = new THREE.Group();
    group.add(mesh);
    return group;
  }

  function buildNametag(nome: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const c = canvas.getContext('2d')!;
    c.font = '800 34px Oxanium, Verdana, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineWidth = 7;
    c.strokeStyle = 'rgba(10, 12, 24, 0.9)';
    c.strokeText(nome, 128, 34);
    c.fillStyle = '#fff';
    c.fillText(nome, 128, 34);
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true, depthWrite: false }));
    sprite.scale.set(1.7, 0.42, 1);
    sprite.position.y = 2.14;
    return sprite;
  }

  function spawn(j: RemotePlayer): LiveAvatar {
    const group = buildBody(j.nome);
    const nametag = buildNametag(j.nome);
    group.add(nametag);
    group.position.set(j.x, j.y, j.z);
    group.rotation.y = j.yaw;
    ctx.scene.add(group);
    return { group, nametag, target: { x: j.x, y: j.y, z: j.z, yaw: j.yaw }, yaw: j.yaw };
  }

  function dispose(b: LiveAvatar) {
    ctx.scene.remove(b.group);
    const mesh = b.group.children[0] as THREE.Mesh;
    mesh.geometry.dispose();
    b.nametag.material.map?.dispose();
    b.nametag.material.dispose();
  }

  return {
    updateList(players) {
      const present = new Set<string>();
      for (const j of players) {
        if (!j || typeof j.nome !== 'string') continue;
        present.add(j.nome);
        const live = alive.get(j.nome);
        if (live) {
          live.target.x = j.x;
          live.target.y = j.y;
          live.target.z = j.z;
          live.target.yaw = j.yaw;
        } else {
          alive.set(j.nome, spawn(j));
        }
      }
      for (const [nome, b] of alive) {
        if (!present.has(nome)) {
          dispose(b);
          alive.delete(nome);
        }
      }
    },

    step(dt) {
      if (!alive.size) return;
      const k = 1 - Math.exp(-dt * 5);
      for (const b of alive.values()) {
        const p = b.group.position;
        const dx = b.target.x - p.x;
        const dy = b.target.y - p.y;
        const dz = b.target.z - p.z;
        if (dx * dx + dy * dy + dz * dz > 64) {
          p.set(b.target.x, b.target.y, b.target.z);
        } else {
          p.x += dx * k;
          p.y += dy * k;
          p.z += dz * k;
        }
        let dyaw = b.target.yaw - b.yaw;
        dyaw = ((dyaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
        b.yaw += dyaw * k;
        b.group.rotation.y = b.yaw;
        const cx = ctx.player.x - p.x;
        const cz = ctx.player.z - p.z;
        b.nametag.visible = cx * cx + cz * cz < 900;
      }
    },

    clear() {
      for (const b of alive.values()) dispose(b);
      alive.clear();
    },

    count: () => alive.size,
    names: () => Array.from(alive.keys()),
    list: () => Array.from(alive, ([nome, b]) => ({
      nome,
      x: b.group.position.x,
      y: b.group.position.y,
      z: b.group.position.z,
      yaw: b.yaw,
      pitch: 0,
    })),
  };
}
