import { buildApiUrl } from "../config/api";
import { apiInterceptor } from "./ApiInterceptor";
import logger from "./LocalLoggerService";
import { requestCache } from "./RequestCache";
import realtimeSync from "./RealtimeSyncService";
import eventBus from "../utils/EventBus";

export interface TableReservation {
  id: string;
  customer_name: string;
  customer_phone: string;
  reservation_time: string;
  guest_count: number;
  notes?: string;
}

export interface Table {
  id: string;
  number: number;
  seats: number;
  status: "available" | "occupied" | "reserved" | "cleaning";
  area: string;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  shape?: "square" | "round" | "rectangle";
  waiter_id?: string;
  waiter_name?: string;
  customer_count?: number;
  order_id?: string;
  order_total?: number;
  start_time?: string;
  reservation?: TableReservation;
}

export interface TableSection {
  id: string;
  name: string;
  color?: string;
  tables: string[];
}

export interface TableLayoutMetadata {
  zoom?: number;
  grid?: boolean;
  gridSize?: number;
  snapToGrid?: boolean;
}

export interface TableLayout {
  id: string;
  restaurant_id: string;
  store_id: string;
  name: string;
  description?: string;
  tables: Table[];
  sections: TableSection[];
  is_active: boolean;
  background_image?: string;
  background_color: string;
  width: number;
  height: number;
  metadata?: TableLayoutMetadata;
  created_at: string;
  updated_at: string;
}

export interface TableStatusUpdate {
  status: Table["status"];
  order_id?: string;
  waiter_id?: string;
  waiter_name?: string;
  customer_count?: number;
}

class TableServiceClass {
  // Using values from environment or defaults
  private readonly restaurantId = import.meta.env.VITE_RESTAURANT_ID || "1";
  private readonly storeId = import.meta.env.VITE_STORE_ID || "1";

  /**
   * Get active table layout with all tables
   * NOTE: This method doesn't use requestCache directly because the hook already handles it
   */
  async getTables(): Promise<Table[]> {
    const response = await apiInterceptor.get<{ tables: Table[] }>(
      buildApiUrl(
        `/api/waiter/tables/layouts/active?restaurant_id=${this.restaurantId}&store_id=${this.storeId}`
      )
    );

    // Extract tables from layout
    const layout = response.data;
    return layout.tables || [];
  }

  /**
   * Create a new table (requires layout update)
   */
  async createTable(table: Partial<Table>): Promise<Table> {
    // Get current layout - use cache to avoid duplicate request
    const layoutResponse = await requestCache.execute(
      'tables-layout-active-create',
      () => apiInterceptor.get<{
        id: string;
        tables: Table[];
      }>(
        buildApiUrl(
          `/api/waiter/tables/layouts/active?restaurant_id=${this.restaurantId}&store_id=${this.storeId}`
        )
      ),
      { ttl: 5000 } // Short cache for create operations
    );

    const layout = layoutResponse.data;

    // Add new table to layout
    const newTable: Table = {
      id: Date.now().toString(),
      number: table.number || 1,
      seats: table.seats || 4,
      status: "available",
      area: table.area || "saloon",
      position: table.position || { x: 100, y: 100 },
      size: table.size || { width: 100, height: 100 },
      shape: table.shape || "square",
      ...table,
    };

    layout.tables.push(newTable);

    // Update layout
    await apiInterceptor.put(
      buildApiUrl(`/api/waiter/tables/layouts/${layout.id}`),
      {
        tables: layout.tables,
      }
    );
    
    // Invalidate cache after create
    requestCache.invalidatePattern('tables-layout');
    
    // Notificar outros terminais sobre nova mesa
    realtimeSync.notifyCreate('table', newTable);
    eventBus.emit('table:created', newTable);

    return newTable;
  }

  /**
   * Update table status
   */
  async updateTableStatus(
    id: string,
    statusUpdate: TableStatusUpdate
  ): Promise<Table> {
    const response = await apiInterceptor.put<Table>(
      buildApiUrl(`/api/waiter/tables/${id}/status`),
      statusUpdate
    );
    
    // Notificar outros terminais sobre mudança de status
    realtimeSync.notifyUpdate('table', id, response.data);
    eventBus.emit('table:status:changed', response.data);
    
    return response.data;
  }

