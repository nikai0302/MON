// v3 — network-first always, no stale cache
const CACHE = 'mon-v3';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => {
        // Tell all open clients to reload
        self.clients.matchAll({type:'window'}).then(clients => {
          clients.forEach(c => c.navigate(c.url));
        });
      })
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Rate APIs — network only
  if (url.hostname.includes('jsdelivr') || url.hostname.includes('er-api')) {
    e.respondWith(
      fetch(e.request).catch(() => new Response('{}', {headers:{'Content-Type':'application/json'}}))
    );
    return;
  }

  // HTML pages — ALWAYS network first, cache as fallback
  if (e.request.mode === 'navigate' ||
      url.pathname.endsWith('.html') ||
      url.pathname.endsWith('/')) {
    e.respondWith(
      fetch(e.request, {cache: 'no-cache'})
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // JS/JSON — network first
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.json')) {
    e.respondWith(
      fetch(e.request, {cache: 'no-cache'})
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Everything else — cache first
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
