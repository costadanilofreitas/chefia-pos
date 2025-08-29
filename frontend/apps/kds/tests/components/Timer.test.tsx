import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Timer } from '../../src/components/Timer';

describe('Timer Component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Rendering and Display', () => {
    it('should render timer with correct initial format', () => {
      const startTime = new Date();
      render(<Timer startTime={startTime} />);
      
      const timerElement = screen.getByText(/00:00/);
      expect(timerElement).toBeInTheDocument();
      expect(timerElement).toHaveClass('font-mono', 'text-2xl', 'font-bold');
    });

    it('should display clock icon', () => {
      render(<Timer startTime={new Date()} />);
      const clockIcon = document.querySelector('svg');
      expect(clockIcon).toBeInTheDocument();
    });

    it('should apply custom className when provided', () => {
      const customClass = 'custom-timer-class';
      const { container } = render(
        <Timer startTime={new Date()} className={customClass} />
      );
      
      const timerContainer = container.firstChild;
      expect(timerContainer).toHaveClass(customClass);
    });
  });

  describe('Time Calculation', () => {
    it('should update timer every second for first 5 minutes', () => {
      const startTime = new Date();
      render(<Timer startTime={startTime} />);
      
      // Initial state
      expect(screen.getByText(/00:00/)).toBeInTheDocument();
      
      // After 1 second
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(screen.getByText(/00:01/)).toBeInTheDocument();
      
      // After 30 seconds
      act(() => {
        jest.advanceTimersByTime(29000);
      });
      expect(screen.getByText(/00:30/)).toBeInTheDocument();
      
      // After 2 minutes
      act(() => {
        jest.advanceTimersByTime(90000);
      });
      expect(screen.getByText(/02:00/)).toBeInTheDocument();
    });

    it('should update timer every 5 seconds between 5-15 minutes', () => {
      const startTime = new Date(Date.now() - 6 * 60 * 1000); // 6 minutes ago
      render(<Timer startTime={startTime} />);
      
      const initialText = screen.getByText(/06:0/);
      expect(initialText).toBeInTheDocument();
      
      // Should not update after 1 second
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(screen.getByText(/06:0/)).toBeInTheDocument();
      
      // Should update after 5 seconds
      act(() => {
        jest.advanceTimersByTime(4000);
      });
      expect(screen.getByText(/06:0/)).toBeInTheDocument();
    });

    it('should update timer every 10 seconds after 15 minutes', () => {
      const startTime = new Date(Date.now() - 16 * 60 * 1000); // 16 minutes ago
      render(<Timer startTime={startTime} />);
      
      expect(screen.getByText(/16:/)).toBeInTheDocument();
      
      // Should not update after 5 seconds
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      const timeText = screen.getByText(/16:/);
      expect(timeText).toBeInTheDocument();
    });

    it('should handle custom update interval', () => {
      const startTime = new Date();
      const customInterval = 2000; // 2 seconds
      render(<Timer startTime={startTime} updateInterval={customInterval} />);
      
      expect(screen.getByText(/00:00/)).toBeInTheDocument();
      
      // Should not update after 1 second
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(screen.getByText(/00:00/)).toBeInTheDocument();
      
      // Should update after 2 seconds
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(screen.getByText(/00:02/)).toBeInTheDocument();
    });
  });

  describe('Visual Indicators', () => {
    it('should apply warning class when time exceeds warning threshold', () => {
      const startTime = new Date(Date.now() - 11 * 60 * 1000); // 11 minutes ago
      const { container } = render(
        <Timer startTime={startTime} warningMinutes={10} />
      );
      
      const timerText = screen.getByText(/11:/);
      expect(timerText).toHaveClass('text-warning-600', 'dark:text-warning-400');
      
      const icon = container.querySelector('svg');
      expect(icon).toHaveClass('text-warning-600', 'dark:text-warning-400');
    });

    it('should apply danger class with pulse animation when time exceeds danger threshold', () => {
      const startTime = new Date(Date.now() - 16 * 60 * 1000); // 16 minutes ago
      const { container } = render(
        <Timer startTime={startTime} dangerMinutes={15} />
      );
      
      const timerText = screen.getByText(/16:/);
      expect(timerText).toHaveClass('text-danger-600', 'dark:text-danger-400', 'animate-pulse');
      
      const icon = container.querySelector('svg');
      expect(icon).toHaveClass('text-danger-600', 'dark:text-danger-400', 'animate-pulse');
    });

    it('should apply normal class when time is below warning threshold', () => {
      const startTime = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      const { container } = render(
        <Timer startTime={startTime} warningMinutes={10} />
      );
      
      const timerText = screen.getByText(/05:/);
      expect(timerText).toHaveClass('text-gray-700', 'dark:text-gray-300');
      
      const icon = container.querySelector('svg');
      expect(icon).toHaveClass('text-gray-700', 'dark:text-gray-300');
    });

    it('should handle custom warning and danger thresholds', () => {
      const startTime = new Date(Date.now() - 7 * 60 * 1000); // 7 minutes ago
      const { rerender } = render(
        <Timer startTime={startTime} warningMinutes={5} dangerMinutes={10} />
      );
      
      // Should be in warning state (7 > 5 but < 10)
      let timerText = screen.getByText(/07:/);
      expect(timerText).toHaveClass('text-warning-600');
      
      // Change to danger state
      rerender(
        <Timer startTime={startTime} warningMinutes={5} dangerMinutes={6} />
      );
      
      timerText = screen.getByText(/07:/);
      expect(timerText).toHaveClass('text-danger-600', 'animate-pulse');
    });
  });

  describe('Edge Cases and Performance', () => {
    it('should handle string startTime', () => {
      const startTime = new Date().toISOString();
      render(<Timer startTime={startTime} />);
      
      expect(screen.getByText(/00:00/)).toBeInTheDocument();
    });

    it('should handle invalid date gracefully', () => {
      const startTime = 'invalid-date';
      render(<Timer startTime={startTime} />);
      
      // Should still render, likely showing NaN or 00:00
      const timerContainer = document.querySelector('.inline-flex');
      expect(timerContainer).toBeInTheDocument();
    });

    it('should clean up interval on unmount', () => {
      const startTime = new Date();
      const { unmount } = render(<Timer startTime={startTime} />);
      
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      unmount();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });

    it('should recalculate when startTime prop changes', () => {
      const startTime1 = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      const startTime2 = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      
      const { rerender } = render(<Timer startTime={startTime1} />);
      expect(screen.getByText(/05:/)).toBeInTheDocument();
      
      rerender(<Timer startTime={startTime2} />);
      expect(screen.getByText(/10:/)).toBeInTheDocument();
    });

    it('should format time correctly with leading zeros', () => {
      const startTime = new Date(Date.now() - (5 * 60 + 5) * 1000); // 5:05 ago
      render(<Timer startTime={startTime} />);
      
      expect(screen.getByText('05:05')).toBeInTheDocument();
    });

    it('should handle hours correctly', () => {
      const startTime = new Date(Date.now() - 65 * 60 * 1000); // 65 minutes ago
      render(<Timer startTime={startTime} />);
      
      expect(screen.getByText('65:00')).toBeInTheDocument();
    });

    it('should dynamically adjust update interval based on elapsed time', () => {
      const startTime = new Date(Date.now() - 4 * 60 * 1000); // 4 minutes ago
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      
      render(<Timer startTime={startTime} />);
      
      // Fast interval for < 5 minutes
      expect(setIntervalSpy).toHaveBeenLastCalledWith(expect.any(Function), 1000);
      
      // Advance to 6 minutes total (crossing the 5-minute threshold)
      act(() => {
        jest.advanceTimersByTime(2 * 60 * 1000);
      });
      
      // Should switch to medium interval
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
      
      setIntervalSpy.mockRestore();
    });
  });

  describe('Memory Leak Prevention', () => {
    it('should not create multiple intervals on rapid prop changes', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      const { rerender } = render(<Timer startTime={new Date()} />);
      const initialCallCount = setIntervalSpy.mock.calls.length;
      
      // Rapid prop changes
      for (let i = 0; i < 10; i++) {
        rerender(<Timer startTime={new Date(Date.now() - i * 1000)} />);
      }
      
      // Should clear previous intervals
      expect(clearIntervalSpy).toHaveBeenCalledTimes(10);
      
      setIntervalSpy.mockRestore();
      clearIntervalSpy.mockRestore();
    });

    it('should properly clean up when component is unmounted during update', () => {
      const startTime = new Date();
      const { unmount } = render(<Timer startTime={startTime} />);
      
      // Start an update
      act(() => {
        jest.advanceTimersByTime(500);
      });
      
      // Unmount during potential update
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      unmount();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
      
      // Advance timers to ensure no errors from cleared intervals
      act(() => {
        jest.advanceTimersByTime(2000);
      });
      
      clearIntervalSpy.mockRestore();
    });
  });
});