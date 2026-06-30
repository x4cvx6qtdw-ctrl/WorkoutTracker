const CACHE_NAME = 'macktrak-v2.0.2';
const ASSETS = [
  './',
  './index.html'
];

// Install: cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API calls, cache-first for app shell
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Always go to network for Supabase API calls
  if (url.hostname.includes('supabase')) {
    return;
  }
  
  // Always go to network for exercise images
  if (url.hostname.includes('githubusercontent')) {
    return;
  }
  
  // Cache-first for app shell (HTML, JS, CSS)
  event.respondWith(
    caches.match(event.request).then(cached => {
      // Return cached version immediately, but also fetch fresh in background
      const fetchPromise = fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
      
      return cached || fetchPromise;
    })
  );
});
