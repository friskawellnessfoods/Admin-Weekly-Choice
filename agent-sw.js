/* Friska rider app — service worker.
 *
 * This file sits at the repo root, so its scope is the whole site, which also
 * covers the client app (index.html). It therefore handles ONLY the files
 * listed below. Every other request returns without respondWith(), which
 * leaves the browser to fetch it exactly as it would with no worker at all.
 * Nothing about index.html, menu.html, orders.html or the API changes.
 */
const TAG  = 'friska-agent-v1';
const MINE = [
  'agent.html',
  'agent-manifest.json',
  'config.js',
  'logo.png',
  'icon-192.png',
  'icon-512.png',
  'icon-192-maskable.png',
  'icon-512-maskable.png',
  'apple-touch-icon.png',
  'favicon-32.png'
];

const isMine = url => {
  if (url.origin !== self.location.origin) return false;
  const base = url.pathname.split('/').pop();
  return MINE.indexOf(base) !== -1;
};

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(TAG)
      .then(c => Promise.all(MINE.map(f => c.add(f).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== TAG).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (!isMine(url)) return;              // not ours — browser handles it normally

  /* Newest wins when there is signal; the cache is only there so the rider who
     opens the app in a lift still gets a screen instead of a dinosaur. */
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.ok) caches.open(TAG).then(c => c.put(req, res.clone()));
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true })
        .then(hit => hit || Response.error()))
  );
});
