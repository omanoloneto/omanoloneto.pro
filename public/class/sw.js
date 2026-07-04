/* Service worker da Sala de Aula (/class).
   Objetivo: os jogos continuarem funcionando com internet ruim ou offline —
   realidade comum nos Chromebooks de escola.

   Estratégia:
   - Páginas (HTML): rede primeiro (pra atualizar quando online), cache como fallback.
   - Assets (imagens, ícones, manifest): cache primeiro, rede como fallback.

   Ao publicar mudança relevante, suba a versão do cache abaixo. */

const CACHE = 'class-v3';

// Bandeiras do Volta ao Mundo (public/class/games/volta-ao-mundo/flags/).
const BANDEIRAS = ('af ao ar au bo br ca cd cl cn co cr cu de dz ec eg es et fi fr gb gr gt gy hn id ie in iq ir is ' +
  'it jp ke kr kz ly ma mg mn mx mz ng ni no nz pa pe ph pk pl pt py ro ru sa sd se sr th tr tz ua us uy ve vn za')
  .split(' ')
  .map((cc) => `/class/games/volta-ao-mundo/flags/${cc}.svg`);

// Núcleo pré-cacheado na instalação: hub, listas e os jogos em si.
const PRECACHE = [
  '/class/',
  '/class/games/',
  '/class/games/trem-de-palavras/',
  '/class/games/letras-espaciais/',
  '/class/games/volta-ao-mundo/',
  '/class/games/pulo-do-gato/',
  '/class/sims/',
  '/class/sims/windows-98/',
  '/class/professores/',
  '/class/manifest.webmanifest',
  '/class/icons/trem-de-palavras.jpg',
  '/class/icons/letras-espaciais.jpg',
  '/class/icons/volta-ao-mundo.jpg',
  '/class/icons/pulo-do-gato.jpg',
  '/class/sims/wallpaper-98.jpg',
  '/favicon.png',
  '/icon-512.png',
  ...BANDEIRAS,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // addAll falha tudo se um item 404: cacheia um a um e ignora ausentes.
      .then((cache) =>
        Promise.allSettled(PRECACHE.map((url) => cache.add(url)))
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navegação (HTML): rede primeiro, cache se offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copia));
          return res;
        })
        .catch(() =>
          caches
            .match(req)
            .then((hit) => hit || caches.match('/class/'))
        )
    );
    return;
  }

  // Assets: cache primeiro, rede se não tiver (e guarda pra próxima).
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copia = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copia));
          }
          return res;
        })
    )
  );
});
