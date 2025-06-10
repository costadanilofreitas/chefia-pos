import axios from 'axios';
import { fetchOrders, updateOrderStatus } from '../services/orderService';
import { Order, OrderStatus } from '../models/types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Order Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchOrders', () => {
    test('returns order data when API call is successful', async () => {
      // Mock data
      const mockOrders: Order[] = [
        {
          id: '1001',
          customer: {
            id: '101',
            name: 'João Silva',
            email: 'joao.silva@example.com',
            phone: '(11) 98765-4321'
          },
          items: [
            {
              id: '10001',
              productId: '1',
              productName: 'Hambúrguer Clássico',
              quantity: 2,
              unitPrice: 15.90,
              total: 31.80
            }
          ],
          subtotal: 31.80,
          shippingCost: 5.00,
          total: 36.80,
          status: 'delivered',
          shippingAddress: {
            street: 'Rua das Flores',
            number: '123',
            complement: 'Apto 45',
            neighborhood: 'Jardim Primavera',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01234-567'
          },
          paymentMethod: 'credit_card',
          createdAt: '2023-05-15T14:30:00Z',
          updatedAt: '2023-05-15T15:45:00Z'
        }
      ];

      // Setup axios mock
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockOrders,
          message: 'Orders fetched successfully'
        }
      });

      // Call the function
      const result = await fetchOrders();

      // Assertions
      expect(mockedAxios.get).toHaveBeenCalledWith('/orders');
      expect(result).toEqual(mockOrders);
    });

    test('returns fallback data when API call fails', async () => {
      // Setup axios mock to simulate failure
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      // Call the function
      const result = await fetchOrders();

      // Assertions
      expect(mockedAxios.get).toHaveBeenCalledWith('/orders');
      expect(result).toHaveLength(2); // Fallback data has 2 orders
      expect(result[0]).toHaveProperty('customer');
      expect(result[0]).toHaveProperty('items');
    });
  });

  describe('updateOrderStatus', () => {
    test('updates order status when API call is successful', async () => {
      // Mock data
      const orderId = '1001';
      const newStatus: OrderStatus = 'processing';
      
      const mockUpdatedOrder: Order = {
        id: orderId,
        customer: {
          id: '101',
          name: 'João Silva',
          email: 'joao.silva@example.com',
          phone: '(11) 98765-4321'
        },
        items: [
          {
            id: '10001',
            productId: '1',
            productName: 'Hambúrguer Clássico',
            quantity: 2,
            unitPrice: 15.90,
            total: 31.80
          }
        ],
        subtotal: 31.80,
        shippingCost: 5.00,
        total: 36.80,
        status: newStatus, // Updated status
        shippingAddress: {
          street: 'Rua das Flores',
          number: '123',
          complement: 'Apto 45',
          neighborhood: 'Jardim Primavera',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01234-567'
        },
        paymentMethod: 'credit_card',
        createdAt: '2023-05-15T14:30:00Z',
        updatedAt: '2023-05-15T16:00:00Z' // Updated timestamp
      };

      // Setup axios mock
      mockedAxios.patch.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockUpdatedOrder,
          message: 'Order status updated successfully'
        }
      });

      // Call the function
      const result = await updateOrderStatus(orderId, newStatus);

      // Assertions
      expect(mockedAxios.patch).toHaveBeenCalledWith(`/orders/${orderId}/status`, { status: newStatus });
      expect(result).toEqual(mockUpdatedOrder);
      expect(result.status).toEqual(newStatus);
    });

    test('throws error when API call fails', async () => {
      // Setup axios mock to simulate failure
      mockedAxios.patch.mockRejectedValueOnce(new Error('Network error'));

      // Call the function and expect it to throw
      await expect(updateOrderStatus('1001', 'processing')).rejects.toThrow('Failed to update order status');
      expect(mockedAxios.patch).toHaveBeenCalledWith('/orders/1001/status', { status: 'processing' });
    });
  });
});
