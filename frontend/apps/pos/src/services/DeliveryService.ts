import { apiInterceptor } from './ApiInterceptor';
import { API_ENDPOINTS } from '../config/api';
import { requestCache } from './RequestCache';

// Types para Delivery
export interface DeliveryOrder {
  id: string;
  order_id: string;
  customer_id: string;
  address_id: string;
  courier_id?: string;
  status: DeliveryOrderStatus;
  delivery_fee: number;
  delivery_notes?: string;
  payment_on_delivery: boolean;
  payment_amount?: number;
  payment_method?: PaymentMethod;
  priority: DeliveryPriority;
  estimated_delivery_time?: string;
  actual_delivery_time?: string;
  created_at: string;
  updated_at: string;
}

export interface DeliveryOrderCreate {
  order_id: string;
  customer_id: string;
  address_id: string;
  delivery_fee: number;
  delivery_notes?: string;
  payment_on_delivery: boolean;
  payment_amount?: number;
  payment_method?: PaymentMethod;
  priority?: DeliveryPriority;
}

export interface DeliveryOrderUpdate {
  status?: DeliveryOrderStatus;
  courier_id?: string;
  delivery_notes?: string;
  estimated_delivery_time?: string;
  actual_delivery_time?: string;
}

export interface DeliveryCourier {
  id: string;
  name: string;
  phone: string;
  email?: string;
  vehicle_type: VehicleType;
  license_plate?: string;
  status: CourierStatus;
  current_location?: Location;
  is_active: boolean;
  rating: number;
  total_deliveries: number;
  created_at: string;
  updated_at: string;
}

export interface CourierCreate {
  name: string;
  phone: string;
  email?: string;
  vehicle_type: VehicleType;
  license_plate?: string;
}

export interface CourierUpdate {
  name?: string;
  phone?: string;
  email?: string;
  vehicle_type?: VehicleType;
  license_plate?: string;
  status?: CourierStatus;
  is_active?: boolean;
}

export interface DeliveryZone {
  id: string;
  name: string;
  description?: string;
  delivery_fee: number;
  estimated_time: number; // em minutos
  is_active: boolean;
  coordinates: Coordinate[];
  created_at: string;
  updated_at: string;
}

export interface DeliveryTracking {
  id: string;
  delivery_order_id: string;
  event_type: TrackingEventType;
  description: string;
  location?: Location;
  timestamp: string;
  courier_id?: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export enum DeliveryOrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  READY = 'ready',
  ASSIGNED = 'assigned',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  RETURNED = 'returned'
}

export enum CourierStatus {
  AVAILABLE = 'available',
  BUSY = 'busy',
  OFFLINE = 'offline',
  ON_BREAK = 'on_break'
}

export enum VehicleType {
  BIKE = 'bike',
  MOTORCYCLE = 'motorcycle',
  CAR = 'car',
  WALKING = 'walking'
}

export enum DeliveryPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  PIX = 'pix',
  PAID_ONLINE = 'paid_online'
}

export enum TrackingEventType {
  CREATED = 'created',
  CONFIRMED = 'confirmed',
  ASSIGNED = 'assigned',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  RETURNED = 'returned'
}

export class DeliveryService {
  /**
   * Lista todos os pedidos de delivery
   */
  async listDeliveryOrders(
    status?: DeliveryOrderStatus,
    courier_id?: string,
    date?: string
  ): Promise<DeliveryOrder[]> {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    if (courier_id) params.courier_id = courier_id;
    if (date) params.date = date;
    
    // Create cache key based on params
    const cacheKey = `delivery-orders-${JSON.stringify(params)}`;
    
    return requestCache.execute(
      cacheKey,
      async () => {
        const response = await apiInterceptor.get<DeliveryOrder[]>(API_ENDPOINTS.DELIVERY.LIST, { params });
        return response.data;
      },
      { ttl: 30000 } // Cache for 30 seconds
    );
  }

  /**
   * Busca um pedido de delivery por ID
   */
  async getDeliveryOrder(deliveryId: string): Promise<DeliveryOrder> {
    const response = await apiInterceptor.get<DeliveryOrder>(
      API_ENDPOINTS.DELIVERY.GET.replace(':id', deliveryId)
    );
    return response.data;
  }

  /**
   * Cria um novo pedido de delivery
   */
  async createDeliveryOrder(orderData: DeliveryOrderCreate): Promise<DeliveryOrder> {
    const response = await apiInterceptor.post<DeliveryOrder>(
      API_ENDPOINTS.DELIVERY.CREATE,
      orderData
    );
    return response.data;
  }

  /**
   * Atualiza um pedido de delivery
   */
  async updateDeliveryOrder(deliveryId: string, orderData: DeliveryOrderUpdate): Promise<DeliveryOrder> {
    const response = await apiInterceptor.put<DeliveryOrder>(
      API_ENDPOINTS.DELIVERY.UPDATE.replace(':id', deliveryId),
      orderData
    );
    return response.data;
  }

