import { useEffect, useCallback } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from './useToast';

interface ShortcutConfig {
  key: string;
  description: string;
  action: () => void;
  category?: 'navigation' | 'action' | 'system';
  requiresAuth?: boolean;
}

export const useKeyboardShortcuts = () => {
  const navigate = useNavigate();
  const { terminalId } = useParams();
  const { info } = useToast();

  // Define all shortcuts
  const shortcuts: ShortcutConfig[] = [
    // Navigation shortcuts
    {
      key: 'alt+h',
      description: 'Ir para POS Principal',
      action: () => navigate(`/pos/${terminalId}/main`),
      category: 'navigation'
    },
    {
      key: 'alt+b',
      description: 'Ir para Balcão',
      action: () => navigate(`/pos/${terminalId}/counter-orders`),
      category: 'navigation'
    },
    {
      key: 'alt+m',
      description: 'Ir para Mesas',
      action: () => navigate(`/pos/${terminalId}/tables`),
      category: 'navigation'
    },
    {
      key: 'alt+d',
      description: 'Ir para Delivery',
      action: () => navigate(`/pos/${terminalId}/delivery`),
      category: 'navigation'
    },
    {
      key: 'alt+r',
      description: 'Ir para Pedidos Remotos',
      action: () => navigate(`/pos/${terminalId}/remote-orders`),
      category: 'navigation'
    },
    {
      key: 'alt+f',
      description: 'Ir para Fidelidade',
      action: () => navigate(`/pos/${terminalId}/loyalty`),
      category: 'navigation'
    },
    {
      key: 'alt+i',
      description: 'Ir para Fiscal',
      action: () => navigate(`/pos/${terminalId}/fiscal`),
      category: 'navigation'
    },
    {
      key: 'alt+c',
      description: 'Ir para Caixa',
      action: () => navigate(`/pos/${terminalId}/cashier`),
      category: 'navigation'
    },
    {
      key: 'alt+g',
      description: 'Ir para Gerencial',
      action: () => navigate(`/pos/${terminalId}/manager`),
      category: 'navigation'
    },
    
    // POS Action shortcuts
    {
      key: 'f2',
      description: 'Novo Pedido',
      action: () => document.dispatchEvent(new CustomEvent('pos:newOrder')),
      category: 'action'
    },
    {
      key: 'f3',
      description: 'Buscar Produto',
      action: () => document.dispatchEvent(new CustomEvent('pos:searchProduct')),
      category: 'action'
    },
    {
      key: 'f4',
      description: 'Finalizar Pedido / Pagar',
      action: () => document.dispatchEvent(new CustomEvent('pos:finishOrder')),
      category: 'action'
    },
    {
      key: 'f5',
      description: 'Limpar Carrinho',
      action: () => document.dispatchEvent(new CustomEvent('pos:clearCart')),
      category: 'action'
    },
    {
      key: 'f6',
      description: 'Modo Rápido',
      action: () => document.dispatchEvent(new CustomEvent('pos:quickMode')),
      category: 'action'
    },
    {
      key: 'f7',
      description: 'Aplicar Desconto',
      action: () => document.dispatchEvent(new CustomEvent('pos:applyDiscount')),
      category: 'action'
    },
    {
      key: 'f8',
      description: 'Selecionar Cliente',
      action: () => document.dispatchEvent(new CustomEvent('pos:selectCustomer')),
      category: 'action'
    },
    {
      key: 'f9',
      description: 'Histórico de Vendas',
      action: () => document.dispatchEvent(new CustomEvent('pos:salesHistory')),
      category: 'action'
    },
    {
      key: 'f10',
      description: 'Menu Principal',
      action: () => document.dispatchEvent(new CustomEvent('pos:toggleMenu')),
      category: 'action'
    },
    
    // Quick number shortcuts for categories (1-9)
    {
      key: '1',
      description: 'Categoria 1',
      action: () => document.dispatchEvent(new CustomEvent('pos:selectCategory', { detail: 0 })),
      category: 'action'
    },
    {
      key: '2',
      description: 'Categoria 2',
      action: () => document.dispatchEvent(new CustomEvent('pos:selectCategory', { detail: 1 })),
      category: 'action'
    },
    {
      key: '3',
      description: 'Categoria 3',
      action: () => document.dispatchEvent(new CustomEvent('pos:selectCategory', { detail: 2 })),
      category: 'action'
    },
    {
      key: '4',
      description: 'Categoria 4',
      action: () => document.dispatchEvent(new CustomEvent('pos:selectCategory', { detail: 3 })),
      category: 'action'
    },
    {
      key: '5',
      description: 'Categoria 5',
      action: () => document.dispatchEvent(new CustomEvent('pos:selectCategory', { detail: 4 })),
      category: 'action'
    },
    
    // Quantity shortcuts
    {
      key: 'ctrl+1',
      description: 'Quantidade 1',
      action: () => document.dispatchEvent(new CustomEvent('pos:setQuantity', { detail: 1 })),
      category: 'action'
    },
    {
      key: 'ctrl+2',
      description: 'Quantidade 2',
      action: () => document.dispatchEvent(new CustomEvent('pos:setQuantity', { detail: 2 })),
      category: 'action'
    },
    {
      key: 'ctrl+3',
      description: 'Quantidade 3',
      action: () => document.dispatchEvent(new CustomEvent('pos:setQuantity', { detail: 3 })),
      category: 'action'
    },
    {
      key: 'ctrl+5',
      description: 'Quantidade 5',
      action: () => document.dispatchEvent(new CustomEvent('pos:setQuantity', { detail: 5 })),
      category: 'action'
    },
    {
      key: 'ctrl+0',
      description: 'Quantidade 10',
      action: () => document.dispatchEvent(new CustomEvent('pos:setQuantity', { detail: 10 })),
      category: 'action'
    },
    
    // System shortcuts
    {
      key: 'ctrl+z',
      description: 'Desfazer',
      action: () => document.dispatchEvent(new CustomEvent('pos:undo')),
      category: 'system'
    },
    {
      key: 'ctrl+y',
      description: 'Refazer',
      action: () => document.dispatchEvent(new CustomEvent('pos:redo')),
      category: 'system'
    },
    {
      key: 'ctrl+p',
      description: 'Imprimir',
      action: () => document.dispatchEvent(new CustomEvent('pos:print')),
      category: 'system'
    },
    {
      key: 'ctrl+s',
      description: 'Salvar Rascunho',
      action: () => document.dispatchEvent(new CustomEvent('pos:saveDraft')),
      category: 'system'
    },
    {
      key: 'ctrl+/',
      description: 'Mostrar Atalhos',
      action: () => {
        info('Pressione Ctrl+/ para ver todos os atalhos');
        document.dispatchEvent(new CustomEvent('pos:showShortcuts'));
      },
      category: 'system'
    },
    {
      key: 'escape',
      description: 'Fechar/Cancelar',
      action: () => document.dispatchEvent(new CustomEvent('pos:escape')),
      category: 'system'
    },
    {
      key: 'enter',
      description: 'Confirmar',
      action: () => document.dispatchEvent(new CustomEvent('pos:confirm')),
      category: 'system'
    }
  ];

  // Register all shortcuts
  shortcuts.forEach(shortcut => {
    useHotkeys(shortcut.key, (e) => {
      e.preventDefault();
      shortcut.action();
    }, {
      enableOnFormTags: false,
      preventDefault: true
    });
  });

  // Show shortcuts modal
  const showShortcutsHelp = useCallback(() => {
    const event = new CustomEvent('pos:showShortcutsModal', { 
      detail: { shortcuts } 
    });
    document.dispatchEvent(event);
  }, [shortcuts]);

  // Register help shortcut
  useHotkeys('ctrl+/', showShortcutsHelp);

  return {
    shortcuts,
    showShortcutsHelp
  };
};

// Custom hook for listening to keyboard events in components
export const useKeyboardEvent = (eventName: string, handler: (detail?: any) => void) => {
  useEffect(() => {
    const handleEvent = (e: CustomEvent) => {
      handler(e.detail);
    };

    document.addEventListener(eventName as any, handleEvent);
    return () => {
      document.removeEventListener(eventName as any, handleEvent);
    };
  }, [eventName, handler]);
};