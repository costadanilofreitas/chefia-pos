import { posService, Product, Category, Order } from '../services/posService';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('POSService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default axios mock
    mockedAxios.create.mockReturnValue({
      get: jest.fn().mockResolvedValue({ data: { success: true, data: {} } }),
      post: jest.fn().mockResolvedValue({ data: { success: true, data: {} } }),
      put: jest.fn().mockResolvedValue({ data: { success: true, data: {} } }),
      delete: jest.fn().mockResolvedValue({ data: { success: true, data: {} } }),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    } as any);
  });
  
  test('should get POS configuration', async () => {
    const mockConfig = {
      store_id: 'store123',
      store_name: 'Test Store',
      terminal_id: 'term001',
      printer_config: {
        receipt_printer: 'printer1',
        kitchen_printer: 'printer2',
        report_printer: 'printer3'
      },
      tax_rate: 0.1,
      currency: 'BRL',
      offline_mode_enabled: true
    };
    
    const mockResponse = { data: { success: true, data: mockConfig } };
    mockedAxios.create.mockReturnValue({
      get: jest.fn().mockResolvedValue(mockResponse),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    } as any);
    
    const result = await posService.getConfig();
    
    expect(result).toEqual(mockConfig);
  });
  
  test('should open cashier session', async () => {
    const mockSession = {
      id: 'session123',
      terminal_id: 'term001',
      employee_id: 'emp123',
      employee_name: 'Test Employee',
      start_time: '2025-05-27T06:00:00Z',
      starting_amount: 100,
      current_amount: 100,
      status: 'open'
    };
    
    const mockResponse = { data: { success: true, data: mockSession } };
    mockedAxios.create.mockReturnValue({
      get: jest.fn(),
      post: jest.fn().mockResolvedValue(mockResponse),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    } as any);
    
    const result = await posService.openCashierSession('emp123', 100);
    
    expect(result).toEqual(mockSession);
  });
  
  test('should close cashier session', async () => {
    const mockSession = {
      id: 'session123',
      terminal_id: 'term001',
      employee_id: 'emp123',
      employee_name: 'Test Employee',
      start_time: '2025-05-27T06:00:00Z',
      end_time: '2025-05-27T14:00:00Z',
      starting_amount: 100,
      current_amount: 500,
      status: 'closed'
    };
    
    const mockResponse = { data: { success: true, data: mockSession } };
    mockedAxios.create.mockReturnValue({
      get: jest.fn(),
      post: jest.fn().mockResolvedValue(mockResponse),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    } as any);
    
    const result = await posService.closeCashierSession('session123', 500);
    
    expect(result).toEqual(mockSession);
  });
  
  test('should get current cashier session', async () => {
    const mockSession = {
      id: 'session123',
      terminal_id: 'term001',
      employee_id: 'emp123',
      employee_name: 'Test Employee',
      start_time: '2025-05-27T06:00:00Z',
      starting_amount: 100,
      current_amount: 300,
      status: 'open'
    };
    
    const mockResponse = { data: { success: true, data: mockSession } };
    mockedAxios.create.mockReturnValue({
      get: jest.fn().mockResolvedValue(mockResponse),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    } as any);
    
    const result = await posService.getCurrentCashierSession();
    
    expect(result).toEqual(mockSession);
  });
  
  test('should get categories', async () => {
    const mockCategories: Category[] = [
      { id: 'cat1', name: 'Beverages', sort_order: 1 },
      { id: 'cat2', name: 'Food', sort_order: 2 }
    ];
    
    const mockResponse = { data: { success: true, data: mockCategories } };
    mockedAxios.create.mockReturnValue({
      get: jest.fn().mockResolvedValue(mockResponse),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    } as any);
    
    const result = await posService.getCategories();
    
    expect(result).toEqual(mockCategories);
  });
  
  test('should get products', async () => {
    const mockProducts: Product[] = [
      { 
        id: 'prod1', 
        name: 'Coffee', 
        description: 'Hot coffee', 
        price: 5.0, 
        category_id: 'cat1',
        tax_exempt: false
      },
      { 
        id: 'prod2', 
        name: 'Sandwich', 
        description: 'Chicken sandwich', 
        price: 10.0, 
        category_id: 'cat2',
        tax_exempt: false
      }
    ];
    
    const mockResponse = { data: { success: true, data: mockProducts } };
    mockedAxios.create.mockReturnValue({
      get: jest.fn().mockResolvedValue(mockResponse),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    } as any);
    
    const result = await posService.getProducts();
    
    expect(result).toEqual(mockProducts);
  });
  
  test('should get products by category', async () => {
    const mockProducts: Product[] = [
      { 
        id: 'prod1', 
        name: 'Coffee', 
        description: 'Hot coffee', 
        price: 5.0, 
        category_id: 'cat1',
        tax_exempt: false
      }
    ];
    
    const mockResponse = { data: { success: true, data: mockProducts } };
    mockedAxios.create.mockReturnValue({
      get: jest.fn().mockResolvedValue(mockResponse),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    } as any);
    
    const result = await posService.getProductsByCategory('cat1');
    
    expect(result).toEqual(mockProducts);
  });
  
  test('should search products', async () => {
    const mockProducts: Product[] = [
      { 
        id: 'prod1', 
        name: 'Coffee', 
        description: 'Hot coffee', 
        price: 5.0, 
        category_id: 'cat1',
        tax_exempt: false
      }
    ];
    
    const mockResponse = { data: { success: true, data: mockProducts } };
    mockedAxios.create.mockReturnValue({
      get: jest.fn().mockResolvedValue(mockResponse),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    } as any);
    
    const result = await posService.searchProducts('coffee');
    
    expect(result).toEqual(mockProducts);
  });
  
  test('should create order', async () => {
    const mockOrderData = {
      terminal_id: 'term001',
      cashier_id: 'emp123',
      cashier_name: 'Test Employee',
      items: [
        {
          id: 'item1',
          product_id: 'prod1',
          name: 'Coffee',
          quantity: 2,
          unit_price: 5.0,
          total_price: 10.0,
          status: 'pending'
        }
      ],
      subtotal: 10.0,
      tax: 1.0,
      total: 11.0,
      payment_status: 'pending' as const,
      order_status: 'new' as const,
      source: 'pos' as const
    };
    
    const mockOrder: Order = {
      id: 'order123',
      order_number: '001',
      ...mockOrderData,
      created_at: '2025-05-27T06:30:00Z',
      updated_at: '2025-05-27T06:30:00Z'
    };
    
    const mockResponse = { data: { success: true, data: mockOrder } };
    mockedAxios.create.mockReturnValue({
      get: jest.fn(),
      post: jest.fn().mockResolvedValue(mockResponse),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    } as any);
    
    const result = await posService.createOrder(mockOrderData);
    
    expect(result).toEqual(mockOrder);
  });
  
  test('should process payment', async () => {
    const mockPayment = {
      id: 'payment123',
      order_id: 'order123',
      amount: 11.0,
      payment_method: 'credit_card',
      status: 'completed',
      transaction_id: 'trans123',
      created_at: '2025-05-27T06:35:00Z'
    };
    
    const mockResponse = { data: { success: true, data: mockPayment } };
    mockedAxios.create.mockReturnValue({
      get: jest.fn(),
      post: jest.fn().mockResolvedValue(mockResponse),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    } as any);
    
    const result = await posService.processPayment('order123', {
      amount: 11.0,
      payment_method: 'credit_card'
    });
    
    expect(result).toEqual(mockPayment);
  });
  
  test('should update order status', async () => {
    const mockResponse = { data: { success: true } };
    mockedAxios.create.mockReturnValue({
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn().mockResolvedValue(mockResponse),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    } as any);
    
    const result = await posService.updateOrderStatus('order123', 'in_progress');
    
    expect(result).toBe(true);
  });
  
  test('should print receipt', async () => {
    const mockResponse = { data: { success: true } };
    mockedAxios.create.mockReturnValue({
      get: jest.fn(),
      post: jest.fn().mockResolvedValue(mockResponse),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    } as any);
    
    const result = await posService.printReceipt('order123');
    
    expect(result).toBe(true);
  });
  
  test('should handle API errors', async () => {
    mockedAxios.create.mockReturnValue({
      get: jest.fn().mockRejectedValue(new Error('API Error')),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    } as any);
    
    await expect(posService.getProducts()).rejects.toThrow('API Error');
  });
  
  test('should handle failed responses', async () => {
    const mockResponse = { data: { success: false, message: 'Failed to fetch data' } };
    mockedAxios.create.mockReturnValue({
      get: jest.fn().mockResolvedValue(mockResponse),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    } as any);
    
    await expect(posService.getProducts()).rejects.toThrow('Failed to fetch products');
  });
});
