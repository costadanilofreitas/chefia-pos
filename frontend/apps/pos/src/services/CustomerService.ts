import { apiInterceptor } from './ApiInterceptor';
import { API_ENDPOINTS } from '../config/api';

// Types para Customer
export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  document?: string;
  address?: Address;
  birth_date?: string;
  loyalty?: Loyalty;
  purchase_history?: PurchaseHistoryEntry[];
  created_at: string;
  updated_at: string;
}

export interface CustomerCreate {
  name: string;
  phone?: string;
  email?: string;
  document?: string;
  address?: Address;
  birth_date?: string;
}

export interface CustomerUpdate {
  name?: string;
  phone?: string;
  email?: string;
  document?: string;
  address?: Address;
  birth_date?: string;
}

export interface Address {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
}

export interface Loyalty {
  points: number;
  level: string;
  total_spent: number;
}

export interface PurchaseHistoryEntry {
  order_id: string;
  date: string;
  total: number;
  items_count: number;
}

export class CustomerService {
  /**
   * Lista todos os clientes
   */
  async listCustomers(search?: string): Promise<Customer[]> {
    const params = search ? { search } : {};
    const response = await apiInterceptor.get(API_ENDPOINTS.CUSTOMER.LIST, { params });
    return response.data;
  }

  /**
   * Busca um cliente por ID
   */
  async getCustomer(customerId: string): Promise<Customer> {
    const response = await apiInterceptor.get(
      API_ENDPOINTS.CUSTOMER.GET.replace(':id', customerId)
    );
    return response.data;
  }

  /**
   * Cria um novo cliente
   */
  async createCustomer(customerData: CustomerCreate): Promise<Customer> {
    const response = await apiInterceptor.post(
      API_ENDPOINTS.CUSTOMER.CREATE,
      customerData
    );
    return response.data;
  }

  /**
   * Atualiza um cliente existente
   */
  async updateCustomer(customerId: string, customerData: CustomerUpdate): Promise<Customer> {
    const response = await apiInterceptor.put(
      API_ENDPOINTS.CUSTOMER.UPDATE.replace(':id', customerId),
      customerData
    );
    return response.data;
  }

  /**
   * Remove um cliente
   */
  async deleteCustomer(customerId: string): Promise<void> {
    await apiInterceptor.delete(
      API_ENDPOINTS.CUSTOMER.DELETE.replace(':id', customerId)
    );
  }

  /**
   * Busca clientes por telefone
   */
  async searchByPhone(phone: string): Promise<Customer[]> {
    const response = await apiInterceptor.get(API_ENDPOINTS.CUSTOMER.SEARCH_PHONE, {
      params: { phone }
    });
    return response.data;
  }

  /**
   * Busca clientes por email
   */
  async searchByEmail(email: string): Promise<Customer[]> {
    const response = await apiInterceptor.get(API_ENDPOINTS.CUSTOMER.SEARCH_EMAIL, {
      params: { email }
    });
    return response.data;
  }

  /**
   * Adiciona pontos de fidelidade a um cliente
   */
  async addLoyaltyPoints(customerId: string, points: number): Promise<Customer> {
    const response = await apiInterceptor.post(
      API_ENDPOINTS.CUSTOMER.ADD_POINTS.replace(':id', customerId),
      { points }
    );
    return response.data;
  }

  /**
   * Resgata pontos de fidelidade de um cliente
   */
  async redeemLoyaltyPoints(customerId: string, points: number): Promise<Customer> {
    const response = await apiInterceptor.post(
      API_ENDPOINTS.CUSTOMER.REDEEM_POINTS.replace(':id', customerId),
      { points }
    );
    return response.data;
  }
}

// Instância singleton do serviço
export const customerService = new CustomerService();

