import { memo } from 'react';
import { TouchButton } from '../ui/TouchButton';
import { Text } from '../ui/Text';

interface SessionTimeoutModalProps {
  isWarning: boolean;
  timeRemaining: number;
  onExtend: () => void;
  onEnd: () => void;
  className?: string;
}

/**
 * Session timeout warning modal component
 */
export const SessionTimeoutModal = memo<SessionTimeoutModalProps>(({ 
  isWarning,
  timeRemaining,
  onExtend,
  onEnd,
  className = ''
}) => {
  if (!isWarning) return null;

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md">
        <Text variant="h2" className="mb-4 text-gray-900 dark:text-white">
          Sessão expirando
        </Text>
        <Text variant="body" className="text-gray-600 dark:text-gray-300 mb-6">
          Sua sessão expirará em {formatTime(timeRemaining)}.
          Deseja continuar comprando?
        </Text>
        <div className="flex gap-4">
          <TouchButton
            onClick={onExtend}
            variant="primary"
            size="large"
            className="flex-1"
          >
            Continuar
          </TouchButton>
          <TouchButton
            onClick={onEnd}
            variant="outline"
            size="large"
            className="flex-1"
          >
            Finalizar
          </TouchButton>
        </div>
      </div>
    </div>
  );
});