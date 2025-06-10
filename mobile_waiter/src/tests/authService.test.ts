import axios from 'axios';
import { login, logout, isAuthenticated, getCurrentUser } from '../services/authService';
import { User } from '../types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  describe('login', () => {
    test('authenticates user when API call is successful', async () => {
      // Mock data
      const email = 'waiter@example.com';
      const password = 'password123';
      const mockUser: User = {
        id: 'user_123',
        name: 'John Waiter',
        email: email,
        role: 'waiter'
      };
      const mockToken = 'mock_jwt_token';

      // Setup axios mock
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            user: mockUser,
            token: mockToken
          },
          message: 'Login successful'
        }
      });

      // Call the function
      const result = await login(email, password);

      // Assertions
      expect(mockedAxios.post).toHaveBeenCalledWith('/auth/login', { email, password });
      expect(result).toEqual({ user: mockUser, token: mockToken });
      expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_token', mockToken);
    });

    test('throws error when API call fails', async () => {
      // Setup axios mock to simulate failure
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      // Call the function and expect it to throw
      await expect(login('waiter@example.com', 'wrong_password')).rejects.toThrow('Falha na autenticação');
      expect(mockedAxios.post).toHaveBeenCalledWith('/auth/login', { 
        email: 'waiter@example.com', 
        password: 'wrong_password' 
      });
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    test('removes auth token from localStorage', () => {
      // Setup localStorage with a token
      localStorageMock.setItem('auth_token', 'some_token');
      
      // Call the function
      logout();
      
      // Assertions
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
    });
  });

  describe('isAuthenticated', () => {
    test('returns true when auth token exists', () => {
      // Setup localStorage with a token
      localStorageMock.getItem.mockReturnValueOnce('some_token');
      
      // Call the function
      const result = isAuthenticated();
      
      // Assertions
      expect(result).toBe(true);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('auth_token');
    });

    test('returns false when auth token does not exist', () => {
      // Setup localStorage without a token
      localStorageMock.getItem.mockReturnValueOnce(null);
      
      // Call the function
      const result = isAuthenticated();
      
      // Assertions
      expect(result).toBe(false);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('auth_token');
    });
  });

  describe('getCurrentUser', () => {
    test('returns user data when API call is successful', async () => {
      // Mock data
      const mockUser: User = {
        id: 'user_123',
        name: 'John Waiter',
        email: 'waiter@example.com',
        role: 'waiter'
      };

      // Setup axios mock
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockUser,
          message: 'User fetched successfully'
        }
      });

      // Call the function
      const result = await getCurrentUser();

      // Assertions
      expect(mockedAxios.get).toHaveBeenCalledWith('/auth/me');
      expect(result).toEqual(mockUser);
    });

    test('throws error when API call fails', async () => {
      // Setup axios mock to simulate failure
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      // Call the function and expect it to throw
      await expect(getCurrentUser()).rejects.toThrow('Falha ao obter dados do usuário');
      expect(mockedAxios.get).toHaveBeenCalledWith('/auth/me');
    });
  });
});
