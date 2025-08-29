import { renderHook } from '@testing-library/react';
import { useProduct } from '../hooks/mocks/useProduct';

describe('useProduct Hook', () => {
  it('should return initial state', () => {
    const { result } = renderHook(() => useProduct());
    
    expect(result.current.products).toHaveLength(2);
    expect(result.current.categories).toHaveLength(2);
    expect(result.current.loading).toBe(false);
    expect(typeof result.current.getProductsByCategory).toBe('function');
    expect(typeof result.current.getProductById).toBe('function');
    expect(typeof result.current.searchProducts).toBe('function');
  });

  it('should have products array', () => {
    const { result } = renderHook(() => useProduct());
    
    expect(Array.isArray(result.current.products)).toBe(true);
    expect(result.current.products[0]).toHaveProperty('id');
    expect(result.current.products[0]).toHaveProperty('name');
    expect(result.current.products[0]).toHaveProperty('price');
  });

  it('should have categories array', () => {
    const { result } = renderHook(() => useProduct());
    
    expect(Array.isArray(result.current.categories)).toBe(true);
    expect(result.current.categories[0]).toHaveProperty('id');
    expect(result.current.categories[0]).toHaveProperty('name');
  });

  it('should have getProductsByCategory function', () => {
    const { result } = renderHook(() => useProduct());
    
    expect(result.current.getProductsByCategory).toBeDefined();
    expect(typeof result.current.getProductsByCategory).toBe('function');
  });

  it('should have getProductById function', () => {
    const { result } = renderHook(() => useProduct());
    
    expect(result.current.getProductById).toBeDefined();
    expect(typeof result.current.getProductById).toBe('function');
  });

  it('should have searchProducts function', () => {
    const { result } = renderHook(() => useProduct());
    
    expect(result.current.searchProducts).toBeDefined();
    expect(typeof result.current.searchProducts).toBe('function');
  });
});

