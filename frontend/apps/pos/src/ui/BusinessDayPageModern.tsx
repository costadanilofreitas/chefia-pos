import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';
import { useBusinessDay } from '../hooks/useBusinessDay';
import { useAuth } from '../hooks/useAuth';
import { useCashier } from '../hooks/useCashier';
import { useReport } from '../hooks/useReport';
import { formatCurrency, formatDate } from '../utils/formatters';
import '../index.css';

export default function BusinessDayPageModern() {
  const navigate = useNavigate();
  const { terminalId } = useParams();
  const { user } = useAuth();
  
  const {
    currentBusinessDay,
    loading,
    error,
    openBusinessDay,
    closeBusinessDay,
    refreshCurrentBusinessDay,
    isOpen
  } = useBusinessDay();
  
  // Lazy load useCashier apenas quando necessário
  const cashier = useCashier();
  const { generateReport, printReport, currentReport, loading: loadingReport } = useReport();
  
  // State
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [hasOpenCashiers, setHasOpenCashiers] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [selectedReportType, setSelectedReportType] = useState<string>('');
  const [cashierSummary, setCashierSummary] = useState<any>(null);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  
  // Check for open cashiers
  useEffect(() => {
    setHasOpenCashiers(cashier.currentCashier?.status === 'OPEN');
  }, [cashier.currentCashier]);
  
  // Set initial load to false after first load
  useEffect(() => {
    if (!loading && isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [loading, isInitialLoad]);
  
  // Hook already loads business day on mount, no need to duplicate
  
  // Handle opening business day
  const handleOpenBusinessDay = useCallback(async () => {
    try {
      await openBusinessDay({
        store_id: terminalId || '1',
        date: new Date().toISOString().split('T')[0],
        opened_by: user?.id || user?.username || 'unknown',
        notes
      });
      setShowOpenDialog(false);
      setNotes('');
      await refreshCurrentBusinessDay();
    } catch (error) {
      console.error('Error opening business day:', error);
      alert('Erro ao abrir dia operacional');
    }
  }, [terminalId, user, notes, openBusinessDay, refreshCurrentBusinessDay]);
  
  // Handle closing business day
  const handleCloseBusinessDay = useCallback(async () => {
    if (hasOpenCashiers) {
      alert('Existem caixas abertos. Feche todos os caixas antes de encerrar o dia operacional.');
      return;
    }
    
    try {
      await closeBusinessDay({
        closed_by: user?.id || user?.username || 'unknown',
        notes
      });
      setShowCloseDialog(false);
      setNotes('');
      await refreshCurrentBusinessDay();
    } catch (error) {
      console.error('Error closing business day:', error);
      alert('Erro ao fechar dia operacional');
    }
  }, [hasOpenCashiers, user, notes, closeBusinessDay, refreshCurrentBusinessDay]);
  
  // Format date and time
  const formatDateTime = (date: string | Date) => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Keyboard shortcuts
  useHotkeys('f2', () => !isOpen && setShowOpenDialog(true));
  useHotkeys('f10', () => isOpen && setShowCloseDialog(true));
  useHotkeys('escape', () => {
    setShowOpenDialog(false);
    setShowCloseDialog(false);
  });
  
  // Loading state - only show on initial load
  if (loading && isInitialLoad) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 select-none">
      <div className="max-w-6xl mx-auto w-full p-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400">
                Gerencie a abertura e fechamento do dia de trabalho
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {new Date().toLocaleDateString('pt-BR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
              <p className="text-2xl font-bold mt-1">
                <span className={isOpen ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                  {isOpen ? '🟢 ABERTO' : '🔴 FECHADO'}
                </span>
              </p>
            </div>
          </div>
        </div>
        
        {/* Current Status */}
        {currentBusinessDay && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Status Atual
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Abertura</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatDateTime(currentBusinessDay.opened_at)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Por: {currentBusinessDay.opened_by}
                </p>
              </div>
              
              {currentBusinessDay.closed_at && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Fechamento</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatDateTime(currentBusinessDay.closed_at)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Por: {currentBusinessDay.closed_by}
                  </p>
                </div>
              )}
              
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Caixas Abertos</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {hasOpenCashiers ? '1 caixa aberto' : 'Nenhum caixa aberto'}
                </p>
                {hasOpenCashiers && (
                  <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                    ⚠️ Feche todos os caixas antes de encerrar
                  </p>
                )}
              </div>
            </div>
            
            {currentBusinessDay.notes && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  📝 Observações: {currentBusinessDay.notes}
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {!isOpen ? (
            <>
              <button
                onClick={() => setShowOpenDialog(true)}
                className="bg-green-500 hover:bg-green-600 text-white rounded-xl p-6 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-150"
              >
                <div className="flex flex-col items-center">
                  <span className="text-4xl mb-3">🔓</span>
                  <span className="text-xl font-bold">Abrir Dia</span>
                  <span className="text-sm mt-2 opacity-90">Iniciar operações (F2)</span>
                </div>
              </button>
              
              <button
                onClick={() => setShowReportModal(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl p-6 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-150"
              >
                <div className="flex flex-col items-center">
                  <span className="text-4xl mb-3">📊</span>
                  <span className="text-xl font-bold">Relatórios</span>
                  <span className="text-sm mt-2 opacity-90">Ver histórico</span>
                </div>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate(`/pos/${terminalId}/cashier`)}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl p-6 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-150"
              >
                <div className="flex flex-col items-center">
                  <span className="text-4xl mb-3">💰</span>
                  <span className="text-xl font-bold">Gerenciar Caixa</span>
                  <span className="text-sm mt-2 opacity-90">Abrir/Fechar caixa</span>
                </div>
              </button>
              
              <button
                onClick={() => setShowReportModal(true)}
                className="bg-purple-500 hover:bg-purple-600 text-white rounded-xl p-6 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-150"
              >
                <div className="flex flex-col items-center">
                  <span className="text-4xl mb-3">📈</span>
                  <span className="text-xl font-bold">Resumo do Dia</span>
                  <span className="text-sm mt-2 opacity-90">Ver vendas e relatórios</span>
                </div>
              </button>
              
              <button
                onClick={() => setShowCloseDialog(true)}
                disabled={hasOpenCashiers}
                className={`${
                  hasOpenCashiers 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-red-500 hover:bg-red-600 hover:shadow-xl transform hover:scale-105'
                } text-white rounded-xl p-6 shadow-lg transition-all duration-150`}
              >
                <div className="flex flex-col items-center">
                  <span className="text-4xl mb-3">🔒</span>
                  <span className="text-xl font-bold">Fechar Dia</span>
                  <span className="text-sm mt-2 opacity-90">
                    {hasOpenCashiers ? 'Feche os caixas primeiro' : 'Encerrar operações (F10)'}
                  </span>
                </div>
              </button>
            </>
          )}
        </div>
        
        {/* Quick Stats */}
        {isOpen && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Tempo Aberto</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {currentBusinessDay && (() => {
                  const hours = Math.floor((Date.now() - new Date(currentBusinessDay.opened_at).getTime()) / 1000 / 60 / 60);
                  const minutes = Math.floor((Date.now() - new Date(currentBusinessDay.opened_at).getTime()) / 1000 / 60) % 60;
                  return `${hours}h ${minutes}m`;
                })()}
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Vendas do Dia</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(0)}
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Transações</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                0
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Ticket Médio</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(0)}
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Open Dialog */}
      {showOpenDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Abrir Dia Operacional
            </h3>
            
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Você está prestes a abrir o dia operacional. Certifique-se de que tudo está pronto para iniciar as operações.
                </p>
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
                  placeholder="Digite observações sobre a abertura..."
                />
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <p className="text-xs text-gray-600 dark:text-gray-400">Data/Hora:</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatDateTime(new Date())}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Operador:</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {user?.name || user?.username}
                </p>
              </div>
            </div>
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowOpenDialog(false);
                  setNotes('');
                }}
                className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleOpenBusinessDay}
                className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                Confirmar Abertura
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Close Dialog */}
      {showCloseDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Fechar Dia Operacional
            </h3>
            
            <div className="space-y-4">
              {hasOpenCashiers ? (
                <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-4">
                  <p className="text-sm text-red-700 dark:text-red-300">
                    ⚠️ Existem caixas abertos! Feche todos os caixas antes de encerrar o dia operacional.
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-4">
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Ao fechar o dia operacional, não será possível realizar novas vendas até a próxima abertura.
                    </p>
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
                      placeholder="Digite observações sobre o fechamento..."
                    />
                  </div>
                  
                  {/* Day Summary */}
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Resumo do Dia
                    </p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Vendas:</span>
                        <span className="font-medium text-gray-900 dark:text-white">0</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Total:</span>
                        <span className="font-medium text-green-600 dark:text-green-400">
                          {formatCurrency(0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowCloseDialog(false);
                  setNotes('');
                }}
                className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancelar
              </button>
              {!hasOpenCashiers && (
                <button
                  onClick={handleCloseBusinessDay}
                  className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Confirmar Fechamento
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Report Modal */}
      {showReportModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowReportModal(false);
            setSelectedReportType('');
          }}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Central de Relatórios
                </h2>
                <button
                  onClick={() => {
                    setShowReportModal(false);
                    setSelectedReportType('');
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {generatingReport ? (
                /* Loading State */
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Gerando relatório...</p>
                  </div>
                </div>
              ) : !selectedReportType ? (
                /* Report Type Selection */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <button
                    onClick={async () => {
                      console.log('Starting report generation...');
                      setGeneratingReport(true);
                      
                      try {
                        // Simpler data gathering
                        const reportData = {
                          currentCashier: cashier.currentCashier || null,
                          summary: null,
                          operations: cashier.operations || [],
                          businessDay: currentBusinessDay || null
                        };
                        
                        console.log('Calling generateReport with data:', reportData);
                        const report = await generateReport('summary', reportData);
                        console.log('Report result:', report);
                        
                        if (report) {
                          setSelectedReportType('summary');
                          setReportGenerated(true);
                        }
                      } catch (error) {
                        console.error('Full error:', error);
                        alert('Erro ao gerar relatório: ' + error);
                      } finally {
                        setGeneratingReport(false);
                      }
                    }}
                    disabled={generatingReport}
                    className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-xl hover:shadow-lg transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">📊</span>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Resumo do Dia</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Visão geral das operações, vendas e movimentações do dia
                    </p>
                  </button>

                  <button
                    onClick={async () => {
                      console.log('Starting cashflow report...');
                      setGeneratingReport(true);
                      
                      try {
                        const reportData = {
                          currentCashier: cashier.currentCashier || null,
                          summary: null,
                          operations: cashier.operations || [],
                          businessDay: currentBusinessDay || null
                        };
                        
                        const report = await generateReport('cashflow', reportData);
                        
                        if (report) {
                          setSelectedReportType('cashflow');
                          setReportGenerated(true);
                        }
                      } catch (error) {
                        console.error('Error generating report:', error);
                        alert('Erro ao gerar relatório: ' + error);
                      } finally {
                        setGeneratingReport(false);
                      }
                    }}
                    disabled={generatingReport}
                    className="p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 rounded-xl hover:shadow-lg transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">💰</span>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Fluxo de Caixa</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Entradas, saídas e saldo do caixa
                    </p>
                  </button>

                  <button
                    onClick={async () => {
                      console.log('Starting sales report...');
                      setGeneratingReport(true);
                      
                      try {
                        const reportData = {
                          currentCashier: cashier.currentCashier || null,
                          summary: null,
                          operations: cashier.operations || [],
                          businessDay: currentBusinessDay || null
                        };
                        
                        const report = await generateReport('sales', reportData);
                        
                        if (report) {
                          setSelectedReportType('sales');
                          setReportGenerated(true);
                        }
                      } catch (error) {
                        console.error('Error generating report:', error);
                        alert('Erro ao gerar relatório: ' + error);
                      } finally {
                        setGeneratingReport(false);
                      }
                    }}
                    disabled={generatingReport}
                    className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 rounded-xl hover:shadow-lg transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">🛒</span>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Vendas Detalhadas</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Lista completa de vendas com produtos e valores
                    </p>
                  </button>

                  <button
                    onClick={async () => {
                      console.log('Starting payments report...');
                      setGeneratingReport(true);
                      
                      try {
                        const reportData = {
                          currentCashier: cashier.currentCashier || null,
                          summary: null,
                          operations: cashier.operations || [],
                          businessDay: currentBusinessDay || null
                        };
                        
                        const report = await generateReport('payments', reportData);
                        
                        if (report) {
                          setSelectedReportType('payments');
                          setReportGenerated(true);
                        }
                      } catch (error) {
                        console.error('Error generating report:', error);
                        alert('Erro ao gerar relatório: ' + error);
                      } finally {
                        setGeneratingReport(false);
                      }
                    }}
                    disabled={generatingReport}
                    className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 rounded-xl hover:shadow-lg transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">💳</span>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Formas de Pagamento</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Análise detalhada por tipo de pagamento
                    </p>
                  </button>

                  <button
                    onClick={async () => {
                      console.log('Starting operators report...');
                      setGeneratingReport(true);
                      
                      try {
                        const reportData = {
                          currentCashier: cashier.currentCashier || null,
                          summary: null,
                          operations: cashier.operations || [],
                          businessDay: currentBusinessDay || null
                        };
                        
                        const report = await generateReport('operators', reportData);
                        
                        if (report) {
                          setSelectedReportType('operators');
                          setReportGenerated(true);
                        }
                      } catch (error) {
                        console.error('Error generating report:', error);
                        alert('Erro ao gerar relatório: ' + error);
                      } finally {
                        setGeneratingReport(false);
                      }
                    }}
                    disabled={generatingReport}
                    className="p-6 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900 dark:to-indigo-800 rounded-xl hover:shadow-lg transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">👥</span>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Por Operador</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Vendas e atividades por operador
                    </p>
                  </button>

                  <button
                    onClick={async () => {
                      console.log('Starting closure report...');
                      setGeneratingReport(true);
                      
                      try {
                        const reportData = {
                          currentCashier: cashier.currentCashier || null,
                          summary: null,
                          operations: cashier.operations || [],
                          businessDay: currentBusinessDay || null
                        };
                        
                        const report = await generateReport('closure', reportData);
                        
                        if (report) {
                          setSelectedReportType('closure');
                          setReportGenerated(true);
                        }
                      } catch (error) {
                        console.error('Error generating report:', error);
                        alert('Erro ao gerar relatório: ' + error);
                      } finally {
                        setGeneratingReport(false);
                      }
                    }}
                    disabled={generatingReport}
                    className="p-6 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900 dark:to-red-800 rounded-xl hover:shadow-lg transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">📋</span>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Fechamento de Caixa</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Relatório completo para conferência
                    </p>
                  </button>
                </div>
              ) : (
                /* Selected Report View */
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => {
                        setSelectedReportType('');
                        setReportGenerated(false);
                      }}
                      className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Voltar
                    </button>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {currentReport?.title || 'Carregando...'}
                    </h3>
                    <div className="text-sm text-gray-500">
                      {currentReport?.generatedAt ? formatDateTime(currentReport.generatedAt) : formatDateTime(new Date())}
                    </div>
                  </div>

                  {/* Report Content - Dynamic based on report type */}
                  {loadingReport ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <p className="text-gray-600 dark:text-gray-400">Gerando relatório...</p>
                      </div>
                    </div>
                  ) : reportGenerated ? (
                    <>
                      {/* Summary Report */}
                      {selectedReportType === 'summary' && (
                        <>
                          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                              Resumo Geral
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Operador</p>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {currentReport?.data?.operatorName || 'N/A'}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Valor de Abertura</p>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {formatCurrency(currentReport?.data?.openingAmount || 0)}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Total de Vendas</p>
                                <p className="font-medium text-green-600 dark:text-green-400">
                                  {formatCurrency(currentReport?.data?.totalSales || 0)}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Total de Retiradas</p>
                                <p className="font-medium text-red-600 dark:text-red-400">
                                  {formatCurrency(currentReport?.data?.totalWithdrawals || 0)}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Quantidade de Vendas</p>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {currentReport?.data?.salesCount || 0}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Valor em Caixa</p>
                                <p className="font-medium text-blue-600 dark:text-blue-400">
                                  {formatCurrency(currentReport?.data?.cashInRegister || 0)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                      
                      {/* Cashflow Report */}
                      {selectedReportType === 'cashflow' && (
                        <>
                          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                              Movimentação Financeira
                            </h3>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center pb-2 border-b dark:border-gray-600">
                                <span className="text-gray-600 dark:text-gray-400">Saldo Inicial</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {formatCurrency(currentReport?.data?.openingAmount || 0)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-400">➕ Total de Entradas</span>
                                <span className="font-medium text-green-600 dark:text-green-400">
                                  {formatCurrency(currentReport?.data?.totalEntries || 0)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-400">➖ Total de Saídas</span>
                                <span className="font-medium text-red-600 dark:text-red-400">
                                  {formatCurrency(currentReport?.data?.totalExits || 0)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center pt-2 border-t dark:border-gray-600">
                                <span className="text-gray-600 dark:text-gray-400">Fluxo Líquido</span>
                                <span className={`font-bold text-lg ${(currentReport?.data?.netFlow || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                  {formatCurrency(currentReport?.data?.netFlow || 0)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center pt-2 border-t dark:border-gray-600">
                                <span className="font-semibold text-gray-900 dark:text-white">Saldo Atual</span>
                                <span className="font-bold text-xl text-blue-600 dark:text-blue-400">
                                  {formatCurrency(currentReport?.data?.currentAmount || 0)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                      
                      {/* Sales Report */}
                      {selectedReportType === 'sales' && (
                        <>
                          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                              Resumo de Vendas
                            </h3>
                            <div className="grid grid-cols-3 gap-4 mb-4">
                              <div className="text-center">
                                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                  {currentReport?.data?.totalSales || 0}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Total de Vendas</p>
                              </div>
                              <div className="text-center">
                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                  {formatCurrency(currentReport?.data?.totalAmount || 0)}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Valor Total</p>
                              </div>
                              <div className="text-center">
                                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                  {formatCurrency(currentReport?.data?.averageTicket || 0)}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Ticket Médio</p>
                              </div>
                            </div>
                            
                            {currentReport?.data?.operations && currentReport?.data?.operations.length > 0 && (
                              <div className="mt-4">
                                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Últimas Vendas</h4>
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                  {currentReport?.data?.operations?.slice(0, 10).map((op: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center py-1 border-b dark:border-gray-600">
                                      <span className="text-sm text-gray-600 dark:text-gray-400">
                                        Venda #{idx + 1}
                                      </span>
                                      <span className="font-medium text-gray-900 dark:text-white">
                                        {formatCurrency(op.amount || 0)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                      
                      {/* Payments Report */}
                      {selectedReportType === 'payments' && (
                        <>
                          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                              Formas de Pagamento
                            </h3>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-400">💵 Dinheiro</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {formatCurrency(currentReport?.data?.cash || 0)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-400">💳 Crédito</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {formatCurrency(currentReport?.data?.credit || 0)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-400">💳 Débito</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {formatCurrency(currentReport?.data?.debit || 0)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-400">📱 PIX</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {formatCurrency(currentReport?.data?.pix || 0)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center pt-3 border-t dark:border-gray-600">
                                <span className="font-semibold text-gray-900 dark:text-white">Total</span>
                                <span className="font-bold text-xl text-green-600 dark:text-green-400">
                                  {formatCurrency(currentReport?.data?.total || 0)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                      
                      {/* Operators Report */}
                      {selectedReportType === 'operators' && (
                        <>
                          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                              Informações dos Operadores
                            </h3>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-400">Operador Atual</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {currentReport?.data?.currentOperator || 'N/A'}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-400">Aberto Por</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {currentReport?.data?.openedBy || 'N/A'}
                                </span>
                              </div>
                              
                              {Object.keys(currentReport?.data?.operatorSales || {}).length > 0 && (
                                <div className="mt-4 pt-3 border-t dark:border-gray-600">
                                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Vendas por Operador</h4>
                                  {Object.entries(currentReport?.data?.operatorSales || {}).map(([operator, data]: [string, any]) => (
                                    <div key={operator} className="flex justify-between items-center py-2">
                                      <span className="text-gray-600 dark:text-gray-400">{operator}</span>
                                      <div className="text-right">
                                        <p className="font-medium text-gray-900 dark:text-white">
                                          {formatCurrency(data.total)}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          {data.count} venda{data.count !== 1 ? 's' : ''}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                      
                      {/* Closure Report */}
                      {selectedReportType === 'closure' && (
                        <>
                          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                              Relatório de Fechamento
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Terminal</p>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {currentReport?.data?.terminalId || 'N/A'}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Operador</p>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {currentReport?.data?.operatorName || 'N/A'}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Abertura</p>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {formatDateTime(currentReport?.data?.openingDate || new Date())}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Fechamento</p>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {formatDateTime(currentReport?.data?.closingDate || new Date())}
                                </p>
                              </div>
                            </div>
                            
                            <div className="mt-4 pt-3 border-t dark:border-gray-600">
                              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Resumo Financeiro</h4>
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600 dark:text-gray-400">Total de Vendas</span>
                                  <span className="font-medium text-green-600 dark:text-green-400">
                                    {formatCurrency(currentReport?.data?.totalSales || 0)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600 dark:text-gray-400">Total de Retiradas</span>
                                  <span className="font-medium text-red-600 dark:text-red-400">
                                    {formatCurrency(currentReport?.data?.totalWithdrawals || 0)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t dark:border-gray-600">
                                  <span className="font-semibold text-gray-900 dark:text-white">Valor Esperado</span>
                                  <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                                    {formatCurrency(currentReport?.data?.expectedCash || 0)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center text-gray-500 dark:text-gray-400">
                        <p>Nenhum relatório gerado</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Print Button - Only show when report is generated */}
                  {reportGenerated && currentReport && (
                    <div className="flex gap-3 mt-6 print:hidden">
                      <button
                        onClick={() => printReport()}
                        className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Imprimir
                      </button>
                      <button
                        onClick={() => {
                          setSelectedReportType('');
                          setReportGenerated(false);
                        }}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                      >
                        Voltar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}