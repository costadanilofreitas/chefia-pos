import { createContext, useContext, useState, useEffect } from 'react';

// Criando o contexto de caixa
const CashierContext = createContext(null);

// Provider para o contexto de caixa
export const CashierProvider = ({ children }) => {
  const [cashierStatus, setCashierStatus] = useState(null);
  const [cashierHistory, setCashierHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Efeito para carregar o status do caixa ao iniciar
  useEffect(() => {
    const loadCashierStatus = async () => {
      try {
        await getCurrentCashier();
      } catch (err) {
        console.error('Erro ao carregar status do caixa:', err);
      }
    };

    loadCashierStatus();
  }, []);

  // Função para obter o caixa atual
  const getCurrentCashier = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Em um cenário real, isso faria uma chamada à API para obter o status do caixa
      // Simulando uma chamada de API com timeout
      return new Promise((resolve) => {
        setTimeout(() => {
          const storedCashier = localStorage.getItem('currentCashier');
          
          if (storedCashier) {
            const cashier = JSON.parse(storedCashier);
            setCashierStatus(cashier);
            resolve(cashier);
          } else {
            setCashierStatus(null);
            resolve(null);
          }
          
          setIsLoading(false);
        }, 300);
      });
    } catch (err) {
      setError(err.message);
      console.error('Erro ao obter status do caixa:', err);
      setIsLoading(false);
      throw err;
    }
  };

  // Função para abrir o caixa
  const openCashier = async (cashierData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Em um cenário real, isso faria uma chamada à API para abrir o caixa
      // Simulando uma chamada de API com timeout
      return new Promise((resolve) => {
        setTimeout(() => {
          const newCashier = {
            id: Date.now().toString(),
            terminal_id: cashierData.terminal_id,
            business_day_id: cashierData.business_day_id,
            operator_id: cashierData.operator_id || '1',
            operator_name: cashierData.operator_name || 'Operador',
            opening_balance: cashierData.opening_balance,
            expected_balance: cashierData.opening_balance,
            cash_sales: 0,
            card_sales: 0,
            pix_sales: 0,
            other_sales: 0,
            cash_in: 0,
            cash_out: 0,
            total_sales: 0,
            notes: cashierData.notes || '',
            status: 'open',
            opened_at: new Date().toISOString(),
            closed_at: null
          };
          
          // Armazenar caixa na sessão
          localStorage.setItem('currentCashier', JSON.stringify(newCashier));
          setCashierStatus(newCashier);
          setIsLoading(false);
          resolve(newCashier);
        }, 500);
      });
    } catch (err) {
      setError(err.message);
      console.error('Erro ao abrir caixa:', err);
      setIsLoading(false);
      throw err;
    }
  };

  // Função para fechar o caixa
  const closeCashier = async (closingData) => {
    try {
      if (!cashierStatus) {
        throw new Error('Não há um caixa aberto para fechar');
      }
      
      setIsLoading(true);
      setError(null);
      
      // Em um cenário real, isso faria uma chamada à API para fechar o caixa
      // Simulando uma chamada de API com timeout
      return new Promise((resolve) => {
        setTimeout(() => {
          const closedCashier = {
            ...cashierStatus,
            closing_balance: closingData.closing_balance,
            notes: closingData.notes || cashierStatus.notes,
            status: 'closed',
            closed_at: new Date().toISOString()
          };
          
          // Calcular diferença entre saldo esperado e saldo de fechamento
          closedCashier.difference = closingData.closing_balance - cashierStatus.expected_balance;
          
          // Atualizar caixa na sessão
          localStorage.removeItem('currentCashier');
          
          // Adicionar ao histórico
          const history = JSON.parse(localStorage.getItem('cashierHistory') || '[]');
          history.push(closedCashier);
          localStorage.setItem('cashierHistory', JSON.stringify(history));
          
          setCashierStatus(null);
          setCashierHistory(history);
          setIsLoading(false);
          resolve(closedCashier);
        }, 500);
      });
    } catch (err) {
      setError(err.message);
      console.error('Erro ao fechar caixa:', err);
      setIsLoading(false);
      throw err;
    }
  };

  // Função para registrar uma venda
  const registerSale = async (saleData) => {
    try {
      if (!cashierStatus || cashierStatus.status !== 'open') {
        throw new Error('O caixa precisa estar aberto para registrar vendas');
      }
      
      setIsLoading(true);
      setError(null);
      
      // Em um cenário real, isso faria uma chamada à API para registrar uma venda
      // Simulando uma chamada de API com timeout
      return new Promise((resolve) => {
        setTimeout(() => {
          const updatedCashier = { ...cashierStatus };
          
          // Atualizar valores com base no método de pagamento
          switch (saleData.payment_method) {
            case 'cash':
              updatedCashier.cash_sales += saleData.amount;
              break;
            case 'credit':
            case 'debit':
              updatedCashier.card_sales += saleData.amount;
              break;
            case 'pix':
              updatedCashier.pix_sales += saleData.amount;
              break;
            default:
              updatedCashier.other_sales += saleData.amount;
          }
          
          // Atualizar saldo esperado se for pagamento em dinheiro
          if (saleData.payment_method === 'cash') {
            updatedCashier.expected_balance += saleData.amount;
          }
          
          // Atualizar total de vendas
          updatedCashier.total_sales += saleData.amount;
          
          // Armazenar caixa atualizado na sessão
          localStorage.setItem('currentCashier', JSON.stringify(updatedCashier));
          setCashierStatus(updatedCashier);
          setIsLoading(false);
          resolve(updatedCashier);
        }, 300);
      });
    } catch (err) {
      setError(err.message);
      console.error('Erro ao registrar venda:', err);
      setIsLoading(false);
      throw err;
    }
  };

  // Função para registrar uma retirada de caixa
  const registerCashOut = async (cashOutData) => {
    try {
      if (!cashierStatus || cashierStatus.status !== 'open') {
        throw new Error('O caixa precisa estar aberto para registrar retiradas');
      }
      
      if (cashOutData.amount <= 0) {
        throw new Error('O valor da retirada deve ser maior que zero');
      }
      
      if (cashOutData.amount > cashierStatus.expected_balance) {
        throw new Error('O valor da retirada não pode ser maior que o saldo disponível');
      }
      
      setIsLoading(true);
      setError(null);
      
      // Em um cenário real, isso faria uma chamada à API para registrar uma retirada
      // Simulando uma chamada de API com timeout
      return new Promise((resolve) => {
        setTimeout(() => {
          const updatedCashier = { ...cashierStatus };
          
          // Atualizar valores de retirada e saldo esperado
          updatedCashier.cash_out += cashOutData.amount;
          updatedCashier.expected_balance -= cashOutData.amount;
          
          // Armazenar caixa atualizado na sessão
          localStorage.setItem('currentCashier', JSON.stringify(updatedCashier));
          setCashierStatus(updatedCashier);
          setIsLoading(false);
          resolve(updatedCashier);
        }, 300);
      });
    } catch (err) {
      setError(err.message);
      console.error('Erro ao registrar retirada:', err);
      setIsLoading(false);
      throw err;
    }
  };

  // Função para registrar um suprimento de caixa
  const registerCashIn = async (cashInData) => {
    try {
      if (!cashierStatus || cashierStatus.status !== 'open') {
        throw new Error('O caixa precisa estar aberto para registrar suprimentos');
      }
      
      if (cashInData.amount <= 0) {
        throw new Error('O valor do suprimento deve ser maior que zero');
      }
      
      setIsLoading(true);
      setError(null);
      
      // Em um cenário real, isso faria uma chamada à API para registrar um suprimento
      // Simulando uma chamada de API com timeout
      return new Promise((resolve) => {
        setTimeout(() => {
          const updatedCashier = { ...cashierStatus };
          
          // Atualizar valores de suprimento e saldo esperado
          updatedCashier.cash_in += cashInData.amount;
          updatedCashier.expected_balance += cashInData.amount;
          
          // Armazenar caixa atualizado na sessão
          localStorage.setItem('currentCashier', JSON.stringify(updatedCashier));
          setCashierStatus(updatedCashier);
          setIsLoading(false);
          resolve(updatedCashier);
        }, 300);
      });
    } catch (err) {
      setError(err.message);
      console.error('Erro ao registrar suprimento:', err);
      setIsLoading(false);
      throw err;
    }
  };

  // Função para obter o histórico de caixas
  const getCashierHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Em um cenário real, isso faria uma chamada à API para obter o histórico de caixas
      // Simulando uma chamada de API com timeout
      return new Promise((resolve) => {
        setTimeout(() => {
          const history = JSON.parse(localStorage.getItem('cashierHistory') || '[]');
          setCashierHistory(history);
          setIsLoading(false);
          resolve(history);
        }, 300);
      });
    } catch (err) {
      setError(err.message);
      console.error('Erro ao obter histórico de caixas:', err);
      setIsLoading(false);
      throw err;
    }
  };

  // Valor do contexto
  const value = {
    cashierStatus,
    cashierHistory,
    isLoading,
    error,
    getCurrentCashier,
    openCashier,
    closeCashier,
    registerSale,
    registerCashOut,
    registerCashIn,
    getCashierHistory
  };

  return <CashierContext.Provider value={value}>{children}</CashierContext.Provider>;
};

// Hook personalizado para usar o contexto de caixa
export const useCashier = () => {
  const context = useContext(CashierContext);
  if (!context) {
    throw new Error('useCashier deve ser usado dentro de um CashierProvider');
  }
  return context;
};

export default useCashier;
