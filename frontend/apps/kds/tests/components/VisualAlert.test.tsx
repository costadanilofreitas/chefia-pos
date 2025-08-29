import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VisualAlert, AlertSystem } from '../../src/components/VisualAlert';

describe('VisualAlert Component', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('VisualAlert Rendering', () => {
    it('should render alert with message', () => {
      render(
        <VisualAlert
          id="test-1"
          type="info"
          message="Test alert message"
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Test alert message')).toBeInTheDocument();
    });

    it('should render with correct type styling', () => {
      const types = [
        { type: 'success' as const, bgClass: 'bg-green-500' },
        { type: 'error' as const, bgClass: 'bg-red-500' },
        { type: 'warning' as const, bgClass: 'bg-yellow-500' },
        { type: 'info' as const, bgClass: 'bg-blue-500' }
      ];

      types.forEach(({ type, bgClass }) => {
        const { container, unmount } = render(
          <VisualAlert
            id={`test-${type}`}
            type={type}
            message={`${type} message`}
            onClose={mockOnClose}
          />
        );

        const alertElement = container.firstChild;
        expect(alertElement).toHaveClass(bgClass);
        
        unmount();
      });
    });

    it('should render close button', () => {
      render(
        <VisualAlert
          id="test-1"
          type="info"
          message="Test message"
          onClose={mockOnClose}
        />
      );

      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
      render(
        <VisualAlert
          id="test-1"
          type="info"
          message="Test message"
          onClose={mockOnClose}
        />
      );

      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledWith('test-1');
    });

    it('should display icon based on type', () => {
      const { rerender, container } = render(
        <VisualAlert
          id="test-1"
          type="success"
          message="Success message"
          onClose={mockOnClose}
        />
      );

      // Check for success icon (checkmark)
      let icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();

      // Check error icon
      rerender(
        <VisualAlert
          id="test-1"
          type="error"
          message="Error message"
          onClose={mockOnClose}
        />
      );
      
      icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should auto-dismiss after timeout if specified', () => {
      render(
        <VisualAlert
          id="test-1"
          type="info"
          message="Auto dismiss message"
          onClose={mockOnClose}
          autoDismiss={true}
          dismissTime={3000}
        />
      );

      expect(screen.getByText('Auto dismiss message')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(mockOnClose).toHaveBeenCalledWith('test-1');
    });

    it('should not auto-dismiss if autoDismiss is false', () => {
      render(
        <VisualAlert
          id="test-1"
          type="info"
          message="No auto dismiss"
          onClose={mockOnClose}
          autoDismiss={false}
        />
      );

      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should clear timeout on unmount', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      const { unmount } = render(
        <VisualAlert
          id="test-1"
          type="info"
          message="Test message"
          onClose={mockOnClose}
          autoDismiss={true}
          dismissTime={5000}
        />
      );

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('AlertSystem Component', () => {
    const mockAlerts = [
      { id: 'alert-1', type: 'success' as const, message: 'Success alert' },
      { id: 'alert-2', type: 'error' as const, message: 'Error alert' },
      { id: 'alert-3', type: 'warning' as const, message: 'Warning alert' }
    ];

    it('should render all alerts', () => {
      render(
        <AlertSystem
          alerts={mockAlerts}
          onAlertClose={mockOnClose}
        />
      );

      expect(screen.getByText('Success alert')).toBeInTheDocument();
      expect(screen.getByText('Error alert')).toBeInTheDocument();
      expect(screen.getByText('Warning alert')).toBeInTheDocument();
    });

    it('should position alerts container correctly', () => {
      const { container } = render(
        <AlertSystem
          alerts={mockAlerts}
          onAlertClose={mockOnClose}
        />
      );

      const alertContainer = container.firstChild;
      expect(alertContainer).toHaveClass('fixed', 'top-4', 'right-4', 'z-50');
    });

    it('should stack alerts vertically', () => {
      const { container } = render(
        <AlertSystem
          alerts={mockAlerts}
          onAlertClose={mockOnClose}
        />
      );

      const alertContainer = container.firstChild;
      expect(alertContainer).toHaveClass('space-y-2');
    });

    it('should handle empty alerts array', () => {
      const { container } = render(
        <AlertSystem
          alerts={[]}
          onAlertClose={mockOnClose}
        />
      );

      const alertContainer = container.firstChild;
      expect(alertContainer?.children).toHaveLength(0);
    });

    it('should pass onAlertClose to each alert', () => {
      render(
        <AlertSystem
          alerts={[mockAlerts[0]]}
          onAlertClose={mockOnClose}
        />
      );

      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledWith('alert-1');
    });

    it('should handle alerts with custom properties', () => {
      const customAlerts = [
        {
          id: 'custom-1',
          type: 'info' as const,
          message: 'Custom alert',
          autoDismiss: true,
          dismissTime: 2000
        }
      ];

      render(
        <AlertSystem
          alerts={customAlerts}
          onAlertClose={mockOnClose}
        />
      );

      expect(screen.getByText('Custom alert')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(mockOnClose).toHaveBeenCalledWith('custom-1');
    });

    it('should handle alert removal animation', async () => {
      const { rerender } = render(
        <AlertSystem
          alerts={mockAlerts}
          onAlertClose={mockOnClose}
        />
      );

      expect(screen.getByText('Success alert')).toBeInTheDocument();

      // Remove first alert
      const updatedAlerts = mockAlerts.slice(1);
      rerender(
        <AlertSystem
          alerts={updatedAlerts}
          onAlertClose={mockOnClose}
        />
      );

      expect(screen.queryByText('Success alert')).not.toBeInTheDocument();
      expect(screen.getByText('Error alert')).toBeInTheDocument();
    });

    it('should handle rapid alert additions', () => {
      const { rerender } = render(
        <AlertSystem
          alerts={[mockAlerts[0]]}
          onAlertClose={mockOnClose}
        />
      );

      expect(screen.getByText('Success alert')).toBeInTheDocument();

      // Add more alerts rapidly
      rerender(
        <AlertSystem
          alerts={mockAlerts}
          onAlertClose={mockOnClose}
        />
      );

      expect(screen.getByText('Success alert')).toBeInTheDocument();
      expect(screen.getByText('Error alert')).toBeInTheDocument();
      expect(screen.getByText('Warning alert')).toBeInTheDocument();
    });

    it('should maintain alert order', () => {
      const { container } = render(
        <AlertSystem
          alerts={mockAlerts}
          onAlertClose={mockOnClose}
        />
      );

      const alerts = container.querySelectorAll('[role="alert"]');
      expect(alerts[0]).toHaveTextContent('Success alert');
      expect(alerts[1]).toHaveTextContent('Error alert');
      expect(alerts[2]).toHaveTextContent('Warning alert');
    });

    it('should handle maximum alerts limit', () => {
      const manyAlerts = Array.from({ length: 10 }, (_, i) => ({
        id: `alert-${i}`,
        type: 'info' as const,
        message: `Alert ${i}`
      }));

      const maxAlerts = 5;
      
      render(
        <AlertSystem
          alerts={manyAlerts}
          onAlertClose={mockOnClose}
          maxAlerts={maxAlerts}
        />
      );

      // Should only show the specified maximum
      const alerts = screen.getAllByRole('alert');
      expect(alerts).toHaveLength(Math.min(maxAlerts, manyAlerts.length));
    });
  });

  describe('Animation and Transitions', () => {
    it('should apply entrance animation', () => {
      const { container } = render(
        <VisualAlert
          id="test-1"
          type="info"
          message="Animated alert"
          onClose={mockOnClose}
        />
      );

      const alertElement = container.firstChild;
      expect(alertElement).toHaveClass('transform', 'transition-all');
    });

    it('should handle hover state', () => {
      const { container } = render(
        <VisualAlert
          id="test-1"
          type="info"
          message="Hover alert"
          onClose={mockOnClose}
        />
      );

      const alertElement = container.firstChild as HTMLElement;
      
      // Simulate hover
      fireEvent.mouseEnter(alertElement);
      expect(alertElement).toHaveClass('shadow-lg');

      fireEvent.mouseLeave(alertElement);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <VisualAlert
          id="test-1"
          type="error"
          message="Accessible alert"
          onClose={mockOnClose}
        />
      );

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
    });

    it('should have accessible close button', () => {
      render(
        <VisualAlert
          id="test-1"
          type="info"
          message="Test alert"
          onClose={mockOnClose}
        />
      );

      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toHaveAttribute('aria-label');
    });

    it('should be keyboard navigable', () => {
      render(
        <VisualAlert
          id="test-1"
          type="info"
          message="Keyboard test"
          onClose={mockOnClose}
        />
      );

      const closeButton = screen.getByRole('button', { name: /close/i });
      
      // Simulate keyboard interaction
      fireEvent.keyDown(closeButton, { key: 'Enter' });
      expect(mockOnClose).toHaveBeenCalledWith('test-1');
    });
  });

  describe('Performance', () => {
    it('should handle many alerts without performance issues', () => {
      const manyAlerts = Array.from({ length: 50 }, (_, i) => ({
        id: `perf-${i}`,
        type: 'info' as const,
        message: `Performance test ${i}`
      }));

      const { container } = render(
        <AlertSystem
          alerts={manyAlerts}
          onAlertClose={mockOnClose}
        />
      );

      const alerts = container.querySelectorAll('[role="alert"]');
      expect(alerts.length).toBeGreaterThan(0);
    });

    it('should clean up timers when alerts are removed', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      const { rerender } = render(
        <AlertSystem
          alerts={[
            {
              id: 'timer-1',
              type: 'info' as const,
              message: 'Timer test',
              autoDismiss: true,
              dismissTime: 5000
            }
          ]}
          onAlertClose={mockOnClose}
        />
      );

      // Remove the alert
      rerender(
        <AlertSystem
          alerts={[]}
          onAlertClose={mockOnClose}
        />
      );

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });
});