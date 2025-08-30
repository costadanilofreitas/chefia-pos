/**
 * Service Worker for Kiosk PWA
 * Handles offline caching and background sync
 */

const CACHE_NAME = 'kiosk-v1';
const STATIC_CACHE = 'kiosk-static-v1';
const DYNAMIC_CACHE = 'kiosk-dynamic-v1';
const IMAGE_CACHE = 'kiosk-images-v1';
const API_CACHE = 'kiosk-api-v1';

// Static resources to cache on install
const STATIC_RESOURCES = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/assets/placeholder-food.png'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/v1/products',
  '/api/v1/categories',
  '/api/v1/config'
];

// Install event - cache static resources
self.addEventListener('install', event => {
  console.log('[SW] Installing Service Worker');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Caching static resources');
        return cache.addAll(STATIC_RESOURCES);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating Service Worker');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => {
            return cacheName.startsWith('kiosk-') && 
                   cacheName !== CACHE_NAME &&
                   cacheName !== STATIC_CACHE &&
                   cacheName !== DYNAMIC_CACHE &&
                   cacheName !== IMAGE_CACHE &&
                   cacheName !== API_CACHE;
          })
          .map(cacheName => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
    .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle image requests
  if (request.destination === 'image' || 
      /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url.pathname)) {
    event.respondWith(handleImageRequest(request));
    return;
  }

  // Handle static resources
  event.respondWith(handleStaticRequest(request));
});

/**
 * Handle API requests with network-first strategy
 */
async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Fall back to cache if network fails
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('[SW] Serving API from cache:', request.url);
      return cachedResponse;
    }
    
    // Return error response if no cache
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'Sem conexão com a internet' 
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Handle image requests with cache-first strategy
 */
async function handleImageRequest(request) {
  const cache = await caches.open(IMAGE_CACHE);
  
  // Check cache first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    // Fetch from network
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Return placeholder image if offline
    const placeholderResponse = await caches.match('/assets/placeholder-food.png');
    return placeholderResponse || new Response('', { status: 404 });
  }
}

/**
 * Handle static resources with cache-first strategy
 */
async function handleStaticRequest(request) {
  // Check static cache first
  const staticCache = await caches.open(STATIC_CACHE);
  const cachedResponse = await staticCache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Check dynamic cache
  const dynamicCache = await caches.open(DYNAMIC_CACHE);
  const dynamicResponse = await dynamicCache.match(request);
  
  if (dynamicResponse) {
    return dynamicResponse;
  }
  
  try {
    // Fetch from network
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      dynamicCache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlineResponse = await staticCache.match('/offline.html');
      return offlineResponse || new Response('Offline', { status: 503 });
    }
    
    return new Response('', { status: 404 });
  }
}

// Background sync for orders
self.addEventListener('sync', event => {
  console.log('[SW] Background sync triggered');
  
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncPendingOrders());
  }
});

/**
 * Sync pending orders when connection is restored
 */
async function syncPendingOrders() {
  try {
    // Get pending orders from IndexedDB
    const db = await openDB();
    const tx = db.transaction('pending_orders', 'readonly');
    const store = tx.objectStore('pending_orders');
    const orders = await store.getAll();
    
    console.log('[SW] Syncing', orders.length, 'pending orders');
    
    // Send each order to the server
    for (const order of orders) {
      try {
        const response = await fetch('/api/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(order.data)
        });
        
        if (response.ok) {
          // Remove synced order from IndexedDB
          const deleteTx = db.transaction('pending_orders', 'readwrite');
          const deleteStore = deleteTx.objectStore('pending_orders');
          await deleteStore.delete(order.id);
          
          console.log('[SW] Order synced:', order.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync order:', order.id, error);
      }
    }
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

/**
 * Open IndexedDB for offline storage
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('KioskDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = event => {
      const db = event.target.result;
      
      // Create pending orders store
      if (!db.objectStoreNames.contains('pending_orders')) {
        db.createObjectStore('pending_orders', { keyPath: 'id' });
      }
    };
  });
}

// Message event for skip waiting
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Skip waiting');
    self.skipWaiting();
  }
});