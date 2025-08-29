import { renderHook } from '@testing-library/react';
import { useAuth } from '../../src/hooks/useAuth';

describe('useAuth Hook', () => {
  it('should return initial state', () => {
    const { result } = renderHook(() => useAuth());
    
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(typeof result.current.login).toBe('function');
    expect(typeof result.current.logout).toBe('function');
    expect(typeof result.current.hasPermission).toBe('function');
  });

  it('should have login function', () => {
    const { result } = renderHook(() => useAuth());
    
    expect(result.current.login).toBeDefined();
    expect(typeof result.current.login).toBe('function');
  });

  it('should have logout function', () => {
    const { result } = renderHook(() => useAuth());
    
    expect(result.current.logout).toBeDefined();
    expect(typeof result.current.logout).toBe('function');
  });

  it('should have hasPermission function', () => {
    const { result } = renderHook(() => useAuth());
    
    expect(result.current.hasPermission).toBeDefined();
    expect(typeof result.current.hasPermission).toBe('function');
  });
});

