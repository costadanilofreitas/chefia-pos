import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';
import { useAuth } from '../hooks/useAuth';
import { useCashier } from '../hooks/useCashier';
import { formatCurrency } from '../utils/formatters';
import '../index.css';

interface CashMovement {
  id: string;
  type: 'withdrawal' | 'deposit' | 'opening' | 'closing';
  amount: number;
  reason: string;
  performed_by: string;
  performed_by_name: string;
  date: string;
  receipt_printed: boolean;
}

export default function CashWithdrawalPageModern() {
  const navigate = useNavigate();
  const { terminalId } = useParams();
  const { user } = useAuth();
  const { currentCashier, registerWithdrawal } = useCashier();
  
  // State
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Predefined reasons
  const predefinedReasons = [
    'Pagamento de fornecedor',
    'Despesa operacional',
    'Troco para caixa',
    'Depósito bancário',
    'Transferência entre caixas',
    'Outros'
  ];
  
  // Load movements on mount
  useEffect(() => {
    loadMovements();
  }, []);
  
  // Load cash movements
  const loadMovements = useCallback(async () => {
    // Simulate loading movements
    setMovements([
      {
        id: '1',
        type: 'opening',
        amount: 500.00,
        reason: 'Abertura de caixa',
        performed_by: user?.id || '',
        performed_by_name: user?.name || '',
        date: new Date().toISOString(),
        receipt_printed: true
      }
    ]);
  }, [user]);
  
  // Handle withdrawal
  const handleWithdrawal = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('Digite um valor válido');
      return;
    }
    
    if (!reason) {
      alert('Selecione ou digite um motivo');
      return;
    }
    
    if (!currentCashier) {
      alert('Nenhum caixa aberto');
      return;
    }
    
    setLoading(true);
    try {
      await registerWithdrawal(currentCashier.id, {
        operator_id: user?.id || '',
        amount: parseFloat(amount),
        reason,
        notes
      });
      
      // Clear form
      setAmount('');
      setReason('');
      setNotes('');
      setShowConfirmDialog(false);
      
      // Reload movements
      await loadMovements();
      
      alert('Sangria realizada com sucesso!');
    } catch (error) {
      console.error('Error registering withdrawal:', error);
      alert('Erro ao realizar sangria');
    } finally {
      setLoading(false);
    }
  }, [amount, reason, notes, currentCashier, user, registerWithdrawal, loadMovements]);
  
  // Keypad input handler
  const handleKeypadInput = useCallback((key: string) => {
    if (key === 'C') {
      setAmount('');
    } else if (key === '←') {
      setAmount(amount.slice(0, -1));
    } else if (key === '.') {
      if (!amount.includes('.')) {
        setAmount(amount + '.');
      }
    } else {
      setAmount(amount + key);
    }
  }, [amount]);
  
  // Format movement type
  const getMovementTypeInfo = (type: string) => {
    switch (type) {
      case 'withdrawal':
        return { label: 'Sangria', color: 'text-red-600 dark:text-red-400', icon: '💸' };
      case 'deposit':
        return { label: 'Suprimento', color: 'text-green-600 dark:text-green-400', icon: '💰' };
      case 'opening':
        return { label: 'Abertura', color: 'text-blue-600 dark:text-blue-400', icon: '🔓' };
      case 'closing':
        return { label: 'Fechamento', color: 'text-gray-600 dark:text-gray-400', icon: '🔒' };
      default:
        return { label: type, color: 'text-gray-600 dark:text-gray-400', icon: '📝' };
    }
  };
  
  // Format date
  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Keyboard shortcuts
  useHotkeys('f12', () => setShowConfirmDialog(true));
  useHotkeys('escape', () => setShowConfirmDialog(false));
  
  // Check if cashier is open
  if (!currentCashier || currentCashier.status !== 'OPEN') {
    return (
      <div className="flex-1 flex items-center justify-center select-none">
        <div className="text-center">
          <div className="text-6xl mb-4 select-none">🔒</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 select-none">
            Caixa Fechado
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 select-none">
            É necessário abrir o caixa para realizar sangrias
          </p>
          <button
            onClick={() => navigate(`/pos/${terminalId}/cashier`)}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
          >
            Ir para Caixa
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 select-none">
      <div className="max-w-7xl mx-auto w-full p-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3 select-none">
                <span className="text-4xl">💸</span>
                Sangria de Caixa
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2 select-none">
                Registre retiradas de dinheiro do caixa
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400 select-none">Saldo Atual</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 select-none">
                {formatCurrency(currentCashier.current_balance || 0)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Withdrawal Form */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 select-none">
              Nova Sangria
            </h2>
            
            <div className="space-y-4">
              {/* Amount Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 select-none">
                  Valor da Sangria
                </label>
                <input
                  type="text"
                  value={amount ? `R$ ${amount}` : ''}
                  readOnly
                  className="w-full px-4 py-3 text-xl font-bold text-center bg-gray-100 dark:bg-gray-700 rounded-lg dark:text-white"
                  placeholder="R$ 0,00"
                />
                
                {/* Numeric Keypad */}
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.', '←'].map(key => (
                    <button
                      key={key}
                      onClick={() => handleKeypadInput(key)}
                      className="p-3 text-lg font-semibold bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      {key}
                    </button>
                  ))}
                  <button
                    onClick={() => setAmount('')}
                    className="col-span-3 p-3 text-lg font-semibold bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                  >
                    Limpar
                  </button>
                </div>
              </div>
              
              {/* Reason Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 select-none">
                  Motivo da Sangria
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                >
                  <option value="">Selecione um motivo...</option>
                  {predefinedReasons.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              
              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 select-none">
                  Observações (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                  rows={3}
                  placeholder="Digite observações adicionais..."
                />
              </div>
              
              {/* Warning */}
              {amount && parseFloat(amount) > (currentCashier.current_balance || 0) && (
                <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-3">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    ⚠️ Atenção: O valor da sangria é maior que o saldo atual do caixa
                  </p>
                </div>
              )}
              
              {/* Action Button */}
              <button
                onClick={() => setShowConfirmDialog(true)}
                disabled={!amount || parseFloat(amount) <= 0 || !reason || loading}
                className="w-full py-3 px-4 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Realizar Sangria (F12)
              </button>
            </div>
          </div>
          
          {/* Recent Movements */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white select-none">
                Movimentações Recentes
              </h2>
              <button
                onClick={loadMovements}
                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {movements.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 select-none">
                  <p className="select-none">Nenhuma movimentação encontrada</p>
                </div>
              ) : (
                movements.map(movement => {
                  const typeInfo = getMovementTypeInfo(movement.type);
                  return (
                    <div key={movement.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{typeInfo.icon}</span>
                          <div>
                            <p className={`font-medium ${typeInfo.color}`}>
                              {typeInfo.label}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 select-none">
                              {movement.reason}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              Por {movement.performed_by_name} • {formatDate(movement.date)}
                            </p>
                          </div>
                        </div>
                        <p className={`text-lg font-bold ${
                          movement.type === 'withdrawal' 
                            ? 'text-red-600 dark:text-red-400' 
                            : 'text-green-600 dark:text-green-400'
                        }`}>
                          {movement.type === 'withdrawal' ? '-' : '+'}{formatCurrency(movement.amount)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Saldo Inicial</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(currentCashier.initial_balance || 0)}
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Sangrias</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(
                movements
                  .filter(m => m.type === 'withdrawal')
                  .reduce((sum, m) => sum + m.amount, 0)
              )}
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Suprimentos</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(
                movements
                  .filter(m => m.type === 'deposit')
                  .reduce((sum, m) => sum + m.amount, 0)
              )}
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Saldo Atual</p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(currentCashier.current_balance || 0)}
            </p>
          </div>
        </div>
      </div>
      
      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Confirmar Sangria
            </h3>
            
            <div className="space-y-3">
              <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-4">
                <p className="text-sm text-red-700 dark:text-red-300">
                  Você está prestes a retirar dinheiro do caixa. Esta operação não pode ser desfeita.
                </p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Valor:</span>
                  <span className="font-bold text-red-600 dark:text-red-400">
                    -{formatCurrency(parseFloat(amount || '0'))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Motivo:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {reason}
                  </span>
                </div>
                {notes && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Obs:</span>
                    <p className="text-sm text-gray-900 dark:text-white mt-1">
                      {notes}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Saldo Atual:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(currentCashier.current_balance || 0)}
                  </span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-gray-600 dark:text-gray-400">Saldo Após:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency((currentCashier.current_balance || 0) - parseFloat(amount || '0'))}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleWithdrawal}
                disabled={loading}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                {loading ? 'Processando...' : 'Confirmar Sangria'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}