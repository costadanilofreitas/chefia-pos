import { createContext, useContext, useState, useEffect } from 'react';

// Criando o contexto de dia de operação
const BusinessDayContext = createContext(null);

// Provider para o contexto de dia de operação
export const BusinessDayProvider = ({ children }) => {
  const [currentBusinessDay, setCurrentBusinessDay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Efeito para carregar o dia de operação atual ao iniciar
  useEffect(() => {
    const loadCurrentBusinessDay = async () => {
      try {
        setLoading(true);
        // Em um cenário real, isso faria uma chamada à API para obter o dia de operação atual
        // Simulando uma chamada de API com timeout
        setTimeout(() => {
          const storedBusinessDay = localStorage.getItem('currentBusinessDay');
          
          if (storedBusinessDay) {
            setCurrentBusinessDay(JSON.parse(storedBusinessDay));
          }
          setLoading(false);
        }, 500);
      } catch (err) {
        setError(err.message);
        console.error('Erro ao carregar dia de operação:', err);
        setLoading(false);
      }
    };

    loadCurrentBusinessDay();
  }, []);

  // Função para abrir um novo dia de operação
  const openBusinessDay = async (businessDayData) => {
    try {
      setLoading(true);
      setError(null);
      
      // Em um cenário real, isso faria uma chamada à API para abrir um novo dia de operação
      // Simulando uma chamada de API com timeout
      return new Promise((resolve) => {
        setTimeout(() => {
          const newBusinessDay = {
            id: Date.now().toString(),
            opened_at: new Date().toISOString(),
            closed_at: null,
            status: 'open',
            opening_notes: businessDayData.notes || '',
            terminal_id: businessDayData.terminal_id || 'POS-001'
          };
          
          // Armazenar dia de operação na sessão
          localStorage.setItem('currentBusinessDay', JSON.stringify(newBusinessDay));
          setCurrentBusinessDay(newBusinessDay);
          setLoading(false);
          resolve(newBusinessDay);
        }, 500);
      });
    } catch (err) {
      setError(err.message);
      console.error('Erro ao abrir dia de operação:', err);
      setLoading(false);
      throw err;
    }
  };

  // Função para fechar o dia de operação atual
  const closeBusinessDay = async (closingData) => {
    try {
      if (!currentBusinessDay) {
        throw new Error('Não há um dia de operação aberto para fechar');
      }
      
      setLoading(true);
      setError(null);
      
      // Em um cenário real, isso faria uma chamada à API para fechar o dia de operação
      // Simulando uma chamada de API com timeout
      return new Promise((resolve) => {
        setTimeout(() => {
          const closedBusinessDay = {
            ...currentBusinessDay,
            closed_at: new Date().toISOString(),
            status: 'closed',
            closing_notes: closingData.notes || ''
          };
          
          // Atualizar dia de operação na sessão
          localStorage.setItem('currentBusinessDay', JSON.stringify(closedBusinessDay));
          setCurrentBusinessDay(closedBusinessDay);
          setLoading(false);
          resolve(closedBusinessDay);
        }, 500);
      });
    } catch (err) {
      setError(err.message);
      console.error('Erro ao fechar dia de operação:', err);
      setLoading(false);
      throw err;
    }
  };

  // Função para obter o dia de operação atual
  const getCurrentBusinessDay = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Em um cenário real, isso faria uma chamada à API para obter o dia de operação atual
      // Simulando uma chamada de API com timeout
      return new Promise((resolve) => {
        setTimeout(() => {
          const storedBusinessDay = localStorage.getItem('currentBusinessDay');
          
          if (storedBusinessDay) {
            const businessDay = JSON.parse(storedBusinessDay);
            setCurrentBusinessDay(businessDay);
            resolve(businessDay);
          } else {
            setCurrentBusinessDay(null);
            resolve(null);
          }
          setLoading(false);
        }, 300);
      });
    } catch (err) {
      setError(err.message);
      console.error('Erro ao obter dia de operação:', err);
      setLoading(false);
      throw err;
    }
  };

  // Valor do contexto
  const value = {
    currentBusinessDay,
    loading,
    error,
    openBusinessDay,
    closeBusinessDay,
    getCurrentBusinessDay
  };

  return <BusinessDayContext.Provider value={value}>{children}</BusinessDayContext.Provider>;
};

// Hook personalizado para usar o contexto de dia de operação
export const useBusinessDay = () => {
  const context = useContext(BusinessDayContext);
  if (!context) {
    throw new Error('useBusinessDay deve ser usado dentro de um BusinessDayProvider');
  }
  return context;
};

export default useBusinessDay;
