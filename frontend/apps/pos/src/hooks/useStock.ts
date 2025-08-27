import { useCallback, useState } from "react";
import logger, { LogSource } from "../services/LocalLoggerService";
import { buildApiUrl } from "../config/api";

interface Stock {
  id: string;
  name: string;
  sku?: string;
  quantity: number;
  min_quantity?: number;
  unit?: string;
  price?: number;
  category?: string;
  supplier?: string;
}

interface StockUpdate {
  name?: string;
  sku?: string;
  quantity?: number;
  min_quantity?: number;
  unit?: string;
  price?: number;
  category?: string;
  supplier?: string;
}

export const useStock = () => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);

  const loadStocks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(buildApiUrl("/api/v1/stock"), {
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

  const updateStock = useCallback(async (id: string, data: StockUpdate) => {
    setStocks((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)));
  }, []);

  return {
    stocks,
    loading,
    loadStocks,
    updateStock,
  };
};
