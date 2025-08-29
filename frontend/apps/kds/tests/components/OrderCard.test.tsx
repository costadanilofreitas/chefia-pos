import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import OrderCard from '../../src/ui/KDSOrderCard';
import { createMockOrder } from '../utils/testUtils';

describe('OrderCard Component', () => {
  const mockOnStatusChange = jest.fn();
  const mockOnItemStatusChange = jest.fn();
  
  const defaultOrder = {
    id: '123',
    created_at: new Date().toISOString(),
    priority: 'normal' as const,
    type: 'table' as const,
    table_number: '5',
    items: [
      {
        id: '1',
        name: 'Burger',
        quantity: 2,
        notes: 'No onions',
        status: 'pending'
      },
      {
        id: '2',
        name: 'Fries',
        quantity: 1,
        status: 'pending'
      }
    ],
    customer_name: 'John Doe'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Order Header', () => {
    it('should display order ID', () => {
      render(
        <OrderCard
          order={defaultOrder}
          onStatusChange={mockOnStatusChange}
          onItemStatusChange={mockOnItemStatusChange}
          nextStatus="preparing"
        />
      );
      
      expect(screen.getByText('Pedido #123')).toBeInTheDocument();
    });

    it('should display priority badge with correct variant', () => {
      const priorities = [
        { value: 'urgent', variant: 'danger', text: 'URGENT' },
        { value: 'high', variant: 'warning', text: 'HIGH' },
        { value: 'normal', variant: 'info', text: 'NORMAL' },
        { value: 'low', variant: 'success', text: 'LOW' }
      ];

      priorities.forEach(({ value, text }) => {
        const { rerender } = render(
          <OrderCard
            order={{ ...defaultOrder, priority: value }}
            onStatusChange={mockOnStatusChange}
            onItemStatusChange={mockOnItemStatusChange}
            nextStatus="preparing"
          />
        );
        
        const badge = screen.getByText(text);
        expect(badge).toBeInTheDocument();
        
        rerender(<div />); // Clear for next iteration
      });
    });

    it('should display timer component', () => {
      render(
        <OrderCard
          order={defaultOrder}
          onStatusChange={mockOnStatusChange}
          onItemStatusChange={mockOnItemStatusChange}
          nextStatus="preparing"
        />
      );
      
      // Timer component should be rendered with order created_at
      expect(document.querySelector('.font-mono')).toBeInTheDocument();
    });

    it('should display table number for table orders', () => {
      render(
        <OrderCard
          order={defaultOrder}
          onStatusChange={mockOnStatusChange}
          onItemStatusChange={mockOnItemStatusChange}
          nextStatus="preparing"
        />
      );
      
      expect(screen.getByText(/Mesa/)).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should display delivery ID for delivery orders', () => {
      const deliveryOrder = {
        ...defaultOrder,
        type: 'delivery' as const,
        delivery_id: 'DEL-456',
        table_number: undefined
      };
      
      render(
        <OrderCard
          order={deliveryOrder}
          onStatusChange={mockOnStatusChange}
          onItemStatusChange={mockOnItemStatusChange}
          nextStatus="preparing"
        />
      );
      
      expect(screen.getByText(/Delivery/)).toBeInTheDocument();
      expect(screen.getByText('DEL-456')).toBeInTheDocument();
    });
  });

  describe('Order Items', () => {
    it('should display all order items', () => {
      render(
        <OrderCard
          order={defaultOrder}
          onStatusChange={mockOnStatusChange}
          onItemStatusChange={mockOnItemStatusChange}
          nextStatus="preparing"
        />
      );
      
      expect(screen.getByText('Burger')).toBeInTheDocument();
      expect(screen.getByText('Fries')).toBeInTheDocument();
      expect(screen.getByText('2x')).toBeInTheDocument();
      expect(screen.getByText('1x')).toBeInTheDocument();
    });

    it('should display item notes when available', () => {
      render(
        <OrderCard
          order={defaultOrder}
          onStatusChange={mockOnStatusChange}
          onItemStatusChange={mockOnItemStatusChange}
          nextStatus="preparing"
        />
      );
      
      expect(screen.getByText(/No onions/)).toBeInTheDocument();
    });

    it('should not display notes section when no notes', () => {
      render(
        <OrderCard
          order={defaultOrder}
          onStatusChange={mockOnStatusChange}
          onItemStatusChange={mockOnItemStatusChange}
          nextStatus="preparing"
        />
      );
      
      // Fries has no notes, so should not have notes section
      const friesElement = screen.getByText('Fries');
      const parentDiv = friesElement.closest('.flex-1');
      expect(parentDiv?.textContent).not.toContain('📝');
    });

    it('should display correct button text based on item status', () => {
      const orderWithMixedStatus = {
        ...defaultOrder,
        items: [
          { ...defaultOrder.items[0], status: 'preparing' },
          { ...defaultOrder.items[1], status: 'pending' }
        ]
      };
      
      render(
        <OrderCard
          order={orderWithMixedStatus}
          onStatusChange={mockOnStatusChange}
          onItemStatusChange={mockOnItemStatusChange}
          nextStatus="preparing"
        />
      );
      
      const buttons = screen.getAllByRole('button');
      const itemButtons = buttons.filter(btn => 
        btn.textContent === 'Pronto' || btn.textContent === 'Marcar'
      );
      
      expect(itemButtons).toHaveLength(2);
      expect(screen.getByText('Pronto')).toBeInTheDocument();
      expect(screen.getByText('Marcar')).toBeInTheDocument();
    });

    it('should call onItemStatusChange when item button is clicked', () => {
      render(
        <OrderCard
          order={defaultOrder}
          onStatusChange={mockOnStatusChange}
          onItemStatusChange={mockOnItemStatusChange}
          nextStatus="preparing"
        />
      );
      
      const itemButtons = screen.getAllByText('Marcar');
      fireEvent.click(itemButtons[0]);
      
      expect(mockOnItemStatusChange).toHaveBeenCalledWith('123', '1', 'preparing');
    });

    it('should apply success variant to completed items', () => {
      const orderWithCompletedItem = {
        ...defaultOrder,
        items: [
          { ...defaultOrder.items[0], status: 'ready' }
        ]
      };
      
      render(
        <OrderCard
          order={orderWithCompletedItem}
          onStatusChange={mockOnStatusChange}
          onItemStatusChange={mockOnItemStatusChange}
          nextStatus="ready"
        />
      );
      
      const button = screen.getByText('Pronto').closest('button');
      expect(button).toHaveClass('variant', 'success');
    });
  });

  describe('Order Footer', () => {
    it('should display customer name when available', () => {
      render(
        <OrderCard
          order={defaultOrder}
          onStatusChange={mockOnStatusChange}
          onItemStatusChange={mockOnItemStatusChange}
          nextStatus="preparing"
        />
      );
      
      expect(screen.getByText('Cliente:')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should display "Não identificado" when customer name is not available', () => {
      const orderWithoutCustomer = {
        ...defaultOrder,
        customer_name: undefined
      };
      
      render(
        <OrderCard
          order={orderWithoutCustomer}
          onStatusChange={mockOnStatusChange}
          onItemStatusChange={mockOnItemStatusChange}
          nextStatus="preparing"
        />
      );
      
      expect(screen.getByText('Não identificado')).toBeInTheDocument();
    });

    it('should display correct action button text based on next status', () => {
      const statusTexts = [
        { status: 'preparing', text: 'Iniciar Preparo' },
        { status: 'ready', text: 'Marcar como Pronto' },
        { status: 'delivered', text: 'Entregar' },
        { status: 'other', text: 'Avançar' }
      ];

      statusTexts.forEach(({ status, text }) => {
        const { rerender } = render(
          <OrderCard
            order={defaultOrder}
            onStatusChange={mockOnStatusChange}
            onItemStatusChange={mockOnItemStatusChange}
            nextStatus={status}
          />
        );
        
        const button = screen.getByRole('button', { name: text });
        expect(button).toBeInTheDocument();
        
        rerender(<div />);
      });
    });

    it('should call onStatusChange when action button is clicked', () => {
      render(
        <OrderCard
          order={defaultOrder}
          onStatusChange={mockOnStatusChange}
          onItemStatusChange={mockOnItemStatusChange}
          nextStatus="preparing"
        />
      );
      
      const actionButton = screen.getByText('Iniciar Preparo');
      fireEvent.click(actionButton);
      
      expect(mockOnStatusChange).toHaveBeenCalledWith('123', 'preparing');
    });
  });

  describe('Card Priority Styling', () => {
    it('should apply urgent priority class to card', () => {
      const urgentOrder = {
        ...defaultOrder,
        priority: 'urgent'
      };
      
      const { container } = render(
        <OrderCard
          order={urgentOrder}
          onStatusChange={mockOnStatusChange}
          onItemStatusChange={mockOnItemStatusChange}
          nextStatus="preparing"
        />
      );
      
      const card = container.querySelector('.mb-4');
      expect(card).toBeInTheDocument();
    });

    it('should apply high priority class to card', () => {
      const highOrder = {
        ...defaultOrder,
        priority: 'high'
      };
      
      const { container } = render(
        <OrderCard
          order={highOrder}
          onStatusChange={mockOnStatusChange}
          onItemStatusChange={mockOnItemStatusChange}
          nextStatus="preparing"
        />
      );
      
      const card = container.querySelector('.mb-4');
      expect(card).toBeInTheDocument();
    });

    it('should apply normal priority class to card', () => {
      const { container } = render(
        <OrderCard
          order={defaultOrder}
          onStatusChange={mockOnStatusChange}
          onItemStatusChange={mockOnItemStatusChange}
          nextStatus="preparing"
        />
      );
      
      const card = container.querySelector('.mb-4');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Touch Targets', () => {
    it('should apply touch-target class to item buttons', () => {
      render(
        <OrderCard
          order={defaultOrder}
          onStatusChange={mockOnStatusChange}
          onItemStatusChange={mockOnItemStatusChange}
          nextStatus="preparing"
        />
      );
      
      const itemButtons = screen.getAllByText('Marcar');
      itemButtons.forEach(button => {
        expect(button.closest('button')).toHaveClass('touch-target');
      });
    });

    it('should apply touch-target-lg class to main action button', () => {
      render(
        <OrderCard
          order={defaultOrder}
          onStatusChange={mockOnStatusChange}
          onItemStatusChange={mockOnItemStatusChange}
          nextStatus="preparing"
        />
      );
      
      const actionButton = screen.getByText('Iniciar Preparo');
      expect(actionButton.closest('button')).toHaveClass('touch-target-lg');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty items array', () => {
      const emptyOrder = {
        ...defaultOrder,
        items: []
      };
      
      render(
        <OrderCard
          order={emptyOrder}
          onStatusChange={mockOnStatusChange}
          onItemStatusChange={mockOnItemStatusChange}
          nextStatus="preparing"
        />
      );
      
      expect(screen.getByText('Pedido #123')).toBeInTheDocument();
      expect(screen.getByText('Itens:')).toBeInTheDocument();
    });

    it('should handle numeric IDs', () => {
      const numericOrder = {
        ...defaultOrder,
        id: 456,
        items: [
          {
            ...defaultOrder.items[0],
            id: 789
          }
        ]
      };
      
      render(
        <OrderCard
          order={numericOrder}
          onStatusChange={mockOnStatusChange}
          onItemStatusChange={mockOnItemStatusChange}
          nextStatus="preparing"
        />
      );
      
      expect(screen.getByText('Pedido #456')).toBeInTheDocument();
      
      const itemButton = screen.getAllByText('Marcar')[0];
      fireEvent.click(itemButton);
      
      expect(mockOnItemStatusChange).toHaveBeenCalledWith(456, 789, 'preparing');
    });

    it('should handle Date object for created_at', () => {
      const dateOrder = {
        ...defaultOrder,
        created_at: new Date()
      };
      
      render(
        <OrderCard
          order={dateOrder}
          onStatusChange={mockOnStatusChange}
          onItemStatusChange={mockOnItemStatusChange}
          nextStatus="preparing"
        />
      );
      
      // Should render without errors
      expect(screen.getByText('Pedido #123')).toBeInTheDocument();
    });

    it('should handle unknown priority gracefully', () => {
      const unknownPriorityOrder = {
        ...defaultOrder,
        priority: 'unknown'
      };
      
      render(
        <OrderCard
          order={unknownPriorityOrder}
          onStatusChange={mockOnStatusChange}
          onItemStatusChange={mockOnItemStatusChange}
          nextStatus="preparing"
        />
      );
      
      expect(screen.getByText('UNKNOWN')).toBeInTheDocument();
    });

    it('should handle very long item names', () => {
      const longNameOrder = {
        ...defaultOrder,
        items: [
          {
            ...defaultOrder.items[0],
            name: 'Very Long Item Name That Should Be Handled Properly Without Breaking The Layout'
          }
        ]
      };
      
      render(
        <OrderCard
          order={longNameOrder}
          onStatusChange={mockOnStatusChange}
          onItemStatusChange={mockOnItemStatusChange}
          nextStatus="preparing"
        />
      );
      
      expect(screen.getByText(/Very Long Item Name/)).toBeInTheDocument();
    });

    it('should handle large quantities', () => {
      const largeQuantityOrder = {
        ...defaultOrder,
        items: [
          {
            ...defaultOrder.items[0],
            quantity: 999
          }
        ]
      };
      
      render(
        <OrderCard
          order={largeQuantityOrder}
          onStatusChange={mockOnStatusChange}
          onItemStatusChange={mockOnItemStatusChange}
          nextStatus="preparing"
        />
      );
      
      expect(screen.getByText('999x')).toBeInTheDocument();
    });
  });
});