  /**
   * Update table (general update)
   */
  async updateTable(id: string, updates: Partial<Table>): Promise<Table> {
    // For status updates, use updateTableStatus
    if (updates.status && Object.keys(updates).length === 1) {
      return this.updateTableStatus(id, { status: updates.status });
    }

    // For other updates, need to update the entire layout
    try {
      const layoutResponse = await requestCache.execute(
        'tables-layout-active-update',
        () => apiInterceptor.get<{
          id: string;
          tables: Table[];
        }>(
          buildApiUrl(
            `/api/waiter/tables/layouts/active?restaurant_id=${this.restaurantId}&store_id=${this.storeId}`
          )
        ),
        { ttl: 5000 } // Short cache for update operations
      );

      const layout = layoutResponse.data;
      const tableIndex = layout.tables.findIndex((t: Table) => t.id === id);

      if (tableIndex === -1) {
        throw new Error("Mesa não encontrada");
      }

      layout.tables[tableIndex] = { ...layout.tables[tableIndex], ...updates };

      await apiInterceptor.put(
        buildApiUrl(`/api/waiter/tables/layouts/${layout.id}`),
        {
          tables: layout.tables,
        }
      );
      
      // Invalidate cache after update
      requestCache.invalidatePattern('tables-layout');
      
      // Notificar outros terminais sobre atualização
      realtimeSync.notifyUpdate('table', id, layout.tables[tableIndex]);
      eventBus.emit('table:updated', layout.tables[tableIndex]);

      return layout.tables[tableIndex];
    } catch (error) {
      // Fallback to getting table individually if layout update fails
      // This is a non-critical error, just log for debugging
      void logger.debug(
        "Failed to update table in layout, using fallback",
        { error, id },
        "TableService"
      );
      const tables = await this.getTables();
      const table = tables.find((t) => t.id === id) || ({} as Table);
      return { ...table, ...updates };
    }
  }

  /**
   * Delete table (requires layout update)
   */
  async deleteTable(id: string): Promise<void> {
    try {
      const layoutResponse = await requestCache.execute(
        'tables-layout-active-delete',
        () => apiInterceptor.get<{
          id: string;
          tables: Table[];
        }>(
          buildApiUrl(
            `/api/waiter/tables/layouts/active?restaurant_id=${this.restaurantId}&store_id=${this.storeId}`
          )
        ),
        { ttl: 5000 } // Short cache for delete operations
      );

      const layout = layoutResponse.data;
      layout.tables = layout.tables.filter((t: Table) => t.id !== id);

      await apiInterceptor.put(
        buildApiUrl(`/api/waiter/tables/layouts/${layout.id}`),
        {
          tables: layout.tables,
        }
      );
      
      // Invalidate cache after delete
      requestCache.invalidatePattern('tables-layout');
      
      // Notificar outros terminais sobre exclusão
      realtimeSync.notifyDelete('table', id);
      eventBus.emit('table:deleted', { id });
    } catch (error) {
      // Failed to update table - error handled silently as this is a non-critical operation
      void logger.debug(
        "Failed to delete table",
        { error, id },
        "TableService"
      );
    }
  }

  /**
   * Reserve table
   */
  async reserveTable(
    tableId: string,
    reservation: TableReservation
  ): Promise<Table> {
    return this.updateTable(tableId, {
      status: "reserved",
      reservation,
    });
  }

  /**
   * Assign waiter to table
   */
  async assignWaiter(
    tableId: string,
    waiterId: string,
    waiterName?: string
  ): Promise<Table> {
    const result = await this.updateTableStatus(tableId, {
      status: "occupied",
      waiter_id: waiterId,
      waiter_name: waiterName,
    });
    
    // Evento específico para atribuição de garçom
    eventBus.emit('table:assigned', {
      tableId,
      waiterId,
      waiterName
    });
    
    return result;
  }

  /**
   * Clear table
   */
  async clearTable(id: string): Promise<Table> {
    return this.updateTableStatus(id, {
      status: "cleaning",
    });
  }

  /**
   * Occupy table
   */
  async occupyTable(
    tableId: string,
    customerCount: number,
    waiterId?: string,
    orderId?: string
  ): Promise<Table> {
    const result = await this.updateTableStatus(tableId, {
      status: "occupied",
      customer_count: customerCount,
      waiter_id: waiterId,
      order_id: orderId,
    });
    
    // Evento específico para ocupação de mesa
    eventBus.emit('table:occupied', {
      tableId,
      customerCount,
      orderId
    });
    
    return result;
  }
}

// Export singleton instance
export const tableService = new TableServiceClass();
