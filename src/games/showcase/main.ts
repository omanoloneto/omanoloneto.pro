import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Reflector } from 'three/addons/objects/Reflector.js';

const MODELO_CARRO = '/class/models/toycar.glb';

const ColorGradeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    resolution: { value: new THREE.Vector2(1, 1) },
    time: { value: 0 },
    lift: { value: new THREE.Vector3(-0.012, 0.0, 0.02) },
    gamma: { value: new THREE.Vector3(1.06, 1.0, 0.95) },
    gain: { value: new THREE.Vector3(1.06, 1.0, 0.94) },
    shadowTint: { value: new THREE.Vector3(0.35, 0.72, 0.85) },
    highlightTint: { value: new THREE.Vector3(1.0, 0.66, 0.32) },
    tintStrength: { value: 0.34 },
    contrast: { value: 1.16 },
    saturation: { value: 1.12 },
    vignette: { value: 0.5 },
    grain: { value: 0.045 },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: [
    'uniform sampler2D tDiffuse;',
    'uniform vec2 resolution; uniform float time;',
    'uniform vec3 lift, gamma, gain, shadowTint, highlightTint;',
    'uniform float tintStrength, contrast, saturation, vignette, grain;',
    'varying vec2 vUv;',
    'float luma(vec3 c){ return dot(c, vec3(0.2126,0.7152,0.0722)); }',
    'void main(){',
    '  vec4 tex = texture2D(tDiffuse, vUv);',
    '  vec3 col = tex.rgb * gain + lift;',
    '  col = pow(max(col, 0.0), 1.0 / gamma);',
    '  col = (col - 0.5) * contrast + 0.5;',
    '  float l = luma(clamp(col, 0.0, 1.0));',
    '  vec3 sh = mix(vec3(1.0), shadowTint, (1.0 - smoothstep(0.0, 0.55, l)) * tintStrength);',
    '  vec3 hl = mix(vec3(1.0), highlightTint, smoothstep(0.45, 1.0, l) * tintStrength);',
    '  col *= sh * hl;',
    '  col = mix(vec3(luma(col)), col, saturation);',
    '  col = clamp(col, 0.0, 1.0);',
    '  vec2 d = (vUv - 0.5) * vec2(resolution.x / resolution.y, 1.0);',
    '  float vig = smoothstep(0.55, 1.1, length(d));',
    '  col *= mix(1.0, vignette, vig);',
    '  float n = fract(sin(dot(vUv * resolution + time, vec2(12.9898, 78.233))) * 43758.5453);',
    '  col += (n - 0.5) * grain;',
    '  gl_FragColor = vec4(col, tex.a);',
    '}',
  ].join('\n'),
};

function haloSprite(scale: number): THREE.Sprite {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(64, 64, 2, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,190,110,0.5)');
  gr.addColorStop(0.35, 'rgba(255,140,50,0.16)');
  gr.addColorStop(1, 'rgba(255,120,30,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
  s.scale.setScalar(scale);
  return s;
}

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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.54;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(new THREE.Color(0x0a1420), 40, 150);
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
  su.turbidity.value = 10;
  su.rayleigh.value = 2.5;
  su.mieCoefficient.value = 0.005;
  su.mieDirectionalG.value = 0.85;
  const elev = 2.5;
  const azim = 135;
  const phi = THREE.MathUtils.degToRad(90 - elev);
  const theta = THREE.MathUtils.degToRad(azim);
  const sunDir = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
  su.sunPosition.value.copy(sunDir);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envSky = new Sky();
  envSky.scale.setScalar(100);
  const eu = envSky.material.uniforms;
  eu.turbidity.value = 10;
  eu.rayleigh.value = 2.5;
  eu.mieCoefficient.value = 0.005;
  eu.mieDirectionalG.value = 0.85;
  eu.sunPosition.value.copy(sunDir);
  envScene.add(envSky);
  scene.environment = pmrem.fromScene(envScene, 0.04).texture;

  const sun = new THREE.DirectionalLight(0xff7a30, 2.0);
  sun.position.copy(sunDir).multiplyScalar(60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 200;
  const sc = sun.shadow.camera as THREE.OrthographicCamera;
  sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45;
  sun.shadow.bias = -0.0002;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0x223a55, 0x140a06, 0.30));

  const { mirror } = buildRoad(scene, renderer, host);
  buildSodiumLights(scene);
  buildSkyline(scene);
  const fallback = buildCar(scene);
  let rodas = fallback.rodas;
  carregarModelo(scene, () => {
    scene.remove(fallback.grupo);
    fallback.grupo.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[];
        (Array.isArray(mat) ? mat : [mat]).forEach((x) => x.dispose());
      }
    });
    rodas = [];
  });

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const gtao = new GTAOPass(scene, camera, host.clientWidth, host.clientHeight);
  gtao.output = GTAOPass.OUTPUT.Default;
  (gtao as unknown as { blendIntensity: number }).blendIntensity = 0.5;
  composer.addPass(gtao);
  const bloom = new UnrealBloomPass(new THREE.Vector2(host.clientWidth, host.clientHeight), 0.32, 0.6, 0.92);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass(ColorGradeShader);
  grade.uniforms.resolution.value.set(host.clientWidth, host.clientHeight);
  composer.addPass(grade);
  composer.addPass(new SMAAPass(host.clientWidth * renderer.getPixelRatio(), host.clientHeight * renderer.getPixelRatio()));

  function resize() {
    const w = host.clientWidth;
    const h = host.clientHeight;
    renderer.setSize(w, h);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    grade.uniforms.resolution.value.set(w, h);
    const rdpr = Math.min(renderer.getPixelRatio(), 1.5);
    mirror.getRenderTarget().setSize(Math.max(2, Math.floor(w * rdpr)), Math.max(2, Math.floor(h * rdpr)));
  }
  window.addEventListener('resize', resize);
  resize();

  let last = performance.now();
  function loop() {
    requestAnimationFrame(loop);
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    for (const w of rodas) w.rotation.x -= dt * 3.5;
    grade.uniforms.time.value = now / 1000;
    controls.update();
    composer.render();
  }
  loop();
}

