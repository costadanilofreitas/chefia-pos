import { renderHook, act, waitFor } from '@testing-library/react';
import { useKDSAlerts } from '../../src/hooks/useKDSAlerts';
import { audioService } from '../../src/services/audioService';

// Mock audio service
jest.mock('../../src/services/audioService', () => ({
  audioService: {
    playSound: jest.fn()
  }
}));

describe('useKDSAlerts Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Alert Management', () => {
    it('should initialize with empty alerts', () => {
      const { result } = renderHook(() => useKDSAlerts());
      
      expect(result.current.alerts).toEqual([]);
      expect(result.current.stats.total).toBe(0);
    });

    it('should add new alert', () => {
      const { result } = renderHook(() => useKDSAlerts());
      
      act(() => {
        result.current.addAlert('new', 'Test alert', 'order-123');
      });
      
      expect(result.current.alerts).toHaveLength(1);
      expect(result.current.alerts[0]).toMatchObject({
        type: 'new',
        message: 'Test alert',
        orderId: 'order-123'
      });
      expect(result.current.alerts[0].id).toBeDefined();
      expect(result.current.alerts[0].timestamp).toBeInstanceOf(Date);
    });

    it('should generate unique alert IDs', () => {
      const { result } = renderHook(() => useKDSAlerts());
      
      const ids = new Set();
      
      act(() => {
        for (let i = 0; i < 10; i++) {
          const id = result.current.addAlert('new', `Alert ${i}`);
          ids.add(id);
        }
      });
      
      expect(ids.size).toBe(10);
    });

    it('should add alerts in correct order (newest first)', () => {
      const { result } = renderHook(() => useKDSAlerts());
      
      act(() => {
        result.current.addAlert('new', 'First alert');
      });
      
      act(() => {
        result.current.addAlert('urgent', 'Second alert');
      });
      
      act(() => {
        result.current.addAlert('ready', 'Third alert');
      });
      
      expect(result.current.alerts[0].message).toBe('Third alert');
      expect(result.current.alerts[1].message).toBe('Second alert');
      expect(result.current.alerts[2].message).toBe('First alert');
    });

    it('should respect maxAlerts limit', () => {
      const { result } = renderHook(() => useKDSAlerts({ maxAlerts: 3 }));
      
      act(() => {
        for (let i = 0; i < 5; i++) {
          result.current.addAlert('new', `Alert ${i}`);
        }
      });
      
      expect(result.current.alerts).toHaveLength(3);
      expect(result.current.alerts[0].message).toBe('Alert 4'); // Latest
      expect(result.current.alerts[2].message).toBe('Alert 2'); // Third latest
    });

    it('should remove specific alert', () => {
      const { result } = renderHook(() => useKDSAlerts());
      
      let alertId: string;
      act(() => {
        result.current.addAlert('new', 'Alert 1');
        alertId = result.current.addAlert('urgent', 'Alert 2');
        result.current.addAlert('ready', 'Alert 3');
      });
      
      expect(result.current.alerts).toHaveLength(3);
      
      act(() => {
        result.current.removeAlert(alertId!);
      });
      
      expect(result.current.alerts).toHaveLength(2);
      expect(result.current.alerts.find(a => a.id === alertId)).toBeUndefined();
    });

    it('should clear all alerts', () => {
      const { result } = renderHook(() => useKDSAlerts());
      
      act(() => {
        result.current.addAlert('new', 'Alert 1');
        result.current.addAlert('urgent', 'Alert 2');
        result.current.addAlert('ready', 'Alert 3');
      });
      
      expect(result.current.alerts).toHaveLength(3);
      
      act(() => {
        result.current.clearAlerts();
      });
      
      expect(result.current.alerts).toHaveLength(0);
    });
  });

  describe('Auto-remove Functionality', () => {
    it('should auto-remove alerts after delay', () => {
      const { result } = renderHook(() => useKDSAlerts({ autoRemoveDelay: 1000 }));
      
      act(() => {
        result.current.addAlert('new', 'Temporary alert');
      });
      
      expect(result.current.alerts).toHaveLength(1);
      
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      expect(result.current.alerts).toHaveLength(0);
    });

    it('should not auto-remove when delay is 0', () => {
      const { result } = renderHook(() => useKDSAlerts({ autoRemoveDelay: 0 }));
      
      act(() => {
        result.current.addAlert('new', 'Permanent alert');
      });
      
      act(() => {
        jest.advanceTimersByTime(10000);
      });
      
      expect(result.current.alerts).toHaveLength(1);
    });

    it('should cancel auto-remove timer when alert is manually removed', () => {
      const { result } = renderHook(() => useKDSAlerts({ autoRemoveDelay: 5000 }));
      
      let alertId: string;
      act(() => {
        alertId = result.current.addAlert('new', 'Alert');
      });
      
      act(() => {
        result.current.removeAlert(alertId!);
      });
      
      // Advance time past the auto-remove delay
      act(() => {
        jest.advanceTimersByTime(6000);
      });
      
      // Alert should stay removed, no errors from cleared timer
      expect(result.current.alerts).toHaveLength(0);
    });

    it('should clear all timers when clearing all alerts', () => {
      const { result } = renderHook(() => useKDSAlerts({ autoRemoveDelay: 5000 }));
      
      act(() => {
        result.current.addAlert('new', 'Alert 1');
        result.current.addAlert('urgent', 'Alert 2');
        result.current.addAlert('ready', 'Alert 3');
      });
      
      act(() => {
        result.current.clearAlerts();
      });
      
      // Advance time past the auto-remove delay
      act(() => {
        jest.advanceTimersByTime(6000);
      });
      
      // Should remain empty, no errors from cleared timers
      expect(result.current.alerts).toHaveLength(0);
    });

    it('should handle multiple alerts with different timings', () => {
      const { result } = renderHook(() => useKDSAlerts({ autoRemoveDelay: 1000 }));
      
      act(() => {
        result.current.addAlert('new', 'Alert 1');
      });
      
      act(() => {
        jest.advanceTimersByTime(500);
      });
      
      act(() => {
        result.current.addAlert('urgent', 'Alert 2');
      });
      
      // Alert 1 should be removed after 500ms more
      act(() => {
        jest.advanceTimersByTime(500);
      });
      
      expect(result.current.alerts).toHaveLength(1);
      expect(result.current.alerts[0].message).toBe('Alert 2');
      
      // Alert 2 should be removed after 500ms more
      act(() => {
        jest.advanceTimersByTime(500);
      });
      
      expect(result.current.alerts).toHaveLength(0);
    });
  });

  describe('Sound Management', () => {
    it('should play sound when adding alert with sound enabled', () => {
      const { result } = renderHook(() => useKDSAlerts({ soundEnabled: true }));
      
      act(() => {
        result.current.addAlert('new', 'New order');
      });
      
      expect(audioService.playSound).toHaveBeenCalledWith('newOrder');
    });

    it('should not play sound when sound is disabled', () => {
      const { result } = renderHook(() => useKDSAlerts({ soundEnabled: false }));
      
      act(() => {
        result.current.addAlert('new', 'New order');
      });
      
      expect(audioService.playSound).not.toHaveBeenCalled();
    });

    it('should play correct sound for each alert type', () => {
      const { result } = renderHook(() => useKDSAlerts({ soundEnabled: true }));
      
      act(() => {
        result.current.addAlert('new', 'New');
      });
      expect(audioService.playSound).toHaveBeenCalledWith('newOrder');
      
      act(() => {
        result.current.addAlert('urgent', 'Urgent');
      });
      expect(audioService.playSound).toHaveBeenCalledWith('urgentOrder');
      
      act(() => {
        result.current.addAlert('ready', 'Ready');
      });
      expect(audioService.playSound).toHaveBeenCalledWith('success');
      
      act(() => {
        result.current.addAlert('warning', 'Warning');
      });
      expect(audioService.playSound).toHaveBeenCalledWith('warning');
    });

    it('should not play sound for muted alert types', () => {
      const { result } = renderHook(() => useKDSAlerts({ soundEnabled: true }));
      
      act(() => {
        result.current.toggleMute('new');
      });
      
      (audioService.playSound as jest.Mock).mockClear();
      
      act(() => {
        result.current.addAlert('new', 'Muted alert');
      });
      
      expect(audioService.playSound).not.toHaveBeenCalled();
      
      act(() => {
        result.current.addAlert('urgent', 'Not muted');
      });
      
      expect(audioService.playSound).toHaveBeenCalledWith('urgentOrder');
    });

    it('should toggle mute state correctly', () => {
      const { result } = renderHook(() => useKDSAlerts());
      
      expect(result.current.isMuted('new')).toBe(false);
      
      act(() => {
        result.current.toggleMute('new');
      });
      
      expect(result.current.isMuted('new')).toBe(true);
      expect(result.current.mutedTypes.has('new')).toBe(true);
      
      act(() => {
        result.current.toggleMute('new');
      });
      
      expect(result.current.isMuted('new')).toBe(false);
      expect(result.current.mutedTypes.has('new')).toBe(false);
    });

    it('should handle multiple muted types', () => {
      const { result } = renderHook(() => useKDSAlerts());
      
      act(() => {
        result.current.toggleMute('new');
        result.current.toggleMute('urgent');
      });
      
      expect(result.current.isMuted('new')).toBe(true);
      expect(result.current.isMuted('urgent')).toBe(true);
      expect(result.current.isMuted('ready')).toBe(false);
      expect(result.current.isMuted('warning')).toBe(false);
    });
  });

  describe('Alert Helpers', () => {
    it('should create new order alert', () => {
      const { result } = renderHook(() => useKDSAlerts());
      
      act(() => {
        result.current.newOrder('123');
      });
      
      expect(result.current.alerts[0]).toMatchObject({
        type: 'new',
        message: 'Novo pedido #123',
        orderId: '123'
      });
    });

    it('should create urgent order alert', () => {
      const { result } = renderHook(() => useKDSAlerts());
      
      act(() => {
        result.current.urgentOrder('456');
      });
      
      expect(result.current.alerts[0]).toMatchObject({
        type: 'urgent',
        message: 'Pedido #456 urgente!',
        orderId: '456'
      });
    });

    it('should create order ready alert', () => {
      const { result } = renderHook(() => useKDSAlerts());
      
      act(() => {
        result.current.orderReady('789');
      });
      
      expect(result.current.alerts[0]).toMatchObject({
        type: 'ready',
        message: 'Pedido #789 pronto',
        orderId: '789'
      });
    });

    it('should create order delayed alert', () => {
      const { result } = renderHook(() => useKDSAlerts());
      
      act(() => {
        result.current.orderDelayed('999', 15);
      });
      
      expect(result.current.alerts[0]).toMatchObject({
        type: 'warning',
        message: 'Pedido #999 atrasado 15 min',
        orderId: '999'
      });
    });
  });

  describe('Alert Statistics', () => {
    it('should calculate alert statistics', () => {
      const { result } = renderHook(() => useKDSAlerts());
      
      act(() => {
        result.current.addAlert('new', 'Alert 1');
        result.current.addAlert('new', 'Alert 2');
        result.current.addAlert('urgent', 'Alert 3');
        result.current.addAlert('ready', 'Alert 4');
        result.current.addAlert('warning', 'Alert 5');
      });
      
      expect(result.current.stats).toEqual({
        total: 5,
        byType: {
          new: 2,
          urgent: 1,
          ready: 1,
          warning: 1
        }
      });
    });

    it('should update statistics when alerts change', () => {
      const { result } = renderHook(() => useKDSAlerts());
      
      act(() => {
        result.current.addAlert('new', 'Alert 1');
        result.current.addAlert('urgent', 'Alert 2');
      });
      
      expect(result.current.stats.total).toBe(2);
      
      act(() => {
        result.current.clearAlerts();
      });
      
      expect(result.current.stats.total).toBe(0);
      expect(result.current.stats.byType).toEqual({});
    });

    it('should handle empty statistics', () => {
      const { result } = renderHook(() => useKDSAlerts());
      
      expect(result.current.stats).toEqual({
        total: 0,
        byType: {}
      });
    });
  });

  describe('Lifecycle and Cleanup', () => {
    it('should cleanup timers on unmount', () => {
      const { result, unmount } = renderHook(() => useKDSAlerts({ autoRemoveDelay: 5000 }));
      
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      act(() => {
        result.current.addAlert('new', 'Alert 1');
        result.current.addAlert('urgent', 'Alert 2');
        result.current.addAlert('ready', 'Alert 3');
      });
      
      unmount();
      
      expect(clearTimeoutSpy).toHaveBeenCalledTimes(3);
      clearTimeoutSpy.mockRestore();
    });

    it('should handle rapid additions and removals', () => {
      const { result } = renderHook(() => useKDSAlerts({ autoRemoveDelay: 100 }));
      
      const alertIds: string[] = [];
      
      // Rapidly add alerts
      act(() => {
        for (let i = 0; i < 20; i++) {
          const id = result.current.addAlert('new', `Rapid ${i}`);
          alertIds.push(id);
        }
      });
      
      // Rapidly remove half of them
      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.removeAlert(alertIds[i]);
        }
      });
      
      expect(result.current.alerts).toHaveLength(10);
      
      // Let auto-remove handle the rest
      act(() => {
        jest.advanceTimersByTime(100);
      });
      
      expect(result.current.alerts).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined orderId', () => {
      const { result } = renderHook(() => useKDSAlerts());
      
      act(() => {
        result.current.addAlert('new', 'No order ID');
      });
      
      expect(result.current.alerts[0].orderId).toBeUndefined();
    });

    it('should handle removing non-existent alert', () => {
      const { result } = renderHook(() => useKDSAlerts());
      
      act(() => {
        result.current.addAlert('new', 'Alert');
      });
      
      // Should not throw
      expect(() => {
        act(() => {
          result.current.removeAlert('non-existent-id');
        });
      }).not.toThrow();
      
      expect(result.current.alerts).toHaveLength(1);
    });

    it('should handle options changes during lifecycle', () => {
      const { result, rerender } = renderHook(
        ({ options }) => useKDSAlerts(options),
        {
          initialProps: {
            options: { maxAlerts: 5, autoRemoveDelay: 1000, soundEnabled: true }
          }
        }
      );
      
      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.addAlert('new', `Alert ${i}`);
        }
      });
      
      expect(result.current.alerts).toHaveLength(5);
      
      // Change max alerts
      rerender({
        options: { maxAlerts: 3, autoRemoveDelay: 1000, soundEnabled: true }
      });
      
      act(() => {
        result.current.addAlert('urgent', 'New alert with new limit');
      });
      
      expect(result.current.alerts).toHaveLength(3);
    });

    it('should handle very long messages', () => {
      const { result } = renderHook(() => useKDSAlerts());
      
      const longMessage = 'x'.repeat(1000);
      
      act(() => {
        result.current.addAlert('new', longMessage);
      });
      
      expect(result.current.alerts[0].message).toBe(longMessage);
    });

    it('should maintain alert order with auto-remove', () => {
      const { result } = renderHook(() => useKDSAlerts({ autoRemoveDelay: 1000 }));
      
      act(() => {
        result.current.addAlert('new', 'First');
      });
      
      act(() => {
        jest.advanceTimersByTime(500);
      });
      
      act(() => {
        result.current.addAlert('urgent', 'Second');
        result.current.addAlert('ready', 'Third');
      });
      
      // First alert should be removed
      act(() => {
        jest.advanceTimersByTime(500);
      });
      
      expect(result.current.alerts).toHaveLength(2);
      expect(result.current.alerts[0].message).toBe('Third');
      expect(result.current.alerts[1].message).toBe('Second');
    });
  });
});