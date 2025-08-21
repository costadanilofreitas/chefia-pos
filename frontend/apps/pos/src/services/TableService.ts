import { apiInterceptor } from './ApiInterceptor';

export interface Table {
  id: string;
  number: number;
  seats: number;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning';
  area: string;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  shape?: 'square' | 'round' | 'rectangle';
  waiter_id?: string;
  waiter_name?: string;
  customer_count?: number;
  order_id?: string;
  order_total?: number;
  start_time?: string;
  reservation?: {
    id: string;
    customer_name: string;
    customer_phone: string;
    reservation_time: string;
    guest_count: number;
    notes?: string;
  };
}

export interface TableLayout {
  id: string;
  restaurant_id: string;
  store_id: string;
  name: string;
  description?: string;
  tables: Table[];
  sections: any[];
  is_active: boolean;
  background_image?: string;
  background_color: string;
  width: number;
  height: number;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface TableStatusUpdate {
  status: Table['status'];
  order_id?: string;
  waiter_id?: string;
  waiter_name?: string;
  customer_count?: number;
}

class TableServiceClass {
  private baseURL = 'http://localhost:8001/api/waiter/tables';
  private restaurantId = '1'; // TODO: Get from config
  private storeId = '1'; // TODO: Get from config

  /**
   * Get active table layout with all tables
   */
  async getTables(): Promise<Table[]> {
    try {
      const response = await apiInterceptor.get(
        `${this.baseURL}/layouts/active?restaurant_id=${this.restaurantId}&store_id=${this.storeId}`
      );
      
      // Extract tables from layout
      const layout = response.data;
      return layout.tables || [];
    } catch (error: any) {
      console.error('Error fetching tables:', error);
      return [];
    }
  }

  /**
   * Get specific table by ID
   */
  async getTable(id: string): Promise<Table> {
    const tables = await this.getTables();
    const table = tables.find(t => t.id === id);
    if (!table) {
      throw new Error('Mesa não encontrada');
    }
    return table;
  }

  /**
   * Create a new table (requires layout update)
   */
  async createTable(table: Partial<Table>): Promise<Table> {
    try {
      // Get current layout
      const layoutResponse = await apiInterceptor.get(
        `${this.baseURL}/layouts/active?restaurant_id=${this.restaurantId}&store_id=${this.storeId}`
      );
      
      const layout = layoutResponse.data;
      
      // Add new table to layout
      const newTable: Table = {
        id: Date.now().toString(),
        number: table.number || 1,
        seats: table.seats || 4,
        status: 'available',
        area: table.area || 'saloon',
        position: table.position || { x: 100, y: 100 },
        size: table.size || { width: 100, height: 100 },
        shape: table.shape || 'square',
        ...table
      };
      
      layout.tables.push(newTable);
      
      // Update layout
      await apiInterceptor.put(`${this.baseURL}/layouts/${layout.id}`, {
        tables: layout.tables
      });
      
      return newTable;
    } catch (error) {
      console.error('Error creating table:', error);
      throw error;
    }
  }

  /**
   * Update table status
   */
  async updateTableStatus(id: string, statusUpdate: TableStatusUpdate): Promise<Table> {
    try {
      const response = await apiInterceptor.put(
        `${this.baseURL}/${id}/status`,
        statusUpdate
      );
      return response.data;
    } catch (error) {
      console.error('Error updating table status:', error);
      
      // Update locally for development
      const tables = await this.getTables();
      const table = tables.find(t => t.id === id);
      if (table) {
        return { ...table, ...statusUpdate };
      }
      throw new Error('Falha ao atualizar status da mesa');
    }
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
      const layoutResponse = await apiInterceptor.get(
        `${this.baseURL}/layouts/active?restaurant_id=${this.restaurantId}&store_id=${this.storeId}`
      );
      
      const layout = layoutResponse.data;
      const tableIndex = layout.tables.findIndex((t: Table) => t.id === id);
      
      if (tableIndex === -1) {
        throw new Error('Mesa não encontrada');
      }
      
      layout.tables[tableIndex] = { ...layout.tables[tableIndex], ...updates };
      
      await apiInterceptor.put(`${this.baseURL}/layouts/${layout.id}`, {
        tables: layout.tables
      });
      
      return layout.tables[tableIndex];
    } catch (error) {
      console.error('Error updating table:', error);
      const table = await this.getTable(id);
      return { ...table, ...updates };
    }
  }

  /**
   * Delete table (requires layout update)
   */
  async deleteTable(id: string): Promise<void> {
    try {
      const layoutResponse = await apiInterceptor.get(
        `${this.baseURL}/layouts/active?restaurant_id=${this.restaurantId}&store_id=${this.storeId}`
      );
      
      const layout = layoutResponse.data;
      layout.tables = layout.tables.filter((t: Table) => t.id !== id);
      
      await apiInterceptor.put(`${this.baseURL}/layouts/${layout.id}`, {
        tables: layout.tables
      });
    } catch (error) {
      console.error('Error deleting table:', error);
    }
  }

  /**
   * Reserve table
   */
  async reserveTable(tableId: string, reservation: any): Promise<Table> {
    return this.updateTable(tableId, {
      status: 'reserved',
      reservation
    });
  }

  /**
   * Assign waiter to table
   */
  async assignWaiter(tableId: string, waiterId: string, waiterName?: string): Promise<Table> {
    return this.updateTableStatus(tableId, {
      status: 'occupied',
      waiter_id: waiterId,
      waiter_name: waiterName
    });
  }

  /**
   * Clear table
   */
  async clearTable(id: string): Promise<Table> {
    return this.updateTableStatus(id, {
      status: 'cleaning'
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
    return this.updateTableStatus(tableId, {
      status: 'occupied',
      customer_count: customerCount,
      waiter_id: waiterId,
      order_id: orderId
    });
  }

}

// Export singleton instance
export const tableService = new TableServiceClass();