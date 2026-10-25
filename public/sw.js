// Keeps the app itself on the device so it opens without a connection (e.g. at the pool).
// Data is cached separately by Firestore; this only caches our own files.
const CACHE = 'uwr-roster-v1'
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)
  // Firebase, fonts from elsewhere and Firebase Hosting's own /__/ paths always go to the network.
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/__/')) return

  if (req.mode === 'navigate') {
    // Pages: newest version when online, the saved one when not.
    event.respondWith(
      fetch(req)
        .then((res) => {
          // An error page is never saved as the app.
          if (res.ok) event.waitUntil(saveShell(res.clone()))
          return res
        })
        .catch(() => caches.match('/index.html')),
    )
    return
  }

  // Built files have the content hash in their name, so a saved copy never goes stale.
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((cache) => cache.put(req, copy))
          }
          return res
        }),
    ),
  )
})

/**
 * Saves the newest index.html and drops built files that it no longer uses. Each release has new file names,
 * so without this every old release would stay on the phone.
 */
async function saveShell(res) {
  const html = await res.clone().text()
  const cache = await caches.open(CACHE)
  await cache.put('/index.html', res)
  const used = new Set(html.match(/\/assets\/[^"'\s)]+/g) ?? [])
  for (const req of await cache.keys()) {
    const path = new URL(req.url).pathname
    if (path.startsWith('/assets/') && !used.has(path)) await cache.delete(req)
  }
}
