const CACHE_NAME = "yowevent-v3";
const ASSETS = [
  "/",
  "/favicon.ico",
  "/manifest.json",
  "/offline.html",
  "/icon.svg",
  "/icon-maskable.svg"
];

self.addEventListener("install", (event) => {
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener("activate", (event) => {
  // Take control of all pages immediately
  event.waitUntil(self.clients.claim());

  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // For page navigation (HTML documents) or local development pages, use a Network-First strategy.
  // This ensures they always get the latest layout/navbar, and only fall back to cache when offline.
  if (event.request.mode === "navigate" || url.pathname === "/") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If valid response, clone and update cache
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // If network fails, serve from cache
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            // Fall back to the cached home page, then the offline fallback page
            return caches.match("/").then((home) => home || caches.match("/offline.html"));
          });
        })
    );
    return;
  }

  // For other static assets (images, fonts, scripts), use Cache-First strategy
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then((response) => {
        // Only cache valid GET responses (don't cache external APIs or next dev HMR files)
        const isStaticAsset = 
          url.origin === self.location.origin &&
          (url.pathname.startsWith("/_next/static/") || 
           url.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|css|js)$/));

        if (response && response.status === 200 && isStaticAsset) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
    })
  );
});
