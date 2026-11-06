const CACHE_NAME = "cv-md-static-v15";
const SCOPE_URL = new URL(self.registration.scope);
const assetUrl = (path) => new URL(path, SCOPE_URL).href;

const APP_ASSETS = [
  "",
  "index.html",
  "app.js",
  "manifest.json",
  "icon.svg",
  "icon-192.png",
  "icon-512.png",
  "themes/classic/style.css",
  "themes/modern/style.css",
  "themes/minimal/style.css",
  "themes/creative/style.css",
  "themes/tech-dark/style.css",
  "vendor/codemirror/codemirror.min.css",
  "vendor/codemirror/dracula.min.css",
  "vendor/codemirror/codemirror.min.js",
  "vendor/codemirror/markdown.min.js",
  "vendor/jszip.min.js",
  "vendor/docx.iife.js",
  "vendor/fonts/geist-400.ttf",
  "vendor/fonts/geist-500.ttf",
  "vendor/fonts/geist-600.ttf",
  "vendor/fonts/geist-700.ttf",
  "vendor/THIRD-PARTY-NOTICES.md",
  "vendor/licenses/codemirror-MIT.txt",
  "vendor/licenses/docx-MIT.txt",
  "vendor/licenses/geist-OFL-1.1.txt",
  "vendor/licenses/jszip-MIT-GPL.txt",
].map(assetUrl);

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_ASSETS);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => (key.startsWith("cv-md-static-") || key === "resume-v2") && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE_URL.pathname)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    if (request.mode === "navigate") {
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch {
        return cached || cache.match(assetUrl("index.html"));
      }
    }

    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch {
      if (cached) return cached;
      return new Response("Recurso indisponível offline.", { status: 503, statusText: "Offline" });
    }
  })());
});
