/**
 * Bills Service
 * Handles bills payable operations
 */

export interface Bill {
  id: string;
  description: string;
  supplier: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  category: string;
  payment_date?: string;
  payment_method?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface BillCreate {
  description: string;
  supplier: string;
  amount: number;
  due_date: string;
  category: string;
  notes?: string;
}

export interface BillUpdate extends Partial<BillCreate> {
  status?: 'pending' | 'paid' | 'cancelled';
  payment_date?: string;
  payment_method?: string;
}

export interface BillsFilter {
  status?: string;
  supplier?: string;
  category?: string;
  start_date?: string;
  end_date?: string;
}

class BillsService {
  private baseUrl = 'http://localhost:8001/api/v1';

  async listBills(filter?: BillsFilter): Promise<Bill[]> {
    try {
      const params = new URLSearchParams();
      if (filter) {
        Object.entries(filter).forEach(([key, value]) => {
          if (value) params.append(key, value);
        });
      }
      
      const response = await fetch(`${this.baseUrl}/bills?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch bills');
      return await response.json();
    } catch (error) {
      console.error('Error fetching bills:', error);
      return [];
    }
  }

  async getBill(id: string): Promise<Bill> {
    try {
      const response = await fetch(`${this.baseUrl}/bills/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch bill');
      return await response.json();
    } catch (error) {
      console.error('Error fetching bill:', error);
      throw error;
    }
  }

  async createBill(bill: BillCreate): Promise<Bill> {
    try {
      const response = await fetch(`${this.baseUrl}/bills`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(bill)
      });
      
      if (!response.ok) throw new Error('Failed to create bill');
      return await response.json();
    } catch (error) {
      console.error('Error creating bill:', error);
      throw error;
    }
  }

  async updateBill(id: string, updates: BillUpdate): Promise<Bill> {
    try {
      const response = await fetch(`${this.baseUrl}/bills/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) throw new Error('Failed to update bill');
      return await response.json();
    } catch (error) {
      console.error('Error updating bill:', error);
      throw error;
    }
  }

  async deleteBill(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/bills/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to delete bill');
    } catch (error) {
      console.error('Error deleting bill:', error);
      throw error;
    }
  }

  async payBill(id: string, paymentMethod: string): Promise<Bill> {
    return this.updateBill(id, {
      status: 'paid',
      payment_date: new Date().toISOString(),
      payment_method: paymentMethod
    });
  }

  async getBillsSummary(): Promise<{
    total_pending: number;
    total_overdue: number;
    total_paid_this_month: number;
    next_due: Bill | null;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/bills/summary`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch summary');
      return await response.json();
    } catch (error) {
      console.error('Error fetching summary:', error);
      return {
        total_pending: 0,
        total_overdue: 0,
        total_paid_this_month: 0,
        next_due: null
      };
    }
  }

}

export const billsService = new BillsService();