/**
 * Simple Event Bus for decoupled communication between components
 */

type EventCallback = (...args: unknown[]) => void;

class EventBus {
  private readonly events: Map<string, EventCallback[]> = new Map();

  /**
   * Subscribe to an event
   */
  on(event: string, callback: EventCallback): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event).push(callback);
  }

  /**
   * Unsubscribe from an event
   */
  off(event: string, callback: EventCallback): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emit an event
   */
  emit(event: string, ...args: unknown[]): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(...args);
        } catch {
          // Silent fail to prevent one listener from breaking others
        }
      });
    }
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }
}

// Export singleton instance
const eventBus = new EventBus();
export default eventBus;
