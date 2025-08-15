/**
 * Utilitário para registrar e gerenciar service worker
 */

export interface ServiceWorkerEvents {
  onInstalled?: () => void;
  onUpdated?: () => void;
  onOffline?: () => void;
  onOnline?: () => void;
  onSyncStart?: () => void;
  onSyncSuccess?: () => void;
  onSyncError?: (error: string) => void;
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private events: ServiceWorkerEvents = {};

  async register(swPath: string = '/service-worker.js', events: ServiceWorkerEvents = {}): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      console.warn('[SW Manager] Service Workers não suportados neste browser');
      return false;
    }

    this.events = events;

    try {
      this.registration = await navigator.serviceWorker.register(swPath, {
        scope: '/'
      });

      console.log('[SW Manager] Service Worker registrado:', this.registration.scope);

      // Configurar listeners
      this.setupEventListeners();

      // Verificar se há atualização disponível
      await this.checkForUpdates();

      return true;
    } catch (error) {
      console.error('[SW Manager] Falha ao registrar Service Worker:', error);
      return false;
    }
  }

  private setupEventListeners() {
    if (!this.registration) return;

    // Listener para instalação
    this.registration.addEventListener('updatefound', () => {
      const newWorker = this.registration!.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        switch (newWorker.state) {
          case 'installed':
            if (navigator.serviceWorker.controller) {
              // Nova versão disponível
              console.log('[SW Manager] Nova versão do Service Worker disponível');
              this.events.onUpdated?.();
            } else {
              // Primeira instalação
              console.log('[SW Manager] Service Worker instalado pela primeira vez');
              this.events.onInstalled?.();
            }
            break;
          case 'activated':
            console.log('[SW Manager] Service Worker ativado');
            break;
        }
      });
    });

    // Listener para mensagens do Service Worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, error } = event.data;

      switch (type) {
        case 'SYNC_START':
          console.log('[SW Manager] Sincronização iniciada');
          this.events.onSyncStart?.();
          break;
        case 'SYNC_SUCCESS':
          console.log('[SW Manager] Sincronização concluída com sucesso');
          this.events.onSyncSuccess?.();
          break;
        case 'SYNC_ERROR':
          console.error('[SW Manager] Erro na sincronização:', error);
          this.events.onSyncError?.(error);
          break;
      }
    });

    // Listeners para conectividade
    window.addEventListener('online', () => {
      console.log('[SW Manager] Conexão restabelecida');
      this.events.onOnline?.();
      this.requestSync();
    });

    window.addEventListener('offline', () => {
      console.log('[SW Manager] Conexão perdida');
      this.events.onOffline?.();
    });
  }

  async checkForUpdates(): Promise<boolean> {
    if (!this.registration) return false;

    try {
      await this.registration.update();
      return true;
    } catch (error) {
      console.error('[SW Manager] Erro ao verificar atualizações:', error);
      return false;
    }
  }

  async skipWaiting(): Promise<void> {
    if (!this.registration?.waiting) return;

    // Enviar mensagem para o service worker pular a espera
    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });

    // Aguardar ativação e recarregar página
    return new Promise((resolve) => {
      const handleControllerChange = () => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        window.location.reload();
        resolve();
      };

      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    });
  }

  async clearCaches(): Promise<boolean> {
    if (!this.registration?.active) return false;

    try {
      const messageChannel = new MessageChannel();
      
      return new Promise((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data.success);
        };

        this.registration!.active!.postMessage(
          { type: 'CACHE_CLEAR' },
          [messageChannel.port2]
        );
      });
    } catch (error) {
      console.error('[SW Manager] Erro ao limpar caches:', error);
      return false;
    }
  }

  async requestSync(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('sync' in window.ServiceWorkerRegistration.prototype)) {
      console.warn('[SW Manager] Background Sync não suportado');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register('sync-data');
      console.log('[SW Manager] Sincronização em background solicitada');
      return true;
    } catch (error) {
      console.error('[SW Manager] Erro ao solicitar sincronização:', error);
      return false;
    }
  }

  isSupported(): boolean {
    return 'serviceWorker' in navigator;
  }

  isRegistered(): boolean {
    return this.registration !== null;
  }

  getRegistration(): ServiceWorkerRegistration | null {
    return this.registration;
  }

  // Utilitário para detectar se está offline
  isOffline(): boolean {
    return !navigator.onLine;
  }

  // Utilitário para detectar se está em modo standalone (PWA)
  isStandalone(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           ('standalone' in window.navigator && (window.navigator as any).standalone);
  }
}

// Instância singleton
export const serviceWorkerManager = new ServiceWorkerManager();

// Hook React para facilitar uso
export function useServiceWorker(events: ServiceWorkerEvents = {}) {
  const register = async (swPath?: string) => {
    return await serviceWorkerManager.register(swPath, events);
  };

  return {
    register,
    skipWaiting: serviceWorkerManager.skipWaiting.bind(serviceWorkerManager),
    clearCaches: serviceWorkerManager.clearCaches.bind(serviceWorkerManager),
    checkForUpdates: serviceWorkerManager.checkForUpdates.bind(serviceWorkerManager),
    requestSync: serviceWorkerManager.requestSync.bind(serviceWorkerManager),
    isSupported: serviceWorkerManager.isSupported(),
    isRegistered: serviceWorkerManager.isRegistered(),
    isOffline: serviceWorkerManager.isOffline(),
    isStandalone: serviceWorkerManager.isStandalone()
  };
}