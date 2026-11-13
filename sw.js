const CACHE = 'checklist-ti-v10';
const ASSETS = ['./', './index.html', './manifest.json', './base.css', './components.css', './layout.css', './overlays.css', './screens.css', './tokens.css', './00-runtime.js', './01-utils.js', './02-splash.js', './03-config.js', './04-logo-data.js', './05-printers.js', './06-state.js', './07-render.js', './07b-dashboard.js', './08-modals-export.js', './09-save.js', './10-admin.js', './11-auth-boot.js', './12-history-undo.js', './13-field-tools.js', './14-pwa-enhance.js', './15-feedback.js', './16-pro-features.js', './17-shell.js', './18-flow.js', './19-command-palette.js', './logo-square.jpg', './logo-brand.png', './icon-192.png', './icon-512.png', './inter-latin-opsz-normal.woff2', './dancing-script-600.woff2'];

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
