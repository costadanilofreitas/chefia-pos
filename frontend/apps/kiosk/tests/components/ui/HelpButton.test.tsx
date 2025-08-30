import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HelpButton } from '../../../src/components/ui/HelpButton';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  HelpCircle: ({ className }: any) => <div className={className} data-testid="help-circle">HelpCircle</div>,
  X: ({ className }: any) => <div className={className} data-testid="x-icon">X</div>,
  ShoppingCart: ({ className }: any) => <div className={className} data-testid="shopping-cart">ShoppingCart</div>,
  CreditCard: ({ className }: any) => <div className={className} data-testid="credit-card">CreditCard</div>,
  Clock: ({ className }: any) => <div className={className} data-testid="clock">Clock</div>,
}));

describe('HelpButton Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders floating help button', () => {
      render(<HelpButton />);

      const helpIcon = screen.getByTestId('help-circle');
      expect(helpIcon).toBeInTheDocument();
    });

    test('applies custom className', () => {
      render(<HelpButton className="custom-class" />);

      const helpButton = screen.getByTestId('help-circle').closest('div[class*="fixed"]');
      expect(helpButton).toHaveClass('custom-class');
    });

    test('help button has correct positioning', () => {
      render(<HelpButton />);

      const helpButton = screen.getByTestId('help-circle').closest('div[class*="fixed"]');
      expect(helpButton).toHaveClass('fixed');
      expect(helpButton).toHaveClass('bottom-8');
      expect(helpButton).toHaveClass('left-8');
      expect(helpButton).toHaveClass('z-40');
    });

    test('help button has correct styling', () => {
      render(<HelpButton />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('rounded-full');
      expect(button).toHaveClass('w-16');
      expect(button).toHaveClass('h-16');
      expect(button).toHaveClass('shadow-xl');
    });

    test('initially does not show help modal', () => {
      render(<HelpButton />);

      expect(screen.queryByText('Como fazer seu pedido')).not.toBeInTheDocument();
    });
  });

  describe('Modal Interaction', () => {
    test('opens help modal when button is clicked', () => {
      render(<HelpButton />);

      const helpButton = screen.getByRole('button');
      fireEvent.click(helpButton);

      expect(screen.getByText('Como fazer seu pedido')).toBeInTheDocument();
    });

    test('displays all help steps in modal', () => {
      render(<HelpButton />);

      const helpButton = screen.getByRole('button');
      fireEvent.click(helpButton);

      // Check all step titles
      expect(screen.getByText('Escolha seus produtos')).toBeInTheDocument();
      expect(screen.getByText('Adicione ao carrinho')).toBeInTheDocument();
      expect(screen.getByText('Finalize o pedido')).toBeInTheDocument();
      expect(screen.getByText('Aguarde a preparação')).toBeInTheDocument();

      // Check all step descriptions
      expect(screen.getByText('Navegue pelas categorias ou use a busca para encontrar o que deseja')).toBeInTheDocument();
      expect(screen.getByText('Toque no botão "Adicionar" em cada produto desejado')).toBeInTheDocument();
      expect(screen.getByText('Clique no carrinho, revise seu pedido e escolha a forma de pagamento')).toBeInTheDocument();
      expect(screen.getByText('Pegue seu comprovante e aguarde ser chamado no painel')).toBeInTheDocument();
    });

    test('displays step numbers correctly', () => {
      render(<HelpButton />);

      const helpButton = screen.getByRole('button');
      fireEvent.click(helpButton);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    test('displays helpful tips section', () => {
      render(<HelpButton />);

      const helpButton = screen.getByRole('button');
      fireEvent.click(helpButton);

      expect(screen.getByText('💡 Dicas úteis:')).toBeInTheDocument();
      expect(screen.getByText('• Você pode personalizar seus produtos tocando em "Personalizar"')).toBeInTheDocument();
      expect(screen.getByText('• Use o botão de busca 🔍 para encontrar produtos específicos')).toBeInTheDocument();
      expect(screen.getByText('• Produtos em destaque aparecem com a estrela ⭐')).toBeInTheDocument();
      expect(screen.getByText('• O tempo de preparo aparece em cada produto')).toBeInTheDocument();
    });

    test('closes modal when X button is clicked', () => {
      render(<HelpButton />);

      // Open modal
      const helpButton = screen.getByRole('button');
      fireEvent.click(helpButton);
      expect(screen.getByText('Como fazer seu pedido')).toBeInTheDocument();

      // Close modal
      const closeButton = screen.getByTestId('x-icon').closest('button');
      fireEvent.click(closeButton!);

      expect(screen.queryByText('Como fazer seu pedido')).not.toBeInTheDocument();
    });

    test('closes modal when "Entendi!" button is clicked', () => {
      render(<HelpButton />);

      // Open modal
      const helpButton = screen.getByRole('button');
      fireEvent.click(helpButton);
      expect(screen.getByText('Como fazer seu pedido')).toBeInTheDocument();

      // Close modal with "Entendi!" button
      const understoodButton = screen.getByText('Entendi!');
      fireEvent.click(understoodButton);

      expect(screen.queryByText('Como fazer seu pedido')).not.toBeInTheDocument();
    });

    test('closes modal when backdrop is clicked', () => {
      render(<HelpButton />);

      // Open modal
      const helpButton = screen.getByRole('button');
      fireEvent.click(helpButton);
      expect(screen.getByText('Como fazer seu pedido')).toBeInTheDocument();

      // Click backdrop (the overlay behind the modal)
      const backdrop = document.querySelector('.bg-black\\/50');
      fireEvent.click(backdrop!);

      expect(screen.queryByText('Como fazer seu pedido')).not.toBeInTheDocument();
    });
  });

  describe('Visual and Animation', () => {
    test('pulse animation element is present', () => {
      render(<HelpButton />);

      // Look for the pulse animation div
      const pulseElement = document.querySelector('div[class*="bg-primary-400"][class*="opacity-75"]');
      expect(pulseElement).toBeInTheDocument();
      expect(pulseElement).toHaveClass('pointer-events-none');
    });

    test('modal has correct styling', () => {
      render(<HelpButton />);

      const helpButton = screen.getByRole('button');
      fireEvent.click(helpButton);

      const modal = screen.getByText('Como fazer seu pedido').closest('div[class*="fixed"]');
      expect(modal).toHaveClass('bg-white');
      expect(modal).toHaveClass('rounded-2xl');
      expect(modal).toHaveClass('shadow-2xl');
      expect(modal).toHaveClass('z-50');
    });

    test('backdrop has correct opacity', () => {
      render(<HelpButton />);

      const helpButton = screen.getByRole('button');
      fireEvent.click(helpButton);

      const backdrop = document.querySelector('.bg-black\\/50');
      expect(backdrop).toBeInTheDocument();
      expect(backdrop).toHaveClass('fixed');
      expect(backdrop).toHaveClass('inset-0');
      expect(backdrop).toHaveClass('z-50');
    });
  });

  describe('Accessibility', () => {
    test('help button has proper button role', () => {
      render(<HelpButton />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    test('modal close buttons are keyboard accessible', () => {
      render(<HelpButton />);

      const helpButton = screen.getByRole('button');
      fireEvent.click(helpButton);

      // Both close buttons should be accessible
      const closeButtons = screen.getAllByRole('button');
      expect(closeButtons.length).toBeGreaterThanOrEqual(3); // Help button, X button, Entendi button
    });

    test('modal heading is properly structured', () => {
      render(<HelpButton />);

      const helpButton = screen.getByRole('button');
      fireEvent.click(helpButton);

      expect(screen.getByText('Como fazer seu pedido')).toBeInTheDocument();
      expect(screen.getByText('💡 Dicas úteis:')).toBeInTheDocument();
    });
  });

  describe('State Management', () => {
    test('can open and close modal multiple times', () => {
      render(<HelpButton />);

      const helpButton = screen.getByRole('button');

      // First open/close cycle
      fireEvent.click(helpButton);
      expect(screen.getByText('Como fazer seu pedido')).toBeInTheDocument();
      
      const closeButton = screen.getByText('Entendi!');
      fireEvent.click(closeButton);
      expect(screen.queryByText('Como fazer seu pedido')).not.toBeInTheDocument();

      // Second open/close cycle
      fireEvent.click(helpButton);
      expect(screen.getByText('Como fazer seu pedido')).toBeInTheDocument();
      
      fireEvent.click(closeButton);
      expect(screen.queryByText('Como fazer seu pedido')).not.toBeInTheDocument();
    });

    test('modal state is independent of button hover', () => {
      render(<HelpButton />);

      const helpButton = screen.getByRole('button');

      // Hover over button (should not open modal)
      fireEvent.mouseEnter(helpButton);
      expect(screen.queryByText('Como fazer seu pedido')).not.toBeInTheDocument();

      // Click to open
      fireEvent.click(helpButton);
      expect(screen.getByText('Como fazer seu pedido')).toBeInTheDocument();

      // Mouse leave should not close modal
      fireEvent.mouseLeave(helpButton);
      expect(screen.getByText('Como fazer seu pedido')).toBeInTheDocument();
    });
  });

  describe('Dark Mode Support', () => {
    test('modal applies dark mode classes', () => {
      render(<HelpButton />);

      const helpButton = screen.getByRole('button');
      fireEvent.click(helpButton);

      const modal = screen.getByText('Como fazer seu pedido').closest('div[class*="dark:"]');
      expect(modal).toHaveClass('dark:bg-gray-800');

      // Check step cards
      const stepCards = document.querySelectorAll('div[class*="dark:bg-gray-700"]');
      expect(stepCards.length).toBeGreaterThan(0);
    });

    test('text has dark mode styling', () => {
      render(<HelpButton />);

      const helpButton = screen.getByRole('button');
      fireEvent.click(helpButton);

      const heading = screen.getByText('Como fazer seu pedido');
      expect(heading).toHaveClass('dark:text-white');

      // Check tips section
      const tipsSection = screen.getByText('💡 Dicas úteis:');
      expect(tipsSection).toHaveClass('dark:text-blue-200');
    });
  });

  describe('Edge Cases', () => {
    test('handles rapid button clicks', () => {
      render(<HelpButton />);

      const helpButton = screen.getByRole('button');

      // Rapid clicks
      fireEvent.click(helpButton);
      fireEvent.click(helpButton);
      fireEvent.click(helpButton);

      // Modal should still be open (toggles on each click)
      // Odd number of clicks = open
      expect(screen.getByText('Como fazer seu pedido')).toBeInTheDocument();
    });

    test('handles clicking help button while modal is open', () => {
      render(<HelpButton />);

      const helpButton = screen.getByRole('button');

      // Open modal
      fireEvent.click(helpButton);
      expect(screen.getByText('Como fazer seu pedido')).toBeInTheDocument();

      // Click help button again (should close)
      fireEvent.click(helpButton);
      expect(screen.queryByText('Como fazer seu pedido')).not.toBeInTheDocument();
    });

    test('modal scroll works for long content', () => {
      render(<HelpButton />);

      const helpButton = screen.getByRole('button');
      fireEvent.click(helpButton);

      const modal = screen.getByText('Como fazer seu pedido').closest('div');
      expect(modal?.parentElement).toHaveClass('overflow-y-auto');
      expect(modal?.parentElement).toHaveClass('max-h-[80vh]');
    });
  });

  describe('Responsive Design', () => {
    test('modal uses responsive grid for steps', () => {
      render(<HelpButton />);

      const helpButton = screen.getByRole('button');
      fireEvent.click(helpButton);

      const stepsContainer = screen.getByText('Escolha seus produtos').closest('div')?.parentElement;
      expect(stepsContainer).toHaveClass('grid');
      expect(stepsContainer).toHaveClass('grid-cols-1');
      expect(stepsContainer).toHaveClass('md:grid-cols-2');
    });

    test('modal has responsive padding and margins', () => {
      render(<HelpButton />);

      const helpButton = screen.getByRole('button');
      fireEvent.click(helpButton);

      const modal = screen.getByText('Como fazer seu pedido').closest('div[class*="p-8"]');
      expect(modal).toHaveClass('p-8');
      expect(modal).toHaveClass('inset-x-8');
      expect(modal).toHaveClass('max-w-4xl');
      expect(modal).toHaveClass('mx-auto');
    });
  });

  describe('Component Integration', () => {
    test('complete help flow - open, read, and close', () => {
      render(<HelpButton />);

      // Initially button is visible
      const helpButton = screen.getByRole('button');
      expect(helpButton).toBeInTheDocument();

      // Open help
      fireEvent.click(helpButton);

      // Verify all content is visible
      expect(screen.getByText('Como fazer seu pedido')).toBeInTheDocument();
      expect(screen.getAllByText(/Escolha seus produtos|Adicione ao carrinho|Finalize o pedido|Aguarde a preparação/).length).toBe(4);
      expect(screen.getByText('💡 Dicas úteis:')).toBeInTheDocument();

      // Close help
      fireEvent.click(screen.getByText('Entendi!'));

      // Verify modal is closed
      expect(screen.queryByText('Como fazer seu pedido')).not.toBeInTheDocument();

      // Help button should still be visible
      expect(helpButton).toBeInTheDocument();
    });
  });
});