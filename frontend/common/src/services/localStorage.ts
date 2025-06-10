/**
 * LocalStorage service for managing client-side data persistence
 */
export class LocalStorageService {
  /**
   * Set an item in local storage
   * @param key - Storage key
   * @param value - Value to store (will be JSON stringified)
   */
  static setItem(key: string, value: any): void {
    try {
      const serializedValue = JSON.stringify(value);
      localStorage.setItem(key, serializedValue);
    } catch (error) {
      console.error('Error setting localStorage item:', error);
    }
  }

  /**
   * Get an item from local storage
   * @param key - Storage key
   * @param defaultValue - Default value if key doesn't exist
   * @returns The stored value or defaultValue if not found
   */
  static getItem<T>(key: string, defaultValue: T | null = null): T | null {
    try {
      const serializedValue = localStorage.getItem(key);
      if (serializedValue === null) {
        return defaultValue;
      }
      return JSON.parse(serializedValue);
    } catch (error) {
      console.error('Error getting localStorage item:', error);
      return defaultValue;
    }
  }

  /**
   * Remove an item from local storage
   * @param key - Storage key
   */
  static removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing localStorage item:', error);
    }
  }

  /**
   * Clear all items from local storage
   */
  static clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }

  /**
   * Get all keys in local storage
   * @returns Array of storage keys
   */
  static getAllKeys(): string[] {
    try {
      return Object.keys(localStorage);
    } catch (error) {
      console.error('Error getting localStorage keys:', error);
      return [];
    }
  }
}
