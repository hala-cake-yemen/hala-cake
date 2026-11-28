const CACHE_NAME = 'hala-cake-pwa-v1';
const APP_SHELL = [
  '/hala-cake/',
  '/hala-cake/index.html',
  '/hala-cake/manifest.json',
  '/hala-cake/assets/hala-pwa-icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('hala-cake-pwa-') && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Keep Supabase API, authentication, storage, and all dynamic user data network-only.
  const path = url.pathname;
  if (path.startsWith('/rest/v1/') || path.startsWith('/auth/v1/') || path.startsWith('/storage/v1/')) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        if (fresh && fresh.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put('/hala-cake/index.html', fresh.clone());
        }
        return fresh;
      } catch (_) {
        return (await caches.match('/hala-cake/index.html')) ||
          (await caches.match('/hala-cake/')) ||
          new Response('أنت غير متصل بالإنترنت. أعد الاتصال لفتح متجر حلا كيك.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
      }
    })());
    return;
  }

  if (path.startsWith('/hala-cake/assets/') || path === '/hala-cake/manifest.json') {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    })());
  }
});
