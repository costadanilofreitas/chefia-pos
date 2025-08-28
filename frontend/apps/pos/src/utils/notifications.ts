/**
 * Notification utilities to replace browser alerts and confirms
 * Uses toast-like notifications for better UX
 */

import { offlineStorage } from '../services/OfflineStorage';

export interface NotificationOptions {
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  position?: 'top' | 'bottom' | 'center';
}

class NotificationManager {
  private container: HTMLDivElement | null = null;
  private queue: Array<{ message: string; options: NotificationOptions }> = [];
  private isShowing = false;

  constructor() {
    this.ensureContainer();
  }

  private ensureContainer() {
    if (typeof window === 'undefined') return;
    
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'notification-container';
      this.container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        pointer-events: none;
      `;
      document.body.appendChild(this.container);
    }
  }

  show(message: string, options: NotificationOptions = {}) {
    const { type = 'info', duration = 3000, position = 'top' } = options;
    
    this.queue.push({ message, options });
    this.processQueue();
    
    // Log notification
    offlineStorage.log('info', `Notification shown: ${message}`, { type });
  }

  private async processQueue() {
    if (this.isShowing || this.queue.length === 0) return;
    
    this.isShowing = true;
    const { message, options } = this.queue.shift()!;
    
    await this.showNotification(message, options);
    this.isShowing = false;
    
    // Process next in queue
    if (this.queue.length > 0) {
      setTimeout(() => this.processQueue(), 300);
    }
  }

  private showNotification(message: string, options: NotificationOptions) {
    return new Promise<void>((resolve) => {
      const { type = 'info', duration = 3000 } = options;
      
      const notification = document.createElement('div');
      notification.className = `notification notification-${type}`;
      notification.style.cssText = `
        background: ${this.getBackgroundColor(type)};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        margin-bottom: 10px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        pointer-events: auto;
        cursor: pointer;
        transition: opacity 0.3s, transform 0.3s;
        transform: translateX(400px);
        max-width: 350px;
        word-wrap: break-word;
        font-size: 14px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 10px;
      `;
      
      // Add icon based on type
      const icon = document.createElement('span');
      icon.innerHTML = this.getIcon(type);
      icon.style.fontSize = '18px';
      notification.appendChild(icon);
      
      // Add message
      const text = document.createElement('span');
      text.textContent = message;
      notification.appendChild(text);
      
      // Click to dismiss
      notification.onclick = () => {
        this.dismissNotification(notification, resolve);
      };
      
      this.container?.appendChild(notification);
      
      // Animate in
      setTimeout(() => {
        notification.style.transform = 'translateX(0)';
      }, 10);
      
      // Auto dismiss
      if (duration > 0) {
        setTimeout(() => {
          this.dismissNotification(notification, resolve);
        }, duration);
      }
    });
  }

  private dismissNotification(notification: HTMLElement, callback: () => void) {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(400px)';
    
    setTimeout(() => {
      notification.remove();
      callback();
    }, 300);
  }

  private getBackgroundColor(type: string): string {
    switch (type) {
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'info': return '#3b82f6';
      default: return '#6b7280';
    }
  }

  private getIcon(type: string): string {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✕';
      case 'warning': return '⚠';
      case 'info': return 'ℹ';
      default: return 'ℹ';
    }
  }

  async confirm(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'confirm-modal';
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      `;
      
      const dialog = document.createElement('div');
      dialog.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 20px 25px rgba(0, 0, 0, 0.15);
      `;
      
      const messageEl = document.createElement('p');
      messageEl.textContent = message;
      messageEl.style.cssText = `
        margin: 0 0 24px 0;
        font-size: 16px;
        color: #1f2937;
        line-height: 1.5;
      `;
      
      const buttons = document.createElement('div');
      buttons.style.cssText = `
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      `;
      
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancelar';
      cancelBtn.style.cssText = `
        padding: 8px 16px;
        border: 1px solid #d1d5db;
        background: white;
        color: #374151;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        min-width: 80px;
      `;
      
      const confirmBtn = document.createElement('button');
      confirmBtn.textContent = 'Confirmar';
      confirmBtn.style.cssText = `
        padding: 8px 16px;
        border: none;
        background: #3b82f6;
        color: white;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        min-width: 80px;
      `;
      
      cancelBtn.onclick = () => {
        modal.remove();
        resolve(false);
      };
      
      confirmBtn.onclick = () => {
        modal.remove();
        resolve(true);
      };
      
      buttons.appendChild(cancelBtn);
      buttons.appendChild(confirmBtn);
      
      dialog.appendChild(messageEl);
      dialog.appendChild(buttons);
      modal.appendChild(dialog);
      
      document.body.appendChild(modal);
      
      // Focus confirm button for keyboard navigation
      confirmBtn.focus();
      
      // Log confirmation dialog
      offlineStorage.log('info', 'Confirmation dialog shown', { message });
    });
  }
}

// Create singleton instance
export const notification = new NotificationManager();

// Shorthand methods
export const showSuccess = (message: string, duration?: number) => 
  notification.show(message, { type: 'success', duration });

export const showError = (message: string, duration?: number) => 
  notification.show(message, { type: 'error', duration });

export const showWarning = (message: string, duration?: number) => 
  notification.show(message, { type: 'warning', duration });

export const showInfo = (message: string, duration?: number) => 
  notification.show(message, { type: 'info', duration });

export const confirmAction = (message: string) => 
  notification.confirm(message);