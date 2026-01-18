// Minimal service worker for iOS PWA standalone mode
// This is a pass-through service worker that enables PWA installation on iOS Safari

const CACHE_NAME = 'classroom-checkin-v1'

// Install event - skip waiting to activate immediately
self.addEventListener('install', () => {
  self.skipWaiting()
})

// Activate event - claim all clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clean up old caches if any
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      })
    ])
  )
})

// Fetch event - pass through to network (no caching for dynamic content)
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request))
})
