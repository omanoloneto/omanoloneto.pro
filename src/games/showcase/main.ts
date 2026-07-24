import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

function noiseCanvas(size: number, base: [number, number, number], spread: number, seed = 1): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const img = g.createImageData(size, size);
  let s = seed;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  for (let i = 0; i < size * size; i++) {
    const n = (rnd() - 0.5) * spread;
    img.data[i * 4] = Math.max(0, Math.min(255, base[0] + n));
    img.data[i * 4 + 1] = Math.max(0, Math.min(255, base[1] + n));
    img.data[i * 4 + 2] = Math.max(0, Math.min(255, base[2] + n));
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(${rnd() < 0.5 ? '20,20,22' : '120,120,124'},${0.03 + rnd() * 0.05})`;
    g.beginPath();
    g.arc(rnd() * size, rnd() * size, 8 + rnd() * 40, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

function normalFromHeight(src: HTMLCanvasElement, strength: number): THREE.CanvasTexture {
  const size = src.width;
  const sg = src.getContext('2d')!;
  const h = sg.getImageData(0, 0, size, size).data;
  const out = document.createElement('canvas');
  out.width = out.height = size;
  const og = out.getContext('2d')!;
  const img = og.createImageData(size, size);
  const at = (x: number, y: number) => h[(((y + size) % size) * size + ((x + size) % size)) * 4] / 255;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x - 1, y) - at(x + 1, y)) * strength;
      const dy = (at(x, y - 1) - at(x, y + 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      img.data[i] = ((dx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = (1 / len) * 255;
      img.data[i + 3] = 255;
    }
  }
  og.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(out);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function iniciarShowcase() {
  const host = document.querySelector('[data-cena]') as HTMLElement;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.62;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(new THREE.Color(0xcdddea), 52, 185);
  const camera = new THREE.PerspectiveCamera(38, host.clientWidth / host.clientHeight, 0.1, 2000);
  camera.position.set(7.5, 3.4, 8);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.target.set(0, 0.8, 0);
  controls.minDistance = 4.5;
  controls.maxDistance = 30;
  controls.maxPolarAngle = Math.PI / 2 - 0.03;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.6;

  const sky = new Sky();
  sky.scale.setScalar(6000);
  scene.add(sky);
  const su = sky.material.uniforms;
  su.turbidity.value = 3.2;
  su.rayleigh.value = 0.9;
  su.mieCoefficient.value = 0.003;
  su.mieDirectionalG.value = 0.8;
  const elev = 22;
  const azim = 135;
  const phi = THREE.MathUtils.degToRad(90 - elev);
  const theta = THREE.MathUtils.degToRad(azim);
  const sunDir = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
  su.sunPosition.value.copy(sunDir);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const sun = new THREE.DirectionalLight(0xfff3e0, 2.1);
  sun.position.copy(sunDir).multiplyScalar(60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 160;
  const sc = sun.shadow.camera as THREE.OrthographicCamera;
  sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30;
  sun.shadow.bias = -0.0002;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xbfd8ff, 0x33422a, 0.5));

  buildRoad(scene);
  const carro = buildCar(scene);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const gtao = new GTAOPass(scene, camera, host.clientWidth, host.clientHeight);
  gtao.output = GTAOPass.OUTPUT.Default;
  (gtao as unknown as { blendIntensity: number }).blendIntensity = 0.55;
  composer.addPass(gtao);
  const bloom = new UnrealBloomPass(new THREE.Vector2(host.clientWidth, host.clientHeight), 0.16, 0.5, 1.55);
  composer.addPass(bloom);
  composer.addPass(new SMAAPass(host.clientWidth * renderer.getPixelRatio(), host.clientHeight * renderer.getPixelRatio()));
  composer.addPass(new OutputPass());

  function resize() {
    const w = host.clientWidth;
    const h = host.clientHeight;
    renderer.setSize(w, h);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  let last = performance.now();
  function loop() {
    requestAnimationFrame(loop);
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    for (const w of carro.rodas) w.rotation.x -= dt * 3.5;
    controls.update();
    composer.render();
  }
  loop();
}

function buildRoad(scene: THREE.Scene) {
  const len = 140;
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(200, len),
    new THREE.MeshStandardMaterial({ color: 0x3f6b34, roughness: 1 }),
  );
  const grassTex = new THREE.CanvasTexture(noiseCanvas(256, [70, 120, 58], 40, 7));
  grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping;
  grassTex.repeat.set(40, 40);
  (grass.material as THREE.MeshStandardMaterial).map = grassTex;
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.02;
  grass.receiveShadow = true;
  scene.add(grass);

  const asfaltoAlb = noiseCanvas(512, [42, 43, 47], 26, 3);
  const albTex = new THREE.CanvasTexture(asfaltoAlb);
  albTex.wrapS = albTex.wrapT = THREE.RepeatWrapping;
  albTex.repeat.set(3, 26);
  albTex.colorSpace = THREE.SRGBColorSpace;
  const roughCanvas = noiseCanvas(512, [150, 150, 150], 90, 5);
  const roughTex = new THREE.CanvasTexture(roughCanvas);
  roughTex.wrapS = roughTex.wrapT = THREE.RepeatWrapping;
  roughTex.repeat.set(3, 26);
  const normTex = normalFromHeight(noiseCanvas(512, [128, 128, 128], 120, 9), 2.2);
  normTex.repeat.set(6, 52);

  const roadW = 11;
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(roadW, len),
    new THREE.MeshStandardMaterial({ color: 0xffffff, map: albTex, roughnessMap: roughTex, roughness: 0.92, metalness: 0, normalMap: normTex, normalScale: new THREE.Vector2(0.6, 0.6) }),
  );
  road.rotation.x = -Math.PI / 2;
  road.receiveShadow = true;
  scene.add(road);

  const linhaMat = new THREE.MeshStandardMaterial({ color: 0xf3f3f0, roughness: 0.5, emissive: 0x222220, emissiveIntensity: 0.25 });
  const amareloMat = new THREE.MeshStandardMaterial({ color: 0xf2c21a, roughness: 0.5, emissive: 0x3a2c00, emissiveIntensity: 0.3 });
  const faixaGeo = new THREE.PlaneGeometry(0.16, len);
  for (const x of [-roadW / 2 + 0.5, roadW / 2 - 0.5]) {
    const l = new THREE.Mesh(faixaGeo, linhaMat);
    l.rotation.x = -Math.PI / 2;
    l.position.set(x, 0.015, 0);
    scene.add(l);
  }
  const dashGeo = new THREE.PlaneGeometry(0.18, 3);
  for (let z = -len / 2 + 2; z < len / 2; z += 6) {
    const d = new THREE.Mesh(dashGeo, amareloMat);
    d.rotation.x = -Math.PI / 2;
    d.position.set(0, 0.016, z);
    scene.add(d);
  }

  const concreto = new THREE.MeshStandardMaterial({ color: 0xb9bcc0, roughness: 0.85 });
  for (const s of [-1, 1]) {
    const meio = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.32, len, 2, 0.06), concreto);
    meio.position.set(s * (roadW / 2 + 0.25), 0.16, 0);
    meio.castShadow = meio.receiveShadow = true;
    scene.add(meio);
    const calc = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, len), concreto);
    calc.position.set(s * (roadW / 2 + 0.5 + 1.5), 0.15, 0);
    calc.receiveShadow = true;
    scene.add(calc);
  }
}

function buildCar(scene: THREE.Scene) {
  const grupo = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color: 0xb61f2e, metalness: 0.65, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.3 });
  const vidro = new THREE.MeshPhysicalMaterial({ color: 0x0c1018, metalness: 0.2, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.4 });
  const cromo = new THREE.MeshStandardMaterial({ color: 0xf0f2f5, metalness: 1, roughness: 0.08, envMapIntensity: 1.5 });
  const preto = new THREE.MeshStandardMaterial({ color: 0x14151a, metalness: 0.4, roughness: 0.5 });
  const borracha = new THREE.MeshStandardMaterial({ color: 0x0b0b0d, roughness: 0.9, metalness: 0 });
  const aro = new THREE.MeshStandardMaterial({ color: 0xd7dbe0, metalness: 1, roughness: 0.24, envMapIntensity: 1.4 });
  const luzF = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4d0, emissiveIntensity: 1.2, roughness: 0.2 });
  const luzT = new THREE.MeshStandardMaterial({ color: 0xff2b2b, emissive: 0xff1010, emissiveIntensity: 1.4, roughness: 0.2 });

  const corpo = new THREE.Mesh(new RoundedBoxGeometry(2.0, 0.82, 4.5, 4, 0.34), paint);
  corpo.position.y = 0.78;
  corpo.castShadow = corpo.receiveShadow = true;
  grupo.add(corpo);

  const cabine = new THREE.Mesh(new RoundedBoxGeometry(1.68, 0.58, 2.0, 5, 0.34), paint);
  cabine.position.set(0, 1.26, -0.2);
  cabine.castShadow = true;
  grupo.add(cabine);

  const estufa = new THREE.Mesh(new RoundedBoxGeometry(1.58, 0.52, 1.9, 5, 0.36), vidro);
  estufa.position.set(0, 1.3, -0.2);
  grupo.add(estufa);

  for (const s of [-1, 1]) {
    const faixa = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 3.4), cromo);
    faixa.position.set(s * 1.0, 0.78, -0.1);
    grupo.add(faixa);
    const retro = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.2, 0.34, 2, 0.06), preto);
    retro.position.set(s * 1.05, 1.35, 0.85);
    grupo.add(retro);
  }
  const paraF = new THREE.Mesh(new RoundedBoxGeometry(2.02, 0.24, 0.3, 3, 0.1), cromo);
  paraF.position.set(0, 0.62, 2.28);
  grupo.add(paraF);
  const paraT = paraF.clone(); paraT.position.z = -2.28; grupo.add(paraT);
  const grade = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 0.08), preto);
  grade.position.set(0, 0.82, 2.32);
  grupo.add(grade);

  for (const s of [-1, 1]) {
    const f = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 20), luzF);
    f.rotation.x = Math.PI / 2;
    f.position.set(s * 0.62, 0.92, 2.33);
    grupo.add(f);
    const t = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.24, 0.08, 2, 0.05), luzT);
    t.position.set(s * 0.66, 0.92, -2.32);
    grupo.add(t);
  }

  const rodas: THREE.Group[] = [];
  const rGeoP = new THREE.CylinderGeometry(0.5, 0.5, 0.34, 28);
  const rGeoA = new THREE.CylinderGeometry(0.33, 0.33, 0.36, 24);
  const raioGeo = new THREE.BoxGeometry(0.06, 0.5, 0.06);
  for (const sx of [-1, 1]) {
    for (const sz of [1, -1]) {
      const w = new THREE.Group();
      const pneu = new THREE.Mesh(rGeoP, borracha);
      pneu.rotation.z = Math.PI / 2;
      pneu.castShadow = true;
      w.add(pneu);
      const disco = new THREE.Mesh(rGeoA, aro);
      disco.rotation.z = Math.PI / 2;
      w.add(disco);
      for (let i = 0; i < 5; i++) {
        const r = new THREE.Mesh(raioGeo, aro);
        r.rotation.x = (i / 5) * Math.PI * 2;
        r.position.x = sx * 0.19;
        w.add(r);
      }
      w.position.set(sx * 1.02, 0.5, sz * 1.5);
      grupo.add(w);
      rodas.push(w);
    }
  }

  const alturaSombra = document.createElement('canvas');
  alturaSombra.width = alturaSombra.height = 256;
  const sg = alturaSombra.getContext('2d')!;
  const grad = sg.createRadialGradient(128, 128, 20, 128, 128, 128);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  sg.fillStyle = grad;
  sg.fillRect(0, 0, 256, 256);
  const sombra = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 5.8), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(alturaSombra), transparent: true, depthWrite: false }));
  sombra.rotation.x = -Math.PI / 2;
  sombra.position.y = 0.02;
  grupo.add(sombra);

  scene.add(grupo);
  return { grupo, rodas };
}
