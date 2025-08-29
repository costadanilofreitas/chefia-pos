import { useEffect, useCallback, useRef } from 'react';
import { logger } from '../services/logger';

export interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  handler: () => void;
  description?: string;
  preventDefault?: boolean;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  preventInInput?: boolean;
}

export function useKeyboardShortcuts(
  shortcuts: ShortcutConfig[],
  { enabled = true, preventInInput = true }: UseKeyboardShortcutsOptions = {}
) {
  const shortcutsRef = useRef<ShortcutConfig[]>(shortcuts);

  // Update shortcuts ref when they change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Prevent shortcuts when typing in input fields
    if (preventInInput) {
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.contentEditable === 'true'
      ) {
        return;
      }
    }

    // Find matching shortcut
    const matchingShortcut = shortcutsRef.current.find(shortcut => {
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase() ||
                      event.code.toLowerCase() === shortcut.key.toLowerCase();
      
      const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey;
      const altMatch = shortcut.alt ? event.altKey : !event.altKey;
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const metaMatch = shortcut.meta ? event.metaKey : (!event.metaKey || shortcut.ctrl);

      return keyMatch && ctrlMatch && altMatch && shiftMatch && metaMatch;
    });

    if (matchingShortcut) {
      if (matchingShortcut.preventDefault !== false) {
        event.preventDefault();
        event.stopPropagation();
      }

      logger.debug(`Keyboard shortcut triggered: ${matchingShortcut.key}`, 'useKeyboardShortcuts', {
        description: matchingShortcut.description
      });

      matchingShortcut.handler();
    }
  }, [enabled, preventInInput]);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  return {
    shortcuts: shortcutsRef.current
  };
}

// Common shortcut combinations
export const KeyboardKeys = {
  ESCAPE: 'Escape',
  ENTER: 'Enter',
  SPACE: ' ',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
  F1: 'F1',
  F2: 'F2',
  F3: 'F3',
  F4: 'F4',
  F5: 'F5',
  F6: 'F6',
  F7: 'F7',
  F8: 'F8',
  F9: 'F9',
  F10: 'F10',
  F11: 'F11',
  F12: 'F12',
  DELETE: 'Delete',
  BACKSPACE: 'Backspace',
  A: 'a',
  B: 'b',
  C: 'c',
  D: 'd',
  E: 'e',
  F: 'f',
  G: 'g',
  H: 'h',
  I: 'i',
  J: 'j',
  K: 'k',
  L: 'l',
  M: 'm',
  N: 'n',
  O: 'o',
  P: 'p',
  Q: 'q',
  R: 'r',
  S: 's',
  T: 't',
  U: 'u',
  V: 'v',
  W: 'w',
  X: 'x',
  Y: 'y',
  Z: 'z',
  PLUS: '+',
  MINUS: '-',
  SLASH: '/',
  ASTERISK: '*',
  EQUALS: '=',
  COMMA: ',',
  PERIOD: '.',
  NUMBER_0: '0',
  NUMBER_1: '1',
  NUMBER_2: '2',
  NUMBER_3: '3',
  NUMBER_4: '4',
  NUMBER_5: '5',
  NUMBER_6: '6',
  NUMBER_7: '7',
  NUMBER_8: '8',
  NUMBER_9: '9'
} as const;