import { useState, useCallback, useEffect } from 'react';
import { billsService, Bill, BillCreate, BillUpdate, BillsFilter } from '../services/BillsService';
import { useToast } from '../components/Toast';

export const useBills = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    total_pending: number;
    total_overdue: number;
    total_paid_this_month: number;
    next_due: Bill | null;
  } | null>(null);
  const { success, error: showError } = useToast();

  const loadBills = useCallback(async (filter?: BillsFilter) => {
    setLoading(true);
    setError(null);
    try {
      const data = await billsService.listBills(filter);
      setBills(data);
      return data;
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar contas');
      showError('Erro ao carregar contas a pagar');
      return [];
    } finally {
      setLoading(false);
    }
  }, [showError]);

  const loadSummary = useCallback(async () => {
    try {
      const data = await billsService.getBillsSummary();
      setSummary(data);
      return data;
    } catch (err: any) {
      console.error('Error loading summary:', err);
      return null;
    }
  }, []);

  const createBill = useCallback(async (bill: BillCreate) => {
    setLoading(true);
    setError(null);
    try {
      const newBill = await billsService.createBill(bill);
      setBills(prev => [...prev, newBill]);
      success('Conta criada com sucesso!');
      await loadSummary();
      return newBill;
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta');
      showError('Erro ao criar conta');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [success, showError, loadSummary]);

  const updateBill = useCallback(async (id: string, updates: BillUpdate) => {
    setLoading(true);
    setError(null);
    try {
      const updatedBill = await billsService.updateBill(id, updates);
      setBills(prev => prev.map(bill => 
        bill.id === id ? updatedBill : bill
      ));
      success('Conta atualizada com sucesso!');
      await loadSummary();
      return updatedBill;
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar conta');
      showError('Erro ao atualizar conta');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [success, showError, loadSummary]);

  const deleteBill = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await billsService.deleteBill(id);
      setBills(prev => prev.filter(bill => bill.id !== id));
      success('Conta excluída com sucesso!');
      await loadSummary();
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir conta');
      showError('Erro ao excluir conta');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [success, showError, loadSummary]);

  const payBill = useCallback(async (id: string, paymentMethod: string) => {
    setLoading(true);
    setError(null);
    try {
      const paidBill = await billsService.payBill(id, paymentMethod);
      setBills(prev => prev.map(bill => 
        bill.id === id ? paidBill : bill
      ));
      success('Conta paga com sucesso!');
      await loadSummary();
      return paidBill;
    } catch (err: any) {
      setError(err.message || 'Erro ao pagar conta');
      showError('Erro ao pagar conta');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [success, showError, loadSummary]);

  // Calculate additional statistics
  const getStatistics = useCallback(() => {
    const now = new Date();
    const overdueBills = bills.filter(bill => 
      bill.status === 'pending' && new Date(bill.due_date) < now
    );
    
    const pendingBills = bills.filter(bill => bill.status === 'pending');
    const paidBills = bills.filter(bill => bill.status === 'paid');
    
    const totalPending = pendingBills.reduce((sum, bill) => sum + bill.amount, 0);
    const totalOverdue = overdueBills.reduce((sum, bill) => sum + bill.amount, 0);
    const totalPaid = paidBills.reduce((sum, bill) => sum + bill.amount, 0);
    
    return {
      totalBills: bills.length,
      pendingCount: pendingBills.length,
      overdueCount: overdueBills.length,
      paidCount: paidBills.length,
      totalPending,
      totalOverdue,
      totalPaid,
      overdueBills,
      pendingBills,
      paidBills
    };
  }, [bills]);

  // Load initial data
  useEffect(() => {
    loadBills();
    loadSummary();
  }, []);

  return {
    bills,
    loading,
    error,
    summary,
    loadBills,
    loadSummary,
    createBill,
    updateBill,
    deleteBill,
    payBill,
    getStatistics
  };
};