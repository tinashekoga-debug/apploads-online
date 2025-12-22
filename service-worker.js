// service-worker.js
// AppLoads PWA - stable production service worker
// Caches only static assets & images. DOES NOT intercept Firestore API calls.

const CACHE_NAME = 'apploads-shell-v1';
const DYNAMIC_CACHE_NAME = 'apploads-dynamic-v1';
const MAX_DYNAMIC_ITEMS = 120;
const MAX_IMAGE_ITEMS = 250;

// Core app shell - NOTE: external firebase scripts removed to avoid install failures
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/main.js',
  '/js/ui.js',
  '/js/auth.js',
  '/js/loads.js',
  '/js/sales.js',
  '/js/profile.js',
  '/js/ratings.js',
  '/js/filters.js',
  '/js/images.js',
  '/js/data-loader.js',
  '/js/skeleton-loader.js',
  '/js/lazy-loading.js',
  '/js/report.js',
  '/js/firebase-config.js', // local config (do not cache remote CDN)
  '/manifest.json',
  '/icons/icon-72.png',
  '/icons/icon-96.png',
  '/icons/icon-128.png',
  '/icons/icon-144.png',
  '/icons/icon-152.png',
  '/icons/icon-192.png',
  '/icons/icon-384.png',
  '/icons/icon-512.png',
  '/icons/badge-72.png'
];

// A small offline HTML page (will be used as fallback)
const OFFLINE_HTML = '/index.html';

// Allow the app to force-activate a waiting Service Worker
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Install: cache core assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching core app shell...');
        return cache.addAll(CORE_ASSETS);
      })
      .then(() => {
        console.log('[SW] Core app shell cached successfully');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[SW] Install failed:', err);
        // Don't skip waiting if installation failed
        throw err;
      })
  );
});

// Activate: cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME && key !== DYNAMIC_CACHE_NAME) {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: only handle GETs and only static/dynamic assets and images.
// IMPORTANT: We WILL NOT intercept or attempt to cache Firestore SDK network calls.
self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Bypass requests to other origins that are likely dynamic (analytics, firebase, etc.)
  // But still allow images from CDNs to be cached if needed
  if (isCoreAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (isImageRequest(request)) {
    event.respondWith(cacheFirstWithNetworkFallback(request));
    return;
  }

  // For navigation requests (SPA fallbacks) – network first, then fallback to cache
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(networkFirst(request));
    return;
  }

  // For other resources (scripts/styles from same origin) - network first with cache fallback
  event.respondWith(networkFirst(request));
});

// Cache-first for static assets
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      await cache.put(request, response.clone());
      trimCache(DYNAMIC_CACHE_NAME, MAX_DYNAMIC_ITEMS);
    }
    return response;
  } catch (err) {
    // fallback to offline page if navigation
    if (request.mode === 'navigate') {
      const cache = await caches.open(CACHE_NAME);
      const offline = await cache.match(OFFLINE_HTML);
      if (offline) return offline;
    }
    throw err;
  }
}

// Cache-first with network fallback for images (and background refresh attempt)
async function cacheFirstWithNetworkFallback(request) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) {
    // Kick off a background fetch to refresh cached image (non-blocking)
    fetch(request).then(async (freshResp) => {
      if (freshResp && freshResp.ok) {
        await cache.put(request, freshResp.clone());
        trimCache(DYNAMIC_CACHE_NAME, MAX_IMAGE_ITEMS);
      }
    }).catch(() => { /* ignore refresh errors */ });

    return cached;
  }

  try {
    const resp = await fetch(request);
    if (resp && resp.ok) {
      await cache.put(request, resp.clone());
      trimCache(DYNAMIC_CACHE_NAME, MAX_IMAGE_ITEMS);
    }
    return resp;
  } catch (err) {
    // Return a simple inline SVG placeholder response
    return getImagePlaceholder();
  }
}

// Network-first (for navigation / dynamic)
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, response.clone());
      trimCache(DYNAMIC_CACHE_NAME, MAX_DYNAMIC_ITEMS);
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;

    // fallback to offline page for navigations
    if (request.mode === 'navigate' || request.destination === 'document') {
      const cache = await caches.open(CACHE_NAME);
      const offline = await cache.match(OFFLINE_HTML);
      if (offline) return offline;
    }

    throw err;
  }
}

// Helper to decide if path is a core asset
function isCoreAsset(pathname) {
  // exact match or startsWith
  if (CORE_ASSETS.includes(pathname)) return true;
  return CORE_ASSETS.some(asset => asset !== '/' && pathname.startsWith(asset));
}

// Basic image detection
function isImageRequest(request) {
  return request.destination === 'image' ||
         /\.(png|jpg|jpeg|gif|webp|svg|ico)(\?.*)?$/.test(request.url);
}

// Simple inline SVG placeholder for unavailable images
function getImagePlaceholder() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#9ca3af" font-size="36">📷</text>
    </svg>
  `;
  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml' }
  });
}

// Trim cache to keep it under maxItems (FIFO trimming).
// Note: Cache Storage API does not expose timestamps. We remove oldest requests first.
async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    if (requests.length <= maxItems) return;
    const removeCount = requests.length - maxItems;
    for (let i = 0; i < removeCount; i++) {
      await cache.delete(requests[i]);
    }
  } catch (err) {
    console.warn('[SW] trimCache failed:', err);
  }
}