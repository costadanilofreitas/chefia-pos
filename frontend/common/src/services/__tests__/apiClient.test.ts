import { ApiClient } from '../apiClient';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ApiClient', () => {
  let apiClient: ApiClient;
  let mockAxios: MockAdapter;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create a new instance for each test
    apiClient = new ApiClient({
      baseURL: 'https://api.example.com',
      timeout: 5000
    });
    
    // Setup axios mock
    const axiosInstance = axios.create();
    mockAxios = new MockAdapter(axiosInstance);
    mockedAxios.create.mockReturnValue(axiosInstance);
  });
  
  afterEach(() => {
    mockAxios.restore();
  });
  
  test('should create an axios instance with correct config', () => {
    expect(mockedAxios.create).toHaveBeenCalledWith({
      baseURL: 'https://api.example.com',
      timeout: 5000
    });
  });
  
  test('should make GET requests correctly', async () => {
    const mockData = { id: 1, name: 'Test' };
    const mockResponse = { data: mockData };
    
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
    
    const result = await apiClient.get('/test');
    
    expect(result).toEqual(mockData);
  });
  
  test('should make POST requests correctly', async () => {
    const requestData = { name: 'Test' };
    const mockData = { id: 1, name: 'Test' };
    const mockResponse = { data: mockData };
    
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
    
    const result = await apiClient.post('/test', requestData);
    
    expect(result).toEqual(mockData);
  });
  
  test('should make PUT requests correctly', async () => {
    const requestData = { id: 1, name: 'Updated Test' };
    const mockData = { id: 1, name: 'Updated Test' };
    const mockResponse = { data: mockData };
    
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
    
    const result = await apiClient.put('/test/1', requestData);
    
    expect(result).toEqual(mockData);
  });
  
  test('should make DELETE requests correctly', async () => {
    const mockData = { success: true };
    const mockResponse = { data: mockData };
    
    mockedAxios.create.mockReturnValue({
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn().mockResolvedValue(mockResponse),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    } as any);
    
    const result = await apiClient.delete('/test/1');
    
    expect(result).toEqual(mockData);
  });
  
  test('should handle errors correctly', async () => {
    const errorMessage = 'Network Error';
    
    mockedAxios.create.mockReturnValue({
      get: jest.fn().mockRejectedValue(new Error(errorMessage)),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    } as any);
    
    await expect(apiClient.get('/test')).rejects.toThrow(errorMessage);
  });
  
  test('should add authentication token to requests when provided', async () => {
    const token = 'test-token';
    const requestInterceptor = jest.fn();
    
    mockedAxios.create.mockReturnValue({
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { 
          use: requestInterceptor
        },
        response: { 
          use: jest.fn() 
        }
      }
    } as any);
    
    // Create client with auth token
    const authApiClient = new ApiClient({
      baseURL: 'https://api.example.com',
      timeout: 5000,
      authToken: token
    });
    
    // Verify interceptor was called
    expect(requestInterceptor).toHaveBeenCalled();
  });
  
  test('should retry failed requests when configured', async () => {
    const responseInterceptor = jest.fn();
    
    mockedAxios.create.mockReturnValue({
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { 
          use: jest.fn()
        },
        response: { 
          use: responseInterceptor
        }
      }
    } as any);
    
    // Create client with retry config
    const retryApiClient = new ApiClient({
      baseURL: 'https://api.example.com',
      timeout: 5000,
      retry: {
        maxRetries: 3,
        retryDelay: 100
      }
    });
    
    // Verify interceptor was called
    expect(responseInterceptor).toHaveBeenCalled();
  });
});
