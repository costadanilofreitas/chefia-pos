import { memo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Printer, Clock } from 'lucide-react';
import { Text } from './Text';
import { TouchButton } from './TouchButton';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';

interface OrderConfirmationProps {
  orderNumber: string;
  estimatedTime?: number; // in minutes
  onNewOrder: () => void;
  autoCloseDelay?: number; // in milliseconds
}

/**
 * Order confirmation screen with success feedback
 */
export const OrderConfirmation = memo<OrderConfirmationProps>(({
  orderNumber,
  estimatedTime = 15,
  onNewOrder,
  autoCloseDelay = 10000 // 10 seconds
}) => {
  const haptic = useHapticFeedback();

  useEffect(() => {
    // Success haptic feedback
    haptic.success();

    // Auto close after delay
    const timer = setTimeout(() => {
      onNewOrder();
    }, autoCloseDelay);

    return () => clearTimeout(timer);
  }, [autoCloseDelay, onNewOrder, haptic]);

  return (
    <motion.div 
      className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-800 dark:to-gray-900 flex flex-col items-center justify-center p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Success Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ 
          delay: 0.2,
          type: "spring",
          stiffness: 200,
          damping: 10
        }}
        className="mb-8"
      >
        <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center">
          <CheckCircle className="w-20 h-20 text-white" />
        </div>
      </motion.div>

      {/* Success Message */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="text-center mb-8"
      >
        <Text variant="h1" className="text-green-600 dark:text-green-400 mb-4 text-5xl">
          Pedido Confirmado!
        </Text>
        <Text variant="h2" className="text-gray-700 dark:text-gray-300 mb-2">
          Seu pedido foi recebido com sucesso
        </Text>
      </motion.div>

      {/* Order Number */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-8"
      >
        <Text variant="body" className="text-gray-600 dark:text-gray-400 text-center mb-2">
          Número do Pedido
        </Text>
        <Text variant="h1" className="text-6xl font-bold text-center text-primary-600 dark:text-primary-400">
          #{orderNumber}
        </Text>
      </motion.div>

      {/* Estimated Time */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.5 }}
        className="flex items-center gap-4 mb-8"
      >
        <Clock className="w-8 h-8 text-gray-600 dark:text-gray-400" />
        <Text variant="h3" className="text-gray-700 dark:text-gray-300">
          Tempo estimado: {estimatedTime} minutos
        </Text>
      </motion.div>

      {/* Instructions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.5 }}
        className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-8 max-w-2xl"
      >
        <div className="flex items-start gap-4">
          <Printer className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
          <div>
            <Text variant="body" className="text-blue-800 dark:text-blue-200 font-semibold mb-2">
              Próximos passos:
            </Text>
            <ul className="text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Aguarde seu comprovante ser impresso</li>
              <li>• Dirija-se ao balcão de retirada</li>
              <li>• Apresente o número do seu pedido</li>
              <li>• Aguarde ser chamado pelo painel</li>
            </ul>
          </div>
        </div>
      </motion.div>

      {/* New Order Button */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.3, duration: 0.5 }}
      >
        <TouchButton
          onClick={onNewOrder}
          size="large"
          variant="primary"
          className="px-12 py-6 text-xl"
        >
          Fazer Novo Pedido
        </TouchButton>
      </motion.div>

      {/* Auto close countdown */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.5 }}
        className="mt-8"
      >
        <Text variant="small" className="text-gray-500 dark:text-gray-400">
          Retornando ao início em {Math.round(autoCloseDelay / 1000)} segundos...
        </Text>
      </motion.div>
    </motion.div>
  );
});