function sombraContato(w: number, d: number): THREE.Mesh {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(128, 128, 16, 128, 128, 128);
  grad.addColorStop(0, 'rgba(0,0,0,0.5)');
  grad.addColorStop(0.7, 'rgba(0,0,0,0.22)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.018;
  m.renderOrder = 2;
  return m;
}

function carregarModelo(scene: THREE.Scene, onLoad: () => void) {
  const loader = new GLTFLoader();
  loader.load(
    MODELO_CARRO,
    (gltf) => {
      const modelo = gltf.scene;
      const lixo: THREE.Object3D[] = [];
      modelo.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh && /fabric|cloth|base|pano/i.test(m.name + '|' + (m.material as THREE.Material)?.name)) lixo.push(o);
      });
      lixo.forEach((o) => o.parent?.remove(o));
      modelo.updateWorldMatrix(true, true);
      const box = new THREE.Box3().setFromObject(modelo);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      const escala = 4.4 / Math.max(size.x, size.z);
      modelo.position.sub(center);
      modelo.position.y += size.y / 2;
      modelo.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.castShadow = true;
          m.receiveShadow = false;
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          for (const mm of mats) {
            const sm = mm as THREE.MeshStandardMaterial;
            if ('envMapIntensity' in sm) sm.envMapIntensity = 0.9;
          }
        }
      });
      const wrap = new THREE.Group();
      wrap.add(modelo);
      wrap.scale.setScalar(escala);
      wrap.position.y = 0.02;
      wrap.rotation.y = Math.PI;
      scene.add(wrap);
      scene.add(sombraContato(size.x * escala * 1.25, size.z * escala * 1.2));
      onLoad();
    },
    undefined,
    (err) => console.warn('showcase: falha ao carregar modelo', err),
  );
}

