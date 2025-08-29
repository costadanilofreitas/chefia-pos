import { waiterService, Table, Order, OrderItem } from '../../src/services/waiterService';

// Mock the api service
jest.mock('../../src/services/api', () => ({
  apiService: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn()
  }
}));

import { apiService } from '../../src/services/api';
const mockApiService = apiService as jest.Mocked<typeof apiService>;

describe('WaiterService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('should get tables', async () => {
    const mockTables: Table[] = [
      { id: 1, number: 1, status: 'available', seats: 4, shape: 'square', x: 100, y: 100 },
      { id: 2, number: 2, status: 'occupied', seats: 2, shape: 'round', x: 250, y: 100 },
      { id: 3, number: 3, status: 'reserved', seats: 6, shape: 'rectangle', x: 400, y: 100 }
    ];
    
    const mockResponse = { success: true, data: mockTables };
    mockApiService.get.mockResolvedValue(mockResponse);
    
    const result = await waiterService.getTables();
    
    expect(result).toEqual(mockTables);
  });
  
  test('should get orders', async () => {
    const mockOrders: Order[] = [
      {
        id: 1,
        table_id: 2,
        status: 'in_progress',
        items: [
          { id: 1, name: 'Hambúrguer', quantity: 2, price: 25.90, status: 'preparing' },
          { id: 2, name: 'Refrigerante', quantity: 2, price: 6.50, status: 'ready' }
        ],
        created_at: new Date(Date.now() - 30 * 60000).toISOString()
      }
    ];
    
    const mockResponse = { success: true, data: mockOrders };
    mockApiService.get.mockResolvedValue(mockResponse);
    
    const result = await waiterService.getOrders();
    
    expect(result).toEqual(mockOrders);
  });
  
  test('should get orders by table', async () => {
    const mockOrders: Order[] = [
      {
        id: 1,
        table_id: 2,
        status: 'in_progress',
        items: [
          { id: 1, name: 'Hambúrguer', quantity: 2, price: 25.90, status: 'preparing' },
          { id: 2, name: 'Refrigerante', quantity: 2, price: 6.50, status: 'ready' }
        ],
        created_at: new Date(Date.now() - 30 * 60000).toISOString()
      }
    ];
    
    const mockResponse = { success: true, data: mockOrders };
    mockApiService.get.mockResolvedValue(mockResponse);
    
    const result = await waiterService.getOrdersByTable(2);
    
    expect(result).toEqual(mockOrders);
  });
  
  test('should create order', async () => {
    const mockItems = [
      { name: 'Hambúrguer', quantity: 2, price: 25.90 },
      { name: 'Refrigerante', quantity: 2, price: 6.50 }
    ];
    
    const mockOrder: Order = {
      id: 1,
      table_id: 2,
      status: 'new',
      items: [
        { id: 1, name: 'Hambúrguer', quantity: 2, price: 25.90, status: 'pending' },
        { id: 2, name: 'Refrigerante', quantity: 2, price: 6.50, status: 'pending' }
      ],
      created_at: new Date().toISOString()
    };
    
    const mockResponse = { success: true, data: mockOrder };
    mockApiService.post.mockResolvedValue(mockResponse);
    
    const result = await waiterService.createOrder(2, mockItems);
    
    expect(result).toEqual(mockOrder);
  });
  
  test('should update table status', async () => {
    const mockResponse = { success: true };
    mockApiService.put.mockResolvedValue(mockResponse);
    
    const result = await waiterService.updateTableStatus(2, 'occupied');
    
    expect(result).toBe(true);
  });
  
  test('should deliver order items', async () => {
    const mockResponse = { success: true };
    mockApiService.put.mockResolvedValue(mockResponse);
    
    const result = await waiterService.deliverOrderItems(1, [1, 2]);
    
    expect(result).toBe(true);
  });
  
  test('should get menu', async () => {
    const mockMenu = {
      categories: [
        { id: 1, name: 'Lanches' },
        { id: 2, name: 'Bebidas' }
      ],
      items: [
        { id: 1, name: 'Hambúrguer', price: 25.90, category_id: 1 },
        { id: 2, name: 'Refrigerante', price: 6.50, category_id: 2 }
      ]
    };
    
    const mockResponse = { success: true, data: mockMenu };
    mockApiService.get.mockResolvedValue(mockResponse);
    
    const result = await waiterService.getMenu();
    
    expect(result).toEqual(mockMenu);
  });
  
  test('should handle API errors', async () => {
    mockApiService.get.mockRejectedValue(new Error('API Error'));
    
    await expect(waiterService.getTables()).rejects.toThrow('API Error');
  });
  
  test('should handle failed responses', async () => {
    const mockResponse = { success: false, message: 'Failed to fetch data' };
    mockApiService.get.mockResolvedValue(mockResponse);
    
    await expect(waiterService.getTables()).rejects.toThrow('Failed to fetch tables');
  });
});