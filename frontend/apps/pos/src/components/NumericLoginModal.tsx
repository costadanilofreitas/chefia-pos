import React, { useState, useEffect } from 'react';
import '../index.css';

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

  useEffect(() => {
    if (!open) {
      // Reset when closed
      setOperatorId('');
      setPassword('');
      setMode('operator');
      setError('');
      setLoading(false);
    }
  }, [open]);

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
      if (password.length < 6) {
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
    }
    setError('');
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

  const buttons = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['C', '0', '⌫']
  ];

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none"
      onClick={(e) => {
        // Close modal if clicking outside
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-scale-up select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-t-2xl">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-bold text-white">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              disabled={loading}
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-blue-100">
            {mode === 'operator' ? 'ID do operador (3 dígitos)' : 'Senha numérica (6 dígitos)'}
          </p>
        </div>

        {/* Display */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          {mode === 'operator' ? (
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">
                ID do Operador
              </label>
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-center">
                <span className="text-2xl font-mono text-gray-900 dark:text-white">
                  {operatorId.length > 0 ? '•'.repeat(operatorId.length).padEnd(3, '○') : '○○○'}
                </span>
              </div>
            </div>
          ) : (
            <div>
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline mb-3"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Voltar para ID
              </button>
              <div className="mb-3">
                <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">
                  Operador: <strong>{operatorId}</strong>
                </label>
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">
                  Senha
                </label>
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-center">
                  <span className="text-2xl font-mono text-gray-900 dark:text-white">
                    {password.length > 0 ? '•'.repeat(password.length).padEnd(6, '○') : '○○○○○○'}
                  </span>
                </div>
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
          <div className="grid grid-cols-3 gap-2">
            {buttons.map((row, rowIndex) => (
              row.map((btn, colIndex) => (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  onClick={() => {
                    if (btn === 'C') handleClear();
                    else if (btn === '⌫') handleBackspace();
                    else handleNumberClick(btn);
                  }}
                  disabled={loading}
                  className={`
                    h-14 rounded-xl font-bold text-lg transition-all transform active:scale-95
                    ${btn === 'C' 
                      ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg'
                      : btn === '⌫'
                      ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white shadow-md'
                    }
                    ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {btn}
                </button>
              ))
            ))}
          </div>

          {/* Enter Button */}
          <button
            onClick={handleEnter}
            disabled={loading || (mode === 'operator' ? !operatorId : !password)}
            className={`
              w-full mt-3 h-14 rounded-xl font-bold text-lg text-white transition-all transform active:scale-95
              ${loading 
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600 shadow-lg'
              }
            `}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Autenticando...
              </span>
            ) : mode === 'operator' ? (
              'Próximo'
            ) : (
              'Entrar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NumericLoginModal;