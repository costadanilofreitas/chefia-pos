import { useState, useEffect, useCallback } from 'react';
import { 
  deliveryService, 
  DeliveryOrder, 
  DeliveryOrderCreate, 
  DeliveryOrderUpdate,
  DeliveryOrderStatus,
  DeliveryCourier,
  CourierCreate,
  CourierUpdate,
  CourierStatus,
  DeliveryZone,
  DeliveryTracking,
  Location
} from '../services/DeliveryService';

interface UseDeliveryState {
  deliveryOrders: DeliveryOrder[];
  couriers: DeliveryCourier[];
  zones: DeliveryZone[];
  currentDelivery: DeliveryOrder | null;
  currentCourier: DeliveryCourier | null;
  tracking: DeliveryTracking[];
  loading: boolean;
  creating: boolean;
  updating: boolean;
  assigning: boolean;
  error: string | null;
}

interface UseDeliveryActions {
  // Delivery Orders CRUD
  loadDeliveryOrders: (status?: DeliveryOrderStatus, courierId?: string, date?: string) => Promise<void>;
  getDeliveryOrder: (deliveryId: string) => Promise<DeliveryOrder | null>;
  createDeliveryOrder: (orderData: DeliveryOrderCreate) => Promise<DeliveryOrder | null>;
  updateDeliveryOrder: (deliveryId: string, orderData: DeliveryOrderUpdate) => Promise<DeliveryOrder | null>;
  cancelDeliveryOrder: (deliveryId: string, reason?: string) => Promise<DeliveryOrder | null>;
  
  // Delivery Operations
  assignCourier: (deliveryId: string, courierId: string) => Promise<DeliveryOrder | null>;
  startDelivery: (deliveryId: string) => Promise<DeliveryOrder | null>;
  completeDelivery: (deliveryId: string, notes?: string) => Promise<DeliveryOrder | null>;
  
  // Couriers Management
  loadCouriers: (status?: CourierStatus, isActive?: boolean) => Promise<void>;
  createCourier: (courierData: CourierCreate) => Promise<DeliveryCourier | null>;
  updateCourier: (courierId: string, courierData: CourierUpdate) => Promise<DeliveryCourier | null>;
  updateCourierLocation: (courierId: string, location: Location) => Promise<boolean>;
  getAvailableCouriers: () => Promise<DeliveryCourier[]>;
  
  // Zones and Calculations
  loadDeliveryZones: () => Promise<void>;
  calculateDeliveryFee: (address: string) => Promise<{ fee: number; zone_id: string; estimated_time: number } | null>;
  
  // Tracking
  loadDeliveryTracking: (deliveryId: string) => Promise<void>;
  
  // Filters and Search
  getDeliveryOrdersByStatus: (status: DeliveryOrderStatus) => Promise<DeliveryOrder[]>;
  getCourierDeliveries: (courierId: string, date?: string) => Promise<DeliveryOrder[]>;
  
  // State Management
  setCurrentDelivery: (delivery: DeliveryOrder | null) => void;
  setCurrentCourier: (courier: DeliveryCourier | null) => void;
  clearError: () => void;
  refreshDeliveryOrders: () => Promise<void>;
  refreshCouriers: () => Promise<void>;
}

