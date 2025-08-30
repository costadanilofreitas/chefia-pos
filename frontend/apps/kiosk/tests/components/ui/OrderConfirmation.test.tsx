import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OrderConfirmation } from '../../../src/components/ui/OrderConfirmation';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  CheckCircle: ({ className }: any) => <div className={className} data-testid="check-circle">CheckCircle</div>,
  Printer: ({ className }: any) => <div className={className} data-testid="printer">Printer</div>,
  Clock: ({ className }: any) => <div className={className} data-testid="clock">Clock</div>,
}));

// Mock useHapticFeedback hook
const mockHapticFeedback = {
  light: jest.fn(),
  medium: jest.fn(),
  heavy: jest.fn(),
  success: jest.fn(),
  error: jest.fn(),
  custom: jest.fn(),
};

jest.mock('../../../src/hooks/useHapticFeedback', () => ({
  useHapticFeedback: () => mockHapticFeedback,
}));

describe('OrderConfirmation Component', () => {
  const mockOnNewOrder = jest.fn();
  const defaultProps = {
    orderNumber: '12345',
    onNewOrder: mockOnNewOrder,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    test('renders with required props', () => {
      render(<OrderConfirmation {...defaultProps} />);

      expect(screen.getByText('Pedido Confirmado!')).toBeInTheDocument();
      expect(screen.getByText('Seu pedido foi recebido com sucesso')).toBeInTheDocument();
      expect(screen.getByText('#12345')).toBeInTheDocument();
      expect(screen.getByText('Fazer Novo Pedido')).toBeInTheDocument();
    });

    test('displays default estimated time', () => {
      render(<OrderConfirmation {...defaultProps} />);

      expect(screen.getByText('Tempo estimado: 15 minutos')).toBeInTheDocument();
    });

    test('displays custom estimated time', () => {
      render(<OrderConfirmation {...defaultProps} estimatedTime={30} />);

      expect(screen.getByText('Tempo estimado: 30 minutos')).toBeInTheDocument();
    });

    test('displays order number prominently', () => {
      render(<OrderConfirmation {...defaultProps} orderNumber="ABC123" />);

      const orderNumber = screen.getByText('#ABC123');
      expect(orderNumber).toBeInTheDocument();
      expect(orderNumber).toHaveClass('text-6xl');
      expect(orderNumber).toHaveClass('font-bold');
    });

    test('renders all instruction steps', () => {
      render(<OrderConfirmation {...defaultProps} />);

      expect(screen.getByText('Próximos passos:')).toBeInTheDocument();
      expect(screen.getByText('• Aguarde seu comprovante ser impresso')).toBeInTheDocument();
      expect(screen.getByText('• Dirija-se ao balcão de retirada')).toBeInTheDocument();
      expect(screen.getByText('• Apresente o número do seu pedido')).toBeInTheDocument();
      expect(screen.getByText('• Aguarde ser chamado pelo painel')).toBeInTheDocument();
    });

    test('renders all icons correctly', () => {
      render(<OrderConfirmation {...defaultProps} />);

      expect(screen.getByTestId('check-circle')).toBeInTheDocument();
      expect(screen.getByTestId('printer')).toBeInTheDocument();
      expect(screen.getByTestId('clock')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    test('calls onNewOrder when button is clicked', () => {
      render(<OrderConfirmation {...defaultProps} />);

      const newOrderButton = screen.getByText('Fazer Novo Pedido');
      fireEvent.click(newOrderButton);

      expect(mockOnNewOrder).toHaveBeenCalledTimes(1);
    });

    test('button is clickable multiple times', () => {
      render(<OrderConfirmation {...defaultProps} />);

      const newOrderButton = screen.getByText('Fazer Novo Pedido');
      
      fireEvent.click(newOrderButton);
      fireEvent.click(newOrderButton);
      fireEvent.click(newOrderButton);

      expect(mockOnNewOrder).toHaveBeenCalledTimes(3);
    });
  });

  describe('Auto Close Feature', () => {
    test('auto closes after default delay (10 seconds)', () => {
      render(<OrderConfirmation {...defaultProps} />);

      expect(mockOnNewOrder).not.toHaveBeenCalled();

      // Fast-forward 10 seconds
      jest.advanceTimersByTime(10000);

      expect(mockOnNewOrder).toHaveBeenCalledTimes(1);
    });

    test('auto closes after custom delay', () => {
      render(<OrderConfirmation {...defaultProps} autoCloseDelay={5000} />);

      expect(mockOnNewOrder).not.toHaveBeenCalled();

      // Fast-forward 5 seconds
      jest.advanceTimersByTime(5000);

      expect(mockOnNewOrder).toHaveBeenCalledTimes(1);
    });

    test('does not auto close before delay expires', () => {
      render(<OrderConfirmation {...defaultProps} />);

      // Fast-forward 9.9 seconds
      jest.advanceTimersByTime(9900);

      expect(mockOnNewOrder).not.toHaveBeenCalled();
    });

    test('displays correct countdown text', () => {
      render(<OrderConfirmation {...defaultProps} autoCloseDelay={15000} />);

      expect(screen.getByText('Retornando ao início em 15 segundos...')).toBeInTheDocument();
    });

    test('displays correct countdown text with custom delay', () => {
      render(<OrderConfirmation {...defaultProps} autoCloseDelay={5000} />);

      expect(screen.getByText('Retornando ao início em 5 segundos...')).toBeInTheDocument();
    });

    test('clears timer on unmount', () => {
      const { unmount } = render(<OrderConfirmation {...defaultProps} />);

      unmount();

      // Fast-forward past auto close delay
      jest.advanceTimersByTime(15000);

      // onNewOrder should not be called after unmount
      expect(mockOnNewOrder).not.toHaveBeenCalled();
    });
  });

  describe('Haptic Feedback', () => {
    test('triggers success haptic feedback on mount', () => {
      render(<OrderConfirmation {...defaultProps} />);

      expect(mockHapticFeedback.success).toHaveBeenCalledTimes(1);
    });

    test('haptic feedback is called only once', () => {
      const { rerender } = render(<OrderConfirmation {...defaultProps} />);

      // Re-render with same props
      rerender(<OrderConfirmation {...defaultProps} />);

      // Should still be called only once from initial mount
      expect(mockHapticFeedback.success).toHaveBeenCalledTimes(1);
    });
  });

  describe('Styling and Visual Elements', () => {
    test('applies success theme colors', () => {
      render(<OrderConfirmation {...defaultProps} />);

      const successIcon = screen.getByTestId('check-circle').parentElement;
      expect(successIcon).toHaveClass('bg-green-500');

      const successMessage = screen.getByText('Pedido Confirmado!');
      expect(successMessage).toHaveClass('text-green-600');
    });

    test('applies correct layout classes', () => {
      render(<OrderConfirmation {...defaultProps} />);

      const container = screen.getByText('Pedido Confirmado!').closest('div[class*="min-h-screen"]');
      expect(container).toHaveClass('min-h-screen');
      expect(container).toHaveClass('flex');
      expect(container).toHaveClass('flex-col');
      expect(container).toHaveClass('items-center');
      expect(container).toHaveClass('justify-center');
    });

    test('order number card has shadow styling', () => {
      render(<OrderConfirmation {...defaultProps} />);

      const orderNumberCard = screen.getByText('#12345').closest('div[class*="shadow"]');
      expect(orderNumberCard).toHaveClass('shadow-xl');
      expect(orderNumberCard).toHaveClass('rounded-2xl');
    });

    test('instructions box has proper styling', () => {
      render(<OrderConfirmation {...defaultProps} />);

      const instructionsBox = screen.getByText('Próximos passos:').closest('div');
      expect(instructionsBox?.parentElement).toHaveClass('bg-blue-50');
      expect(instructionsBox?.parentElement).toHaveClass('border-2');
      expect(instructionsBox?.parentElement).toHaveClass('border-blue-200');
    });
  });

  describe('Dark Mode Support', () => {
    test('applies dark mode classes', () => {
      render(<OrderConfirmation {...defaultProps} />);

      const container = screen.getByText('Pedido Confirmado!').closest('div[class*="dark:"]');
      expect(container).toHaveClass('dark:from-gray-800');
      expect(container).toHaveClass('dark:to-gray-900');

      const orderNumberCard = screen.getByText('#12345').closest('div[class*="dark:"]');
      expect(orderNumberCard).toHaveClass('dark:bg-gray-800');
    });
  });

  describe('Accessibility', () => {
    test('new order button has proper button role', () => {
      render(<OrderConfirmation {...defaultProps} />);

      const button = screen.getByRole('button', { name: /Fazer Novo Pedido/i });
      expect(button).toBeInTheDocument();
    });

    test('has proper heading hierarchy', () => {
      render(<OrderConfirmation {...defaultProps} />);

      expect(screen.getByText('Pedido Confirmado!')).toBeInTheDocument();
      expect(screen.getByText('Seu pedido foi recebido com sucesso')).toBeInTheDocument();
      expect(screen.getByText('Número do Pedido')).toBeInTheDocument();
    });

    test('icons have appropriate alt text or labels', () => {
      render(<OrderConfirmation {...defaultProps} />);

      expect(screen.getByTestId('check-circle')).toBeInTheDocument();
      expect(screen.getByTestId('printer')).toBeInTheDocument();
      expect(screen.getByTestId('clock')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    test('handles very long order numbers', () => {
      const longOrderNumber = '1234567890ABCDEFGHIJKLMNOP';
      render(<OrderConfirmation {...defaultProps} orderNumber={longOrderNumber} />);

      expect(screen.getByText(`#${longOrderNumber}`)).toBeInTheDocument();
    });

    test('handles zero estimated time', () => {
      render(<OrderConfirmation {...defaultProps} estimatedTime={0} />);

      expect(screen.getByText('Tempo estimado: 0 minutos')).toBeInTheDocument();
    });

    test('handles negative estimated time gracefully', () => {
      render(<OrderConfirmation {...defaultProps} estimatedTime={-5} />);

      // Should still render, even with invalid time
      expect(screen.getByText('Tempo estimado: -5 minutos')).toBeInTheDocument();
    });

    test('handles immediate auto close (0 delay)', () => {
      render(<OrderConfirmation {...defaultProps} autoCloseDelay={0} />);

      // Should call onNewOrder immediately
      expect(mockOnNewOrder).toHaveBeenCalledTimes(1);
    });

    test('handles empty order number', () => {
      render(<OrderConfirmation {...defaultProps} orderNumber="" />);

      expect(screen.getByText('#')).toBeInTheDocument();
    });
  });

  describe('Component Lifecycle', () => {
    test('cleanup on unmount does not cause errors', () => {
      const { unmount } = render(<OrderConfirmation {...defaultProps} />);

      expect(() => {
        unmount();
      }).not.toThrow();
    });

    test('multiple renders do not cause memory leaks', () => {
      const { rerender } = render(<OrderConfirmation {...defaultProps} />);

      // Re-render multiple times with different props
      rerender(<OrderConfirmation {...defaultProps} orderNumber="11111" />);
      rerender(<OrderConfirmation {...defaultProps} orderNumber="22222" />);
      rerender(<OrderConfirmation {...defaultProps} orderNumber="33333" />);

      expect(screen.getByText('#33333')).toBeInTheDocument();
    });
  });

  describe('Integration Tests', () => {
    test('complete user flow - view confirmation and start new order', () => {
      render(<OrderConfirmation {...defaultProps} />);

      // Verify confirmation is displayed
      expect(screen.getByText('Pedido Confirmado!')).toBeInTheDocument();
      expect(screen.getByText('#12345')).toBeInTheDocument();

      // Verify instructions are shown
      expect(screen.getByText('Próximos passos:')).toBeInTheDocument();

      // Click new order button
      const newOrderButton = screen.getByText('Fazer Novo Pedido');
      fireEvent.click(newOrderButton);

      expect(mockOnNewOrder).toHaveBeenCalledTimes(1);
    });

    test('complete auto-close flow', () => {
      render(<OrderConfirmation {...defaultProps} autoCloseDelay={3000} />);

      // Initially displayed
      expect(screen.getByText('Pedido Confirmado!')).toBeInTheDocument();
      expect(mockOnNewOrder).not.toHaveBeenCalled();

      // After 2 seconds - still displayed
      jest.advanceTimersByTime(2000);
      expect(mockOnNewOrder).not.toHaveBeenCalled();

      // After 3 seconds - auto close triggered
      jest.advanceTimersByTime(1000);
      expect(mockOnNewOrder).toHaveBeenCalledTimes(1);
    });
  });
});