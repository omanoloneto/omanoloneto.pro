import * as THREE from 'three';

let gradiente: THREE.DataTexture | null = null;

function rampa(): THREE.DataTexture {
  if (gradiente) return gradiente;
  const tons = new Uint8Array([80, 150, 220, 255]);
  const tex = new THREE.DataTexture(tons, tons.length, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  gradiente = tex;
  return tex;
}

export function criarToon(cor: THREE.ColorRepresentation): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({ color: cor, gradientMap: rampa() });
}

export function toonEmissivo(cor: THREE.ColorRepresentation): THREE.MeshToonMaterial {
  const m = new THREE.MeshToonMaterial({ color: cor, gradientMap: rampa() });
  m.emissive = new THREE.Color(cor).multiplyScalar(0.5);
  return m;
}
