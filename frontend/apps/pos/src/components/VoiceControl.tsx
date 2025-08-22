import React, { useState, useEffect } from 'react';
import { useVoiceCommands, posVoiceCommands } from '../hooks/useVoiceCommands';
import { cn } from '../utils/cn';

interface VoiceControlProps {
  onCommand?: (command: string, transcript: string) => void;
  className?: string;
}

const VoiceControl: React.FC<VoiceControlProps> = ({ onCommand, className }) => {
  const [showHelp, setShowHelp] = useState(false);
  const [lastCommand, setLastCommand] = useState<string>('');

  // Define voice commands
  const commands = [
    // Navigation commands
    {
      phrases: ['abrir pedidos', 'mostrar pedidos', 'ir para pedidos'],
      action: (transcript: string) => {
        setLastCommand('Navegando para pedidos...');
        onCommand?.('navigate:orders', transcript);
      }
    },
    {
      phrases: ['abrir produtos', 'mostrar produtos', 'catálogo'],
      action: (transcript: string) => {
        setLastCommand('Abrindo catálogo de produtos...');
        onCommand?.('navigate:products', transcript);
      }
    },
    {
      phrases: ['abrir caixa', 'mostrar caixa', 'ir para caixa'],
      action: (transcript: string) => {
        setLastCommand('Abrindo caixa...');
        onCommand?.('navigate:cashier', transcript);
      }
    },
    
    // Order commands
    {
      phrases: ['novo pedido', 'criar pedido', 'começar pedido'],
      action: (transcript: string) => {
        setLastCommand('Criando novo pedido...');
        onCommand?.('order:new', transcript);
      }
    },
    {
      phrases: ['adicionar produto', 'mais um', 'adicionar item'],
      action: (transcript: string) => {
        setLastCommand('Adicionar produto...');
        onCommand?.('order:add', transcript);
      }
    },
    {
      phrases: ['remover produto', 'tirar', 'remover item'],
      action: (transcript: string) => {
        setLastCommand('Remover produto...');
        onCommand?.('order:remove', transcript);
      }
    },
    {
      phrases: ['finalizar pedido', 'fechar pedido', 'concluir pedido'],
      action: (transcript: string) => {
        setLastCommand('Finalizando pedido...');
        onCommand?.('order:finish', transcript);
      }
    },
    
    // Payment commands
    {
      phrases: ['pagar', 'pagamento', 'ir para pagamento'],
      action: (transcript: string) => {
        setLastCommand('Indo para pagamento...');
        onCommand?.('payment:start', transcript);
      }
    },
    {
      phrases: ['pagar em dinheiro', 'dinheiro', 'pagamento dinheiro'],
      action: (transcript: string) => {
        setLastCommand('Pagamento em dinheiro...');
        onCommand?.('payment:cash', transcript);
      }
    },
    {
      phrases: ['pagar com cartão', 'cartão', 'débito', 'crédito'],
      action: (transcript: string) => {
        setLastCommand('Pagamento com cartão...');
        onCommand?.('payment:card', transcript);
      }
    },
    {
      phrases: ['pagar com pix', 'pix'],
      action: (transcript: string) => {
        setLastCommand('Pagamento via PIX...');
        onCommand?.('payment:pix', transcript);
      }
    },
    
    // Search commands
    {
      phrases: ['buscar', 'procurar', 'pesquisar'],
      action: (transcript: string) => {
        setLastCommand('Ativando busca...');
        onCommand?.('search:activate', transcript);
      }
    },
    {
      phrases: ['limpar busca', 'limpar pesquisa'],
      action: (transcript: string) => {
        setLastCommand('Limpando busca...');
        onCommand?.('search:clear', transcript);
      }
    },
    
    // Help command
    {
      phrases: ['ajuda', 'comandos', 'o que posso dizer', 'help'],
      action: () => {
        setShowHelp(true);
        setLastCommand('Mostrando comandos disponíveis...');
      }
    }
  ];

  const {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    toggleListening,
    startListening,
    stopListening
  } = useVoiceCommands(commands, {
    language: 'pt-BR',
    continuous: false,
    interimResults: true,
    onError: (error) => {
      if (error === 'not-allowed') {
        setLastCommand('⚠️ Permissão do microfone negada');
      } else if (error === 'no-speech') {
        setLastCommand('Nenhuma fala detectada');
      }
    }
  });

  // Clear last command after 3 seconds
  useEffect(() => {
    if (lastCommand) {
      const timer = setTimeout(() => setLastCommand(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [lastCommand]);

  if (!isSupported) {
    return (
      <div className={cn('text-sm text-gray-500', className)}>
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Comandos de voz não suportados neste navegador
        </span>
      </div>
    );
  }

  return (
    <>
      {/* Voice Control Button */}
      <div className={cn('relative', className)}>
        <button
          onClick={toggleListening}
          className={cn(
            'p-3 rounded-lg transition-all duration-200',
            isListening 
              ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
              : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
          )}
          aria-label={isListening ? 'Parar reconhecimento de voz' : 'Iniciar reconhecimento de voz'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </button>

        {/* Status Indicator */}
        {isListening && (
          <div className="absolute -top-1 -right-1">
            <span className="flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          </div>
        )}

        {/* Transcript Display */}
        {(transcript || interimTranscript || lastCommand) && (
          <div className="absolute top-full mt-2 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 min-w-[200px] max-w-[300px] z-50">
            {lastCommand && (
              <div className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">
                ✓ {lastCommand}
              </div>
            )}
            {(transcript || interimTranscript) && (
              <div className="text-sm text-gray-700 dark:text-gray-300">
                {interimTranscript && (
                  <span className="text-gray-400 italic">{interimTranscript}</span>
                )}
                {transcript && !interimTranscript && (
                  <span>"{transcript}"</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Help Dialog */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold">Comandos de Voz Disponíveis</h2>
                <button
                  onClick={() => setShowHelp(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Navigation Commands */}
                <div>
                  <h3 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">📍 Navegação</h3>
                  <div className="space-y-1">
                    {posVoiceCommands.navigation.map((cmd, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="text-gray-400">•</span>
                        <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          "{cmd.phrases[0]}"
                        </span>
                        <span className="text-gray-500">→ {cmd.description}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Commands */}
                <div>
                  <h3 className="font-semibold text-green-600 dark:text-green-400 mb-2">🛒 Pedidos</h3>
                  <div className="space-y-1">
                    {posVoiceCommands.order.map((cmd, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="text-gray-400">•</span>
                        <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          "{cmd.phrases[0]}"
                        </span>
                        <span className="text-gray-500">→ {cmd.description}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Commands */}
                <div>
                  <h3 className="font-semibold text-purple-600 dark:text-purple-400 mb-2">💳 Pagamento</h3>
                  <div className="space-y-1">
                    {posVoiceCommands.payment.map((cmd, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="text-gray-400">•</span>
                        <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          "{cmd.phrases[0]}"
                        </span>
                        <span className="text-gray-500">→ {cmd.description}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Search Commands */}
                <div>
                  <h3 className="font-semibold text-orange-600 dark:text-orange-400 mb-2">🔍 Busca</h3>
                  <div className="space-y-1">
                    {posVoiceCommands.search.map((cmd, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="text-gray-400">•</span>
                        <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          "{cmd.phrases[0]}"
                        </span>
                        <span className="text-gray-500">→ {cmd.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  💡 Dica: Fale claramente e próximo ao microfone. O sistema reconhece variações das frases mostradas.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VoiceControl;