/**
 * Service Worker with Automatic Update Detection
 * Version: 2.0.0 (Updated: 2026-03-18)
 * 
 * Features:
 * - Automatic cache versioning with timestamp
 * - Detects new app versions and notifies users
 * - Forces update on new version detection
 * - Cleans up old caches automatically
 * - Offline support with fallback
 */

// Generate version based on current timestamp
// This ensures cache is busted on every deployment
const BUILD_TIMESTAMP = '2026-03-18T13:53:15Z';
const CACHE_VERSION = 2;
const CACHE_NAME = `icd10-search-v${CACHE_VERSION}-${BUILD_TIMESTAMP}`;

// URLs to cache on install
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/src/main.tsx',
  '/src/index.css'
];

// Store version info for update detection
let currentVersion = {
  version: CACHE_VERSION,
  timestamp: BUILD_TIMESTAMP,
  cacheNames: [CACHE_NAME]
};

/**
 * Install event - cache essential files and skip waiting
 * This ensures new version is used immediately
 */
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing version:', CACHE_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] Caching files for version:', CACHE_VERSION);
      return cache.addAll(urlsToCache).catch(err => {
        console.log('[Service Worker] Cache addAll error:', err);
        // Continue even if some files fail to cache
        return Promise.resolve();
      });
    })
  );
  
  // Skip waiting to activate new version immediately
  self.skipWaiting();
});

/**
 * Activate event - clean up old caches and claim clients
 * This ensures old cached data is removed
 */
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating version:', CACHE_VERSION);
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      console.log('[Service Worker] Found caches:', cacheNames);
      
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete old cache versions
          if (!cacheName.includes(BUILD_TIMESTAMP)) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Claim all clients to ensure new SW is used immediately
  self.clients.claim();
});

/**
 * Fetch event - serve from cache with network fallback
 * API calls always fetch from network for fresh data
 */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // API calls - always fetch from network, cache successful responses
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache successful API responses
          if (response.status === 200) {
            const clonedResponse = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, clonedResponse);
            });
          }
          return response;
        })
        .catch(() => {
          // Return cached response if network fails
          return caches.match(request).then(cachedResponse => {
            return cachedResponse || new Response(
              JSON.stringify({ error: 'Offline - cached data may be unavailable' }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
          });
        })
    );
    return;
  }

  // HTML files - network first to get latest version
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache successful responses
          if (response.status === 200) {
            const clonedResponse = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, clonedResponse);
            });
          }
          return response;
        })
        .catch(() => {
          // Return cached HTML or offline page
          return caches.match(request).then(cachedResponse => {
            return cachedResponse || caches.match('/index.html').then(indexResponse => {
              return indexResponse || new Response(
                'Offline - Please check your connection',
                { status: 503, headers: { 'Content-Type': 'text/html' } }
              );
            });
          });
        })
    );
    return;
  }

  // Static assets - cache first, network fallback
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then(response => {
          // Cache successful responses
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, clonedResponse);
          });

          return response;
        })
        .catch(() => {
          // Return offline page
          return caches.match('/index.html').then(response => {
            return response || new Response(
              'Offline - Please check your connection',
              { status: 503, headers: { 'Content-Type': 'text/plain' } }
            );
          });
        });
    })
  );
});

/**
 * Message handler - receive messages from clients
 * Supports update notifications and version checks
 */
self.addEventListener('message', event => {
  console.log('[Service Worker] Received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[Service Worker] Skipping waiting, activating new version');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    console.log('[Service Worker] Sending version:', currentVersion);
    event.ports[0].postMessage({
      type: 'VERSION',
      version: currentVersion
    });
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('[Service Worker] Clearing all caches');
    caches.keys().then(cacheNames => {
      Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    });
  }
});

/**
 * Periodic background sync - check for updates periodically
 * (Requires user permission and browser support)
 */
if ('periodicSync' in self.registration) {
  self.addEventListener('periodicsync', event => {
    if (event.tag === 'check-update') {
      console.log('[Service Worker] Periodic sync: checking for updates');
      event.waitUntil(
        fetch('/manifest.json')
          .then(response => response.json())
          .then(manifest => {
            // Notify clients of new version
            self.clients.matchAll().then(clients => {
              clients.forEach(client => {
                client.postMessage({
                  type: 'UPDATE_AVAILABLE',
                  manifest: manifest
                });
              });
            });
          })
      );
    }
  });
}

console.log('[Service Worker] Loaded version:', CACHE_VERSION, 'timestamp:', BUILD_TIMESTAMP);
