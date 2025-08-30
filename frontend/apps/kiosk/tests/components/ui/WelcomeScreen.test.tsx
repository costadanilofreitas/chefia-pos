import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WelcomeScreen } from '../../../src/components/ui/WelcomeScreen';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock useHapticFeedback hook
jest.mock('../../../src/hooks/useHapticFeedback', () => ({
  useHapticFeedback: () => ({
    light: jest.fn(),
    medium: jest.fn(),
    heavy: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    custom: jest.fn(),
  }),
}));

describe('WelcomeScreen Component', () => {
  const mockOnStart = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    test('renders with default props', () => {
      render(<WelcomeScreen onStart={mockOnStart} />);

      expect(screen.getByText('Nosso Restaurante')).toBeInTheDocument();
      expect(screen.getByText('Bem-vindo!')).toBeInTheDocument();
      expect(screen.getByText('Toque para começar seu pedido')).toBeInTheDocument();
      expect(screen.getByText('INICIAR PEDIDO')).toBeInTheDocument();
    });

    test('renders with custom restaurant name', () => {
      render(
        <WelcomeScreen 
          onStart={mockOnStart} 
          restaurantName="Pizza Palace" 
        />
      );

      expect(screen.getByText('Pizza Palace')).toBeInTheDocument();
    });

    test('renders with custom welcome message', () => {
      render(
        <WelcomeScreen 
          onStart={mockOnStart} 
          welcomeMessage="Touch here to start ordering" 
        />
      );

      expect(screen.getByText('Touch here to start ordering')).toBeInTheDocument();
    });

    test('renders language selector buttons', () => {
      render(<WelcomeScreen onStart={mockOnStart} />);

      expect(screen.getByText('🇧🇷 PT')).toBeInTheDocument();
      expect(screen.getByText('🇺🇸 EN')).toBeInTheDocument();
      expect(screen.getByText('🇪🇸 ES')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    test('calls onStart when start button is clicked', () => {
      render(<WelcomeScreen onStart={mockOnStart} />);

      const startButton = screen.getByText('INICIAR PEDIDO');
      fireEvent.click(startButton);

      expect(mockOnStart).toHaveBeenCalledTimes(1);
    });

    test('language selector buttons are clickable', () => {
      render(<WelcomeScreen onStart={mockOnStart} />);

      const ptButton = screen.getByText('🇧🇷 PT');
      const enButton = screen.getByText('🇺🇸 EN');
      const esButton = screen.getByText('🇪🇸 ES');

      // Verify buttons are present and clickable
      expect(ptButton).toBeInTheDocument();
      expect(enButton).toBeInTheDocument();
      expect(esButton).toBeInTheDocument();

      fireEvent.click(ptButton);
      fireEvent.click(enButton);
      fireEvent.click(esButton);

      // No errors should occur
    });
  });

  describe('Touch Hint Animation', () => {
    test('shows touch hint after 5 seconds', async () => {
      render(<WelcomeScreen onStart={mockOnStart} />);

      // Initially, touch hint should not be visible
      expect(screen.queryByText('Toque aqui')).not.toBeInTheDocument();

      // Fast-forward 5 seconds
      jest.advanceTimersByTime(5000);

      // Touch hint should now be visible
      await waitFor(() => {
        expect(screen.getByText('Toque aqui')).toBeInTheDocument();
      });

      // Verify the pointing finger emoji is also shown
      expect(screen.getByText('👆')).toBeInTheDocument();
    });

    test('does not show touch hint before 5 seconds', () => {
      render(<WelcomeScreen onStart={mockOnStart} />);

      // Fast-forward 4.9 seconds
      jest.advanceTimersByTime(4900);

      // Touch hint should not be visible yet
      expect(screen.queryByText('Toque aqui')).not.toBeInTheDocument();
    });
  });

  describe('Auto Start Feature', () => {
    test('auto starts after default delay (30 seconds)', () => {
      render(<WelcomeScreen onStart={mockOnStart} />);

      expect(mockOnStart).not.toHaveBeenCalled();

      // Fast-forward 30 seconds
      jest.advanceTimersByTime(30000);

      expect(mockOnStart).toHaveBeenCalledTimes(1);
    });

    test('auto starts after custom delay', () => {
      render(
        <WelcomeScreen 
          onStart={mockOnStart} 
          autoStartDelay={10000} 
        />
      );

      expect(mockOnStart).not.toHaveBeenCalled();

      // Fast-forward 10 seconds
      jest.advanceTimersByTime(10000);

      expect(mockOnStart).toHaveBeenCalledTimes(1);
    });

    test('does not auto start before delay expires', () => {
      render(<WelcomeScreen onStart={mockOnStart} />);

      // Fast-forward 29 seconds (just before auto start)
      jest.advanceTimersByTime(29000);

      expect(mockOnStart).not.toHaveBeenCalled();
    });

    test('clears timers on unmount', () => {
      const { unmount } = render(<WelcomeScreen onStart={mockOnStart} />);

      unmount();

      // Fast-forward past all delays
      jest.advanceTimersByTime(40000);

      // onStart should not be called after unmount
      expect(mockOnStart).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    test('start button has proper button role', () => {
      render(<WelcomeScreen onStart={mockOnStart} />);

      const startButton = screen.getByRole('button', { name: /INICIAR PEDIDO/i });
      expect(startButton).toBeInTheDocument();
    });

    test('has proper heading hierarchy', () => {
      render(<WelcomeScreen onStart={mockOnStart} />);

      const mainHeading = screen.getByText('Nosso Restaurante');
      const welcomeHeading = screen.getByText('Bem-vindo!');
      const messageHeading = screen.getByText('Toque para começar seu pedido');

      expect(mainHeading).toBeInTheDocument();
      expect(welcomeHeading).toBeInTheDocument();
      expect(messageHeading).toBeInTheDocument();
    });

    test('language buttons are keyboard accessible', () => {
      render(<WelcomeScreen onStart={mockOnStart} />);

      const languageButtons = screen.getAllByRole('button').filter(
        button => button.textContent?.includes('PT') || 
                  button.textContent?.includes('EN') || 
                  button.textContent?.includes('ES')
      );

      expect(languageButtons).toHaveLength(3);
      languageButtons.forEach(button => {
        expect(button).toBeInTheDocument();
      });
    });
  });

  describe('Styling and Visual Effects', () => {
    test('applies correct styling classes', () => {
      render(<WelcomeScreen onStart={mockOnStart} />);

      const container = screen.getByText('Nosso Restaurante').closest('div');
      expect(container?.parentElement).toHaveClass('min-h-screen');
      expect(container?.parentElement).toHaveClass('bg-gradient-to-br');
    });

    test('start button has correct styling', () => {
      render(<WelcomeScreen onStart={mockOnStart} />);

      const startButton = screen.getByText('INICIAR PEDIDO');
      expect(startButton).toHaveClass('bg-white');
      expect(startButton).toHaveClass('text-primary-600');
      expect(startButton).toHaveClass('text-3xl');
      expect(startButton).toHaveClass('font-bold');
    });
  });

  describe('Edge Cases', () => {
    test('handles empty restaurant name', () => {
      render(
        <WelcomeScreen 
          onStart={mockOnStart} 
          restaurantName="" 
        />
      );

      // Should render without errors, even with empty name
      expect(screen.getByText('Bem-vindo!')).toBeInTheDocument();
    });

    test('handles very long restaurant name', () => {
      const longName = 'This is a very long restaurant name that might break the layout';
      render(
        <WelcomeScreen 
          onStart={mockOnStart} 
          restaurantName={longName} 
        />
      );

      expect(screen.getByText(longName)).toBeInTheDocument();
    });

    test('handles rapid clicking of start button', () => {
      render(<WelcomeScreen onStart={mockOnStart} />);

      const startButton = screen.getByText('INICIAR PEDIDO');
      
      // Click multiple times rapidly
      fireEvent.click(startButton);
      fireEvent.click(startButton);
      fireEvent.click(startButton);

      // Should only call onStart once per click
      expect(mockOnStart).toHaveBeenCalledTimes(3);
    });

    test('handles zero auto start delay', () => {
      render(
        <WelcomeScreen 
          onStart={mockOnStart} 
          autoStartDelay={0} 
        />
      );

      // Should start immediately
      expect(mockOnStart).toHaveBeenCalledTimes(1);
    });
  });

  describe('Integration with Haptic Feedback', () => {
    test('triggers haptic feedback on start button click', () => {
      const mockHaptic = {
        medium: jest.fn(),
        light: jest.fn(),
        heavy: jest.fn(),
        success: jest.fn(),
        error: jest.fn(),
        custom: jest.fn(),
      };

      jest.spyOn(require('../../../src/hooks/useHapticFeedback'), 'useHapticFeedback')
        .mockReturnValue(mockHaptic);

      render(<WelcomeScreen onStart={mockOnStart} />);

      const startButton = screen.getByText('INICIAR PEDIDO');
      fireEvent.click(startButton);

      expect(mockHaptic.medium).toHaveBeenCalledTimes(1);
    });
  });
});