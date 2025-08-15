/**
 * Service Worker para cache avançado e operação offline
 * Otimizado para performance do POS
 */

const CACHE_NAME = 'chefia-pos-v1';
const API_CACHE_NAME = 'chefia-pos-api-v1';
const STATIC_CACHE_NAME = 'chefia-pos-static-v1';

// Recursos estáticos para cache inicial
const STATIC_RESOURCES = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.ico'
];

// APIs críticas para cache
const API_ENDPOINTS = [
  '/api/products',
  '/api/categories',
  '/api/business-day/status'
];

// Instalar service worker
self.addEventListener('install', (event: ExtendableEvent) => {
  console.log('[SW] Instalando service worker...');
  
  event.waitUntil(
    Promise.all([
      // Cache de recursos estáticos
      caches.open(STATIC_CACHE_NAME).then(cache => {
        console.log('[SW] Cacheando recursos estáticos...');
        return cache.addAll(STATIC_RESOURCES);
      }),
      
      // Cache de APIs críticas
      caches.open(API_CACHE_NAME).then(async cache => {
        console.log('[SW] Cacheando APIs críticas...');
        for (const endpoint of API_ENDPOINTS) {
          try {
            const response = await fetch(endpoint);
            if (response.ok) {
              await cache.put(endpoint, response);
            }
          } catch (err) {
            console.warn(`[SW] Falha ao cachear ${endpoint}:`, err);
          }
        }
      })
    ]).then(() => {
      console.log('[SW] Service worker instalado com sucesso');
      return self.skipWaiting();
    })
  );
});

// Ativar service worker
self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log('[SW] Ativando service worker...');
  
  event.waitUntil(
    Promise.all([
      // Limpar caches antigos
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => 
              cacheName !== CACHE_NAME && 
              cacheName !== API_CACHE_NAME && 
              cacheName !== STATIC_CACHE_NAME
            )
            .map(cacheName => {
              console.log('[SW] Removendo cache antigo:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      
      // Assumir controle imediatamente
      self.clients.claim()
    ]).then(() => {
      console.log('[SW] Service worker ativado');
    })
  );
});

// Interceptar requests
self.addEventListener('fetch', (event: FetchEvent) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignorar requests não-HTTP
  if (!request.url.startsWith('http')) {
    return;
  }

  // Estratégias diferentes por tipo de recurso
  if (url.pathname.startsWith('/api/')) {
    // APIs: Cache-first com fallback para network
    event.respondWith(handleAPIRequest(request));
  } else if (request.destination === 'document') {
    // HTML: Network-first com fallback para cache
    event.respondWith(handleDocumentRequest(request));
  } else if (
    request.destination === 'script' || 
    request.destination === 'style' ||
    request.destination === 'image'
  ) {
    // Recursos estáticos: Cache-first
    event.respondWith(handleStaticRequest(request));
  } else {
    // Outros: Network-first
    event.respondWith(handleDefaultRequest(request));
  }
});

// Gerenciar requests de API
async function handleAPIRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  
  try {
    // Para operações GET, tentar cache primeiro
    if (request.method === 'GET') {
      const cache = await caches.open(API_CACHE_NAME);
      const cachedResponse = await cache.match(request);
      
      if (cachedResponse) {
        // Verificar se cache não está muito antigo (5 minutos para produtos, 30s para status)
        const cacheAge = Date.now() - new Date(cachedResponse.headers.get('date') || 0).getTime();
        const maxAge = url.pathname.includes('/products') ? 300000 : 30000; // 5min ou 30s
        
        if (cacheAge < maxAge) {
          console.log('[SW] Servindo API do cache:', url.pathname);
          return cachedResponse;
        }
      }
    }

    // Tentar network
    const networkResponse = await fetch(request);
    
    // Cachear responses de GET bem-sucedidas
    if (request.method === 'GET' && networkResponse.ok) {
      const cache = await caches.open(API_CACHE_NAME);
      await cache.put(request, networkResponse.clone());
      console.log('[SW] API cacheada:', url.pathname);
    }
    
    return networkResponse;
    
  } catch (error) {
    console.warn('[SW] Erro na network, tentando cache:', error);
    
    // Fallback para cache se network falhou
    const cache = await caches.open(API_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('[SW] Servindo API do cache (fallback):', url.pathname);
      return cachedResponse;
    }
    
    // Retornar erro offline personalizado
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Recurso não disponível offline',
        offline: true
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Gerenciar requests de documentos HTML
async function handleDocumentRequest(request: Request): Promise<Response> {
  try {
    // Tentar network primeiro
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
    
  } catch (error) {
    console.warn('[SW] Documento não disponível na network, tentando cache:', error);
    
    // Fallback para cache
    const cache = await caches.open(STATIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback final para página offline
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Chefia POS - Offline</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .offline-message { max-width: 600px; margin: 0 auto; }
          .status { color: #f44336; font-size: 18px; margin-bottom: 20px; }
          .instruction { color: #666; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="offline-message">
          <h1>Chefia POS</h1>
          <div class="status">📡 Modo Offline</div>
          <div class="instruction">
            <p>Você está operando offline. Algumas funcionalidades podem estar limitadas.</p>
            <p>Os dados serão sincronizados automaticamente quando a conexão for restabelecida.</p>
            <button onclick="location.reload()">🔄 Tentar Novamente</button>
          </div>
        </div>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Gerenciar recursos estáticos
async function handleStaticRequest(request: Request): Promise<Response> {
  const cache = await caches.open(STATIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.warn('[SW] Recurso estático não disponível:', request.url, error);
    throw error;
  }
}

// Gerenciar outros requests
async function handleDefaultRequest(request: Request): Promise<Response> {
  try {
    return await fetch(request);
  } catch (error) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Gerenciar mensagens do cliente
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_CLEAR') {
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }).then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});

// Sincronização em background
self.addEventListener('sync', (event: any) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncOfflineData());
  }
});

// Função para sincronizar dados offline
async function syncOfflineData() {
  console.log('[SW] Iniciando sincronização em background...');
  
  try {
    // Notificar clientes sobre início da sincronização
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_START'
      });
    });
    
    // A sincronização real é feita pelo OfflineStorage no cliente
    // Aqui apenas atualizamos caches críticos
    await updateCriticalCaches();
    
    // Notificar sucesso
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_SUCCESS'
      });
    });
    
  } catch (error) {
    console.error('[SW] Erro na sincronização:', error);
    
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_ERROR',
        error: error.message
      });
    });
  }
}

// Atualizar caches críticos
async function updateCriticalCaches() {
  const cache = await caches.open(API_CACHE_NAME);
  
  for (const endpoint of API_ENDPOINTS) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) {
        await cache.put(endpoint, response);
        console.log('[SW] Cache atualizado:', endpoint);
      }
    } catch (error) {
      console.warn('[SW] Falha ao atualizar cache:', endpoint, error);
    }
  }
}