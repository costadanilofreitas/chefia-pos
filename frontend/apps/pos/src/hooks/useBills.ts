import { useCallback, useEffect, useState } from "react";
import { useToast } from "../components/Toast";
import {
  Bill,
  BillCreate,
  BillUpdate,
  BillsFilter,
  billsService,
} from "../services/BillsService";
import logger, { LogSource } from "../services/LocalLoggerService";

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

  const loadSummary = useCallback(async () => {
    try {
      const data = await billsService.getBillsSummary();
      setSummary(data);
    } catch (error) {
      await logger.warn('Erro ao carregar resumo de contas', { error }, 'useBills', LogSource.POS);
      // Silently fail for summary
    }
  }, []);

  const loadBills = useCallback(
    async (filter?: BillsFilter) => {
      try {
        setLoading(true);
        setError(null);

        const data = await billsService.listBills(filter);
        setBills(data);
        return data;
      } catch (err) {
        showError("Erro ao carregar contas");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [showError]
  );

  const updateBill = useCallback(
    async (id: string, updates: BillUpdate) => {
      setLoading(true);
      setError(null);

      const updatedBill = await billsService.updateBill(id, updates);
      setBills((prev) =>
        prev.map((bill) => (bill.id === id ? updatedBill : bill))
      );
      success("Conta atualizada com sucesso!");
      await loadSummary();
      return updatedBill;
    },
    [loadSummary, success]
  );

  const deleteBill = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);

      await billsService.deleteBill(id);
      setBills((prev) => prev.filter((bill) => bill.id !== id));
      success("Conta excluída com sucesso!");
      await loadSummary();
    },
    [loadSummary, success]
  );

  const payBill = useCallback(
    async (id: string, paymentMethod: string) => {
      setLoading(true);
      setError(null);

      const paidBill = await billsService.payBill(id, paymentMethod);
      setBills((prev) =>
        prev.map((bill) => (bill.id === id ? paidBill : bill))
      );
      success("Conta paga com sucesso!");
      await loadSummary();
      return paidBill;
    },
    [loadSummary, success]
  );

  // Calculate additional statistics
  const getStatistics = useCallback(() => {
    const now = new Date();
    const overdueBills = bills.filter(
      (bill) => bill.status === "pending" && new Date(bill.due_date) < now
    );

    const pendingBills = bills.filter((bill) => bill.status === "pending");
    const paidBills = bills.filter((bill) => bill.status === "paid");

    const totalPending = pendingBills.reduce(
      (sum, bill) => sum + bill.amount,
      0
    );
    const totalOverdue = overdueBills.reduce(
      (sum, bill) => sum + bill.amount,
      0
    );
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
      paidBills,
    };
  }, [bills]);

  const createBill = useCallback(
    async (bill: BillCreate) => {
      try {
        setLoading(true);
        setError(null);

        const newBill = await billsService.createBill(bill);
        setBills((prev) => [...prev, newBill]);
        success("Conta criada com sucesso!");
        await loadSummary();
        return newBill;
      } catch (err) {
        showError("Erro ao criar conta");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [loadSummary, showError, success]
  );

  // Load initial data
  useEffect(() => {
    loadBills();
    loadSummary();
  }, [loadBills, loadSummary]);

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
    getStatistics,
  };
};
