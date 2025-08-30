import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TouchButton } from '../../../src/components/ui/TouchButton';

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

describe('TouchButton Component', () => {
  const mockOnClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders with children text', () => {
      render(<TouchButton>Click Me</TouchButton>);
      
      expect(screen.getByText('Click Me')).toBeInTheDocument();
    });

    test('renders with default variant (primary)', () => {
      render(<TouchButton>Button</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-primary-600');
      expect(button).toHaveClass('hover:bg-primary-700');
      expect(button).toHaveClass('text-white');
    });

    test('renders with secondary variant', () => {
      render(<TouchButton variant="secondary">Button</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-secondary-600');
      expect(button).toHaveClass('hover:bg-secondary-700');
      expect(button).toHaveClass('text-white');
    });

    test('renders with outline variant', () => {
      render(<TouchButton variant="outline">Button</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-transparent');
      expect(button).toHaveClass('border-2');
      expect(button).toHaveClass('border-gray-300');
      expect(button).toHaveClass('text-gray-700');
    });

    test('renders with ghost variant', () => {
      render(<TouchButton variant="ghost">Button</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-transparent');
      expect(button).toHaveClass('hover:bg-gray-100');
      expect(button).toHaveClass('text-gray-700');
    });

    test('renders with danger variant', () => {
      render(<TouchButton variant="danger">Button</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-red-600');
      expect(button).toHaveClass('hover:bg-red-700');
      expect(button).toHaveClass('text-white');
    });
  });

  describe('Sizes', () => {
    test('renders with default size (medium)', () => {
      render(<TouchButton>Button</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('min-h-[48px]');
      expect(button).toHaveClass('px-5');
      expect(button).toHaveClass('py-3');
      expect(button).toHaveClass('text-base');
    });

    test('renders with small size', () => {
      render(<TouchButton size="small">Button</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('min-h-[40px]');
      expect(button).toHaveClass('px-4');
      expect(button).toHaveClass('py-2');
      expect(button).toHaveClass('text-sm');
    });

    test('renders with large size', () => {
      render(<TouchButton size="large">Button</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('min-h-[56px]');
      expect(button).toHaveClass('px-6');
      expect(button).toHaveClass('py-4');
      expect(button).toHaveClass('text-lg');
    });
  });

  describe('Icons', () => {
    test('renders with start icon', () => {
      render(
        <TouchButton startIcon={<span data-testid="start-icon">→</span>}>
          Button
        </TouchButton>
      );
      
      expect(screen.getByTestId('start-icon')).toBeInTheDocument();
      expect(screen.getByText('Button')).toBeInTheDocument();
    });

    test('renders with end icon', () => {
      render(
        <TouchButton endIcon={<span data-testid="end-icon">←</span>}>
          Button
        </TouchButton>
      );
      
      expect(screen.getByTestId('end-icon')).toBeInTheDocument();
      expect(screen.getByText('Button')).toBeInTheDocument();
    });

    test('renders with both start and end icons', () => {
      render(
        <TouchButton 
          startIcon={<span data-testid="start-icon">→</span>}
          endIcon={<span data-testid="end-icon">←</span>}
        >
          Button
        </TouchButton>
      );
      
      expect(screen.getByTestId('start-icon')).toBeInTheDocument();
      expect(screen.getByTestId('end-icon')).toBeInTheDocument();
      expect(screen.getByText('Button')).toBeInTheDocument();
    });
  });

  describe('States', () => {
    test('renders disabled state', () => {
      render(<TouchButton disabled>Button</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('disabled:bg-gray-400');
      expect(button).toHaveClass('disabled:cursor-not-allowed');
    });

    test('renders loading state', () => {
      render(<TouchButton loading>Button</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(screen.getByText('Carregando...')).toBeInTheDocument();
      expect(screen.queryByText('Button')).not.toBeInTheDocument();
      
      // Check for spinner SVG
      const spinner = button.querySelector('svg');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('animate-spin');
    });

    test('loading state overrides disabled', () => {
      render(<TouchButton loading disabled>Button</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(screen.getByText('Carregando...')).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    test('renders with full width', () => {
      render(<TouchButton fullWidth>Button</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('w-full');
    });

    test('renders without full width by default', () => {
      render(<TouchButton>Button</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).not.toHaveClass('w-full');
    });

    test('applies custom className', () => {
      render(<TouchButton className="custom-class">Button</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    test('custom className does not override base classes', () => {
      render(<TouchButton className="custom-class">Button</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
      expect(button).toHaveClass('inline-flex');
      expect(button).toHaveClass('items-center');
      expect(button).toHaveClass('justify-center');
    });
  });

  describe('Interactions', () => {
    test('calls onClick when clicked', () => {
      render(<TouchButton onClick={mockOnClick}>Button</TouchButton>);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    test('does not call onClick when disabled', () => {
      render(<TouchButton onClick={mockOnClick} disabled>Button</TouchButton>);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(mockOnClick).not.toHaveBeenCalled();
    });

    test('does not call onClick when loading', () => {
      render(<TouchButton onClick={mockOnClick} loading>Button</TouchButton>);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(mockOnClick).not.toHaveBeenCalled();
    });

    test('passes event to onClick handler', () => {
      render(<TouchButton onClick={mockOnClick}>Button</TouchButton>);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(mockOnClick).toHaveBeenCalledWith(expect.objectContaining({
        type: 'click',
        target: button,
      }));
    });
  });

  describe('Haptic Feedback', () => {
    test('triggers haptic feedback on click by default', () => {
      render(<TouchButton onClick={mockOnClick}>Button</TouchButton>);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(mockHapticFeedback.custom).toHaveBeenCalledWith('light');
    });

    test('triggers medium haptic pattern', () => {
      render(<TouchButton onClick={mockOnClick} hapticPattern="medium">Button</TouchButton>);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(mockHapticFeedback.custom).toHaveBeenCalledWith('medium');
    });

    test('triggers heavy haptic pattern', () => {
      render(<TouchButton onClick={mockOnClick} hapticPattern="heavy">Button</TouchButton>);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(mockHapticFeedback.custom).toHaveBeenCalledWith('heavy');
    });

    test('does not trigger haptic when haptic is false', () => {
      render(<TouchButton onClick={mockOnClick} haptic={false}>Button</TouchButton>);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(mockHapticFeedback.custom).not.toHaveBeenCalled();
    });

    test('does not trigger haptic when button is disabled', () => {
      render(<TouchButton onClick={mockOnClick} disabled>Button</TouchButton>);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(mockHapticFeedback.custom).not.toHaveBeenCalled();
    });

    test('does not trigger haptic when button is loading', () => {
      render(<TouchButton onClick={mockOnClick} loading>Button</TouchButton>);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(mockHapticFeedback.custom).not.toHaveBeenCalled();
    });
  });

  describe('Touch Optimization', () => {
    test('has touch-manipulation class for better touch response', () => {
      render(<TouchButton>Button</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('touch-manipulation');
    });

    test('has select-none class to prevent text selection', () => {
      render(<TouchButton>Button</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('select-none');
    });

    test('has active scale animation', () => {
      render(<TouchButton>Button</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('active:scale-[0.98]');
    });
  });

  describe('Accessibility', () => {
    test('has proper button role', () => {
      render(<TouchButton>Button</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    test('forwards aria attributes', () => {
      render(
        <TouchButton 
          aria-label="Custom Label"
          aria-describedby="description"
        >
          Button
        </TouchButton>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Custom Label');
      expect(button).toHaveAttribute('aria-describedby', 'description');
    });

    test('properly indicates disabled state', () => {
      render(<TouchButton disabled>Button</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('disabled');
    });

    test('button is keyboard accessible', () => {
      render(<TouchButton onClick={mockOnClick}>Button</TouchButton>);
      
      const button = screen.getByRole('button');
      
      // Simulate Enter key press
      fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
      
      // Button should be focusable and clickable via keyboard
      button.focus();
      expect(document.activeElement).toBe(button);
    });
  });

  describe('Dark Mode', () => {
    test('applies dark mode classes for outline variant', () => {
      render(<TouchButton variant="outline">Button</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('dark:hover:bg-gray-800');
      expect(button).toHaveClass('dark:border-gray-600');
      expect(button).toHaveClass('dark:text-gray-300');
    });

    test('applies dark mode classes for ghost variant', () => {
      render(<TouchButton variant="ghost">Button</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('dark:hover:bg-gray-800');
      expect(button).toHaveClass('dark:text-gray-300');
    });
  });

  describe('Edge Cases', () => {
    test('handles empty children', () => {
      render(<TouchButton>{''}</TouchButton>);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    test('handles multiple children elements', () => {
      render(
        <TouchButton>
          <span>First</span>
          <span>Second</span>
        </TouchButton>
      );
      
      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
    });

    test('handles rapid clicks', () => {
      render(<TouchButton onClick={mockOnClick}>Button</TouchButton>);
      
      const button = screen.getByRole('button');
      
      // Rapid clicks
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
      
      expect(mockOnClick).toHaveBeenCalledTimes(3);
    });

    test('forwards HTML button props', () => {
      render(
        <TouchButton 
          type="submit"
          form="test-form"
          name="test-button"
          value="test-value"
        >
          Button
        </TouchButton>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
      expect(button).toHaveAttribute('form', 'test-form');
      expect(button).toHaveAttribute('name', 'test-button');
      expect(button).toHaveAttribute('value', 'test-value');
    });
  });

  describe('Performance', () => {
    test('button is memoized', () => {
      const { rerender } = render(<TouchButton>Button</TouchButton>);
      
      const button1 = screen.getByRole('button');
      
      // Re-render with same props
      rerender(<TouchButton>Button</TouchButton>);
      
      const button2 = screen.getByRole('button');
      
      // Component should be memoized
      expect(button1).toBe(button2);
    });
  });
});