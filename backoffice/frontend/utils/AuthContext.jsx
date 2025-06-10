import React, { createContext, useContext, useState, useEffect } from 'react';

// Create auth context
const AuthContext = createContext();

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          // In a real app, validate token with backend
          const response = await fetch('/api/backoffice/auth/validate', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
          } else {
            // Token is invalid, clear it
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
          }
        } catch (err) {
          console.error('Auth validation error:', err);
          setError('Failed to validate authentication');
        }
      }
      setLoading(false);
    };

    // For demo purposes, simulate auth check
    setTimeout(() => {
      if (token) {
        // Mock user data
        setUser({
          id: '123',
          username: 'admin',
          role: 'admin',
          permissions: ['manage_users', 'view_reports']
        });
      }
      setLoading(false);
    }, 1000);

    // Uncomment for real implementation
    // checkAuth();
  }, [token]);

  // Login function
  const login = async (username, password) => {
    setLoading(true);
    setError(null);
    
    try {
      // In a real app, send credentials to backend
      // const response = await fetch('/api/backoffice/auth/token', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({ username, password })
      // });
      
      // For demo purposes
      if (username === 'admin' && password === 'admin') {
        const mockToken = 'mock-jwt-token';
        localStorage.setItem('token', mockToken);
        setToken(mockToken);
        setUser({
          id: '123',
          username: 'admin',
          role: 'admin',
          permissions: ['manage_users', 'view_reports']
        });
        return true;
      } else {
        setError('Invalid username or password');
        return false;
      }
      
      // Uncomment for real implementation
      // if (response.ok) {
      //   const data = await response.json();
      //   localStorage.setItem('token', data.access_token);
      //   setToken(data.access_token);
      //   setUser(data.user);
      //   return true;
      // } else {
      //   const errorData = await response.json();
      //   setError(errorData.error || 'Login failed');
      //   return false;
      // }
    } catch (err) {
      console.error('Login error:', err);
      setError('Failed to connect to authentication service');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  // Check if user has permission
  const hasPermission = (permission) => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  };

  // Check if user has role
  const hasRole = (role) => {
    if (!user) return false;
    return user.role === role;
  };

  // Auth context value
  const value = {
    user,
    token,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    logout,
    hasPermission,
    hasRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
