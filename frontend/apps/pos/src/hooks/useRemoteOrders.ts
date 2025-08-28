import { useCallback, useEffect, useState } from "react";
import { useToast } from "../components/Toast";
import logger, { LogSource } from "../services/LocalLoggerService";
import { showError, confirmAction } from '../utils/notifications';
import {
  PlatformIntegration,
  RemoteOrder,
  remoteOrdersService,
} from "../services/RemoteOrdersService";

// Interfaces are now imported from RemoteOrdersService

// RemoteOrdersService is imported from external service file

export const useRemoteOrders = () => {
  const [orders, setOrders] = useState<RemoteOrder[]>([]);
  const [integrations, setIntegrations] = useState<PlatformIntegration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { success, error: showError, warning, info } = useToast();
  const [autoAccept, setAutoAccept] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await remoteOrdersService.getOrders();
      setOrders(data);
    } catch (err) {
      setError(err.message);
      showError("Erro ao carregar pedidos remotos");
    } finally {
      setLoading(false);
    }
  }, [showError]);

  const loadIntegrations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await remoteOrdersService.getIntegrations();
      setIntegrations(data);
    } catch (error) {
      await logger.error(
        "Erro ao carregar integrações",
        { error },
        "useRemoteOrders",
        LogSource.NETWORK
      );
      showError("Erro ao carregar integrações");
    } finally {
      setLoading(false);
    }
  }, [showError]);

  const acceptOrder = useCallback(
    async (orderId: string) => {
      setLoading(true);
      try {
        const updatedOrder = await remoteOrdersService.acceptOrder(orderId);
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? updatedOrder : o))
        );
        success(`Pedido ${updatedOrder.platformOrderId} aceito com sucesso!`);

        // Send to kitchen/preparation
        setTimeout(() => {
          info("Pedido enviado para preparação");
        }, 500);

        return updatedOrder;
      } catch (err) {
        showError("Erro ao aceitar pedido");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [success, info, showError]
  );

  const rejectOrder = useCallback(
    async (orderId: string, reason?: string) => {
      const order = orders.find((o) => o.id === orderId);
      if (!order) return;

      if (!(await confirmAction("Tem certeza que deseja rejeitar este pedido?"))) {
        return;
      }

      setLoading(true);
      try {
        await remoteOrdersService.rejectOrder(orderId, reason);
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId ? { ...o, status: "cancelled" as const } : o
          )
        );
        warning(`Pedido ${order.platformOrderId} rejeitado`);
      } catch (err) {
        showError("Erro ao rejeitar pedido");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [orders, warning, showError]
  );

  const updateOrderStatus = useCallback(
    async (orderId: string, status: RemoteOrder["status"]) => {
      setLoading(true);
      try {
        const updatedOrder = await remoteOrdersService.updateOrderStatus(
          orderId,
          status
        );
        setOrders(
          (prev) =>
            prev.map((o) =>
              o.id === orderId ? updatedOrder : o
            ) as RemoteOrder[]
        );
        success("Status do pedido atualizado");
        return updatedOrder;
      } catch (err) {
        showError("Erro ao atualizar status do pedido");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [success, showError]
  );

  const syncPlatform = useCallback(
    async (platform: RemoteOrder["platform"]) => {
      setLoading(true);
      try {
        await remoteOrdersService.syncPlatform(platform);
        await loadOrders();
        await loadIntegrations();
        success(`${platform} sincronizado com sucesso`);
      } catch (error) {
        showError(`Erro ao sincronizar ${platform}`);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [loadOrders, loadIntegrations, success, showError]
  );

  const configurePlatform = useCallback(
    async (platform: RemoteOrder["platform"], config: unknown) => {
      setLoading(true);
      try {
        await remoteOrdersService.configurePlatform(platform, config);
        await loadIntegrations();
        success("Configurações salvas com sucesso!");
      } catch (err) {
        showError("Erro ao salvar configurações");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [loadIntegrations, success, showError]
  );

  const printOrder = useCallback(
    async (orderId: string) => {
      try {
        await remoteOrdersService.printOrder(orderId);
        success("Pedido enviado para impressão");
      } catch (err) {
        showError("Erro ao imprimir pedido");
        throw err;
      }
    },
    [success, showError]
  );

  // Auto-accept orders if enabled
  useEffect(() => {
    if (autoAccept) {
      const pendingOrders = orders.filter((o) => o.status === "pending");
      pendingOrders.forEach((order) => {
        acceptOrder(order.id);
      });
    }
  }, [autoAccept, orders, acceptOrder]);

  // Load data on mount
  useEffect(() => {
    loadOrders();
    loadIntegrations();
  }, [loadOrders, loadIntegrations]);

  // Polling for new orders
  useEffect(() => {
    const interval = setInterval(() => {
      loadOrders();
      loadIntegrations();
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [loadOrders, loadIntegrations]);

  return {
    orders,
    integrations,
    loading,
    error,
    autoAccept,
    setAutoAccept,
    loadOrders,
    loadIntegrations,
    acceptOrder,
    rejectOrder,
    updateOrderStatus,
    syncPlatform,
    configurePlatform,
    printOrder,
    // Utility functions
    getPendingOrders: useCallback(
      () => orders.filter((o) => o.status === "pending"),
      [orders]
    ),
    getOrdersByPlatform: useCallback(
      (platform: RemoteOrder["platform"]) =>
        orders.filter((o) => o.platform === platform),
      [orders]
    ),
    getOrderById: useCallback(
      (id: string) => orders.find((o) => o.id === id),
      [orders]
    ),
    getTotalPendingOrders: useCallback(
      () => integrations.reduce((sum, int) => sum + int.pendingOrders, 0),
      [integrations]
    ),
    getTotalTodayRevenue: useCallback(
      () => integrations.reduce((sum, int) => sum + int.todayRevenue, 0),
      [integrations]
    ),
    getTotalTodayOrders: useCallback(
      () => integrations.reduce((sum, int) => sum + int.todayOrders, 0),
      [integrations]
    ),
  };
};
