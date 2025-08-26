import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';
import { useAuth } from '../hooks/useAuth';
import { useCashier } from '../hooks/useCashier';
import { useBusinessDay } from '../hooks/useBusinessDay';
import { formatCurrency } from '../utils/formatters';
import NumericLoginModal from '../components/NumericLoginModal';
import Toast, { useToast } from '../components/Toast';
import logger, { LogSource } from '../services/LocalLoggerService';
import '../index.css';

interface CashierSummary {
  sales_count: number;
  sales_total: number;
  cash_total: number;
  card_total: number;
  pix_total: number;
  withdrawals_total: number;
  deposits_total: number;
}

interface SummaryData {
  sales?: number;
  withdrawals?: number;
  deposits?: number;
}

export default function CashierOpeningClosingPage() {
  const navigate = useNavigate();
  const { terminalId } = useParams();
  const { user, isAuthenticated, login } = useAuth();
  const { toasts, removeToast, success, error } = useToast();
  const { 
    currentCashier, 
    loading,
    openCashier,
    closeCashier,
    checkTerminalStatus,
    getSummary
  } = useCashier();
  const { currentBusinessDay } = useBusinessDay();

  // State
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [openingAmount, setOpeningAmount] = useState('');
  const [closingAmount, setClosingAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [summary, setSummary] = useState<CashierSummary | null>(null);

  // Check terminal status on mount
  useEffect(() => {
    if (terminalId && isAuthenticated) {
      logger.debug('Verificando status do terminal no mount', { terminalId }, 'CashierOpeningClosing', LogSource.POS);
      checkTerminalStatus(terminalId).catch((error) => {
        logger.error('Erro ao verificar status do terminal', { terminalId, error }, 'CashierOpeningClosing', LogSource.POS);
      });
    }
  }, [terminalId, isAuthenticated, checkTerminalStatus]);

  // Load summary when cashier is open
  useEffect(() => {
    if (currentCashier?.status === 'OPEN') {
      loadSummary();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCashier]);

  // Load cashier summary
  const loadSummary = useCallback(async () => {
    if (!currentCashier) return;
    
    try {
      await logger.debug('Carregando resumo do caixa', { cashierId: currentCashier.id }, 'CashierOpeningClosing', LogSource.POS);
      const data = await getSummary() as SummaryData | undefined;
      if (data) {
        setSummary({
          sales_count: 0,
          sales_total: data.sales || 0,
          cash_total: data.sales || 0,
          card_total: 0,
          pix_total: 0,
          withdrawals_total: data.withdrawals || 0,
          deposits_total: data.deposits || 0
        });
        await logger.debug('Resumo do caixa carregado', { data }, 'CashierOpeningClosing', LogSource.POS);
      }
    } catch (error) {
      await logger.error('Erro ao carregar resumo do caixa', { error }, 'CashierOpeningClosing', LogSource.POS);
    }
  }, [currentCashier, getSummary]);

  // Handle opening cashier
  const handleOpenCashier = useCallback(async () => {
    if (!terminalId || !user) return;

    try {
      const openingData = {
        terminal_id: terminalId,
        opening_balance: parseFloat(openingAmount) || 0,
        operator_id: user.id || user.username,
        business_day_id: currentBusinessDay?.id || '',
        notes
      };
      
      await logger.info('Iniciando abertura de caixa', openingData, 'CashierOpeningClosing', LogSource.POS);
      
      await openCashier(openingData);
      
      setShowOpenDialog(false);
      setOpeningAmount('');
      setNotes('');
      success('Caixa aberto com sucesso!');
      
      await logger.info('Caixa aberto com sucesso', { terminalId, operatorId: user.id }, 'CashierOpeningClosing', LogSource.POS);
      
      // Navigate to main POS
      navigate(`/pos/${terminalId}/main`);
    } catch (err) {
      await logger.error('Erro ao abrir o caixa', { terminalId, error: err }, 'CashierOpeningClosing', LogSource.POS);
      error('Erro ao abrir o caixa');
    }
  }, [terminalId, user, openingAmount, notes, currentBusinessDay?.id, openCashier, navigate, success, error]);

  // Handle closing cashier
  const handleCloseCashier = useCallback(async () => {
    if (!currentCashier) return;

    try {
      const closingData = {
        cashierId: currentCashier.id,
        closingAmount: parseFloat(closingAmount) || 0,
        notes
      };
      
      await logger.info('Iniciando fechamento de caixa', closingData, 'CashierOpeningClosing', LogSource.POS);
      
      await closeCashier(parseFloat(closingAmount) || 0, notes);
      
      setShowCloseDialog(false);
      setClosingAmount('');
      setNotes('');
      
      await logger.info('Caixa fechado com sucesso', { cashierId: currentCashier.id }, 'CashierOpeningClosing', LogSource.POS);
      
      // Refresh status
      if (terminalId) {
        await checkTerminalStatus(terminalId);
      }
    } catch (err) {
      await logger.error('Erro ao fechar o caixa', { cashierId: currentCashier.id, error: err }, 'CashierOpeningClosing', LogSource.POS);
      error('Erro ao fechar o caixa');
    }
  }, [currentCashier, terminalId, closingAmount, notes, closeCashier, checkTerminalStatus, error]);

  // Keypad input handler
  const handleKeypadInput = useCallback((key: string, target: 'opening' | 'closing') => {
    const setter = target === 'opening' ? setOpeningAmount : setClosingAmount;
    const current = target === 'opening' ? openingAmount : closingAmount;
    
    if (key === 'C') {
      setter('');
    } else if (key === '←') {
      setter(current.slice(0, -1));
    } else if (key === '.') {
      if (!current.includes('.')) {
        setter(current + '.');
      }
    } else {
      setter(current + key);
    }
  }, [openingAmount, closingAmount]);

  // Calculate expected closing amount
  const expectedClosingAmount = useMemo(() => {
    if (!currentCashier || !summary) return 0;
    
    const opening = currentCashier.initial_balance || 0;
    const cashSales = summary.cash_total || 0;
    const withdrawals = summary.withdrawals_total || 0;
    const deposits = summary.deposits_total || 0;
    
    return opening + cashSales - withdrawals + deposits;
  }, [currentCashier, summary]);

  // Format time
  const formatTime = (date: string | Date) => {
    return new Date(date).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Keyboard shortcuts
  useHotkeys('f2', () => setShowOpenDialog(true));
  useHotkeys('f10', () => setShowCloseDialog(true));
  useHotkeys('escape', () => {
    setShowOpenDialog(false);
    setShowCloseDialog(false);
  });

  // Render main content based on cashier status
  const renderMainContent = () => {
    if (!isAuthenticated) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Faça login para continuar
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Você precisa estar autenticado para gerenciar o caixa
            </p>
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              Fazer Login
            </button>
          </div>
        </div>
      );
    }

    if (!currentBusinessDay || currentBusinessDay.status !== 'OPEN') {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">📅</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Dia Operacional Fechado
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              O dia operacional precisa estar aberto para gerenciar o caixa
            </p>
            <button
              onClick={() => navigate(`/pos/${terminalId}/business-day`)}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              Gerenciar Dia Operacional
            </button>
          </div>
        </div>
      );
    }

    if (currentCashier?.status === 'OPEN') {
      return (
        <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full p-6">
          {/* Cashier Status Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Caixa Aberto
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Terminal {terminalId} • {user?.name || user?.username}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Aberto às {formatTime(currentCashier.opened_at)}
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(currentCashier.initial_balance || 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Summary Grid */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Vendas</span>
                  <span className="text-2xl">🛒</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summary.sales_count}
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  {formatCurrency(summary.sales_total)}
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Dinheiro</span>
                  <span className="text-2xl">💵</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(summary.cash_total)}
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Cartão</span>
                  <span className="text-2xl">💳</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(summary.card_total)}
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 dark:text-gray-400">PIX</span>
                  <span className="text-2xl">📱</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(summary.pix_total)}
                </p>
              </div>
            </div>
          )}

          {/* Expected Closing */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Resumo do Caixa
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-700 dark:text-gray-300">Abertura:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(currentCashier.initial_balance || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 dark:text-gray-300">Vendas em Dinheiro:</span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  +{formatCurrency(summary?.cash_total || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 dark:text-gray-300">Sangrias:</span>
                <span className="font-medium text-red-600 dark:text-red-400">
                  -{formatCurrency(summary?.withdrawals_total || 0)}
                </span>
              </div>
              <div className="border-t dark:border-gray-600 pt-2 mt-2">
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-gray-900 dark:text-white">Esperado no Caixa:</span>
                  <span className="text-blue-600 dark:text-blue-400">
                    {formatCurrency(expectedClosingAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
            <button
              onClick={() => {
                logger.info('Navegando para tela de vendas', { terminalId }, 'CashierOpeningClosing', LogSource.UI);
                navigate(`/pos/${terminalId}/main`);
              }}
              className="py-3 lg:py-4 px-4 lg:px-6 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-xl lg:text-2xl">🏪</span>
              <span className="text-sm lg:text-base">Ir para Vendas</span>
            </button>
            
            <button
              onClick={() => {
                logger.info('Navegando para tela de sangria', { terminalId }, 'CashierOpeningClosing', LogSource.UI);
                navigate(`/pos/${terminalId}/cash-withdrawal`);
              }}
              className="py-3 lg:py-4 px-4 lg:px-6 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-xl lg:text-2xl">💸</span>
              <span className="text-sm lg:text-base">Realizar Sangria</span>
            </button>
            
            <button
              onClick={() => {
                logger.info('Abrindo diálogo de fechamento de caixa', { cashierId: currentCashier?.id }, 'CashierOpeningClosing', LogSource.UI);
                setShowCloseDialog(true);
              }}
              className="py-3 lg:py-4 px-4 lg:px-6 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-xl lg:text-2xl">🔒</span>
              <span className="text-sm lg:text-base">Fechar Caixa (F10)</span>
            </button>
          </div>
        </div>
      );
    }

    // Cashier closed - show open option
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">💰</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Caixa Fechado
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Terminal {terminalId} está pronto para abertura
          </p>
          <button
            onClick={() => {
              logger.info('Abrindo diálogo de abertura de caixa', { terminalId }, 'CashierOpeningClosing', LogSource.UI);
              setShowOpenDialog(true);
            }}
            className="px-8 py-4 bg-green-500 text-white rounded-lg font-bold text-lg hover:bg-green-600 transition-colors"
          >
            Abrir Caixa (F2)
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 select-none">
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
          </div>
        </div>
      ) : (
        renderMainContent()
      )}

      {/* Open Cashier Dialog */}
      {showOpenDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Abrir Caixa
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Valor de Abertura
                </label>
                <input
                  type="text"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  className="w-full px-4 py-3 text-xl font-bold text-center bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                  placeholder="0.00"
                />
                
                {/* Numeric Keypad */}
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.', '←'].map(key => (
                    <button
                      key={key}
                      onClick={() => handleKeypadInput(key, 'opening')}
                      className="p-3 text-lg font-semibold bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Observações (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                  rows={3}
                  placeholder="Digite observações..."
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowOpenDialog(false);
                  setOpeningAmount('');
                  setNotes('');
                }}
                className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleOpenCashier}
                disabled={loading}
                className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
              >
                Confirmar Abertura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Cashier Dialog */}
      {showCloseDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Fechar Caixa
            </h3>
            
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Valor esperado no caixa:
                </p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {formatCurrency(expectedClosingAmount)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Valor Contado
                </label>
                <input
                  type="text"
                  value={closingAmount}
                  onChange={(e) => setClosingAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  className="w-full px-4 py-3 text-xl font-bold text-center bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                  placeholder="0.00"
                />
                
                {/* Numeric Keypad */}
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.', '←'].map(key => (
                    <button
                      key={key}
                      onClick={() => handleKeypadInput(key, 'closing')}
                      className="p-3 text-lg font-semibold bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>

              {/* Show difference if any */}
              {closingAmount && parseFloat(closingAmount) !== expectedClosingAmount && (
                <div className={`rounded-lg p-3 ${
                  parseFloat(closingAmount) > expectedClosingAmount 
                    ? 'bg-green-50 dark:bg-green-900/30' 
                    : 'bg-red-50 dark:bg-red-900/30'
                }`}>
                  <p className={`text-sm ${
                    parseFloat(closingAmount) > expectedClosingAmount
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-red-700 dark:text-red-300'
                  }`}>
                    Diferença: {formatCurrency(parseFloat(closingAmount) - expectedClosingAmount)}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Observações (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                  rows={3}
                  placeholder="Digite observações sobre a diferença..."
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowCloseDialog(false);
                  setClosingAmount('');
                  setNotes('');
                }}
                className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleCloseCashier}
                disabled={loading || !closingAmount}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                Confirmar Fechamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      <NumericLoginModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={async (operatorId: string, password: string) => {
          try {
            await logger.info('Tentativa de login', { operatorId }, 'CashierOpeningClosing', LogSource.SECURITY);
            await login({ operator_id: operatorId, password });
            setShowLoginModal(false);
            success('Login realizado com sucesso!');
            await logger.info('Login realizado com sucesso', { operatorId }, 'CashierOpeningClosing', LogSource.SECURITY);
            
            // Refresh terminal status after login with a small delay
            setTimeout(() => {
              if (terminalId) {
                checkTerminalStatus(terminalId).catch((error) => {
                  logger.error('Erro ao verificar status após login', { terminalId, error }, 'CashierOpeningClosing', LogSource.POS);
                });
              }
            }, 100);
          } catch (err) {
            await logger.error('Erro no login', { operatorId, error: err }, 'CashierOpeningClosing', LogSource.SECURITY);
            throw err; // Re-throw para o NumericLoginModal tratar
          }
        }}
      />

      {/* Toast Messages */}
      <Toast messages={toasts} onRemove={removeToast} />
    </div>
  );
}