export const useDelivery = (): UseDeliveryState & UseDeliveryActions => {
  const [state, setState] = useState<UseDeliveryState>({
    deliveryOrders: [],
    couriers: [],
    zones: [],
    currentDelivery: null,
    currentCourier: null,
    tracking: [],
    loading: false,
    creating: false,
    updating: false,
    assigning: false,
    error: null
  });

  // Load delivery orders with filters
  const loadDeliveryOrders = useCallback(async (
    status?: DeliveryOrderStatus,
    courierId?: string,
    date?: string
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const deliveryOrders = await deliveryService.listDeliveryOrders(status, courierId, date);
      setState(prev => ({ 
        ...prev, 
        deliveryOrders,
        loading: false 
      }));
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message || 'Erro ao carregar pedidos de entrega' 
      }));
    }
  }, []);

  // Get specific delivery order
  const getDeliveryOrder = useCallback(async (deliveryId: string): Promise<DeliveryOrder | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const delivery = await deliveryService.getDeliveryOrder(deliveryId);
      setState(prev => ({ 
        ...prev, 
        currentDelivery: delivery,
        loading: false 
      }));
      return delivery;
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message || 'Erro ao buscar pedido de entrega' 
      }));
      return null;
    }
  }, []);

  // Create new delivery order
  const createDeliveryOrder = useCallback(async (orderData: DeliveryOrderCreate): Promise<DeliveryOrder | null> => {
    setState(prev => ({ ...prev, creating: true, error: null }));
    
    try {
      const newDelivery = await deliveryService.createDeliveryOrder(orderData);
      setState(prev => ({ 
        ...prev, 
        deliveryOrders: [...prev.deliveryOrders, newDelivery],
        creating: false 
      }));
      return newDelivery;
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        creating: false, 
        error: error.message || 'Erro ao criar pedido de entrega' 
      }));
      return null;
    }
  }, []);

  // Update delivery order
  const updateDeliveryOrder = useCallback(async (
    deliveryId: string, 
    orderData: DeliveryOrderUpdate
  ): Promise<DeliveryOrder | null> => {
    setState(prev => ({ ...prev, updating: true, error: null }));
    
    try {
      const updatedDelivery = await deliveryService.updateDeliveryOrder(deliveryId, orderData);
      setState(prev => ({ 
        ...prev, 
        deliveryOrders: prev.deliveryOrders.map(d => d.id === deliveryId ? updatedDelivery : d),
        currentDelivery: prev.currentDelivery?.id === deliveryId ? updatedDelivery : prev.currentDelivery,
        updating: false 
      }));
      return updatedDelivery;
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        updating: false, 
        error: error.message || 'Erro ao atualizar pedido de entrega' 
      }));
      return null;
    }
  }, []);

  // Cancel delivery order
  const cancelDeliveryOrder = useCallback(async (deliveryId: string, reason?: string): Promise<DeliveryOrder | null> => {
    setState(prev => ({ ...prev, updating: true, error: null }));
    
    try {
      const cancelledDelivery = await deliveryService.cancelDeliveryOrder(deliveryId, reason);
      setState(prev => ({ 
        ...prev, 
        deliveryOrders: prev.deliveryOrders.map(d => d.id === deliveryId ? cancelledDelivery : d),
        currentDelivery: prev.currentDelivery?.id === deliveryId ? cancelledDelivery : prev.currentDelivery,
        updating: false 
      }));
      return cancelledDelivery;
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        updating: false, 
        error: error.message || 'Erro ao cancelar pedido de entrega' 
      }));
      return null;
    }
  }, []);

  // Assign courier to delivery
  const assignCourier = useCallback(async (deliveryId: string, courierId: string): Promise<DeliveryOrder | null> => {
    setState(prev => ({ ...prev, assigning: true, error: null }));
    
    try {
      const assignedDelivery = await deliveryService.assignCourier(deliveryId, courierId);
      setState(prev => ({ 
        ...prev, 
        deliveryOrders: prev.deliveryOrders.map(d => d.id === deliveryId ? assignedDelivery : d),
        currentDelivery: prev.currentDelivery?.id === deliveryId ? assignedDelivery : prev.currentDelivery,
        assigning: false 
      }));
      return assignedDelivery;
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        assigning: false, 
        error: error.message || 'Erro ao atribuir entregador' 
      }));
      return null;
    }
  }, []);

  // Start delivery
  const startDelivery = useCallback(async (deliveryId: string): Promise<DeliveryOrder | null> => {
    setState(prev => ({ ...prev, updating: true, error: null }));
    
    try {
      const startedDelivery = await deliveryService.startDelivery(deliveryId);
      setState(prev => ({ 
        ...prev, 
        deliveryOrders: prev.deliveryOrders.map(d => d.id === deliveryId ? startedDelivery : d),
        currentDelivery: prev.currentDelivery?.id === deliveryId ? startedDelivery : prev.currentDelivery,
        updating: false 
      }));
      return startedDelivery;
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        updating: false, 
        error: error.message || 'Erro ao iniciar entrega' 
      }));
      return null;
    }
  }, []);

  // Complete delivery
  const completeDelivery = useCallback(async (deliveryId: string, notes?: string): Promise<DeliveryOrder | null> => {
    setState(prev => ({ ...prev, updating: true, error: null }));
    
    try {
      const completedDelivery = await deliveryService.completeDelivery(deliveryId, notes);
      setState(prev => ({ 
        ...prev, 
        deliveryOrders: prev.deliveryOrders.map(d => d.id === deliveryId ? completedDelivery : d),
        currentDelivery: prev.currentDelivery?.id === deliveryId ? completedDelivery : prev.currentDelivery,
        updating: false 
      }));
      return completedDelivery;
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        updating: false, 
        error: error.message || 'Erro ao finalizar entrega' 
      }));
      return null;
    }
  }, []);

  // Load couriers
  const loadCouriers = useCallback(async (status?: CourierStatus, isActive?: boolean) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const couriers = await deliveryService.listCouriers(status, isActive);
      setState(prev => ({ 
        ...prev, 
        couriers,
        loading: false 
      }));
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message || 'Erro ao carregar entregadores' 
      }));
    }
  }, []);

  // Create courier
  const createCourier = useCallback(async (courierData: CourierCreate): Promise<DeliveryCourier | null> => {
    setState(prev => ({ ...prev, creating: true, error: null }));
    
    try {
      const newCourier = await deliveryService.createCourier(courierData);
      setState(prev => ({ 
        ...prev, 
        couriers: [...prev.couriers, newCourier],
        creating: false 
      }));
      return newCourier;
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        creating: false, 
        error: error.message || 'Erro ao criar entregador' 
      }));
      return null;
    }
  }, []);

  // Update courier
  const updateCourier = useCallback(async (
    courierId: string, 
    courierData: CourierUpdate
  ): Promise<DeliveryCourier | null> => {
    setState(prev => ({ ...prev, updating: true, error: null }));
    
    try {
      const updatedCourier = await deliveryService.updateCourier(courierId, courierData);
      setState(prev => ({ 
        ...prev, 
        couriers: prev.couriers.map(c => c.id === courierId ? updatedCourier : c),
        currentCourier: prev.currentCourier?.id === courierId ? updatedCourier : prev.currentCourier,
        updating: false 
      }));
      return updatedCourier;
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        updating: false, 
        error: error.message || 'Erro ao atualizar entregador' 
      }));
      return null;
    }
  }, []);

  // Update courier location
  const updateCourierLocation = useCallback(async (courierId: string, location: Location): Promise<boolean> => {
    setState(prev => ({ ...prev, error: null }));
    
    try {
      await deliveryService.updateCourierLocation(courierId, location);
      return true;
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        error: error.message || 'Erro ao atualizar localização do entregador' 
      }));
      return false;
    }
  }, []);

  // Get available couriers
  const getAvailableCouriers = useCallback(async (): Promise<DeliveryCourier[]> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const couriers = await deliveryService.getAvailableCouriers();
      setState(prev => ({ ...prev, loading: false }));
      return couriers;
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message || 'Erro ao buscar entregadores disponíveis' 
      }));
      return [];
    }
  }, []);

  // Load delivery zones
  const loadDeliveryZones = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const zones = await deliveryService.listDeliveryZones();
      setState(prev => ({ 
        ...prev, 
        zones,
        loading: false 
      }));
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message || 'Erro ao carregar zonas de entrega' 
      }));
    }
  }, []);

  // Calculate delivery fee
  const calculateDeliveryFee = useCallback(async (address: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await deliveryService.calculateDeliveryFee(address);
      setState(prev => ({ ...prev, loading: false }));
      return result;
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message || 'Erro ao calcular taxa de entrega' 
      }));
      return null;
    }
  }, []);

  // Load delivery tracking
  const loadDeliveryTracking = useCallback(async (deliveryId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const tracking = await deliveryService.getDeliveryTracking(deliveryId);
      setState(prev => ({ 
        ...prev, 
        tracking,
        loading: false 
      }));
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message || 'Erro ao carregar rastreamento' 
      }));
    }
  }, []);

  // Get delivery orders by status
  const getDeliveryOrdersByStatus = useCallback(async (status: DeliveryOrderStatus): Promise<DeliveryOrder[]> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const orders = await deliveryService.getDeliveryOrdersByStatus(status);
      setState(prev => ({ ...prev, loading: false }));
      return orders;
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message || 'Erro ao buscar pedidos por status' 
      }));
      return [];
    }
  }, []);

  // Get courier deliveries
  const getCourierDeliveries = useCallback(async (courierId: string, date?: string): Promise<DeliveryOrder[]> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const orders = await deliveryService.getCourierDeliveries(courierId, date);
      setState(prev => ({ ...prev, loading: false }));
      return orders;
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message || 'Erro ao buscar entregas do entregador' 
      }));
      return [];
    }
  }, []);

  // Set current delivery
  const setCurrentDelivery = useCallback((delivery: DeliveryOrder | null) => {
    setState(prev => ({ ...prev, currentDelivery: delivery }));
  }, []);

  // Set current courier
  const setCurrentCourier = useCallback((courier: DeliveryCourier | null) => {
    setState(prev => ({ ...prev, currentCourier: courier }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Refresh delivery orders
  const refreshDeliveryOrders = useCallback(async () => {
    await loadDeliveryOrders();
  }, [loadDeliveryOrders]);

  // Refresh couriers
  const refreshCouriers = useCallback(async () => {
    await loadCouriers();
  }, [loadCouriers]);

  // Load initial data on mount
  useEffect(() => {
    loadDeliveryOrders();
    loadCouriers();
    loadDeliveryZones();
  }, [loadDeliveryOrders, loadCouriers, loadDeliveryZones]);

  return {
    ...state,
    loadDeliveryOrders,
    getDeliveryOrder,
    createDeliveryOrder,
    updateDeliveryOrder,
    cancelDeliveryOrder,
    assignCourier,
    startDelivery,
    completeDelivery,
    loadCouriers,
    createCourier,
    updateCourier,
    updateCourierLocation,
    getAvailableCouriers,
    loadDeliveryZones,
    calculateDeliveryFee,
    loadDeliveryTracking,
    getDeliveryOrdersByStatus,
    getCourierDeliveries,
    setCurrentDelivery,
    setCurrentCourier,
    clearError,
    refreshDeliveryOrders,
    refreshCouriers
  };
};

