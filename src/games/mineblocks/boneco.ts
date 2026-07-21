// Bonequinhos dos colegas da sala: low-poly (cabeça+corpo+braços+pernas
// mesclados numa geometria única com vertex colors = 1 draw call) + um
// Sprite de nome. MeshBasicMaterial — a cena não tem luz (SwiftShader).
// A posição vem do poll (~1,2s): interpolação exponencial persegue o
// alvo; salto grande (>8 blocos) teleporta em vez de deslizar.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Avatars, Ctx, RemotePlayer } from './types';

interface BonecoVivo {
  grupo: THREE.Group;
  nametag: THREE.Sprite;
  alvo: { x: number; y: number; z: number; yaw: number };
  yaw: number;
}

// cor estável a partir do nome — a turma inteira fica colorida
function corDoNome(nome: string): number {
  let h = 0;
  for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function criarBonecos(ctx: Ctx): Avatars {
  const vivos = new Map<string, BonecoVivo>();
  const material = new THREE.MeshBasicMaterial({ vertexColors: true });

  // caixa colorida com origem transladada — tudo mescla numa geometria só
  function parte(w: number, h: number, d: number, x: number, y: number, z: number, cor: THREE.Color): THREE.BufferGeometry {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(x, y, z);
    const n = g.attributes.position.count;
    const cores = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      cores[i * 3] = cor.r;
      cores[i * 3 + 1] = cor.g;
      cores[i * 3 + 2] = cor.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(cores, 3));
    return g;
  }

  function criarCorpo(nome: string): THREE.Group {
    const hue = corDoNome(nome);
    const camisa = new THREE.Color().setHSL(hue / 360, 0.62, 0.52);
    const calca = new THREE.Color().setHSL(hue / 360, 0.45, 0.28);
    const pele = new THREE.Color('#e8b98f');
    const olho = new THREE.Color('#26262e');

    // origem no PÉ (a posição da rede é o pé do jogador, igual jogador.y)
    const partes = [
      parte(0.22, 0.72, 0.22, -0.14, 0.36, 0, calca), // perna esq
      parte(0.22, 0.72, 0.22, 0.14, 0.36, 0, calca), // perna dir
      parte(0.52, 0.62, 0.3, 0, 1.03, 0, camisa), // corpo
      parte(0.16, 0.56, 0.2, -0.34, 1.06, 0, camisa), // braço esq
      parte(0.16, 0.56, 0.2, 0.34, 1.06, 0, camisa), // braço dir
      parte(0.46, 0.46, 0.46, 0, 1.57, 0, pele), // cabeça
      // olhinhos na frente (-Z = direção do olhar com yaw 0)
      parte(0.08, 0.1, 0.02, -0.11, 1.62, -0.235, olho),
      parte(0.08, 0.1, 0.02, 0.11, 1.62, -0.235, olho),
    ];
    const geo = mergeGeometries(partes);
    partes.forEach((p) => p.dispose());
    const mesh = new THREE.Mesh(geo, material);
    const grupo = new THREE.Group();
    grupo.add(mesh);
    return grupo;
  }

  function criarNametag(nome: string): THREE.Sprite {
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
    // depthWrite false: o retângulo transparente do sprite não pode
    // "furar" a água (que desenha depois, com blend)
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true, depthWrite: false }));
    sprite.scale.set(1.7, 0.42, 1);
    sprite.position.y = 2.14;
    return sprite;
  }

  function nascer(j: RemotePlayer): BonecoVivo {
    const grupo = criarCorpo(j.nome);
    const nametag = criarNametag(j.nome);
    grupo.add(nametag);
    grupo.position.set(j.x, j.y, j.z);
    grupo.rotation.y = j.yaw;
    ctx.scene.add(grupo);
    return { grupo, nametag, alvo: { x: j.x, y: j.y, z: j.z, yaw: j.yaw }, yaw: j.yaw };
  }

  function despedir(b: BonecoVivo) {
    ctx.scene.remove(b.grupo);
    const mesh = b.grupo.children[0] as THREE.Mesh;
    mesh.geometry.dispose();
    b.nametag.material.map?.dispose();
    b.nametag.material.dispose();
  }

  return {
    updateList(jogadores) {
      const presentes = new Set<string>();
      for (const j of jogadores) {
        if (!j || typeof j.nome !== 'string') continue;
        presentes.add(j.nome);
        const vivo = vivos.get(j.nome);
        if (vivo) {
          vivo.alvo.x = j.x;
          vivo.alvo.y = j.y;
          vivo.alvo.z = j.z;
          vivo.alvo.yaw = j.yaw;
        } else {
          vivos.set(j.nome, nascer(j));
        }
      }
      for (const [nome, b] of vivos) {
        if (!presentes.has(nome)) {
          despedir(b);
          vivos.delete(nome);
        }
      }
    },

    step(dt) {
      if (!vivos.size) return;
      const k = 1 - Math.exp(-dt * 5); // perseguição macia do alvo do poll
      for (const b of vivos.values()) {
        const p = b.grupo.position;
        const dx = b.alvo.x - p.x;
        const dy = b.alvo.y - p.y;
        const dz = b.alvo.z - p.z;
        if (dx * dx + dy * dy + dz * dz > 64) {
          // longe demais (teleporte/reset): pula em vez de deslizar
          p.set(b.alvo.x, b.alvo.y, b.alvo.z);
        } else {
          p.x += dx * k;
          p.y += dy * k;
          p.z += dz * k;
        }
        // yaw pelo arco mais curto (senão o boneco gira 350° pro lado errado)
        let dyaw = b.alvo.yaw - b.yaw;
        dyaw = ((dyaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
        b.yaw += dyaw * k;
        b.grupo.rotation.y = b.yaw;
        // nome some de longe (30 blocos): menos poluição, menos overdraw
        const cx = ctx.player.x - p.x;
        const cz = ctx.player.z - p.z;
        b.nametag.visible = cx * cx + cz * cz < 900;
      }
    },

    clear() {
      for (const b of vivos.values()) despedir(b);
      vivos.clear();
    },

    count: () => vivos.size,
    names: () => Array.from(vivos.keys()),
  };
}
