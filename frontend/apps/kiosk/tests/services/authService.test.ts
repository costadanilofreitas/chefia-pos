import { authService } from '../../src/services/authService';
import { ApiClient } from '../../src/services/apiClient';
import { offlineStorage } from '../../src/services/offlineStorage';
import { User } from '../../src/contexts/AuthContext';

// Mock dependencies
jest.mock('../../src/services/apiClient');
jest.mock('../../src/services/offlineStorage', () => ({
  offlineStorage: {
    log: jest.fn(),
    trackAction: jest.fn(),
  },
}));

describe('authService', () => {
  const mockApiClient = ApiClient as jest.MockedClass<typeof ApiClient>;
  const mockPost = jest.fn();
  const mockGet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockApiClient.prototype.post = mockPost;
    mockApiClient.prototype.get = mockGet;
    
    // Reset navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });

    // Reset navigator.language
    Object.defineProperty(navigator, 'language', {
      writable: true,
      value: 'pt-BR',
    });
  });

  describe('loginCustomer', () => {
    test('successfully logs in customer with backend response', async () => {
      const mockResponse = {
        data: {
          id: 'customer-123',
          name: 'John Doe',
          email: 'john@example.com',
          language: 'en-US',
          accessibility: true,
        },
      };

      mockPost.mockResolvedValueOnce(mockResponse);

      const result = await authService.loginCustomer('john@example.com');

      expect(mockPost).toHaveBeenCalledWith('/auth/customer/login', {
        identifier: 'john@example.com',
      });

      expect(result).toEqual({
        id: 'customer-123',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'customer',
        preferences: {
          language: 'en-US',
          accessibility: true,
        },
      });

      expect(offlineStorage.log).toHaveBeenCalledWith('Customer authenticated', {
        userId: 'customer-123',
        identifier: '***@example.com',
      });
    });

    test('handles partial backend response', async () => {
      const mockResponse = {
        data: {
          // Minimal response without optional fields
        },
      };

      mockPost.mockResolvedValueOnce(mockResponse);

      const result = await authService.loginCustomer('12345678');

      expect(result.id).toContain('customer-');
      expect(result.name).toBe('12345678');
      expect(result.email).toBeUndefined();
      expect(result.role).toBe('customer');
      expect(result.preferences.language).toBe('pt-BR');
      expect(result.preferences.accessibility).toBe(false);
    });

    test('creates offline customer session when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      mockPost.mockRejectedOnce(new Error('Network error'));

      const result = await authService.loginCustomer('offline@test.com');

      expect(result.id).toContain('customer-offline-');
      expect(result.name).toBe('offline@test.com');
      expect(result.role).toBe('customer');
      expect(result.preferences.language).toBe('pt-BR');

      expect(offlineStorage.log).toHaveBeenCalledWith('Offline login attempt', {
        identifier: 'offline@test.com',
      });
    });

    test('throws error when online but authentication fails', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      const error = new Error('Authentication failed');
      mockPost.mockRejectedOnce(error);

      await expect(authService.loginCustomer('invalid@test.com')).rejects.toThrow(
        'Authentication failed'
      );
    });

    test('masks phone number in logs', async () => {
      const mockResponse = {
        data: {
          id: 'customer-456',
          name: 'Jane Doe',
        },
      };

      mockPost.mockResolvedValueOnce(mockResponse);

      await authService.loginCustomer('+5511999887766');

      expect(offlineStorage.log).toHaveBeenCalledWith('Customer authenticated', {
        userId: 'customer-456',
        identifier: '************766',
      });
    });
  });

  describe('createGuestUser', () => {
    test('creates guest user with unique ID', () => {
      const user1 = authService.createGuestUser();
      const user2 = authService.createGuestUser();

      expect(user1.id).toContain('guest-');
      expect(user2.id).toContain('guest-');
      expect(user1.id).not.toBe(user2.id);
    });

    test('sets guest user properties correctly', () => {
      const user = authService.createGuestUser();

      expect(user.name).toBe('Guest');
      expect(user.role).toBe('guest');
      expect(user.preferences.language).toBe('pt-BR');
    });

    test('uses navigator language for preferences', () => {
      Object.defineProperty(navigator, 'language', {
        writable: true,
        value: 'en-US',
      });

      const user = authService.createGuestUser();

      expect(user.preferences.language).toBe('en-US');
    });

    test('generates valid guest ID format', () => {
      const user = authService.createGuestUser();
      const idPattern = /^guest-\d+-[a-z0-9]{6}$/;

      expect(user.id).toMatch(idPattern);
    });
  });

  describe('validateSession', () => {
    test('guest sessions are always valid', async () => {
      const result = await authService.validateSession('guest-12345-abc123');

      expect(result).toBe(true);
      expect(mockGet).not.toHaveBeenCalled();
    });

    test('validates customer session with backend', async () => {
      mockGet.mockResolvedValueOnce({ data: { valid: true } });

      const result = await authService.validateSession('customer-123');

      expect(mockGet).toHaveBeenCalledWith('/auth/validate/customer-123');
      expect(result).toBe(true);
    });

    test('returns false for invalid customer session', async () => {
      mockGet.mockResolvedValueOnce({ data: { valid: false } });

      const result = await authService.validateSession('customer-456');

      expect(result).toBe(false);
    });

    test('considers session valid when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      mockGet.mockRejectedOnce(new Error('Network error'));

      const result = await authService.validateSession('customer-789');

      expect(result).toBe(true);
      expect(offlineStorage.log).toHaveBeenCalledWith('Session validation failed', {
        userId: 'customer-789',
        error: expect.any(Error),
      });
    });

    test('returns false when online but validation fails', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      mockGet.mockRejectedOnce(new Error('Server error'));

      const result = await authService.validateSession('customer-999');

      expect(result).toBe(false);
    });
  });

  describe('convertGuestToCustomer', () => {
    test('successfully converts guest to customer', async () => {
      const mockResponse = {
        data: {
          id: 'customer-new-123',
          name: 'Converted User',
          email: 'converted@example.com',
          language: 'es-ES',
          accessibility: false,
        },
      };

      mockPost.mockResolvedValueOnce(mockResponse);

      const result = await authService.convertGuestToCustomer(
        'guest-123-abc',
        'converted@example.com'
      );

      expect(mockPost).toHaveBeenCalledWith('/auth/convert-guest', {
        guestId: 'guest-123-abc',
        identifier: 'converted@example.com',
      });

      expect(result).toEqual({
        id: 'customer-new-123',
        name: 'Converted User',
        email: 'converted@example.com',
        role: 'customer',
        preferences: {
          language: 'es-ES',
          accessibility: false,
        },
      });

      expect(offlineStorage.log).toHaveBeenCalledWith('Guest converted to customer', {
        guestId: 'guest-123-abc',
        customerId: 'customer-new-123',
      });
    });

    test('falls back to login when conversion fails', async () => {
      // First call fails (convert-guest)
      mockPost.mockRejectedOnce(new Error('Conversion failed'));

      // Second call succeeds (login)
      mockPost.mockResolvedValueOnce({
        data: {
          id: 'customer-fallback',
          name: 'Fallback User',
        },
      });

      const result = await authService.convertGuestToCustomer(
        'guest-456-def',
        'fallback@example.com'
      );

      expect(mockPost).toHaveBeenCalledTimes(2);
      expect(mockPost).toHaveBeenNthCalledWith(1, '/auth/convert-guest', {
        guestId: 'guest-456-def',
        identifier: 'fallback@example.com',
      });
      expect(mockPost).toHaveBeenNthCalledWith(2, '/auth/customer/login', {
        identifier: 'fallback@example.com',
      });

      expect(result.id).toBe('customer-fallback');
      expect(result.name).toBe('Fallback User');

      expect(offlineStorage.log).toHaveBeenCalledWith(
        'Failed to convert guest session',
        {
          guestId: 'guest-456-def',
          error: expect.any(Error),
        }
      );
    });

    test('handles partial response data', async () => {
      const mockResponse = {
        data: {
          // Minimal response
        },
      };

      mockPost.mockResolvedValueOnce(mockResponse);

      const result = await authService.convertGuestToCustomer(
        'guest-789-ghi',
        'minimal@example.com'
      );

      expect(result.id).toContain('customer-');
      expect(result.name).toBe('minimal@example.com');
      expect(result.role).toBe('customer');
      expect(result.preferences.language).toBe('pt-BR');
    });
  });

  describe('trackActivity', () => {
    test('tracks user activity with action', () => {
      authService.trackActivity('user-123', 'view_product', {
        productId: 'prod-456',
        category: 'pizza',
      });

      expect(offlineStorage.trackAction).toHaveBeenCalledWith('user_view_product', {
        userId: 'user-123',
        timestamp: expect.any(Number),
        productId: 'prod-456',
        category: 'pizza',
      });
    });

    test('tracks activity without additional data', () => {
      authService.trackActivity('user-456', 'logout');

      expect(offlineStorage.trackAction).toHaveBeenCalledWith('user_logout', {
        userId: 'user-456',
        timestamp: expect.any(Number),
      });
    });

    test('includes timestamp in tracked data', () => {
      const beforeTime = Date.now();
      
      authService.trackActivity('user-789', 'checkout');
      
      const afterTime = Date.now();

      expect(offlineStorage.trackAction).toHaveBeenCalledWith('user_checkout', {
        userId: 'user-789',
        timestamp: expect.any(Number),
      });

      const calledWith = (offlineStorage.trackAction as jest.Mock).mock.calls[0][1];
      expect(calledWith.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(calledWith.timestamp).toBeLessThanOrEqual(afterTime);
    });

    test('merges additional data with default fields', () => {
      authService.trackActivity('user-999', 'add_to_cart', {
        userId: 'should-be-overwritten',
        timestamp: 'should-be-overwritten',
        productId: 'prod-111',
        quantity: 2,
      });

      expect(offlineStorage.trackAction).toHaveBeenCalledWith('user_add_to_cart', {
        userId: 'user-999', // Should use the parameter value
        timestamp: expect.any(Number), // Should use generated timestamp
        productId: 'prod-111',
        quantity: 2,
      });
    });
  });

  describe('Edge Cases', () => {
    test('handles undefined navigator.language', () => {
      Object.defineProperty(navigator, 'language', {
        writable: true,
        value: undefined,
      });

      const user = authService.createGuestUser();

      expect(user.preferences.language).toBe('pt-BR');
    });

    test('handles empty identifier in login', async () => {
      const mockResponse = {
        data: {
          id: 'customer-empty',
          name: '',
        },
      };

      mockPost.mockResolvedValueOnce(mockResponse);

      const result = await authService.loginCustomer('');

      expect(result.name).toBe('');
    });

    test('handles very long identifiers', async () => {
      const longIdentifier = 'a'.repeat(1000);
      const mockResponse = {
        data: {
          id: 'customer-long',
          name: 'Long User',
        },
      };

      mockPost.mockResolvedValueOnce(mockResponse);

      const result = await authService.loginCustomer(longIdentifier);

      expect(result.name).toBe('Long User');
      
      // Check that logging doesn't fail with long identifier
      expect(offlineStorage.log).toHaveBeenCalled();
    });

    test('handles special characters in identifier', async () => {
      const specialIdentifier = 'user@#$%^&*()_+{}|:"<>?';
      const mockResponse = {
        data: {
          id: 'customer-special',
          name: 'Special User',
        },
      };

      mockPost.mockResolvedValueOnce(mockResponse);

      const result = await authService.loginCustomer(specialIdentifier);

      expect(result.name).toBe('Special User');
    });
  });

  describe('Type Safety', () => {
    test('returns User type from loginCustomer', async () => {
      const mockResponse = {
        data: {
          id: 'customer-type',
          name: 'Type User',
        },
      };

      mockPost.mockResolvedValueOnce(mockResponse);

      const result: User = await authService.loginCustomer('type@test.com');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('role');
      expect(result).toHaveProperty('preferences');
    });

    test('returns User type from createGuestUser', () => {
      const result: User = authService.createGuestUser();

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('role');
      expect(result).toHaveProperty('preferences');
    });

    test('returns User type from convertGuestToCustomer', async () => {
      const mockResponse = {
        data: {
          id: 'customer-converted',
          name: 'Converted',
        },
      };

      mockPost.mockResolvedValueOnce(mockResponse);

      const result: User = await authService.convertGuestToCustomer(
        'guest-111',
        'convert@test.com'
      );

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('role');
      expect(result).toHaveProperty('preferences');
    });
  });
});