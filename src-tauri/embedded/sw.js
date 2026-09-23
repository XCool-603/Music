const CACHE_NAME = 'muse-audio-v5';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 1. Only intercept same-origin GET requests
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) {
    return;
  }

  // 2. Never intercept API requests, media streams (audio/video), or Range requests
  if (
    request.url.includes('/api/') ||
    request.destination === 'audio' ||
    request.destination === 'video' ||
    request.headers.has('range')
  ) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        return new Response('Network error', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' },
        });
      })
  );
});