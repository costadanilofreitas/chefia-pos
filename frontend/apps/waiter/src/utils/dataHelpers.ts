/**
 * Data Helper Utilities for Waiter Module
 * Shared functions for data manipulation and transformations
 */

/**
 * Status badge configuration
 */
export const getStatusConfig = (status: string) => {
  const configs: Record<string, { variant: string; label: string }> = {
    available: { variant: 'success', label: 'Disponível' },
    occupied: { variant: 'warning', label: 'Ocupada' },
    reserved: { variant: 'info', label: 'Reservada' },
    pending: { variant: 'warning', label: 'Pendente' },
    preparing: { variant: 'info', label: 'Em preparo' },
    ready: { variant: 'success', label: 'Pronto' },
    delivered: { variant: 'default', label: 'Entregue' },
    paid: { variant: 'success', label: 'Pago' },
    cancelled: { variant: 'danger', label: 'Cancelado' },
  };
  return configs[status] || { variant: 'default', label: status };
};

/**
 * Filter items by property value
 */
export const filterBy = <T>(
  items: T[],
  property: keyof T,
  value: any
): T[] => items.filter(item => item[property] === value);

/**
 * Count items by property value
 */
export const countBy = <T>(
  items: T[],
  property: keyof T,
  value: any
): number => filterBy(items, property, value).length;

/**
 * Calculate total from items with price and quantity
 */
export const calculateTotal = <T extends { price: number; quantity: number }>(
  items: T[]
): number => {
  return items.reduce((total, item) => total + (item.price * item.quantity), 0);
};

/**
 * Format currency
 */
export const formatCurrency = (value: number): string => {
  return `R$ ${value.toFixed(2)}`;
};

/**
 * Group items by a property
 */
export const groupByProperty = <T, K extends keyof T>(
  items: T[],
  key: K
): Map<T[K], T[]> => {
  const map = new Map<T[K], T[]>();
  items.forEach(item => {
    const groupKey = item[key];
    const group = map.get(groupKey) || [];
    group.push(item);
    map.set(groupKey, group);
  });
  return map;
};

/**
 * Safe update item in array
 */
export const updateItemById = <T extends { id: number | string }>(
  items: T[],
  id: number | string,
  updates: Partial<T>
): T[] => {
  return items.map(item => 
    item.id === id ? { ...item, ...updates } : item
  );
};

/**
 * Upsert item in array
 */
export const upsertItem = <T extends { id: number | string }>(
  items: T[],
  newItem: T
): T[] => {
  const index = items.findIndex(item => item.id === newItem.id);
  if (index >= 0) {
    return [
      ...items.slice(0, index),
      newItem,
      ...items.slice(index + 1)
    ];
  }
  return [...items, newItem];
};

/**
 * Check if any item has a specific status
 */
export const hasItemWithStatus = <T extends { status: string }>(
  items: T[],
  status: string
): boolean => {
  return items.some(item => item.status === status);
};

/**
 * Get items with specific status
 */
export const getItemsWithStatus = <T extends { status: string }>(
  items: T[],
  status: string
): T[] => {
  return items.filter(item => item.status === status);
};

/**
 * Create optimistic update helper
 */
export const createOptimisticUpdate = <T>(
  setState: React.Dispatch<React.SetStateAction<T>>,
  updateFn: (prev: T) => T,
  rollbackFn?: (prev: T) => T
) => {
  let previousState: T;
  
  return {
    apply: () => {
      setState(prev => {
        previousState = prev;
        return updateFn(prev);
      });
    },
    rollback: () => {
      if (rollbackFn) {
        setState(rollbackFn);
      } else if (previousState !== undefined) {
        setState(previousState);
      }
    }
  };
};