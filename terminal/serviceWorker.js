// Service Worker para suporte offline
const CACHE_NAME = 'terminal-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/static/js/main.chunk.js',
  '/static/js/0.chunk.js',
  '/static/js/bundle.js',
  '/manifest.json',
  '/favicon.ico'
];

// Instalação do service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Ativação do service worker
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interceptação de requisições
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - retornar resposta do cache
        if (response) {
          return response;
        }

        // Clonar a requisição
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest)
          .then(response => {
            // Verificar se a resposta é válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clonar a resposta
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Se a rede falhar, tentar servir a página offline
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
          });
      })
  );
});

// Sincronização em segundo plano
self.addEventListener('sync', event => {
  if (event.tag === 'sync-pending-orders') {
    event.waitUntil(syncPendingOrders());
  }
});

// Função para sincronizar pedidos pendentes
const syncPendingOrders = async () => {
  try {
    // Obter pedidos pendentes do IndexedDB
    const pendingOrders = await getPendingOrdersFromDB();
    
    // Enviar cada pedido para o servidor
    for (const order of pendingOrders) {
      try {
        await sendOrderToServer(order);
        await markOrderAsSynced(order.id);
      } catch (error) {
        console.error('Erro ao sincronizar pedido:', error);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Erro na sincronização em segundo plano:', error);
    return false;
  }
};

// Funções auxiliares (implementação depende do contexto real)
const getPendingOrdersFromDB = async () => {
  // Implementação real usaria IndexedDB
  return [];
};

const sendOrderToServer = async (order) => {
  // Implementação real enviaria para a API
  return true;
};

const markOrderAsSynced = async (orderId) => {
  // Implementação real atualizaria o IndexedDB
  return true;
};
