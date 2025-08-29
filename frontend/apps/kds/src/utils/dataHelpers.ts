/**
 * Data Helper Utilities
 * Shared functions for data manipulation and transformations
 */

/**
 * Calculate minutes elapsed from a given date
 */
export const getMinutesElapsed = (date: string | Date): number => {
  const timestamp = new Date(date).getTime();
  return Math.floor((Date.now() - timestamp) / 60000);
};

/**
 * Format time for display
 */
export const formatTime = (date: Date | string): string => {
  return new Date(date).toLocaleTimeString();
};

/**
 * Filter items by status
 */
export const filterByStatus = <T extends { status: string }>(
  items: T[],
  status: string
): T[] => items.filter(item => item.status === status);

/**
 * Count items by status
 */
export const countByStatus = <T extends { status: string }>(
  items: T[],
  status: string
): number => filterByStatus(items, status).length;

/**
 * Group items by a key
 */
export const groupBy = <T, K extends keyof T>(
  items: T[],
  key: K
): Record<string, T[]> => {
  return items.reduce((acc, item) => {
    const groupKey = String(item[key]);
    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    acc[groupKey].push(item);
    return acc;
  }, {} as Record<string, T[]>);
};

/**
 * Check if an item is delayed based on threshold
 */
export const isDelayed = (
  createdAt: string | Date, 
  thresholdMinutes: number,
  status: string = 'pending'
): boolean => {
  if (status !== 'pending') return false;
  return getMinutesElapsed(createdAt) > thresholdMinutes;
};

/**
 * Safe array update by ID
 */
export const updateItemInArray = <T extends { id: string | number }>(
  items: T[],
  id: string | number,
  updates: Partial<T>
): T[] => {
  return items.map(item => 
    item.id === id ? { ...item, ...updates } : item
  );
};

/**
 * Safe array upsert (update or insert)
 */
export const upsertItemInArray = <T extends { id: string | number }>(
  items: T[],
  newItem: T
): T[] => {
  const exists = items.some(item => item.id === newItem.id);
  if (exists) {
    return updateItemInArray(items, newItem.id, newItem);
  }
  return [...items, newItem];
};

/**
 * Find new items by comparing arrays
 */
export const findNewItems = <T extends { id: string | number }>(
  currentItems: T[],
  previousItems: T[]
): T[] => {
  return currentItems.filter(
    current => !previousItems.some(prev => prev.id === current.id)
  );
};

/**
 * Batch async operations with error handling
 */
export const batchAsync = async <T>(
  items: T[],
  operation: (item: T) => Promise<void>,
  onError?: (error: Error, item: T) => void
): Promise<void> => {
  const promises = items.map(async item => {
    try {
      await operation(item);
    } catch (error) {
      onError?.(error as Error, item);
    }
  });
  await Promise.all(promises);
};