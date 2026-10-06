// KontrolPanelPro service worker
// - Sayfa (HTML): önce ağ, yoksa önbellek → güncellemeler hemen gelir, internetsiz de açılır
// - CDN kütüphaneleri ve fontlar: önce önbellek (sürümlü adresler, değişmez)
// - Google Apps Script istekleri (POST) hiç önbelleğe alınmaz
const CACHE = 'kp-v2';
const ONBELLEK = [
  './',
  'index.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js'
];
const CDN = /^https:\/\/(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com|cdn\.sheetjs\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(ONBELLEK.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (CDN.test(req.url)) {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok || res.type === 'opaque') {
          const kopya = res.clone();
          caches.open(CACHE).then(c => c.put(req, kopya));
        }
        return res;
      }))
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req).then(res => {
      if (res.ok) {
        const kopya = res.clone();
        caches.open(CACHE).then(c => c.put(req, kopya));
      }
      return res;
    }).catch(() =>
      caches.match(req, { ignoreSearch: true }).then(hit =>
        hit || (req.mode === 'navigate' ? caches.match('index.html') : undefined)
      ).then(hit => hit || Response.error())
    )
  );
});
