/**
 * Notification service for displaying user notifications
 */
export class NotificationService {
  /**
   * Show a success notification
   * @param message - Notification message
   * @param duration - Duration in milliseconds
   */
  static success(message: string, duration: number = 3000): void {
    NotificationService.showNotification('success', message, duration);
  }

  /**
   * Show an error notification
   * @param message - Notification message
   * @param duration - Duration in milliseconds
   */
  static error(message: string, duration: number = 5000): void {
    NotificationService.showNotification('error', message, duration);
  }

  /**
   * Show a warning notification
   * @param message - Notification message
   * @param duration - Duration in milliseconds
   */
  static warning(message: string, duration: number = 4000): void {
    NotificationService.showNotification('warning', message, duration);
  }

  /**
   * Show an info notification
   * @param message - Notification message
   * @param duration - Duration in milliseconds
   */
  static info(message: string, duration: number = 3000): void {
    NotificationService.showNotification('info', message, duration);
  }

  /**
   * Show a notification with custom options
   * @param type - Notification type
   * @param message - Notification message
   * @param duration - Duration in milliseconds
   */
  private static showNotification(type: 'success' | 'error' | 'warning' | 'info', message: string, duration: number): void {
    // This is a placeholder implementation
    // In a real application, this would use a UI library like Material-UI Snackbar, react-toastify, etc.
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Dispatch a custom event that can be listened to by notification components
    const event = new CustomEvent('pos-notification', {
      detail: {
        type,
        message,
        duration
      }
    });
    
    document.dispatchEvent(event);
  }
}
