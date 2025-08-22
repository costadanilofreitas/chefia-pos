/**
 * Serviço de notificações push e alertas
 */

import eventBus from '../utils/EventBus';

// Tipos de notificação
export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'order' | 'payment' | 'alert';

// Prioridade de notificação
export enum NotificationPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3
}

// Interface de notificação
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  timestamp: Date;
  read: boolean;
  persistent: boolean;
  actions?: NotificationAction[];
  data?: any;
  sound?: boolean;
  vibrate?: boolean;
  icon?: string;
  image?: string;
  badge?: string;
  tag?: string;
}

// Ações de notificação
export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

// Configuração de notificações
interface NotificationConfig {
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
  desktop: boolean;
  inApp: boolean;
  persistent: boolean;
  groupByType: boolean;
  maxNotifications: number;
  priorities: {
    [key in NotificationType]: NotificationPriority;
  };
}

// Sons de notificação
const NOTIFICATION_SOUNDS = {
  success: '/sounds/success.mp3',
  error: '/sounds/error.mp3',
  warning: '/sounds/warning.mp3',
  info: '/sounds/info.mp3',
  order: '/sounds/order.mp3',
  payment: '/sounds/payment.mp3',
  alert: '/sounds/alert.mp3'
};

class NotificationService {
  private eventBus = eventBus;
  private notifications: Notification[] = [];
  private permission: NotificationPermission = 'default';
  private audioContext: AudioContext | null = null;
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  
  // Configuração
  private config: NotificationConfig = {
    enabled: true,
    sound: true,
    vibration: true,
    desktop: true,
    inApp: true,
    persistent: true,
    groupByType: true,
    maxNotifications: 50,
    priorities: {
      success: NotificationPriority.NORMAL,
      error: NotificationPriority.HIGH,
      warning: NotificationPriority.HIGH,
      info: NotificationPriority.LOW,
      order: NotificationPriority.HIGH,
      payment: NotificationPriority.CRITICAL,
      alert: NotificationPriority.CRITICAL
    }
  };

  constructor() {
    this.init();
  }

  /**
   * Inicializa o serviço
   */
  private async init() {
    // Solicita permissão
    await this.requestPermission();
    
    // Inicializa áudio
    this.initAudio();
    
    // Registra service worker
    await this.registerServiceWorker();
    
    // Configura listeners
    this.setupEventListeners();
    
    // Carrega notificações persistentes
    this.loadPersistedNotifications();
    
    console.log('🔔 Serviço de notificações inicializado');
  }