  /**
   * Cancela um pedido de delivery
   */
  async cancelDeliveryOrder(deliveryId: string, reason?: string): Promise<DeliveryOrder> {
    const response = await apiInterceptor.post<DeliveryOrder>(
      API_ENDPOINTS.DELIVERY.CANCEL.replace(':id', deliveryId),
      { reason }
    );
    return response.data;
  }

  /**
   * Atribui um entregador a um pedido
   */
  async assignCourier(deliveryId: string, courierId: string): Promise<DeliveryOrder> {
    const response = await apiInterceptor.post<DeliveryOrder>(
      API_ENDPOINTS.DELIVERY.ASSIGN.replace(':id', deliveryId),
      { courier_id: courierId }
    );
    // Invalidate related caches after assignment
    requestCache.invalidatePattern('delivery-orders');
    requestCache.invalidatePattern('delivery-couriers');
    return response.data;
  }

  /**
   * Inicia a entrega (entregador pegou o pedido)
   */
  async startDelivery(deliveryId: string): Promise<DeliveryOrder> {
    const response = await apiInterceptor.post<DeliveryOrder>(
      API_ENDPOINTS.DELIVERY.START.replace(':id', deliveryId)
    );
    // Invalidate cache after status change
    requestCache.invalidatePattern('delivery-orders');
    return response.data;
  }

  /**
   * Completa a entrega
   */
  async completeDelivery(deliveryId: string, notes?: string): Promise<DeliveryOrder> {
    const response = await apiInterceptor.post<DeliveryOrder>(
      API_ENDPOINTS.DELIVERY.COMPLETE.replace(':id', deliveryId),
      { notes }
    );
    // Invalidate cache after completion
    requestCache.invalidatePattern('delivery-orders');
    requestCache.invalidatePattern('delivery-couriers');
    return response.data;
  }

  /**
   * Lista todos os entregadores
   */
  async listCouriers(status?: CourierStatus, is_active?: boolean): Promise<DeliveryCourier[]> {
    const params: Record<string, string | boolean> = {};
    if (status) params.status = status;
    if (is_active !== undefined) params.is_active = is_active;
    
    // Create cache key based on params
    const cacheKey = `delivery-couriers-${JSON.stringify(params)}`;
    
    return requestCache.execute(
      cacheKey,
      async () => {
        const response = await apiInterceptor.get<DeliveryCourier[]>('/api/v1/delivery/couriers', { params });
        return response.data;
      },
      { ttl: 30000 } // Cache for 30 seconds
    );
  }

  /**
   * Cria um novo entregador
   */
  async createCourier(courierData: CourierCreate): Promise<DeliveryCourier> {
    const response = await apiInterceptor.post<DeliveryCourier>('/api/v1/delivery/couriers', courierData);
    // Invalidate cache after creating new courier
    requestCache.invalidatePattern('delivery-couriers');
    return response.data;
  }

  /**
   * Atualiza um entregador
   */
  async updateCourier(courierId: string, courierData: CourierUpdate): Promise<DeliveryCourier> {
    const response = await apiInterceptor.put<DeliveryCourier>(
      `/api/v1/delivery/couriers/${courierId}`,
      courierData
    );
    // Invalidate cache after updating courier
    requestCache.invalidatePattern('delivery-couriers');
    return response.data;
  }

  /**
   * Atualiza localização do entregador
   */
  async updateCourierLocation(courierId: string, location: Location): Promise<void> {
    await apiInterceptor.post(
      `/api/v1/delivery/couriers/${courierId}/location`,
      location
    );
  }

  /**
   * Busca entregadores disponíveis
   */
  async getAvailableCouriers(): Promise<DeliveryCourier[]> {
    return this.listCouriers(CourierStatus.AVAILABLE, true);
  }

  /**
   * Lista zonas de entrega
   */
  async listDeliveryZones(): Promise<DeliveryZone[]> {
    const response = await apiInterceptor.get<DeliveryZone[]>('/api/v1/delivery/zones');
    return response.data;
  }

  /**
   * Calcula taxa de entrega para um endereço
   */
  async calculateDeliveryFee(address: string): Promise<{ fee: number; zone_id: string; estimated_time: number }> {
    const response = await apiInterceptor.post<{ fee: number; zone_id: string; estimated_time: number }>('/api/v1/delivery/calculate-fee', { address });
    return response.data;
  }

  /**
   * Busca histórico de rastreamento de um pedido
   */
  async getDeliveryTracking(deliveryId: string): Promise<DeliveryTracking[]> {
    const response = await apiInterceptor.get<DeliveryTracking[]>(`/api/v1/delivery/${deliveryId}/tracking`);
    return response.data;
  }

  /**
   * Busca pedidos por status
   */
  async getDeliveryOrdersByStatus(status: DeliveryOrderStatus): Promise<DeliveryOrder[]> {
    return this.listDeliveryOrders(status);
  }

  /**
   * Busca pedidos de um entregador
   */
  async getCourierDeliveries(courierId: string, date?: string): Promise<DeliveryOrder[]> {
    return this.listDeliveryOrders(undefined, courierId, date);
  }
}

// Instância singleton do serviço
export const deliveryService = new DeliveryService();

