/**
 * Tests for RequestCache Service
 */

import { requestCache } from './RequestCache';

describe('RequestCache', () => {
  let cache = requestCache;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    cache = new (RequestCache as any)();
  });

  afterEach(() => {
    cache.destroy();
    jest.useRealTimers();
  });

  describe('Basic Cache Operations', () => {
    it('should cache successful request results', async () => {
      const fetcher = jest.fn().mockResolvedValue({ data: 'test' });
      
      const result1 = await cache.execute('test-key', fetcher);
      const result2 = await cache.execute('test-key', fetcher);
      
      expect(result1).toEqual({ data: 'test' });
      expect(result2).toEqual({ data: 'test' });
      expect(fetcher).toHaveBeenCalledTimes(1); // Should use cache for second call
    });

    it('should respect TTL configuration', async () => {
      const fetcher = jest.fn()
        .mockResolvedValueOnce({ data: 'first' })
        .mockResolvedValueOnce({ data: 'second' });
      
      // First call
      const result1 = await cache.execute('ttl-test', fetcher, { ttl: 1000 });
      expect(result1).toEqual({ data: 'first' });
      
      // Second call within TTL
      jest.advanceTimersByTime(500);
      const result2 = await cache.execute('ttl-test', fetcher, { ttl: 1000 });
      expect(result2).toEqual({ data: 'first' });
      expect(fetcher).toHaveBeenCalledTimes(1);
      
      // Third call after TTL expires
      jest.advanceTimersByTime(600);
      const result3 = await cache.execute('ttl-test', fetcher, { ttl: 1000 });
      expect(result3).toEqual({ data: 'second' });
      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('should use default TTL when not specified', async () => {
      const fetcher = jest.fn().mockResolvedValue({ data: 'test' });
      
      await cache.execute('default-ttl', fetcher);
      
      // Should use cache within default window (100ms)
      jest.advanceTimersByTime(50);
      await cache.execute('default-ttl', fetcher);
      expect(fetcher).toHaveBeenCalledTimes(1);
      
      // Should refetch after default TTL
      jest.advanceTimersByTime(100);
      await cache.execute('default-ttl', fetcher);
      expect(fetcher).toHaveBeenCalledTimes(2);
    });
  });

  describe('Request Deduplication', () => {
    it('should deduplicate concurrent requests', async () => {
      const fetcher = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: 'test' }), 100))
      );
      
      // Make multiple concurrent requests
      const promises = [
        cache.execute('dedup-key', fetcher),
        cache.execute('dedup-key', fetcher),
        cache.execute('dedup-key', fetcher)
      ];
      
      // Advance timers to resolve the promise
      jest.advanceTimersByTime(100);
      
      const results = await Promise.all(promises);
      
      // All should get the same result
      results.forEach(result => {
        expect(result).toEqual({ data: 'test' });
      });
      
      // But fetcher should only be called once
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('should handle dedup window correctly', async () => {
      const fetcher = jest.fn().mockResolvedValue({ data: 'test' });
      
      await cache.execute('dedup-window', fetcher, { dedupWindow: 50 });
      
      // Within dedup window - should not fetch
      jest.advanceTimersByTime(30);
      await cache.execute('dedup-window', fetcher, { dedupWindow: 50 });
      expect(fetcher).toHaveBeenCalledTimes(1);
      
      // After dedup window - should fetch again if cache expired
      jest.advanceTimersByTime(200);
      await cache.execute('dedup-window', fetcher, { dedupWindow: 50, ttl: 100 });
      expect(fetcher).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate specific cache entry', async () => {
      const fetcher = jest.fn()
        .mockResolvedValueOnce({ data: 'first' })
        .mockResolvedValueOnce({ data: 'second' });
      
      await cache.execute('invalidate-test', fetcher);
      expect(fetcher).toHaveBeenCalledTimes(1);
      
      cache.invalidate('invalidate-test');
      
      await cache.execute('invalidate-test', fetcher);
      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('should invalidate cache entries matching pattern', async () => {
      const fetcher1 = jest.fn().mockResolvedValue({ data: 'order1' });
      const fetcher2 = jest.fn().mockResolvedValue({ data: 'order2' });
      const fetcher3 = jest.fn().mockResolvedValue({ data: 'product' });
      
      await cache.execute('order-1', fetcher1);
      await cache.execute('order-2', fetcher2);
      await cache.execute('product-1', fetcher3);
      
      cache.invalidatePattern('order');
      
      // Order caches should be invalidated
      await cache.execute('order-1', fetcher1);
      await cache.execute('order-2', fetcher2);
      expect(fetcher1).toHaveBeenCalledTimes(2);
      expect(fetcher2).toHaveBeenCalledTimes(2);
      
      // Product cache should remain
      await cache.execute('product-1', fetcher3);
      expect(fetcher3).toHaveBeenCalledTimes(1);
    });

    it('should clear all cache entries', async () => {
      const fetchers = [
        jest.fn().mockResolvedValue({ data: 'test1' }),
        jest.fn().mockResolvedValue({ data: 'test2' }),
        jest.fn().mockResolvedValue({ data: 'test3' })
      ];
      
      // Cache multiple entries
      await Promise.all([
        cache.execute('key1', fetchers[0]),
        cache.execute('key2', fetchers[1]),
        cache.execute('key3', fetchers[2])
      ]);
      
      cache.clear();
      
      // All should refetch after clear
      await Promise.all([
        cache.execute('key1', fetchers[0]),
        cache.execute('key2', fetchers[1]),
        cache.execute('key3', fetchers[2])
      ]);
      
      fetchers.forEach(fetcher => {
        expect(fetcher).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Memory Management', () => {
    it('should enforce maximum cache size', async () => {
      // Set max cache size to 3 for testing
      (cache as any).maxCacheSize = 3;
      
      const fetchers = Array.from({ length: 5 }, (_, i) => 
        jest.fn().mockResolvedValue({ data: `item${i}` })
      );
      
      // Add 5 items to cache
      for (let i = 0; i < 5; i++) {
        await cache.execute(`key${i}`, fetchers[i]);
      }
      
      const stats = cache.getStats();
      expect(stats.cacheSize).toBeLessThanOrEqual(3);
    });

    it('should estimate memory usage', async () => {
      const largeData = { 
        data: 'x'.repeat(1000), // 1000 characters
        nested: { values: Array(100).fill('test') }
      };
      const fetcher = jest.fn().mockResolvedValue(largeData);
      
      await cache.execute('large-data', fetcher);
      
      const stats = cache.getStats();
      expect(parseFloat(stats.memoryUsageMB)).toBeGreaterThan(0);
      expect(stats.memoryUsagePercent).toBeDefined();
    });

    it('should enforce memory limits', async () => {
      // Set very low memory limit for testing
      (cache as any).maxMemoryMB = 0.001; // 1KB
      
      const largeData = { data: 'x'.repeat(10000) }; // 10KB of data
      const fetcher = jest.fn().mockResolvedValue(largeData);
      
      await cache.execute('huge-data', fetcher);
      
      const stats = cache.getStats();
      // Cache should be cleared due to memory limit
      expect(stats.cacheSize).toBe(0);
    });
  });

  describe('TTL Configuration', () => {
    it('should use specific TTL for known patterns', async () => {
      const orderFetcher = jest.fn().mockResolvedValue({ data: 'order' });
      const productFetcher = jest.fn().mockResolvedValue({ data: 'product' });
      
      // Orders have 500ms TTL
      await cache.execute('/orders/123', orderFetcher);
      jest.advanceTimersByTime(400);
      await cache.execute('/orders/123', orderFetcher);
      expect(orderFetcher).toHaveBeenCalledTimes(1); // Still cached
      
      jest.advanceTimersByTime(200);
      await cache.execute('/orders/123', orderFetcher);
      expect(orderFetcher).toHaveBeenCalledTimes(2); // Cache expired
      
      // Products have 5000ms TTL
      await cache.execute('/products/456', productFetcher);
      jest.advanceTimersByTime(4000);
      await cache.execute('/products/456', productFetcher);
      expect(productFetcher).toHaveBeenCalledTimes(1); // Still cached
    });
  });

  describe('Auto Cleanup', () => {
    it('should automatically clean expired entries', async () => {
      const fetcher = jest.fn().mockResolvedValue({ data: 'test' });
      
      // Add entries with short TTL
      await cache.execute('expire1', fetcher, { ttl: 100 });
      await cache.execute('expire2', fetcher, { ttl: 200 });
      await cache.execute('keep', fetcher, { ttl: 20000 });
      
      let stats = cache.getStats();
      expect(stats.cacheSize).toBe(3);
      
      // Advance time past TTL of first two entries
      jest.advanceTimersByTime(10000);
      
      // Trigger cleanup (happens every 10 seconds)
      stats = cache.getStats();
      expect(stats.cacheSize).toBe(1); // Only 'keep' should remain
    });

    it('should cleanup on interval', () => {
      const cleanupSpy = jest.spyOn(cache as any, 'cleanupExpiredEntries');
      
      // Advance time to trigger multiple cleanup cycles
      jest.advanceTimersByTime(30000); // 30 seconds = 3 cycles
      
      expect(cleanupSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('Statistics', () => {
    it('should provide accurate cache statistics', async () => {
      const fetcher1 = jest.fn().mockResolvedValue({ data: 'test1' });
      const fetcher2 = jest.fn().mockResolvedValue({ data: 'test2' });
      
      await cache.execute('stat1', fetcher1, { ttl: 5000 });
      await cache.execute('stat2', fetcher2, { ttl: 1000 });
      
      jest.advanceTimersByTime(1500);
      
      const stats = cache.getStats();
      
      expect(stats.cacheSize).toBe(2);
      expect(stats.pendingRequests).toBe(0);
      expect(stats.entries).toHaveLength(2);
      
      // Check individual entry stats
      const entry1 = stats.entries.find(e => e.key === 'stat1');
      const entry2 = stats.entries.find(e => e.key === 'stat2');
      
      expect(entry1?.expired).toBe(false);
      expect(entry2?.expired).toBe(true);
      expect(entry1?.hasData).toBe(true);
    });
  });

  describe('Preloading', () => {
    it('should allow preloading data into cache', async () => {
      const preloadData = { id: 1, name: 'Preloaded' };
      cache.preload('preloaded-key', preloadData);
      
      const fetcher = jest.fn();
      const result = await cache.execute('preloaded-key', fetcher);
      
      expect(result).toEqual(preloadData);
      expect(fetcher).not.toHaveBeenCalled(); // Should use preloaded data
    });

    it('should enforce memory limits when preloading', () => {
      (cache as any).maxCacheSize = 2;
      
      cache.preload('pre1', { data: '1' });
      cache.preload('pre2', { data: '2' });
      cache.preload('pre3', { data: '3' });
      
      const stats = cache.getStats();
      expect(stats.cacheSize).toBe(2); // Should enforce limit
    });
  });

  describe('Error Handling', () => {
    it('should not cache failed requests', async () => {
      const fetcher = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: 'success' });
      
      // First call fails
      await expect(cache.execute('error-test', fetcher)).rejects.toThrow('Network error');
      
      // Second call should retry, not use cache
      const result = await cache.execute('error-test', fetcher);
      expect(result).toEqual({ data: 'success' });
      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('should handle JSON stringify errors in memory estimation', async () => {
      // Create circular reference
      const circularData: any = { data: 'test' };
      circularData.self = circularData;
      
      const fetcher = jest.fn().mockResolvedValue(circularData);
      
      await cache.execute('circular', fetcher);
      
      const stats = cache.getStats();
      // Should handle circular reference gracefully
      expect(parseFloat(stats.memoryUsageMB)).toBeGreaterThan(0);
    });
  });

  describe('React Hook Helper', () => {
    it('should create cached request function', async () => {
      const { useCachedRequest } = require('./RequestCache');
      const fetcher = jest.fn().mockResolvedValue({ data: 'hook-test' });
      
      const cachedFn = useCachedRequest('hook-key', fetcher, { ttl: 1000 });
      
      const result1 = await cachedFn();
      const result2 = await cachedFn();
      
      expect(result1).toEqual({ data: 'hook-test' });
      expect(result2).toEqual({ data: 'hook-test' });
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle rapid successive requests correctly', async () => {
      const fetcher = jest.fn().mockImplementation(
        () => new Promise(resolve => {
          setTimeout(() => resolve({ data: 'delayed' }), 50);
        })
      );
      
      // Make rapid requests
      const results = [];
      for (let i = 0; i < 5; i++) {
        results.push(cache.execute('rapid-key', fetcher));
        jest.advanceTimersByTime(5);
      }
      
      jest.advanceTimersByTime(50);
      
      const resolved = await Promise.all(results);
      
      // All should get same result
      resolved.forEach(r => expect(r).toEqual({ data: 'delayed' }));
      
      // Should only fetch once due to deduplication
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });

  describe('Destroy', () => {
    it('should properly clean up when destroyed', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      cache.destroy();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
      
      const stats = cache.getStats();
      expect(stats.cacheSize).toBe(0);
    });
  });
});