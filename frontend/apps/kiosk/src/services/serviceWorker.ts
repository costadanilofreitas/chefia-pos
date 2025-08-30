/**
 * Service Worker registration and management
 * Provides offline capabilities for the Kiosk application
 */

import { offlineStorage } from './offlineStorage';

// Cache name for dynamic caching
const DYNAMIC_CACHE = 'kiosk-dynamic-v1';

interface ServiceWorkerConfig {
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

/**
 * Register service worker
 */
export function register(config?: ServiceWorkerConfig): void {
  if ('serviceWorker' in navigator) {
    // Register after window load for better performance
    window.addEventListener('load', () => {
      const swUrl = '/sw.js';
      
      if (isLocalhost()) {
        // In development, check if service worker exists
        checkValidServiceWorker(swUrl, config);
      } else {
        // In production, register service worker
        registerValidSW(swUrl, config);
      }
    });
  }
}

/**
 * Register valid service worker
 */
function registerValidSW(swUrl: string, config?: ServiceWorkerConfig): void {
  navigator.serviceWorker
    .register(swUrl)
    .then(registration => {
      offlineStorage.log('Service Worker registered', { 
        scope: registration.scope 
      });

      // Handle updates
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }

        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New content available
              offlineStorage.log('New content available');
              if (config?.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              // Content cached for offline
              offlineStorage.log('Content cached for offline use');
              if (config?.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        };
      };
    })
    .catch(error => {
      offlineStorage.log('Service Worker registration failed', error);
      if (config?.onError) {
        config.onError(error);
      }
    });
}

/**
 * Check if service worker is valid
 */
function checkValidServiceWorker(swUrl: string, config?: ServiceWorkerConfig): void {
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' }
  })
    .then(response => {
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        // No service worker found
        navigator.serviceWorker.ready.then(registration => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        // Service worker found, register
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      offlineStorage.log('No internet connection found. App is running in offline mode.');
    });
}

/**
 * Unregister service worker
 */
export function unregister(): void {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then(registration => {
        registration.unregister();
        offlineStorage.log('Service Worker unregistered');
      })
      .catch(error => {
        offlineStorage.log('Service Worker unregister error', error);
      });
  }
}

/**
 * Check if running on localhost
 */
function isLocalhost(): boolean {
  return Boolean(
    window.location.hostname === 'localhost' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname.match(
      /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
    )
  );
}

/**
 * Request notification permission for updates
 */
export function requestNotificationPermission(): Promise<NotificationPermission> {
  if ('Notification' in window && Notification.permission === 'default') {
    return Notification.requestPermission();
  }
  return Promise.resolve(Notification.permission);
}

/**
 * Show update notification
 */
export function showUpdateNotification(): void {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Atualização Disponível', {
      body: 'Uma nova versão do aplicativo está disponível. Clique para atualizar.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'update-notification',
      requireInteraction: true
    });
  }
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<void> {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
  offlineStorage.log('All caches cleared');
}

/**
 * Get cache storage estimate
 */
export async function getCacheStorageEstimate(): Promise<{
  usage: number;
  quota: number;
  percentage: number;
}> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const percentage = quota > 0 ? (usage / quota) * 100 : 0;
    
    return { usage, quota, percentage };
  }
  
  return { usage: 0, quota: 0, percentage: 0 };
}

/**
 * Pre-cache important resources
 */
export async function preCacheResources(urls: string[]): Promise<void> {
  const cache = await caches.open(DYNAMIC_CACHE);
  await cache.addAll(urls);
  offlineStorage.log('Resources pre-cached', { count: urls.length });
}