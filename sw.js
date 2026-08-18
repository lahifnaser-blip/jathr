const CACHE = "jathr-v7";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png",
  "./theme.css", "./share-print-pdf.js", "./mukhtabar.html", "./bunyan.html"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks =>
    Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);

  // نصوص المعاجم: من الذاكرة أولًا، فهي ثابتة لا تتغيّر
  if (/cdn\.jsdelivr\.net|raw\.githubusercontent\.com/.test(url.host)) {
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return r;
      }))
    );
    return;
  }
  // ملفّات شجرة الإعراب: ثابتة، من الذاكرة أولًا
  if (/\/(tree\/)?\d{3}\.json$/.test(url.pathname)) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return r;
    })));
    return;
  }
  // القرآن وويكاموس والخطوط: من الشبكة أولًا ثم الذاكرة
  if (/wiktionary\.org|alquran\.cloud|quran\.com|fonts\.(googleapis|gstatic)\.com/.test(url.host)) {
    e.respondWith(
      fetch(e.request).then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return r;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
