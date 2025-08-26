import { useCallback, useState } from "react";
import logger, { LogSource } from "../services/LocalLoggerService";

interface Stock {
  id: string;
  [key: string]: any;
}

export const useStock = () => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);

  const loadStocks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8001/api/v1/stock", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to load stocks");
      const data = await response.json();
      setStocks(data);
    } catch (error) {
      await logger.error(
        "Erro ao carregar estoques",
        { error },
        "useStock",
        LogSource.STOCK
      );
      setStocks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStock = useCallback(async (id: string, data: any) => {
    setStocks((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)));
  }, []);

  return {
    stocks,
    loading,
    loadStocks,
    updateStock,
  };
};