function buildRoad(scene: THREE.Scene, renderer: THREE.WebGLRenderer, host: HTMLElement) {
  const len = 140;
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(200, len),
    new THREE.MeshStandardMaterial({ color: 0x16281a, roughness: 1 }),
  );
  const grassTex = new THREE.CanvasTexture(noiseCanvas(256, [26, 46, 28], 26, 7));
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

  const dpr = Math.min(renderer.getPixelRatio(), 1.5);
  const mirror = new Reflector(new THREE.PlaneGeometry(roadW, len), {
    clipBias: 0.003,
    textureWidth: Math.max(2, Math.floor(host.clientWidth * dpr)),
    textureHeight: Math.max(2, Math.floor(host.clientHeight * dpr)),
    color: 0x0a0e14,
  });
  mirror.rotation.x = -Math.PI / 2;
  mirror.position.y = 0.006;
  scene.add(mirror);

  const puddle = new THREE.CanvasTexture(noiseCanvas(512, [90, 90, 90], 150, 11));
  puddle.wrapS = puddle.wrapT = THREE.RepeatWrapping;
  puddle.repeat.set(3, 26);
  const wet = new THREE.Mesh(
    new THREE.PlaneGeometry(roadW, len),
    new THREE.MeshStandardMaterial({ color: 0x05070a, roughness: 0.52, metalness: 0, transparent: true, opacity: 0.5, depthWrite: false, alphaMap: puddle, normalMap: normTex, normalScale: new THREE.Vector2(0.22, 0.22) }),
  );
  wet.rotation.x = -Math.PI / 2;
  wet.position.y = 0.007;
  wet.renderOrder = 1;
  scene.add(wet);

  const linhaMat = new THREE.MeshStandardMaterial({ color: 0xf3f3f0, roughness: 0.5, emissive: 0x222220, emissiveIntensity: 0.15 });
  const amareloMat = new THREE.MeshStandardMaterial({ color: 0xf2c21a, roughness: 0.5, emissive: 0x3a2c00, emissiveIntensity: 0.2 });
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

  return { mirror };
}

function buildSodiumLights(scene: THREE.Scene) {
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x23262c, roughness: 0.8, metalness: 0.2 });
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x160a00, emissive: 0xff8a2e, emissiveIntensity: 2.1, roughness: 0.5 });
  const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 4.6, 10);
  const armGeo = new THREE.BoxGeometry(1.2, 0.12, 0.12);
  const lampGeo = new THREE.BoxGeometry(0.5, 0.2, 0.7);
  for (const sx of [-1, 1]) {
    for (let z = -60; z <= 60; z += 15) {
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(sx * 7.6, 2.3, z);
      pole.castShadow = true;
      scene.add(pole);
      const arm = new THREE.Mesh(armGeo, poleMat);
      arm.position.set(sx * 7.0, 4.55, z);
      scene.add(arm);
      const lamp = new THREE.Mesh(lampGeo, lampMat);
      lamp.position.set(sx * 6.7, 4.42, z);
      scene.add(lamp);
      const halo = haloSprite(1.4);
      halo.position.set(sx * 6.7, 4.42, z);
      scene.add(halo);
      if (z > -20 && z < 20 && z !== 0) {
        const pl = new THREE.PointLight(0xff7a1e, 2.6, 14, 2);
        pl.position.set(sx * 6.7, 4.3, z);
        scene.add(pl);
      }
    }
  }
}

function buildSkyline(scene: THREE.Scene) {
  let seed = 91;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const win = document.createElement('canvas');
  win.width = win.height = 128;
  const wg = win.getContext('2d')!;
  wg.fillStyle = '#05070c';
  wg.fillRect(0, 0, 128, 128);
  for (let gx = 0; gx < 16; gx++) {
    for (let gy = 0; gy < 16; gy++) {
      const on = rnd();
      if (on < 0.5) continue;
      wg.fillStyle = on < 0.8 ? 'rgba(255,170,80,0.95)' : 'rgba(200,220,255,0.85)';
      wg.fillRect(gx * 8 + 2, gy * 8 + 2, 4, 5);
    }
  }
  const winTex = new THREE.CanvasTexture(win);
  const bMat = new THREE.MeshStandardMaterial({ color: 0x070a12, roughness: 1, emissive: 0xffa64d, emissiveIntensity: 0.9, emissiveMap: winTex });
  let x = -100;
  while (x < 100) {
    const w = 9 + rnd() * 13;
    const h = 9 + rnd() * 17;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 10), bMat);
    b.position.set(x + w / 2, h / 2, -96 - rnd() * 14);
    scene.add(b);
    x += w + 2 + rnd() * 5;
  }

  const estruturaMat = new THREE.MeshStandardMaterial({ color: 0x0b0f18, roughness: 1 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(150, 1.4, 6), estruturaMat);
  deck.position.set(0, 6.2, -70);
  scene.add(deck);
  const lampRowMat = new THREE.MeshStandardMaterial({ color: 0x160c00, emissive: 0xffb455, emissiveIntensity: 3.2, roughness: 0.6 });
  const lampRowGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  for (let i = -72; i <= 72; i += 6) {
    const q = new THREE.Mesh(lampRowGeo, lampRowMat);
    q.position.set(i, 7.1, -70);
    scene.add(q);
  }
  for (const px of [-46, -16, 18, 48]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.6, 12, 1.6), estruturaMat);
    pillar.position.set(px, 3, -70);
    scene.add(pillar);
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
