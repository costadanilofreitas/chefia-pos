import { memo, useState } from 'react';
import { HelpCircle, X, ShoppingCart, CreditCard, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TouchButton } from './TouchButton';
import { Text } from './Text';

interface HelpButtonProps {
  className?: string;
}

/**
 * Floating help button with tutorial modal
 */
export const HelpButton = memo<HelpButtonProps>(({ className = '' }) => {
  const [showHelp, setShowHelp] = useState(false);

  const helpSteps = [
    {
      icon: <ShoppingCart className="w-12 h-12" />,
      title: 'Escolha seus produtos',
      description: 'Navegue pelas categorias ou use a busca para encontrar o que deseja'
    },
    {
      icon: <ShoppingCart className="w-12 h-12" />,
      title: 'Adicione ao carrinho',
      description: 'Toque no botão "Adicionar" em cada produto desejado'
    },
    {
      icon: <CreditCard className="w-12 h-12" />,
      title: 'Finalize o pedido',
      description: 'Clique no carrinho, revise seu pedido e escolha a forma de pagamento'
    },
    {
      icon: <Clock className="w-12 h-12" />,
      title: 'Aguarde a preparação',
      description: 'Pegue seu comprovante e aguarde ser chamado no painel'
    }
  ];

  return (
    <>
      {/* Floating Help Button */}
      <motion.div
        className={`fixed bottom-8 left-8 z-40 ${className}`}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 2, duration: 0.3 }}
      >
        <TouchButton
          onClick={() => setShowHelp(true)}
          variant="primary"
          className="rounded-full w-16 h-16 p-0 shadow-xl flex items-center justify-center"
          hapticPattern="light"
        >
          <HelpCircle className="w-8 h-8" />
        </TouchButton>
        
        {/* Pulse animation for attention */}
        <motion.div
          className="absolute inset-0 rounded-full bg-primary-400 opacity-75 pointer-events-none"
          animate={{
            scale: [1, 1.5, 1.5],
            opacity: [0.7, 0, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 3
          }}
        />
      </motion.div>

      {/* Help Modal */}
      <AnimatePresence>
        {showHelp && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/50 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHelp(false)}
            />

            {/* Modal Content */}
            <motion.div
              className="fixed inset-x-8 top-1/2 -translate-y-1/2 max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-50 p-8 max-h-[80vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <Text variant="h2" className="text-gray-900 dark:text-white">
                  Como fazer seu pedido
                </Text>
                <TouchButton
                  onClick={() => setShowHelp(false)}
                  variant="ghost"
                  className="rounded-full w-12 h-12 p-0"
                >
                  <X className="w-6 h-6" />
                </TouchButton>
              </div>

              {/* Steps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {helpSteps.map((step, index) => (
                  <motion.div
                    key={index}
                    className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="flex-shrink-0 w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-400">
                      <span className="text-2xl font-bold">{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <Text variant="h4" className="mb-2 text-gray-900 dark:text-white">
                        {step.title}
                      </Text>
                      <Text variant="body" className="text-gray-600 dark:text-gray-300">
                        {step.description}
                      </Text>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Tips */}
              <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <Text variant="h4" className="text-blue-800 dark:text-blue-200 mb-3">
                  💡 Dicas úteis:
                </Text>
                <ul className="space-y-2 text-blue-700 dark:text-blue-300">
                  <li>• Você pode personalizar seus produtos tocando em &quot;Personalizar&quot;</li>
                  <li>• Use o botão de busca 🔍 para encontrar produtos específicos</li>
                  <li>• Produtos em destaque aparecem com a estrela ⭐</li>
                  <li>• O tempo de preparo aparece em cada produto</li>
                </ul>
              </div>

              {/* Close Button */}
              <div className="mt-8 text-center">
                <TouchButton
                  onClick={() => setShowHelp(false)}
                  variant="primary"
                  size="large"
                  className="px-12"
                >
                  Entendi!
                </TouchButton>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
});