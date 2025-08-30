import { useEffect, useState, useCallback } from 'react';
import { kioskConfig } from '../config/kiosk.config';
import { offlineStorage } from '../services/offlineStorage';

interface UseFullscreenReturn {
  isFullscreen: boolean;
  enterFullscreen: () => Promise<void>;
  exitFullscreen: () => Promise<void>;
  toggleFullscreen: () => Promise<void>;
}

/**
 * Hook to manage fullscreen mode with keyboard shortcuts
 */
export const useFullscreen = (): UseFullscreenReturn => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Check if fullscreen is supported
  const isSupported = () => {
    return !!(
      document.fullscreenEnabled ||
      (document as any).webkitFullscreenEnabled ||
      (document as any).mozFullScreenEnabled ||
      (document as any).msFullscreenEnabled
    );
  };

  // Enter fullscreen mode
  const enterFullscreen = useCallback(async () => {
    if (!isSupported()) {
      offlineStorage.log('Fullscreen not supported');
      return;
    }

    const element = document.documentElement;

    try {
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if ((element as any).webkitRequestFullscreen) {
        await (element as any).webkitRequestFullscreen();
      } else if ((element as any).mozRequestFullScreen) {
        await (element as any).mozRequestFullScreen();
      } else if ((element as any).msRequestFullscreen) {
        await (element as any).msRequestFullscreen();
      }
      
      offlineStorage.log('Entered fullscreen mode');
    } catch (error) {
      offlineStorage.log('Failed to enter fullscreen', error);
    }
  }, []);

  // Exit fullscreen mode
  const exitFullscreen = useCallback(async () => {
    if (!document.fullscreenElement && 
        !(document as any).webkitFullscreenElement && 
        !(document as any).mozFullScreenElement && 
        !(document as any).msFullscreenElement) {
      return;
    }

    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        await (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      }
      
      offlineStorage.log('Exited fullscreen mode');
    } catch (error) {
      offlineStorage.log('Failed to exit fullscreen', error);
    }
  }, []);

  // Toggle fullscreen mode
  const toggleFullscreen = useCallback(async () => {
    if (isFullscreen) {
      await exitFullscreen();
    } else {
      await enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreenElement = 
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement;
      
      setIsFullscreen(!!fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Setup keyboard shortcut
  useEffect(() => {
    if (!kioskConfig.features.enableFullscreen) return;

    const shortcut = kioskConfig.features.fullscreenShortcut;
    
    const handleKeyPress = (e: KeyboardEvent) => {
      // Default F11 behavior
      if (shortcut === 'F11' && e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
      // Custom shortcuts like Ctrl+Shift+F
      else if (shortcut.includes('+')) {
        const parts = shortcut.toLowerCase().split('+');
        const ctrl = parts.includes('ctrl');
        const shift = parts.includes('shift');
        const alt = parts.includes('alt');
        const key = parts[parts.length - 1];
        
        if (
          key &&
          (!ctrl || e.ctrlKey) &&
          (!shift || e.shiftKey) &&
          (!alt || e.altKey) &&
          e.key.toLowerCase() === key.toLowerCase()
        ) {
          e.preventDefault();
          toggleFullscreen();
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [toggleFullscreen]);

  // Auto-enter fullscreen on mount if configured
  useEffect(() => {
    if (kioskConfig.features.enableFullscreen && !isFullscreen) {
      // Delay to avoid browser restrictions
      const timer = setTimeout(() => {
        // Only auto-enter if user has interacted with the page
        if (document.hasFocus()) {
          enterFullscreen();
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  return {
    isFullscreen,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
  };
};