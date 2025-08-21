/**
 * Coupons Service
 * Handles coupon management operations
 */

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed' | 'product' | 'shipping';
  discount_value: number;
  min_purchase?: number;
  max_discount?: number;
  valid_from: string;
  valid_until: string;
  usage_limit?: number;
  usage_count: number;
  per_customer_limit?: number;
  categories?: string[];
  products?: string[];
  status: 'active' | 'inactive' | 'expired';
  created_at: string;
  updated_at: string;
}

export interface CouponCreate {
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed' | 'product' | 'shipping';
  discount_value: number;
  min_purchase?: number;
  max_discount?: number;
  valid_from: string;
  valid_until: string;
  usage_limit?: number;
  per_customer_limit?: number;
  categories?: string[];
  products?: string[];
}

export interface CouponValidation {
  is_valid: boolean;
  message?: string;
  discount_amount?: number;
  final_amount?: number;
}

class CouponsService {
  private baseUrl = 'http://localhost:8001/api/v1';

  async listCoupons(status?: 'active' | 'inactive' | 'expired'): Promise<Coupon[]> {
    try {
      const params = status ? `?status=${status}` : '';
      const response = await fetch(`${this.baseUrl}/coupons${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch coupons');
      return await response.json();
    } catch (error) {
      console.error('Error fetching coupons:', error);
      return [];
    }
  }

  async getCoupon(id: string): Promise<Coupon> {
    try {
      const response = await fetch(`${this.baseUrl}/coupons/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch coupon');
      return await response.json();
    } catch (error) {
      console.error('Error fetching coupon:', error);
      throw error;
    }
  }

  async createCoupon(coupon: CouponCreate): Promise<Coupon> {
    try {
      const response = await fetch(`${this.baseUrl}/coupons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(coupon)
      });
      
      if (!response.ok) throw new Error('Failed to create coupon');
      return await response.json();
    } catch (error) {
      console.error('Error creating coupon:', error);
      throw error;
    }
  }

  async updateCoupon(id: string, updates: Partial<CouponCreate>): Promise<Coupon> {
    try {
      const response = await fetch(`${this.baseUrl}/coupons/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) throw new Error('Failed to update coupon');
      return await response.json();
    } catch (error) {
      console.error('Error updating coupon:', error);
      throw error;
    }
  }

  async deleteCoupon(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/coupons/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to delete coupon');
    } catch (error) {
      console.error('Error deleting coupon:', error);
      throw error;
    }
  }

  async validateCoupon(code: string, orderAmount: number, customerId?: string): Promise<CouponValidation> {
    try {
      const response = await fetch(`${this.baseUrl}/coupons/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ code, order_amount: orderAmount, customer_id: customerId })
      });
      
      if (!response.ok) throw new Error('Failed to validate coupon');
      return await response.json();
    } catch (error) {
      console.error('Error validating coupon:', error);
      return { is_valid: false, message: 'Erro ao validar cupom' };
    }
  }

  async applyCoupon(code: string, orderId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/orders/${orderId}/apply-coupon`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ code })
      });
      
      if (!response.ok) throw new Error('Failed to apply coupon');
    } catch (error) {
      console.error('Error applying coupon:', error);
      throw error;
    }
  }

}

export const couponsService = new CouponsService();