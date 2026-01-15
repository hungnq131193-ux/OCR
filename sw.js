/* sw.js */
const CACHE_NAME = "vietocr-pro-v1";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(APP_SHELL);
      self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))));
      self.clients.claim();
    })()
  );
});

// Network-first cho HTML (lấy bản mới), cache-first cho các file còn lại
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Chỉ xử lý cùng origin để tránh lỗi CORS
  if (url.origin !== self.location.origin) return;

  if (req.method !== "GET") return;

  // HTML: network first
  const isHTML = req.headers.get("accept")?.includes("text/html");

  if (isHTML) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, fresh.clone());
          return fresh;
        } catch {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match(req)) || (await cache.match("./index.html"));
        }
      })()
    );
    return;
  }

  // Other assets: cache first
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      if (cached) return cached;

      const res = await fetch(req);
      cache.put(req, res.clone());
      return res;
    })()
  );
});
