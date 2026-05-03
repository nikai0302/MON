const CACHE = 'mon-v6';

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(['./index.html','./manifest.json']))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({type:'window',includeUncontrolled:true}))
      .then(clients => clients.forEach(c => c.navigate(c.url)))
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Never cache API calls
  if(url.hostname.includes('frankfurter') ||
     url.hostname.includes('anthropic') ||
     url.hostname.includes('jsdelivr') ||
     url.hostname.includes('er-api')) {
    e.respondWith(fetch(e.request).catch(() => new Response('{}',{headers:{'Content-Type':'application/json'}})));
    return;
  }

  // HTML and JS/JSON: network first, update cache, fall back to cache
  if(e.request.mode === 'navigate' ||
     url.pathname.endsWith('.html') ||
     url.pathname.endsWith('.js') ||
     url.pathname.endsWith('.json') ||
     url.pathname === '/' ||
     url.pathname.endsWith('/MON/')) {
    e.respondWith(
      fetch(e.request, {cache: 'no-store'})
        .then(res => {
          if(res && res.status === 200) {
            caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Everything else: cache first
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