  /**
   * Solicita permissão para notificações
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Este navegador não suporta notificações desktop');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.permission = 'granted';
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission === 'granted';
    }

    return false;
  }

  /**
   * Inicializa contexto de áudio
   */
  private initAudio() {
    if ('AudioContext' in window || 'webkitAudioContext' in window) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Pré-carrega sons
      Object.entries(NOTIFICATION_SOUNDS).forEach(([type, url]) => {
        this.preloadSound(url);
      });
    }
  }

  /**
   * Pré-carrega som
   */
  private async preloadSound(url: string) {
    if (!this.audioContext) return;
    
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.audioBuffers.set(url, audioBuffer);
    } catch (error) {
      console.warn(`Erro ao carregar som: ${url}`, error);
    }
  }

  /**
   * Registra service worker
   */
  private async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        this.serviceWorkerRegistration = await navigator.serviceWorker.ready;
        
        // Escuta mensagens do service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data.type === 'notification-click') {
            this.handleNotificationClick(event.data.notificationId, event.data.action);
          }
        });
      } catch (error) {
        console.error('Erro ao registrar service worker:', error);
      }
    }
  }

  /**
   * Configura listeners de eventos
   */
  private setupEventListeners() {
    // Eventos de pedidos
    this.eventBus.on('order:new', (order: any) => {
      this.notify({
        type: 'order',
        title: 'Novo Pedido',
        message: `Pedido #${order.id} recebido - ${order.items.length} itens`,
        priority: NotificationPriority.HIGH,
        sound: true,
        vibrate: true,
        data: order
      });
    });

    // Eventos de pagamento
    this.eventBus.on('payment:received', (payment: any) => {
      this.notify({
        type: 'payment',
        title: 'Pagamento Recebido',
        message: `Pagamento de R$ ${payment.amount.toFixed(2)} confirmado`,
        priority: NotificationPriority.CRITICAL,
        sound: true,
        vibrate: true,
        data: payment
      });
    });

    // Eventos de erro
    this.eventBus.on('error:critical', (error: any) => {
      this.notify({
        type: 'error',
        title: 'Erro Crítico',
        message: error.message || 'Ocorreu um erro crítico no sistema',
        priority: NotificationPriority.CRITICAL,
        sound: true,
        persistent: true,
        data: error
      });
    });

    // Eventos de alerta
    this.eventBus.on('alert:stock-low', (product: any) => {
      this.notify({
        type: 'warning',
        title: 'Estoque Baixo',
        message: `${product.name} está com estoque baixo (${product.quantity} unidades)`,
        priority: NotificationPriority.HIGH,
        persistent: true,
        data: product,
        actions: [
          { action: 'order', title: 'Fazer Pedido' },
          { action: 'ignore', title: 'Ignorar' }
        ]
      });
    });
  }

  /**
   * Envia notificação
   */
  async notify(options: Partial<Notification>): Promise<Notification> {
    if (!this.config.enabled) return this.createNotification(options);

    const notification = this.createNotification(options);
    
    // Adiciona à lista
    this.notifications.unshift(notification);
    this.trimNotifications();
    
    // Persiste se necessário
    if (notification.persistent) {
      this.persistNotification(notification);
    }
    
    // Notificação in-app
    if (this.config.inApp) {
      this.showInAppNotification(notification);
    }
    
    // Notificação desktop
    if (this.config.desktop && this.permission === 'granted') {
      await this.showDesktopNotification(notification);
    }
    
    // Som
    if (this.config.sound && notification.sound) {
      this.playSound(notification.type);
    }
    
    // Vibração
    if (this.config.vibration && notification.vibrate && 'vibrate' in navigator) {
      this.vibrate(notification.priority);
    }
    
    // Emite evento
    this.eventBus.emit('notification:new', notification);
    
    return notification;
  }

  /**
   * Cria objeto de notificação
   */
  private createNotification(options: Partial<Notification>): Notification {
    return {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: options.type || 'info',
      title: options.title || 'Notificação',
      message: options.message || '',
      priority: options.priority || this.config.priorities[options.type || 'info'],
      timestamp: new Date(),
      read: false,
      persistent: options.persistent || false,
      actions: options.actions,
      data: options.data,
      sound: options.sound !== undefined ? options.sound : this.config.sound,
      vibrate: options.vibrate !== undefined ? options.vibrate : this.config.vibration,
      icon: options.icon || this.getIcon(options.type || 'info'),
      image: options.image,
      badge: options.badge,
      tag: options.tag || options.type
    };
  }

  /**
   * Mostra notificação in-app
   */
  private showInAppNotification(notification: Notification) {
    this.eventBus.emit('notification:show-in-app', notification);
  }

  /**
   * Mostra notificação desktop
   */
  private async showDesktopNotification(notification: Notification) {
    if (!this.serviceWorkerRegistration) {
      // Fallback para API de notificação básica
      new Notification(notification.title, {
        body: notification.message,
        icon: notification.icon,
        badge: notification.badge,
        tag: notification.tag,
        requireInteraction: notification.priority >= NotificationPriority.HIGH,
        silent: !notification.sound,
        // vibrate is not standard but supported in some browsers
        ...(notification.vibrate ? { vibrate: this.getVibrationPattern(notification.priority) } as any : {}),
        data: {
          notificationId: notification.id,
          ...notification.data
        }
      });
    } else {
      // Usa service worker para notificações mais avançadas
      await this.serviceWorkerRegistration.showNotification(notification.title, {
        body: notification.message,
        icon: notification.icon,
        badge: notification.badge,
        tag: notification.tag,
        // image is not standard but supported in some browsers
        ...(notification.image ? { image: notification.image } as any : {}),
        requireInteraction: notification.priority >= NotificationPriority.HIGH,
        silent: !notification.sound,
        // vibrate is not standard but supported in some browsers
        ...(notification.vibrate ? { vibrate: this.getVibrationPattern(notification.priority) } as any : {}),
        actions: notification.actions,
        data: {
          notificationId: notification.id,
          ...notification.data
        }
      });
    }
  }

  /**
   * Toca som de notificação
   */
  private playSound(type: NotificationType) {
    if (!this.audioContext) return;
    
    const soundUrl = NOTIFICATION_SOUNDS[type];
    const buffer = this.audioBuffers.get(soundUrl);
    
    if (buffer) {
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.start();
    } else {
      // Fallback para Audio API
      const audio = new Audio(soundUrl);
      audio.play().catch(error => {
        console.warn('Erro ao tocar som:', error);
      });
    }
  }

  /**
   * Vibra dispositivo
   */
  private vibrate(priority: NotificationPriority) {
    if ('vibrate' in navigator) {
      navigator.vibrate(this.getVibrationPattern(priority));
    }
  }

  /**
   * Obtém padrão de vibração baseado na prioridade
   */
  private getVibrationPattern(priority: NotificationPriority): number[] {
    switch (priority) {
      case NotificationPriority.LOW:
        return [100];
      case NotificationPriority.NORMAL:
        return [200];
      case NotificationPriority.HIGH:
        return [100, 50, 100];
      case NotificationPriority.CRITICAL:
        return [100, 50, 100, 50, 200];
      default:
        return [200];
    }
  }

  /**
   * Obtém ícone baseado no tipo
   */
  private getIcon(type: NotificationType): string {
    const icons = {
      success: '/icons/success.png',
      error: '/icons/error.png',
      warning: '/icons/warning.png',
      info: '/icons/info.png',
      order: '/icons/order.png',
      payment: '/icons/payment.png',
      alert: '/icons/alert.png'
    };
    
    return icons[type] || '/icons/default.png';
  }

  /**
   * Limita número de notificações
   */
  private trimNotifications() {
    if (this.notifications.length > this.config.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.config.maxNotifications);
    }
  }

  /**
   * Persiste notificação
   */
  private persistNotification(notification: Notification) {
    try {
      const stored = localStorage.getItem('notifications') || '[]';
      const notifications = JSON.parse(stored);
      notifications.unshift(notification);
      
      // Limita notificações armazenadas
      if (notifications.length > this.config.maxNotifications) {
        notifications.length = this.config.maxNotifications;
      }
      
      localStorage.setItem('notifications', JSON.stringify(notifications));
    } catch (error) {
      console.error('Erro ao persistir notificação:', error);
    }
  }

  /**
   * Carrega notificações persistidas
   */
  private loadPersistedNotifications() {
    try {
      const stored = localStorage.getItem('notifications');
      if (stored) {
        const notifications = JSON.parse(stored);
        this.notifications = notifications.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    }
  }

  /**
   * Marca notificação como lida
   */
  markAsRead(notificationId: string) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.eventBus.emit('notification:read', notification);
      
      // Atualiza persistência
      if (notification.persistent) {
        this.persistNotifications();
      }
    }
  }

  /**
   * Marca todas como lidas
   */
  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.eventBus.emit('notification:all-read');
    this.persistNotifications();
  }

  /**
   * Remove notificação
   */
  removeNotification(notificationId: string) {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.eventBus.emit('notification:removed', notificationId);
    this.persistNotifications();
  }

  /**
   * Limpa todas as notificações
   */
  clearAll() {
    this.notifications = [];
    this.eventBus.emit('notification:cleared');
    localStorage.removeItem('notifications');
  }

  /**
   * Persiste todas as notificações
   */
  private persistNotifications() {
    try {
      const persistent = this.notifications.filter(n => n.persistent);
      localStorage.setItem('notifications', JSON.stringify(persistent));
    } catch (error) {
      console.error('Erro ao persistir notificações:', error);
    }
  }

  /**
   * Lida com clique em notificação
   */
  private handleNotificationClick(notificationId: string, action?: string) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      this.markAsRead(notificationId);
      this.eventBus.emit('notification:click', { notification, action });
    }
  }

  /**
   * Obtém notificações
   */
  getNotifications(filter?: { type?: NotificationType; unreadOnly?: boolean }): Notification[] {
    let filtered = [...this.notifications];
    
    if (filter?.type) {
      filtered = filtered.filter(n => n.type === filter.type);
    }
    
    if (filter?.unreadOnly) {
      filtered = filtered.filter(n => !n.read);
    }
    
    return filtered;
  }

  /**
   * Conta notificações não lidas
   */
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  /**
   * Atualiza configuração
   */
  updateConfig(config: Partial<NotificationConfig>) {
    this.config = { ...this.config, ...config };
    this.eventBus.emit('notification:config-updated', this.config);
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.audioBuffers.clear();
    this.notifications = [];
  }
}

// Singleton
const notificationService = new NotificationService();
export default notificationService;