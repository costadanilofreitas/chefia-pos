import { User } from '../contexts/AuthContext';
import { ApiClient } from './apiClient';

const apiClient = new ApiClient();
import { offlineStorage } from './offlineStorage';

class AuthService {
  private readonly GUEST_PREFIX = 'guest';
  private readonly CUSTOMER_PREFIX = 'customer';

  /**
   * Login customer using identifier (phone, email, or loyalty card)
   */
  async loginCustomer(identifier: string): Promise<User> {
    try {
      // Try to authenticate with the backend
      const response = await apiClient.post('/auth/customer/login', {
        identifier
      });

      const userData: User = {
        id: response.data?.id || `${this.CUSTOMER_PREFIX}-${Date.now()}`,
        name: response.data?.name || identifier,
        email: response.data?.email,
        role: 'customer',
        preferences: {
          language: response.data?.language || 'pt-BR',
          accessibility: response.data?.accessibility || false
        }
      };

      offlineStorage.log('Customer authenticated', { 
        userId: userData.id,
        identifier: identifier.replace(/./g, '*').slice(0, -3) + identifier.slice(-3) 
      });

      return userData;
    } catch (error) {
      // Fallback for offline mode
      if (!navigator.onLine) {
        offlineStorage.log('Offline login attempt', { identifier });
        
        // Create offline customer session
        const offlineUser: User = {
          id: `${this.CUSTOMER_PREFIX}-offline-${Date.now()}`,
          name: identifier,
          role: 'customer',
          preferences: {
            language: 'pt-BR'
          }
        };

        return offlineUser;
      }

      throw error;
    }
  }

  /**
   * Create a guest user session
   */
  createGuestUser(): User {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    
    return {
      id: `${this.GUEST_PREFIX}-${timestamp}-${randomId}`,
      name: 'Guest',
      role: 'guest',
      preferences: {
        language: navigator.language || 'pt-BR'
      }
    };
  }

  /**
   * Validate if a session is still valid
   */
  async validateSession(userId: string): Promise<boolean> {
    try {
      // Guest sessions are always valid until they expire
      if (userId.startsWith(this.GUEST_PREFIX)) {
        return true;
      }

      // Validate customer sessions with backend
      const response = await apiClient.get(`/auth/validate/${userId}`);
      return response.data?.valid === true;
    } catch (error) {
      offlineStorage.log('Session validation failed', { userId, error });
      
      // In offline mode, consider the session valid
      if (!navigator.onLine) {
        return true;
      }

      return false;
    }
  }

  /**
   * Convert guest session to customer
   */
  async convertGuestToCustomer(guestId: string, identifier: string): Promise<User> {
    try {
      const response = await apiClient.post('/auth/convert-guest', {
        guestId,
        identifier
      });

      const userData: User = {
        id: response.data?.id || `${this.CUSTOMER_PREFIX}-${Date.now()}`,
        name: response.data?.name || identifier,
        email: response.data?.email,
        role: 'customer',
        preferences: {
          language: response.data?.language || 'pt-BR',
          accessibility: response.data?.accessibility || false
        }
      };

      offlineStorage.log('Guest converted to customer', { 
        guestId,
        customerId: userData.id 
      });

      return userData;
    } catch (error) {
      offlineStorage.log('Failed to convert guest session', { guestId, error });
      
      // Fallback: create new customer session
      return this.loginCustomer(identifier);
    }
  }

  /**
   * Track user activity for analytics
   */
  trackActivity(userId: string, action: string, data?: any): void {
    offlineStorage.trackAction(`user_${action}`, {
      userId,
      timestamp: Date.now(),
      ...data
    });
  }
}

export const authService = new AuthService();