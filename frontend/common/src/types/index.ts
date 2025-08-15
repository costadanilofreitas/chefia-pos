/**
 * Índice principal dos tipos do backend
 */

export * from './backend-types';

// Re-export dos tipos mais utilizados
export type {
  Order,
  OrderCreate,
  OrderItem,
  OrderItemCreate,
  Customer,
  APIResponse,
  PaginatedResponse
} from './backend-types';

export {
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  OrderType
} from './backend-types';
