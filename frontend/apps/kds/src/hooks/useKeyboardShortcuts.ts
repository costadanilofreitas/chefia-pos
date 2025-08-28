import { useEffect, useCallback } from 'react';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  action: () => void;
  description?: string;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    for (const shortcut of shortcuts) {
      const matchesKey = event.key.toLowerCase() === shortcut.key.toLowerCase() ||
                         event.code.toLowerCase() === shortcut.key.toLowerCase();
      
      const matchesModifiers = 
        (shortcut.ctrl === undefined || shortcut.ctrl === event.ctrlKey) &&
        (shortcut.alt === undefined || shortcut.alt === event.altKey) &&
        (shortcut.shift === undefined || shortcut.shift === event.shiftKey);

      if (matchesKey && matchesModifiers) {
        event.preventDefault();
        shortcut.action();
        break;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  return shortcuts.map(s => ({
    key: s.key,
    description: s.description,
    combination: [
      s.ctrl && 'Ctrl',
      s.alt && 'Alt',
      s.shift && 'Shift',
      s.key.toUpperCase()
    ].filter(Boolean).join('+')
  }));
}

// Pre-defined KDS shortcuts
export const KDS_SHORTCUTS = {
  REFRESH: { key: 'F5', description: 'Atualizar pedidos' },
  FULLSCREEN: { key: 'F11', description: 'Tela cheia' },
  TOGGLE_SOUND: { key: 'm', ctrl: true, description: 'Ativar/desativar som' },
  NEXT_ORDER: { key: 'ArrowRight', description: 'Próximo pedido' },
  PREV_ORDER: { key: 'ArrowLeft', description: 'Pedido anterior' },
  MARK_READY: { key: 'Enter', description: 'Marcar como pronto' },
  FILTER_ALL: { key: '0', ctrl: true, description: 'Mostrar todas estações' },
  FILTER_1: { key: '1', ctrl: true, description: 'Filtrar estação 1' },
  FILTER_2: { key: '2', ctrl: true, description: 'Filtrar estação 2' },
  FILTER_3: { key: '3', ctrl: true, description: 'Filtrar estação 3' },
  HELP: { key: 'F1', description: 'Mostrar ajuda' }
};