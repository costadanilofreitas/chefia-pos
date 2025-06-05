// Service Worker for POS System
// Provides offline functionality and caching

const CACHE_NAME = 'pos-modern-v1';
const STATIC_CACHE = 'pos-static-v1';
const DYNAMIC_CACHE = 'pos-dynamic-v1';

// Resources to cache immediately
const STATIC_ASSETS = [
  '/',
  '/pos/1',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.ico'
];

// API endpoints that should work offline
const OFFLINE_APIS = [
  '/api/terminal-config',
  '/api/products',
  '/api/customers',
  '/api/orders'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }
  
  // Handle static assets
  if (request.destination === 'script' || 
      request.destination === 'style' || 
      request.destination === 'image') {
    event.respondWith(handleStaticAsset(request));
    return;
  }
  
  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }
  
  // Default: try network first, then cache
  event.respondWith(
    fetch(request)
      .catch(() => caches.match(request))
  );
});

// Handle API requests with offline support
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Try network first
    const response = await fetch(request);
    
    if (response.ok) {
      // Cache successful responses
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
      
      // Sync any pending offline operations
      syncOfflineOperations();
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache for:', url.pathname);
    
    // Try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for specific endpoints
    return handleOfflineApiRequest(request);
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Failed to fetch static asset:', request.url);
    throw error;
  }
}

// Handle navigation with offline fallback
async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    // Return cached app shell for offline navigation
    const cachedResponse = await caches.match('/');
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback offline page
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>POS Modern - Offline</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 50px;
              background: #f5f5f5;
            }
            .offline-container {
              max-width: 400px;
              margin: 0 auto;
              background: white;
              padding: 30px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .offline-icon {
              font-size: 48px;
              color: #ff9800;
              margin-bottom: 20px;
            }
            h1 { color: #333; margin-bottom: 10px; }
            p { color: #666; margin-bottom: 20px; }
            .retry-btn {
              background: #2196f3;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 16px;
            }
            .retry-btn:hover { background: #1976d2; }
          </style>
        </head>
        <body>
          <div class="offline-container">
            <div class="offline-icon">📱</div>
            <h1>Modo Offline</h1>
            <p>Você está offline, mas o POS continua funcionando com os dados locais.</p>
            <button class="retry-btn" onclick="window.location.reload()">
              Tentar Novamente
            </button>
          </div>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Handle offline API requests with mock data
function handleOfflineApiRequest(request) {
  const url = new URL(request.url);
  
  // Return appropriate offline responses
  switch (true) {
    case url.pathname.includes('/terminal-config'):
      return new Response(JSON.stringify({
        terminalId: '1',
        name: 'Terminal 1 (Offline)',
        location: 'Caixa Principal',
        printerConfig: { enabled: false },
        offlineMode: true
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
      
    case url.pathname.includes('/products'):
      return new Response(JSON.stringify([
        { id: 1, name: 'Produto Offline', price: 10.00, available: true }
      ]), {
        headers: { 'Content-Type': 'application/json' }
      });
      
    case url.pathname.includes('/orders'):
      if (request.method === 'POST') {
        // Queue order for later sync
        queueOfflineOperation('order', request);
        return new Response(JSON.stringify({
          id: Date.now(),
          status: 'queued',
          offline: true
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      break;
      
    default:
      return new Response(JSON.stringify({
        error: 'Offline mode',
        message: 'Esta funcionalidade não está disponível offline'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
  }
}

// Queue operations for later sync
function queueOfflineOperation(type, request) {
  // Store in IndexedDB for persistence
  const operation = {
    id: Date.now(),
    type,
    url: request.url,
    method: request.method,
    timestamp: new Date().toISOString(),
    synced: false
  };
  
  // This would be implemented with IndexedDB
  console.log('[SW] Queued offline operation:', operation);
}

// Sync offline operations when back online
function syncOfflineOperations() {
  // This would retrieve and sync queued operations
  console.log('[SW] Syncing offline operations...');
}

// Background sync for offline operations
self.addEventListener('sync', (event) => {
  if (event.tag === 'pos-sync') {
    event.waitUntil(syncOfflineOperations());
  }
});

// Handle push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Nova notificação do POS',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Abrir POS',
        icon: '/favicon.ico'
      },
      {
        action: 'close',
        title: 'Fechar',
        icon: '/favicon.ico'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('POS Modern', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/pos/1')
    );
  }
});

