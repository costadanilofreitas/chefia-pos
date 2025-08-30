/**
 * Hook for haptic feedback on touch devices
 * Provides vibration feedback for better UX
 */

import { useCallback, useEffect, useRef } from 'react';
import { offlineStorage } from '../services/offlineStorage';

interface HapticPattern {
  light: number | number[];
  medium: number | number[];
  heavy: number | number[];
  success: number | number[];
  warning: number | number[];
  error: number | number[];
}

const HAPTIC_PATTERNS: HapticPattern = {
  light: 10,
  medium: 20,
  heavy: 30,
  success: [10, 50, 10],
  warning: [20, 100, 20],
  error: [50, 100, 50, 100, 50]
};

interface UseHapticFeedbackOptions {
  enabled?: boolean;
  pattern?: keyof HapticPattern;
  intensity?: number;
}

export function useHapticFeedback(options: UseHapticFeedbackOptions = {}) {
  const {
    enabled = true,
    pattern = 'light',
    intensity = 1
  } = options;

  const isSupported = useRef<boolean>(false);

  useEffect(() => {
    // Check if Vibration API is supported
    isSupported.current = 'vibrate' in navigator;
    
    if (isSupported.current) {
      offlineStorage.log('Haptic feedback supported');
    }
  }, []);

  /**
   * Trigger haptic feedback
   */
  const trigger = useCallback((customPattern?: keyof HapticPattern | number | number[]) => {
    if (!enabled || !isSupported.current) {
      return;
    }

    try {
      let vibrationPattern: number | number[];
      
      if (typeof customPattern === 'string') {
        vibrationPattern = HAPTIC_PATTERNS[customPattern];
      } else if (customPattern !== undefined) {
        vibrationPattern = customPattern;
      } else {
        vibrationPattern = HAPTIC_PATTERNS[pattern];
      }

      // Apply intensity multiplier
      if (Array.isArray(vibrationPattern)) {
        vibrationPattern = vibrationPattern.map(v => Math.round(v * intensity));
      } else {
        vibrationPattern = Math.round(vibrationPattern * intensity);
      }

      navigator.vibrate(vibrationPattern);
    } catch (error) {
      offlineStorage.log('Haptic feedback error', error);
    }
  }, [enabled, pattern, intensity]);

  /**
   * Stop any ongoing vibration
   */
  const stop = useCallback(() => {
    if (isSupported.current) {
      navigator.vibrate(0);
    }
  }, []);

  /**
   * Preset feedback functions
   */
  const feedback = {
    light: () => trigger('light'),
    medium: () => trigger('medium'),
    heavy: () => trigger('heavy'),
    success: () => trigger('success'),
    warning: () => trigger('warning'),
    error: () => trigger('error'),
    custom: trigger,
    stop
  };

  return feedback;
}