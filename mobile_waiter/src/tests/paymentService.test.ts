import axios from 'axios';
import { processPayment, getPaymentByOrderId } from '../services/paymentService';
import { Payment } from '../types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Payment Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processPayment', () => {
    test('processes payment when API call is successful', async () => {
      // Mock data
      const orderId = '1001';
      const amount = 36.80;
      const method = 'credit_card';
      
      const mockPayment: Payment = {
        id: 'pay_123',
        orderId: orderId,
        amount: amount,
        method: 'credit_card',
        status: 'completed',
        createdAt: '2023-05-15T16:30:00Z'
      };

      // Setup axios mock
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockPayment,
          message: 'Payment processed successfully'
        }
      });

      // Call the function
      const result = await processPayment(orderId, amount, method);

      // Assertions
      expect(mockedAxios.post).toHaveBeenCalledWith('/payments', {
        orderId,
        amount,
        method
      });
      expect(result).toEqual(mockPayment);
      expect(result.status).toEqual('completed');
    });

    test('throws error when API call fails', async () => {
      // Setup axios mock to simulate failure
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      // Call the function and expect it to throw
      await expect(processPayment('1001', 36.80, 'credit_card')).rejects.toThrow('Failed to process payment');
      expect(mockedAxios.post).toHaveBeenCalledWith('/payments', {
        orderId: '1001',
        amount: 36.80,
        method: 'credit_card'
      });
    });
  });

  describe('getPaymentByOrderId', () => {
    test('returns payment data when API call is successful', async () => {
      // Mock data
      const orderId = '1001';
      const mockPayment: Payment = {
        id: 'pay_123',
        orderId: orderId,
        amount: 36.80,
        method: 'credit_card',
        status: 'completed',
        createdAt: '2023-05-15T16:30:00Z'
      };

      // Setup axios mock
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockPayment,
          message: 'Payment fetched successfully'
        }
      });

      // Call the function
      const result = await getPaymentByOrderId(orderId);

      // Assertions
      expect(mockedAxios.get).toHaveBeenCalledWith(`/orders/${orderId}/payment`);
      expect(result).toEqual(mockPayment);
    });

    test('returns null when API call fails', async () => {
      // Setup axios mock to simulate failure
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      // Call the function
      const result = await getPaymentByOrderId('1001');

      // Assertions
      expect(mockedAxios.get).toHaveBeenCalledWith('/orders/1001/payment');
      expect(result).toBeNull();
    });
  });
});
