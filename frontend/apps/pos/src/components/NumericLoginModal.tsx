import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import '../index.css';
import NumericKeypad from './NumericKeypad';

interface NumericLoginModalProps {
  open: boolean;
  onClose: () => void;
  onLogin: (__operatorId: string, __password: string) => Promise<void>;
  title?: string;
}

const NumericLoginModal: React.FC<NumericLoginModalProps> = ({ 
  open, 
  onClose, 
  onLogin,
  title = 'Login do Operador'
}) => {
  const [operatorId, setOperatorId] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'operator' | 'password'>('operator');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const modalRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      // Reset when closed
      setOperatorId('');
      setPassword('');
      setMode('operator');
      setError('');
      setLoading(false);
    } else {
      // Focus trap when opened
      modalRef.current?.focus();
    }
  }, [open]);

  // Global keyboard handler for ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (open && e.key === 'Escape' && !loading) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, loading, onClose]);

  const handleNumberClick = (num: string) => {
    if (mode === 'operator') {
      if (operatorId.length < 10) {
        const newId = operatorId + num;
        setOperatorId(newId);
        
        // Auto-avançar para senha quando ID tiver 3 dígitos
        if (newId.length >= 3) {
          setTimeout(() => setMode('password'), 100);
        }
      }
    } else {
      // Limitar senha a 6 dígitos
      const newPassword = password + num;
      setPassword(newPassword);
      
      // Auto-login após 6 dígitos
      if (newPassword.length === 6) {
        setTimeout(async () => {
          setLoading(true);
          try {
            await onLogin(operatorId, newPassword);
            onClose();
          } catch (err) {
            setError((err instanceof Error ? err.message : 'Erro ao fazer login'));
            setLoading(false);
          }
        }, 100);
      }
    }
  };

  const handleClear = () => {
    if (mode === 'operator') {
      setOperatorId('');
    } else {
      setPassword('');
    }
    setError('');
  };

  const handleBackspace = () => {
    if (mode === 'operator') {
      setOperatorId(prev => prev.slice(0, -1));
    } else {
      setPassword(prev => prev.slice(0, -1));
    }
    setError('');
  };

  const handleEnter = async () => {
    if (mode === 'operator') {
      if (!operatorId) {
        setError('Digite o ID do operador');
        return;
      }
      if (operatorId.length < 3) {
        setError('O ID deve ter pelo menos 3 dígitos');
        return;
      }
      setMode('password');
    } else {
      if (!password) {
        setError('Digite a senha');
        return;
      }
      if (password.length !== 6) {
        setError('A senha deve ter exatamente 6 dígitos');
        return;
      }
      
      setLoading(true);
      try {
        await onLogin(operatorId, password);
        onClose();
      } catch (err) {
        setError((err instanceof Error ? err.message : 'Erro ao fazer login'));
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (mode === 'password') {
      setMode('operator');
      setPassword('');
      setError('');
    } else {
      onClose();
    }
  };

  if (!open) return null;

  let enterText: string;
  if (loading) {
    enterText = 'Autenticando...';
  } else if (mode === 'operator') {
    enterText = 'Próximo';
  } else {
    enterText = 'Entrar';
  }

  const modalContent = (
    <>
      {/* Backdrop transparente clicável */}
      <div 
        className="fixed inset-0 z-50"
        onMouseDown={(e) => {
          // Usar onMouseDown em vez de onClick para melhor controle
          if (e.target === e.currentTarget && !loading) {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }
        }}
      >
        {/* Overlay visual */}
        <div 
          className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
          aria-hidden="true"
          onMouseDown={(e) => {
            // Clicar no overlay também fecha
            if (!loading) {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }
          }}
        />
      
        {/* Modal Container */}
        <div
          className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none"
        >
          {/* Modal Content */}
          <div
            ref={modalRef}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-scale-up pointer-events-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-modal-title"
            aria-describedby="login-modal-desc"
            onMouseDown={(e) => {
              // Prevenir propagação para não fechar ao clicar no modal
              e.stopPropagation();
            }}
          >
        {/* Header */}
        <div 
          className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-t-2xl select-none"
          onMouseDown={(e) => {
            // Prevenir foco ao clicar no header
            e.preventDefault();
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <h2 
              id="login-modal-title" 
              className="text-xl font-bold text-white select-none cursor-default"
              tabIndex={-1}
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              disabled={loading}
              aria-label="Fechar modal"
              type="button"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p 
            id="login-modal-desc" 
            className="text-sm text-blue-100 select-none cursor-default"
            tabIndex={-1}
          >
            {mode === 'operator' ? 'ID do operador (3 dígitos)' : 'Senha numérica (6 dígitos)'}
          </p>
        </div>

        {/* Display */}
        <div 
          className="p-4 border-b border-gray-200 dark:border-gray-700 select-none"
          onMouseDown={(e) => {
            // Prevenir foco ao clicar na área de display
            e.preventDefault();
          }}
        >
          {mode === 'operator' ? (
            <div>
              <label 
                htmlFor="operator-display" 
                className="text-sm text-gray-600 dark:text-gray-400 mb-2 block select-none cursor-default"
                tabIndex={-1}
              >
                ID do Operador
              </label>
              <output
                id="operator-display"
                className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-center select-none cursor-default"
                aria-live="polite"
                aria-label={`ID do operador: ${operatorId.length} de 3 dígitos inseridos`}
                tabIndex={-1}
              >
                <span className="text-2xl font-mono text-gray-900 dark:text-white select-none" aria-hidden="true">
                  {operatorId.length > 0 ? '•'.repeat(operatorId.length).padEnd(3, '○') : '○○○'}
                </span>
              </output>
            </div>
          ) : (
            <div>
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline mb-3"
                type="button"
                aria-label="Voltar para inserir ID do operador"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Voltar para ID
              </button>
              <div className="mb-3">
                <span 
                  className="text-sm text-gray-600 dark:text-gray-400 mb-2 block select-none cursor-default"
                  tabIndex={-1}
                >
                  Operador: <strong>{operatorId}</strong>
                </span>
              </div>
              <div>
                <label 
                  htmlFor="password-display" 
                  className="text-sm text-gray-600 dark:text-gray-400 mb-2 block select-none cursor-default"
                  tabIndex={-1}
                >
                  Senha
                </label>
                <output
                  id="password-display"
                  className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-center select-none cursor-default"
                  aria-live="polite"
                  aria-label={`Senha: ${password.length} de 6 dígitos inseridos`}
                  tabIndex={-1}
                >
                  <span className="text-2xl font-mono text-gray-900 dark:text-white select-none" aria-hidden="true">
                    {password.length > 0 ? '•'.repeat(password.length).padEnd(6, '○') : '○○○○○○'}
                  </span>
                </output>
              </div>
            </div>
          )}
          
          {error && (
            <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Keyboard */}
        <div className="p-4">
          <NumericKeypad
            onNumberClick={handleNumberClick}
            onClear={handleClear}
            onBackspace={handleBackspace}
            onEnter={handleEnter}
            showDecimal={false}
            showEnter={true}
            enterText={enterText}
            enterDisabled={loading || (mode === 'operator' ? !operatorId : !password)}
            disabled={loading}
          />
        </div>
        </div>
      </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
};

export default NumericLoginModal;