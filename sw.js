const CACHE = "timer-organizer-v2";
const FILES = [
  "./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png",
  "css/theme.css", "css/base.css", "css/layout.css", "css/tags.css", "css/dialogs.css", "css/responsive.css",
  "js/main.js",
  "js/core/util.js", "js/core/constants.js", "js/core/dom.js", "js/core/tagdata.js", "js/core/state.js", "js/core/time.js", "js/core/view.js",
  "js/features/prefs.js", "js/features/keys.js", "js/features/popout.js", "js/features/tags.js", "js/features/listbar.js",
  "js/features/bulk.js", "js/features/tasks.js", "js/features/io.js", "js/features/settings.js", "js/features/sync.js",
  "js/ui/toast.js", "js/ui/dialogs.js", "js/ui/render.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network first for our own files (so updates show up), cache as the offline fallback.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match("index.html")))
  );
});
