// ===========================================
// Service Worker for AppLoads PWA
// ===========================================
// Handles offline functionality, caching, and background sync
// ===========================================

const CACHE_NAME = 'apploads-v1.0.0';
const DYNAMIC_CACHE_NAME = 'apploads-dynamic-v1.0.0';

// Core app shell - critical resources for basic functionality
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
  '/js/firebase-config.js',
  '/manifest.json',
  '/browserconfig.xml',
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

// External dependencies
const EXTERNAL_ASSETS = [
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js',
  'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg'
];

// =========================
// Installation - Cache Core Assets
// =========================
self.addEventListener('install', (event) => {
  console.log('🛠️ Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching core app shell...');
        return cache.addAll([...CORE_ASSETS, ...EXTERNAL_ASSETS]);
      })
      .then(() => {
        console.log('✅ Core app shell cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Cache installation failed:', error);
      })
  );
});

// =========================
// Activation - Cleanup Old Caches
// =========================
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old caches that don't match current version
          if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('✅ Service Worker activated and ready');
      return self.clients.claim();
    })
  );
});

// =========================
// Fetch - Smart Caching Strategy
// =========================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle different resource types with appropriate strategies
  if (isCoreAsset(request) || isExternalAsset(request)) {
    // Cache First for core assets
    event.respondWith(cacheFirst(request));
  } else if (isImageRequest(request)) {
    // Cache First for images with network fallback
    event.respondWith(cacheFirstWithNetworkFallback(request));
  } else if (isFirestoreRequest(request)) {
    // Network First for Firestore data
    event.respondWith(networkFirst(request));
  } else {
    // Network First for other requests
    event.respondWith(networkFirst(request));
  }
});

// =========================
// Caching Strategies
// =========================

// Cache First strategy
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // If both cache and network fail, return offline page for navigation requests
    if (request.mode === 'navigate') {
      return getOfflinePage();
    }
    throw error;
  }
}

// Cache First with Network Fallback for images
async function cacheFirstWithNetworkFallback(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Return placeholder for failed images
    return getImagePlaceholder();
  }
}

// Network First strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed - try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If it's a navigation request and both fail, show offline page
    if (request.mode === 'navigate') {
      return getOfflinePage();
    }
    
    throw error;
  }
}

// =========================
// Helper Functions
// =========================

function isCoreAsset(request) {
  return CORE_ASSETS.some(asset => 
    request.url.includes(asset) || 
    (asset === '/' && request.url === self.location.origin + '/')
  );
}

function isExternalAsset(request) {
  return EXTERNAL_ASSETS.some(asset => request.url.includes(asset));
}

function isImageRequest(request) {
  return request.destination === 'image' || 
         request.url.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i);
}

function isFirestoreRequest(request) {
  return request.url.includes('firestore.googleapis.com') &&
         request.url.includes('/documents/');
}

async function getOfflinePage() {
  const cache = await caches.open(CACHE_NAME);
  const cachedPage = await cache.match('/index.html');
  
  if (cachedPage) {
    return cachedPage;
  }
  
  // Create a simple offline page response
  return new Response(
    `
    <!DOCTYPE html>
    <html>
    <head>
      <title>AppLoads - Offline</title>
      <style>
        body { 
          font-family: system-ui, sans-serif; 
          background: #f5f7fb; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          min-height: 100vh; 
          margin: 0; 
          padding: 20px; 
        }
        .offline-container { 
          text-align: center; 
          background: white; 
          padding: 40px; 
          border-radius: 14px; 
          box-shadow: 0 8px 22px rgba(0,0,0,.06);
          max-width: 400px;
        }
        h1 { color: #0b7d62; margin-bottom: 16px; }
        p { color: #6b7280; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <div class="offline-container">
        <h1>🚛 AppLoads</h1>
        <p>📵 You are currently offline</p>
        <p>Some features may be unavailable until connection is restored.</p>
        <button onclick="window.location.reload()">Retry Connection</button>
      </div>
    </body>
    </html>
    `,
    { 
      headers: { 'Content-Type': 'text/html' } 
    }
  );
}

async function getImagePlaceholder() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="150" height="112" viewBox="0 0 150 112">
      <rect width="100%" height="100%" fill="#f5f7fb"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
            fill="#6b7280" font-family="Arial" font-size="14">📷</text>
    </svg>
  `;
  
  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml' }
  });
}

// =========================
// Background Sync for Offline Posts
// =========================
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  if (event.tag === 'pending-posts') {
    event.waitUntil(syncPendingPosts());
  }
});

async function syncPendingPosts() {
  // This would sync any posts that were made while offline
  // Implementation depends on your offline queue system
  console.log('🔄 Syncing pending posts...');
  
  // TODO: Implement based on your offline queue storage
  // const pendingPosts = await getPendingPosts();
  // for (const post of pendingPosts) {
  //   await syncPost(post);
  //   await removeFromPendingPosts(post.id);
  // }
}

// =========================
// Push Notifications
// =========================
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body || 'New update from AppLoads',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: data.tag || 'apploads-notification',
    data: data.url || '/'
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'AppLoads', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Focus existing window or open new one
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data || '/');
      }
    })
  );
});

// =========================
// Cache Management Utilities
// =========================
async function cleanupOldCaches() {
  const cacheNames = await caches.keys();
  const currentCaches = [CACHE_NAME, DYNAMIC_CACHE_NAME];
  
  const cachesToDelete = cacheNames.filter(
    cacheName => !currentCaches.includes(cacheName)
  );
  
  await Promise.all(
    cachesToDelete.map(cacheName => caches.delete(cacheName))
  );
  
  console.log('🧹 Cache cleanup completed');
}

// Periodic cache cleanup (called from main app)
self.cleanupCaches = cleanupOldCaches;

