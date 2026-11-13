const CACHE = 'checklist-ti-v8';
const ASSETS = ['./', './index.html', './manifest.json', './css/base.css', './css/components.css', './css/layout.css', './css/overlays.css', './css/screens.css', './css/tokens.css', './js/00-runtime.js', './js/01-utils.js', './js/02-splash.js', './js/03-config.js', './js/04-logo-data.js', './js/05-printers.js', './js/06-state.js', './js/07-render.js', './js/07b-dashboard.js', './js/08-modals-export.js', './js/09-save.js', './js/10-admin.js', './js/11-auth-boot.js', './js/12-history-undo.js', './js/13-field-tools.js', './js/14-pwa-enhance.js', './js/15-feedback.js', './js/16-pro-features.js', './js/17-shell.js', './js/18-flow.js', './js/19-command-palette.js', './assets/logo-square.jpg', './assets/logo-brand.png', './assets/icon-192.png', './assets/icon-512.png', './assets/fonts/inter-latin-opsz-normal.woff2', './assets/fonts/dancing-script-600.woff2'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  // Página principal: tenta a versão publicada mais recente e cai para o cache offline.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          if (response.ok) caches.open(CACHE).then(cache => cache.put(e.request, response.clone()));
          return response;
        })
        .catch(() => caches.match(e.request).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  // Demais arquivos do próprio site (CSS, JS, imagens): responde do cache e atualiza em segundo plano,
  // assim novas versões chegam sem precisar trocar o nome do cache a cada alteração.
  const sameOrigin = new URL(e.request.url).origin === self.location.origin;
  if (sameOrigin) {
    e.respondWith(caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      }).catch(() => cached);
      return cached || network;
    }));
    return;
  }

  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request)));
});
