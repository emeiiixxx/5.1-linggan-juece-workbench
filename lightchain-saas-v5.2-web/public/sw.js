const IMAGE_CACHE = "lightchain-images-v2";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("lightchain-images-") && key !== IMAGE_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || request.destination !== "image") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(IMAGE_CACHE);
    const cached = await cache.match(request);
    const refresh = fetch(request).then((response) => {
      if (response.ok && response.type === "basic") cache.put(request, response.clone());
      return response;
    });

    if (cached) {
      event.waitUntil(refresh.catch(() => undefined));
      return cached;
    }

    return refresh;
  })());
});
